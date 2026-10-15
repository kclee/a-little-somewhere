import type { Point } from '../core/types';

export const FROG_DRAG_THRESHOLD = 8;

export class FrogDragGesture {
  private pointerId: number | null = null;
  private startPoint: Point | null = null;
  private dragging = false;

  public begin(pointerId: number, point: Point): boolean {
    if (this.pointerId !== null) return false;
    this.pointerId = pointerId;
    this.startPoint = { ...point };
    this.dragging = false;
    return true;
  }

  public move(pointerId: number, point: Point): 'none' | 'start' | 'move' {
    if (pointerId !== this.pointerId || !this.startPoint) return 'none';
    if (this.dragging) return 'move';
    if (Math.hypot(point.x - this.startPoint.x, point.y - this.startPoint.y) < FROG_DRAG_THRESHOLD) {
      return 'none';
    }
    this.dragging = true;
    return 'start';
  }

  public finish(pointerId: number): { kind: 'tap' | 'drop'; start: Point } | null {
    if (pointerId !== this.pointerId || !this.startPoint) return null;
    const result = { kind: this.dragging ? 'drop' as const : 'tap' as const, start: this.startPoint };
    this.reset();
    return result;
  }

  public cancel(pointerId: number): boolean {
    if (pointerId !== this.pointerId) return false;
    const wasDragging = this.dragging;
    this.reset();
    return wasDragging;
  }

  public getStart(): Point | null {
    return this.startPoint;
  }

  public getPointerId(): number | null {
    return this.pointerId;
  }

  private reset(): void {
    this.pointerId = null;
    this.startPoint = null;
    this.dragging = false;
  }
}
