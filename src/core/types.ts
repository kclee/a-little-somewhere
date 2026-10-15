export interface Point {
  x: number;
  y: number;
}

export interface WorldSize {
  width: number;
  height: number;
}

export type PetState = 'idle' | 'walk' | 'jog' | 'sit' | 'attention' | 'wallWag';

export interface PetModel {
  position: Point;
  velocityX: number;
  velocityY: number;
  intent: 'autonomous' | 'moveTo';
  facing: -1 | 1;
  state: PetState;
  stateElapsed: number;
}

