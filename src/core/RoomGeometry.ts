import type { Point, WorldSize } from './types';

export const FLOOR_START_RATIO = 0.58;
export const DEFAULT_GROUND_RATIO = 0.78;

export function isMobilePortrait(world: WorldSize): boolean {
  return world.width < 560 && world.height > world.width;
}

export function getFloorStartY(world: WorldSize): number {
  // The taller mobile room has room for a shallower wall and a deeper floor.
  return world.height * (isMobilePortrait(world) ? 0.52 : FLOOR_START_RATIO);
}

export function getMovementBounds(world: WorldSize) {
  // The wide walk-cycle frame extends about 75px from its feet anchor at
  // mobile size. Give it a little edge clearance without changing wide rooms.
  const edgeInset = isMobilePortrait(world) ? 80 : 58;
  const minX = Math.min(edgeInset, world.width / 2);
  // Keep the dog's body comfortably in the room while opening a real upper
  // walking lane on mobile (not merely drawing more floor behind it).
  const floorInset = isMobilePortrait(world)
    ? world.height * 0.15
    : Math.min(165, world.height * 0.2);
  const minY = getFloorStartY(world) + floorInset;
  return {
    minX,
    maxX: Math.max(minX, world.width - edgeInset),
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
