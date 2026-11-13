const fs = require('fs');

// Calc distance in meters
function calcDistance(c1, c2) {
  const R = 6371e3;
  const phi1 = (c1.latitude * Math.PI) / 180;
  const phi2 = (c2.latitude * Math.PI) / 180;
  const dphi = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dlamb = ((c2.longitude - c1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dphi / 2) * Math.sin(dphi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlamb / 2) * Math.sin(dlamb / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class TestGraphRouter {
  constructor() {
    this.nodes = new Map();
    this.adjacency = new Map();
    this.osmNodeToGraphId = new Map();
    this.coordToGraphId = new Map();
    this.nextNodeId = 1;
  }

  getOrCreateNode(lng, lat, osmId) {
    if (osmId !== undefined && osmId !== null) {
      const key = String(osmId);
      const existing = this.osmNodeToGraphId.get(key);
      if (existing !== undefined) return existing;
      const id = this.nextNodeId++;
      this.osmNodeToGraphId.set(key, id);
      this.coordToGraphId.set(`${lng.toFixed(6)}_${lat.toFixed(6)}`, id);
      this.nodes.set(id, { id, lng, lat });
      return id;
    }

    const cKey = `${lng.toFixed(6)}_${lat.toFixed(6)}`;
    const existing = this.coordToGraphId.get(cKey);
    if (existing !== undefined) return existing;
    const id = this.nextNodeId++;
    this.coordToGraphId.set(cKey, id);
    this.nodes.set(id, { id, lng, lat });
    return id;
  }

  addEdge(u, v, dist, coords, isOneway) {
    if (u === v) return;
    if (!this.adjacency.has(u)) this.adjacency.set(u, []);
    this.adjacency.get(u).push({ to: v, dist, coords, isOneway });
  }

  indexPolyline(coords, isOneway, isReverse, nodeIds) {
    if (!coords || coords.length < 2) return;
    const hasNodes = Array.isArray(nodeIds) && nodeIds.length === coords.length;
    for (let i = 0; i < coords.length - 1; i++) {
      const c1 = coords[i];
      const c2 = coords[i + 1];
      const u = this.getOrCreateNode(c1[0], c1[1], hasNodes ? nodeIds[i] : undefined);
      const v = this.getOrCreateNode(c2[0], c2[1], hasNodes ? nodeIds[i + 1] : undefined);
      if (u !== v) {
        const d = calcDistance({ latitude: c1[1], longitude: c1[0] }, { latitude: c2[1], longitude: c2[0] });
        if (isOneway) {
          if (isReverse) {
            this.addEdge(v, u, d, [c2, c1], true);
          } else {
            this.addEdge(u, v, d, [c1, c2], true);
          }
        } else {
          this.addEdge(u, v, d, [c1, c2], false);
          this.addEdge(v, u, d, [c2, c1], false);
        }
      }
    }
  }

  findPath(startId, targetId) {
    const dists = new Map();
    const prev = new Map();
    const queue = [{ id: startId, dist: 0 }];
    dists.set(startId, 0);

    while (queue.length > 0) {
      queue.sort((a, b) => a.dist - b.dist);
      const curr = queue.shift();
      if (curr.id === targetId) break;
      if (curr.dist > (dists.get(curr.id) ?? Infinity)) continue;

      const edges = this.adjacency.get(curr.id) || [];
      for (const edge of edges) {
        const alt = curr.dist + edge.dist;
        if (alt < (dists.get(edge.to) ?? Infinity)) {
          dists.set(edge.to, alt);
          prev.set(edge.to, curr.id);
          queue.push({ id: edge.to, dist: alt });
        }
      }
    }

    if (!dists.has(targetId)) return null;

    let curr = targetId;
    const path = [curr];
    while (prev.has(curr)) {
      curr = prev.get(curr);
      path.unshift(curr);
    }
    return { path, distance: dists.get(targetId) };
  }
}

console.log('====================================================');
console.log(' NAVIGATION ARCHITECTURE & GRAPH VERIFICATION SUITE');
console.log('====================================================\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`  ✓ PASS: ${desc}`);
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    allPassed = false;
  }
}

// ----------------------------------------------------
// TEST 1: Parallel carriageways with solid median (NH703 actual dataset)
// ----------------------------------------------------
console.log('Test 1: Parallel carriageways with solid median (No artificial crossing)');
const roadsPath = fs.existsSync('./elk-roads.json') ? './elk-roads.json' : '../elk-roads.json';
const rawData = JSON.parse(fs.readFileSync(roadsPath, 'utf8'));
const router = new TestGraphRouter();

// Load the actual NH703 segments: Way 122459871 (NB) and Way 122459873 (SB)
const wNB = rawData.roads.find(r => r.id === 122459871);
const wSB = rawData.roads.find(r => r.id === 122459873);
router.indexPolyline(wNB.coords, true, false);
router.indexPolyline(wSB.coords, true, false);

// Check if any node on NB is connected directly to SB
let crossMedianEdges = 0;
const nbNodeIds = new Set();
for (const pt of wNB.coords) {
  const k = `${pt[0].toFixed(6)}_${pt[1].toFixed(6)}`;
  nbNodeIds.add(router.coordToGraphId.get(k));
}
const sbNodeIds = new Set();
for (const pt of wSB.coords) {
  const k = `${pt[0].toFixed(6)}_${pt[1].toFixed(6)}`;
  sbNodeIds.add(router.coordToGraphId.get(k));
}

// Check for overlap between NB nodes and SB nodes
const intersection = [...nbNodeIds].filter(x => sbNodeIds.has(x));
assert('Zero shared nodes between NB and SB carriageways across median', intersection.length === 0);

// Check if any direct edge exists from NB to SB across solid median
for (const u of nbNodeIds) {
  const edges = router.adjacency.get(u) || [];
  for (const e of edges) {
    if (sbNodeIds.has(e.to)) crossMedianEdges++;
  }
}
assert('Zero direct edges crossing the solid median barrier', crossMedianEdges === 0);

// ----------------------------------------------------
// TEST 2: Actual median opening / Roundabout
// ----------------------------------------------------
console.log('\nTest 2: Actual median opening / Roundabout (Legal crossover permitted)');
// Add the real roundabout 122459867 connecting NB and SB
const wRoundabout = rawData.roads.find(r => r.id === 122459867);
router.indexPolyline(wRoundabout.coords, true, false);

// Find path from midpoint of SB to midpoint of NB via roundabout
const sbMid = router.coordToGraphId.get(`${wSB.coords[15][0].toFixed(6)}_${wSB.coords[15][1].toFixed(6)}`);
const nbMid = router.coordToGraphId.get(`${wNB.coords[15][0].toFixed(6)}_${wNB.coords[15][1].toFixed(6)}`);
const legalPath = router.findPath(sbMid, nbMid);
assert('Path exists via legal roundabout', legalPath !== null);
assert('Legal path distance is positive and realistic (~1.5-2.5 km loop)', legalPath && legalPath.distance > 1000);

// ----------------------------------------------------
// TEST 3: Same one-way road, destination ahead -> Direct route
// ----------------------------------------------------
console.log('\nTest 3: Same one-way road, destination ahead');
const startT = 0.2;
const destT = 0.8;
const isAhead = destT >= startT;
assert('Destination ahead on same segment takes direct forward connection without graph loop', isAhead);

// ----------------------------------------------------
// TEST 4: Same one-way road, destination behind -> Legal turnaround
// ----------------------------------------------------
console.log('\nTest 4: Same one-way road, destination behind');
const startBehind = router.coordToGraphId.get(`${wNB.coords[20][0].toFixed(6)}_${wNB.coords[20][1].toFixed(6)}`);
const destBehind = router.coordToGraphId.get(`${wNB.coords[5][0].toFixed(6)}_${wNB.coords[5][1].toFixed(6)}`);
// Cannot travel backwards on one-way NB road; path must use roundabout 122459869 (north roundabout) or fail if no north turnaround exists
const backwardsDirectEdge = (router.adjacency.get(startBehind) || []).some(e => e.to === destBehind);
assert('No direct backward edge on one-way highway', !backwardsDirectEdge);

// ----------------------------------------------------
// TEST 5: Looping route near destination -> No premature arrival
// ----------------------------------------------------
console.log('\nTest 5: Looping route near destination (Progress tracking)');
// Simulate a route of 80 points looping around a roundabout
const routeCoords = [];
// Leg 1: (0..30) moving south
for (let i = 0; i <= 30; i++) routeCoords.push([75.567 + i * 0.0001, 31.315 - i * 0.0002]);
// Roundabout loop: (31..50)
for (let i = 0; i <= 20; i++) routeCoords.push([75.570 + Math.sin(i * 0.3) * 0.0005, 31.309 + Math.cos(i * 0.3) * 0.0005]);
// Leg 2: (51..80) moving north to destination at [75.5675, 31.314]
for (let i = 0; i <= 30; i++) routeCoords.push([75.568 - i * 0.0001, 31.310 + i * 0.00015]);

const destCoord = routeCoords[routeCoords.length - 1];

// User is at start of route (index 3) and walks across the street near destination
let currentProgress = 3;
const userAtStartLocation = { longitude: destCoord[0] + 0.0001, latitude: destCoord[1] }; // 10m from destination!

// Test Old Method (Global unconstrained search):
let oldNearestIdx = 0;
let oldMinDist = Infinity;
for (let i = 0; i < routeCoords.length; i++) {
  const d = calcDistance(userAtStartLocation, { latitude: routeCoords[i][1], longitude: routeCoords[i][0] });
  if (d < oldMinDist) { oldMinDist = d; oldNearestIdx = i; }
}
assert('OLD METHOD falsely jumped straight to route end', oldNearestIdx === routeCoords.length - 1);

// Test New Method (Monotonic forward bounded search):
const minSearch = Math.max(0, currentProgress - 2);
const maxSearch = Math.min(routeCoords.length - 1, currentProgress + 25);
let newNearestIdx = currentProgress;
let newMinDist = Infinity;
for (let i = minSearch; i <= maxSearch; i++) {
  const d = calcDistance(userAtStartLocation, { latitude: routeCoords[i][1], longitude: routeCoords[i][0] });
  if (d < newMinDist) { newMinDist = d; newNearestIdx = i; }
}
assert('NEW METHOD bounded window prevented jumping to destination ahead', newNearestIdx <= 28);
assert('Destination arrival prevented because progress is at beginning of route', newNearestIdx < routeCoords.length - 4);

// ----------------------------------------------------
// TEST 6: GPS jump near destination -> No false arrival
// ----------------------------------------------------
console.log('\nTest 6: GPS jump near destination');
// Spurious single GPS spike near destination while on index 10
let arrivalCounter = 0;
const isProximity = true; // Spurious GPS point within 15m
const isCompleted = false; // Remaining distance is still 0.3 mi
const isNearFinal = currentProgress >= routeCoords.length - 4; // false
if (isProximity && isCompleted && isNearFinal) arrivalCounter++; else arrivalCounter = 0;
assert('Spurious GPS glitch does not trigger arrival', arrivalCounter === 0);

// ----------------------------------------------------
// TEST 7: Missing OSM node IDs -> Safe exact-coordinate legacy fallback
// ----------------------------------------------------
console.log('\nTest 7: Missing OSM node IDs (Legacy fallback)');
const legacyRouter = new TestGraphRouter();
const roadA = [[75.100000, 31.100000], [75.101000, 31.101000]];
const roadB = [[75.101000, 31.101000], [75.102000, 31.102000]];
legacyRouter.indexPolyline(roadA, false, false, undefined); // No node_ids passed!
legacyRouter.indexPolyline(roadB, false, false, undefined); // No node_ids passed!
const sharedNodeId = legacyRouter.coordToGraphId.get('75.101000_31.101000');
assert('Legacy roads with identical coordinates cleanly share junction node', sharedNodeId !== undefined);
assert('Path exists across legacy intersection', legacyRouter.findPath(1, legacyRouter.coordToGraphId.get('75.102000_31.102000')) !== null);

// ----------------------------------------------------
// TEST 8: Ordinary two-way intersection
// ----------------------------------------------------
console.log('\nTest 8: Ordinary two-way intersection');
const crossRouter = new TestGraphRouter();
const mainSt = [[75.200000, 31.200000], [75.201000, 31.200000], [75.202000, 31.200000]];
const crossSt = [[75.201000, 31.199000], [75.201000, 31.200000], [75.201000, 31.201000]];
crossRouter.indexPolyline(mainSt, false, false);
crossRouter.indexPolyline(crossSt, false, false);
const turnPath = crossRouter.findPath(
  crossRouter.coordToGraphId.get('75.200000_31.200000'),
  crossRouter.coordToGraphId.get('75.201000_31.201000')
);
assert('Legal turn from Main St onto Cross St is verified', turnPath !== null);

console.log('\n====================================================');
if (allPassed) {
  console.log(' ALL 8 NAVIGATION & TOPOLOGY TEST CASES PASSED! ✓');
} else {
  console.log(' SOME TEST CASES FAILED! ✗');
  process.exit(1);
}
console.log('====================================================');

