import { describe, expect, it } from 'vitest';
import { PetSimulation } from './PetSimulation';

describe('PetSimulation', () => {
  it('keeps the pet within room bounds when resized', () => {
    const simulation = new PetSimulation();
    simulation.pet.position.x = 999;

    simulation.resize(320, 700);

    expect(simulation.pet.position.x).toBeGreaterThanOrEqual(58);
    expect(simulation.pet.position.x).toBeLessThanOrEqual(262);
    expect(simulation.pet.position.y).toBeCloseTo(546);
  });

  it('clamps unusually large frame deltas', () => {
    const simulation = new PetSimulation();
    simulation.update(5);

    expect(simulation.elapsed).toBeCloseTo(0.1);
  });
});

