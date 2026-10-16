import { describe, expect, it } from 'vitest';
import { getFloorStartY } from '../core/RoomGeometry';
import { getScenePropLayout } from './SceneProps';
import { ROOM_SCENES } from './RoomScene';
import {
  RoomClockTime, getClockHandAngles, getFeedingCornerLayout, getWallClockLayout,
  getZonedClockTime,
} from './RoomScenery';

describe('room clock and feeding corner', () => {
  it('uses Austin daylight-saving time and Taipei local time', () => {
    const winter = new Date('2026-01-15T18:30:00Z');
    const summer = new Date('2026-07-15T18:30:00Z');
    expect(getZonedClockTime(winter, ROOM_SCENES.wood.clockTimeZone)).toEqual({ hour: 12, minute: 30 });
    expect(getZonedClockTime(summer, ROOM_SCENES.wood.clockTimeZone)).toEqual({ hour: 13, minute: 30 });
    expect(getZonedClockTime(winter, ROOM_SCENES.creamTile.clockTimeZone)).toEqual({ hour: 2, minute: 30 });
    expect(getZonedClockTime(summer, ROOM_SCENES.creamTile.clockTimeZone)).toEqual({ hour: 2, minute: 30 });
  });

  it('places the hour hand between hour marks and refreshes on minute or room changes', () => {
    const angles = getClockHandAngles({ hour: 3, minute: 30 });
    expect(angles.hour).toBeCloseTo(7 * Math.PI / 12);
    expect(angles.minute).toBeCloseTo(Math.PI);

    const clock = new RoomClockTime();
    const winter = Date.parse('2026-01-15T18:30:05Z');
    expect(clock.read('America/Chicago', winter)).toEqual({ hour: 12, minute: 30 });
    expect(clock.read('America/Chicago', winter + 40_000)).toEqual({ hour: 12, minute: 30 });
    expect(clock.read('America/Chicago', winter + 60_000)).toEqual({ hour: 12, minute: 31 });
    expect(clock.read('Asia/Taipei', winter + 60_000)).toEqual({ hour: 2, minute: 31 });
    expect(clock.read('America/Chicago', winter + 3_600_000)).toEqual({ hour: 13, minute: 30 });
  });

  it('keeps the clock on the wall and bowls on open floor at mobile and desktop sizes', () => {
    for (const world of [{ width: 366, height: 767 }, { width: 1248, height: 617 }]) {
      const floorY = getFloorStartY(world);
      const clock = getWallClockLayout(world);
      const feeding = getFeedingCornerLayout(world);
      const donut = getScenePropLayout(world).cushion;
      const windowRight = world.width * 0.08 + Math.min(world.width * 0.38, 210);
      expect(clock.x - clock.radius).toBeGreaterThan(windowRight);
      expect(clock.y + clock.radius).toBeLessThan(floorY - 18);
      expect(feeding.baseline).toBeGreaterThan(floorY + 40);
      expect(feeding.waterX).toBeGreaterThan(feeding.foodX + 45 * feeding.scale);
      // The donut asset has generous transparent padding, so compare its
      // center instead of the PNG crop rectangle's top edge.
      expect(feeding.baseline + 5 * feeding.scale).toBeLessThan(donut.y - 40);
    }
  });
});
