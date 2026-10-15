interface SourceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScenePropSpriteDefinition {
  file: string;
  canvasSize: readonly [width: number, height: number];
  crop: SourceCrop;
}

// The source image contains generous transparent padding. Cropping to the
// visible artwork lets layout dimensions describe the bed itself.
export const DONUT_PET_BED: ScenePropSpriteDefinition = {
  file: 'donut-pet-bed.png',
  canvasSize: [1254, 1254],
  crop: { x: 30, y: 284, width: 1195, height: 745 },
};

export class ScenePropAssets {
  private readonly donutPetBed: HTMLImageElement;

  public constructor(baseUrl = document.baseURI) {
    this.donutPetBed = new Image();
    this.donutPetBed.decoding = 'async';
    this.donutPetBed.src = new URL(`assets/props/${DONUT_PET_BED.file}`, baseUrl).href;
  }

  public getDonutPetBed(): HTMLImageElement | null {
    return this.donutPetBed.complete && this.donutPetBed.naturalWidth > 0
      ? this.donutPetBed
      : null;
  }
}
