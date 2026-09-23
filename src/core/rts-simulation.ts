import type { Command, EntityId, PlayerId, ResourceId, WorldPoint } from './contracts.ts';
import { NavigationGrid } from './navigation-grid.ts';

export interface UnitSpawn {
  id: EntityId;
  owner: PlayerId;
  position: WorldPoint;
  speed?: number;
  radius?: number;
}

export interface ResourceNodeSpawn {
  id: EntityId;
  type: ResourceId;
  position: WorldPoint;
  amount: number;
  interactionRadius?: number;
}

export interface DropoffSpawn {
  id: EntityId;
  owner: PlayerId;
  position: WorldPoint;
  radius?: number;
}

export interface GatherConfig {
  carryCapacity: number;
  woodPerSecond: number;
}

export interface UnitRenderState {
  id: EntityId;
  owner: PlayerId;
  x: number;
  z: number;
  moving: boolean;
  carriedWood: number;
  task: UnitTask;
}

export interface ResourceRenderState {
  id: EntityId;
  type: ResourceId;
  x: number;
  z: number;
  remaining: number;
}

type UnitTask = 'idle' | 'move' | 'to-resource' | 'gathering' | 'to-dropoff';
type PathPurpose = 'move' | 'to-resource' | 'to-dropoff';

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
  task: UnitTask;
  gatherTargetId: EntityId | null;
  carriedWood: number;
}

interface ResourceNodeState {
  id: EntityId;
  type: ResourceId;
  position: WorldPoint;
  remaining: number;
  interactionRadius: number;
}

interface DropoffState {
  id: EntityId;
  owner: PlayerId;
  position: WorldPoint;
  radius: number;
}

interface PendingPath {
  unitId: EntityId;
  destination: WorldPoint;
  orderVersion: number;
  purpose: PathPurpose;
}

export interface RtsSimulationMetrics {
  activeUnits: number;
  pendingPaths: number;
  pathsSolvedThisTick: number;
  simulationTimeMs: number;
  lastPathFailure: string;
  resourceNodes: number;
  woodRemaining: number;
  woodStockpile: number;
  gatheringUnits: number;
  carriedWoodTotal: number;
}

const DEFAULT_GATHER_CONFIG: GatherConfig = {
  carryCapacity: 10,
  woodPerSecond: 2,
};

export class RtsSimulation {
  private readonly navigation: NavigationGrid;
  private readonly localPlayer: PlayerId;
  private readonly maxPathsPerTick: number;
  private readonly gatherConfig: GatherConfig;
  private readonly units = new Map<EntityId, UnitState>();
  private readonly resources = new Map<EntityId, ResourceNodeState>();
  private readonly dropoffs = new Map<EntityId, DropoffState>();
  private readonly playerWood = new Map<PlayerId, number>();
  private readonly commands: Command[] = [];
  private pendingPaths: PendingPath[] = [];
  private sequence = 0;
  private pathsSolvedThisTick = 0;
  private simulationTimeMs = 0;
  private lastPathFailure = '';

  constructor(
    navigation: NavigationGrid,
    spawns: readonly UnitSpawn[],
    localPlayer: PlayerId = 1,
    maxPathsPerTick = 4,
    resourceSpawns: readonly ResourceNodeSpawn[] = [],
    dropoffSpawns: readonly DropoffSpawn[] = [],
    gatherConfig: Partial<GatherConfig> = {},
  ) {
    this.navigation = navigation;
    this.localPlayer = localPlayer;
    this.maxPathsPerTick = maxPathsPerTick;
    this.gatherConfig = {
      carryCapacity: gatherConfig.carryCapacity ?? DEFAULT_GATHER_CONFIG.carryCapacity,
      woodPerSecond: gatherConfig.woodPerSecond ?? DEFAULT_GATHER_CONFIG.woodPerSecond,
    };
    if (!(this.gatherConfig.carryCapacity > 0) || !(this.gatherConfig.woodPerSecond > 0)) {
      throw new Error('Gather configuration must use positive capacity and rate');
    }

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
        task: 'idle',
        gatherTargetId: null,
        carriedWood: 0,
      });
    }

    for (const spawn of resourceSpawns) {
      if (this.resources.has(spawn.id) || this.units.has(spawn.id)) throw new Error(`Duplicate resource id ${spawn.id}`);
      if (!Number.isFinite(spawn.amount) || spawn.amount < 0) throw new Error(`Invalid resource amount for ${spawn.id}`);
      this.resources.set(spawn.id, {
        id: spawn.id,
        type: spawn.type,
        position: { x: spawn.position.x, z: spawn.position.z },
        remaining: spawn.amount,
        interactionRadius: spawn.interactionRadius ?? 1.5,
      });
    }

    for (const spawn of dropoffSpawns) {
      if (this.dropoffs.has(spawn.id) || this.units.has(spawn.id) || this.resources.has(spawn.id)) throw new Error(`Duplicate dropoff id ${spawn.id}`);
      this.dropoffs.set(spawn.id, {
        id: spawn.id,
        owner: spawn.owner,
        position: { x: spawn.position.x, z: spawn.position.z },
        radius: spawn.radius ?? 2,
      });
    }
    this.playerWood.set(localPlayer, 0);
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

  issueGather(units: readonly EntityId[], target: EntityId, executeAtTick: number): void {
    this.queueCommand({
      executeAtTick,
      sequence: ++this.sequence,
      player: this.localPlayer,
      units: [...units].sort((a, b) => a - b),
      queue: false,
      order: { type: 'gather', target },
    });
  }

  issueStop(units: readonly EntityId[], executeAtTick: number): void {
    this.queueCommand({
      executeAtTick,
      sequence: ++this.sequence,
      player: this.localPlayer,
      units: [...units].sort((a, b) => a - b),
      queue: false,
      order: { type: 'stop' },
    });
  }

  private ownedUnits(command: Command): UnitState[] {
    return command.units
      .map(id => this.units.get(id))
      .filter((unit): unit is UnitState => Boolean(unit && unit.owner === command.player))
      .sort((a, b) => a.id - b.id);
  }

  private replaceUnitOrder(unit: UnitState): void {
    unit.orderVersion++;
    unit.path = [];
    unit.waypoint = 0;
    this.pendingPaths = this.pendingPaths.filter(request => request.unitId !== unit.id);
  }

  private applyCommand(command: Command): void {
    if (command.player !== this.localPlayer || command.queue) return;
    const owned = this.ownedUnits(command);
    if (owned.length === 0) return;

    if (command.order.type === 'stop') {
      for (const unit of owned) {
        this.replaceUnitOrder(unit);
        unit.task = 'idle';
        unit.gatherTargetId = null;
      }
      return;
    }

    if (command.order.type === 'gather') {
      const resource = this.resources.get(command.order.target);
      if (!resource || resource.type !== 'wood' || resource.remaining <= 0) {
        this.lastPathFailure = `Invalid gather target ${command.order.target}`;
        return;
      }
      if (!this.dropoffFor(command.player)) {
        this.lastPathFailure = `No dropoff for player ${command.player}`;
        return;
      }
      for (const unit of owned) {
        this.replaceUnitOrder(unit);
        unit.gatherTargetId = resource.id;
        if (unit.carriedWood >= this.gatherConfig.carryCapacity - 1e-6) this.routeToDropoff(unit);
        else this.routeToResource(unit, resource);
      }
      return;
    }

    if (command.order.type !== 'move') return;
    const slots = this.assignDestinationSlots(owned.length, command.order.destination);
    for (let index = 0; index < owned.length; index++) {
      const unit = owned[index]!;
      const destination = slots[index];
      this.replaceUnitOrder(unit);
      unit.task = 'move';
      unit.gatherTargetId = null;
      if (!destination) {
        unit.task = 'idle';
        this.lastPathFailure = `No reachable destination slot for unit ${unit.id}`;
        continue;
      }
      this.pendingPaths.push({ unitId: unit.id, destination, orderVersion: unit.orderVersion, purpose: 'move' });
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

  private approachPoint(unit: UnitState, target: WorldPoint, radius: number): WorldPoint | null {
    let dx = unit.x - target.x;
    let dz = unit.z - target.z;
    let length = Math.hypot(dx, dz);
    if (length < 1e-5) {
      const angle = unit.id * 2.399963229728653;
      dx = Math.cos(angle);
      dz = Math.sin(angle);
      length = 1;
    }
    const desired = Math.max(radius + unit.radius, 0.75);
    const point = { x: target.x + dx / length * desired, z: target.z + dz / length * desired };
    return this.navigation.resolveNearestReachable(point, 5);
  }

  private routeToResource(unit: UnitState, resource: ResourceNodeState): void {
    if (resource.remaining <= 1e-6) {
      if (unit.carriedWood > 1e-6) this.routeToDropoff(unit);
      else {
        unit.task = 'idle';
        unit.gatherTargetId = null;
      }
      return;
    }
    const destination = this.approachPoint(unit, resource.position, resource.interactionRadius);
    if (!destination) {
      unit.task = 'idle';
      this.lastPathFailure = `No reachable gather approach for resource ${resource.id}`;
      return;
    }
    unit.task = 'to-resource';
    this.pendingPaths.push({ unitId: unit.id, destination, orderVersion: unit.orderVersion, purpose: 'to-resource' });
  }

  private dropoffFor(owner: PlayerId): DropoffState | undefined {
    return [...this.dropoffs.values()].filter(dropoff => dropoff.owner === owner).sort((a, b) => a.id - b.id)[0];
  }

  private routeToDropoff(unit: UnitState): void {
    const dropoff = this.dropoffFor(unit.owner);
    if (!dropoff) {
      unit.task = 'idle';
      this.lastPathFailure = `No dropoff for player ${unit.owner}`;
      return;
    }
    const destination = this.approachPoint(unit, dropoff.position, dropoff.radius);
    if (!destination) {
      unit.task = 'idle';
      this.lastPathFailure = `No reachable dropoff approach for player ${unit.owner}`;
      return;
    }
    unit.task = 'to-dropoff';
    this.pendingPaths.push({ unitId: unit.id, destination, orderVersion: unit.orderVersion, purpose: 'to-dropoff' });
  }

  fixedUpdate(dtSeconds: number, tick: number): void {
    const started = globalThis.performance?.now?.() ?? Date.now();
    this.pathsSolvedThisTick = 0;
    while (this.commands.length > 0 && this.commands[0]!.executeAtTick <= tick) this.applyCommand(this.commands.shift()!);
    this.solvePendingPaths();

    const sortedUnits = [...this.units.values()].sort((a, b) => a.id - b.id);
    const buckets = this.buildSpatialBuckets();
    for (const unit of sortedUnits) {
      unit.previousX = unit.x;
      unit.previousZ = unit.z;
      this.advanceUnit(unit, dtSeconds, buckets);
    }
    for (const unit of sortedUnits) if (unit.task === 'gathering') this.gather(unit, dtSeconds);
    this.simulationTimeMs = (globalThis.performance?.now?.() ?? Date.now()) - started;
  }

  private solvePendingPaths(): void {
    for (let solved = 0; solved < this.maxPathsPerTick && this.pendingPaths.length > 0; solved++) {
      const request = this.pendingPaths.shift()!;
      const unit = this.units.get(request.unitId);
      if (!unit || unit.orderVersion !== request.orderVersion || unit.task !== request.purpose) continue;
      const result = this.navigation.findPath({ x: unit.x, z: unit.z }, request.destination);
      this.pathsSolvedThisTick++;
      if (!result) {
        unit.path = [];
        unit.waypoint = 0;
        unit.task = 'idle';
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

  private finishPath(unit: UnitState): void {
    unit.path = [];
    unit.waypoint = 0;
    if (unit.task === 'move') {
      unit.task = 'idle';
      return;
    }
    if (unit.task === 'to-resource') {
      const resource = unit.gatherTargetId === null ? undefined : this.resources.get(unit.gatherTargetId);
      if (!resource || resource.type !== 'wood' || resource.remaining <= 1e-6) {
        if (unit.carriedWood > 1e-6) this.routeToDropoff(unit);
        else {
          unit.task = 'idle';
          unit.gatherTargetId = null;
        }
        return;
      }
      unit.task = 'gathering';
      return;
    }
    if (unit.task === 'to-dropoff') {
      if (unit.carriedWood > 0) {
        this.playerWood.set(unit.owner, (this.playerWood.get(unit.owner) ?? 0) + unit.carriedWood);
        unit.carriedWood = 0;
      }
      const resource = unit.gatherTargetId === null ? undefined : this.resources.get(unit.gatherTargetId);
      if (resource && resource.type === 'wood' && resource.remaining > 1e-6) this.routeToResource(unit, resource);
      else {
        unit.task = 'idle';
        unit.gatherTargetId = null;
      }
    }
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
        this.finishPath(unit);
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

  private gather(unit: UnitState, dtSeconds: number): void {
    const resource = unit.gatherTargetId === null ? undefined : this.resources.get(unit.gatherTargetId);
    if (!resource || resource.type !== 'wood' || resource.remaining <= 1e-6) {
      if (unit.carriedWood > 1e-6) this.routeToDropoff(unit);
      else {
        unit.task = 'idle';
        unit.gatherTargetId = null;
      }
      return;
    }
    const capacityLeft = this.gatherConfig.carryCapacity - unit.carriedWood;
    if (capacityLeft <= 1e-6) {
      this.routeToDropoff(unit);
      return;
    }
    const extracted = Math.min(this.gatherConfig.woodPerSecond * dtSeconds, capacityLeft, resource.remaining);
    resource.remaining = Math.max(0, resource.remaining - extracted);
    unit.carriedWood += extracted;
    if (unit.carriedWood >= this.gatherConfig.carryCapacity - 1e-6 || resource.remaining <= 1e-6) this.routeToDropoff(unit);
  }

  renderState(alpha: number): readonly UnitRenderState[] {
    const blend = Math.max(0, Math.min(1, alpha));
    return [...this.units.values()].sort((a, b) => a.id - b.id).map(unit => ({
      id: unit.id,
      owner: unit.owner,
      x: unit.previousX + (unit.x - unit.previousX) * blend,
      z: unit.previousZ + (unit.z - unit.previousZ) * blend,
      moving: unit.path.length > 0 || this.pendingPaths.some(request => request.unitId === unit.id),
      carriedWood: unit.carriedWood,
      task: unit.task,
    }));
  }

  resourceState(): readonly ResourceRenderState[] {
    return [...this.resources.values()].sort((a, b) => a.id - b.id).map(resource => ({
      id: resource.id,
      type: resource.type,
      x: resource.position.x,
      z: resource.position.z,
      remaining: resource.remaining,
    }));
  }

  metrics(): RtsSimulationMetrics {
    const units = [...this.units.values()];
    return {
      activeUnits: this.units.size,
      pendingPaths: this.pendingPaths.length,
      pathsSolvedThisTick: this.pathsSolvedThisTick,
      simulationTimeMs: this.simulationTimeMs,
      lastPathFailure: this.lastPathFailure,
      resourceNodes: this.resources.size,
      woodRemaining: [...this.resources.values()].filter(resource => resource.type === 'wood').reduce((sum, resource) => sum + resource.remaining, 0),
      woodStockpile: this.playerWood.get(this.localPlayer) ?? 0,
      gatheringUnits: units.filter(unit => unit.task === 'gathering' || unit.task === 'to-resource' || unit.task === 'to-dropoff').length,
      carriedWoodTotal: units.reduce((sum, unit) => sum + unit.carriedWood, 0),
    };
  }

  destroy(): void {
    this.commands.length = 0;
    this.pendingPaths.length = 0;
    this.units.clear();
    this.resources.clear();
    this.dropoffs.clear();
    this.playerWood.clear();
  }
}
