import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/core/navigation-grid.ts';
import { RtsSimulation } from '../src/core/rts-simulation.ts';
import { WoodGatheringCoordinator } from '../src/core/wood-gathering-coordinator.ts';

const DT = 1 / 30;

function fixture({ workers = 1, amount = 60 } = {}) {
  const grid = new NavigationGrid({ minX: 0, maxX: 30, minZ: 0, maxZ: 30, cellSize: 1, isBlocked: () => false });
  const spawns = Array.from({ length: workers }, (_, index) => ({
    id: index + 1,
    owner: 1,
    position: { x: 2 + index, z: 2 },
    speed: 12,
  }));
  const simulation = new RtsSimulation(grid, spawns, 1, 4);
  const owners = new Map(spawns.map(spawn => [spawn.id, spawn.owner]));
  const gathering = new WoodGatheringCoordinator(
    simulation,
    owners,
    [{ id: 1001, resource: 'wood', position: { x: 10, z: 4 }, amount, interactionRadius: 1.5 }],
    [{ id: 2001, owner: 1, position: { x: 2, z: 2 }, radius: 2 }],
    { carryCapacity: 10, woodPerSecond: 2 },
  );
  return { simulation, gathering };
}

function run(simulation, gathering, fromTick, toTick) {
  for (let tick = fromTick; tick <= toTick; tick++) {
    simulation.fixedUpdate(DT, tick);
    gathering.fixedUpdate(DT, tick);
  }
}

test('wood coordinator completes source -> carry -> drop-off loop over accepted movement', () => {
  const { simulation, gathering } = fixture();
  assert.equal(gathering.issueGather([1], 1001, 1), true);
  run(simulation, gathering, 1, 700);
  const metrics = gathering.metrics();
  assert.ok(metrics.woodStockpile >= 10, `expected a deposited load, got ${metrics.woodStockpile}`);
  assert.ok(metrics.woodRemaining < 60);
  assert.ok(metrics.woodRemaining >= 0);
  assert.ok(metrics.carriedWoodTotal <= 10 + 1e-9);
  gathering.destroy();
  simulation.destroy();
});

test('shared source depletion conserves finite wood with multiple workers', () => {
  const { simulation, gathering } = fixture({ workers: 4, amount: 13 });
  assert.equal(gathering.issueGather([4, 2, 1, 3], 1001, 1), true);
  run(simulation, gathering, 1, 1_200);
  const metrics = gathering.metrics();
  assert.ok(metrics.woodRemaining >= 0);
  assert.ok(metrics.woodRemaining < 1e-9);
  assert.ok(metrics.woodStockpile > 0, 'at least one worker should have completed a deposit');
  assert.ok(metrics.carriedWoodTotal >= 0);
  assert.ok(Math.abs(metrics.woodStockpile + metrics.carriedWoodTotal + metrics.woodRemaining - 13) < 1e-6,
    `wood must be conserved exactly: ${JSON.stringify(metrics)}`);
  for (let id = 1; id <= 4; id++) {
    assert.ok((gathering.workerState(id)?.carriedWood ?? 0) <= 10 + 1e-9, `worker ${id} exceeded carry capacity`);
  }
  gathering.destroy();
  simulation.destroy();
});

test('MOVE cancellation stops gathering task but preserves already carried wood', () => {
  const { simulation, gathering } = fixture();
  gathering.issueGather([1], 1001, 1);
  let tick = 1;
  let carried = 0;
  for (; tick < 500; tick++) {
    simulation.fixedUpdate(DT, tick);
    gathering.fixedUpdate(DT, tick);
    carried = gathering.workerState(1)?.carriedWood ?? 0;
    if (carried > 0.25 && carried < 9) break;
  }
  assert.ok(carried > 0, 'fixture should reach partial cargo');
  gathering.cancelForMove([1]);
  simulation.issueMove([1], { x: 22, z: 22 }, tick + 1);
  run(simulation, gathering, tick + 1, tick + 220);
  const worker = gathering.workerState(1);
  assert.equal(worker?.task, 'idle');
  assert.ok(Math.abs((worker?.carriedWood ?? 0) - carried) < 1e-9);
  const position = simulation.renderState(1)[0];
  assert.ok(position && Math.hypot(position.x - 22, position.z - 22) < 0.8);
  gathering.destroy();
  simulation.destroy();
});

test('invalid or depleted wood target is rejected deterministically', () => {
  const { simulation, gathering } = fixture({ amount: 0 });
  assert.equal(gathering.issueGather([1], 1001, 1), false);
  assert.match(gathering.metrics().lastFailure, /Invalid wood resource/);
  assert.equal(gathering.issueGather([1], 9999, 1), false);
  assert.equal(gathering.workerState(1)?.task, 'idle');
  gathering.destroy();
  simulation.destroy();
});
