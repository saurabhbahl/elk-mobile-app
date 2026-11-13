/**
 * LocalGraphRouter.ts
 *
 * Embedded On-Device Offline Routing Engine for Elk Country.
 * Uses the road network extracted from OpenStreetMap (via elk-roads.json) to calculate
 * authentic, road-following routes entirely offline in <15ms.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { calcDistance, calculateBearing, decodePolyline } from '../utils/mapUtils';

export interface RouteCoord {
  latitude: number;
  longitude: number;
}

export interface RoundaboutManeuver {
  entryIndex: number;
  exitIndex: number;
  exitNumber: number;
  name?: string;
  roundaboutId?: number;
}

export interface LocalRouteResult {
  coordinates: [number, number][];
  distance: number;  // meters
  duration: number;  // seconds
  roundabouts?: RoundaboutManeuver[];
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
  isOneway?: boolean;
  roadType?: string;
  isRoundabout?: boolean;
  roundaboutId?: number;
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

export interface RoundaboutInfo {
  id: number;
  name?: string;
  nodes: (number | string)[];
  coords: [number, number][];
  exitNodes: Set<number | string>;
  entryNodes: Set<number | string>;
}

class LocalGraphRouterClass {
  private nodes: Map<number, GraphNode> = new Map();
  private adjacency: Map<number, GraphEdge[]> = new Map();
  private grid: Map<string, number[]> = new Map();
  private osmNodeToGraphId = new Map<string, number>();
  private coordToGraphId = new Map<string, number>();
  private nextNodeId = 1;
  private isInitialized = false;
  private hasLoadedFullRoads = false;
  private initPromise: Promise<void> | null = null;

  public roundabouts = new Map<number, RoundaboutInfo>();
  public nodeToRoundabout = new Map<number | string, number>();

  public bounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLng: Infinity,
    maxLng: -Infinity,
  };

  public bboxes: Array<{ minLat: number; maxLat: number; minLng: number; maxLng: number }> = [];

  private updateNodeSpatialIndex(id: number, lng: number, lat: number) {
    if (lat < this.bounds.minLat) this.bounds.minLat = lat;
    if (lat > this.bounds.maxLat) this.bounds.maxLat = lat;
    if (lng < this.bounds.minLng) this.bounds.minLng = lng;
    if (lng > this.bounds.maxLng) this.bounds.maxLng = lng;

    const gKey = `${Math.floor(lng / 0.02)}_${Math.floor(lat / 0.02)}`;
    if (!this.grid.has(gKey)) this.grid.set(gKey, []);
    this.grid.get(gKey)!.push(id);
  }

  private getOrCreateNode(lng: number, lat: number, osmId?: number | string): number {
    // 1. Authentic OSM Node ID match: guarantees 100% topological correctness
    if (osmId !== undefined && osmId !== null) {
      const key = String(osmId);
      const existingId = this.osmNodeToGraphId.get(key);
      if (existingId !== undefined) {
        return existingId;
      }
      const id = this.nextNodeId++;
      this.osmNodeToGraphId.set(key, id);
      this.coordToGraphId.set(`${lng.toFixed(6)}_${lat.toFixed(6)}`, id);
      const node: GraphNode = { id, lng, lat };
      this.nodes.set(id, node);
      this.updateNodeSpatialIndex(id, lng, lat);
      return id;
    }

    // 2. Exact 6-decimal coordinate matching (~0.1m precision) for legacy JSON without node IDs
    // Ensures genuine OSM shared intersections connect while physically separate carriageways (4-15m apart) remain completely isolated
    const coordKey = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
    const existingId = this.coordToGraphId.get(coordKey);
    if (existingId !== undefined) {
      return existingId;
    }
    const id = this.nextNodeId++;
    this.coordToGraphId.set(coordKey, id);
    const node: GraphNode = { id, lng, lat };
    this.nodes.set(id, node);
    this.updateNodeSpatialIndex(id, lng, lat);
    return id;
  }

  private addEdge(
    u: number,
    v: number,
    dist: number,
    weight: number,
    speedMps: number,
    coords: [number, number][],
    isOneway: boolean = false,
    roadType: string = '',
    isRoundabout: boolean = false,
    roundaboutId?: number
  ) {
    if (u === v) return;
    if (!this.adjacency.has(u)) this.adjacency.set(u, []);
    this.adjacency.get(u)!.push({
      to: v,
      dist,
      weight,
      speedMps,
      coords,
      isOneway,
      roadType,
      isRoundabout,
      roundaboutId,
    });
  }

  public indexPolyline(
    coords: [number, number][],
    isOneway: boolean = false,
    isReverse: boolean = false,
    roadType: string = '',
    nodeIds?: (number | string)[],
    isRoundabout: boolean = false,
    roundaboutId?: number
  ) {
    if (!coords || !Array.isArray(coords) || coords.length < 2) return;
    const profile = ROAD_PROFILES[roadType.toLowerCase()] || DEFAULT_ROAD_PROFILE;
    const hasNodeIds = Array.isArray(nodeIds) && nodeIds.length === coords.length;

    for (let i = 0; i < coords.length - 1; i++) {
      const c1 = coords[i];
      const c2 = coords[i + 1];
      const u = this.getOrCreateNode(c1[0], c1[1], hasNodeIds ? nodeIds[i] : undefined);
      const v = this.getOrCreateNode(c2[0], c2[1], hasNodeIds ? nodeIds[i + 1] : undefined);
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
            this.addEdge(v, u, d, weight, speedMps, [c2, c1], true, roadType, isRoundabout, roundaboutId);
          } else {
            // Standard forward oneway (e.g. oneway="yes", roundabouts): edge goes u -> v
            this.addEdge(u, v, d, weight, speedMps, [c1, c2], true, roadType, isRoundabout, roundaboutId);
          }
        } else {
          // Standard two-way road: both directions are legal
          this.addEdge(u, v, d, weight, speedMps, [c1, c2], false, roadType, isRoundabout, roundaboutId);
          this.addEdge(v, u, d, weight, speedMps, [c2, c1], false, roadType, isRoundabout, roundaboutId);
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
          this.osmNodeToGraphId.clear();
          this.coordToGraphId.clear();
          this.roundabouts.clear();
          this.nodeToRoundabout.clear();
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

          // Pass 1: Catalog all roundabout features and map their nodes
          for (const r of data.roads) {
            const props = r.properties || {};
            const isRoundabout =
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

            const nodeIds = Array.isArray(r.node_ids)
              ? r.node_ids
              : Array.isArray(r.nodes)
              ? r.nodes
              : undefined;

            if (isRoundabout && nodeIds && nodeIds.length > 0) {
              const rbInfo: RoundaboutInfo = {
                id: r.id,
                name: r.name,
                nodes: nodeIds,
                coords: r.coords || [],
                exitNodes: new Set(),
                entryNodes: new Set(),
              };
              this.roundabouts.set(r.id, rbInfo);
              for (const nid of nodeIds) {
                this.nodeToRoundabout.set(nid, r.id);
              }
            }
          }

          // Pass 2: Index all roads and determine exit/entry nodes for roundabouts
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

              const isRoundabout = this.roundabouts.has(r.id);
              const isOneway = isForwardOneway || isReverse;
              const roadType = (r.type || r.highway || props.type || props.highway || '').toLowerCase();
              const nodeIds = Array.isArray(r.node_ids)
                ? r.node_ids
                : Array.isArray(r.nodes)
                ? r.nodes
                : undefined;

              // If a connecting road touches a roundabout, record which branch it is (exit vs entrance)
              if (!isRoundabout && nodeIds) {
                for (let i = 0; i < nodeIds.length; i++) {
                  const nid = nodeIds[i];
                  const rbId = this.nodeToRoundabout.get(nid);
                  if (rbId !== undefined) {
                    const rb = this.roundabouts.get(rbId);
                    if (rb) {
                      if (!isOneway) {
                        rb.exitNodes.add(nid);
                        rb.entryNodes.add(nid);
                      } else if (isReverse ? (i === nodeIds.length - 1) : (i === 0)) {
                        rb.exitNodes.add(nid); // Road flows OUT of roundabout -> EXIT
                      } else if (isReverse ? (i === 0) : (i === nodeIds.length - 1)) {
                        rb.entryNodes.add(nid); // Road flows INTO roundabout -> ENTRANCE
                      } else {
                        rb.exitNodes.add(nid);
                        rb.entryNodes.add(nid);
                      }
                    }
                  }
                }
              }

              this.indexPolyline(
                r.coords,
                isOneway,
                isReverse,
                roadType,
                nodeIds,
                isRoundabout,
                isRoundabout ? r.id : undefined
              );
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
   * ensuring pins bind to the correct directional carriageway matching heading.
   */
  public findNearestEdgeCandidates(
    coord: RouteCoord,
    maxCandidates: number = 4,
    heading?: number
  ): {
    u: number;
    v: number;
    dist: number;
    score: number;
    projCoord: [number, number];
    tParam: number;
    bearing: number;
    edgeKey: string;
    edgeCoords: [number, number][];
    isOneway: boolean;
    roadType: string;
    speedMps: number;
  }[] {
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
    const results: {
      u: number;
      v: number;
      dist: number;
      score: number;
      projCoord: [number, number];
      tParam: number;
      bearing: number;
      edgeKey: string;
      edgeCoords: [number, number][];
      isOneway: boolean;
      roadType: string;
      speedMps: number;
    }[] = [];

    const hasHeading = heading !== undefined && heading !== null && !isNaN(heading);
    const normHeading = hasHeading ? ((heading! % 360) + 360) % 360 : 0;

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

          const segBearing = calculateBearing(
            { latitude: a[1], longitude: a[0] },
            { latitude: b[1], longitude: b[0] }
          );

          let score = dist;
          if (hasHeading && dist < 15) {
            const angleDiff = Math.abs(((normHeading - segBearing + 180) % 360 + 360) % 360 - 180);
            if (edge.isOneway) {
              if (angleDiff > 90) {
                // Mild penalty (+5m) as a tie-breaker between equidistant edges,
                // but never large enough to leap across a solid median (12-30m away)
                score += 5.0;
              } else if (angleDiff < 45) {
                score -= 3.0;
              }
            } else {
              // Two-way road
              if (angleDiff < 45) {
                score -= 2.0;
              } else if (angleDiff > 135) {
                score += 3.0;
              }
            }
          }

          results.push({
            u,
            v: edge.to,
            dist,
            score,
            projCoord: [projX, projY],
            tParam: t,
            bearing: segBearing,
            edgeKey,
            edgeCoords: segs,
            isOneway: !!edge.isOneway,
            roadType: edge.roadType || '',
            speedMps: edge.speedMps || 15.0,
          });
        }
      }
    }

    results.sort((a, b) => a.score - b.score);

    // Keep unique entry node IDs to give diverse routing options
    const uniqueCandidates: typeof results = [];
    const seenU = new Set<number>();
    for (const cand of results) {
      if (!seenU.has(cand.u)) {
        seenU.add(cand.u);
        uniqueCandidates.push(cand);
        if (uniqueCandidates.length >= maxCandidates) break;
      }
    }

    return uniqueCandidates;
  }

  /**
   * Snaps a GPS coordinate to the nearest road edge in the road network graph.
   * Considers heading to distinguish parallel carriageways and includes hysteresis
   * to prevent marker fluttering when moving slowly or stopped.
   */
  public snapToNearestRoad(
    coord: RouteCoord,
    heading?: number,
    maxDistanceMeters: number = 25,
    preferredEdgeKey?: string
  ): { coordinate: RouteCoord; bearing: number; distance: number; edgeKey: string } | null {
    if (this.nodes.size === 0) return null;
    if (!Number.isFinite(coord?.latitude) || !Number.isFinite(coord?.longitude)) return null;

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

    let bestCandidate: {
      projX: number;
      projY: number;
      dist: number;
      score: number;
      bearing: number;
      edgeKey: string;
    } | null = null;

    const hasHeading = heading !== undefined && heading !== null && !isNaN(heading);
    const normHeading = hasHeading ? ((heading! % 360) + 360) % 360 : 0;

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

          if (dist > maxDistanceMeters) continue;

          const segBearing = calculateBearing(
            { latitude: a[1], longitude: a[0] },
            { latitude: b[1], longitude: b[0] }
          );

          let score = dist;

          // Hysteresis: give slight preference to the currently snapped road edge
          if (preferredEdgeKey && edgeKey === preferredEdgeKey) {
            score -= 4.0;
          }

          // Heading & directionality: prevent snapping to opposite carriageway on divided roads
          if (hasHeading) {
            const angleDiff = Math.abs(((normHeading - segBearing + 180) % 360 + 360) % 360 - 180);
            if (edge.isOneway) {
              if (angleDiff > 90) {
                // Opposite direction on one-way road (e.g. wrong carriageway)
                score += 40.0;
              } else if (angleDiff < 45) {
                score -= 3.0;
              }
            } else {
              // Two-way road: align with user's forward movement
              if (angleDiff < 45) {
                score -= 2.0;
              } else if (angleDiff > 135) {
                score += 5.0;
              }
            }
          }

          if (!bestCandidate || score < bestCandidate.score) {
            bestCandidate = {
              projX,
              projY,
              dist,
              score,
              bearing: segBearing,
              edgeKey,
            };
          }
        }
      }
    }

    if (bestCandidate && bestCandidate.dist <= maxDistanceMeters) {
      return {
        coordinate: {
          latitude: bestCandidate.projY,
          longitude: bestCandidate.projX,
        },
        bearing: bestCandidate.bearing,
        distance: bestCandidate.dist,
        edgeKey: bestCandidate.edgeKey,
      };
    }

    return null;
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

  /**
   * Computes which exit number (1st, 2nd, 3rd, 4th...) a vehicle takes when traversing a roundabout.
   */
  public getExitNumber(
    roundaboutId: number,
    enterNode: number | string,
    exitNode: number | string
  ): number {
    const rb = this.roundabouts.get(roundaboutId);
    if (!rb || !rb.nodes.length) return 1;

    const nodes = rb.nodes;
    const enterIdx = nodes.indexOf(enterNode);
    const exitIdx = nodes.indexOf(exitNode);
    if (enterIdx === -1 || exitIdx === -1) return 1;

    let count = 0;
    let idx = enterIdx;
    const n = nodes.length - 1;
    if (n <= 0) return 1;

    while (true) {
      idx = (idx + 1) % n;
      const nid = nodes[idx];
      if (rb.exitNodes.has(nid)) {
        count++;
      }
      if (nid === exitNode) {
        break;
      }
      if (idx === enterIdx) break;
    }
    return Math.max(1, count);
  }

  /**
   * Finds the closest roundabout node ID to a given coordinate.
   */
  public findClosestRbNode(rb: RoundaboutInfo, lng: number, lat: number): number | string {
    let bestDist = Infinity;
    let bestNid = rb.nodes[0];
    for (let i = 0; i < rb.coords.length; i++) {
      const c = rb.coords[i];
      const dx = c[0] - lng;
      const dy = c[1] - lat;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDist) {
        bestDist = dSq;
        if (rb.nodes[i] !== undefined) {
          bestNid = rb.nodes[i];
        }
      }
    }
    return bestNid;
  }

  /**
   * Detects all roundabout maneuvers traversed by an arbitrary route polyline.
   */
  public detectRoundaboutsInPolyline(coords: [number, number][]): RoundaboutManeuver[] {
    if (!coords || coords.length < 3 || this.roundabouts.size === 0) return [];
    const maneuvers: RoundaboutManeuver[] = [];

    for (const [rbId, rb] of this.roundabouts.entries()) {
      if (!rb.coords || rb.coords.length === 0) continue;

      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const c of rb.coords) {
        if (c[0] < minLng) minLng = c[0];
        if (c[0] > maxLng) maxLng = c[0];
        if (c[1] < minLat) minLat = c[1];
        if (c[1] > maxLat) maxLat = c[1];
      }
      // Expand bbox by ~25 meters (~0.00025 deg)
      minLng -= 0.0003; maxLng += 0.0003;
      minLat -= 0.0003; maxLat += 0.0003;

      let inRbStart = -1;
      let inRbEnd = -1;

      for (let i = 0; i < coords.length; i++) {
        const pt = coords[i];
        if (pt[0] >= minLng && pt[0] <= maxLng && pt[1] >= minLat && pt[1] <= maxLat) {
          let close = false;
          for (const rc of rb.coords) {
            const d = calcDistance({ latitude: pt[1], longitude: pt[0] }, { latitude: rc[1], longitude: rc[0] });
            if (d <= 20) {
              close = true;
              break;
            }
          }
          if (close) {
            if (inRbStart === -1) inRbStart = i;
            inRbEnd = i;
          } else if (inRbStart !== -1 && (i - inRbEnd > 2)) {
            break;
          }
        } else if (inRbStart !== -1 && (i - inRbEnd > 2)) {
          break;
        }
      }

      if (inRbStart !== -1 && inRbEnd > inRbStart) {
        const enterNode = this.findClosestRbNode(rb, coords[inRbStart][0], coords[inRbStart][1]);
        const exitNode = this.findClosestRbNode(rb, coords[inRbEnd][0], coords[inRbEnd][1]);
        const exitNumber = this.getExitNumber(rbId, enterNode, exitNode);

        maneuvers.push({
          entryIndex: inRbStart,
          exitIndex: inRbEnd,
          exitNumber,
          name: rb.name || 'Roundabout',
          roundaboutId: rbId,
        });
      }
    }

    return maneuvers.sort((a, b) => a.entryIndex - b.entryIndex);
  }

  public calculateRoute(
    fromCoord: RouteCoord,
    toCoord: RouteCoord,
    fromHeading?: number
  ): LocalRouteResult | null {
    if (this.nodes.size === 0) return null;

    // 1. Edge Projection for Start Point: find nearest road segments matching heading
    const startCandidates = this.findNearestEdgeCandidates(fromCoord, 4, fromHeading);

    // 2. Edge Projection for Destination Point
    const endCandidates = this.findNearestEdgeCandidates(toCoord, 4);

    // Check Case 1: Same Directed Road Edge
    // If start and destination bind to the exact same directed road segment:
    for (const sCand of startCandidates) {
      for (const tCand of endCandidates) {
        if (sCand.u === tCand.u && sCand.v === tCand.v) {
          // If destination is ahead of start along the edge direction:
          if (tCand.tParam >= sCand.tParam) {
            const segDist = calcDistance(
              { latitude: sCand.projCoord[1], longitude: sCand.projCoord[0] },
              { latitude: tCand.projCoord[1], longitude: tCand.projCoord[0] }
            );
            return {
              coordinates: [
                [fromCoord.longitude, fromCoord.latitude],
                sCand.projCoord,
                tCand.projCoord,
              ],
              distance: sCand.dist + segDist + tCand.dist,
              duration: Math.max(
                10,
                Math.round((sCand.dist + segDist + tCand.dist) / (sCand.speedMps || 15.0))
              ),
            };
          }
        }
      }
    }

    interface StartCandidate {
      startId: number;
      curbCoord: [number, number];
      distToPin: number;
      speedMps: number;
    }

    const starts: StartCandidate[] = [];
    const minStartDist = startCandidates.length > 0 ? startCandidates[0].dist : Infinity;
    const maxAllowedStartDist = minStartDist <= 10 ? minStartDist + 3.0 : minStartDist + 8.0;
    for (const cand of startCandidates) {
      // Disallow any candidate that is significantly farther than the true closest road
      // (prevents leaping across solid highway medians 6-30m away)
      if (cand.dist <= 150 && cand.dist <= maxAllowedStartDist) {
        // Forward entry into the graph at edge end node v
        starts.push({
          startId: cand.v,
          curbCoord: cand.projCoord,
          distToPin: cand.dist,
          speedMps: cand.speedMps || 15.0,
        });
      }
    }

    // Fallback start node if no edge candidates matched or if too far
    if (starts.length === 0) {
      const fallbackStart =
        this.findNearestNode(fromCoord, true) || this.findNearestNode(fromCoord, false);
      if (fallbackStart) {
        starts.push({
          startId: fallbackStart.id,
          curbCoord: [fallbackStart.lng, fallbackStart.lat],
          distToPin: calcDistance(fromCoord, { latitude: fallbackStart.lat, longitude: fallbackStart.lng }),
          speedMps: 15.0,
        });
      }
    }

    if (starts.length === 0 || starts[0].distToPin > 10000) {
      console.warn(`[LocalGraphRouter] Start point too far from road network`);
      return null;
    }

    interface TargetCandidate {
      targetId: number;
      curbCoord: [number, number];
      distToPin: number;
    }

    const targets: TargetCandidate[] = [];
    const minEndDist = endCandidates.length > 0 ? endCandidates[0].dist : Infinity;
    const maxAllowedEndDist = minEndDist <= 10 ? minEndDist + 3.0 : minEndDist + 8.0;
    for (const cand of endCandidates) {
      if (cand.dist <= 150 && cand.dist <= maxAllowedEndDist) {
        targets.push({
          targetId: cand.u,
          curbCoord: cand.projCoord,
          distToPin: cand.dist,
        });
      }
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

    if (targets.length === 0 || targets[0].distToPin > 10000) {
      console.warn(`[LocalGraphRouter] Destination too far from road network`);
      return null;
    }

    // 3. Try start candidates and destination targets
    for (const start of starts) {
      const startNode = this.nodes.get(start.startId);
      if (!startNode) continue;

      for (const target of targets) {
        // Direct connection if start node and target node match
        if (start.startId === target.targetId) {
          const directDist = calcDistance(
            { latitude: start.curbCoord[1], longitude: start.curbCoord[0] },
            { latitude: target.curbCoord[1], longitude: target.curbCoord[0] }
          );
          const coords: [number, number][] = [
            [fromCoord.longitude, fromCoord.latitude],
          ];
          if (
            Math.abs(start.curbCoord[0] - fromCoord.longitude) > 0.000001 ||
            Math.abs(start.curbCoord[1] - fromCoord.latitude) > 0.000001
          ) {
            coords.push(start.curbCoord);
          }
          if (
            Math.abs(target.curbCoord[0] - start.curbCoord[0]) > 0.000001 ||
            Math.abs(target.curbCoord[1] - start.curbCoord[1]) > 0.000001
          ) {
            coords.push(target.curbCoord);
          }
          return {
            coordinates: coords,
            distance: directDist + start.distToPin + target.distToPin,
            duration: Math.max(10, Math.round((directDist + start.distToPin + target.distToPin) / 12.0)),
          };
        }

        // A* Pathfinding from start.startId to target.targetId
        const targetNode = this.nodes.get(target.targetId);
        if (!targetNode) continue;

        const dists = new Map<number, number>();
        const prev = new Map<
          number,
          { from: number; coords: [number, number][]; dist: number; speedMps: number }
        >();
        const heap = new MinHeap();

        dists.set(start.startId, 0);
        heap.push({ id: start.startId, dist: 0, priority: 0 });

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

        // Append start curb projection point
        if (
          Math.abs(start.curbCoord[0] - fromCoord.longitude) > 0.000001 ||
          Math.abs(start.curbCoord[1] - fromCoord.latitude) > 0.000001
        ) {
          fullCoords.push(start.curbCoord);
        }

        // Append forward edge segment to start node if distinct
        if (
          Math.abs(startNode.lng - start.curbCoord[0]) > 0.000001 ||
          Math.abs(startNode.lat - start.curbCoord[1]) > 0.000001
        ) {
          fullCoords.push([startNode.lng, startNode.lat]);
        }

        if (pathSegments.length > 0) {
          for (const seg of pathSegments) {
            for (const pt of seg) {
              const last = fullCoords[fullCoords.length - 1];
              if (
                !last ||
                Math.abs(last[0] - pt[0]) > 0.000001 ||
                Math.abs(last[1] - pt[1]) > 0.000001
              ) {
                fullCoords.push(pt);
              }
            }
          }
        }

        // 3. Curb-Stop: append projected curb drop-off point on the road
        const lastPt = fullCoords[fullCoords.length - 1];
        if (
          Math.abs(lastPt[0] - target.curbCoord[0]) > 0.000001 ||
          Math.abs(lastPt[1] - target.curbCoord[1]) > 0.00001
        ) {
          fullCoords.push(target.curbCoord);
        }

        const leadInDist =
          start.distToPin +
          calcDistance(
            { latitude: start.curbCoord[1], longitude: start.curbCoord[0] },
            { latitude: startNode.lat, longitude: startNode.lng }
          );
        const curbDist =
          calcDistance(
            { latitude: targetNode.lat, longitude: targetNode.lng },
            { latitude: target.curbCoord[1], longitude: target.curbCoord[0] }
          ) + target.distToPin;
        const totalDist = leadInDist + totalRoadDist + curbDist;
        const durationSec = Math.max(
          10,
          Math.round(leadInDist / start.speedMps + totalRoadTimeSec + curbDist / 8.0)
        );

        const roundabouts = this.detectRoundaboutsInPolyline(fullCoords);

        return {
          coordinates: fullCoords,
          distance: totalDist,
          duration: durationSec,
          roundabouts,
        };
      }
    }

    console.warn(`[LocalGraphRouter] No path found between points`);
    return null;
  }
}

export const LocalGraphRouter = new LocalGraphRouterClass();
