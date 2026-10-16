export interface Point {
  x: number;
  y: number;
}

export interface WorldSize {
  width: number;
  height: number;
}

export type PetState = 'idle' | 'walk' | 'jog' | 'sit' | 'attention' | 'wallWag'
  | 'floorRest' | 'floorSleep' | 'floorWake';

export interface PetModel {
  position: Point;
  velocityX: number;
  velocityY: number;
  intent: 'autonomous' | 'moveTo' | 'wallMove' | 'donutMove' | 'restAtDonut' | 'frogMove' | 'playWithFrog' | 'frogDrag' | 'houseMove' | 'insideHouse';
  facing: -1 | 1;
  state: PetState;
  stateElapsed: number;
}

