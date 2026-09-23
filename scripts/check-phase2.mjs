import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/core/navigation-grid.ts';
import { RtsSimulation } from '../src/core/rts-simulation.ts';

function openGrid() {
  return new NavigationGrid({ minX: 0, maxX: 12, minZ: 0, maxZ: 12, cellSize: 1, isBlocked: () => false });
}

test('bounded A* uses explicit crossing and does not cross blocked water', () => {
  const grid = new NavigationGrid({
    minX: 0, maxX: 10, minZ: 0, maxZ: 10, cellSize: 1,
    isBlocked: (x, z) => x === 5 && z !== 6,
  });
  const result = grid.findPath({ x: 1, z: 1 }, { x: 9, z: 1 });
  assert.ok(result, 'route should exist through the explicit crossing');
  assert.ok(result.path.some(point => point.x === 5 && point.z === 6), 'route must use the only passable crossing');
  assert.ok(result.visited < 200, 'search must remain bounded for this small route');
});

test('invalid destination resolves to a nearby reachable cell deterministically', () => {
  const grid = new NavigationGrid({
    minX: 0, maxX: 8, minZ: 0, maxZ: 8, cellSize: 1,
    isBlocked: (x, z) => Math.hypot(x - 4, z - 4) < 1.1,
  });
  const first = grid.resolveNearestReachable({ x: 4, z: 4 }, 3);
  const second = grid.resolveNearestReachable({ x: 4, z: 4 }, 3);
  assert.deepEqual(first, second);
  assert.ok(first && grid.isPassable(first));
});

test('group MOVE assigns distinct slots and settles without pathological stacking', () => {
  const grid = openGrid();
  const simulation = new RtsSimulation(grid, [
    { id: 1, owner: 1, position: { x: 1, z: 1 } },
    { id: 2, owner: 1, position: { x: 2, z: 1 } },
    { id: 3, owner: 1, position: { x: 1, z: 2 } },
    { id: 4, owner: 1, position: { x: 2, z: 2 } },
    { id: 5, owner: 1, position: { x: 3, z: 2 } },
  ]);
  simulation.issueMove([5, 1, 4, 2, 3], { x: 9, z: 9 }, 1);
  for (let tick = 1; tick <= 240; tick++) simulation.fixedUpdate(1 / 30, tick);
  const states = simulation.renderState(1);
  assert.equal(states.length, 5);
  assert.equal(simulation.metrics().pendingPaths, 0);
  for (const state of states) assert.ok(Math.hypot(state.x - 9, state.z - 9) < 4, `unit ${state.id} should arrive near group target`);
  for (let a = 0; a < states.length; a++) for (let b = a + 1; b < states.length; b++) {
    assert.ok(Math.hypot(states[a].x - states[b].x, states[a].z - states[b].z) > 0.5, 'settled units should not permanently stack');
  }
  simulation.destroy();
});

test('new MOVE order predictably replaces an older route', () => {
  const simulation = new RtsSimulation(openGrid(), [{ id: 7, owner: 1, position: { x: 1, z: 1 } }]);
  simulation.issueMove([7], { x: 11, z: 1 }, 1);
  simulation.fixedUpdate(1 / 30, 1);
  simulation.issueMove([7], { x: 1, z: 11 }, 2);
  for (let tick = 2; tick <= 180; tick++) simulation.fixedUpdate(1 / 30, tick);
  const unit = simulation.renderState(1)[0];
  assert.ok(unit);
  assert.ok(Math.hypot(unit.x - 1, unit.z - 11) < 0.6, 'unit should settle at replacement destination');
  simulation.destroy();
});

test('path solving is throttled per tick for the debug-unit case', () => {
  const grid = new NavigationGrid({ minX: -20, maxX: 20, minZ: -20, maxZ: 20, cellSize: 1, isBlocked: () => false });
  const spawns = Array.from({ length: 40 }, (_, index) => ({
    id: index + 1,
    owner: 1,
    position: { x: -15 + index % 8, z: -15 + Math.floor(index / 8) },
  }));
  const simulation = new RtsSimulation(grid, spawns, 1, 3);
  simulation.issueMove(spawns.map(spawn => spawn.id), { x: 12, z: 12 }, 1);
  simulation.fixedUpdate(1 / 30, 1);
  assert.ok(simulation.metrics().pathsSolvedThisTick <= 3);
  assert.ok(simulation.metrics().pendingPaths >= 37);
  simulation.destroy();
});
