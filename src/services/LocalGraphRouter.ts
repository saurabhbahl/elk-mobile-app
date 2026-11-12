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
  dist: number;      // meters
  coords: [number, number][];
}

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

  private addEdge(u: number, v: number, dist: number, coords: [number, number][]) {
    if (u === v) return;
    if (!this.adjacency.has(u)) this.adjacency.set(u, []);
    this.adjacency.get(u)!.push({ to: v, dist, coords });
  }

  public indexPolyline(coords: [number, number][]) {
    if (!coords || !Array.isArray(coords) || coords.length < 2) return;
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
        this.addEdge(u, v, d, [c1, c2]);
        this.addEdge(v, u, d, [c2, c1]);
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
              this.indexPolyline(r.coords);
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
        this.indexPolyline(coords);
      }
    } catch (e) {
      console.warn('[LocalGraphRouter] Fallback route.json baseline load error:', e);
    }
    this.isInitialized = true;
  }

  public async loadFullRoadNetworkIfAvailable() {
    await this.loadRoads();
  }

  private findNearestNode(coord: RouteCoord): GraphNode | null {
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
    const startNode = this.findNearestNode(fromCoord);
    const endNode = this.findNearestNode(toCoord);

    if (!startNode || !endNode) return null;

    // Reject if either point is too far (>10km) from the nearest road in the network
    const startDist = calcDistance(fromCoord, { latitude: startNode.lat, longitude: startNode.lng });
    const endDist = calcDistance(toCoord, { latitude: endNode.lat, longitude: endNode.lng });
    if (startDist > 10000 || endDist > 10000) {
      console.warn(
        `[LocalGraphRouter] Points too far from offline road network (start: ${Math.round(startDist)}m, end: ${Math.round(endDist)}m)`
      );
      return null;
    }

    // Direct connection if snapped to the exact same node
    if (startNode.id === endNode.id) {
      const directDist = calcDistance(fromCoord, toCoord);
      return {
        coordinates: [
          [fromCoord.longitude, fromCoord.latitude],
          [toCoord.longitude, toCoord.latitude],
        ],
        distance: directDist,
        duration: Math.max(10, Math.round((directDist / 1609.34) * 150)),
      };
    }

    // A* Pathfinding
    const dists = new Map<number, number>();
    const prev = new Map<number, { from: number; coords: [number, number][] }>();
    const heap = new MinHeap();

    dists.set(startNode.id, 0);
    heap.push({ id: startNode.id, dist: 0, priority: 0 });

    const endTarget = { latitude: endNode.lat, longitude: endNode.lng };

    while (!heap.isEmpty()) {
      const curr = heap.pop()!;
      if (curr.id === endNode.id) break;
      if (curr.dist > (dists.get(curr.id) ?? Infinity)) continue;

      const neighbors = this.adjacency.get(curr.id);
      if (!neighbors) continue;

      for (const edge of neighbors) {
        const alt = curr.dist + edge.dist;
        if (alt < (dists.get(edge.to) ?? Infinity)) {
          dists.set(edge.to, alt);
          prev.set(edge.to, { from: curr.id, coords: edge.coords });
          const toNode = this.nodes.get(edge.to);
          const h = toNode
            ? calcDistance({ latitude: toNode.lat, longitude: toNode.lng }, endTarget)
            : 0;
          heap.push({ id: edge.to, dist: alt, priority: alt + h });
        }
      }
    }

    const finalDistance = dists.get(endNode.id);
    if (finalDistance === undefined) {
      console.warn(`[LocalGraphRouter] No path found between nodes ${startNode.id} and ${endNode.id}`);
      return null;
    }

    // Reconstruct polyline path with all authentic road curves
    let curr = endNode.id;
    const pathSegments: [number, number][][] = [];
    while (curr && prev.has(curr)) {
      const p = prev.get(curr)!;
      pathSegments.unshift(p.coords);
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

    const lastPt = fullCoords[fullCoords.length - 1];
    if (
      Math.abs(lastPt[0] - toCoord.longitude) > 0.00001 ||
      Math.abs(lastPt[1] - toCoord.latitude) > 0.00001
    ) {
      fullCoords.push([toCoord.longitude, toCoord.latitude]);
    }

    // Estimate duration: average speed 25-30mph in Elk Country (~150s per mile)
    const durationSec = Math.max(10, Math.round((finalDistance / 1609.34) * 150));

    return {
      coordinates: fullCoords,
      distance: finalDistance,
      duration: durationSec,
    };
  }
}

export const LocalGraphRouter = new LocalGraphRouterClass();
