import { describe, expect, it } from 'vitest';
import { DONUT_PET_BED, FROG_TOY, PET_HOUSE, PET_HOUSE_OCCUPIED } from './ScenePropAssets';
import { getScenePropLayout, isFrogForeground } from './SceneProps';

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

});
