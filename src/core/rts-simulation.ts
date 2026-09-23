import type { Command, EntityId, PlayerId, WorldPoint } from './contracts.ts';
import { NavigationGrid } from './navigation-grid.ts';

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
  velocityX: number;
  velocityZ: number;
  speed: number;
  radius: number;
  path: readonly WorldPoint[];
  waypoint: number;
  destination: WorldPoint | null;
  orderVersion: number;
  stalledTicks: number;
  lastRepathTick: number;
}

interface PendingPath {
  unitId: EntityId;
  destination: WorldPoint;
  orderVersion: number;
  reason: 'order' | 'repath';
}

export interface RtsSimulationMetrics {
  activeUnits: number;
  movingUnits: number;
  stalledUnits: number;
  pendingPaths: number;
  maxObservedPathQueue: number;
  pathsSolvedThisTick: number;
  pathNodesVisitedThisTick: number;
  repathsQueuedThisTick: number;
  neighborChecksThisTick: number;
  simulationTimeMs: number;
  lastPathFailure: string;
}

const SPATIAL_BUCKET_SIZE = 2.75;
const STALL_REPATH_TICKS = 45;
const REPATH_COOLDOWN_TICKS = 60;

function bucketKey(x: number, z: number): number {
  return ((x & 0xffff) << 16) | (z & 0xffff);
}

export class RtsSimulation {
  private readonly navigation: NavigationGrid;
  private readonly localPlayer: PlayerId;
  private readonly maxPathsPerTick: number;
  private readonly units = new Map<EntityId, UnitState>();
  private readonly commands: Command[] = [];
  private pendingPaths: PendingPath[] = [];
  private readonly pendingUnitIds = new Set<EntityId>();
  private readonly spatialBuckets = new Map<number, UnitState[]>();
  private sequence = 0;
  private pathsSolvedThisTick = 0;
  private pathNodesVisitedThisTick = 0;
  private repathsQueuedThisTick = 0;
  private neighborChecksThisTick = 0;
  private maxObservedPathQueue = 0;
  private simulationTimeMs = 0;
  private lastPathFailure = '';

  constructor(
    navigation: NavigationGrid,
    spawns: readonly UnitSpawn[],
    localPlayer: PlayerId = 1,
    maxPathsPerTick = 4,
  ) {
    this.navigation = navigation;
    this.localPlayer = localPlayer;
    this.maxPathsPerTick = Math.max(1, Math.floor(maxPathsPerTick));
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
        velocityX: 0,
        velocityZ: 0,
        speed: spawn.speed ?? 4.2,
        radius: spawn.radius ?? 0.45,
        path: [],
        waypoint: 0,
        destination: null,
        orderVersion: 0,
        stalledTicks: 0,
        lastRepathTick: Number.NEGATIVE_INFINITY,
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

    const slots = this.assignDestinationSlots(owned, command.order.destination);
    const replacing = new Set(owned.map(unit => unit.id));
    this.pendingPaths = this.pendingPaths.filter(request => !replacing.has(request.unitId));
    this.rebuildPendingUnitIds();

    for (const unit of owned) {
      const destination = slots.get(unit.id) ?? null;
      unit.orderVersion++;
      unit.path = [];
      unit.waypoint = 0;
      unit.velocityX = 0;
      unit.velocityZ = 0;
      unit.stalledTicks = 0;
      unit.destination = destination;
      if (!destination) {
        this.lastPathFailure = `No reachable destination slot for unit ${unit.id}`;
        continue;
      }
      this.enqueuePath({ unitId: unit.id, destination, orderVersion: unit.orderVersion, reason: 'order' });
    }
  }

  private buildCandidateOffsets(count: number): WorldPoint[] {
    const spacing = 1.45;
    const offsets: WorldPoint[] = [{ x: 0, z: 0 }];
    for (let ring = 1; offsets.length < count * 6 && ring <= 18; ring++) {
      for (let x = -ring; x <= ring; x++) offsets.push({ x: x * spacing, z: -ring * spacing });
      for (let z = -ring + 1; z <= ring; z++) offsets.push({ x: ring * spacing, z: z * spacing });
      for (let x = ring - 1; x >= -ring; x--) offsets.push({ x: x * spacing, z: ring * spacing });
      for (let z = ring - 1; z >= -ring + 1; z--) offsets.push({ x: -ring * spacing, z: z * spacing });
    }
    return offsets;
  }

  private assignDestinationSlots(units: readonly UnitState[], center: WorldPoint): Map<EntityId, WorldPoint | null> {
    const result = new Map<EntityId, WorldPoint | null>();
    const groups = new Map<number, UnitState[]>();
    for (const unit of units) {
      const component = this.navigation.componentAt({ x: unit.x, z: unit.z });
      if (component === null) {
        result.set(unit.id, null);
        continue;
      }
      const group = groups.get(component);
      if (group) group.push(unit);
      else groups.set(component, [unit]);
    }

    for (const [component, group] of groups) {
      const offsets = this.buildCandidateOffsets(group.length);
      const slots: WorldPoint[] = [];
      const used = new Set<string>();
      for (const offset of offsets) {
        if (slots.length >= group.length) break;
        const point = this.navigation.resolveNearestReachable(
          { x: center.x + offset.x, z: center.z + offset.z },
          5,
          component,
        );
        if (!point) continue;
        const key = `${point.x.toFixed(3)}:${point.z.toFixed(3)}`;
        if (used.has(key)) continue;
        used.add(key);
        slots.push(point);
      }

      const remainingUnits = [...group];
      const remainingSlots = [...slots];
      if (remainingUnits.length > 0 && remainingSlots.length > 0) {
        let bestUnitIndex = 0;
        let bestSlotIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (let unitIndex = 0; unitIndex < remainingUnits.length; unitIndex++) {
          for (let slotIndex = 0; slotIndex < remainingSlots.length; slotIndex++) {
            const unit = remainingUnits[unitIndex]!;
            const slot = remainingSlots[slotIndex]!;
            const distance = (unit.x - slot.x) ** 2 + (unit.z - slot.z) ** 2;
            if (distance < bestDistance || (distance === bestDistance && unit.id < remainingUnits[bestUnitIndex]!.id)) {
              bestDistance = distance;
              bestUnitIndex = unitIndex;
              bestSlotIndex = slotIndex;
            }
          }
        }
        const unit = remainingUnits.splice(bestUnitIndex, 1)[0]!;
        const slot = remainingSlots.splice(bestSlotIndex, 1)[0]!;
        result.set(unit.id, slot);
      }

      remainingUnits.sort((a, b) => {
        const aa = Math.atan2(a.z - center.z, a.x - center.x);
        const ba = Math.atan2(b.z - center.z, b.x - center.x);
        return aa - ba || a.id - b.id;
      });
      remainingSlots.sort((a, b) => {
        const aa = Math.atan2(a.z - center.z, a.x - center.x);
        const ba = Math.atan2(b.z - center.z, b.x - center.x);
        const ad = (a.x - center.x) ** 2 + (a.z - center.z) ** 2;
        const bd = (b.x - center.x) ** 2 + (b.z - center.z) ** 2;
        return aa - ba || ad - bd || a.x - b.x || a.z - b.z;
      });
      for (let index = 0; index < remainingUnits.length; index++) {
        result.set(remainingUnits[index]!.id, remainingSlots[index] ?? null);
      }
    }
    return result;
  }

  fixedUpdate(dtSeconds: number, tick: number): void {
    const started = globalThis.performance?.now?.() ?? Date.now();
    this.pathsSolvedThisTick = 0;
    this.pathNodesVisitedThisTick = 0;
    this.repathsQueuedThisTick = 0;
    this.neighborChecksThisTick = 0;
    while (this.commands.length > 0 && this.commands[0]!.executeAtTick <= tick) this.applyCommand(this.commands.shift()!);
    this.solvePendingPaths();

    this.buildSpatialBuckets();
    for (const unit of [...this.units.values()].sort((a, b) => a.id - b.id)) {
      unit.previousX = unit.x;
      unit.previousZ = unit.z;
      this.advanceUnit(unit, dtSeconds, tick);
    }
    this.maxObservedPathQueue = Math.max(this.maxObservedPathQueue, this.pendingPaths.length);
    this.simulationTimeMs = (globalThis.performance?.now?.() ?? Date.now()) - started;
  }

  private enqueuePath(request: PendingPath): boolean {
    if (this.pendingUnitIds.has(request.unitId)) return false;
    this.pendingPaths.push(request);
    this.pendingUnitIds.add(request.unitId);
    this.maxObservedPathQueue = Math.max(this.maxObservedPathQueue, this.pendingPaths.length);
    return true;
  }

  private rebuildPendingUnitIds(): void {
    this.pendingUnitIds.clear();
    for (const request of this.pendingPaths) this.pendingUnitIds.add(request.unitId);
  }

  private solvePendingPaths(): void {
    for (let solved = 0; solved < this.maxPathsPerTick && this.pendingPaths.length > 0; solved++) {
      const request = this.pendingPaths.shift()!;
      this.pendingUnitIds.delete(request.unitId);
      const unit = this.units.get(request.unitId);
      if (!unit || unit.orderVersion !== request.orderVersion) continue;
      const result = this.navigation.findPath({ x: unit.x, z: unit.z }, request.destination);
      this.pathsSolvedThisTick++;
      this.pathNodesVisitedThisTick += result?.visited ?? 0;
      if (!result) {
        if (request.reason === 'order') {
          unit.path = [];
          unit.waypoint = 0;
          unit.destination = null;
        }
        this.lastPathFailure = `No path for unit ${unit.id}`;
        continue;
      }
      unit.path = result.path;
      unit.waypoint = 0;
      unit.destination = result.resolvedDestination;
      unit.stalledTicks = 0;
      this.lastPathFailure = '';
    }
  }

  private buildSpatialBuckets(): void {
    for (const bucket of this.spatialBuckets.values()) bucket.length = 0;
    for (const unit of this.units.values()) {
      const bx = Math.floor(unit.x / SPATIAL_BUCKET_SIZE);
      const bz = Math.floor(unit.z / SPATIAL_BUCKET_SIZE);
      const key = bucketKey(bx, bz);
      const bucket = this.spatialBuckets.get(key);
      if (bucket) bucket.push(unit);
      else this.spatialBuckets.set(key, [unit]);
    }
  }

  private nearbyUnits(unit: UnitState): UnitState[] {
    const bx = Math.floor(unit.x / SPATIAL_BUCKET_SIZE);
    const bz = Math.floor(unit.z / SPATIAL_BUCKET_SIZE);
    const nearby: UnitState[] = [];
    for (let oz = -1; oz <= 1; oz++) {
      for (let ox = -1; ox <= 1; ox++) {
        const bucket = this.spatialBuckets.get(bucketKey(bx + ox, bz + oz));
        if (bucket) nearby.push(...bucket);
      }
    }
    return nearby;
  }

  private queueStalledRepath(unit: UnitState, tick: number): void {
    if (!unit.destination || unit.stalledTicks < STALL_REPATH_TICKS) return;
    if (tick - unit.lastRepathTick < REPATH_COOLDOWN_TICKS) return;
    if (this.pendingUnitIds.has(unit.id)) return;
    const queued = this.enqueuePath({
      unitId: unit.id,
      destination: unit.destination,
      orderVersion: unit.orderVersion,
      reason: 'repath',
    });
    if (queued) {
      unit.lastRepathTick = tick;
      unit.stalledTicks = 0;
      this.repathsQueuedThisTick++;
    }
  }

  private advanceUnit(unit: UnitState, dt: number, tick: number): void {
    const target = unit.path[unit.waypoint];
    if (!target) {
      unit.velocityX = 0;
      unit.velocityZ = 0;
      return;
    }

    let dx = target.x - unit.x;
    let dz = target.z - unit.z;
    let distance = Math.hypot(dx, dz);
    const arrival = unit.waypoint === unit.path.length - 1 ? 0.14 : 0.28;
    if (distance <= arrival) {
      unit.x = target.x;
      unit.z = target.z;
      unit.waypoint++;
      unit.stalledTicks = 0;
      if (unit.waypoint >= unit.path.length) {
        unit.path = [];
        unit.waypoint = 0;
        unit.destination = null;
        unit.velocityX = 0;
        unit.velocityZ = 0;
        return;
      }
      const next = unit.path[unit.waypoint]!;
      dx = next.x - unit.x;
      dz = next.z - unit.z;
      distance = Math.hypot(dx, dz);
    }
    if (distance < 1e-6) return;

    const directX = dx / distance;
    const directZ = dz / distance;
    let steerX = directX;
    let steerZ = directZ;
    let separationX = 0;
    let separationZ = 0;
    let avoidX = 0;
    let avoidZ = 0;

    for (const other of this.nearbyUnits(unit)) {
      if (other.id === unit.id) continue;
      this.neighborChecksThisTick++;
      const toOtherX = other.x - unit.x;
      const toOtherZ = other.z - unit.z;
      const sd = Math.hypot(toOtherX, toOtherZ);
      if (sd < 1e-5) {
        const side = unit.id < other.id ? -1 : 1;
        avoidX += -directZ * side;
        avoidZ += directX * side;
        continue;
      }

      const desiredSeparation = unit.radius + other.radius + 0.16;
      if (sd < desiredSeparation) {
        const strength = (desiredSeparation - sd) / desiredSeparation;
        separationX -= toOtherX / sd * strength;
        separationZ -= toOtherZ / sd * strength;
      }

      const anticipationRadius = desiredSeparation + 1.35;
      if (sd < anticipationRadius) {
        const ahead = (toOtherX * directX + toOtherZ * directZ) / sd;
        if (ahead > 0.1) {
          const side = unit.id < other.id ? -1 : 1;
          const strength = (1 - sd / anticipationRadius) * ahead;
          avoidX += -directZ * side * strength;
          avoidZ += directX * side * strength;
        }
      }
    }

    steerX += separationX * 1.15 + avoidX * 0.8;
    steerZ += separationZ * 1.15 + avoidZ * 0.8;
    let steerLength = Math.hypot(steerX, steerZ);
    if (steerLength < 1e-6) {
      steerX = directX;
      steerZ = directZ;
      steerLength = 1;
    }
    steerX /= steerLength;
    steerZ /= steerLength;

    const step = Math.min(unit.speed * dt, distance);
    const candidates = [
      { x: unit.x + steerX * step, z: unit.z + steerZ * step },
      { x: unit.x + directX * step, z: unit.z + directZ * step },
      { x: unit.x + (directX - directZ * 0.55) * step, z: unit.z + (directZ + directX * 0.55) * step },
      { x: unit.x + (directX + directZ * 0.55) * step, z: unit.z + (directZ - directX * 0.55) * step },
    ];

    const oldDistance = distance;
    let accepted: WorldPoint | null = null;
    for (const candidate of candidates) {
      const length = Math.hypot(candidate.x - unit.x, candidate.z - unit.z);
      if (length < 1e-6) continue;
      const normalized = length > step * 1.05
        ? { x: unit.x + (candidate.x - unit.x) / length * step, z: unit.z + (candidate.z - unit.z) / length * step }
        : candidate;
      if (this.navigation.isPassableSegment({ x: unit.x, z: unit.z }, normalized)) {
        accepted = normalized;
        break;
      }
    }

    if (!accepted) {
      unit.velocityX = 0;
      unit.velocityZ = 0;
      unit.stalledTicks++;
      this.queueStalledRepath(unit, tick);
      return;
    }

    const movedX = accepted.x - unit.x;
    const movedZ = accepted.z - unit.z;
    unit.x = accepted.x;
    unit.z = accepted.z;
    unit.velocityX = dt > 0 ? movedX / dt : 0;
    unit.velocityZ = dt > 0 ? movedZ / dt : 0;
    const newDistance = Math.hypot(target.x - unit.x, target.z - unit.z);
    if (newDistance < oldDistance - 0.004) unit.stalledTicks = 0;
    else unit.stalledTicks++;
    this.queueStalledRepath(unit, tick);
  }

  renderState(alpha: number): readonly UnitRenderState[] {
    const blend = Math.max(0, Math.min(1, alpha));
    return [...this.units.values()].sort((a, b) => a.id - b.id).map(unit => ({
      id: unit.id,
      owner: unit.owner,
      x: unit.previousX + (unit.x - unit.previousX) * blend,
      z: unit.previousZ + (unit.z - unit.previousZ) * blend,
      moving: unit.path.length > 0 || this.pendingUnitIds.has(unit.id),
    }));
  }

  metrics(): RtsSimulationMetrics {
    let movingUnits = 0;
    let stalledUnits = 0;
    for (const unit of this.units.values()) {
      if (unit.path.length > 0 || this.pendingUnitIds.has(unit.id)) movingUnits++;
      if (unit.stalledTicks >= STALL_REPATH_TICKS / 2) stalledUnits++;
    }
    return {
      activeUnits: this.units.size,
      movingUnits,
      stalledUnits,
      pendingPaths: this.pendingPaths.length,
      maxObservedPathQueue: this.maxObservedPathQueue,
      pathsSolvedThisTick: this.pathsSolvedThisTick,
      pathNodesVisitedThisTick: this.pathNodesVisitedThisTick,
      repathsQueuedThisTick: this.repathsQueuedThisTick,
      neighborChecksThisTick: this.neighborChecksThisTick,
      simulationTimeMs: this.simulationTimeMs,
      lastPathFailure: this.lastPathFailure,
    };
  }

  destroy(): void {
    this.commands.length = 0;
    this.pendingPaths.length = 0;
    this.pendingUnitIds.clear();
    this.spatialBuckets.clear();
    this.units.clear();
  }
}
