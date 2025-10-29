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
    expect(ga.generationNormal).toBe(0);
    expect(ga.generationDiff).toBe(0);
    expect(ga.bestFitnessNormal).toBe(0);
    expect(ga.bestFitnessDiff).toBe(0);
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
    const initialGenerationNormal = ga.generationNormal;
    const initialGenerationDiff = ga.generationDiff;

    // Simulate some fitness by setting maxDistanceReached
    population.forEach((car, i) => {
      car.maxDistanceReached = i * 10;
    });

    // Separate and evolve each population
    const normalCars = population.filter(car => !car.useDifferentialInputs);
    const diffCars = population.filter(car => car.useDifferentialInputs);

    const nextNormal = ga.evolveNormalPopulation(normalCars, track, 5.0);
    const nextDiff = ga.evolveDiffPopulation(diffCars, track, 5.0);

    expect(ga.generationNormal).toBe(initialGenerationNormal + 1);
    expect(ga.generationDiff).toBe(initialGenerationDiff + 1);
    expect(nextNormal).toHaveLength(GA_POPULATION_SIZE / 2);
    expect(nextDiff).toHaveLength(GA_POPULATION_SIZE / 2);
  });

  it('should preserve best fitness across generations', () => {
    const population = ga.initializePopulation(track);

    // Set fitness for first generation (50 normal cars + 50 diff cars)
    // population[0-49] are normal cars, population[50-99] are diff cars
    population[0].maxDistanceReached = 100; // Best normal car
    population[50].maxDistanceReached = 80; // Best diff car

    const normalCars = population.filter(car => !car.useDifferentialInputs);
    const diffCars = population.filter(car => car.useDifferentialInputs);

    ga.evolveNormalPopulation(normalCars, track, 5.0);
    ga.evolveDiffPopulation(diffCars, track, 5.0);
    expect(ga.bestFitnessNormal).toBe(100);
    expect(ga.bestFitnessDiff).toBe(80);

    // Second generation with worse fitness for both types
    const population2 = ga.initializePopulation(track);
    population2.forEach(car => {
      car.maxDistanceReached = 30;
    });

    const normalCars2 = population2.filter(car => !car.useDifferentialInputs);
    const diffCars2 = population2.filter(car => car.useDifferentialInputs);

    ga.evolveNormalPopulation(normalCars2, track, 5.0);
    ga.evolveDiffPopulation(diffCars2, track, 5.0);
    expect(ga.bestFitnessNormal).toBe(100); // Should still be 100
    expect(ga.bestFitnessDiff).toBe(80); // Should still be 80
  });

  it('should have elite car (first car) with best brain', () => {
    const population = ga.initializePopulation(track);

    population.forEach((car, i) => {
      car.maxDistanceReached = i * 10;
    });

    const normalCars = population.filter(car => !car.useDifferentialInputs);
    const diffCars = population.filter(car => car.useDifferentialInputs);

    const nextNormal = ga.evolveNormalPopulation(normalCars, track, 5.0);
    const nextDiff = ga.evolveDiffPopulation(diffCars, track, 5.0);

    // First car of each type should be elite
    expect(nextNormal[0]).toBeDefined();
    expect(nextDiff[0]).toBeDefined();
  });

  it('should export and import weights', () => {
    const population = ga.initializePopulation(track);
    population[0].maxDistanceReached = 100; // Normal car
    population[50].maxDistanceReached = 80; // Diff car

    const normalCars = population.filter(car => !car.useDifferentialInputs);
    const diffCars = population.filter(car => car.useDifferentialInputs);

    ga.evolveNormalPopulation(normalCars, track, 5.0);
    ga.evolveDiffPopulation(diffCars, track, 5.0);

    const exported = ga.exportWeights();
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');

    const ga2 = new GeneticAlgorithm(54321);
    ga2.importWeights(exported);

    expect(ga2.generationNormal).toBe(ga.generationNormal);
    expect(ga2.generationDiff).toBe(ga.generationDiff);
    expect(ga2.bestFitnessNormal).toBe(ga.bestFitnessNormal);
    expect(ga2.bestFitnessDiff).toBe(ga.bestFitnessDiff);
  });

  it('should reset correctly', () => {
    const population = ga.initializePopulation(track);
    population[0].maxDistanceReached = 100; // Normal car
    population[50].maxDistanceReached = 80; // Diff car

    const normalCars = population.filter(car => !car.useDifferentialInputs);
    const diffCars = population.filter(car => car.useDifferentialInputs);

    ga.evolveNormalPopulation(normalCars, track, 5.0);
    ga.evolveDiffPopulation(diffCars, track, 5.0);

    expect(ga.generationNormal).toBeGreaterThan(0);
    expect(ga.generationDiff).toBeGreaterThan(0);
    expect(ga.bestFitnessNormal).toBeGreaterThan(0);
    expect(ga.bestFitnessDiff).toBeGreaterThan(0);

    ga.reset();

    expect(ga.generationNormal).toBe(0);
    expect(ga.generationDiff).toBe(0);
    expect(ga.bestFitnessNormal).toBe(0);
    expect(ga.bestFitnessDiff).toBe(0);
    expect(ga.bestWeightsNormal).toBeNull();
    expect(ga.bestWeightsDiff).toBeNull();
  });
});
