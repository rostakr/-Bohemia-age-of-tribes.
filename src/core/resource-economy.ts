import type { EntityId, PlayerId, ResourceId, WorldPoint } from './contracts.ts';

export interface ResourceNodeSpawn {
  id: EntityId;
  resource: ResourceId;
  position: WorldPoint;
  amount: number;
}

export interface ResourceNodeState extends ResourceNodeSpawn {
  depleted: boolean;
}

export interface StockpileState {
  player: PlayerId;
  resources: Readonly<Record<ResourceId, number>>;
}

const RESOURCE_IDS: readonly ResourceId[] = ['food', 'wood', 'stone', 'iron', 'trade-wealth'];

function emptyResources(): Record<ResourceId, number> {
  return { food: 0, wood: 0, stone: 0, iron: 0, 'trade-wealth': 0 };
}

/**
 * Engine-independent deterministic economy state.
 *
 * This slice deliberately owns only resource quantities and atomic transfers.
 * Worker travel, animation, drop-off routing and UI remain outside this module.
 */
export class ResourceEconomy {
  private readonly nodes = new Map<EntityId, ResourceNodeState>();
  private readonly stockpiles = new Map<PlayerId, Record<ResourceId, number>>();

  constructor(nodes: readonly ResourceNodeSpawn[] = []) {
    for (const node of nodes) {
      if (this.nodes.has(node.id)) throw new Error(`Duplicate resource node id ${node.id}`);
      if (!Number.isFinite(node.amount) || node.amount < 0) throw new Error(`Invalid amount for resource node ${node.id}`);
      this.nodes.set(node.id, {
        id: node.id,
        resource: node.resource,
        position: { x: node.position.x, z: node.position.z },
        amount: node.amount,
        depleted: node.amount === 0,
      });
    }
  }

  ensurePlayer(player: PlayerId): void {
    if (!this.stockpiles.has(player)) this.stockpiles.set(player, emptyResources());
  }

  node(id: EntityId): ResourceNodeState | null {
    const node = this.nodes.get(id);
    return node ? { ...node, position: { ...node.position } } : null;
  }

  nodesSnapshot(): readonly ResourceNodeState[] {
    return [...this.nodes.values()]
      .sort((a, b) => a.id - b.id)
      .map(node => ({ ...node, position: { ...node.position } }));
  }

  stockpile(player: PlayerId): StockpileState {
    this.ensurePlayer(player);
    const resources = this.stockpiles.get(player)!;
    return { player, resources: { ...resources } };
  }

  /**
   * Atomically extracts up to requestedAmount from a node and credits a player.
   * Returns the exact transferred amount. Calls are deterministic for a fixed
   * command order and never create negative node quantities.
   */
  gather(player: PlayerId, nodeId: EntityId, requestedAmount: number): number {
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return 0;
    const node = this.nodes.get(nodeId);
    if (!node || node.depleted) return 0;
    const transferred = Math.min(node.amount, requestedAmount);
    node.amount -= transferred;
    if (node.amount <= 1e-9) {
      node.amount = 0;
      node.depleted = true;
    }
    this.ensurePlayer(player);
    this.stockpiles.get(player)![node.resource] += transferred;
    return transferred;
  }

  canAfford(player: PlayerId, cost: Partial<Record<ResourceId, number>>): boolean {
    const resources = this.stockpile(player).resources;
    return RESOURCE_IDS.every(resource => {
      const required = cost[resource] ?? 0;
      return Number.isFinite(required) && required >= 0 && resources[resource] >= required;
    });
  }

  spend(player: PlayerId, cost: Partial<Record<ResourceId, number>>): boolean {
    if (!this.canAfford(player, cost)) return false;
    const resources = this.stockpiles.get(player)!;
    for (const resource of RESOURCE_IDS) resources[resource] -= cost[resource] ?? 0;
    return true;
  }

  destroy(): void {
    this.nodes.clear();
    this.stockpiles.clear();
  }
}
