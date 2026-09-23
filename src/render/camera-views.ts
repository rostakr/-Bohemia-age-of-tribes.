export const VIEWS = {
  settlement: { x: -1, z: 2, distance: 67, yaw: 34, pitch: 43 },
  craft: { x: -10, z: 10, distance: 23, yaw: 12, pitch: 32 },
  river: { x: 28, z: 9, distance: 49, yaw: 58, pitch: 40 },
} as const;

export type ViewName = keyof typeof VIEWS;
