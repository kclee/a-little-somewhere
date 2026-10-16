import type { PetModel, Point, WorldSize } from '../core/types';
import type { HintFrame, HintTarget } from '../interaction/InteractionHintController';
import { getScenePropLayout, type FrogVisual } from './SceneProps';

export function getHintHandPoint(
  target: HintTarget,
  world: WorldSize,
  pet: PetModel,
  frog: FrogVisual,
): Point {
  const layout = getScenePropLayout(world);
  if (target === 'frog') return {
    x: frog.x + layout.frog.width * 0.3,
    y: frog.baseline - layout.frog.height * 0.05,
  };
  if (target === 'donut') return {
    x: layout.cushion.x + layout.cushion.width * 0.35,
    y: layout.cushion.y - layout.cushion.height * 0.17,
  };
  if (target === 'house') return {
    x: layout.house.x - layout.house.width * 0.23,
    y: layout.house.baseline - layout.house.height * 0.08,
  };
  const spriteSize = Math.max(150, Math.min(210, Math.min(world.width * 0.38, world.height * 0.28)));
  return {
    x: pet.position.x + spriteSize * 0.24,
    y: pet.position.y - spriteSize * 0.7,
  };
}

export function hintFade(progress: number): number {
  const entrance = smoothstep(Math.min(1, progress / 0.16));
  const exit = smoothstep(Math.min(1, (1 - progress) / 0.2));
  return Math.min(entrance, exit);
}

export function hintGestureOffset(frame: HintFrame): Point {
  if (frame.gesture === 'tap') {
    return { x: 0, y: Math.max(0, Math.sin(frame.progress * Math.PI * 4)) * 6 };
  }
  const progress = frame.progress;
  if (progress < 0.22) return { x: 17 * (1 - smoothstep(progress / 0.22)), y: 2 };
  if (progress < 0.72) return { x: -18 * smoothstep((progress - 0.22) / 0.5), y: 2 };
  return { x: -18 * (1 - smoothstep((progress - 0.72) / 0.28)), y: 2 };
}

export function drawInteractionHands(
  context: CanvasRenderingContext2D,
  world: WorldSize,
  pet: PetModel,
  frog: FrogVisual,
  frames: readonly HintFrame[],
): void {
  const size = Math.max(0.95, Math.min(1.13, world.width / 390));
  for (const frame of frames) {
    const alpha = hintFade(frame.progress);
    if (alpha <= 0) continue;
    const point = getHintHandPoint(frame.target, world, pet, frog);
    const motion = hintGestureOffset(frame);
    context.save();
    context.globalAlpha = alpha * 0.9;
    context.translate(point.x, point.y);
    if (frame.gesture === 'drag') drawDragCue(context, frame.progress);
    else drawTapRipple(context, motion.y);
    context.translate(motion.x, motion.y + 22 * size);
    context.scale(size, size);
    drawHand(context);
    context.restore();
  }
}

function drawHand(context: CanvasRenderingContext2D): void {
  context.shadowColor = 'rgb(90 60 49 / 25%)';
  context.shadowBlur = 4;
  context.shadowOffsetY = 2;
  context.fillStyle = '#fff3df';
  context.strokeStyle = '#8f6b5b';
  context.lineWidth = 1.5;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(-7, 18);
  context.lineTo(-10, 8);
  context.quadraticCurveTo(-11, 3, -8, 2);
  context.quadraticCurveTo(-5, 1, -3, 5);
  context.lineTo(-3, -16);
  context.quadraticCurveTo(-3, -21, 1, -21);
  context.quadraticCurveTo(5, -21, 5, -16);
  context.lineTo(5, -1);
  context.quadraticCurveTo(8, -6, 11, -5);
  context.quadraticCurveTo(14, -4, 13, 0);
  context.quadraticCurveTo(17, -3, 19, 0);
  context.quadraticCurveTo(21, 2, 19, 7);
  context.lineTo(15, 18);
  context.closePath();
  context.fill();
  context.stroke();
  context.shadowColor = 'transparent';
  context.fillStyle = '#e9b99f';
  context.beginPath();
  context.roundRect(-7, 16, 22, 7, 3);
  context.fill();
}

function drawTapRipple(context: CanvasRenderingContext2D, tap: number): void {
  if (tap <= 0.3) return;
  context.strokeStyle = 'rgb(255 249 224 / 80%)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, 5 + tap * 0.7, 0, Math.PI * 2);
  context.stroke();
}

function drawDragCue(context: CanvasRenderingContext2D, progress: number): void {
  const alpha = smoothstep(Math.min(1, progress / 0.25))
    * smoothstep(Math.min(1, (1 - progress) / 0.28));
  context.save();
  context.globalAlpha *= alpha * 0.6;
  context.strokeStyle = '#fff8df';
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(12, -13);
  context.lineTo(-12, -13);
  context.moveTo(-7, -17);
  context.lineTo(-12, -13);
  context.lineTo(-7, -9);
  context.stroke();
  context.restore();
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}
