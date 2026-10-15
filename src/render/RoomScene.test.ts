import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM_SCENE, resolveRoomScene, ROOM_SCENES } from './RoomScene';

describe('room scene configuration', () => {
  it('uses the cream tile room by default', () => {
    expect(DEFAULT_ROOM_SCENE).toBe('creamTile');
    expect(resolveRoomScene('').id).toBe('creamTile');
  });

  it('keeps the original wood floor selectable for development', () => {
    expect(resolveRoomScene('?room=wood')).toBe(ROOM_SCENES.wood);
  });

  it('falls back to the review default for unknown scene values', () => {
    expect(resolveRoomScene('?room=unknown').id).toBe('creamTile');
  });
});

