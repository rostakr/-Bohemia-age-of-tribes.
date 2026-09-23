import { Entity, type Application } from 'playcanvas';
import type { EntityId } from '../core/contracts';
import { GatherCoordinator } from '../core/gather-coordinator';
import { GatherLoop } from '../core/gather-loop';
import { ResourceEconomy, type ResourceNodeSpawn } from '../core/resource-economy';
import { RtsSimulation, type UnitSpawn } from '../core/rts-simulation';
import { BenchmarkScene, type BenchmarkModels } from './benchmark-scene';
import { type ViewName } from './inspection-camera';
import { landscape } from './landscape';
import { RtsController } from './rts-controller';
import { createPhase2NavigationGrid } from './rts-navigation';
import type { RuntimeScene, SceneDiagnostics } from './scene';
import { WorkerGatherVisuals } from './worker-gather-visuals';

export type RtsMilestone = 'phase-2' | 'phase-3' | 'phase-4';

export class RtsBenchmarkScene implements RuntimeScene {
  private readonly base: BenchmarkScene;
  private readonly unitEntities = new Map<EntityId, Entity>();
  private readonly resourceEntities = new Map<EntityId, Entity>();
  private simulation: RtsSimulation | undefined;
  private economy: ResourceEconomy | undefined;
  private gatherLoop: GatherLoop | undefined;
  private gatherCoordinator: GatherCoordinator | undefined;
  private gatherVisuals: WorkerGatherVisuals | undefined;
  private controller: RtsController | undefined;
  private tick = 0;
  private destroyed = false;

  constructor(models: BenchmarkModels, private readonly canvas: HTMLCanvasElement, private readonly debugUnitCount = 5, private readonly milestone: RtsMilestone = 'phase-2', private readonly gatheringQaFast = false) {
    this.base = new BenchmarkScene(models);
  }

  async enter(app: Application): Promise<void> {
    if (this.destroyed) throw new Error('RTS benchmark scene already destroyed');
    await this.base.enter(app);
    if (this.destroyed) return;
    const camera = app.root.findByName('Benchmark inspection camera') as Entity | null;
    if (!camera?.camera) throw new Error('RTS benchmark camera was not created');

    const initialEntities: Entity[] = [];
    for (let index = 1; index <= 5; index++) {
      const entity = app.root.findByName(`Inhabitant ${index}`) as Entity | null;
      if (!entity) throw new Error(`RTS benchmark requires accepted worker entity Inhabitant ${index}`);
      initialEntities.push(entity);
    }
    const scalable = this.milestone === 'phase-3' || this.milestone === 'phase-4';
    const maxUnits = scalable ? 120 : 40;
    const count = Math.max(5, Math.min(maxUnits, Math.floor(this.debugUnitCount)));
    const template = initialEntities[0]!;
    for (let index = 5; index < count; index++) {
      const clone = template.clone();
      clone.name = `Inhabitant ${index + 1}`;
      const column = (index - 5) % 10;
      const row = Math.floor((index - 5) / 10);
      const x = -30 + column * 1.85;
      const z = 20 + row * 1.85;
      clone.setPosition(x, landscape.heightAt(x, z), z);
      clone.setEulerAngles(0, index * 47 % 360, 0);
      template.parent?.addChild(clone);
      initialEntities.push(clone);
    }

    const navigation = createPhase2NavigationGrid();
    const spawns: UnitSpawn[] = initialEntities.map((entity, index) => {
      const position = entity.getPosition();
      const id = index + 1;
      this.unitEntities.set(id, entity);
      return { id, owner: 1, position: { x: position.x, z: position.z }, ...(this.milestone === 'phase-4' && this.gatheringQaFast ? { speed: 30 } : {}) };
    });
    const pathBudget = scalable ? Math.min(8, Math.max(4, Math.ceil(count / 20))) : 4;
    this.simulation = new RtsSimulation(navigation, spawns, 1, pathBudget);

    if (this.milestone === 'phase-4') {
      const storehouse = app.root.findByName('Boii storehouse') as Entity | null;
      if (!storehouse) throw new Error('Phase 4 requires the accepted Boii storehouse drop-off');
      const storehousePosition = storehouse.getPosition();
      const firstSpawn = spawns[0];
      if (!firstSpawn) throw new Error('Phase 4 requires at least one local worker');
      const localComponent = navigation.componentAt(firstSpawn.position);
      if (localComponent === null) throw new Error('Phase 4 local worker has no reachable navigation component');
      let dropoffDx = firstSpawn.position.x - storehousePosition.x;
      let dropoffDz = firstSpawn.position.z - storehousePosition.z;
      let dropoffLength = Math.hypot(dropoffDx, dropoffDz);
      if (dropoffLength < 1e-6) { dropoffDx = -1; dropoffDz = 0; dropoffLength = 1; }
      const requestedDropoff = { x: storehousePosition.x + dropoffDx / dropoffLength * 6, z: storehousePosition.z + dropoffDz / dropoffLength * 6 };
      const dropoff = navigation.resolveNearestReachable(requestedDropoff, 4, localComponent);
      if (!dropoff) throw new Error('Phase 4 storehouse has no reachable drop-off apron');

      const trees = this.findResourceTrees(app).sort((a, b) => {
        const ap = a.getPosition(); const bp = b.getPosition();
        return Math.hypot(ap.x, ap.z) - Math.hypot(bp.x, bp.z) || a.name.localeCompare(b.name);
      }).slice(0, 8);
      if (trees.length === 0) throw new Error('Phase 4 requires at least one mapped deciduous tree');
      const resources: ResourceNodeSpawn[] = trees.map((tree, index) => {
        const position = tree.getPosition(); const id = 1001 + index;
        this.resourceEntities.set(id, tree);
        return { id, resource: 'wood', position: { x: position.x, z: position.z }, amount: 100 };
      });
      this.economy = new ResourceEconomy(resources);
      this.gatherLoop = new GatherLoop(this.economy, spawns.map(spawn => ({ id: spawn.id, owner: spawn.owner, position: spawn.position, carryCapacity: this.gatheringQaFast ? 2 : 10, gatherRatePerSecond: this.gatheringQaFast ? 20 : 2 })));
      this.gatherCoordinator = new GatherCoordinator(navigation, this.simulation, this.economy, this.gatherLoop, dropoff, 1);
      this.gatherVisuals = new WorkerGatherVisuals(this.unitEntities, this.gatherCoordinator);
    }

    for (const state of this.simulation.renderState(1)) {
      const entity = this.unitEntities.get(state.id)!;
      entity.setPosition(state.x, landscape.heightAt(state.x, state.z), state.z);
    }
    this.controller = new RtsController(camera, this.canvas, landscape, navigation, this.simulation, this.unitEntities, () => this.tick,
      this.gatherCoordinator && this.economy ? { coordinator: this.gatherCoordinator, resourceEntities: this.resourceEntities } : undefined);
  }

  private findResourceTrees(app: Application): Entity[] {
    const result: Entity[] = []; const seen = new Set<Entity>();
    for (let index = 1; index <= 64; index++) { const entity = app.root.findByName(`Procedural deciduous tree ${index}`) as Entity | null; if (entity && !seen.has(entity)) { seen.add(entity); result.push(entity); } }
    for (let index = 0; index <= 64; index++) { const entity = app.root.findByName(`Deciduous tree ${index}`) as Entity | null; if (entity && !seen.has(entity)) { seen.add(entity); result.push(entity); } }
    return result;
  }

  setView(view: ViewName): void { this.base.setView(view); }
  fixedUpdate(dtSeconds: number, tick: number): void { this.tick = tick; this.base.fixedUpdate(dtSeconds, tick); this.simulation?.fixedUpdate(dtSeconds, tick); this.gatherCoordinator?.fixedUpdate(dtSeconds, tick); }

  update(dtSeconds: number, interpolationAlpha: number): void {
    if (this.simulation) for (const state of this.simulation.renderState(interpolationAlpha)) {
      const entity = this.unitEntities.get(state.id); if (entity) entity.setPosition(state.x, landscape.heightAt(state.x, state.z), state.z);
    }
    this.gatherVisuals?.update(dtSeconds);
    this.base.update(dtSeconds, interpolationAlpha);
    this.controller?.update();
  }

  diagnostics(): SceneDiagnostics {
    const base = this.base.diagnostics(); const metrics = this.simulation?.metrics(); const gathering = this.gatherCoordinator?.metrics();
    return { ...base, milestone: this.milestone, artGatePassed: true,
      activeUnits: metrics?.activeUnits ?? 0, movingUnits: metrics?.movingUnits ?? 0, stalledUnits: metrics?.stalledUnits ?? 0, selectedUnits: this.controller?.selectedCount ?? 0,
      pendingPaths: metrics?.pendingPaths ?? 0, maxObservedPathQueue: metrics?.maxObservedPathQueue ?? 0, pathsSolvedPerTick: metrics?.pathsSolvedThisTick ?? 0,
      pathNodesVisitedPerTick: metrics?.pathNodesVisitedThisTick ?? 0, repathsQueuedPerTick: metrics?.repathsQueuedThisTick ?? 0, neighborChecksPerTick: metrics?.neighborChecksThisTick ?? 0,
      rtsSimulationMs: Number((metrics?.simulationTimeMs ?? 0).toFixed(3)), pathFailure: metrics?.lastPathFailure ?? '',
      phase2DebugUnits: this.milestone === 'phase-2' ? countOrDefault(this.debugUnitCount, 40) : 0, phase3DebugUnits: this.milestone === 'phase-3' ? countOrDefault(this.debugUnitCount, 120) : 0,
      phase4DebugUnits: this.milestone === 'phase-4' ? countOrDefault(this.debugUnitCount, 120) : 0, phase4QaFast: this.milestone === 'phase-4' && this.gatheringQaFast,
      resourceNodes: this.gatherCoordinator?.resourceState().length ?? 0, activeGatherOrders: gathering?.activeGatherOrders ?? 0, gatheringWorkers: gathering?.gatheringWorkers ?? 0,
      returningWorkers: gathering?.returningWorkers ?? 0, carriedWoodTotal: Number((gathering?.carriedWoodTotal ?? 0).toFixed(3)), woodRemaining: Number((gathering?.woodRemaining ?? 0).toFixed(3)),
      woodStockpile: Number((gathering?.woodStockpile ?? 0).toFixed(3)), gatherFailure: gathering?.lastGatherFailure ?? '' };
  }

  destroy(): void {
    if (this.destroyed) return; this.destroyed = true;
    this.controller?.destroy(); this.controller = undefined;
    this.gatherVisuals?.destroy(); this.gatherVisuals = undefined;
    this.gatherCoordinator?.destroy(); this.gatherCoordinator = undefined;
    this.gatherLoop?.destroy(); this.gatherLoop = undefined;
    this.economy?.destroy(); this.economy = undefined;
    this.simulation?.destroy(); this.simulation = undefined;
    this.resourceEntities.clear(); this.unitEntities.clear(); this.base.destroy();
  }
}

function countOrDefault(value: number, max: number): number { return Math.max(5, Math.min(max, Math.floor(value))); }
