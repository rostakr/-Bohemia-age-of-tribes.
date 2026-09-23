import test from 'node:test';
import assert from 'node:assert/strict';
import { GatherCoordinator } from '../src/core/gather-coordinator.ts';
import { GatherLoop } from '../src/core/gather-loop.ts';
import { NavigationGrid } from '../src/core/navigation-grid.ts';
import { ResourceEconomy } from '../src/core/resource-economy.ts';
import { RtsSimulation } from '../src/core/rts-simulation.ts';

const DT = 1 / 30;

function fixture({ workers = 1, amount = 20, capacity = 2, rate = 10 } = {}) {
  const navigation = new NavigationGrid({ minX: 0, maxX: 24, minZ: 0, maxZ: 24, cellSize: 1, isBlocked: () => false });
  const spawns = Array.from({ length: workers }, (_, index) => ({
    id: index + 1,
    owner: 1,
    position: { x: 2 + index * 0.7, z: 2 },
    speed: 10,
  }));
  const simulation = new RtsSimulation(navigation, spawns, 1, 4);
  const economy = new ResourceEconomy([
    { id: 1001, resource: 'wood', position: { x: 9, z: 4 }, amount },
  ]);
  const loop = new GatherLoop(economy, spawns.map(spawn => ({
    id: spawn.id,
    owner: spawn.owner,
    position: spawn.position,
    carryCapacity: capacity,
    gatherRatePerSecond: rate,
  })));
  const coordinator = new GatherCoordinator(navigation, simulation, economy, loop, { x: 2, z: 2 }, 1);
  return { navigation, simulation, economy, loop, coordinator };
}

function step(f, fromTick, toTick) {
  for (let tick = fromTick; tick <= toTick; tick++) {
    f.simulation.fixedUpdate(DT, tick);
    f.coordinator.fixedUpdate(DT, tick);
  }
}

test('coordinator completes deterministic resource -> cargo -> storehouse deposit loop', () => {
  const f = fixture();
  assert.equal(f.coordinator.issueGather([1], 1001, 1), true);
  step(f, 1, 420);
  const metrics = f.coordinator.metrics();
  assert.ok(metrics.woodStockpile >= 2, `expected at least one deposit, got ${metrics.woodStockpile}`);
  assert.ok(metrics.woodRemaining < 20, 'wood source should be depleted by gathering');
  assert.ok(metrics.woodRemaining >= 0);
  f.coordinator.destroy(); f.loop.destroy(); f.economy.destroy(); f.simulation.destroy();
});

test('ground MOVE cancels active gather routing but preserves cargo already carried', () => {
  const f = fixture({ capacity: 10, rate: 2 });
  assert.equal(f.coordinator.issueGather([1], 1001, 1), true);
  let tick = 1;
  for (; tick < 300; tick++) {
    f.simulation.fixedUpdate(DT, tick);
    f.coordinator.fixedUpdate(DT, tick);
    const carried = f.loop.state(1)?.carriedAmount ?? 0;
    if (carried > 0.1 && carried < 9) break;
  }
  const before = f.loop.state(1)?.carriedAmount ?? 0;
  assert.ok(before > 0, 'fixture should reach a partial carried load');
  f.coordinator.issueMove([1], { x: 18, z: 18 }, tick + 1);
  step(f, tick + 1, tick + 180);
  const after = f.loop.state(1);
  assert.equal(after?.status, 'idle');
  assert.equal(f.coordinator.metrics().activeGatherOrders, 0);
  assert.ok(Math.abs((after?.carriedAmount ?? 0) - before) < 1e-9, 'MOVE must not delete cargo');
  const moved = f.simulation.renderState(1)[0];
  assert.ok(moved && Math.hypot(moved.x - 18, moved.z - 18) < 1.2, 'worker should obey replacement MOVE');
  f.coordinator.destroy(); f.loop.destroy(); f.economy.destroy(); f.simulation.destroy();
});

test('multiple workers share a finite wood node without duplicating resources', () => {
  const f = fixture({ workers: 3, amount: 3, capacity: 2, rate: 12 });
  assert.equal(f.coordinator.issueGather([3, 1, 2], 1001, 1), true);
  step(f, 1, 700);
  const metrics = f.coordinator.metrics();
  assert.ok(metrics.woodRemaining >= 0);
  assert.ok(metrics.woodRemaining < 1e-9);
  assert.ok(Math.abs(metrics.woodStockpile - 3) < 1e-6, `expected exactly 3 deposited, got ${metrics.woodStockpile}`);
  f.coordinator.destroy(); f.loop.destroy(); f.economy.destroy(); f.simulation.destroy();
});

test('coordinator reacquires a gather route after tracked movement stops outside interaction range', () => {
  const f = fixture({ amount: 4, capacity: 2, rate: 12 });
  assert.equal(f.coordinator.issueGather([1], 1001, 1), true);

  // Simulate the movement authority replacing/losing the coordinator-owned
  // approach route while the gather order itself remains active. Once that
  // route settles away from the tree, the coordinator must notice there is no
  // live movement route and deterministically reacquire the resource.
  f.simulation.issueMove([1], { x: 20, z: 20 }, 1);
  step(f, 1, 700);

  const metrics = f.coordinator.metrics();
  assert.ok(metrics.woodStockpile >= 2, `expected recovered gather loop to deposit wood, got ${metrics.woodStockpile}`);
  assert.ok(metrics.woodRemaining < 4, 'recovered gather loop should extract from the finite source');
  f.coordinator.destroy(); f.loop.destroy(); f.economy.destroy(); f.simulation.destroy();
});

test('blocked storehouse center resolves to a reachable nearby drop-off point', () => {
  const storehouse = { x: 18, z: 18 };
  const navigation = new NavigationGrid({
    minX: 0, maxX: 26, minZ: 0, maxZ: 26, cellSize: 1,
    isBlocked: (x, z) => Math.hypot(x - storehouse.x, z - storehouse.z) <= 3.5,
  });
  const spawn = { id: 1, owner: 1, position: { x: 2, z: 2 }, speed: 12 };
  const simulation = new RtsSimulation(navigation, [spawn], 1, 4);
  const economy = new ResourceEconomy([{ id: 1001, resource: 'wood', position: { x: 8, z: 4 }, amount: 2 }]);
  const loop = new GatherLoop(economy, [{ id: 1, owner: 1, position: spawn.position, carryCapacity: 2, gatherRatePerSecond: 12 }]);
  const coordinator = new GatherCoordinator(navigation, simulation, economy, loop, storehouse, 1);
  assert.equal(coordinator.issueGather([1], 1001, 1), true);
  for (let tick = 1; tick <= 600; tick++) {
    simulation.fixedUpdate(DT, tick);
    coordinator.fixedUpdate(DT, tick);
  }
  assert.ok(coordinator.metrics().woodStockpile > 0, 'worker should deposit even when storehouse center itself is blocked');
  coordinator.destroy(); loop.destroy(); economy.destroy(); simulation.destroy();
});

test('coordinator rejects missing and non-wood gather targets', () => {
  const f = fixture();
  assert.equal(f.coordinator.issueGather([1], 9999, 1), false);
  f.coordinator.destroy(); f.loop.destroy(); f.economy.destroy(); f.simulation.destroy();

  const navigation = new NavigationGrid({ minX: 0, maxX: 20, minZ: 0, maxZ: 20, cellSize: 1, isBlocked: () => false });
  const simulation = new RtsSimulation(navigation, [{ id: 1, owner: 1, position: { x: 2, z: 2 } }], 1, 4);
  const economy = new ResourceEconomy([{ id: 2001, resource: 'stone', position: { x: 8, z: 8 }, amount: 10 }]);
  const loop = new GatherLoop(economy, [{ id: 1, owner: 1, position: { x: 2, z: 2 } }]);
  const coordinator = new GatherCoordinator(navigation, simulation, economy, loop, { x: 2, z: 2 }, 1);
  assert.equal(coordinator.issueGather([1], 2001, 1), false);
  assert.match(coordinator.metrics().lastGatherFailure, /Invalid wood resource/);
  coordinator.destroy(); loop.destroy(); economy.destroy(); simulation.destroy();
});
