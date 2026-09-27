import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourceEconomy } from '../src/core/resource-economy.ts';
import { GatherLoop } from '../src/core/gather-loop.ts';

test('worker harvests only in range, carries a bounded load, then deposits it', () => {
  const economy = new ResourceEconomy([{ id: 100, resource: 'wood', position: { x: 5, z: 5 }, amount: 30 }]);
  const loop = new GatherLoop(economy, [{ id: 1, owner: 1, position: { x: 0, z: 0 }, carryCapacity: 10, gatherRatePerSecond: 5 }]);
  loop.orderGather([1], 100);
  loop.fixedUpdate(1);
  assert.equal(loop.state(1)?.carriedAmount, 0);
  assert.equal(loop.state(1)?.depositSequence, 0);
  loop.setWorkerPosition(1, { x: 5, z: 4 });
  loop.fixedUpdate(1);
  assert.equal(loop.state(1)?.carriedAmount, 5);
  loop.fixedUpdate(1);
  assert.equal(loop.state(1)?.carriedAmount, 10);
  assert.equal(loop.state(1)?.status, 'returning');
  assert.equal(economy.stockpile(1).resources.wood, 0);
  assert.equal(loop.deposit(1), 10);
  assert.equal(economy.stockpile(1).resources.wood, 10);
  assert.equal(loop.state(1)?.depositSequence, 1);
  assert.equal(loop.state(1)?.status, 'gathering');
  assert.equal(loop.deposit(1), 0);
  assert.equal(loop.state(1)?.depositSequence, 1);
});

test('multiple workers deplete a shared node deterministically without duplicating resources', () => {
  const economy = new ResourceEconomy([{ id: 200, resource: 'food', position: { x: 0, z: 0 }, amount: 6 }]);
  const loop = new GatherLoop(economy, [
    { id: 2, owner: 1, position: { x: 0, z: 0 }, carryCapacity: 10, gatherRatePerSecond: 4 },
    { id: 1, owner: 1, position: { x: 0, z: 0 }, carryCapacity: 10, gatherRatePerSecond: 4 },
  ]);
  loop.orderGather([2, 1], 200);
  loop.fixedUpdate(1);
  assert.equal(loop.state(1)?.carriedAmount, 4);
  assert.equal(loop.state(2)?.carriedAmount, 2);
  assert.equal(economy.node(200)?.amount, 0);
  assert.equal(loop.state(1)?.status, 'returning');
  assert.equal(loop.state(2)?.status, 'returning');
  loop.deposit(1); loop.deposit(2);
  assert.equal(economy.stockpile(1).resources.food, 6);
  assert.equal(loop.state(1)?.depositSequence, 1);
  assert.equal(loop.state(2)?.depositSequence, 1);
});

test('invalid gather targets do not alter worker state', () => {
  const economy = new ResourceEconomy([]);
  const loop = new GatherLoop(economy, [{ id: 1, owner: 1, position: { x: 0, z: 0 } }]);
  loop.orderGather([1], 999);
  assert.equal(loop.state(1)?.status, 'idle');
  assert.equal(loop.state(1)?.targetNodeId, null);
  assert.equal(loop.state(1)?.depositSequence, 0);
});
