import type { Command, EntityId, PlayerId, WorldPoint } from './contracts';
import { NavigationGrid } from './navigation-grid';

export interface UnitSpawn {
  id: EntityId;
  owner: PlayerId;
  position: WorldPoint;
  speed?: number;
  radius?: number;
}

export interface UnitRenderState {
  id: EntityId;
  owner: PlayerId;
  x: number;
  z: number;
  moving: boolean;
}

interface UnitState {
  id: EntityId;
  owner: PlayerId;
  x: number;
  z: number;
  previousX: number;
  previousZ: number;
  speed: number;
  radius: number;
  path: readonly WorldPoint[];
  waypoint: number;
  orderVersion: number;
}

interface PendingPath {
  unitId: EntityId;
  destination: WorldPoint;
  orderVersion: number;
}

export interface RtsSimulationMetrics {
  activeUnits: number;
  pendingPaths: number;
  pathsSolvedThisTick: number;
  simulationTimeMs: number;
  lastPathFailure: string;
}

export class RtsSimulation {
  private readonly units = new Map<EntityId, UnitState>();
  private readonly commands: Command[] = [];
  private pendingPaths: PendingPath[] = [];
  private sequence = 0;
  private pathsSolvedThisTick = 0;
  private simulationTimeMs = 0;
  private lastPathFailure = '';

  constructor(
    private readonly navigation: NavigationGrid,
    spawns: readonly UnitSpawn[],
    private readonly localPlayer: PlayerId = 1,
    private readonly maxPathsPerTick = 4,
  ) {
    for (const spawn of spawns) {
      if (this.units.has(spawn.id)) throw new Error(`Duplicate unit id ${spawn.id}`);
      const resolved = navigation.resolveNearestReachable(spawn.position, 8);
      if (!resolved) throw new Error(`Unit ${spawn.id} has no reachable spawn point`);
      this.units.set(spawn.id, {
        id: spawn.id,
        owner: spawn.owner,
        x: resolved.x,
        z: resolved.z,
        previousX: resolved.x,
        previousZ: resolved.z,
        speed: spawn.speed ?? 4.2,
        radius: spawn.radius ?? 0.45,
        path: [],
        waypoint: 0,
        orderVersion: 0,
      });
    }
  }

  get unitIds(): readonly EntityId[] { return [...this.units.keys()].sort((a, b) => a - b); }

  queueCommand(command: Command): void {
    this.commands.push(command);
    this.commands.sort((a, b) => a.executeAtTick - b.executeAtTick || a.sequence - b.sequence);
  }

  issueMove(units: readonly EntityId[], destination: WorldPoint, executeAtTick: number): void {
    this.queueCommand({
      executeAtTick,
      sequence: ++this.sequence,
      player: this.localPlayer,
      units: [...units].sort((a, b) => a - b),
      queue: false,
      order: { type: 'move', destination: { x: destination.x, z: destination.z } },
    });
  }

  private applyCommand(command: Command): void {
    if (command.player !== this.localPlayer || command.order.type !== 'move' || command.queue) return;
    const owned = command.units
      .map(id => this.units.get(id))
      .filter((unit): unit is UnitState => Boolean(unit && unit.owner === command.player))
      .sort((a, b) => a.id - b.id);
    if (owned.length === 0) return;

    const slots = this.assignDestinationSlots(owned.length, command.order.destination);
    const replacing = new Set(owned.map(unit => unit.id));
    this.pendingPaths = this.pendingPaths.filter(request => !replacing.has(request.unitId));
    for (let index = 0; index < owned.length; index++) {
      const unit = owned[index]!;
      const destination = slots[index];
      unit.orderVersion++;
      unit.path = [];
      unit.waypoint = 0;
      if (!destination) {
        this.lastPathFailure = `No reachable destination slot for unit ${unit.id}`;
        continue;
      }
      this.pendingPaths.push({ unitId: unit.id, destination, orderVersion: unit.orderVersion });
    }
  }

  private assignDestinationSlots(count: number, center: WorldPoint): (WorldPoint | null)[] {
    const spacing = 1.45;
    const offsets: WorldPoint[] = [{ x: 0, z: 0 }];
    for (let ring = 1; offsets.length < count * 5 && ring <= 8; ring++) {
      for (let x = -ring; x <= ring; x++) offsets.push({ x: x * spacing, z: -ring * spacing });
      for (let z = -ring + 1; z <= ring; z++) offsets.push({ x: ring * spacing, z: z * spacing });
      for (let x = ring - 1; x >= -ring; x--) offsets.push({ x: x * spacing, z: ring * spacing });
      for (let z = ring - 1; z >= -ring + 1; z--) offsets.push({ x: -ring * spacing, z: z * spacing });
    }
    const used = new Set<string>();
    const result: (WorldPoint | null)[] = [];
    for (let index = 0; index < count; index++) {
      let resolved: WorldPoint | null = null;
      for (let candidateIndex = index; candidateIndex < offsets.length; candidateIndex++) {
        const offset = offsets[candidateIndex]!;
        const point = this.navigation.resolveNearestReachable({ x: center.x + offset.x, z: center.z + offset.z }, 4);
        if (!point) continue;
        const key = `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;
        if (used.has(key)) continue;
        used.add(key);
        resolved = point;
        break;
      }
      result.push(resolved);
    }
    return result;
  }

  fixedUpdate(dtSeconds: number, tick: number): void {
    const started = globalThis.performance?.now?.() ?? Date.now();
    this.pathsSolvedThisTick = 0;
    while (this.commands.length > 0 && this.commands[0]!.executeAtTick <= tick) this.applyCommand(this.commands.shift()!);
    this.solvePendingPaths();

    const buckets = this.buildSpatialBuckets();
    for (const unit of [...this.units.values()].sort((a, b) => a.id - b.id)) {
      unit.previousX = unit.x;
      unit.previousZ = unit.z;
      this.advanceUnit(unit, dtSeconds, buckets);
    }
    this.simulationTimeMs = (globalThis.performance?.now?.() ?? Date.now()) - started;
  }

  private solvePendingPaths(): void {
    for (let solved = 0; solved < this.maxPathsPerTick && this.pendingPaths.length > 0; solved++) {
      const request = this.pendingPaths.shift()!;
      const unit = this.units.get(request.unitId);
      if (!unit || unit.orderVersion !== request.orderVersion) continue;
      const result = this.navigation.findPath({ x: unit.x, z: unit.z }, request.destination);
      this.pathsSolvedThisTick++;
      if (!result) {
        unit.path = [];
        unit.waypoint = 0;
        this.lastPathFailure = `No path for unit ${unit.id}`;
        continue;
      }
      unit.path = result.path;
      unit.waypoint = 0;
      this.lastPathFailure = '';
    }
  }

  private buildSpatialBuckets(): Map<string, UnitState[]> {
    const buckets = new Map<string, UnitState[]>();
    const size = 2.25;
    for (const unit of this.units.values()) {
      const key = `${Math.floor(unit.x / size)}:${Math.floor(unit.z / size)}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(unit);
      else buckets.set(key, [unit]);
    }
    return buckets;
  }

  private advanceUnit(unit: UnitState, dt: number, buckets: Map<string, UnitState[]>): void {
    const target = unit.path[unit.waypoint];
    if (!target) return;
    let dx = target.x - unit.x;
    let dz = target.z - unit.z;
    let distance = Math.hypot(dx, dz);
    const arrival = unit.waypoint === unit.path.length - 1 ? 0.14 : 0.28;
    if (distance <= arrival) {
      unit.x = target.x;
      unit.z = target.z;
      unit.waypoint++;
      if (unit.waypoint >= unit.path.length) {
        unit.path = [];
        unit.waypoint = 0;
        return;
      }
      const next = unit.path[unit.waypoint]!;
      dx = next.x - unit.x;
      dz = next.z - unit.z;
      distance = Math.hypot(dx, dz);
    }
    if (distance < 1e-6) return;

    let vx = dx / distance;
    let vz = dz / distance;
    const bucketSize = 2.25;
    const bx = Math.floor(unit.x / bucketSize);
    const bz = Math.floor(unit.z / bucketSize);
    let separationX = 0;
    let separationZ = 0;
    for (let oz = -1; oz <= 1; oz++) for (let ox = -1; ox <= 1; ox++) {
      for (const other of buckets.get(`${bx + ox}:${bz + oz}`) ?? []) {
        if (other.id === unit.id) continue;
        const sx = unit.x - other.x;
        const sz = unit.z - other.z;
        const sd = Math.hypot(sx, sz);
        const desired = unit.radius + other.radius + 0.18;
        if (sd > 1e-5 && sd < desired) {
          const strength = (desired - sd) / desired;
          separationX += sx / sd * strength;
          separationZ += sz / sd * strength;
        }
      }
    }
    vx += separationX * 0.65;
    vz += separationZ * 0.65;
    const length = Math.hypot(vx, vz) || 1;
    vx /= length;
    vz /= length;

    const step = Math.min(unit.speed * dt, distance);
    let next = { x: unit.x + vx * step, z: unit.z + vz * step };
    if (!this.navigation.isPassable(next)) next = { x: unit.x + dx / distance * step, z: unit.z + dz / distance * step };
    if (!this.navigation.isPassable(next)) return;
    unit.x = next.x;
    unit.z = next.z;
  }

  renderState(alpha: number): readonly UnitRenderState[] {
    const blend = Math.max(0, Math.min(1, alpha));
    return [...this.units.values()].sort((a, b) => a.id - b.id).map(unit => ({
      id: unit.id,
      owner: unit.owner,
      x: unit.previousX + (unit.x - unit.previousX) * blend,
      z: unit.previousZ + (unit.z - unit.previousZ) * blend,
      moving: unit.path.length > 0 || this.pendingPaths.some(request => request.unitId === unit.id),
    }));
  }

  metrics(): RtsSimulationMetrics {
    return {
      activeUnits: this.units.size,
      pendingPaths: this.pendingPaths.length,
      pathsSolvedThisTick: this.pathsSolvedThisTick,
      simulationTimeMs: this.simulationTimeMs,
      lastPathFailure: this.lastPathFailure,
    };
  }

  destroy(): void {
    this.commands.length = 0;
    this.pendingPaths.length = 0;
    this.units.clear();
  }
}
