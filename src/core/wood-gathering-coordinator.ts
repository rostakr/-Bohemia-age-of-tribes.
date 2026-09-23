import type { EntityId, PlayerId, WorldPoint } from './contracts.ts';
import { ResourceEconomy, type ResourceNodeSpawn } from './resource-economy.ts';
import type { RtsSimulation } from './rts-simulation.ts';

export type WoodTask = 'idle' | 'to-resource' | 'gathering' | 'to-dropoff';

export interface WoodResourceSpawn extends ResourceNodeSpawn {
  resource: 'wood';
  interactionRadius?: number;
}

export interface WoodDropoffSpawn {
  id: EntityId;
  owner: PlayerId;
  position: WorldPoint;
  radius?: number;
}

export interface WoodGatheringConfig {
  carryCapacity: number;
  woodPerSecond: number;
}

export interface WoodWorkerState {
  id: EntityId;
  task: WoodTask;
  targetResourceId: EntityId | null;
  carriedWood: number;
}

export interface WoodResourceState {
  id: EntityId;
  x: number;
  z: number;
  remaining: number;
  interactionRadius: number;
}

export interface WoodGatheringMetrics {
  resourceNodes: number;
  woodRemaining: number;
  woodStockpile: number;
  gatheringUnits: number;
  carriedWoodTotal: number;
  lastFailure: string;
}

const DEFAULT_CONFIG: WoodGatheringConfig = {
  carryCapacity: 10,
  woodPerSecond: 2,
};

interface WorkerTaskState {
  id: EntityId;
  owner: PlayerId;
  task: WoodTask;
  targetResourceId: EntityId | null;
  carriedWood: number;
}

interface ResourceMeta {
  interactionRadius: number;
}

export class WoodGatheringCoordinator {
  private readonly economy: ResourceEconomy;
  private readonly workers = new Map<EntityId, WorkerTaskState>();
  private readonly resourceMeta = new Map<EntityId, ResourceMeta>();
  private readonly dropoffs = new Map<PlayerId, WoodDropoffSpawn[]>();
  private readonly config: WoodGatheringConfig;
  private lastFailure = '';

  constructor(
    private readonly simulation: RtsSimulation,
    workerOwners: ReadonlyMap<EntityId, PlayerId>,
    resources: readonly WoodResourceSpawn[],
    dropoffs: readonly WoodDropoffSpawn[],
    config: Partial<WoodGatheringConfig> = {},
  ) {
    this.config = {
      carryCapacity: config.carryCapacity ?? DEFAULT_CONFIG.carryCapacity,
      woodPerSecond: config.woodPerSecond ?? DEFAULT_CONFIG.woodPerSecond,
    };
    if (!(this.config.carryCapacity > 0) || !(this.config.woodPerSecond > 0)) {
      throw new Error('Wood gathering configuration must use positive capacity and rate');
    }

    this.economy = new ResourceEconomy(resources.map(resource => ({
      id: resource.id,
      resource: 'wood',
      position: { x: resource.position.x, z: resource.position.z },
      amount: resource.amount,
    })));

    for (const resource of resources) {
      this.resourceMeta.set(resource.id, { interactionRadius: resource.interactionRadius ?? 1.5 });
    }
    for (const [id, owner] of [...workerOwners.entries()].sort((a, b) => a[0] - b[0])) {
      this.workers.set(id, { id, owner, task: 'idle', targetResourceId: null, carriedWood: 0 });
      this.economy.ensurePlayer(owner);
    }
    for (const dropoff of dropoffs) {
      const list = this.dropoffs.get(dropoff.owner);
      const copy = { ...dropoff, position: { x: dropoff.position.x, z: dropoff.position.z } };
      if (list) list.push(copy);
      else this.dropoffs.set(dropoff.owner, [copy]);
    }
    for (const list of this.dropoffs.values()) list.sort((a, b) => a.id - b.id);
  }

  issueGather(unitIds: readonly EntityId[], resourceId: EntityId, executeAtTick: number): boolean {
    const resource = this.economy.node(resourceId);
    if (!resource || resource.resource !== 'wood' || resource.depleted) {
      this.lastFailure = `Invalid wood resource ${resourceId}`;
      return false;
    }
    let issued = false;
    for (const id of [...unitIds].sort((a, b) => a - b)) {
      const worker = this.workers.get(id);
      if (!worker) continue;
      if (!this.dropoffFor(worker.owner)) {
        this.lastFailure = `No wood drop-off for player ${worker.owner}`;
        continue;
      }
      worker.targetResourceId = resourceId;
      if (worker.carriedWood >= this.config.carryCapacity - 1e-9) this.routeToDropoff(worker, executeAtTick);
      else this.routeToResource(worker, executeAtTick);
      issued = true;
    }
    if (issued) this.lastFailure = '';
    return issued;
  }

  cancelForMove(unitIds: readonly EntityId[]): void {
    for (const id of unitIds) {
      const worker = this.workers.get(id);
      if (!worker) continue;
      worker.task = 'idle';
      worker.targetResourceId = null;
    }
  }

  stop(unitIds: readonly EntityId[]): void {
    this.cancelForMove(unitIds);
  }

  fixedUpdate(dtSeconds: number, tick: number): void {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    const movement = new Map(this.simulation.renderState(1).map(state => [state.id, state]));
    for (const worker of [...this.workers.values()].sort((a, b) => a.id - b.id)) {
      const position = movement.get(worker.id);
      if (!position) continue;
      if (worker.task === 'to-resource') this.updateToResource(worker, position, tick);
      else if (worker.task === 'gathering') this.gather(worker, dtSeconds, tick);
      else if (worker.task === 'to-dropoff') this.updateToDropoff(worker, position, tick);
    }
  }

  private updateToResource(worker: WorkerTaskState, position: { x: number; z: number; moving: boolean }, tick: number): void {
    const resourceId = worker.targetResourceId;
    const resource = resourceId === null ? null : this.economy.node(resourceId);
    if (!resource || resource.depleted) {
      if (worker.carriedWood > 1e-9) this.routeToDropoff(worker, tick + 1);
      else {
        worker.task = 'idle';
        worker.targetResourceId = null;
      }
      return;
    }
    if (position.moving) return;
    const radius = (this.resourceMeta.get(resource.id)?.interactionRadius ?? 1.5) + 1.15;
    if (Math.hypot(position.x - resource.position.x, position.z - resource.position.z) > radius) {
      this.lastFailure = `Worker ${worker.id} stopped outside gather range for resource ${resource.id}`;
      worker.task = 'idle';
      return;
    }
    worker.task = 'gathering';
  }

  private gather(worker: WorkerTaskState, dtSeconds: number, tick: number): void {
    const resourceId = worker.targetResourceId;
    const resource = resourceId === null ? null : this.economy.node(resourceId);
    if (!resource || resource.depleted) {
      if (worker.carriedWood > 1e-9) this.routeToDropoff(worker, tick + 1);
      else {
        worker.task = 'idle';
        worker.targetResourceId = null;
      }
      return;
    }
    const room = this.config.carryCapacity - worker.carriedWood;
    if (room <= 1e-9) {
      this.routeToDropoff(worker, tick + 1);
      return;
    }
    const extracted = this.economy.extract(resource.id, Math.min(room, this.config.woodPerSecond * dtSeconds));
    worker.carriedWood += extracted;
    const after = this.economy.node(resource.id);
    if (worker.carriedWood >= this.config.carryCapacity - 1e-9 || !after || after.depleted) {
      if (worker.carriedWood > 1e-9) this.routeToDropoff(worker, tick + 1);
      else {
        worker.task = 'idle';
        worker.targetResourceId = null;
      }
    }
  }

  private updateToDropoff(worker: WorkerTaskState, position: { x: number; z: number; moving: boolean }, tick: number): void {
    if (position.moving) return;
    const dropoff = this.dropoffFor(worker.owner);
    if (!dropoff) {
      this.lastFailure = `No wood drop-off for player ${worker.owner}`;
      worker.task = 'idle';
      return;
    }
    const radius = (dropoff.radius ?? 2) + 1.5;
    if (Math.hypot(position.x - dropoff.position.x, position.z - dropoff.position.z) > radius) {
      this.lastFailure = `Worker ${worker.id} stopped outside drop-off range`;
      worker.task = 'idle';
      return;
    }
    if (worker.carriedWood > 1e-9) {
      this.economy.credit(worker.owner, 'wood', worker.carriedWood);
      worker.carriedWood = 0;
    }
    const resource = worker.targetResourceId === null ? null : this.economy.node(worker.targetResourceId);
    if (resource && !resource.depleted) this.routeToResource(worker, tick + 1);
    else {
      worker.task = 'idle';
      worker.targetResourceId = null;
    }
  }

  private routeToResource(worker: WorkerTaskState, executeAtTick: number): void {
    const resource = worker.targetResourceId === null ? null : this.economy.node(worker.targetResourceId);
    if (!resource || resource.depleted) {
      worker.task = 'idle';
      worker.targetResourceId = null;
      return;
    }
    const current = this.simulation.renderState(1).find(state => state.id === worker.id);
    if (!current) return;
    const radius = (this.resourceMeta.get(resource.id)?.interactionRadius ?? 1.5) + 0.7;
    const destination = approachPoint({ x: current.x, z: current.z }, resource.position, radius, worker.id);
    worker.task = 'to-resource';
    this.simulation.issueMove([worker.id], destination, executeAtTick);
  }

  private routeToDropoff(worker: WorkerTaskState, executeAtTick: number): void {
    const dropoff = this.dropoffFor(worker.owner);
    const current = this.simulation.renderState(1).find(state => state.id === worker.id);
    if (!dropoff || !current) {
      this.lastFailure = `No reachable wood drop-off for worker ${worker.id}`;
      worker.task = 'idle';
      return;
    }
    const destination = approachPoint(
      { x: current.x, z: current.z },
      dropoff.position,
      (dropoff.radius ?? 2) + 0.8,
      worker.id,
    );
    worker.task = 'to-dropoff';
    this.simulation.issueMove([worker.id], destination, executeAtTick);
  }

  private dropoffFor(owner: PlayerId): WoodDropoffSpawn | undefined {
    return this.dropoffs.get(owner)?.[0];
  }

  workerState(id: EntityId): WoodWorkerState | null {
    const worker = this.workers.get(id);
    return worker ? {
      id: worker.id,
      task: worker.task,
      targetResourceId: worker.targetResourceId,
      carriedWood: worker.carriedWood,
    } : null;
  }

  resourceState(): readonly WoodResourceState[] {
    return this.economy.nodesSnapshot()
      .filter(node => node.resource === 'wood')
      .map(node => ({
        id: node.id,
        x: node.position.x,
        z: node.position.z,
        remaining: node.amount,
        interactionRadius: this.resourceMeta.get(node.id)?.interactionRadius ?? 1.5,
      }));
  }

  metrics(localPlayer: PlayerId = 1): WoodGatheringMetrics {
    const workers = [...this.workers.values()];
    const resources = this.economy.nodesSnapshot().filter(node => node.resource === 'wood');
    return {
      resourceNodes: resources.length,
      woodRemaining: resources.reduce((sum, node) => sum + node.amount, 0),
      woodStockpile: this.economy.stockpile(localPlayer).resources.wood,
      gatheringUnits: workers.filter(worker => worker.task !== 'idle').length,
      carriedWoodTotal: workers.reduce((sum, worker) => sum + worker.carriedWood, 0),
      lastFailure: this.lastFailure,
    };
  }

  destroy(): void {
    this.workers.clear();
    this.resourceMeta.clear();
    this.dropoffs.clear();
    this.economy.destroy();
  }
}

function approachPoint(from: WorldPoint, target: WorldPoint, distance: number, id: EntityId): WorldPoint {
  let dx = from.x - target.x;
  let dz = from.z - target.z;
  let length = Math.hypot(dx, dz);
  if (length < 1e-6) {
    const angle = id * 2.399963229728653;
    dx = Math.cos(angle);
    dz = Math.sin(angle);
    length = 1;
  }
  return {
    x: target.x + dx / length * distance,
    z: target.z + dz / length * distance,
  };
}
