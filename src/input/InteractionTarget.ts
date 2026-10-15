import { getFloorStartY } from '../core/RoomGeometry';
import type { PetModel, Point, WorldSize } from '../core/types';
import { getScenePropLayout } from '../render/SceneProps';

export type InteractionTarget = 'pet' | 'cushion' | 'house' | 'frog' | 'floor' | 'wall';

export function getInteractionTarget(
  point: Point,
  pet: PetModel,
  world: WorldSize,
  frogPosition?: Point,
  petVisible = true,
): InteractionTarget {
  const spriteSize = Math.max(150, Math.min(210, Math.min(world.width * 0.38, world.height * 0.28)));
  const petCenterY = pet.position.y - spriteSize * 0.36;
  const petX = (point.x - pet.position.x) / (spriteSize * 0.43);
  const petY = (point.y - petCenterY) / (spriteSize * 0.47);
  if (petVisible && petX * petX + petY * petY <= 1) return 'pet';

  const props = getScenePropLayout(world);
  const frog = frogPosition ?? { x: props.frog.x, y: props.frog.baseline };
  if (inside(point, frog.x, frog.y, Math.max(64, props.frog.width * 1.1), Math.max(54, props.frog.height * 1.2))) return 'frog';
  if (inside(point, props.house.x, props.house.baseline, props.house.width, props.house.height)) return 'house';
  if (inside(point, props.cushion.x, props.cushion.y, props.cushion.width, props.cushion.height)) return 'cushion';
  return point.y >= getFloorStartY(world) ? 'floor' : 'wall';
}

function inside(point: Point, x: number, y: number, width: number, height: number): boolean {
  return Math.abs(point.x - x) <= width / 2 && Math.abs(point.y - y) <= height / 2;
}
