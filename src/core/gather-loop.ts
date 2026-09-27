import type { EntityId, PlayerId, ResourceId, WorldPoint } from './contracts.ts';
import { ResourceEconomy } from './resource-economy.ts';

export interface GatherWorkerSpawn {
  id: EntityId;
  owner: PlayerId;
  position: WorldPoint;
  carryCapacity?: number;
  gatherRatePerSecond?: number;
}

export interface GatherWorkerState {
  id: EntityId;
  owner: PlayerId;
  position: WorldPoint;
  targetNodeId: EntityId | null;
  carrying: ResourceId | null;
  carriedAmount: number;
  status: 'idle' | 'gathering' | 'returning';
  /** Monotonic receipt incremented only after this worker credits real cargo to the economy. */
  depositSequence: number;
}

/**
 * Deterministic worker gather state machine.
 *
 * Navigation is intentionally supplied by the caller: this core starts harvesting
 * only when the worker is in range, then returns cargo to a caller-defined drop-off.
 * This keeps resource accounting independent from rendering and pathfinding.
 */
export class GatherLoop {
  private readonly workers = new Map<EntityId, {
    id: EntityId; owner: PlayerId; position: WorldPoint; targetNodeId: EntityId | null;
    carrying: ResourceId | null; carriedAmount: number; capacity: number; rate: number;
    status: 'idle' | 'gathering' | 'returning'; depositSequence: number;
  }>();

  private readonly economy: ResourceEconomy;

  constructor(economy: ResourceEconomy, spawns: readonly GatherWorkerSpawn[]) {
    this.economy = economy;
    for (const spawn of spawns) {
      if (this.workers.has(spawn.id)) throw new Error(`Duplicate gather worker id ${spawn.id}`);
      this.workers.set(spawn.id, {
        id: spawn.id, owner: spawn.owner, position: { ...spawn.position }, targetNodeId: null,
        carrying: null, carriedAmount: 0, capacity: spawn.carryCapacity ?? 10,
        rate: spawn.gatherRatePerSecond ?? 1, status: 'idle', depositSequence: 0,
      });
    }
  }

  orderGather(workerIds: readonly EntityId[], nodeId: EntityId): void {
    const node = this.economy.node(nodeId);
    if (!node || node.depleted) return;
    for (const id of [...workerIds].sort((a, b) => a - b)) {
      const worker = this.workers.get(id);
      if (!worker) continue;
      worker.targetNodeId = nodeId;
      worker.status = 'gathering';
    }
  }

  /** Cancels the active gather order while preserving cargo already carried. */
  cancel(workerIds: readonly EntityId[]): void {
    for (const id of [...workerIds].sort((a, b) => a - b)) {
      const worker = this.workers.get(id);
      if (!worker) continue;
      worker.targetNodeId = null;
      worker.status = 'idle';
    }
  }

  setWorkerPosition(workerId: EntityId, position: WorldPoint): void {
    const worker = this.workers.get(workerId);
    if (worker) worker.position = { ...position };
  }

  fixedUpdate(dtSeconds: number, gatherRange = 1.6): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    for (const worker of [...this.workers.values()].sort((a, b) => a.id - b.id)) {
      if (worker.status !== 'gathering' || worker.targetNodeId === null) continue;
      const node = this.economy.node(worker.targetNodeId);
      if (!node || node.depleted) {
        worker.targetNodeId = null;
        worker.status = worker.carriedAmount > 0 ? 'returning' : 'idle';
        continue;
      }
      if (Math.hypot(worker.position.x - node.position.x, worker.position.z - node.position.z) > gatherRange) continue;
      if (worker.carrying && worker.carrying !== node.resource) {
        worker.status = 'returning';
        continue;
      }
      const room = worker.capacity - worker.carriedAmount;
      if (room <= 1e-9) {
        worker.status = 'returning';
        continue;
      }
      const amount = this.economy.extract(worker.targetNodeId, Math.min(room, worker.rate * dtSeconds));
      if (amount > 0) {
        worker.carrying = node.resource;
        worker.carriedAmount += amount;
      }
      const after = this.economy.node(worker.targetNodeId);
      if (worker.carriedAmount >= worker.capacity - 1e-9 || !after || after.depleted) worker.status = 'returning';
      if (!after || after.depleted) {
        for (const peer of this.workers.values()) {
          if (peer.targetNodeId === worker.targetNodeId && peer.carriedAmount > 0) peer.status = 'returning';
        }
      }
    }
  }

  deposit(workerId: EntityId): number {
    const worker = this.workers.get(workerId);
    if (!worker || !worker.carrying || worker.carriedAmount <= 0) return 0;
    const amount = worker.carriedAmount;
    this.economy.credit(worker.owner, worker.carrying, amount);
    worker.carriedAmount = 0;
    worker.carrying = null;
    worker.depositSequence++;
    const node = worker.targetNodeId === null ? null : this.economy.node(worker.targetNodeId);
    if (node && !node.depleted) worker.status = 'gathering';
    else { worker.status = 'idle'; worker.targetNodeId = null; }
    return amount;
  }

  state(workerId: EntityId): GatherWorkerState | null {
    const worker = this.workers.get(workerId);
    return worker ? {
      id: worker.id, owner: worker.owner, position: { ...worker.position },
      targetNodeId: worker.targetNodeId, carrying: worker.carrying,
      carriedAmount: worker.carriedAmount, status: worker.status,
      depositSequence: worker.depositSequence,
    } : null;
  }

  statesSnapshot(): readonly GatherWorkerState[] {
    return [...this.workers.keys()].sort((a, b) => a - b)
      .map(id => this.state(id))
      .filter((state): state is GatherWorkerState => state !== null);
  }

  destroy(): void { this.workers.clear(); }
}
