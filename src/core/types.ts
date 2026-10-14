export interface Point {
  x: number;
  y: number;
}

export interface WorldSize {
  width: number;
  height: number;
}

export type PetState = 'idle' | 'walk' | 'sit' | 'attention';

export interface PetModel {
  position: Point;
  velocityX: number;
  facing: -1 | 1;
  state: PetState;
  stateElapsed: number;
}

