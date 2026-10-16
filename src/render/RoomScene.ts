export type RoomSceneId = 'wood' | 'creamTile';
export type WindowViewStyle = 'hills' | 'taiwanCity';
export type WallDecorStyle = 'booksAndPlant' | 'taiwanHome';
export type RoomTimeZone = 'America/Chicago' | 'Asia/Taipei';

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
  name: string;
  wallTopColor: string;
  wallBottomColor: string;
  baseboardColor: string;
  windowView: WindowViewStyle;
  wallDecor: WallDecorStyle;
  clockTimeZone: RoomTimeZone;
  floor: WoodFloorStyle | CreamTileFloorStyle;
}

export const ROOM_SCENES: Record<RoomSceneId, RoomSceneConfig> = {
  wood: {
    id: 'wood',
    name: 'Cozy Wood Room',
    wallTopColor: '#f9eadf',
    wallBottomColor: '#efd9cc',
    baseboardColor: '#b9856c',
    windowView: 'hills',
    wallDecor: 'booksAndPlant',
    clockTimeZone: 'America/Chicago',
    floor: {
      kind: 'wood',
      topColor: '#c99577',
      bottomColor: '#a86f55',
      seamColor: 'rgb(105 69 54 / 17%)',
    },
  },
  creamTile: {
    id: 'creamTile',
    name: 'Warm Tile Room',
    wallTopColor: '#f8f0e6',
    wallBottomColor: '#ece0d4',
    baseboardColor: '#b39b8b',
    windowView: 'taiwanCity',
    wallDecor: 'taiwanHome',
    clockTimeZone: 'Asia/Taipei',
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

export function isRoomSceneId(value: string): value is RoomSceneId {
  return value === 'wood' || value === 'creamTile';
}

export function resolveRoomScene(search: string): RoomSceneConfig {
  const requested = new URLSearchParams(search).get('room');
  return requested && isRoomSceneId(requested)
    ? ROOM_SCENES[requested]
    : ROOM_SCENES[DEFAULT_ROOM_SCENE];
}

