import { describe, expect, it } from 'vitest';
import { DONUT_PET_BED, FROG_TOY, PET_HOUSE, PET_HOUSE_OCCUPIED, PET_HOUSE_OCCUPIED_SLEEPING } from './ScenePropAssets';
import { getOccupiedHouseImage, getScenePropLayout, isFrogForeground } from './SceneProps';

describe('responsive scene prop layout', () => {
  it.each([
    { width: 366, height: 767 },
    { width: 1334, height: 665 },
  ])('keeps all props visible at $width x $height', (world) => {
    const layout = getScenePropLayout(world);

    expect(layout.cushion.x - layout.cushion.width / 2).toBeGreaterThanOrEqual(0);
    expect(layout.cushion.x + layout.cushion.width / 2).toBeLessThanOrEqual(world.width);
    expect(layout.cushion.y + layout.cushion.height / 2).toBeLessThanOrEqual(world.height);

    expect(layout.house.x - layout.house.width / 2).toBeGreaterThanOrEqual(0);
    expect(layout.house.x + layout.house.width / 2).toBeLessThanOrEqual(world.width);
    expect(layout.house.baseline - layout.house.height).toBeGreaterThanOrEqual(0);
    expect(layout.house.baseline).toBeLessThanOrEqual(world.height);

    expect(layout.frog.x - layout.frog.width / 2).toBeGreaterThanOrEqual(0);
    expect(layout.frog.x + layout.frog.width / 2).toBeLessThanOrEqual(world.width);
    expect(layout.frog.baseline - layout.frog.height).toBeGreaterThanOrEqual(0);
    expect(layout.frog.baseline).toBeLessThanOrEqual(world.height);

    expect(layout.cushion.x + layout.cushion.width / 2).toBeLessThanOrEqual(
      layout.house.x - layout.house.width / 2,
    );
  });

  it('preserves the visible donut artwork aspect ratio at each layout size', () => {
    const expectedAspect = DONUT_PET_BED.crop.height / DONUT_PET_BED.crop.width;

    for (const world of [
      { width: 366, height: 767 },
      { width: 1334, height: 665 },
    ]) {
      const { cushion } = getScenePropLayout(world);
      expect(cushion.height / cushion.width).toBeCloseTo(expectedAspect, 6);
    }
  });

  it('reduces only the mobile portrait donut while keeping the house and frog sizes', () => {
    const portrait = { width: 390, height: 767 };
    const landscape = { width: 390, height: 360 };
    const mobile = getScenePropLayout(portrait);
    const oldScale = getScenePropLayout(landscape);
    expect(mobile.cushion.width).toBeLessThan(oldScale.cushion.width * 0.85);
    expect(mobile.cushion.width).toBeLessThan(mobile.house.width * 1.2);
    expect(mobile.house.width).toBe(oldScale.house.width);
    expect(mobile.house.height).toBe(oldScale.house.height);
    expect(mobile.frog.width).toBe(oldScale.frog.width);
  });

  it('preserves the visible artwork aspect ratio for every PNG prop', () => {
    const layout = getScenePropLayout({ width: 1334, height: 665 });
    expect(layout.house.height / layout.house.width).toBeCloseTo(
      PET_HOUSE.crop.height / PET_HOUSE.crop.width,
      6,
    );
    expect(layout.frog.height / layout.frog.width).toBeCloseTo(
      FROG_TOY.crop.height / FROG_TOY.crop.width,
      6,
    );
  });

  it.each([
    { width: 366, height: 767 },
    { width: 1334, height: 665 },
  ])('starts the frog at the house front-right edge at $width x $height', (world) => {
    const { frog, house } = getScenePropLayout(world);
    expect(frog.x).toBeCloseTo(house.x + house.width * 0.12);
    expect(frog.baseline).toBeCloseTo(house.baseline + house.height * 0.32);
    expect(frog.x + frog.width / 2).toBeLessThanOrEqual(world.width);
    expect(frog.baseline + frog.height / 2).toBeLessThanOrEqual(world.height);
  });

  it('uses foreground only while the frog is held or actively playing', () => {
    expect(isFrogForeground({ x: 100, baseline: 200 })).toBe(false);
    expect(isFrogForeground({ x: 100, baseline: 200, held: true })).toBe(true);
    expect(isFrogForeground({ x: 100, baseline: 200, playing: true })).toBe(true);
  });

  it('aligns both transparent house crops to the same drawn rectangle', () => {
    expect(PET_HOUSE_OCCUPIED.canvasSize).toEqual(PET_HOUSE.canvasSize);
    expect(PET_HOUSE_OCCUPIED.crop.width).toBeGreaterThan(PET_HOUSE.crop.width);
    expect(PET_HOUSE_OCCUPIED.crop.height).toBeGreaterThan(PET_HOUSE.crop.height);
  });

  it('uses one crop and draw rectangle for awake and sleeping occupied art', () => {
    expect(PET_HOUSE_OCCUPIED_SLEEPING.canvasSize).toEqual(PET_HOUSE_OCCUPIED.canvasSize);
    expect(PET_HOUSE_OCCUPIED_SLEEPING.crop).toEqual(PET_HOUSE_OCCUPIED.crop);
  });

  it('selects sleeping art only while the house is occupied and asleep, with awake fallback', () => {
    const awake = {} as HTMLImageElement;
    const asleep = {} as HTMLImageElement;
    const images = { petHouseOccupied: awake, petHouseOccupiedSleeping: asleep };
    const occupied = { occupied: true, hidePet: true, wiggle: 0 };
    expect(getOccupiedHouseImage(images, occupied)).toBe(awake);
    expect(getOccupiedHouseImage(images, { ...occupied, sleeping: true })).toBe(asleep);
    expect(getOccupiedHouseImage({ ...images, petHouseOccupiedSleeping: null }, { ...occupied, sleeping: true })).toBe(awake);
    expect(getOccupiedHouseImage(images, { ...occupied, occupied: false })).toBeNull();
  });

});
