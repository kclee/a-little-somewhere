export type RoomSceneId = 'wood' | 'creamTile';

interface WoodFloorStyle {
  kind: 'wood';
  topColor: string;
  bottomColor: string;
  seamColor: string;
}

interface CreamTileFloorStyle {
  kind: 'creamTile';
  topColor: string;
  bottomColor: string;
  groutColor: string;
  highlightColor: string;
}

export interface RoomSceneConfig {
  id: RoomSceneId;
  wallTopColor: string;
  wallBottomColor: string;
  baseboardColor: string;
  floor: WoodFloorStyle | CreamTileFloorStyle;
}

const SHARED_ROOM = {
  wallTopColor: '#f9eadf',
  wallBottomColor: '#efd9cc',
  baseboardColor: '#b9856c',
} as const;

export const ROOM_SCENES: Record<RoomSceneId, RoomSceneConfig> = {
  wood: {
    id: 'wood',
    ...SHARED_ROOM,
    floor: {
      kind: 'wood',
      topColor: '#c99577',
      bottomColor: '#a86f55',
      seamColor: 'rgb(105 69 54 / 17%)',
    },
  },
  creamTile: {
    id: 'creamTile',
    ...SHARED_ROOM,
    floor: {
      kind: 'creamTile',
      topColor: '#f0e5ce',
      bottomColor: '#ddccb0',
      groutColor: 'rgb(126 112 94 / 22%)',
      highlightColor: 'rgb(255 252 240 / 24%)',
    },
  },
};

export const DEFAULT_ROOM_SCENE: RoomSceneId = 'creamTile';

export function resolveRoomScene(search: string): RoomSceneConfig {
  const requested = new URLSearchParams(search).get('room');
  return requested === 'wood' ? ROOM_SCENES.wood : ROOM_SCENES[DEFAULT_ROOM_SCENE];
}

