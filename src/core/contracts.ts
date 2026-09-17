// Engine-free domain boundary. No gameplay execution is implemented in Phase 0.
export type EntityId = number;
export type PlayerId = number;
export type CultureId = 'boii' | 'marcomanni' | 'early-slavs';
export type ResourceId = 'food' | 'wood' | 'stone' | 'iron' | 'trade-wealth';
export type WorldPoint = Readonly<{ x: number; z: number }>;

type Order =
  | { type: 'move'; destination: WorldPoint }
  | { type: 'attack'; target: EntityId }
  | { type: 'gather'; target: EntityId }
  | { type: 'build'; buildingType: string; position: WorldPoint; rotationRadians: number }
  | { type: 'repair'; target: EntityId }
  | { type: 'stop' };

/** Future command ingress must validate ownership, IDs and costs before execution. */
export type Command = Readonly<{
  executeAtTick: number;
  sequence: number;
  player: PlayerId;
  units: readonly EntityId[];
  queue: boolean;
  order: Readonly<Order>;
}>;

export interface SimulationSystem {
  fixedUpdate(dtSeconds: number, tick: number): void;
  destroy(): void;
}

/** Shared terrain sampling boundary for later camera, placement and navigation. */
export interface TerrainSurface {
  heightAt(x: number, z: number): number;
}
