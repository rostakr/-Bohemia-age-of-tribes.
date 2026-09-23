import { Entity, type Application } from 'playcanvas';
import type { EntityId } from '../core/contracts';
import { RtsSimulation, type UnitSpawn } from '../core/rts-simulation';
import {
  WoodGatheringCoordinator,
  type WoodDropoffSpawn,
  type WoodResourceSpawn,
} from '../core/wood-gathering-coordinator';
import { BenchmarkScene, type BenchmarkModels } from './benchmark-scene';
import { type ViewName } from './inspection-camera';
import { landscape } from './landscape';
import { RtsController } from './rts-controller';
import { createPhase2NavigationGrid } from './rts-navigation';
import type { RuntimeScene, SceneDiagnostics } from './scene';

export type RtsMilestone = 'phase-2' | 'phase-3';

export class RtsBenchmarkScene implements RuntimeScene {
  private readonly base: BenchmarkScene;
  private readonly unitEntities = new Map<EntityId, Entity>();
  private readonly resourceEntities = new Map<EntityId, Entity>();
  private simulation: RtsSimulation | undefined;
  private gathering: WoodGatheringCoordinator | undefined;
  private controller: RtsController | undefined;
  private tick = 0;
  private destroyed = false;

  constructor(
    models: BenchmarkModels,
    private readonly canvas: HTMLCanvasElement,
    private readonly debugUnitCount = 5,
    private readonly milestone: RtsMilestone = 'phase-2',
    private readonly gatheringEnabled = false,
  ) {
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

    const maxUnits = this.milestone === 'phase-3' ? 120 : 40;
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
      return { id, owner: 1, position: { x: position.x, z: position.z } };
    });
    const pathBudget = this.milestone === 'phase-3'
      ? Math.min(8, Math.max(4, Math.ceil(count / 20)))
      : 4;
    this.simulation = new RtsSimulation(navigation, spawns, 1, pathBudget);

    if (this.gatheringEnabled) {
      const storehouse = app.root.findByName('Boii storehouse') as Entity | null;
      if (!storehouse) throw new Error('Phase 3 gathering requires the accepted Boii storehouse');
      const storehousePosition = storehouse.getPosition();
      const dropoffs: WoodDropoffSpawn[] = [{
        id: 2001,
        owner: 1,
        position: { x: storehousePosition.x, z: storehousePosition.z },
        radius: 2.4,
      }];

      const trees: Entity[] = [];
      for (let index = 1; index <= 32; index++) {
        const tree = app.root.findByName(`Procedural deciduous tree ${index}`) as Entity | null;
        if (tree) trees.push(tree);
      }
      if (trees.length === 0) {
        for (let index = 0; index < 45; index++) {
          const tree = app.root.findByName(`Deciduous tree ${index}`) as Entity | null;
          if (tree) trees.push(tree);
        }
      }
      trees.sort((a, b) => {
        const ap = a.getPosition();
        const bp = b.getPosition();
        return Math.hypot(ap.x - storehousePosition.x, ap.z - storehousePosition.z) -
          Math.hypot(bp.x - storehousePosition.x, bp.z - storehousePosition.z) || a.name.localeCompare(b.name);
      });
      if (trees.length === 0) throw new Error('Phase 3 gathering requires at least one benchmark tree');

      const resources: WoodResourceSpawn[] = [];
      for (const [index, tree] of trees.slice(0, 8).entries()) {
        const position = tree.getPosition();
        const id = 1001 + index;
        this.resourceEntities.set(id, tree);
        resources.push({
          id,
          resource: 'wood',
          position: { x: position.x, z: position.z },
          amount: 100,
          interactionRadius: 1.5,
        });
      }
      const owners = new Map<EntityId, number>(spawns.map(spawn => [spawn.id, spawn.owner]));
      this.gathering = new WoodGatheringCoordinator(this.simulation, owners, resources, dropoffs);
    }

    for (const state of this.simulation.renderState(1)) {
      const entity = this.unitEntities.get(state.id)!;
      entity.setPosition(state.x, landscape.heightAt(state.x, state.z), state.z);
    }
    this.controller = new RtsController(
      camera,
      this.canvas,
      landscape,
      navigation,
      this.simulation,
      this.unitEntities,
      () => this.tick,
      this.gathering,
      this.resourceEntities,
    );
  }

  setView(view: ViewName): void { this.base.setView(view); }

  fixedUpdate(dtSeconds: number, tick: number): void {
    this.tick = tick;
    this.base.fixedUpdate(dtSeconds, tick);
    this.simulation?.fixedUpdate(dtSeconds, tick);
    this.gathering?.fixedUpdate(dtSeconds, tick);
  }

  update(dtSeconds: number, interpolationAlpha: number): void {
    const simulation = this.simulation;
    if (simulation) {
      for (const state of simulation.renderState(interpolationAlpha)) {
        const entity = this.unitEntities.get(state.id);
        if (!entity) continue;
        entity.setPosition(state.x, landscape.heightAt(state.x, state.z), state.z);
      }
    }
    this.base.update(dtSeconds, interpolationAlpha);
    this.controller?.update();
  }

  diagnostics(): SceneDiagnostics {
    const base = this.base.diagnostics();
    const metrics = this.simulation?.metrics();
    const gathering = this.gathering?.metrics();
    return {
      ...base,
      milestone: this.milestone,
      artGatePassed: true,
      activeUnits: metrics?.activeUnits ?? 0,
      movingUnits: metrics?.movingUnits ?? 0,
      stalledUnits: metrics?.stalledUnits ?? 0,
      selectedUnits: this.controller?.selectedCount ?? 0,
      pendingPaths: metrics?.pendingPaths ?? 0,
      maxObservedPathQueue: metrics?.maxObservedPathQueue ?? 0,
      pathsSolvedPerTick: metrics?.pathsSolvedThisTick ?? 0,
      pathNodesVisitedPerTick: metrics?.pathNodesVisitedThisTick ?? 0,
      repathsQueuedPerTick: metrics?.repathsQueuedThisTick ?? 0,
      neighborChecksPerTick: metrics?.neighborChecksThisTick ?? 0,
      rtsSimulationMs: Number((metrics?.simulationTimeMs ?? 0).toFixed(3)),
      pathFailure: metrics?.lastPathFailure || gathering?.lastFailure || '',
      phase2DebugUnits: this.milestone === 'phase-2' ? countOrDefault(this.debugUnitCount, 40) : 0,
      phase3DebugUnits: this.milestone === 'phase-3' ? countOrDefault(this.debugUnitCount, 120) : 0,
      phase3Gathering: this.gatheringEnabled,
      resourceNodes: gathering?.resourceNodes ?? 0,
      woodRemaining: Number((gathering?.woodRemaining ?? 0).toFixed(3)),
      woodStockpile: Number((gathering?.woodStockpile ?? 0).toFixed(3)),
      gatheringUnits: gathering?.gatheringUnits ?? 0,
      carriedWoodTotal: Number((gathering?.carriedWoodTotal ?? 0).toFixed(3)),
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.controller?.destroy();
    this.controller = undefined;
    this.gathering?.destroy();
    this.gathering = undefined;
    this.simulation?.destroy();
    this.simulation = undefined;
    this.resourceEntities.clear();
    this.unitEntities.clear();
    this.base.destroy();
  }
}

function countOrDefault(value: number, max: number): number {
  return Math.max(5, Math.min(max, Math.floor(value)));
}
