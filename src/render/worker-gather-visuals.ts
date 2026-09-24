import { Color, Entity, StandardMaterial } from 'playcanvas';
import type { EntityId } from '../core/contracts';
import type { GatherCoordinator } from '../core/gather-coordinator';

interface WorkerVisual {
  worker: Entity;
  root: Entity;
  roleMarker: Entity;
  cargo: Entity;
  depositPulse: Entity;
  depositBeacon: Entity;
  previousDepositSequence: number;
  pulseSeconds: number;
}

const DEPOSIT_PULSE_SECONDS = 1.2;

/** Phase 4 presentation. Reads authoritative gather/economy snapshots only. */
export class WorkerGatherVisuals {
  private readonly visuals = new Map<EntityId, WorkerVisual>();
  private readonly roleMaterial: StandardMaterial;
  private readonly cargoMaterial: StandardMaterial;
  private readonly pulseMaterial: StandardMaterial;

  constructor(
    unitEntities: ReadonlyMap<EntityId, Entity>,
    private readonly coordinator: GatherCoordinator,
  ) {
    this.roleMaterial = material(new Color(0.54, 0.66, 0.35), 0.02);
    this.cargoMaterial = material(new Color(0.34, 0.16, 0.055), 0.05);
    this.pulseMaterial = material(new Color(0.95, 0.72, 0.18), 0.1);

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

      // Carry the bundle high and outside the torso silhouette. This remains literal
      // wood geometry, not an abstract UI badge, while surviving the normal RTS camera
      // angle. Visibility is still driven exclusively by authoritative carried cargo.
      const cargo = new Entity(`Worker ${id} authoritative wood cargo`);
      cargo.setLocalPosition(0.42, 0.48, -0.16);
      root.addChild(cargo);
      for (let index = -1; index <= 1; index++) {
        const billet = new Entity(`Worker ${id} wood billet ${index + 2}`);
        billet.addComponent('render', { type: 'box' });
        billet.render!.material = this.cargoMaterial;
        billet.setLocalScale(0.21, 0.21, 0.82);
        billet.setLocalPosition(index * 0.22, 0.03 + Math.abs(index) * 0.04, 0);
        billet.setLocalEulerAngles(0, 8 * index, 0);
        cargo.addChild(billet);
      }
      cargo.enabled = false;

      // Deposit feedback is deliberately not parented to the moving worker. On a real
      // economy receipt we snapshot the worker's world position and leave both parts at
      // that handoff point, so the feedback reads as a storehouse deposit rather than
      // following the worker as the next gather route begins.
      const depositPulse = new Entity(`Worker ${id} deposit feedback`);
      depositPulse.addComponent('render', { type: 'cylinder' });
      depositPulse.render!.material = this.pulseMaterial;
      depositPulse.setLocalScale(0.95, 0.035, 0.95);
      depositPulse.enabled = false;
      worker.parent?.addChild(depositPulse);

      // A short vertical beacon makes the same authoritative receipt readable from the
      // oblique normal RTS camera, where a ground-only ring can disappear behind units.
      const depositBeacon = new Entity(`Worker ${id} deposit beacon`);
      depositBeacon.addComponent('render', { type: 'cylinder' });
      depositBeacon.render!.material = this.pulseMaterial;
      depositBeacon.setLocalScale(0.12, 0.7, 0.12);
      depositBeacon.enabled = false;
      worker.parent?.addChild(depositBeacon);

      const initialDepositSequence = coordinator.workerState(id)?.depositSequence ?? 0;
      this.visuals.set(id, {
        worker, root, roleMarker, cargo, depositPulse, depositBeacon,
        previousDepositSequence: initialDepositSequence,
        pulseSeconds: 0,
      });
    }
  }

  update(dtSeconds: number): void {
    const current = new Map(
      [...this.visuals.keys()].map(id => [id, this.coordinator.workerState(id)] as const),
    );

    for (const [id, visual] of this.visuals) {
      const state = current.get(id);
      const cargoAmount = state?.carrying === 'wood' ? state.carriedAmount : 0;
      visual.cargo.enabled = cargoAmount > 1e-6;

      // Presentation reacts to the worker's authoritative deposit receipt, not to
      // a renderer-side inference from cargo/stockpile deltas. Command replacement
      // therefore cannot fabricate deposit feedback when carried cargo is preserved.
      const depositSequence = state?.depositSequence ?? visual.previousDepositSequence;
      if (depositSequence > visual.previousDepositSequence) {
        visual.pulseSeconds = DEPOSIT_PULSE_SECONDS;
        const handoff = visual.worker.getPosition();
        visual.depositPulse.setPosition(handoff.x, handoff.y + 0.08, handoff.z);
        visual.depositBeacon.setPosition(handoff.x, handoff.y + 0.72, handoff.z);
      }
      visual.previousDepositSequence = depositSequence;

      visual.pulseSeconds = Math.max(0, visual.pulseSeconds - Math.max(0, dtSeconds));
      const showingDeposit = visual.pulseSeconds > 0;
      visual.depositPulse.enabled = showingDeposit;
      visual.depositBeacon.enabled = showingDeposit;
      if (showingDeposit) {
        const phase = 1 - visual.pulseSeconds / DEPOSIT_PULSE_SECONDS;
        const scale = 0.9 + phase * 1.0;
        visual.depositPulse.setLocalScale(scale, 0.035, scale);
        visual.depositBeacon.setLocalScale(0.12 * (1 - phase * 0.45), 0.7, 0.12 * (1 - phase * 0.45));
      }
    }
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
    for (const visual of this.visuals.values()) {
      visual.root.destroy();
      visual.depositPulse.destroy();
      visual.depositBeacon.destroy();
    }
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
