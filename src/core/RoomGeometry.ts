import type { Point, WorldSize } from './types';

export const FLOOR_START_RATIO = 0.58;
export const DEFAULT_GROUND_RATIO = 0.78;
export const FLOOR_FEET_MARGIN = 12;

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
  // PetModel.position is the sprite's feet anchor, not its top edge. Only
  // ground contact needs to stay below the baseboard; the body may overlap
  // the wall visually when the dog walks along the back of the floor.
  const maxY = Math.max(0, world.height - 42);
  const minY = Math.min(maxY, getFloorStartY(world) + FLOOR_FEET_MARGIN);
  return {
    minX,
    maxX: Math.max(minX, world.width - edgeInset),
    minY,
    maxY,
  };
}

export function clampFloorPoint(point: Point, world: WorldSize): Point {
  const bounds = getMovementBounds(world);
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  };
}
