import type { WorldSize } from '../core/types';
import { DONUT_PET_BED } from './ScenePropAssets';

export interface ScenePropLayout {
  cushion: { x: number; y: number; width: number; height: number };
  house: { x: number; baseline: number; width: number; height: number };
  frog: { x: number; baseline: number; size: number };
}

export function getScenePropLayout(world: WorldSize): ScenePropLayout {
  const compact = world.width < 560;
  const petGround = world.height * 0.78;
  const cushionAspect = DONUT_PET_BED.crop.height / DONUT_PET_BED.crop.width;

  if (compact) {
    const houseWidth = clamp(world.width * 0.34, 106, 132);
    const cushionWidth = clamp(world.width * 0.5, 158, 194);
    const cushionHeight = cushionWidth * cushionAspect;
    return {
      cushion: {
        x: world.width * 0.35,
        y: Math.min(petGround + 42, world.height - cushionHeight / 2 - 12),
        width: cushionWidth,
        height: cushionHeight,
      },
      house: {
        x: world.width - houseWidth * 0.54 - 10,
        baseline: petGround + 8,
        width: houseWidth,
        height: houseWidth * 0.94,
      },
      frog: {
        x: world.width - houseWidth * 0.86 - 10,
        baseline: petGround + 13,
        size: clamp(world.width * 0.075, 24, 29),
      },
    };
  }

  const houseWidth = clamp(world.width * 0.16, 172, 220);
  const cushionWidth = clamp(world.width * 0.28, 280, 360);
  const cushionHeight = cushionWidth * cushionAspect;
  return {
    cushion: {
      x: world.width * 0.51,
      y: Math.min(petGround + 52, world.height - cushionHeight / 2 - 12),
      width: cushionWidth,
      height: cushionHeight,
    },
    house: {
      x: world.width - houseWidth * 0.64 - 30,
      baseline: petGround + 18,
      width: houseWidth,
      height: houseWidth * 0.82,
    },
    frog: {
      x: world.width - houseWidth * 0.98 - 30,
      baseline: petGround + 22,
      size: clamp(world.width * 0.025, 30, 38),
    },
  };
}

export function drawSceneProps(
  context: CanvasRenderingContext2D,
  world: WorldSize,
  donutPetBed: HTMLImageElement | null,
): void {
  const layout = getScenePropLayout(world);
  drawPetHouse(context, layout.house);
  if (donutPetBed) {
    drawDonutPetBed(context, layout.cushion, donutPetBed);
  } else {
    drawDonutCushionFallback(context, layout.cushion);
  }
  drawFrogToy(context, layout.frog);
}

function drawDonutPetBed(
  context: CanvasRenderingContext2D,
  cushion: ScenePropLayout['cushion'],
  image: HTMLImageElement,
): void {
  const { x, y, width, height } = cushion;
  const crop = DONUT_PET_BED.crop;

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    x - width / 2,
    y - height / 2,
    width,
    height,
  );
  context.restore();
}

function drawDonutCushionFallback(
  context: CanvasRenderingContext2D,
  cushion: ScenePropLayout['cushion'],
): void {
  const { x, y, width, height } = cushion;

  context.save();
  context.translate(x, y + height * 0.2);
  context.scale(1, 0.28);
  context.fillStyle = 'rgb(73 47 39 / 18%)';
  context.beginPath();
  context.arc(0, 0, width * 0.5, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.translate(x, y);
  const cushionGradient = context.createLinearGradient(0, -height / 2, 0, height / 2);
  cushionGradient.addColorStop(0, '#f5b9c1');
  cushionGradient.addColorStop(0.58, '#dc8797');
  cushionGradient.addColorStop(1, '#bd6d7d');
  context.fillStyle = cushionGradient;
  context.strokeStyle = '#a95e70';
  context.lineWidth = Math.max(2, width * 0.012);
  context.beginPath();
  context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = '#f8d2d5';
  context.strokeStyle = 'rgb(151 78 94 / 48%)';
  context.lineWidth = Math.max(1.5, width * 0.008);
  context.beginPath();
  context.ellipse(0, -height * 0.04, width * 0.27, height * 0.27, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = 'rgb(255 239 235 / 60%)';
  context.lineWidth = Math.max(2, width * 0.01);
  context.beginPath();
  context.ellipse(-width * 0.04, -height * 0.08, width * 0.4, height * 0.34, 0, Math.PI * 1.08, Math.PI * 1.84);
  context.stroke();

  context.strokeStyle = 'rgb(139 67 83 / 35%)';
  context.lineWidth = 1;
  for (const angle of [-2.65, -1.9, -1.2, -0.5, 0.25]) {
    const outerX = Math.cos(angle) * width * 0.44;
    const outerY = Math.sin(angle) * height * 0.42;
    const innerX = Math.cos(angle) * width * 0.31;
    const innerY = Math.sin(angle) * height * 0.28;
    context.beginPath();
    context.moveTo(innerX, innerY);
    context.lineTo(outerX, outerY);
    context.stroke();
  }
  context.restore();
}

function drawPetHouse(context: CanvasRenderingContext2D, house: ScenePropLayout['house']): void {
  const { x, baseline, width, height } = house;
  const left = x - width / 2;
  const top = baseline - height;

  context.save();
  context.translate(x, baseline + 3);
  context.scale(1, 0.25);
  context.fillStyle = 'rgb(73 47 39 / 19%)';
  context.beginPath();
  context.ellipse(0, 0, width * 0.52, width * 0.18, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  const tent = new Path2D();
  tent.moveTo(left, baseline);
  tent.lineTo(x, top);
  tent.quadraticCurveTo(x + width * 0.03, top - 3, x + width * 0.07, top + height * 0.08);
  tent.lineTo(x + width / 2, baseline);
  tent.closePath();

  context.save();
  context.clip(tent);
  context.fillStyle = '#f9f2e7';
  context.fillRect(left, top - 4, width, height + 8);

  const stripeWidth = width / 8;
  context.fillStyle = '#73aeca';
  for (let index = -1; index < 9; index += 2) {
    context.fillRect(left + index * stripeWidth, top - 5, stripeWidth, height + 10);
  }

  const light = context.createLinearGradient(left, top, left + width, baseline);
  light.addColorStop(0, 'rgb(255 255 255 / 26%)');
  light.addColorStop(0.55, 'rgb(255 255 255 / 0%)');
  light.addColorStop(1, 'rgb(50 83 103 / 16%)');
  context.fillStyle = light;
  context.fillRect(left, top, width, height);
  context.restore();

  context.strokeStyle = '#477b96';
  context.lineWidth = Math.max(3, width * 0.026);
  context.lineJoin = 'round';
  context.stroke(tent);

  const openingWidth = width * 0.39;
  const openingHeight = height * 0.48;
  const openingTop = baseline - openingHeight;
  const opening = new Path2D();
  opening.moveTo(x - openingWidth / 2, baseline);
  opening.lineTo(x - openingWidth / 2, openingTop + openingWidth / 2);
  opening.arc(x, openingTop + openingWidth / 2, openingWidth / 2, Math.PI, 0);
  opening.lineTo(x + openingWidth / 2, baseline);
  opening.closePath();
  const interior = context.createLinearGradient(0, openingTop, 0, baseline);
  interior.addColorStop(0, '#365b69');
  interior.addColorStop(1, '#233f49');
  context.fillStyle = interior;
  context.fill(opening);
  context.strokeStyle = '#f7eee4';
  context.lineWidth = Math.max(2, width * 0.018);
  context.stroke(opening);

  context.fillStyle = '#d88f9d';
  context.beginPath();
  context.ellipse(x, baseline - height * 0.035, openingWidth * 0.42, height * 0.055, 0, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgb(255 255 255 / 65%)';
  context.lineWidth = Math.max(1.5, width * 0.012);
  context.beginPath();
  context.moveTo(x, top + height * 0.04);
  context.lineTo(x, openingTop - height * 0.03);
  context.stroke();
}

function drawFrogToy(context: CanvasRenderingContext2D, frog: ScenePropLayout['frog']): void {
  const { x, baseline, size } = frog;

  context.save();
  context.translate(x, baseline);
  context.scale(size / 32, size / 32);
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.save();
  context.scale(1, 0.3);
  context.fillStyle = 'rgb(73 47 39 / 16%)';
  context.beginPath();
  context.ellipse(0, 3, 15, 7, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.strokeStyle = '#557b57';
  context.lineWidth = 3.5;
  context.beginPath();
  context.moveTo(-7, -6);
  context.lineTo(-13, 0);
  context.moveTo(7, -6);
  context.lineTo(13, 0);
  context.moveTo(-7, -1);
  context.lineTo(-12, 4);
  context.moveTo(7, -1);
  context.lineTo(12, 4);
  context.stroke();

  context.fillStyle = '#77a96f';
  context.strokeStyle = '#416b4c';
  context.lineWidth = 1.5;
  context.beginPath();
  context.ellipse(0, -7, 11, 10, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = '#8fbe82';
  for (const eyeX of [-6, 6]) {
    context.beginPath();
    context.arc(eyeX, -15, 4.5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  context.fillStyle = '#2f4736';
  context.beginPath();
  context.arc(-6, -15, 1.5, 0, Math.PI * 2);
  context.arc(6, -15, 1.5, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = '#3e6247';
  context.lineWidth = 1.2;
  context.beginPath();
  context.arc(0, -7, 5, 0.15, Math.PI - 0.15);
  context.stroke();

  context.fillStyle = '#d99aa6';
  context.beginPath();
  context.ellipse(0, -3.8, 2.2, 1.3, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
