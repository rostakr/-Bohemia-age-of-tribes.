import { NavigationGrid } from '../core/navigation-grid';
import { SETTLEMENT, WORLD_HALF_SIZE, landscape, riverCenter, riverWidth } from './landscape';

export const RIVER_CROSSINGS = [
  { z: 6, halfLength: 4.5, kind: 'ford' as const },
] as const;

const BUILDING_RADII = [6.2, 4.4, 5.0] as const;

function isRiverBlocked(x: number, z: number): boolean {
  const riverDistance = Math.abs(x - riverCenter(z));
  if (riverDistance > riverWidth(z) + 0.8) return false;
  return !RIVER_CROSSINGS.some(crossing => Math.abs(z - crossing.z) <= crossing.halfLength);
}

function isBuildingBlocked(x: number, z: number): boolean {
  return SETTLEMENT.some((pad, index) => Math.hypot(x - pad.x, z - pad.z) <= BUILDING_RADII[index]!);
}

function isTooSteep(x: number, z: number): boolean {
  const sample = 1.5;
  const center = landscape.heightAt(x, z);
  const slope = Math.max(
    Math.abs(landscape.heightAt(x + sample, z) - center),
    Math.abs(landscape.heightAt(x - sample, z) - center),
    Math.abs(landscape.heightAt(x, z + sample) - center),
    Math.abs(landscape.heightAt(x, z - sample) - center),
  ) / sample;
  return slope > 0.82;
}

export function createPhase2NavigationGrid(): NavigationGrid {
  const bounds = Math.min(96, WORLD_HALF_SIZE - 10);
  return new NavigationGrid({
    minX: -bounds,
    maxX: bounds,
    minZ: -bounds,
    maxZ: bounds,
    cellSize: 2,
    isBlocked: (x, z) => isRiverBlocked(x, z) || isBuildingBlocked(x, z) || isTooSteep(x, z),
  });
}
