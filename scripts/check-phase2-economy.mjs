import test from 'node:test';
import assert from 'node:assert/strict';
import { ResourceEconomy } from '../src/core/resource-economy.ts';

test('gathering transfers the exact resource and depletes a node without going negative', () => {
  const economy = new ResourceEconomy([{ id: 1001, resource: 'wood', position: { x: 4, z: 7 }, amount: 25 }]);
  assert.equal(economy.gather(1, 1001, 10), 10);
  assert.equal(economy.gather(1, 1001, 20), 15);
  assert.equal(economy.gather(1, 1001, 5), 0);
  assert.deepEqual(economy.stockpile(1).resources, { food: 0, wood: 25, stone: 0, iron: 0, 'trade-wealth': 0 });
  const node = economy.node(1001);
  assert.ok(node);
  assert.equal(node.amount, 0);
  assert.equal(node.depleted, true);
});

test('stockpiles are isolated per player and snapshots cannot mutate simulation state', () => {
  const economy = new ResourceEconomy([{ id: 10, resource: 'food', position: { x: 0, z: 0 }, amount: 30 }]);
  economy.gather(1, 10, 8);
  economy.gather(2, 10, 6);
  const first = economy.stockpile(1);
  assert.equal(first.resources.food, 8);
  assert.equal(economy.stockpile(2).resources.food, 6);
  first.resources.food = 999;
  assert.equal(economy.stockpile(1).resources.food, 8);
});

test('spending is atomic and rejects invalid or unaffordable costs', () => {
  const economy = new ResourceEconomy([
    { id: 20, resource: 'wood', position: { x: 0, z: 0 }, amount: 100 },
    { id: 21, resource: 'stone', position: { x: 1, z: 0 }, amount: 100 },
  ]);
  economy.gather(1, 20, 40);
  economy.gather(1, 21, 15);
  assert.equal(economy.spend(1, { wood: 30, stone: 10 }), true);
  assert.equal(economy.stockpile(1).resources.wood, 10);
  assert.equal(economy.stockpile(1).resources.stone, 5);
  assert.equal(economy.spend(1, { wood: 11 }), false);
  assert.equal(economy.stockpile(1).resources.wood, 10);
  assert.equal(economy.canAfford(1, { wood: -1 }), false);
});

test('resource node ordering and duplicate validation are deterministic', () => {
  assert.throws(() => new ResourceEconomy([
    { id: 2, resource: 'iron', position: { x: 0, z: 0 }, amount: 1 },
    { id: 2, resource: 'iron', position: { x: 1, z: 0 }, amount: 1 },
  ]), /Duplicate resource node id 2/);
  const economy = new ResourceEconomy([
    { id: 9, resource: 'stone', position: { x: 0, z: 0 }, amount: 3 },
    { id: 3, resource: 'wood', position: { x: 0, z: 0 }, amount: 4 },
  ]);
  assert.deepEqual(economy.nodesSnapshot().map(node => node.id), [3, 9]);
});
