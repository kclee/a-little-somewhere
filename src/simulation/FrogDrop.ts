import { getFloorStartY } from '../core/RoomGeometry';
import type { Point, WorldSize } from '../core/types';
import { getScenePropLayout } from '../render/SceneProps';

export type FrogDrop = { region: 'house' | 'donut' | 'floor'; position: Point | null };

export function getFrogFloorBounds(world: WorldSize) {
  const frog = getScenePropLayout(world).frog;
  const margin = 6;
  const minX = frog.width / 2 + margin;
  const minY = getFloorStartY(world) + frog.height / 2 + margin;
  return {
    minX,
    maxX: Math.max(minX, world.width - frog.width / 2 - margin),
    minY,
    maxY: Math.max(minY, world.height - frog.height / 2 - margin),
  };
}

export function clampFrogFloorPoint(point: Point, world: WorldSize): Point {
  const bounds = getFrogFloorBounds(world);
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)),
  };
}

export function resolveFrogDrop(pointer: Point, grabOffset: Point, world: WorldSize): FrogDrop {
  const { house, cushion } = getScenePropLayout(world);
  if (insideRect(pointer, house.x, house.baseline, house.width, house.height)) {
    return { region: 'house', position: null };
  }

  // The soft center is a deliberate target; the rim is ordinary floor placement.
  if (insideEllipse(pointer, cushion.x, cushion.y + cushion.height * 0.04,
    cushion.width * 0.26, cushion.height * 0.25)) {
    return {
      region: 'donut',
      position: clampFrogFloorPoint({ x: cushion.x, y: cushion.y + cushion.height * 0.04 }, world),
    };
  }

  return {
    region: 'floor',
    position: clampFrogFloorPoint({ x: pointer.x - grabOffset.x, y: pointer.y - grabOffset.y }, world),
  };
}

function insideRect(point: Point, x: number, y: number, width: number, height: number): boolean {
  return Math.abs(point.x - x) <= width / 2 && Math.abs(point.y - y) <= height / 2;
}

function insideEllipse(point: Point, x: number, y: number, rx: number, ry: number): boolean {
  return ((point.x - x) / rx) ** 2 + ((point.y - y) / ry) ** 2 <= 1;
}
