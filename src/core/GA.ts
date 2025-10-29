import { Car } from './Car';
import { NeuralNetwork } from './Neural';
import { Track } from './Track';
import { SeededRandom } from './math/geom';
import {
  GA_POPULATION_SIZE,
  GA_MUTATION_RATE,
  GA_MUTATION_MIN_MULTIPLIER,
  GA_MUTATION_MAX_MULTIPLIER,
  GA_MUTATION_CURVE_POWER,
  ELITE_CAR_COLOR,
  NORMAL_CAR_COLOR,
  NEURAL_NETWORK_ARCHITECTURE_STANDARD,
  NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL,
  DEFAULT_DIFFERENTIAL_INPUTS,
} from '@/config';

export class GeneticAlgorithm {
  generation: number = 0;
  bestFitness: number = 0;
  bestWeights: any = null;
  private rng: SeededRandom;
  useDifferentialInputs: boolean;

  constructor(seed: number, useDifferentialInputs: boolean = DEFAULT_DIFFERENTIAL_INPUTS) {
    this.rng = new SeededRandom(seed);
    this.useDifferentialInputs = useDifferentialInputs;
  }

  // Calculate mutation multiplier for a given brain index
  private getMutationMultiplier(index: number): number {
    if (index === 0) {
      return 0; // Elite car - no mutation
    }

    // Exponential curve from GA_MUTATION_MIN_MULTIPLIER to GA_MUTATION_MAX_MULTIPLIER
    const progress = (index - 1) / (GA_POPULATION_SIZE - 2);
    const range = GA_MUTATION_MAX_MULTIPLIER - GA_MUTATION_MIN_MULTIPLIER;
    return (
      GA_MUTATION_MIN_MULTIPLIER +
      range * Math.pow(progress, GA_MUTATION_CURVE_POWER)
    );
  }

  // Initialize first generation
  initializePopulation(track: Track): Car[] {
    const population: Car[] = [];

    const architecture = this.useDifferentialInputs
      ? NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL
      : NEURAL_NETWORK_ARCHITECTURE_STANDARD;

    // Truly random initialization - each car gets a unique random seed and angle
    for (let i = 0; i < GA_POPULATION_SIZE; i++) {
      // Use Math.random() directly for true randomness in initial population
      const brainSeed =
        Date.now() + Math.random() * 1000000 + i * Math.random() * 1000;

      const brain = NeuralNetwork.createRandom(
        brainSeed,
        architecture
      );

      // Start pointing forward along track with ±45° randomization
      const angleWiggle = (Math.random() - 0.5) * (Math.PI / 2); // ±45° = ±π/4, range is π/2
      const startAngle = track.startAngle + angleWiggle;

      const car = new Car(
        track.startPosition.x,
        track.startPosition.y,
        startAngle,
        brain,
        NORMAL_CAR_COLOR,
        this.useDifferentialInputs
      );
      population.push(car);
    }

    return population;
  }

  // Evolve to next generation
  evolvePopulation(
    population: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    // If a winner car is provided (completed lap), use it as the elite
    // Otherwise sort by maxDistanceReached
    const sortedCars = [...population].sort(
      (a, b) => b.maxDistanceReached - a.maxDistanceReached
    );

    const trackLength = track.getTotalLength();
    const bestMaxDistance = sortedCars[0].maxDistanceReached;

    // Determine which car's brain to use for next generation
    let bestCarForBreeding: Car;

    if (winnerCar) {
      // Use the winner car that completed the lap
      bestCarForBreeding = winnerCar;
    } else {
      // Filter out the elite car (exact copy) and select best from mutated cars
      const mutatedCars = sortedCars.filter(
        (car) => car.color !== ELITE_CAR_COLOR
      );
      const bestMutatedCar = mutatedCars[0];

      if (bestMutatedCar) {
        bestCarForBreeding = bestMutatedCar;
      } else {
        // Fallback: if no mutated cars (shouldn't happen), use the best overall
        bestCarForBreeding = sortedCars[0];
      }
    }

    this.bestWeights = bestCarForBreeding.brain.toJSON();

    // Track improvement (use winner's max distance if provided)
    const currentBestDistance = winnerCar ? winnerCar.maxDistanceReached : bestMaxDistance;

    if (currentBestDistance > this.bestFitness) {
      this.bestFitness = currentBestDistance;
    }

    // Create next generation
    this.generation++;
    const nextGeneration: Car[] = [];

    const architecture = this.useDifferentialInputs
      ? NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL
      : NEURAL_NETWORK_ARCHITECTURE_STANDARD;

    const eliteBrain = NeuralNetwork.fromJSON(
      this.bestWeights,
      this.rng.next() * 1000000,
      architecture
    );

    // Calculate adaptive mutation rate (inverse of generation time)
    // Use minimum threshold to prevent extreme mutation rates for very short generations
    const minGenerationTime = 1.0; // seconds
    const effectiveTime = Math.max(generationTime, minGenerationTime);
    const adaptiveMutationRate = GA_MUTATION_RATE / effectiveTime;

    // Elite car points forward with random wiggle
    const eliteWiggle = (this.rng.next() - 0.5) * (Math.PI / 2); // ±45° = ±π/4, range is π/2
    const eliteAngle = track.startAngle + eliteWiggle;

    // First car is exact elite copy with forward angle
    nextGeneration.push(
      new Car(
        track.startPosition.x,
        track.startPosition.y,
        eliteAngle,
        eliteBrain,
        ELITE_CAR_COLOR,
        this.useDifferentialInputs
      )
    );

    // Rest are mutations with progressive mutation rates and forward-pointing angles
    for (let i = 1; i < GA_POPULATION_SIZE; i++) {
      const mutationSeed =
        this.rng.next() * 1000000 + i + this.generation * 10000;
      const multiplier = this.getMutationMultiplier(i);
      const sigma = adaptiveMutationRate * multiplier;

      const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

      // Start pointing forward along track with ±45° randomization
      const angleWiggle = (this.rng.next() - 0.5) * (Math.PI / 2); // ±45° = ±π/4, range is π/2
      const angle = track.startAngle + angleWiggle;

      nextGeneration.push(
        new Car(
          track.startPosition.x,
          track.startPosition.y,
          angle,
          mutatedBrain,
          NORMAL_CAR_COLOR,
          this.useDifferentialInputs
        )
      );
    }

    return nextGeneration;
  }

  // Export weights as JSON
  exportWeights(): string {
    return JSON.stringify(
      {
        generation: this.generation,
        bestFitness: this.bestFitness,
        bestWeights: this.bestWeights,
      },
      null,
      2
    );
  }

  // Import weights from JSON
  importWeights(json: string): void {
    try {
      const data = JSON.parse(json);
      this.generation = data.generation || 0;
      this.bestFitness = data.bestFitness || 0;
      this.bestWeights = data.bestWeights;
    } catch (error) {
      // Silently fail
    }
  }

  // Reset evolution
  reset(): void {
    this.generation = 0;
    this.bestFitness = 0;
    this.bestWeights = null;
  }
}
