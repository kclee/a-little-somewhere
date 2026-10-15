import { describe, expect, it } from 'vitest';
import { FLOOR_START_RATIO, getFloorStartY, getMovementBounds } from './RoomGeometry';

describe('room geometry', () => {
  it('shortens only the narrow portrait wall and expands the reachable floor', () => {
    const mobile = { width: 366, height: 767 };
    const wide = { width: 1334, height: 665 };
    const narrowLandscape = { width: 500, height: 400 };

    expect(getFloorStartY(mobile)).toBeCloseTo(mobile.height * 0.52);
    expect(getFloorStartY(wide)).toBeCloseTo(wide.height * FLOOR_START_RATIO);
    expect(getFloorStartY(narrowLandscape)).toBeCloseTo(narrowLandscape.height * FLOOR_START_RATIO);
    expect(getMovementBounds(mobile).minY).toBeLessThan(
      mobile.height * FLOOR_START_RATIO + Math.min(165, mobile.height * 0.2),
    );
    expect(getMovementBounds(mobile).minY).toBeGreaterThan(getFloorStartY(mobile));
    expect(getMovementBounds(mobile).minX).toBeGreaterThanOrEqual(80);
    expect(getMovementBounds(mobile).maxX).toBeLessThanOrEqual(mobile.width - 80);
    expect(getMovementBounds(wide).minY).toBeCloseTo(
      wide.height * FLOOR_START_RATIO + Math.min(165, wide.height * 0.2),
    );
  });
});
