/**
 * LocalGraphRouter.ts
 *
 * Embedded On-Device Offline Routing Engine for Elk Country.
 * Uses the road network extracted from OpenStreetMap (via elk-roads.json) to calculate
 * authentic, road-following routes entirely offline in <15ms.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { calcDistance, decodePolyline } from '../utils/mapUtils';

export interface RouteCoord {
  latitude: number;
  longitude: number;
}

export interface LocalRouteResult {
  coordinates: [number, number][];
  distance: number;  // meters
  duration: number;  // seconds
}

interface GraphNode {
  id: number;
  lng: number;
  lat: number;
}

interface GraphEdge {
  to: number;
  dist: number;      // physical distance in meters
  weight: number;    // travel cost for A* pathfinding (dist * roadTypeFactor)
  speedMps: number;  // estimated speed in meters per second
  coords: [number, number][];
}

interface SpeedProfile {
  weightFactor: number; // A* cost multiplier (lower = strongly preferred)
  speedMps: number;     // Speed in m/s for travel time
}

// Road Speed & Safety Classification
// Prioritizes paved highways and penalizes dangerous/unpaved forestry tracks
const ROAD_PROFILES: Record<string, SpeedProfile> = {
  // Paved Highways (fastest, safest)
  motorway: { weightFactor: 1.0, speedMps: 29.0 },       // ~65 mph (Interstates e.g. I-80)
  motorway_link: { weightFactor: 1.1, speedMps: 22.0 },
  trunk: { weightFactor: 1.05, speedMps: 25.0 },          // ~55 mph (US Routes e.g. US-219, US-322)
  trunk_link: { weightFactor: 1.15, speedMps: 20.0 },
  primary: { weightFactor: 1.1, speedMps: 24.5 },         // ~55 mph (PA-555, PA-153)
  primary_link: { weightFactor: 1.25, speedMps: 18.0 },
  secondary: { weightFactor: 1.3, speedMps: 20.0 },       // ~45 mph (Major state/county roads)
  secondary_link: { weightFactor: 1.45, speedMps: 15.0 },
  tertiary: { weightFactor: 1.6, speedMps: 15.5 },        // ~35 mph (Paved town connectors)
  tertiary_link: { weightFactor: 1.7, speedMps: 13.0 },

  // Minor paved streets
  unclassified: { weightFactor: 2.2, speedMps: 11.0 },    // ~25 mph (Paved backroads)
  residential: { weightFactor: 2.5, speedMps: 10.0 },     // ~22 mph (Neighborhoods)
  living_street: { weightFactor: 3.5, speedMps: 6.7 },

  // Parking & Service
  service: { weightFactor: 4.0, speedMps: 6.7 },

  // Unpaved / Dirt Logging Tracks through State Forests / Game Lands (HEAVILY PENALIZED)
  // Ensures regular cars stay on paved highways unless the destination has no other road
  track: { weightFactor: 12.0, speedMps: 4.5 },          // ~10 mph dirt trail
  path: { weightFactor: 20.0, speedMps: 2.0 },
  footway: { weightFactor: 20.0, speedMps: 2.0 },
  bridleway: { weightFactor: 20.0, speedMps: 2.0 },
  cycleway: { weightFactor: 20.0, speedMps: 2.0 },
};

const DEFAULT_ROAD_PROFILE: SpeedProfile = {
  weightFactor: 2.0,
  speedMps: 12.0, // ~27 mph
};

class MinHeap {
  private data: { id: number; dist: number; priority: number }[] = [];

  push(item: { id: number; dist: number; priority: number }) {
    this.data.push(item);
    this._up(this.data.length - 1);
  }

  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this._down(0);
    }
    return top;
  }

  isEmpty() {
    return this.data.length === 0;
  }

  private _up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].priority <= this.data[i].priority) break;
      const tmp = this.data[p];
      this.data[p] = this.data[i];
      this.data[i] = tmp;
      i = p;
    }
  }

  private _down(i: number) {
    const len = this.data.length;
    while ((i << 1) + 1 < len) {
      let left = (i << 1) + 1;
      let right = left + 1;
      let best = left;
      if (right < len && this.data[right].priority < this.data[left].priority) {
        best = right;
      }
      if (this.data[i].priority <= this.data[best].priority) break;
      const tmp = this.data[i];
      this.data[i] = this.data[best];
      this.data[best] = tmp;
      i = best;
    }
  }
}

class LocalGraphRouterClass {
  private nodes: Map<number, GraphNode> = new Map();
  private adjacency: Map<number, GraphEdge[]> = new Map();
  private grid: Map<string, number[]> = new Map();
  private cellToNodeId = new Map<string, number>();
  private nextNodeId = 1;
  private isInitialized = false;
  private hasLoadedFullRoads = false;
  private initPromise: Promise<void> | null = null;

  public bounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity,
  };

  public bboxes: Array<{ minLat: number; maxLat: number; minLng: number; maxLng: number }> = [];

  // Junction snapping tolerance: 0.0001 deg (~10m).
  // Snaps road junctions cleanly without destroying fine road curves.
  private readonly CELL_SIZE = 0.0001;

  private getGridKey(lng: number, lat: number): string {
    const gx = Math.round(lng / this.CELL_SIZE);
    const gy = Math.round(lat / this.CELL_SIZE);
    return `${gx}_${gy}`;
  }

  private getOrCreateNode(lng: number, lat: number): number {
    const key = this.getGridKey(lng, lat);
    const existingId = this.cellToNodeId.get(key);
    if (existingId !== undefined) {
      return existingId;
    }
    const id = this.nextNodeId++;
    this.cellToNodeId.set(key, id);
    const node: GraphNode = { id, lng, lat };
    this.nodes.set(id, node);

    if (lat < this.bounds.minLat) this.bounds.minLat = lat;
    if (lat > this.bounds.maxLat) this.bounds.maxLat = lat;
    if (lng < this.bounds.minLng) this.bounds.minLng = lng;
    if (lng > this.bounds.maxLng) this.bounds.maxLng = lng;

    // Populate spatial index (approx 2x2km grid)
    const gKey = `${Math.floor(lng / 0.02)}_${Math.floor(lat / 0.02)}`;
    if (!this.grid.has(gKey)) this.grid.set(gKey, []);
    this.grid.get(gKey)!.push(id);

    return id;
  }

  private addEdge(
    u: number,
    v: number,
    dist: number,
    weight: number,
    speedMps: number,
    coords: [number, number][]
  ) {
    if (u === v) return;
    if (!this.adjacency.has(u)) this.adjacency.set(u, []);
    this.adjacency.get(u)!.push({ to: v, dist, weight, speedMps, coords });
  }

  public indexPolyline(
    coords: [number, number][],
    isOneway: boolean = false,
    isReverse: boolean = false,
    roadType: string = ''
  ) {
    if (!coords || !Array.isArray(coords) || coords.length < 2) return;
    const profile = ROAD_PROFILES[roadType.toLowerCase()] || DEFAULT_ROAD_PROFILE;

    for (let i = 0; i < coords.length - 1; i++) {
      const c1 = coords[i];
      const c2 = coords[i + 1];
      const u = this.getOrCreateNode(c1[0], c1[1]);
      const v = this.getOrCreateNode(c2[0], c2[1]);
      if (u !== v) {
        const d = calcDistance(
          { latitude: c1[1], longitude: c1[0] },
          { latitude: c2[1], longitude: c2[0] }
        );
        const weight = d * profile.weightFactor;
        const speedMps = profile.speedMps;

        if (isOneway) {
          if (isReverse) {
            // Reverse oneway (e.g. oneway="-1"): edge goes v -> u
            this.addEdge(v, u, d, weight, speedMps, [c2, c1]);
          } else {
            // Standard forward oneway (e.g. oneway="yes", roundabouts): edge goes u -> v
            this.addEdge(u, v, d, weight, speedMps, [c1, c2]);
          }
        } else {
          // Standard two-way road: both directions are legal
          this.addEdge(u, v, d, weight, speedMps, [c1, c2]);
          this.addEdge(v, u, d, weight, speedMps, [c2, c1]);
        }
      }
    }
  }

  /**
   * Ensures the road network is fully loaded from disk before calculating routes.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.hasLoadedFullRoads && this.isInitialized) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    this.initPromise = this.loadRoads();
    await this.initPromise;
    this.initPromise = null;
  }

  public init() {
    if (this.isInitialized) return;
    this.ensureInitialized().catch(() => {});
  }

  /**
   * Loads the authentic road network JSON file.
   */
  public async loadRoads(): Promise<void> {
    try {
      const docDir = FileSystem.documentDirectory || '';
      const roadsPath = `${docDir}elk-roads.json`;
      const info = await FileSystem.getInfoAsync(roadsPath);

      if (info.exists && info.size > 1000) {
        console.log('[LocalGraphRouter] Loading downloaded elk-roads.json...');
        const jsonStr = await FileSystem.readAsStringAsync(roadsPath);
        const data = JSON.parse(jsonStr);

        if (data && Array.isArray(data.roads)) {
          // Clear any baseline to ensure ONLY real OSM roads exist in the graph
          this.nodes.clear();
          this.adjacency.clear();
          this.grid.clear();
          this.cellToNodeId.clear();
          this.nextNodeId = 1;
          this.bounds = {
            minLat: Infinity,
            maxLat: -Infinity,
            minLng: Infinity,
            maxLng: -Infinity,
          };
          this.bboxes = [];

          if (Array.isArray(data.bboxes)) {
            this.bboxes = data.bboxes.map((b: number[]) => {
              const [b0, b1, b2, b3] = b.map(Number);
              return {
                minLng: Math.min(b0, b2),
                maxLng: Math.max(b0, b2),
                minLat: Math.min(b1, b3),
                maxLat: Math.max(b1, b3),
              };
            });
          } else if (Array.isArray(data.bbox) && data.bbox.length === 4) {
            const [b0, b1, b2, b3] = data.bbox.map(Number);
            this.bboxes = [{
              minLng: Math.min(b0, b2),
              maxLng: Math.max(b0, b2),
              minLat: Math.min(b1, b3),
              maxLat: Math.max(b1, b3),
            }];
          }

          for (const r of data.roads) {
            if (r.coords && Array.isArray(r.coords)) {
              const props = r.properties || {};
              const onewayVal =
                r.oneway ??
                r.isOneway ??
                r.is_oneway ??
                props.oneway ??
                props.isOneway ??
                props.is_oneway;

              const isReverse =
                onewayVal === -1 ||
                onewayVal === '-1' ||
                onewayVal === 'reverse';

              const isForwardOneway =
                onewayVal === true ||
                onewayVal === 1 ||
                onewayVal === 'yes' ||
                onewayVal === 'true' ||
                onewayVal === '1' ||
                r.roundabout === true ||
                r.roundabout === 1 ||
                r.roundabout === 'yes' ||
                r.junction === 'roundabout' ||
                r.junction === 'circular' ||
                props.roundabout === true ||
                props.roundabout === 1 ||
                props.roundabout === 'yes' ||
                props.junction === 'roundabout' ||
                props.junction === 'circular';

              const isOneway = isForwardOneway || isReverse;
              const roadType = (r.type || r.highway || props.type || props.highway || '').toLowerCase();
              this.indexPolyline(r.coords, isOneway, isReverse, roadType);
            }
          }
          this.hasLoadedFullRoads = true;
          this.isInitialized = true;
          console.log(
            `[LocalGraphRouter] Successfully indexed ${data.roads.length} authentic roads (${this.nodes.size} nodes)!`
          );
          return;
        }
      }
    } catch (e) {
      console.warn('[LocalGraphRouter] Could not load elk-roads.json:', e);
    }

    // Baseline fallback: load scenic road curves from route.json
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const routeData = require('../../route.json');
      const encoded = routeData.routes?.[0]?.geometry;
      if (encoded) {
        const decoded = decodePolyline(encoded);
        const coords: [number, number][] = decoded.map(c => [c.longitude, c.latitude]);
        this.indexPolyline(coords, false, false, 'secondary');
      }
    } catch (e) {
      console.warn('[LocalGraphRouter] Fallback route.json baseline load error:', e);
    }
    this.isInitialized = true;
  }

  public async loadFullRoadNetworkIfAvailable() {
    await this.loadRoads();
  }

  private findNearestNode(coord: RouteCoord, requireOutgoing: boolean = false): GraphNode | null {
    if (this.nodes.size === 0) return null;

    let nearest: GraphNode | null = null;
    let minDist = Infinity;

    // Search neighboring spatial cells (approx 2x2km grid)
    const cx = Math.floor(coord.longitude / 0.02);
    const cy = Math.floor(coord.latitude / 0.02);

    let candidates: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx}_${cy + dy}`;
        const ids = this.grid.get(key);
        if (ids) candidates = candidates.concat(ids);
      }
    }

    // Fallback to all nodes if not in immediate candidate cells
    const searchPool = candidates.length > 0 ? candidates : this.nodes.keys();

    for (const id of searchPool) {
      if (requireOutgoing) {
        const edges = this.adjacency.get(id);
        if (!edges || edges.length === 0) continue;
      }
      const node = this.nodes.get(id);
      if (!node) continue;
      const d = calcDistance(coord, { latitude: node.lat, longitude: node.lng });
      if (d < minDist) {
        minDist = d;
        nearest = node;
      }
    }

    return nearest;
  }

  /**
   * Finds nearest road line segments to a coordinate (Edge Projection).
   * Projects the coordinate perpendicularly onto candidate road vectors,
   * ensuring off-road pins on divided roads bind to the correct directional lane.
   */
  private findNearestEdgeCandidates(
    coord: RouteCoord,
    maxCandidates: number = 4
  ): { u: number; v: number; dist: number; projCoord: [number, number] }[] {
    if (this.nodes.size === 0) return [];

    const latRad = (coord.latitude * Math.PI) / 180;
    const cosLat = Math.cos(latRad);

    const cx = Math.floor(coord.longitude / 0.02);
    const cy = Math.floor(coord.latitude / 0.02);

    let candidates: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx}_${cy + dy}`;
        const ids = this.grid.get(key);
        if (ids) candidates = candidates.concat(ids);
      }
    }

    const searchPool = candidates.length > 0 ? candidates : Array.from(this.nodes.keys());
    const seenEdges = new Set<string>();
    const results: { u: number; v: number; dist: number; projCoord: [number, number] }[] = [];

    for (const u of searchPool) {
      const edges = this.adjacency.get(u);
      if (!edges) continue;

      const nodeU = this.nodes.get(u);
      if (!nodeU) continue;

      for (const edge of edges) {
        const edgeKey = `${u}_${edge.to}`;
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);

        const nodeV = this.nodes.get(edge.to);
        if (!nodeV) continue;

        const segs: [number, number][] =
          edge.coords && edge.coords.length >= 2
            ? edge.coords
            : [
                [nodeU.lng, nodeU.lat],
                [nodeV.lng, nodeV.lat],
              ];

        for (let i = 0; i < segs.length - 1; i++) {
          const a = segs[i];
          const b = segs[i + 1];

          const dx = (b[0] - a[0]) * cosLat;
          const dy = b[1] - a[1];
          const lenSq = dx * dx + dy * dy;

          let t =
            lenSq === 0
              ? 0
              : ((coord.longitude - a[0]) * cosLat * dx + (coord.latitude - a[1]) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));

          const projX = a[0] + t * (b[0] - a[0]);
          const projY = a[1] + t * (b[1] - a[1]);
          const dist = calcDistance(coord, { latitude: projY, longitude: projX });

          results.push({
            u,
            v: edge.to,
            dist,
            projCoord: [projX, projY],
          });
        }
      }
    }

    results.sort((a, b) => a.dist - b.dist);

    // Keep unique entry node IDs to give diverse routing options
    const uniqueByU: { u: number; v: number; dist: number; projCoord: [number, number] }[] = [];
    const seenU = new Set<number>();
    for (const cand of results) {
      if (!seenU.has(cand.u)) {
        seenU.add(cand.u);
        uniqueByU.push(cand);
        if (uniqueByU.length >= maxCandidates) break;
      }
    }

    return uniqueByU;
  }

  /**
   * Checks whether a coordinate is within the coverage area of the offline road network.
   */
  public isWithinCoverage(coord: RouteCoord, maxDistanceMeters: number = 8000): boolean {
    if (this.nodes.size === 0) return false;
    if (!Number.isFinite(coord?.latitude) || !Number.isFinite(coord?.longitude)) return false;

    // Fast bounds rejection against regional bounding boxes (with ~11km margin)
    if (this.bboxes.length > 0) {
      const inAnyRegion = this.bboxes.some(
        b =>
          coord.latitude >= b.minLat - 0.1 &&
          coord.latitude <= b.maxLat + 0.1 &&
          coord.longitude >= b.minLng - 0.1 &&
          coord.longitude <= b.maxLng + 0.1
      );
      if (!inAnyRegion) return false;
    } else if (
      coord.latitude < this.bounds.minLat - 0.1 ||
      coord.latitude > this.bounds.maxLat + 0.1 ||
      coord.longitude < this.bounds.minLng - 0.1 ||
      coord.longitude > this.bounds.maxLng + 0.1
    ) {
      return false;
    }

    const nearest = this.findNearestNode(coord);
    if (!nearest) return false;
    const d = calcDistance(coord, { latitude: nearest.lat, longitude: nearest.lng });
    return d <= maxDistanceMeters;
  }

  public calculateRoute(
    fromCoord: RouteCoord,
    toCoord: RouteCoord
  ): LocalRouteResult | null {
    const startNode =
      this.findNearestNode(fromCoord, true) || this.findNearestNode(fromCoord, false);
    if (!startNode) return null;

    // Reject if start point is too far (>10km) from the offline road network
    const startDist = calcDistance(fromCoord, { latitude: startNode.lat, longitude: startNode.lng });
    if (startDist > 10000) {
      console.warn(`[LocalGraphRouter] Start point too far from road network (${Math.round(startDist)}m)`);
      return null;
    }

    // 1. Edge Projection: find nearest road segments to destination pin
    const endCandidates = this.findNearestEdgeCandidates(toCoord, 4);

    interface TargetCandidate {
      targetId: number;
      curbCoord: [number, number];
      distToPin: number;
    }

    const targets: TargetCandidate[] = [];
    for (const cand of endCandidates) {
      targets.push({
        targetId: cand.u,
        curbCoord: cand.projCoord,
        distToPin: cand.dist,
      });
    }

    // Fallback to closest junction node if no edges matched
    const fallbackNode = this.findNearestNode(toCoord);
    if (fallbackNode && !targets.some(t => t.targetId === fallbackNode.id)) {
      targets.push({
        targetId: fallbackNode.id,
        curbCoord: [fallbackNode.lng, fallbackNode.lat],
        distToPin: calcDistance(toCoord, { latitude: fallbackNode.lat, longitude: fallbackNode.lng }),
      });
    }

    if (targets.length === 0) return null;
    if (targets[0].distToPin > 10000) {
      console.warn(`[LocalGraphRouter] Destination too far from road network (${Math.round(targets[0].distToPin)}m)`);
      return null;
    }

    // 2. Try candidates in order (closest road first)
    for (const target of targets) {
      // Direct connection if starting at the exact same node
      if (startNode.id === target.targetId) {
        const directDist = calcDistance(fromCoord, {
          latitude: target.curbCoord[1],
          longitude: target.curbCoord[0],
        });
        return {
          coordinates: [
            [fromCoord.longitude, fromCoord.latitude],
            target.curbCoord,
          ],
          distance: directDist,
          duration: Math.max(10, Math.round(directDist / 12.0)),
        };
      }

      // A* Pathfinding from startNode.id to target.targetId
      const targetNode = this.nodes.get(target.targetId);
      if (!targetNode) continue;

      const dists = new Map<number, number>();
      const prev = new Map<
        number,
        { from: number; coords: [number, number][]; dist: number; speedMps: number }
      >();
      const heap = new MinHeap();

      dists.set(startNode.id, 0);
      heap.push({ id: startNode.id, dist: 0, priority: 0 });

      const endTarget = { latitude: targetNode.lat, longitude: targetNode.lng };

      while (!heap.isEmpty()) {
        const curr = heap.pop()!;
        if (curr.id === target.targetId) break;
        if (curr.dist > (dists.get(curr.id) ?? Infinity)) continue;

        const neighbors = this.adjacency.get(curr.id);
        if (!neighbors) continue;

        for (const edge of neighbors) {
          // Weighted cost: prioritizes paved highways and heavily penalizes forestry dirt tracks!
          const alt = curr.dist + edge.weight;
          if (alt < (dists.get(edge.to) ?? Infinity)) {
            dists.set(edge.to, alt);
            prev.set(edge.to, {
              from: curr.id,
              coords: edge.coords,
              dist: edge.dist,
              speedMps: edge.speedMps,
            });
            const toNode = this.nodes.get(edge.to);
            const h = toNode
              ? calcDistance({ latitude: toNode.lat, longitude: toNode.lng }, endTarget) * 1.0
              : 0;
            heap.push({ id: edge.to, dist: alt, priority: alt + h });
          }
        }
      }

      const finalWeight = dists.get(target.targetId);
      if (finalWeight === undefined) {
        // Path to this candidate is unreachable (e.g. opposite side of divided road with no U-turn); try next candidate!
        continue;
      }

      // Reconstruct polyline path with all authentic road curves
      let curr = target.targetId;
      const pathSegments: [number, number][][] = [];
      let totalRoadDist = 0;
      let totalRoadTimeSec = 0;

      while (curr && prev.has(curr)) {
        const p = prev.get(curr)!;
        pathSegments.unshift(p.coords);
        totalRoadDist += p.dist;
        totalRoadTimeSec += p.dist / (p.speedMps || 15.0);
        curr = p.from;
      }

      const fullCoords: [number, number][] = [
        [fromCoord.longitude, fromCoord.latitude],
      ];

      if (pathSegments.length > 0) {
        const firstPt = pathSegments[0][0];
        if (
          Math.abs(firstPt[0] - fromCoord.longitude) > 0.00001 ||
          Math.abs(firstPt[1] - fromCoord.latitude) > 0.00001
        ) {
          fullCoords.push(firstPt);
        }
        for (const seg of pathSegments) {
          fullCoords.push(...seg.slice(1));
        }
      }

      // 3. Curb-Stop: append projected curb drop-off point on the road
      const lastPt = fullCoords[fullCoords.length - 1];
      if (
        Math.abs(lastPt[0] - target.curbCoord[0]) > 0.00001 ||
        Math.abs(lastPt[1] - target.curbCoord[1]) > 0.00001
      ) {
        fullCoords.push(target.curbCoord);
      }
      // Note: We deliberately do NOT push [toCoord.longitude, toCoord.latitude]
      // into the building or across median barriers. The driving route ends cleanly on the road curb!

      const curbDist = calcDistance(
        { latitude: targetNode.lat, longitude: targetNode.lng },
        { latitude: target.curbCoord[1], longitude: target.curbCoord[0] }
      );
      const totalDist = totalRoadDist + curbDist;
      const durationSec = Math.max(10, Math.round(totalRoadTimeSec + curbDist / 8.0));

      return {
        coordinates: fullCoords,
        distance: totalDist,
        duration: durationSec,
      };
    }

    console.warn(`[LocalGraphRouter] No path found between points`);
    return null;
  }
}

export const LocalGraphRouter = new LocalGraphRouterClass();
