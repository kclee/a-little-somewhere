import './walk-cycle.css';
import { MALTESE_SPRITES } from './render/MalteseSpriteSet';
import { WALK_FRAME_COUNT, WALK_SHEET, WalkCycleModel } from './walk-cycle/WalkCycleModel';

const requireElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Walk preview element was not found: ${selector}`);
  return element;
};

const spriteCanvas = requireElement<HTMLCanvasElement>('#sprite-preview');
const proceduralCanvas = requireElement<HTMLCanvasElement>('#procedural-preview');
const playPause = requireElement<HTMLButtonElement>('#play-pause');
const previousFrame = requireElement<HTMLButtonElement>('#previous-frame');
const nextFrame = requireElement<HTMLButtonElement>('#next-frame');
const speed = requireElement<HTMLInputElement>('#animation-speed');
const speedOutput = requireElement<HTMLOutputElement>('#speed-output');
const checkerboard = requireElement<HTMLInputElement>('#checkerboard-toggle');
const comparison = requireElement<HTMLElement>('#comparison');
const frameNumber = requireElement<HTMLElement>('#frame-number');

const spriteContext = spriteCanvas.getContext('2d');
const proceduralContext = proceduralCanvas.getContext('2d');
if (!spriteContext || !proceduralContext) throw new Error('Canvas 2D is unavailable.');

const model = new WalkCycleModel();
const walkSheet = new Image();
walkSheet.decoding = 'async';
walkSheet.src = new URL('assets/pets/maltese/maltese-walk-cycle.png', document.baseURI).href;

const currentSidePose = new Image();
currentSidePose.decoding = 'async';
currentSidePose.src = new URL(
  `assets/pets/maltese/${MALTESE_SPRITES.sideRight.file}`,
  document.baseURI,
).href;

let elapsedSeconds = 0;
let previousTime = performance.now();

const resizeCanvas = (canvas: HTMLCanvasElement): void => {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  const context = canvas.getContext('2d');
  context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
};

const drawGroundGuide = (
  context: CanvasRenderingContext2D,
  width: number,
  baseline: number,
): void => {
  context.save();
  context.strokeStyle = 'rgb(117 82 69 / 28%)';
  context.setLineDash([6, 6]);
  context.beginPath();
  context.moveTo(18, baseline + 0.5);
  context.lineTo(width - 18, baseline + 0.5);
  context.stroke();
  context.restore();
};

const drawSpriteWalk = (): void => {
  const width = spriteCanvas.getBoundingClientRect().width;
  const height = spriteCanvas.getBoundingClientRect().height;
  spriteContext.clearRect(0, 0, width, height);
  const baseline = height * 0.82;
  drawGroundGuide(spriteContext, width, baseline);
  if (!walkSheet.complete || walkSheet.naturalWidth === 0) return;

  const visibleDogHeight = 424;
  const scale = Math.min((height * 0.69) / visibleDogHeight, (width * 0.82) / WALK_SHEET.frameWidth);
  const destinationX = width / 2 - WALK_SHEET.feetAnchor.x * scale;
  const destinationY = baseline - WALK_SHEET.feetAnchor.y * scale;

  spriteContext.imageSmoothingEnabled = true;
  spriteContext.imageSmoothingQuality = 'high';
  spriteContext.drawImage(
    walkSheet,
    model.frameIndex * WALK_SHEET.frameWidth,
    0,
    WALK_SHEET.frameWidth,
    WALK_SHEET.frameHeight,
    destinationX,
    destinationY,
    WALK_SHEET.frameWidth * scale,
    WALK_SHEET.frameHeight * scale,
  );
};

const drawProceduralWalk = (): void => {
  const width = proceduralCanvas.getBoundingClientRect().width;
  const height = proceduralCanvas.getBoundingClientRect().height;
  proceduralContext.clearRect(0, 0, width, height);
  const baseline = height * 0.82;
  drawGroundGuide(proceduralContext, width, baseline);
  if (!currentSidePose.complete || currentSidePose.naturalWidth === 0) return;

  const definition = MALTESE_SPRITES.sideRight;
  const spriteSize = Math.min(230, height * 0.72, width * 0.7);
  const sourceScale = spriteSize / definition.canvasSize;
  const stepPhase = Math.sin(elapsedSeconds * 9);
  const bob = Math.abs(stepPhase) * -2.4;
  const scaleY = 1 - Math.abs(stepPhase) * 0.012;
  const rotation = stepPhase * 0.012;
  const crop = definition.crop;

  proceduralContext.save();
  proceduralContext.translate(width / 2, baseline + bob);
  proceduralContext.rotate(rotation);
  proceduralContext.scale(1, scaleY);
  proceduralContext.imageSmoothingEnabled = true;
  proceduralContext.imageSmoothingQuality = 'high';
  proceduralContext.drawImage(
    currentSidePose,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -spriteSize * definition.anchor[0] + crop.x * sourceScale,
    -spriteSize * definition.anchor[1] + crop.y * sourceScale,
    crop.width * sourceScale,
    crop.height * sourceScale,
  );
  proceduralContext.restore();
};

const syncControls = (): void => {
  playPause.textContent = model.playing ? 'Pause' : 'Play';
  playPause.setAttribute('aria-pressed', String(model.playing));
  frameNumber.textContent = `Frame ${model.frameIndex + 1} of ${WALK_FRAME_COUNT}`;
  speed.value = String(model.fps);
  speedOutput.value = `${model.fps} FPS`;
};

playPause.addEventListener('click', () => {
  model.togglePlaying();
  syncControls();
});

previousFrame.addEventListener('click', () => {
  model.previousFrame();
  syncControls();
  drawSpriteWalk();
});

nextFrame.addEventListener('click', () => {
  model.nextFrame();
  syncControls();
  drawSpriteWalk();
});

speed.addEventListener('input', () => {
  model.setFps(Number(speed.value));
  syncControls();
});

checkerboard.addEventListener('change', () => {
  comparison.classList.toggle('checkerboard', checkerboard.checked);
});

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas(spriteCanvas);
  resizeCanvas(proceduralCanvas);
  drawSpriteWalk();
  drawProceduralWalk();
});
resizeObserver.observe(spriteCanvas);
resizeObserver.observe(proceduralCanvas);

const animate = (now: number): void => {
  const deltaSeconds = Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  if (model.playing) elapsedSeconds += deltaSeconds;
  if (model.update(deltaSeconds)) syncControls();
  drawSpriteWalk();
  drawProceduralWalk();
  requestAnimationFrame(animate);
};

walkSheet.addEventListener('load', drawSpriteWalk);
currentSidePose.addEventListener('load', drawProceduralWalk);
syncControls();
requestAnimationFrame(animate);

window.addEventListener('pagehide', () => resizeObserver.disconnect());
