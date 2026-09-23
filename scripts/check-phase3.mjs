import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/core/navigation-grid.ts';
import { RtsSimulation } from '../src/core/rts-simulation.ts';

const DT = 1 / 30;

function openGrid() {
  return new NavigationGrid({ minX: 0, maxX: 24, minZ: 0, maxZ: 24, cellSize: 1, isBlocked: () => false });
}

function fixture({ workers = 1, amount = 100, maxPaths = 4 } = {}) {
  const spawns = Array.from({ length: workers }, (_, index) => ({
    id: index + 1,
    owner: 1,
    position: { x: 2 + (index % 4), z: 2 + Math.floor(index / 4) },
    speed: 12,
  }));
  return new RtsSimulation(
    openGrid(),
    spawns,
    1,
    maxPaths,
    [{ id: 1001, type: 'wood', position: { x: 10, z: 4 }, amount, interactionRadius: 1.5 }],
    [{ id: 2001, owner: 1, position: { x: 2, z: 2 }, radius: 2 }],
    { carryCapacity: 10, woodPerSecond: 2 },
  );
}

function run(simulation, fromTick, toTick, renderEveryTick = false) {
  for (let tick = fromTick; tick <= toTick; tick++) {
    simulation.fixedUpdate(DT, tick);
    if (renderEveryTick) {
      simulation.renderState(0);
      simulation.renderState(0.5);
      simulation.renderState(1);
    }
  }
}

test('GATHER rejects missing targets and foreign workers', () => {
  const simulation = fixture();
  simulation.issueGather([1], 9999, 1);
  simulation.fixedUpdate(DT, 1);
  assert.match(simulation.metrics().lastPathFailure, /Invalid gather target/);
  assert.equal(simulation.metrics().pendingPaths, 0);

  simulation.queueCommand({
    executeAtTick: 2,
    sequence: 50,
    player: 2,
    units: [1],
    queue: false,
    order: { type: 'gather', target: 1001 },
  });
  simulation.fixedUpdate(DT, 2);
  assert.equal(simulation.renderState(1)[0]?.task, 'idle');
  simulation.destroy();
});

test('worker gathers deterministically and never exceeds carry capacity', () => {
  const simulation = fixture();
  simulation.issueGather([1], 1001, 1);
  let maxCarried = 0;
  for (let tick = 1; tick <= 240; tick++) {
    simulation.fixedUpdate(DT, tick);
    maxCarried = Math.max(maxCarried, simulation.renderState(1)[0]?.carriedWood ?? 0);
  }
  assert.ok(maxCarried > 0, 'worker should extract wood');
  assert.ok(maxCarried <= 10 + 1e-9, `carry capacity exceeded: ${maxCarried}`);
  assert.ok(simulation.metrics().woodRemaining < 100);
  simulation.destroy();
});

test('full worker returns to storehouse and deposits carried wood', () => {
  const simulation = fixture();
  simulation.issueGather([1], 1001, 1);
  run(simulation, 1, 420);
  assert.ok(simulation.metrics().woodStockpile >= 10, 'at least one full load should be deposited');
  assert.ok(simulation.metrics().woodRemaining < 100);
  simulation.destroy();
});

test('wood totals are independent of render sampling frequency', () => {
  const a = fixture();
  const b = fixture();
  a.issueGather([1], 1001, 1);
  b.issueGather([1], 1001, 1);
  run(a, 1, 600, false);
  run(b, 1, 600, true);
  assert.ok(Math.abs(a.metrics().woodStockpile - b.metrics().woodStockpile) < 1e-9);
  assert.ok(Math.abs(a.metrics().woodRemaining - b.metrics().woodRemaining) < 1e-9);
  assert.ok(Math.abs(a.metrics().carriedWoodTotal - b.metrics().carriedWoodTotal) < 1e-9);
  a.destroy();
  b.destroy();
});

test('worker repeats source to dropoff loop while wood remains', () => {
  const simulation = fixture({ amount: 60 });
  simulation.issueGather([1], 1001, 1);
  run(simulation, 1, 900);
  assert.ok(simulation.metrics().woodStockpile >= 20, 'worker should complete multiple deposits');
  assert.ok(simulation.metrics().woodRemaining < 40, 'multiple loads should have been extracted');
  simulation.destroy();
});

test('source depletion is finite and never produces negative wood', () => {
  const simulation = fixture({ workers: 3, amount: 7 });
  simulation.issueGather([1, 2, 3], 1001, 1);
  run(simulation, 1, 900);
  const metrics = simulation.metrics();
  assert.ok(metrics.woodRemaining >= 0);
  assert.ok(metrics.woodRemaining < 1e-9);
  assert.ok(Math.abs(metrics.woodStockpile - 7) < 1e-6, `expected exactly 7 deposited, got ${metrics.woodStockpile}`);
  simulation.destroy();
});

test('STOP cancels gather work without deleting already carried wood', () => {
  const simulation = fixture();
  simulation.issueGather([1], 1001, 1);
  let tick = 1;
  for (; tick < 300; tick++) {
    simulation.fixedUpdate(DT, tick);
    const carried = simulation.renderState(1)[0]?.carriedWood ?? 0;
    if (carried > 0.25 && carried < 9) break;
  }
  const before = simulation.renderState(1)[0]?.carriedWood ?? 0;
  assert.ok(before > 0, 'fixture should reach partial carried wood before STOP');
  simulation.issueStop([1], tick + 1);
  simulation.fixedUpdate(DT, tick + 1);
  run(simulation, tick + 2, tick + 90);
  const after = simulation.renderState(1)[0];
  assert.equal(after?.task, 'idle');
  assert.ok(Math.abs((after?.carriedWood ?? 0) - before) < 1e-9);
  assert.equal(simulation.metrics().gatheringUnits, 0);
  simulation.destroy();
});

test('MOVE predictably replaces GATHER', () => {
  const simulation = fixture();
  simulation.issueGather([1], 1001, 1);
  run(simulation, 1, 45);
  simulation.issueMove([1], { x: 20, z: 20 }, 46);
  run(simulation, 46, 180);
  const worker = simulation.renderState(1)[0];
  assert.equal(worker?.task, 'idle');
  assert.ok(worker && Math.hypot(worker.x - 20, worker.z - 20) < 0.7);
  assert.equal(simulation.metrics().gatheringUnits, 0);
  simulation.destroy();
});

test('GATHER predictably replaces MOVE', () => {
  const simulation = fixture();
  simulation.issueMove([1], { x: 22, z: 22 }, 1);
  run(simulation, 1, 10);
  simulation.issueGather([1], 1001, 11);
  run(simulation, 11, 260);
  assert.ok(simulation.metrics().woodRemaining < 100, 'replacement gather order should extract wood');
  simulation.destroy();
});

test('multiple workers cannot extract more than the source contains', () => {
  const simulation = fixture({ workers: 8, amount: 13 });
  simulation.issueGather(simulation.unitIds, 1001, 1);
  run(simulation, 1, 900);
  const metrics = simulation.metrics();
  assert.ok(metrics.woodRemaining >= 0);
  assert.ok(Math.abs(metrics.woodStockpile - 13) < 1e-6, `deposits must equal finite source amount, got ${metrics.woodStockpile}`);
  simulation.destroy();
});

test('gather path solving remains bounded for a multi-worker command', () => {
  const simulation = fixture({ workers: 20, maxPaths: 3 });
  simulation.issueGather(simulation.unitIds, 1001, 1);
  simulation.fixedUpdate(DT, 1);
  const metrics = simulation.metrics();
  assert.ok(metrics.pathsSolvedThisTick <= 3);
  assert.ok(metrics.pendingPaths >= 17);
  simulation.destroy();
});

test('destroy clears units, resources, pending orders and ledger state', () => {
  const simulation = fixture({ workers: 4 });
  simulation.issueGather(simulation.unitIds, 1001, 1);
  simulation.fixedUpdate(DT, 1);
  simulation.destroy();
  const metrics = simulation.metrics();
  assert.equal(metrics.activeUnits, 0);
  assert.equal(metrics.resourceNodes, 0);
  assert.equal(metrics.pendingPaths, 0);
  assert.equal(metrics.woodStockpile, 0);
  assert.equal(simulation.renderState(1).length, 0);
  assert.equal(simulation.resourceState().length, 0);
});
