import type { WorldPoint } from './contracts.ts';

export interface NavigationGridOptions {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cellSize: number;
  isBlocked: (x: number, z: number) => boolean;
}

export interface GridCell {
  x: number;
  z: number;
}

export interface PathResult {
  path: readonly WorldPoint[];
  resolvedDestination: WorldPoint;
  visited: number;
  rawCells: number;
}

class MinHeap {
  private readonly items: { index: number; priority: number }[] = [];

  get size(): number { return this.items.length; }

  clear(): void { this.items.length = 0; }

  push(index: number, priority: number): void {
    const item = { index, priority };
    this.items.push(item);
    let cursor = this.items.length - 1;
    while (cursor > 0) {
      const parent = (cursor - 1) >> 1;
      if (this.items[parent]!.priority <= priority) break;
      this.items[cursor] = this.items[parent]!;
      cursor = parent;
    }
    this.items[cursor] = item;
  }

  pop(): number | undefined {
    if (this.items.length === 0) return undefined;
    const root = this.items[0]!;
    const tail = this.items.pop()!;
    if (this.items.length > 0) {
      let cursor = 0;
      while (true) {
        const left = cursor * 2 + 1;
        const right = left + 1;
        if (left >= this.items.length) break;
        const child = right < this.items.length && this.items[right]!.priority < this.items[left]!.priority ? right : left;
        if (this.items[child]!.priority >= tail.priority) break;
        this.items[cursor] = this.items[child]!;
        cursor = child;
      }
      this.items[cursor] = tail;
    }
    return root.index;
  }
}

export class NavigationGrid {
  readonly width: number;
  readonly height: number;
  readonly options: NavigationGridOptions;
  readonly componentCount: number;
  private readonly passable: Uint8Array;
  private readonly components: Int32Array;
  private readonly gScore: Float64Array;
  private readonly cameFrom: Int32Array;
  private readonly seenGeneration: Uint32Array;
  private readonly closedGeneration: Uint32Array;
  private readonly open = new MinHeap();
  private generation = 0;

  constructor(options: NavigationGridOptions) {
    this.options = options;
    if (!(options.cellSize > 0)) throw new Error('Navigation cellSize must be positive');
    this.width = Math.floor((options.maxX - options.minX) / options.cellSize) + 1;
    this.height = Math.floor((options.maxZ - options.minZ) / options.cellSize) + 1;
    if (this.width < 2 || this.height < 2) throw new Error('Navigation grid is too small');

    const count = this.width * this.height;
    this.passable = new Uint8Array(count);
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const world = this.cellToWorld({ x, z });
        this.passable[this.index(x, z)] = options.isBlocked(world.x, world.z) ? 0 : 1;
      }
    }

    this.components = new Int32Array(count);
    this.components.fill(-1);
    this.componentCount = this.buildComponents();
    this.gScore = new Float64Array(count);
    this.cameFrom = new Int32Array(count);
    this.seenGeneration = new Uint32Array(count);
    this.closedGeneration = new Uint32Array(count);
  }

  private index(x: number, z: number): number { return z * this.width + x; }
  private fromIndex(index: number): GridCell { return { x: index % this.width, z: Math.floor(index / this.width) }; }
  private inside(x: number, z: number): boolean { return x >= 0 && z >= 0 && x < this.width && z < this.height; }

  private buildComponents(): number {
    const stack: number[] = [];
    let component = 0;
    for (let start = 0; start < this.passable.length; start++) {
      if (this.passable[start] === 0 || this.components[start] !== -1) continue;
      this.components[start] = component;
      stack.push(start);
      while (stack.length > 0) {
        const currentIndex = stack.pop()!;
        const current = this.fromIndex(currentIndex);
        const neighbours = [
          { x: current.x + 1, z: current.z },
          { x: current.x - 1, z: current.z },
          { x: current.x, z: current.z + 1 },
          { x: current.x, z: current.z - 1 },
        ];
        for (const next of neighbours) {
          if (!this.inside(next.x, next.z)) continue;
          const nextIndex = this.index(next.x, next.z);
          if (this.passable[nextIndex] === 0 || this.components[nextIndex] !== -1) continue;
          this.components[nextIndex] = component;
          stack.push(nextIndex);
        }
      }
      component++;
    }
    return component;
  }

  private nextGeneration(): number {
    if (this.generation >= 0xffff_fffe) {
      this.seenGeneration.fill(0);
      this.closedGeneration.fill(0);
      this.generation = 0;
    }
    this.generation++;
    return this.generation;
  }

  worldToCell(point: WorldPoint): GridCell | null {
    const x = Math.round((point.x - this.options.minX) / this.options.cellSize);
    const z = Math.round((point.z - this.options.minZ) / this.options.cellSize);
    return this.inside(x, z) ? { x, z } : null;
  }

  cellToWorld(cell: GridCell): WorldPoint {
    return {
      x: this.options.minX + cell.x * this.options.cellSize,
      z: this.options.minZ + cell.z * this.options.cellSize,
    };
  }

  isPassableCell(cell: GridCell): boolean {
    return this.inside(cell.x, cell.z) && this.passable[this.index(cell.x, cell.z)] === 1;
  }

  isPassable(point: WorldPoint): boolean {
    const cell = this.worldToCell(point);
    return cell !== null && this.isPassableCell(cell);
  }

  componentAt(point: WorldPoint): number | null {
    const cell = this.worldToCell(point);
    if (!cell || !this.isPassableCell(cell)) return null;
    const component = this.components[this.index(cell.x, cell.z)]!;
    return component >= 0 ? component : null;
  }

  resolveNearestReachable(point: WorldPoint, maxRadiusCells = 6, requiredComponent?: number): WorldPoint | null {
    const origin = this.worldToCell(point);
    if (!origin) return null;
    const acceptable = (cell: GridCell): boolean => {
      if (!this.isPassableCell(cell)) return false;
      return requiredComponent === undefined || this.components[this.index(cell.x, cell.z)] === requiredComponent;
    };
    if (acceptable(origin)) return this.cellToWorld(origin);

    for (let radius = 1; radius <= maxRadiusCells; radius++) {
      const candidates: GridCell[] = [];
      for (let dx = -radius; dx <= radius; dx++) {
        candidates.push({ x: origin.x + dx, z: origin.z - radius });
        candidates.push({ x: origin.x + dx, z: origin.z + radius });
      }
      for (let dz = -radius + 1; dz <= radius - 1; dz++) {
        candidates.push({ x: origin.x - radius, z: origin.z + dz });
        candidates.push({ x: origin.x + radius, z: origin.z + dz });
      }
      candidates.sort((a, b) => {
        const ad = (a.x - origin.x) ** 2 + (a.z - origin.z) ** 2;
        const bd = (b.x - origin.x) ** 2 + (b.z - origin.z) ** 2;
        return ad - bd || a.z - b.z || a.x - b.x;
      });
      for (const candidate of candidates) if (acceptable(candidate)) return this.cellToWorld(candidate);
    }
    return null;
  }

  isPassableSegment(start: WorldPoint, end: WorldPoint): boolean {
    const startCell = this.worldToCell(start);
    const endCell = this.worldToCell(end);
    if (!startCell || !endCell) return false;
    return this.hasLineOfSight(startCell, endCell);
  }

  private hasLineOfSight(start: GridCell, end: GridCell): boolean {
    let x = start.x;
    let z = start.z;
    const dx = Math.abs(end.x - start.x);
    const dz = Math.abs(end.z - start.z);
    const sx = start.x < end.x ? 1 : -1;
    const sz = start.z < end.z ? 1 : -1;
    let error = dx - dz;
    if (!this.isPassableCell({ x, z })) return false;

    while (x !== end.x || z !== end.z) {
      const previousX = x;
      const previousZ = z;
      const doubled = error * 2;
      if (doubled > -dz) {
        error -= dz;
        x += sx;
      }
      if (doubled < dx) {
        error += dx;
        z += sz;
      }
      if (!this.isPassableCell({ x, z })) return false;
      if (x !== previousX && z !== previousZ) {
        if (!this.isPassableCell({ x, z: previousZ }) || !this.isPassableCell({ x: previousX, z })) return false;
      }
    }
    return true;
  }

  private simplifyPath(cells: readonly GridCell[]): GridCell[] {
    if (cells.length <= 2) return [...cells];
    const result: GridCell[] = [cells[0]!];
    let anchor = 0;
    while (anchor < cells.length - 1) {
      let next = anchor + 1;
      for (let candidate = cells.length - 1; candidate > anchor + 1; candidate--) {
        if (this.hasLineOfSight(cells[anchor]!, cells[candidate]!)) {
          next = candidate;
          break;
        }
      }
      result.push(cells[next]!);
      anchor = next;
    }
    return result;
  }

  findPath(start: WorldPoint, destination: WorldPoint, maxVisited = 8_000): PathResult | null {
    const startResolved = this.resolveNearestReachable(start, 3);
    if (!startResolved) return null;
    const startComponent = this.componentAt(startResolved);
    if (startComponent === null) return null;
    const destinationResolved = this.resolveNearestReachable(destination, 8, startComponent);
    if (!destinationResolved) return null;

    const startCell = this.worldToCell(startResolved)!;
    const goalCell = this.worldToCell(destinationResolved)!;
    const startIndex = this.index(startCell.x, startCell.z);
    const goalIndex = this.index(goalCell.x, goalCell.z);
    if (startIndex === goalIndex) {
      return { path: [destinationResolved], resolvedDestination: destinationResolved, visited: 0, rawCells: 1 };
    }

    const generation = this.nextGeneration();
    this.open.clear();
    this.seenGeneration[startIndex] = generation;
    this.gScore[startIndex] = 0;
    this.cameFrom[startIndex] = -1;

    const heuristic = (cell: GridCell): number => {
      const dx = Math.abs(cell.x - goalCell.x);
      const dz = Math.abs(cell.z - goalCell.z);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    this.open.push(startIndex, heuristic(startCell));
    let visited = 0;

    const directions = [
      { x: 1, z: 0, cost: 1 }, { x: -1, z: 0, cost: 1 },
      { x: 0, z: 1, cost: 1 }, { x: 0, z: -1, cost: 1 },
      { x: 1, z: 1, cost: Math.SQRT2 }, { x: 1, z: -1, cost: Math.SQRT2 },
      { x: -1, z: 1, cost: Math.SQRT2 }, { x: -1, z: -1, cost: Math.SQRT2 },
    ] as const;

    while (this.open.size > 0 && visited < maxVisited) {
      const currentIndex = this.open.pop()!;
      if (this.closedGeneration[currentIndex] === generation) continue;
      this.closedGeneration[currentIndex] = generation;
      visited++;
      if (currentIndex === goalIndex) break;
      const current = this.fromIndex(currentIndex);

      for (const direction of directions) {
        const next = { x: current.x + direction.x, z: current.z + direction.z };
        if (!this.isPassableCell(next)) continue;
        if (direction.x !== 0 && direction.z !== 0) {
          if (!this.isPassableCell({ x: current.x + direction.x, z: current.z }) ||
              !this.isPassableCell({ x: current.x, z: current.z + direction.z })) continue;
        }
        const nextIndex = this.index(next.x, next.z);
        if (this.closedGeneration[nextIndex] === generation) continue;
        const currentScore = this.gScore[currentIndex]!;
        const tentative = currentScore + direction.cost;
        const seen = this.seenGeneration[nextIndex] === generation;
        if (seen && tentative >= this.gScore[nextIndex]!) continue;
        this.seenGeneration[nextIndex] = generation;
        this.cameFrom[nextIndex] = currentIndex;
        this.gScore[nextIndex] = tentative;
        this.open.push(nextIndex, tentative + heuristic(next));
      }
    }

    if (this.seenGeneration[goalIndex] !== generation || this.cameFrom[goalIndex] === -1) return null;
    const reversed: GridCell[] = [goalCell];
    let cursor = goalIndex;
    while (cursor !== startIndex) {
      cursor = this.cameFrom[cursor]!;
      if (cursor < 0) return null;
      reversed.push(this.fromIndex(cursor));
    }
    reversed.reverse();
    const simplified = this.simplifyPath(reversed);
    return {
      path: simplified.slice(1).map(cell => this.cellToWorld(cell)),
      resolvedDestination: destinationResolved,
      visited,
      rawCells: reversed.length,
    };
  }
}
