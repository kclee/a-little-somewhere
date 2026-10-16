import { getFloorStartY, isMobilePortrait } from '../core/RoomGeometry';
import type { WorldSize } from '../core/types';
import type { RoomTimeZone } from './RoomScene';

export interface ClockTime {
  hour: number;
  minute: number;
}

const formatters: Record<RoomTimeZone, Intl.DateTimeFormat> = {
  'America/Chicago': new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }),
  'Asia/Taipei': new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }),
};

export function getZonedClockTime(at: Date, timeZone: RoomTimeZone): ClockTime {
  const parts = formatters[timeZone].formatToParts(at);
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
  };
}

export function getClockHandAngles({ hour, minute }: ClockTime): { hour: number; minute: number } {
  return {
    hour: ((hour % 12) + minute / 60) * Math.PI / 6,
    minute: minute * Math.PI / 30,
  };
}

export class RoomClockTime {
  private minuteKey = Number.NaN;
  private timeZone: RoomTimeZone | null = null;
  private current: ClockTime = { hour: 0, minute: 0 };

  public read(timeZone: RoomTimeZone, nowMs = Date.now()): ClockTime {
    const minuteKey = Math.floor(nowMs / 60_000);
    if (minuteKey !== this.minuteKey || timeZone !== this.timeZone) {
      this.current = getZonedClockTime(new Date(nowMs), timeZone);
      this.minuteKey = minuteKey;
      this.timeZone = timeZone;
    }
    return this.current;
  }
}

export function getWallClockLayout(world: WorldSize) {
  const mobile = isMobilePortrait(world);
  return {
    x: world.width * (mobile ? 0.73 : 0.69),
    y: getFloorStartY(world) * (mobile ? 0.72 : 0.52),
    radius: mobile ? 23 : 29,
  };
}

export function getFeedingCornerLayout(world: WorldSize) {
  const mobile = isMobilePortrait(world);
  const scale = mobile ? 1 : 1.2;
  const foodX = Math.min(world.width * 0.17, 212);
  return {
    foodX,
    waterX: foodX + 54 * scale,
    baseline: getFloorStartY(world) + 62 * scale,
    scale,
  };
}

export function drawWallClock(ctx: CanvasRenderingContext2D, world: WorldSize, time: ClockTime): void {
  const { x, y, radius } = getWallClockLayout(world);
  const hands = getClockHandAngles(time);
  ctx.save();
  ctx.shadowColor = 'rgb(96 68 52 / 17%)';
  ctx.shadowBlur = 9;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#a57c67';
  ctx.beginPath();
  ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = '#d9b9a0';
  ctx.beginPath();
  ctx.arc(x, y, radius + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6e7';
  ctx.beginPath();
  ctx.arc(x, y, radius - 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#795b4d';
  ctx.font = `600 ${Math.round(radius * 0.48)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [label, angle] of [['12', 0], ['3', Math.PI / 2], ['6', Math.PI], ['9', Math.PI * 1.5]] as const) {
    ctx.fillText(label, x + Math.sin(angle) * radius * 0.68, y - Math.cos(angle) * radius * 0.68);
  }

  drawHand(ctx, x, y, hands.hour, radius * 0.4, 3.2);
  drawHand(ctx, x, y, hands.minute, radius * 0.58, 2.1);
  ctx.fillStyle = '#785749';
  ctx.beginPath();
  ctx.arc(x, y, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHand(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  angle: number, length: number, width: number,
): void {
  ctx.strokeStyle = '#60483e';
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - Math.sin(angle) * 3, y + Math.cos(angle) * 3);
  ctx.lineTo(x + Math.sin(angle) * length, y - Math.cos(angle) * length);
  ctx.stroke();
}

export function drawFeedingCorner(ctx: CanvasRenderingContext2D, world: WorldSize): void {
  const { foodX, waterX, baseline, scale } = getFeedingCornerLayout(world);
  drawBowl(ctx, foodX, baseline, scale, 'food');
  drawBowl(ctx, waterX, baseline, scale, 'water');
}

function drawBowl(
  ctx: CanvasRenderingContext2D, x: number, baseline: number,
  scale: number, kind: 'food' | 'water',
): void {
  ctx.save();
  ctx.translate(x, baseline);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgb(78 61 47 / 13%)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 25, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const ceramic = ctx.createLinearGradient(0, -12, 0, 1);
  ceramic.addColorStop(0, kind === 'food' ? '#fff7e9' : '#d8eced');
  ceramic.addColorStop(1, kind === 'food' ? '#d9cab9' : '#a8cdd2');
  ctx.fillStyle = ceramic;
  ctx.beginPath();
  ctx.moveTo(-24, -12);
  ctx.quadraticCurveTo(-23, -2, -18, 0);
  ctx.quadraticCurveTo(0, 6, 18, 0);
  ctx.quadraticCurveTo(23, -2, 24, -12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = kind === 'food' ? '#f8ead6' : '#a9dae4';
  ctx.beginPath();
  ctx.ellipse(0, -12, 21, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (kind === 'food') {
    for (const [kx, ky, angle] of [
      [-11, -13, -0.2], [-4, -15, 0.3], [4, -12, -0.5], [12, -14, 0.25], [-1, -10, 0.6],
    ] as const) {
      ctx.fillStyle = ky < -13 ? '#a97853' : '#906649';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 3.8, 2.5, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = 'rgb(255 255 255 / 85%)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(-3, -13, 12, 3.3, -0.1, Math.PI * 1.12, Math.PI * 1.76);
    ctx.stroke();
  }

  ctx.strokeStyle = kind === 'food' ? '#fffaf1' : '#e8f6f5';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(0, -12, 23, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
