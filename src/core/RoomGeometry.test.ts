import { describe, expect, it } from 'vitest';
import {
  FLOOR_FEET_MARGIN, FLOOR_START_RATIO, clampFloorPoint, getFloorStartY, getMovementBounds,
} from './RoomGeometry';

describe('room geometry', () => {
  it('shortens only the narrow portrait wall and expands the reachable floor', () => {
    const mobile = { width: 366, height: 767 };
    const wide = { width: 1334, height: 665 };
    const narrowLandscape = { width: 500, height: 400 };

    expect(getFloorStartY(mobile)).toBeCloseTo(mobile.height * 0.52);
    expect(getFloorStartY(wide)).toBeCloseTo(wide.height * FLOOR_START_RATIO);
    expect(getFloorStartY(narrowLandscape)).toBeCloseTo(narrowLandscape.height * FLOOR_START_RATIO);
    expect(getMovementBounds(mobile).minY).toBeCloseTo(getFloorStartY(mobile) + FLOOR_FEET_MARGIN);
    expect(getMovementBounds(mobile).minX).toBeGreaterThanOrEqual(80);
    expect(getMovementBounds(mobile).maxX).toBeLessThanOrEqual(mobile.width - 80);
    expect(getMovementBounds(wide).minY).toBeCloseTo(getFloorStartY(wide) + FLOOR_FEET_MARGIN);
  });

  it('clamps the feet near the baseboard but preserves valid upper, center, and lower floor clicks', () => {
    for (const world of [{ width: 390, height: 767 }, { width: 1200, height: 800 }]) {
      const floorY = getFloorStartY(world);
      const bounds = getMovementBounds(world);
      const x = world.width / 2;
      expect(clampFloorPoint({ x, y: floorY + 2 }, world).y).toBeCloseTo(floorY + FLOOR_FEET_MARGIN);
      for (const y of [floorY + FLOOR_FEET_MARGIN, floorY + 65, (bounds.minY + bounds.maxY) / 2, bounds.maxY]) {
        expect(clampFloorPoint({ x, y }, world)).toEqual({ x, y });
      }
      expect(clampFloorPoint({ x, y: world.height }, world).y).toBe(bounds.maxY);
    }
  });
});
