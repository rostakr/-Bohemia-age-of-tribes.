import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/core/navigation-grid.ts';
import { RtsSimulation } from '../src/core/rts-simulation.ts';

function openGrid(size = 60, cellSize = 1) {
  return new NavigationGrid({
    minX: -size,
    maxX: size,
    minZ: -size,
    maxZ: size,
    cellSize,
    isBlocked: () => false,
  });
}

test('navigation components reject distant unreachable destinations and repeated queries stay deterministic', () => {
  const grid = new NavigationGrid({
    minX: 0, maxX: 30, minZ: 0, maxZ: 30, cellSize: 1,
    isBlocked: x => x === 15,
  });
  assert.equal(grid.componentCount, 2);
  assert.notEqual(grid.componentAt({ x: 2, z: 15 }), grid.componentAt({ x: 28, z: 15 }));
  assert.equal(grid.findPath({ x: 2, z: 15 }, { x: 28, z: 15 }), null);

  const connected = new NavigationGrid({
    minX: 0, maxX: 30, minZ: 0, maxZ: 30, cellSize: 1,
    isBlocked: (x, z) => x === 15 && z !== 15,
  });
  const first = connected.findPath({ x: 2, z: 3 }, { x: 28, z: 27 });
  const second = connected.findPath({ x: 2, z: 3 }, { x: 28, z: 27 });
  assert.ok(first && second);
  assert.deepEqual(first.path, second.path);
  assert.equal(first.visited, second.visited);
  assert.ok(first.rawCells > first.path.length, 'safe smoothing should reduce raw grid-cell waypoints');
});

test('segment visibility never cuts a blocked diagonal corner', () => {
  const grid = new NavigationGrid({
    minX: 0, maxX: 4, minZ: 0, maxZ: 4, cellSize: 1,
    isBlocked: (x, z) => (x === 1 && z === 0) || (x === 0 && z === 1),
  });
  assert.equal(grid.isPassableSegment({ x: 0, z: 0 }, { x: 1, z: 1 }), false);
});

test('head-on units use deterministic local avoidance and still reach opposite destinations', () => {
  const simulation = new RtsSimulation(openGrid(20), [
    { id: 1, owner: 1, position: { x: -8, z: 0 } },
    { id: 2, owner: 1, position: { x: 8, z: 0 } },
  ], 1, 2);
  simulation.issueMove([1], { x: 8, z: 0 }, 1);
  simulation.issueMove([2], { x: -8, z: 0 }, 1);
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let tick = 1; tick <= 300; tick++) {
    simulation.fixedUpdate(1 / 30, tick);
    const states = simulation.renderState(1);
    minimumDistance = Math.min(minimumDistance, Math.hypot(states[0].x - states[1].x, states[0].z - states[1].z));
  }
  const states = simulation.renderState(1);
  assert.ok(Math.hypot(states[0].x - 8, states[0].z) < 0.6);
  assert.ok(Math.hypot(states[1].x + 8, states[1].z) < 0.6);
  assert.ok(minimumDistance > 0.12, `units should avoid exact overlap, minimum observed ${minimumDistance}`);
  simulation.destroy();
});

test('stalled repaths share the bounded path queue and cannot grow without bound', () => {
  const simulation = new RtsSimulation(openGrid(20), [
    { id: 1, owner: 1, position: { x: -8, z: 0 }, speed: 0 },
  ], 1, 1);
  simulation.issueMove([1], { x: 8, z: 0 }, 1);
  let repathObserved = false;
  let maximumPending = 0;
  for (let tick = 1; tick <= 220; tick++) {
    simulation.fixedUpdate(1 / 30, tick);
    const metrics = simulation.metrics();
    maximumPending = Math.max(maximumPending, metrics.pendingPaths);
    repathObserved ||= metrics.repathsQueuedThisTick > 0;
    assert.ok(metrics.pathsSolvedThisTick <= 1);
  }
  assert.equal(repathObserved, true);
  assert.ok(maximumPending <= 1, `single stalled unit must not duplicate repath requests, observed queue ${maximumPending}`);
  simulation.destroy();
});

test('120-unit group movement keeps path solving bounded and settles without pathological stacking', () => {
  const grid = openGrid(70, 1);
  const spawns = Array.from({ length: 120 }, (_, index) => ({
    id: index + 1,
    owner: 1,
    position: { x: -48 + (index % 12) * 1.5, z: -30 + Math.floor(index / 12) * 1.5 },
  }));
  const simulation = new RtsSimulation(grid, spawns, 1, 6);
  simulation.issueMove(spawns.map(spawn => spawn.id), { x: 38, z: 28 }, 1);

  let maximumPending = 0;
  let maximumVisited = 0;
  let maximumNeighborChecks = 0;
  for (let tick = 1; tick <= 1_500; tick++) {
    simulation.fixedUpdate(1 / 30, tick);
    const metrics = simulation.metrics();
    assert.ok(metrics.pathsSolvedThisTick <= 6, `path budget exceeded at tick ${tick}`);
    maximumPending = Math.max(maximumPending, metrics.pendingPaths);
    maximumVisited = Math.max(maximumVisited, metrics.pathNodesVisitedThisTick);
    maximumNeighborChecks = Math.max(maximumNeighborChecks, metrics.neighborChecksThisTick);
  }

  const states = simulation.renderState(1);
  const metrics = simulation.metrics();
  assert.equal(states.length, 120);
  assert.equal(metrics.pendingPaths, 0);
  assert.ok(maximumPending >= 114, `initial queue should expose throttling, observed ${maximumPending}`);
  assert.ok(maximumVisited > 0);
  assert.ok(maximumNeighborChecks > 0);
  assert.ok(states.filter(state => Math.hypot(state.x - 38, state.z - 28) < 18).length >= 110,
    'nearly all stress units should settle around the assigned destination region');

  for (let a = 0; a < states.length; a++) {
    for (let b = a + 1; b < states.length; b++) {
      assert.ok(Math.hypot(states[a].x - states[b].x, states[a].z - states[b].z) > 0.08,
        `stress units ${states[a].id}/${states[b].id should not end in an exact stack`);
    }
  }
  simulation.destroy();
});
