import type { Point } from '../core/types';
import { FrogDragGesture } from './FrogDragGesture';

export interface PointerHandlers {
  onTap(point: Point): void;
  onFrogTap(): void;
  isFrog(point: Point): boolean;
  onDragStart(point: Point): void;
  onDragMove(point: Point): void;
  onDrop(point: Point): void;
  onDragCancel(): void;
}

export class PointerInput {
  private readonly gesture = new FrogDragGesture();

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly handlers: PointerHandlers,
  ) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
    canvas.addEventListener('lostpointercapture', this.handlePointerCancel);
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
  }

  public destroy(): void {
    const active = this.gesture.getPointerId();
    if (active !== null) {
      if (this.gesture.cancel(active)) this.handlers.onDragCancel();
      this.clearCapture(active);
    }
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('lostpointercapture', this.handlePointerCancel);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.style.cursor = '';
    this.canvas.style.userSelect = '';
  }

  private point(clientX: number, clientY: number): Point | null {
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  }

  private readonly handleTouchStart = (event: TouchEvent): void => {
    if (this.gesture.getPointerId() !== null) {
      event.preventDefault();
      return;
    }
    for (const touch of Array.from(event.changedTouches)) {
      const point = this.point(touch.clientX, touch.clientY);
      if (point && this.handlers.isFrog(point)) {
        // Only the frog gesture suppresses page panning; other canvas touches remain ordinary taps.
        event.preventDefault();
        return;
      }
    }
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    if (this.gesture.getPointerId() !== null) return;
    const point = this.point(event.clientX, event.clientY);
    if (!point) return;
    if (!this.handlers.isFrog(point)) {
      this.handlers.onTap(point);
      return;
    }
    if (!this.gesture.begin(event.pointerId, point)) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const point = this.point(event.clientX, event.clientY);
    if (!point) return;
    const change = this.gesture.move(event.pointerId, point);
    if (change === 'none') return;
    event.preventDefault();
    if (change === 'start') {
      const start = this.gesture.getStart();
      if (start) this.handlers.onDragStart(start);
      this.canvas.style.cursor = 'grabbing';
      this.canvas.style.userSelect = 'none';
    }
    this.handlers.onDragMove(point);
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    const result = this.gesture.finish(event.pointerId);
    if (!result) return;
    event.preventDefault();
    if (result.kind === 'tap') this.handlers.onFrogTap();
    else this.handlers.onDrop(this.point(event.clientX, event.clientY) ?? result.start);
    this.clearCapture(event.pointerId);
  };

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    if (this.gesture.getPointerId() !== event.pointerId) return;
    const wasDragging = this.gesture.cancel(event.pointerId);
    if (wasDragging) this.handlers.onDragCancel();
    this.clearCapture(event.pointerId);
  };

  private clearCapture(pointerId: number): void {
    this.canvas.style.cursor = '';
    this.canvas.style.userSelect = '';
    if (this.canvas.hasPointerCapture(pointerId)) this.canvas.releasePointerCapture(pointerId);
  }
}

