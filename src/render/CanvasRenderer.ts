import type { PetModel, WorldSize } from '../core/types';
import {
  MALTESE_SPRITES,
  MalteseSpriteSet,
  selectMaltesePose,
  shouldMirrorMaltesePose,
} from './MalteseSpriteSet';

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly malteseSprites = new MalteseSpriteSet();
  private width = 1;
  private height = 1;

  public constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not supported in this browser.');
    this.context = context;
  }

  public resize(width: number, height: number): WorldSize {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * scale);
    this.canvas.height = Math.round(this.height * scale);
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    return { width: this.width, height: this.height };
  }

  public render(pet: PetModel, elapsed: number): void {
    this.drawRoom(elapsed);
    this.drawPet(pet, elapsed);
  }

  private drawRoom(elapsed: number): void {
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    const floorY = h * 0.58;

    const wall = ctx.createLinearGradient(0, 0, 0, floorY);
    wall.addColorStop(0, '#f9eadf');
    wall.addColorStop(1, '#efd9cc');
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, floorY);

    const floor = ctx.createLinearGradient(0, floorY, 0, h);
    floor.addColorStop(0, '#c99577');
    floor.addColorStop(1, '#a86f55');
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, w, h - floorY);

    ctx.strokeStyle = 'rgb(105 69 54 / 17%)';
    ctx.lineWidth = 1;
    const boardHeight = Math.max(34, h * 0.075);
    for (let y = floorY + boardHeight; y < h; y += boardHeight) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    this.drawWindow(w * 0.08, h * 0.1, Math.min(w * 0.38, 210), Math.min(h * 0.28, 170), elapsed);
    this.drawShelf(w, h);
    this.drawRug(w, h);

    ctx.fillStyle = '#b9856c';
    ctx.fillRect(0, floorY - 8, w, 10);
    ctx.fillStyle = 'rgb(255 248 237 / 45%)';
    ctx.fillRect(0, floorY - 8, w, 2);
  }

  private drawWindow(x: number, y: number, width: number, height: number, elapsed: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.shadowColor = 'rgb(146 102 75 / 22%)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#fff7e9';
    ctx.fillRect(x - 7, y - 7, width + 14, height + 14);
    ctx.restore();

    const sky = ctx.createLinearGradient(0, y, 0, y + height);
    sky.addColorStop(0, '#abcbd0');
    sky.addColorStop(1, '#e7d6b5');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = 'rgb(255 250 215 / 85%)';
    ctx.beginPath();
    ctx.arc(x + width * 0.74, y + height * 0.25, 12 + Math.sin(elapsed * 0.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#88a58d';
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.72);
    ctx.quadraticCurveTo(x + width * 0.24, y + height * 0.45, x + width * 0.53, y + height * 0.72);
    ctx.quadraticCurveTo(x + width * 0.76, y + height * 0.52, x + width, y + height * 0.67);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#fff7e9';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y + height);
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);
    ctx.stroke();
  }

  private drawShelf(w: number, h: number): void {
    const ctx = this.context;
    const shelfWidth = Math.min(180, w * 0.34);
    const x = w - shelfWidth - w * 0.07;
    const y = h * 0.19;

    ctx.fillStyle = '#9b6854';
    this.roundRect(x, y, shelfWidth, 9, 4);
    ctx.fill();

    ctx.fillStyle = '#c98e78';
    ctx.fillRect(x + shelfWidth * 0.12, y - 35, 16, 35);
    ctx.fillStyle = '#789497';
    ctx.fillRect(x + shelfWidth * 0.25, y - 46, 18, 46);
    ctx.fillStyle = '#d8ab71';
    ctx.fillRect(x + shelfWidth * 0.4, y - 29, 15, 29);

    ctx.fillStyle = '#ab7961';
    this.roundRect(x + shelfWidth * 0.73, y - 23, 31, 24, 5);
    ctx.fill();
    ctx.strokeStyle = '#60836c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + shelfWidth * 0.82, y - 23);
    ctx.quadraticCurveTo(x + shelfWidth * 0.68, y - 49, x + shelfWidth * 0.72, y - 61);
    ctx.moveTo(x + shelfWidth * 0.82, y - 23);
    ctx.quadraticCurveTo(x + shelfWidth * 0.92, y - 51, x + shelfWidth * 0.89, y - 63);
    ctx.stroke();
  }

  private drawRug(w: number, h: number): void {
    const ctx = this.context;
    ctx.save();
    ctx.translate(w * 0.52, h * 0.82);
    ctx.scale(1, 0.34);
    ctx.fillStyle = 'rgb(244 210 190 / 80%)';
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(w * 0.34, 220), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgb(150 95 78 / 26%)';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();
  }

  private drawPet(pet: PetModel, elapsed: number): void {
    if (!this.drawSpritePet(pet, elapsed)) {
      this.drawPlaceholderPet(pet, elapsed);
    }
  }

  private drawSpritePet(pet: PetModel, elapsed: number): boolean {
    const pose = selectMaltesePose(pet);
    const image = this.malteseSprites.get(pose);
    if (!image) return false;

    const ctx = this.context;
    const definition = MALTESE_SPRITES[pose];
    const walking = pet.state === 'walk';
    const sitting = pet.state === 'sit';
    const attentive = pet.state === 'attention';
    const stepPhase = Math.sin(pet.stateElapsed * 9);
    const bob = walking ? Math.abs(stepPhase) * -2.4 : Math.sin(elapsed * 2.1) * 0.65;
    const spriteSize = Math.max(150, Math.min(210, Math.min(this.width * 0.38, this.height * 0.28)));
    const sourceScale = spriteSize / definition.canvasSize;
    const mirrorX = shouldMirrorMaltesePose(pose, pet.facing) ? -1 : 1;
    const scaleY = sitting ? 0.9 : walking ? 1 - Math.abs(stepPhase) * 0.012 : 1;
    const rotation = walking ? stepPhase * 0.012 : attentive ? Math.sin(elapsed * 1.7) * 0.006 : 0;

    ctx.save();
    ctx.translate(pet.position.x, pet.position.y + 2);
    ctx.scale(1, 0.26);
    ctx.fillStyle = 'rgb(73 47 39 / 17%)';
    ctx.beginPath();
    ctx.ellipse(0, 0, spriteSize * (sitting ? 0.25 : 0.3), spriteSize * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(pet.position.x, pet.position.y + bob);
    ctx.rotate(rotation);
    ctx.scale(mirrorX, scaleY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const fullLeft = -spriteSize * definition.anchor[0];
    const fullTop = -spriteSize * definition.anchor[1];
    const crop = definition.crop;
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      fullLeft + crop.x * sourceScale,
      fullTop + crop.y * sourceScale,
      crop.width * sourceScale,
      crop.height * sourceScale,
    );
    ctx.restore();
    return true;
  }

  private drawPlaceholderPet(pet: PetModel, elapsed: number): void {
    const ctx = this.context;
    const walking = pet.state === 'walk';
    const sitting = pet.state === 'sit';
    const attentive = pet.state === 'attention';
    const bob = walking ? Math.sin(pet.stateElapsed * 11) * 2.5 : Math.sin(elapsed * 2.2) * 0.8;
    const scale = Math.max(0.78, Math.min(1.18, Math.min(this.width / 430, this.height / 600)));

    ctx.save();
    ctx.translate(pet.position.x, pet.position.y + bob);
    ctx.scale(pet.facing * scale, scale);

    ctx.save();
    ctx.scale(1, 0.28);
    ctx.fillStyle = 'rgb(73 47 39 / 18%)';
    ctx.beginPath();
    ctx.arc(0, 34, sitting ? 43 : 49, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#e7ddd4';
    ctx.lineCap = 'round';
    ctx.lineWidth = 13;
    if (sitting) {
      ctx.beginPath();
      ctx.moveTo(-23, 9);
      ctx.lineTo(-27, 31);
      ctx.moveTo(24, 9);
      ctx.lineTo(29, 31);
      ctx.stroke();
    } else {
      const step = walking ? Math.sin(pet.stateElapsed * 11) * 8 : 0;
      ctx.beginPath();
      ctx.moveTo(-24, 10);
      ctx.lineTo(-24 + step, 31);
      ctx.moveTo(21, 10);
      ctx.lineTo(21 - step, 31);
      ctx.stroke();
    }

    ctx.fillStyle = '#f7f3ec';
    ctx.beginPath();
    ctx.ellipse(-3, sitting ? 3 : 5, sitting ? 34 : 45, sitting ? 39 : 31, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#eee7df';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(-32, -2);
    ctx.quadraticCurveTo(-55, -18, -47, -36);
    ctx.stroke();

    ctx.fillStyle = '#f9f6f0';
    ctx.beginPath();
    ctx.arc(18, -27, 31, 0, Math.PI * 2);
    ctx.arc(7, -31, 25, 0, Math.PI * 2);
    ctx.arc(27, -35, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eadfd6';
    ctx.beginPath();
    ctx.ellipse(3, -35, 12, 23, -0.28, 0, Math.PI * 2);
    ctx.ellipse(38, -37, 12, 23, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const blink = Math.sin(elapsed * 0.75) > 0.985 && !attentive;
    ctx.strokeStyle = '#4e413d';
    ctx.fillStyle = '#4e413d';
    ctx.lineWidth = 2.5;
    if (blink) {
      ctx.beginPath();
      ctx.moveTo(14, -31);
      ctx.lineTo(20, -31);
      ctx.moveTo(34, -31);
      ctx.lineTo(40, -31);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(18, -31, attentive ? 3.6 : 3, 0, Math.PI * 2);
      ctx.arc(37, -31, attentive ? 3.6 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(30, -21, 4.5, 0, Math.PI * 2);
    ctx.fill();

    if (attentive) {
      ctx.fillStyle = '#d99890';
      ctx.beginPath();
      ctx.ellipse(30, -13, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.context.beginPath();
    this.context.roundRect(x, y, width, height, radius);
  }
}

