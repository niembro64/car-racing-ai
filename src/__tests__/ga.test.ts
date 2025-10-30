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
    expect(ga.getGeneration('normgelu')).toBe(0);
    expect(ga.getGeneration('difflinear')).toBe(0);
    expect(ga.getBestFitness('normgelu')).toBe(0);
    expect(ga.getBestFitness('difflinear')).toBe(0);
  });

  it('should create initial population with correct size', () => {
    const population = ga.initializePopulation(track);
    // Population is split evenly among all configured car types
    // With 6 types and population of 160: floor(160/6) * 6 = 156
    const numTypes = 6; // Current number of car types in CAR_BRAIN_CONFIGS
    const carsPerType = Math.floor(GA_POPULATION_SIZE / numTypes); // 26 per type
    const expectedTotal = carsPerType * numTypes; // 156 total
    expect(population).toHaveLength(expectedTotal);
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

    // With 6 types, each gets 26 cars (floor(160/6) = 26)
    const numTypes = 6; // Current number of car types in CAR_BRAIN_CONFIGS
    const carsPerType = Math.floor(GA_POPULATION_SIZE / numTypes);
    expect(nextNormReLU).toHaveLength(carsPerType);
    expect(nextDiffLinear).toHaveLength(carsPerType);
  });

  it('should preserve best fitness across generations', () => {
    const population = ga.initializePopulation(track);

    // Find specific car types by configId
    const normReLUCars = population.filter(car => car.configId === 'normgelu');
    const diffLinearCars = population.filter(car => car.configId === 'difflinear');

    // Set fitness for first generation
    if (normReLUCars.length > 0) normReLUCars[0].maxDistanceReached = 100;
    if (diffLinearCars.length > 0) diffLinearCars[0].maxDistanceReached = 80;

    ga.evolveNormReLUPopulation(normReLUCars, track, 5.0);
    ga.evolveDiffLinearPopulation(diffLinearCars, track, 5.0);
    expect(ga.bestFitnessNormReLU).toBe(100);
    expect(ga.bestFitnessDiffLinear).toBe(80);

    // Second generation with worse fitness for both types
    const population2 = ga.initializePopulation(track);
    const normReLUCars2 = population2.filter(car => car.configId === 'normgelu');
    const diffLinearCars2 = population2.filter(car => car.configId === 'difflinear');

    normReLUCars2.forEach(car => { car.maxDistanceReached = 30; });
    diffLinearCars2.forEach(car => { car.maxDistanceReached = 30; });

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

    // Find specific car types by configId
    const normReLUCars = population.filter(car => car.configId === 'normgelu');
    const diffLinearCars = population.filter(car => car.configId === 'difflinear');

    if (normReLUCars.length > 0) normReLUCars[0].maxDistanceReached = 100;
    if (diffLinearCars.length > 0) diffLinearCars[0].maxDistanceReached = 80;

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

    // Find specific car types by configId
    const normReLUCars = population.filter(car => car.configId === 'normgelu');
    const diffLinearCars = population.filter(car => car.configId === 'difflinear');

    if (normReLUCars.length > 0) normReLUCars[0].maxDistanceReached = 100;
    if (diffLinearCars.length > 0) diffLinearCars[0].maxDistanceReached = 80;

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
