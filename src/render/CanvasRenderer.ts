import type { PetModel, Point, WorldSize } from '../core/types';
import type { HintFrame } from '../interaction/InteractionHintController';
import { getFloorStartY } from '../core/RoomGeometry';
import { DEFAULT_WALK_FPS, WALK_SHEET } from '../walk-cycle/WalkCycleModel';
import {
  MALTESE_SPRITES,
  MalteseSpriteSet,
  isFrontMaltesePose,
  selectMaltesePose,
  shouldMirrorMaltesePose,
  type MaltesePose,
} from './MalteseSpriteSet';
import {
  getWalkCycleScale,
  MalteseWalkCycle,
  shouldMirrorWalkCycle,
} from './MalteseWalkCycle';
import { getPetShadowLayout } from './PetShadow';
import { drawInteractionHands } from './InteractionHintVisual';
import { drawExpressionEffect, type ExpressionFrame } from './ExpressionEffects';
import { RearTailWagSpriteSet, REAR_TAIL_WAG_CYCLE_SECONDS, REAR_TAIL_WAG_START_SECONDS } from './RearTailWag';
import { ROOM_SCENES, type RoomSceneConfig } from './RoomScene';
import { RoomClockTime, drawFeedingCorner, drawWallClock } from './RoomScenery';
import { ScenePropAssets, type ScenePropImages } from './ScenePropAssets';
import { drawFrogProp, drawSceneProps, getOccupiedHouseImage, getScenePropLayout, isFrogForeground, type FrogVisual, type HouseVisual } from './SceneProps';

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly malteseSprites = new MalteseSpriteSet();
  private readonly malteseWalkCycle = new MalteseWalkCycle();
  private readonly rearTailWagSprites = new RearTailWagSpriteSet();
  private readonly scenePropAssets = new ScenePropAssets();
  private readonly clockTime = new RoomClockTime();
  private width = 1;
  private height = 1;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private scene: RoomSceneConfig = ROOM_SCENES.creamTile,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not supported in this browser.');
    this.context = context;
  }

  public setScene(scene: RoomSceneConfig): void {
    this.scene = scene;
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

  public render(
    pet: PetModel, elapsed: number, expression?: ExpressionFrame | null,
    frog?: FrogVisual, house?: HouseVisual, expressionAnchor?: Point,
    sleepingAtDonut = false,
    hints: readonly HintFrame[] = [],
    holdPetMotion = false,
  ): void {
    const propImages = this.scenePropAssets.getImages();
    this.drawRoom(elapsed, propImages, frog, house);
    if (!house?.hidePet || (house.occupied && !getOccupiedHouseImage(propImages, house))) {
      this.drawPet(pet, holdPetMotion ? 0 : elapsed, sleepingAtDonut);
    }
    if (isFrogForeground(frog)) {
      drawFrogProp(this.context, { width: this.width, height: this.height }, propImages, frog);
    }
    if (expression) {
      const spriteSize = Math.max(150, Math.min(210, Math.min(this.width * 0.38, this.height * 0.28)));
      drawExpressionEffect(
        this.context,
        expressionAnchor ? { ...pet, position: expressionAnchor, facing: 1 } : pet,
        spriteSize,
        expression,
      );
    }
    if (hints.length) {
      const world = { width: this.width, height: this.height };
      drawInteractionHands(this.context, world, pet, frog ?? getScenePropLayout(world).frog, hints);
    }
  }

  private drawRoom(elapsed: number, propImages: ScenePropImages, frog?: FrogVisual, house?: HouseVisual): void {
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    const floorY = getFloorStartY({ width: w, height: h });

    const wall = ctx.createLinearGradient(0, 0, 0, floorY);
    wall.addColorStop(0, this.scene.wallTopColor);
    wall.addColorStop(1, this.scene.wallBottomColor);
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, floorY);

    this.drawFloor(floorY);

    this.drawWindow(w * 0.08, h * 0.1, Math.min(w * 0.38, 210), Math.min(h * 0.28, 170), elapsed);
    this.drawWallDecor(w, h);
    drawWallClock(ctx, { width: w, height: h }, this.clockTime.read(this.scene.clockTimeZone));
    drawSceneProps(ctx, { width: w, height: h }, propImages, frog, !isFrogForeground(frog), house);
    drawFeedingCorner(ctx, { width: w, height: h });

    ctx.fillStyle = this.scene.baseboardColor;
    ctx.fillRect(0, floorY - 8, w, 10);
    ctx.fillStyle = 'rgb(255 248 237 / 45%)';
    ctx.fillRect(0, floorY - 8, w, 2);
  }

  private drawFloor(floorY: number): void {
    const ctx = this.context;
    const floorHeight = this.height - floorY;
    const floor = ctx.createLinearGradient(0, floorY, 0, this.height);
    floor.addColorStop(0, this.scene.floor.topColor);
    floor.addColorStop(1, this.scene.floor.bottomColor);
    ctx.fillStyle = floor;
    ctx.fillRect(0, floorY, this.width, floorHeight);

    if (this.scene.floor.kind === 'wood') {
      ctx.strokeStyle = this.scene.floor.seamColor;
      ctx.lineWidth = 1;
      const boardHeight = Math.max(34, this.height * 0.075);
      for (let y = floorY + boardHeight; y < this.height; y += boardHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }
      return;
    }

    const vanishingX = this.width * 0.5;
    const bottomTileWidth = Math.max(72, Math.min(122, this.width * 0.14));
    // The implied vanishing point sits above the visible floor, so the back
    // row remains readable as tile instead of collapsing into a line fan.
    const perspectiveInset = 0.45;
    ctx.strokeStyle = this.scene.floor.groutColor;
    ctx.lineWidth = 1;

    const halfLineCount = Math.ceil(this.width / bottomTileWidth) + 2;
    for (let index = -halfLineCount; index <= halfLineCount; index += 1) {
      const bottomX = vanishingX + index * bottomTileWidth;
      const topX = vanishingX + (bottomX - vanishingX) * perspectiveInset;
      ctx.beginPath();
      ctx.moveTo(topX, floorY);
      ctx.lineTo(bottomX, this.height);
      ctx.stroke();
    }

    const rowCount = Math.max(5, Math.round(floorHeight / 68));
    for (let row = 1; row < rowCount; row += 1) {
      const depth = row / rowCount;
      const y = floorY + floorHeight * Math.pow(depth, 1.45);
      ctx.strokeStyle = this.scene.floor.groutColor;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
      ctx.strokeStyle = this.scene.floor.highlightColor;
      ctx.beginPath();
      ctx.moveTo(0, y + 1);
      ctx.lineTo(this.width, y + 1);
      ctx.stroke();
    }

    const satin = ctx.createLinearGradient(0, floorY, 0, this.height);
    satin.addColorStop(0, 'rgb(255 253 243 / 12%)');
    satin.addColorStop(0.48, 'rgb(255 253 243 / 4%)');
    satin.addColorStop(1, 'rgb(150 128 98 / 4%)');
    ctx.fillStyle = satin;
    ctx.fillRect(0, floorY, this.width, floorHeight);
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

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    if (this.scene.windowView === 'hills') {
      this.drawHillWindowView(x, y, width, height, elapsed);
    } else {
      this.drawTaiwanCityWindowView(x, y, width, height);
    }
    ctx.restore();

    ctx.strokeStyle = '#fff7e9';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width / 2, y + height);
    ctx.moveTo(x, y + height / 2);
    ctx.lineTo(x + width, y + height / 2);
    ctx.stroke();
  }

  private drawHillWindowView(
    x: number,
    y: number,
    width: number,
    height: number,
    elapsed: number,
  ): void {
    const ctx = this.context;
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
  }

  private drawTaiwanCityWindowView(x: number, y: number, width: number, height: number): void {
    const ctx = this.context;
    const groundY = y + height * 0.9;
    const buildings = [
      { x: 0.02, width: 0.27, height: 0.43, color: '#c9b5a6' },
      { x: 0.25, width: 0.31, height: 0.61, color: '#a9b7b5' },
      { x: 0.53, width: 0.26, height: 0.49, color: '#d1bea9' },
      { x: 0.76, width: 0.25, height: 0.57, color: '#b9aaa5' },
    ] as const;

    for (const building of buildings) {
      const buildingX = x + width * building.x;
      const buildingWidth = width * building.width;
      const buildingHeight = height * building.height;
      const buildingY = groundY - buildingHeight;
      ctx.fillStyle = building.color;
      ctx.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);
      ctx.fillStyle = 'rgb(255 240 202 / 64%)';
      const columns = building.width > 0.28 ? 3 : 2;
      for (let column = 0; column < columns; column += 1) {
        for (let row = 0; row < 3; row += 1) {
          ctx.fillRect(
            buildingX + buildingWidth * (0.17 + column * (0.66 / Math.max(1, columns - 1))),
            buildingY + buildingHeight * (0.2 + row * 0.23),
            Math.max(3, buildingWidth * 0.1),
            Math.max(4, buildingHeight * 0.1),
          );
        }
      }
    }

    ctx.fillStyle = '#8e9a93';
    ctx.fillRect(x + width * 0.34, groundY - height * 0.67, width * 0.13, height * 0.025);
    ctx.fillRect(x + width * 0.38, groundY - height * 0.72, width * 0.05, height * 0.05);

    ctx.fillStyle = '#819b81';
    ctx.beginPath();
    ctx.arc(x + width * 0.12, groundY, height * 0.12, Math.PI, Math.PI * 2);
    ctx.arc(x + width * 0.88, groundY, height * 0.1, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  private drawWallDecor(w: number, h: number): void {
    const ctx = this.context;
    const shelfWidth = Math.min(180, w * 0.34);
    const x = w - shelfWidth - w * 0.07;
    const y = h * 0.19;

    ctx.fillStyle = '#9b6854';
    this.roundRect(x, y, shelfWidth, 9, 4);
    ctx.fill();
    ctx.fillStyle = 'rgb(255 228 204 / 25%)';
    this.roundRect(x + 3, y, shelfWidth - 6, 2, 1);
    ctx.fill();

    if (this.scene.wallDecor === 'taiwanHome') {
      this.drawTaiwanHomeDecor(x, y, shelfWidth);
      return;
    }

    this.drawShelfBook(x + shelfWidth * 0.12, y, 16, 36, '#c98e78');
    this.drawShelfBook(x + shelfWidth * 0.24, y, 15, 29, '#d8ab71');
    this.drawShelfBook(x + shelfWidth * 0.38, y, 19, 46, '#789497', 'Jimmy');
    this.drawShelfPlant(x + shelfWidth * 0.73, y, 31, '#ab7961', 'soft');
  }

  private drawTaiwanHomeDecor(x: number, y: number, shelfWidth: number): void {
    const ctx = this.context;
    const boxX = x + shelfWidth * 0.08;
    const boxWidth = shelfWidth * 0.32;
    const boxTop = y - 31;

    const boxFill = ctx.createLinearGradient(boxX, boxTop, boxX + boxWidth, y);
    boxFill.addColorStop(0, '#cda18a');
    boxFill.addColorStop(1, '#ad7f69');
    ctx.fillStyle = boxFill;
    this.roundRect(boxX, boxTop, boxWidth, 31, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgb(117 74 59 / 45%)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(boxX + 2, boxTop + 7);
    ctx.lineTo(boxX + boxWidth - 2, boxTop + 7);
    ctx.stroke();
    ctx.fillStyle = '#e9c5ac';
    this.roundRect(boxX + 2, boxTop + 1, boxWidth - 4, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#f4dfcb';
    this.roundRect(boxX + boxWidth * 0.35, y - 17, boxWidth * 0.3, 5, 2.5);
    ctx.fill();
    ctx.fillStyle = 'rgb(133 87 69 / 40%)';
    this.roundRect(boxX + boxWidth * 0.4, y - 15.5, boxWidth * 0.2, 2, 1);
    ctx.fill();

    this.drawShelfBook(x + shelfWidth * 0.48, y, 19, 42, '#718d91', '吉米');
    this.drawShelfPlant(x + shelfWidth * 0.76, y, 32, '#b47d68', 'bamboo');
  }

  private drawShelfBook(
    x: number,
    shelfY: number,
    width: number,
    height: number,
    color: string,
    title?: 'Jimmy' | '吉米',
  ): void {
    const ctx = this.context;
    const top = shelfY - height;
    ctx.fillStyle = color;
    this.roundRect(x, top, width, height, 2);
    ctx.fill();
    ctx.fillStyle = 'rgb(255 246 224 / 80%)';
    this.roundRect(x + 2, top + 2, width - 4, 2.5, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgb(73 65 59 / 24%)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width - 3, top + 6);
    ctx.lineTo(x + width - 3, shelfY - 3);
    ctx.stroke();
    ctx.fillStyle = 'rgb(255 255 244 / 33%)';
    this.roundRect(x + 3, top + 8, 2, height - 13, 1);
    ctx.fill();

    if (title === 'Jimmy') {
      ctx.save();
      ctx.translate(x + width * 0.5, top + height * 0.55);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#fff7e8';
      ctx.font = '600 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 0, 0);
      ctx.restore();
    } else if (title === '吉米') {
      ctx.fillStyle = '#fff7e8';
      ctx.font = '600 10px "Microsoft JhengHei", "Noto Sans CJK TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('吉', x + width * 0.5, top + 17);
      ctx.fillText('米', x + width * 0.5, top + 28);
    }
  }

  private drawShelfPlant(
    x: number,
    shelfY: number,
    width: number,
    potColor: string,
    foliage: 'soft' | 'bamboo',
  ): void {
    const ctx = this.context;
    const centerX = x + width * 0.5;
    const potTop = shelfY - 22;

    if (foliage === 'bamboo') {
      this.drawBambooFoliage(centerX, potTop);
    } else {
      ctx.strokeStyle = '#67866e';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, potTop);
      ctx.quadraticCurveTo(centerX - 4, potTop - 16, centerX - 8, potTop - 30);
      ctx.moveTo(centerX, potTop);
      ctx.quadraticCurveTo(centerX + 5, potTop - 19, centerX + 9, potTop - 33);
      ctx.moveTo(centerX, potTop - 5);
      ctx.quadraticCurveTo(centerX - 1, potTop - 20, centerX + 1, potTop - 37);
      ctx.stroke();

      for (const leaf of [
        { x: centerX - 10, y: potTop - 37, rotation: -0.55, color: '#789979' },
        { x: centerX + 11, y: potTop - 39, rotation: 0.52, color: '#729373' },
        { x: centerX + 1, y: potTop - 43, rotation: 0.12, color: '#87a584' },
      ]) {
        ctx.fillStyle = leaf.color;
        ctx.beginPath();
        ctx.ellipse(leaf.x, leaf.y, 4.5, 8.5, leaf.rotation, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const potFill = ctx.createLinearGradient(x, potTop, x + width, shelfY);
    potFill.addColorStop(0, potColor);
    potFill.addColorStop(1, '#926a5d');
    ctx.fillStyle = potFill;
    this.roundRect(x + 2, potTop + 3, width - 4, 19, 5);
    ctx.fill();
    ctx.fillStyle = '#c9967d';
    this.roundRect(x, potTop, width, 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgb(255 232 207 / 35%)';
    this.roundRect(x + 3, potTop + 1, width - 6, 1.5, 1);
    ctx.fill();
  }

  private drawBambooFoliage(centerX: number, potTop: number): void {
    const ctx = this.context;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6f9876';
    ctx.lineWidth = 2.2;

    for (const stalk of [
      { x: centerX - 7, tipX: centerX - 9, height: 39 },
      { x: centerX, tipX: centerX + 1, height: 47 },
      { x: centerX + 7, tipX: centerX + 9, height: 36 },
    ]) {
      ctx.beginPath();
      ctx.moveTo(stalk.x, potTop + 2);
      ctx.quadraticCurveTo(stalk.x, potTop - stalk.height * 0.5, stalk.tipX, potTop - stalk.height);
      ctx.stroke();
      for (const joint of [0.37, 0.68]) {
        const jointY = potTop - stalk.height * joint;
        const jointX = stalk.x + (stalk.tipX - stalk.x) * joint;
        ctx.beginPath();
        ctx.moveTo(jointX - 2.5, jointY);
        ctx.lineTo(jointX + 2.5, jointY);
        ctx.stroke();
      }
    }

    for (const leaf of [
      { x: centerX - 13, y: potTop - 40, rotation: -0.8 },
      { x: centerX - 4, y: potTop - 48, rotation: -0.45 },
      { x: centerX + 7, y: potTop - 51, rotation: 0.55 },
      { x: centerX + 14, y: potTop - 37, rotation: 0.85 },
    ]) {
      ctx.fillStyle = '#82a886';
      ctx.beginPath();
      ctx.ellipse(leaf.x, leaf.y, 3.2, 7.5, leaf.rotation, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPet(pet: PetModel, elapsed: number, sleepingAtDonut: boolean): void {
    if ((pet.state === 'walk' || pet.state === 'jog') && this.drawWalkCyclePet(pet)) return;

    if (!this.drawSpritePet(pet, elapsed, sleepingAtDonut)) {
      this.drawPlaceholderPet(pet, elapsed);
    }
  }

  private drawWalkCyclePet(pet: PetModel): boolean {
    const image = this.malteseWalkCycle.getImage();
    if (!image) return false;

    const ctx = this.context;
    const spriteSize = Math.max(150, Math.min(210, Math.min(this.width * 0.38, this.height * 0.28)));
    const sourceScale = getWalkCycleScale(spriteSize);
    const mirrorX = shouldMirrorWalkCycle(pet.facing) ? -1 : 1;

    this.drawPetShadow(pet, spriteSize);

    ctx.save();
    ctx.translate(pet.position.x, pet.position.y);
    if (pet.state === 'jog') {
      const takeoff = Math.max(0, 1 - pet.stateElapsed / 0.1);
      ctx.rotate(pet.facing * 0.025 * (1 - takeoff));
      ctx.scale(1 + 0.04 * takeoff, 1 - 0.06 * takeoff);
    }
    ctx.scale(mirrorX, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      image,
      // The same four frames run faster for a dash; the feet anchor stays fixed.
      this.malteseWalkCycle.getSourceX(pet.stateElapsed, pet.state === 'jog' ? 12 : DEFAULT_WALK_FPS),
      0,
      WALK_SHEET.frameWidth,
      WALK_SHEET.frameHeight,
      -WALK_SHEET.feetAnchor.x * sourceScale,
      -WALK_SHEET.feetAnchor.y * sourceScale,
      WALK_SHEET.frameWidth * sourceScale,
      WALK_SHEET.frameHeight * sourceScale,
    );
    ctx.restore();
    return true;
  }

  private drawSpritePet(pet: PetModel, elapsed: number, sleepingAtDonut: boolean): boolean {
    const selectedPose = selectMaltesePose(pet, sleepingAtDonut);
    const rearTailWagFrame = pet.state === 'sit' || pet.state === 'wallWag'
      ? this.rearTailWagSprites.getFrame(
        pet.state === 'wallWag'
          ? pet.stateElapsed % REAR_TAIL_WAG_CYCLE_SECONDS + REAR_TAIL_WAG_START_SECONDS
          : pet.stateElapsed,
      )
      : null;
    // A missing expression file falls back to the original front artwork.
    const pose = isFrontMaltesePose(selectedPose) && !this.malteseSprites.get(selectedPose)
      ? 'front' : selectedPose;
    const image = rearTailWagFrame?.image ?? this.malteseSprites.get(pose);
    if (!image) return false;

    const ctx = this.context;
    const definition = rearTailWagFrame?.definition ?? MALTESE_SPRITES[pose];
    const walking = pet.state === 'walk' || pet.state === 'jog';
    const sitting = pet.state === 'sit' || pet.state === 'wallWag';
    const attentive = pet.state === 'attention';
    const stepPhase = Math.sin(pet.stateElapsed * 9);
    const playing = pet.intent === 'playWithFrog';
    const playPhase = pet.stateElapsed * Math.PI * 2 * 1.55;
    const bob = playing ? -Math.abs(Math.sin(playPhase)) * 2.2
      : walking ? Math.abs(stepPhase) * -2.4 : Math.sin(elapsed * 2.1) * 0.65;
    const spriteSize = Math.max(150, Math.min(210, Math.min(this.width * 0.38, this.height * 0.28)));
    const sourceScale = spriteSize / definition.canvasSize;
    const mirrorX = shouldMirrorMaltesePose(pose, pet.facing) ? -1 : 1;
    const scaleY = sitting ? 0.9 : walking ? 1 - Math.abs(stepPhase) * 0.012 : 1;
    const rotation = playing ? Math.sin(playPhase) * 0.016
      : walking ? stepPhase * 0.012 : attentive ? Math.sin(elapsed * 1.7) * 0.006 : 0;

    this.drawPetShadow(pet, spriteSize, pose);

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

  private drawPetShadow(pet: PetModel, spriteSize: number, pose?: MaltesePose): void {
    const ctx = this.context;
    const shadow = getPetShadowLayout(pet.state, spriteSize, pose);
    ctx.save();
    ctx.translate(pet.position.x + shadow.offsetX, pet.position.y + shadow.offsetY);
    ctx.scale(1, 0.26);
    ctx.fillStyle = 'rgb(73 47 39 / 17%)';
    ctx.beginPath();
    ctx.ellipse(0, 0, shadow.radiusX, shadow.radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPlaceholderPet(pet: PetModel, elapsed: number): void {
    const ctx = this.context;
    const walking = pet.state === 'walk' || pet.state === 'jog';
    const sitting = pet.state === 'sit' || pet.state === 'wallWag';
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

