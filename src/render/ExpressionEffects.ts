import type { PetModel, Point } from '../core/types';

export interface ExpressionEffect {
  text: string;
  // Fractions of the character's displayed size, relative to its feet anchor.
  offset: Point;
  startedAt: number;
  duration: number;
  loop?: boolean;
}

export interface ExpressionFrame {
  text: string;
  offset: Point;
  driftX: number;
  driftY: number;
  opacity: number;
  scale: number;
}

export class ExpressionEffects {
  private active: ExpressionEffect | null = null;

  public start(effect: ExpressionEffect): void {
    this.active = effect;
  }

  public clear(): void {
    this.active = null;
  }

  public sample(now: number): ExpressionFrame | null {
    const effect = this.active;
    if (!effect || now < effect.startedAt) return null;
    const elapsed = now - effect.startedAt;
    if (effect.duration <= 0 || (!effect.loop && elapsed >= effect.duration)) {
      this.clear();
      return null;
    }
    const progress = (effect.loop ? elapsed % effect.duration : elapsed) / effect.duration;
    return {
      text: effect.text,
      offset: effect.offset,
      driftX: Math.sin(progress * Math.PI * 2) * 2.5,
      driftY: -progress * 15,
      opacity: Math.min(1, progress * 5, (1 - progress) * 4),
      scale: 0.94 + progress * 0.08,
    };
  }
}

export function drawExpressionEffect(
  context: CanvasRenderingContext2D,
  pet: PetModel,
  spriteSize: number,
  frame: ExpressionFrame,
): void {
  context.save();
  context.translate(
    pet.position.x + pet.facing * frame.offset.x * spriteSize + frame.driftX,
    pet.position.y + frame.offset.y * spriteSize + frame.driftY,
  );
  context.scale(frame.scale, frame.scale);
  context.globalAlpha = frame.opacity * 0.9;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 ${Math.round(Math.max(16, Math.min(22, spriteSize * 0.11)))}px "Trebuchet MS", sans-serif`;
  context.lineWidth = 1.5;
  context.strokeStyle = 'rgb(255 251 246 / 80%)';
  context.fillStyle = '#82758d';
  context.strokeText(frame.text, 0, 0);
  context.fillText(frame.text, 0, 0);
  context.restore();
}
