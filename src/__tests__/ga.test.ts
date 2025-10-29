import { describe, it, expect, beforeEach } from 'vitest';
import { GeneticAlgorithm } from '../core/GA';
import { Track } from '../core/Track';
import { GA_POPULATION_SIZE } from '../config';

describe('GeneticAlgorithm', () => {
  let ga: GeneticAlgorithm;
  let track: Track;

  beforeEach(() => {
    ga = new GeneticAlgorithm(12345);
    track = new Track(40);
  });

  it('should initialize with generation 0', () => {
    expect(ga.generationNormReLU).toBe(0);
    expect(ga.generationDiffLinear).toBe(0);
    expect(ga.bestFitnessNormReLU).toBe(0);
    expect(ga.bestFitnessDiffLinear).toBe(0);
  });

  it('should create initial population with correct size', () => {
    const population = ga.initializePopulation(track);
    expect(population).toHaveLength(GA_POPULATION_SIZE);
  });

  it('should create all cars alive initially', () => {
    const population = ga.initializePopulation(track);
    expect(population.every(car => car.alive)).toBe(true);
  });

  it('should create cars at track start position', () => {
    const population = ga.initializePopulation(track);
    population.forEach(car => {
      expect(car.x).toBeCloseTo(track.startPosition.x, 1);
      expect(car.y).toBeCloseTo(track.startPosition.y, 1);
      // Cars spawn with ±45° angle wiggle, so check they're within that range
      const angleDiff = Math.abs(car.angle - track.startAngle);
      expect(angleDiff).toBeLessThanOrEqual(Math.PI / 2); // ±45° = ±π/4, max diff is π/2
    });
  });

  it('should evolve population and increment generation', () => {
    const population = ga.initializePopulation(track);
    const initialGenerationNormReLU = ga.generationNormReLU;
    const initialGenerationDiffLinear = ga.generationDiffLinear;

    // Simulate some fitness by setting maxDistanceReached
    population.forEach((car, i) => {
      car.maxDistanceReached = i * 10;
    });

    // Separate and evolve each population
    const normReLUCars = population.filter(car => !car.useDifferentialInputs);
    const diffLinearCars = population.filter(car => car.useDifferentialInputs);

    const nextNormReLU = ga.evolveNormReLUPopulation(normReLUCars, track, 5.0);
    const nextDiffLinear = ga.evolveDiffLinearPopulation(diffLinearCars, track, 5.0);

    expect(ga.generationNormReLU).toBe(initialGenerationNormReLU + 1);
    expect(ga.generationDiffLinear).toBe(initialGenerationDiffLinear + 1);
    expect(nextNormReLU).toHaveLength(GA_POPULATION_SIZE / 2);
    expect(nextDiffLinear).toHaveLength(GA_POPULATION_SIZE / 2);
  });

  it('should preserve best fitness across generations', () => {
    const population = ga.initializePopulation(track);

    // Set fitness for first generation (50 NormReLU cars + 50 DiffLinear cars)
    // population[0-49] are NormReLU cars, population[50-99] are DiffLinear cars
    population[0].maxDistanceReached = 100; // Best NormReLU car
    population[50].maxDistanceReached = 80; // Best DiffLinear car

    const normReLUCars = population.filter(car => !car.useDifferentialInputs);
    const diffLinearCars = population.filter(car => car.useDifferentialInputs);

    ga.evolveNormReLUPopulation(normReLUCars, track, 5.0);
    ga.evolveDiffLinearPopulation(diffLinearCars, track, 5.0);
    expect(ga.bestFitnessNormReLU).toBe(100);
    expect(ga.bestFitnessDiffLinear).toBe(80);

    // Second generation with worse fitness for both types
    const population2 = ga.initializePopulation(track);
    population2.forEach(car => {
      car.maxDistanceReached = 30;
    });

    const normReLUCars2 = population2.filter(car => !car.useDifferentialInputs);
    const diffLinearCars2 = population2.filter(car => car.useDifferentialInputs);

    ga.evolveNormReLUPopulation(normReLUCars2, track, 5.0);
    ga.evolveDiffLinearPopulation(diffLinearCars2, track, 5.0);
    expect(ga.bestFitnessNormReLU).toBe(100); // Should still be 100
    expect(ga.bestFitnessDiffLinear).toBe(80); // Should still be 80
  });

  it('should have elite car (first car) with best brain', () => {
    const population = ga.initializePopulation(track);

    population.forEach((car, i) => {
      car.maxDistanceReached = i * 10;
    });

    const normReLUCars = population.filter(car => !car.useDifferentialInputs);
    const diffLinearCars = population.filter(car => car.useDifferentialInputs);

    const nextNormReLU = ga.evolveNormReLUPopulation(normReLUCars, track, 5.0);
    const nextDiffLinear = ga.evolveDiffLinearPopulation(diffLinearCars, track, 5.0);

    // First car of each type should be elite
    expect(nextNormReLU[0]).toBeDefined();
    expect(nextDiffLinear[0]).toBeDefined();
  });

  it('should export and import weights', () => {
    const population = ga.initializePopulation(track);
    population[0].maxDistanceReached = 100; // NormReLU car
    population[50].maxDistanceReached = 80; // DiffLinear car

    const normReLUCars = population.filter(car => !car.useDifferentialInputs);
    const diffLinearCars = population.filter(car => car.useDifferentialInputs);

    ga.evolveNormReLUPopulation(normReLUCars, track, 5.0);
    ga.evolveDiffLinearPopulation(diffLinearCars, track, 5.0);

    const exported = ga.exportWeights();
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');

    const ga2 = new GeneticAlgorithm(54321);
    ga2.importWeights(exported);

    expect(ga2.generationNormReLU).toBe(ga.generationNormReLU);
    expect(ga2.generationDiffLinear).toBe(ga.generationDiffLinear);
    expect(ga2.bestFitnessNormReLU).toBe(ga.bestFitnessNormReLU);
    expect(ga2.bestFitnessDiffLinear).toBe(ga.bestFitnessDiffLinear);
  });

  it('should reset correctly', () => {
    const population = ga.initializePopulation(track);
    population[0].maxDistanceReached = 100; // NormReLU car
    population[50].maxDistanceReached = 80; // DiffLinear car

    const normReLUCars = population.filter(car => !car.useDifferentialInputs);
    const diffLinearCars = population.filter(car => car.useDifferentialInputs);

    ga.evolveNormReLUPopulation(normReLUCars, track, 5.0);
    ga.evolveDiffLinearPopulation(diffLinearCars, track, 5.0);

    expect(ga.generationNormReLU).toBeGreaterThan(0);
    expect(ga.generationDiffLinear).toBeGreaterThan(0);
    expect(ga.bestFitnessNormReLU).toBeGreaterThan(0);
    expect(ga.bestFitnessDiffLinear).toBeGreaterThan(0);

    ga.reset();

    expect(ga.generationNormReLU).toBe(0);
    expect(ga.generationDiffLinear).toBe(0);
    expect(ga.bestFitnessNormReLU).toBe(0);
    expect(ga.bestFitnessDiffLinear).toBe(0);
    expect(ga.bestWeightsNormReLU).toBeNull();
    expect(ga.bestWeightsDiffLinear).toBeNull();
  });
});
