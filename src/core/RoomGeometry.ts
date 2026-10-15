import type { Point, WorldSize } from './types';

export const FLOOR_START_RATIO = 0.58;
export const DEFAULT_GROUND_RATIO = 0.78;

export function getMovementBounds(world: WorldSize) {
  const minX = Math.min(58, world.width / 2);
  const minY = world.height * FLOOR_START_RATIO + Math.min(165, world.height * 0.2);
  return {
    minX,
    maxX: Math.max(minX, world.width - 58),
    minY: Math.min(minY, Math.max(0, world.height - 42)),
    maxY: Math.max(minY, world.height - 42),
  };
}

export function clampFloorPoint(point: Point, world: WorldSize): Point {
  const bounds = getMovementBounds(world);
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  };
}
