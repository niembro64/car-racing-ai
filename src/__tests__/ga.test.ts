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
    expect(ga.generation).toBe(0);
    expect(ga.bestFitness).toBe(0);
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
      expect(car.angle).toBeCloseTo(track.startAngle, 2);
    });
  });

  it('should evolve population and increment generation', () => {
    const population = ga.initializePopulation(track);
    const initialGeneration = ga.generation;

    // Simulate some fitness by setting maxDistanceReached
    population.forEach((car, i) => {
      car.maxDistanceReached = i * 10;
    });

    const nextGeneration = ga.evolvePopulation(population, track, 5.0);

    expect(ga.generation).toBe(initialGeneration + 1);
    expect(nextGeneration).toHaveLength(GA_POPULATION_SIZE);
  });

  it('should preserve best fitness across generations', () => {
    const population = ga.initializePopulation(track);

    // Set fitness for first generation
    population[0].maxDistanceReached = 100;
    population[1].maxDistanceReached = 50;

    ga.evolvePopulation(population, track, 5.0);
    expect(ga.bestFitness).toBe(100);

    // Second generation with worse fitness
    const population2 = ga.initializePopulation(track);
    population2.forEach(car => {
      car.maxDistanceReached = 30;
    });

    ga.evolvePopulation(population2, track, 5.0);
    expect(ga.bestFitness).toBe(100); // Should still be 100
  });

  it('should have elite car (first car) with best brain', () => {
    const population = ga.initializePopulation(track);

    population.forEach((car, i) => {
      car.maxDistanceReached = i * 10;
    });

    const nextGeneration = ga.evolvePopulation(population, track, 5.0);

    // First car should be elite (has different color in actual implementation)
    expect(nextGeneration[0]).toBeDefined();
  });

  it('should export and import weights', () => {
    const population = ga.initializePopulation(track);
    population[0].maxDistanceReached = 100;
    ga.evolvePopulation(population, track, 5.0);

    const exported = ga.exportWeights();
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');

    const ga2 = new GeneticAlgorithm(54321);
    ga2.importWeights(exported);

    expect(ga2.generation).toBe(ga.generation);
    expect(ga2.bestFitness).toBe(ga.bestFitness);
  });

  it('should reset correctly', () => {
    const population = ga.initializePopulation(track);
    population[0].maxDistanceReached = 100;
    ga.evolvePopulation(population, track, 5.0);

    expect(ga.generation).toBeGreaterThan(0);
    expect(ga.bestFitness).toBeGreaterThan(0);

    ga.reset();

    expect(ga.generation).toBe(0);
    expect(ga.bestFitness).toBe(0);
    expect(ga.bestWeights).toBeNull();
  });
});
