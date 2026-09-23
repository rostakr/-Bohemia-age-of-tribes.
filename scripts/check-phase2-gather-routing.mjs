import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/core/navigation-grid.ts';
import { RtsSimulation } from '../src/core/rts-simulation.ts';

function grid() {
  return new NavigationGrid({ minX: 0, maxX: 15, minZ: 0, maxZ: 15, cellSize: 1, isBlocked: () => false });
}

test('GATHER command routes owned worker toward resource and preserves target identity', () => {
  const sim = new RtsSimulation(grid(), [{ id: 1, owner: 1, position: { x: 1, z: 1 }, speed: 5 }], 1, 4);
  sim.issueGather([1], 100, { x: 8, z: 8 }, 1);
  for (let tick = 1; tick <= 30; tick++) sim.fixedUpdate(0.1, tick);
  const state = sim.renderState(1)[0];
  assert.equal(sim.gatherTarget(1), 100);
  assert.ok(state.x > 2 && state.z > 2);
});

test('MOVE cleanly interrupts an active GATHER route', () => {
  const sim = new RtsSimulation(grid(), [{ id: 1, owner: 1, position: { x: 1, z: 1 }, speed: 5 }], 1, 4);
  sim.issueGather([1], 100, { x: 8, z: 8 }, 1);
  sim.fixedUpdate(0.1, 1);
  assert.equal(sim.gatherTarget(1), 100);
  sim.issueMove([1], { x: 2, z: 12 }, 2);
  sim.fixedUpdate(0.1, 2);
  assert.equal(sim.gatherTarget(1), null);
});

test('GATHER rejects enemy units', () => {
  const sim = new RtsSimulation(grid(), [{ id: 9, owner: 2, position: { x: 1, z: 1 } }], 1, 4);
  sim.issueGather([9], 100, { x: 8, z: 8 }, 1);
  sim.fixedUpdate(0.1, 1);
  assert.equal(sim.gatherTarget(9), null);
});
