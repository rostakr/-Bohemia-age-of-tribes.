import type { WorldPoint } from './contracts';

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
}

class MinHeap {
  private readonly items: { index: number; priority: number }[] = [];

  get size(): number { return this.items.length; }

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
  private readonly passable: Uint8Array;

  constructor(readonly options: NavigationGridOptions) {
    if (!(options.cellSize > 0)) throw new Error('Navigation cellSize must be positive');
    this.width = Math.floor((options.maxX - options.minX) / options.cellSize) + 1;
    this.height = Math.floor((options.maxZ - options.minZ) / options.cellSize) + 1;
    if (this.width < 2 || this.height < 2) throw new Error('Navigation grid is too small');
    this.passable = new Uint8Array(this.width * this.height);
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const world = this.cellToWorld({ x, z });
        this.passable[this.index(x, z)] = options.isBlocked(world.x, world.z) ? 0 : 1;
      }
    }
  }

  private index(x: number, z: number): number { return z * this.width + x; }
  private fromIndex(index: number): GridCell { return { x: index % this.width, z: Math.floor(index / this.width) }; }
  private inside(x: number, z: number): boolean { return x >= 0 && z >= 0 && x < this.width && z < this.height; }

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

  resolveNearestReachable(point: WorldPoint, maxRadiusCells = 6): WorldPoint | null {
    const origin = this.worldToCell(point);
    if (!origin) return null;
    if (this.isPassableCell(origin)) return this.cellToWorld(origin);
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
      for (const candidate of candidates) if (this.isPassableCell(candidate)) return this.cellToWorld(candidate);
    }
    return null;
  }

  findPath(start: WorldPoint, destination: WorldPoint, maxVisited = 8_000): PathResult | null {
    const startResolved = this.resolveNearestReachable(start, 3);
    const destinationResolved = this.resolveNearestReachable(destination, 8);
    if (!startResolved || !destinationResolved) return null;
    const startCell = this.worldToCell(startResolved)!;
    const goalCell = this.worldToCell(destinationResolved)!;
    const startIndex = this.index(startCell.x, startCell.z);
    const goalIndex = this.index(goalCell.x, goalCell.z);
    if (startIndex === goalIndex) return { path: [destinationResolved], resolvedDestination: destinationResolved, visited: 0 };

    const count = this.width * this.height;
    const g = new Float64Array(count);
    g.fill(Number.POSITIVE_INFINITY);
    const cameFrom = new Int32Array(count);
    cameFrom.fill(-1);
    const closed = new Uint8Array(count);
    const open = new MinHeap();
    const heuristic = (cell: GridCell): number => {
      const dx = Math.abs(cell.x - goalCell.x);
      const dz = Math.abs(cell.z - goalCell.z);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    g[startIndex] = 0;
    open.push(startIndex, heuristic(startCell));
    let visited = 0;

    const directions = [
      { x: 1, z: 0, cost: 1 }, { x: -1, z: 0, cost: 1 },
      { x: 0, z: 1, cost: 1 }, { x: 0, z: -1, cost: 1 },
      { x: 1, z: 1, cost: Math.SQRT2 }, { x: 1, z: -1, cost: Math.SQRT2 },
      { x: -1, z: 1, cost: Math.SQRT2 }, { x: -1, z: -1, cost: Math.SQRT2 },
    ] as const;

    while (open.size > 0 && visited < maxVisited) {
      const currentIndex = open.pop()!;
      if (closed[currentIndex]) continue;
      closed[currentIndex] = 1;
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
        if (closed[nextIndex]) continue;
        const tentative = g[currentIndex]! + direction.cost;
        if (tentative >= g[nextIndex]!) continue;
        cameFrom[nextIndex] = currentIndex;
        g[nextIndex] = tentative;
        open.push(nextIndex, tentative + heuristic(next));
      }
    }

    if (cameFrom[goalIndex] === -1) return null;
    const reversed: GridCell[] = [goalCell];
    let cursor = goalIndex;
    while (cursor !== startIndex) {
      cursor = cameFrom[cursor]!;
      if (cursor < 0) return null;
      reversed.push(this.fromIndex(cursor));
    }
    reversed.reverse();

    const compact: GridCell[] = [];
    let lastDx = Number.NaN;
    let lastDz = Number.NaN;
    for (let i = 1; i < reversed.length; i++) {
      const previous = reversed[i - 1]!;
      const current = reversed[i]!;
      const dx = Math.sign(current.x - previous.x);
      const dz = Math.sign(current.z - previous.z);
      if (i > 1 && (dx !== lastDx || dz !== lastDz)) compact.push(previous);
      lastDx = dx;
      lastDz = dz;
    }
    compact.push(goalCell);
    return { path: compact.map(cell => this.cellToWorld(cell)), resolvedDestination: destinationResolved, visited };
  }
}
