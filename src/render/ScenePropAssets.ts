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

export const PET_HOUSE: ScenePropSpriteDefinition = {
  file: 'pet-house.png',
  canvasSize: [1254, 1254],
  crop: { x: 60, y: 90, width: 1151, height: 1065 },
};

export const FROG_TOY: ScenePropSpriteDefinition = {
  file: 'frog-toy.png',
  canvasSize: [1254, 1254],
  crop: { x: 12, y: 172, width: 1233, height: 967 },
};

export interface ScenePropImages {
  donutPetBed: HTMLImageElement | null;
  petHouse: HTMLImageElement | null;
  frogToy: HTMLImageElement | null;
}

export class ScenePropAssets {
  private readonly donutPetBed: HTMLImageElement;
  private readonly petHouse: HTMLImageElement;
  private readonly frogToy: HTMLImageElement;

  public constructor(baseUrl = document.baseURI) {
    this.donutPetBed = this.load(DONUT_PET_BED, baseUrl);
    this.petHouse = this.load(PET_HOUSE, baseUrl);
    this.frogToy = this.load(FROG_TOY, baseUrl);
  }

  public getImages(): ScenePropImages {
    return {
      donutPetBed: this.ready(this.donutPetBed),
      petHouse: this.ready(this.petHouse),
      frogToy: this.ready(this.frogToy),
    };
  }

  private load(definition: ScenePropSpriteDefinition, baseUrl: string): HTMLImageElement {
    const image = new Image();
    image.decoding = 'async';
    image.src = new URL(`assets/props/${definition.file}`, baseUrl).href;
    return image;
  }

  private ready(image: HTMLImageElement): HTMLImageElement | null {
    return image.complete && image.naturalWidth > 0 ? image : null;
  }
}
