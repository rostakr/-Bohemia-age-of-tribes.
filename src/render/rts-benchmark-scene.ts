import { Entity, type Application } from 'playcanvas';
import type { EntityId } from '../core/contracts';
import { RtsSimulation, type UnitSpawn } from '../core/rts-simulation';
import { BenchmarkScene, type BenchmarkModels } from './benchmark-scene';
import { type ViewName } from './inspection-camera';
import { landscape } from './landscape';
import { RtsController } from './rts-controller';
import { createPhase2NavigationGrid } from './rts-navigation';
import type { RuntimeScene, SceneDiagnostics } from './scene';

export class RtsBenchmarkScene implements RuntimeScene {
  private readonly base: BenchmarkScene;
  private readonly unitEntities = new Map<EntityId, Entity>();
  private simulation: RtsSimulation | undefined;
  private controller: RtsController | undefined;
  private tick = 0;
  private destroyed = false;

  constructor(
    models: BenchmarkModels,
    private readonly canvas: HTMLCanvasElement,
    private readonly debugUnitCount = 5,
  ) {
    this.base = new BenchmarkScene(models);
  }

  async enter(app: Application): Promise<void> {
    if (this.destroyed) throw new Error('RTS benchmark scene already destroyed');
    await this.base.enter(app);
    if (this.destroyed) return;

    const camera = app.root.findByName('Benchmark inspection camera') as Entity | null;
    if (!camera?.camera) throw new Error('Phase 2 benchmark camera was not created');

    const initialEntities: Entity[] = [];
    for (let index = 1; index <= 5; index++) {
      const entity = app.root.findByName(`Inhabitant ${index}`) as Entity | null;
      if (!entity) throw new Error(`Phase 2 requires accepted worker entity Inhabitant ${index}`);
      initialEntities.push(entity);
    }

    const count = Math.max(5, Math.min(40, Math.floor(this.debugUnitCount)));
    const template = initialEntities[0]!;
    for (let index = 5; index < count; index++) {
      const clone = template.clone();
      clone.name = `Inhabitant ${index + 1}`;
      const column = (index - 5) % 7;
      const row = Math.floor((index - 5) / 7);
      clone.setPosition(-28 + column * 2.2, landscape.heightAt(-28 + column * 2.2, 21 + row * 2.1), 21 + row * 2.1);
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
    this.simulation = new RtsSimulation(navigation, spawns, 1, 4);
    for (const state of this.simulation.renderState(1)) {
      const entity = this.unitEntities.get(state.id)!;
      entity.setPosition(state.x, landscape.heightAt(state.x, state.z), state.z);
    }
    this.controller = new RtsController(camera, this.canvas, landscape, navigation, this.simulation, this.unitEntities, () => this.tick);
  }

  setView(view: ViewName): void { this.base.setView(view); }

  fixedUpdate(dtSeconds: number, tick: number): void {
    this.tick = tick;
    this.base.fixedUpdate(dtSeconds, tick);
    this.simulation?.fixedUpdate(dtSeconds, tick);
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
    return {
      ...base,
      milestone: 'phase-2',
      artGatePassed: true,
      activeUnits: metrics?.activeUnits ?? 0,
      selectedUnits: this.controller?.selectedCount ?? 0,
      pendingPaths: metrics?.pendingPaths ?? 0,
      pathsSolvedPerTick: metrics?.pathsSolvedThisTick ?? 0,
      rtsSimulationMs: Number((metrics?.simulationTimeMs ?? 0).toFixed(3)),
      pathFailure: metrics?.lastPathFailure ?? '',
      phase2DebugUnits: this.debugUnitCount,
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.controller?.destroy();
    this.controller = undefined;
    this.simulation?.destroy();
    this.simulation = undefined;
    this.unitEntities.clear();
    this.base.destroy();
  }
}
