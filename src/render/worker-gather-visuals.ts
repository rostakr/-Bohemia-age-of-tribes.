import { Color, Entity, StandardMaterial } from 'playcanvas';
import type { EntityId } from '../core/contracts';
import type { GatherCoordinator } from '../core/gather-coordinator';

interface WorkerVisual {
  root: Entity;
  roleMarker: Entity;
  cargo: Entity;
  depositPulse: Entity;
  previousCargo: number;
  pulseSeconds: number;
}

/** Phase 4 presentation. Reads authoritative gather/economy snapshots only. */
export class WorkerGatherVisuals {
  private readonly visuals = new Map<EntityId, WorkerVisual>();
  private readonly roleMaterial: StandardMaterial;
  private readonly cargoMaterial: StandardMaterial;
  private readonly pulseMaterial: StandardMaterial;
  private previousStockpile = 0;

  constructor(
    unitEntities: ReadonlyMap<EntityId, Entity>,
    private readonly coordinator: GatherCoordinator,
  ) {
    this.roleMaterial = material(new Color(0.54, 0.66, 0.35), 0.02);
    this.cargoMaterial = material(new Color(0.34, 0.16, 0.055), 0.05);
    this.pulseMaterial = material(new Color(0.95, 0.72, 0.18), 0.1);
    this.previousStockpile = coordinator.metrics().woodStockpile;

    for (const [id, worker] of unitEntities) {
      const root = new Entity(`Worker ${id} gather readability`);
      root.setLocalPosition(0, 1.18, 0);
      worker.addChild(root);

      // A restrained ground marker keeps the accepted static worker readable at the
      // normal RTS camera without pretending the unrigged model has new animation.
      const roleMarker = new Entity(`Worker ${id} role marker`);
      roleMarker.addComponent('render', { type: 'cylinder' });
      roleMarker.render!.material = this.roleMaterial;
      roleMarker.setLocalScale(0.62, 0.025, 0.62);
      roleMarker.setLocalPosition(0, -1.1, 0);
      root.addChild(roleMarker);

      const cargo = new Entity(`Worker ${id} authoritative wood cargo`);
      root.addChild(cargo);
      for (let index = -1; index <= 1; index++) {
        const billet = new Entity(`Worker ${id} wood billet ${index + 2}`);
        billet.addComponent('render', { type: 'box' });
        billet.render!.material = this.cargoMaterial;
        billet.setLocalScale(0.16, 0.16, 0.72);
        billet.setLocalPosition(index * 0.17, 0.02 + Math.abs(index) * 0.03, -0.28);
        billet.setLocalEulerAngles(0, 8 * index, 0);
        cargo.addChild(billet);
      }
      cargo.enabled = false;

      const depositPulse = new Entity(`Worker ${id} deposit feedback`);
      depositPulse.addComponent('render', { type: 'cylinder' });
      depositPulse.render!.material = this.pulseMaterial;
      depositPulse.setLocalScale(0.95, 0.035, 0.95);
      depositPulse.setLocalPosition(0, -1.08, 0);
      depositPulse.enabled = false;
      root.addChild(depositPulse);

      this.visuals.set(id, { root, roleMarker, cargo, depositPulse, previousCargo: 0, pulseSeconds: 0 });
    }
  }

  update(dtSeconds: number): void {
    const stockpile = this.coordinator.metrics().woodStockpile;
    const economyAdvanced = stockpile > this.previousStockpile + 1e-6;
    const current = new Map(
      [...this.visuals.keys()].map(id => [id, this.coordinator.workerState(id)] as const),
    );

    for (const [id, visual] of this.visuals) {
      const state = current.get(id);
      const cargoAmount = state?.carrying === 'wood' ? state.carriedAmount : 0;
      visual.cargo.enabled = cargoAmount > 1e-6;
      if (economyAdvanced && visual.previousCargo > 1e-6 && cargoAmount < visual.previousCargo - 1e-6) {
        visual.pulseSeconds = 0.7;
      }
      visual.previousCargo = cargoAmount;
      visual.pulseSeconds = Math.max(0, visual.pulseSeconds - Math.max(0, dtSeconds));
      visual.depositPulse.enabled = visual.pulseSeconds > 0;
      if (visual.depositPulse.enabled) {
        const phase = 1 - visual.pulseSeconds / 0.7;
        const scale = 0.85 + phase * 0.7;
        visual.depositPulse.setLocalScale(scale, 0.035, scale);
      }
    }
    this.previousStockpile = stockpile;
  }

  diagnostics(): { workerMarkers: number; workersShowingCargo: number; activeDepositPulses: number } {
    let workerMarkers = 0;
    let workersShowingCargo = 0;
    let activeDepositPulses = 0;
    for (const visual of this.visuals.values()) {
      if (visual.roleMarker.enabled) workerMarkers++;
      if (visual.cargo.enabled) workersShowingCargo++;
      if (visual.depositPulse.enabled) activeDepositPulses++;
    }
    return { workerMarkers, workersShowingCargo, activeDepositPulses };
  }

  destroy(): void {
    for (const visual of this.visuals.values()) visual.root.destroy();
    this.visuals.clear();
  }
}

function material(color: Color, metalness: number): StandardMaterial {
  const result = new StandardMaterial();
  result.diffuse = color;
  result.metalness = metalness;
  result.gloss = 0.22;
  result.update();
  return result;
}
