import type { PetModel, Point, WorldSize } from '../core/types';
import { CAMERA_GREETING_CONFIG } from '../behavior/PetBehaviorMachine';

export interface CameraGreetingLayout {
  x: number;
  y: number;
  size: number;
}

export function getCameraGreetingLayout(world: WorldSize): CameraGreetingLayout {
  const size = Math.min(world.width * (world.width < 560 ? 1.04 : 0.68), world.height * 0.86, 620);
  return {
    x: (world.width - size) / 2,
    y: world.height - size * 0.96,
    size,
  };
}

export function isPointOnCameraGreeting(point: Point, world: WorldSize): boolean {
  const layout = getCameraGreetingLayout(world);
  return point.x >= layout.x && point.x <= layout.x + layout.size
    && point.y >= layout.y && point.y <= layout.y + layout.size;
}

export class CameraGreetingArt {
  private readonly image = new Image();

  public constructor(baseUrl = document.baseURI) {
    this.image.decoding = 'async';
    this.image.src = new URL('assets/pets/maltese/maltese_camera_greeting.png', baseUrl).href;
  }

  public getImage(): HTMLImageElement | null {
    return this.image.complete && this.image.naturalWidth > 0 ? this.image : null;
  }
}

export interface CameraHeartFrame {
  x: number;
  y: number;
  opacity: number;
  size: number;
}

export function getCameraGreetingHearts(
  pet: PetModel,
  spriteSize: number,
  heartCount: number,
  reducedMotion: boolean,
): CameraHeartFrame[] {
  if (pet.state !== 'cameraHappyBefore' || heartCount <= 0) return [];
  const variations = [
    { x: 0, y: 0, size: 1, rise: 13 },
    { x: 14, y: -9, size: 0.87, rise: 18 },
    { x: -10, y: -16, size: 1.08, rise: 15 },
  ];
  const frames: CameraHeartFrame[] = [];
  for (let index = 0; index < Math.min(3, heartCount); index += 1) {
    const progress = (pet.stateElapsed - CAMERA_GREETING_CONFIG.heartStartSeconds
      - index * CAMERA_GREETING_CONFIG.heartGapSeconds)
      / CAMERA_GREETING_CONFIG.heartDurationSeconds;
    if (progress < 0 || progress > 1) continue;
    const variation = variations[index]!;
    frames.push({
      x: pet.position.x + spriteSize * 0.3 + variation.x,
      y: pet.position.y - spriteSize * 0.82 + variation.y
        - (reducedMotion ? 0 : progress * variation.rise),
      opacity: reducedMotion ? 1 : Math.min(1, progress * 6, (1 - progress) * 3.5),
      size: Math.min(34, Math.max(26, spriteSize * 0.2)) * variation.size,
    });
  }
  return frames;
}

export function drawCameraGreetingHearts(
  ctx: CanvasRenderingContext2D,
  pet: PetModel,
  spriteSize: number,
  heartCount: number,
  reducedMotion: boolean,
): void {
  for (const heart of getCameraGreetingHearts(pet, spriteSize, heartCount, reducedMotion)) {
    ctx.save();
    ctx.globalAlpha = heart.opacity;
    ctx.translate(heart.x, heart.y);
    ctx.scale(heart.size / 32, heart.size / 32);
    ctx.fillStyle = '#d98fa2';
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-5, 7, -15, 0, -15, -7);
    ctx.bezierCurveTo(-15, -15, -4, -17, 0, -8);
    ctx.bezierCurveTo(4, -17, 15, -15, 15, -7);
    ctx.bezierCurveTo(15, 0, 5, 7, 0, 12);
    ctx.fill();
    ctx.restore();
  }
}

export function drawCameraGreeting(
  ctx: CanvasRenderingContext2D,
  world: WorldSize,
  pet: PetModel,
  image: HTMLImageElement,
  reducedMotion: boolean,
): void {
  if (pet.state === 'cameraCloseup') {
    const layout = getCameraGreetingLayout(world);
    const entry = reducedMotion ? 1 : Math.min(1, pet.stateElapsed / 0.18);
    const popScale = reducedMotion ? 1 : 0.96 + 0.04 * (1 - Math.pow(1 - entry, 3));
    const breathing = reducedMotion ? 1 : 1 + 0.008 * Math.sin(pet.stateElapsed * 4);
    const scale = popScale * breathing;
    ctx.save();
    ctx.translate(world.width / 2, layout.y + layout.size);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, -layout.size / 2, -layout.size, layout.size, layout.size);
    ctx.restore();
    return;
  }

  // The normal sprite is deliberately absent during the two short pop phases.
  const progress = Math.min(1, pet.stateElapsed / 0.16);
  const opacity = Math.sin(Math.PI * progress);
  const centerY = pet.position.y - 52;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = '#e4a878';
  ctx.fillStyle = '#fff7dd';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const start = 22 + progress * 7;
    const end = start + 9;
    ctx.beginPath();
    ctx.moveTo(pet.position.x + Math.cos(angle) * start, centerY + Math.sin(angle) * start);
    ctx.lineTo(pet.position.x + Math.cos(angle) * end, centerY + Math.sin(angle) * end);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(pet.position.x, centerY, 6 + progress * 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
