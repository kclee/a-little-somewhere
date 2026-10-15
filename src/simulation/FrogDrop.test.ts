import { describe, expect, it } from 'vitest';
import { FLOOR_START_RATIO, getMovementBounds } from '../core/RoomGeometry';
import type { WorldSize } from '../core/types';
import { getScenePropLayout } from '../render/SceneProps';
import { getFrogFloorBounds, resolveFrogDrop } from './FrogDrop';

describe('frog drop regions', () => {
  for (const world of [{ width: 1000, height: 800 }, { width: 366, height: 765 }]) {
    it(`snaps to house and donut center at ${world.width}px`, () => {
      const props = getScenePropLayout(world);
      expect(resolveFrogDrop({ x: props.house.x, y: props.house.baseline }, { x: 0, y: 0 }, world))
        .toEqual({ region: 'house', position: null });
      const donut = resolveFrogDrop({ x: props.cushion.x, y: props.cushion.y }, { x: 0, y: 0 }, world);
      expect(donut.region).toBe('donut');
      expect(donut.position?.x).toBe(props.cushion.x);
    });

    it(`projects wall and out-of-bounds drops onto valid floor at ${world.width}px`, () => {
      const bounds = getFrogFloorBounds(world);
      expect(resolveFrogDrop({ x: 20, y: 20 }, { x: 5, y: 5 }, world))
        .toEqual({ region: 'floor', position: { x: bounds.minX, y: bounds.minY } });
      expect(resolveFrogDrop({ x: world.width + 200, y: world.height + 200 }, { x: 0, y: 0 }, world))
        .toEqual({ region: 'floor', position: { x: bounds.maxX, y: bounds.maxY } });
    });

    it(`preserves a drop in the upper visible floor at ${world.width}px`, () => {
      const bounds = getFrogFloorBounds(world);
      const y = bounds.minY + 18;
      const drop = resolveFrogDrop({ x: world.width * 0.3, y }, { x: 0, y: 0 }, world);
      expect(drop.position?.y).toBe(y);
      expect(y).toBeGreaterThan(world.height * FLOOR_START_RATIO);
      expect(y).toBeLessThan(getMovementBounds(world).minY);
    });
  }

  it('keeps the grab offset for an ordinary floor drop', () => {
    const world: WorldSize = { width: 1000, height: 800 };
    expect(resolveFrogDrop({ x: 300, y: 700 }, { x: 12, y: -8 }, world))
      .toEqual({ region: 'floor', position: { x: 288, y: 708 } });
  });
});
