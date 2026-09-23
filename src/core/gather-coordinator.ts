import type { EntityId, PlayerId, WorldPoint } from './contracts.ts';
import { GatherLoop } from './gather-loop.ts';
import { NavigationGrid } from './navigation-grid.ts';
import { ResourceEconomy, type ResourceNodeState } from './resource-economy.ts';
import { RtsSimulation } from './rts-simulation.ts';

type RoutePhase = 'to-resource' | 'to-dropoff';

export interface GatherCoordinatorMetrics {
  activeGatherOrders: number;
  gatheringWorkers: number;
  returningWorkers: number;
  carriedWoodTotal: number;
  woodRemaining: number;
  woodStockpile: number;
  lastGatherFailure: string;
}

/**
 * Engine-independent orchestration boundary between scalable movement and the
 * accepted economy/gather state. Rendering only issues commands and presents
 * snapshots; resource accounting never depends on PlayCanvas entities.
 */
export class GatherCoordinator {
  private readonly navigation: NavigationGrid;
  private readonly simulation: RtsSimulation;
  private readonly economy: ResourceEconomy;
  private readonly gatherLoop: GatherLoop;
  private readonly dropoff: WorldPoint;
  private readonly localPlayer: PlayerId;
  private readonly gatherRange: number;
  private readonly dropoffRange: number;
  private readonly activeTargets = new Map<EntityId, EntityId>();
  private readonly routePhases = new Map<EntityId, RoutePhase>();
  private lastGatherFailure = '';

  constructor(
    navigation: NavigationGrid,
    simulation: RtsSimulation,
    economy: ResourceEconomy,
    gatherLoop: GatherLoop,
    dropoffCenter: WorldPoint,
    localPlayer: PlayerId = 1,
    gatherRange = 1.6,
    dropoffRange = 2.2,
  ) {
    this.navigation = navigation;
    this.simulation = simulation;
    this.economy = economy;
    this.gatherLoop = gatherLoop;
    const reachableDropoff = navigation.resolveNearestReachable(dropoffCenter, 8);
    if (!reachableDropoff) throw new Error('Storehouse has no reachable drop-off point');
    this.dropoff = { x: reachableDropoff.x, z: reachableDropoff.z };
    this.localPlayer = localPlayer;
    this.gatherRange = gatherRange;
    this.dropoffRange = dropoffRange;
  }

  issueGather(workerIds: readonly EntityId[], nodeId: EntityId, executeAtTick: number): boolean {
    const node = this.economy.node(nodeId);
    if (!node || node.depleted || node.resource !== 'wood') {
      this.lastGatherFailure = `Invalid wood resource ${nodeId}`;
      return false;
    }

    const valid = [...workerIds]
      .sort((a, b) => a - b)
      .filter(id => this.gatherLoop.state(id)?.owner === this.localPlayer);
    if (valid.length === 0) {
      this.lastGatherFailure = 'No owned workers for gather order';
      return false;
    }

    this.gatherLoop.orderGather(valid, nodeId);
    let routed = 0;
    for (const id of valid) {
      this.activeTargets.set(id, nodeId);
      if (this.routeToResource(id, node, executeAtTick)) routed++;
      else {
        this.gatherLoop.cancel([id]);
        this.clearWorker(id);
      }
    }
    if (routed === 0) return false;
    this.lastGatherFailure = '';
    return true;
  }

  issueMove(workerIds: readonly EntityId[], destination: WorldPoint, executeAtTick: number): void {
    const ids = [...workerIds].sort((a, b) => a - b);
    this.gatherLoop.cancel(ids);
    for (const id of ids) this.clearWorker(id);
    this.simulation.issueMove(ids, destination, executeAtTick);
  }

  fixedUpdate(dtSeconds: number, tick: number): void {
    const movement = this.simulation.renderState(1);
    const movementById = new Map(movement.map(state => [state.id, state]));
    const positions = new Map<EntityId, WorldPoint>();
    for (const state of movement) {
      const position = { x: state.x, z: state.z };
      positions.set(state.id, position);
      this.gatherLoop.setWorkerPosition(state.id, position);
    }

    this.gatherLoop.fixedUpdate(dtSeconds, this.gatherRange);

    for (const id of [...this.activeTargets.keys()].sort((a, b) => a - b)) {
      const worker = this.gatherLoop.state(id);
      const targetId = this.activeTargets.get(id);
      const position = positions.get(id);
      const movementState = movementById.get(id);
      if (!worker || targetId === undefined || !position || !movementState) {
        this.clearWorker(id);
        continue;
      }

      const node = this.economy.node(targetId);
      if (worker.status === 'returning') {
        if (distance(position, this.dropoff) <= this.dropoffRange) {
          this.gatherLoop.deposit(id);
          const after = this.gatherLoop.state(id);
          const refreshed = this.economy.node(targetId);
          if (after?.status === 'gathering' && refreshed && !refreshed.depleted) {
            this.routeToResource(id, refreshed, tick + 1);
          } else {
            this.clearWorker(id);
          }
        } else if (this.routePhases.get(id) !== 'to-dropoff' || !movementState.moving) {
          // A route can finish just outside interaction range after local
          // avoidance/repath. Do not leave the worker latched to a route that
          // no longer exists; deterministically request the drop-off again.
          this.routeToDropoff(id, tick + 1);
        }
        continue;
      }

      if (worker.status === 'gathering') {
        if (!node || node.depleted) {
          if (worker.carriedAmount > 1e-9) this.routeToDropoff(id, tick + 1);
          else this.clearWorker(id);
          continue;
        }
        const inRange = distance(position, node.position) <= this.gatherRange;
        if (inRange) {
          if (this.routePhases.get(id) === 'to-resource') this.routePhases.delete(id);
        } else if (this.routePhases.get(id) !== 'to-resource' || !movementState.moving) {
          // Route bookkeeping must describe an actually active movement route.
          // If movement has stopped outside the gather radius, reacquire a
          // reachable interaction point instead of leaving gathering stalled.
          this.routeToResource(id, node, tick + 1);
        }
        continue;
      }

      if (worker.status === 'idle') this.clearWorker(id);
    }
  }

  resourceState(): readonly ResourceNodeState[] {
    return this.economy.nodesSnapshot();
  }

  metrics(): GatherCoordinatorMetrics {
    const workers = this.gatherLoop.statesSnapshot();
    return {
      activeGatherOrders: this.activeTargets.size,
      gatheringWorkers: workers.filter(worker => worker.status === 'gathering').length,
      returningWorkers: workers.filter(worker => worker.status === 'returning').length,
      carriedWoodTotal: workers.reduce((sum, worker) => sum + (worker.carrying === 'wood' ? worker.carriedAmount : 0), 0),
      woodRemaining: this.economy.nodesSnapshot()
        .filter(node => node.resource === 'wood')
        .reduce((sum, node) => sum + node.amount, 0),
      woodStockpile: this.economy.stockpile(this.localPlayer).resources.wood,
      lastGatherFailure: this.lastGatherFailure,
    };
  }

  private routeToResource(id: EntityId, node: ResourceNodeState, tick: number): boolean {
    const destination = this.interactionPoint(id, node.position, this.gatherRange);
    if (!destination) {
      this.lastGatherFailure = `No reachable approach inside gather range for resource ${node.id}`;
      this.routePhases.delete(id);
      return false;
    }
    this.routePhases.set(id, 'to-resource');
    this.simulation.issueMove([id], destination, tick);
    return true;
  }

  private routeToDropoff(id: EntityId, tick: number): boolean {
    const destination = this.interactionPoint(id, this.dropoff, this.dropoffRange);
    if (!destination) {
      this.lastGatherFailure = `No reachable storehouse approach for worker ${id}`;
      this.routePhases.delete(id);
      return false;
    }
    this.routePhases.set(id, 'to-dropoff');
    this.simulation.issueMove([id], destination, tick);
    return true;
  }

  /**
   * Resolve a deterministic navigation endpoint that is guaranteed to remain
   * inside the actual gameplay interaction radius after grid quantization.
   * Runtime navigation uses 2 m cells while the production gather radius is
   * only 1.6 m, so accepting any nearby resolved cell can strand a worker just
   * outside harvesting range.
   */
  private interactionPoint(id: EntityId, target: WorldPoint, interactionRange: number): WorldPoint | null {
    const state = this.simulation.renderState(1).find(unit => unit.id === id);
    if (!state) return null;
    const component = this.navigation.componentAt({ x: state.x, z: state.z });
    if (component === null) return null;

    const base = Math.atan2(state.z - target.z, state.x - target.x);
    const side = ((id * 0.7548776662466927) % 1 - 0.5) * 1.2;
    const radius = interactionRange * 0.62;
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = base + side + attempt * Math.PI * 0.25;
      const candidate = {
        x: target.x + Math.cos(angle) * radius,
        z: target.z + Math.sin(angle) * radius,
      };
      const resolved = this.navigation.resolveNearestReachable(candidate, 1, component);
      if (resolved && distance(resolved, target) <= interactionRange + 1e-6) return resolved;
    }

    const direct = this.navigation.resolveNearestReachable(target, 2, component);
    if (direct && distance(direct, target) <= interactionRange + 1e-6) return direct;
    return null;
  }

  private clearWorker(id: EntityId): void {
    this.activeTargets.delete(id);
    this.routePhases.delete(id);
  }

  destroy(): void {
    this.activeTargets.clear();
    this.routePhases.clear();
    this.lastGatherFailure = '';
  }
}

function distance(a: WorldPoint, b: WorldPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
