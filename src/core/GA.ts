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
  NORMAL_CAR_COLOR,
  NORMAL_ELITE_CAR_COLOR,
  DIFF_CAR_COLOR,
  DIFF_ELITE_CAR_COLOR,
  NEURAL_NETWORK_ARCHITECTURE_STANDARD,
  NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL,
} from '@/config';

export class GeneticAlgorithm {
  generationNormal: number = 0;
  generationDiff: number = 0;
  bestFitnessNormal: number = 0;
  bestFitnessDiff: number = 0;
  bestWeightsNormal: any = null;
  bestWeightsDiff: any = null;
  private rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }

  // Calculate mutation multiplier for a given brain index within a subpopulation
  private getMutationMultiplier(index: number, subPopSize: number): number {
    if (index === 0) {
      return 0; // Elite car - no mutation
    }

    // Exponential curve from GA_MUTATION_MIN_MULTIPLIER to GA_MUTATION_MAX_MULTIPLIER
    const progress = (index - 1) / (subPopSize - 2);
    const range = GA_MUTATION_MAX_MULTIPLIER - GA_MUTATION_MIN_MULTIPLIER;
    return (
      GA_MUTATION_MIN_MULTIPLIER +
      range * Math.pow(progress, GA_MUTATION_CURVE_POWER)
    );
  }

  // Initialize first generation with both normal and differential input cars
  initializePopulation(track: Track): Car[] {
    const population: Car[] = [];
    const halfPop = GA_POPULATION_SIZE / 2;

    // Create 50 normal input cars (blue)
    for (let i = 0; i < halfPop; i++) {
      const brainSeed =
        Date.now() + Math.random() * 1000000 + i * Math.random() * 1000;

      const brain = NeuralNetwork.createRandom(
        brainSeed,
        NEURAL_NETWORK_ARCHITECTURE_STANDARD
      );

      const angleWiggle = (Math.random() - 0.5) * (Math.PI / 2);
      const startAngle = track.startAngle + angleWiggle;

      const car = new Car(
        track.startPosition.x,
        track.startPosition.y,
        startAngle,
        brain,
        NORMAL_CAR_COLOR,
        false // normal inputs
      );
      population.push(car);
    }

    // Create 50 differential input cars (red)
    for (let i = 0; i < halfPop; i++) {
      const brainSeed =
        Date.now() + Math.random() * 1000000 + (i + halfPop) * Math.random() * 1000;

      const brain = NeuralNetwork.createRandom(
        brainSeed,
        NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL
      );

      const angleWiggle = (Math.random() - 0.5) * (Math.PI / 2);
      const startAngle = track.startAngle + angleWiggle;

      const car = new Car(
        track.startPosition.x,
        track.startPosition.y,
        startAngle,
        brain,
        DIFF_CAR_COLOR,
        true // differential inputs
      );
      population.push(car);
    }

    return population;
  }

  // Evolve normal population independently
  evolveNormalPopulation(
    normalCars: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    const halfPop = GA_POPULATION_SIZE / 2;

    // Sort by performance
    const sorted = [...normalCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

    // Determine best car (accounting for winner)
    let bestCar: Car;
    if (winnerCar) {
      bestCar = winnerCar;
    } else {
      const nonElite = sorted.filter(car => car.color !== NORMAL_ELITE_CAR_COLOR);
      bestCar = nonElite[0] || sorted[0];
    }

    // Save best weights
    this.bestWeightsNormal = bestCar.brain.toJSON();

    // Track fitness improvements
    if (bestCar.maxDistanceReached > this.bestFitnessNormal) {
      this.bestFitnessNormal = bestCar.maxDistanceReached;
    }

    // Increment generation
    this.generationNormal++;

    // Calculate adaptive mutation rate
    const minGenerationTime = 1.0;
    const effectiveTime = Math.max(generationTime, minGenerationTime);
    const adaptiveMutationRate = GA_MUTATION_RATE / effectiveTime;

    // Create next generation
    const nextGeneration: Car[] = [];

    // Create elite brain
    const eliteBrain = NeuralNetwork.fromJSON(
      this.bestWeightsNormal,
      this.rng.next() * 1000000,
      NEURAL_NETWORK_ARCHITECTURE_STANDARD
    );

    // NORMAL CARS (50): 1 elite + 49 mutations
    for (let i = 0; i < halfPop; i++) {
      const angleWiggle = (this.rng.next() - 0.5) * (Math.PI / 2);
      const startAngle = track.startAngle + angleWiggle;

      if (i === 0) {
        // Elite normal car
        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            eliteBrain,
            NORMAL_ELITE_CAR_COLOR,
            false
          )
        );
      } else {
        // Mutated normal car
        const mutationSeed = this.rng.next() * 1000000 + i + this.generationNormal * 10000;
        const multiplier = this.getMutationMultiplier(i, halfPop);
        const sigma = adaptiveMutationRate * multiplier;
        const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            mutatedBrain,
            NORMAL_CAR_COLOR,
            false
          )
        );
      }
    }

    return nextGeneration;
  }

  // Evolve differential population independently
  evolveDiffPopulation(
    diffCars: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    const halfPop = GA_POPULATION_SIZE / 2;

    // Sort by performance
    const sorted = [...diffCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

    // Determine best car (accounting for winner)
    let bestCar: Car;
    if (winnerCar) {
      bestCar = winnerCar;
    } else {
      const nonElite = sorted.filter(car => car.color !== DIFF_ELITE_CAR_COLOR);
      bestCar = nonElite[0] || sorted[0];
    }

    // Save best weights
    this.bestWeightsDiff = bestCar.brain.toJSON();

    // Track fitness improvements
    if (bestCar.maxDistanceReached > this.bestFitnessDiff) {
      this.bestFitnessDiff = bestCar.maxDistanceReached;
    }

    // Increment generation
    this.generationDiff++;

    // Calculate adaptive mutation rate
    const minGenerationTime = 1.0;
    const effectiveTime = Math.max(generationTime, minGenerationTime);
    const adaptiveMutationRate = GA_MUTATION_RATE / effectiveTime;

    // Create next generation
    const nextGeneration: Car[] = [];

    // Create elite brain
    const eliteBrain = NeuralNetwork.fromJSON(
      this.bestWeightsDiff,
      this.rng.next() * 1000000,
      NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL
    );

    // DIFFERENTIAL CARS (50): 1 elite + 49 mutations
    for (let i = 0; i < halfPop; i++) {
      const angleWiggle = (this.rng.next() - 0.5) * (Math.PI / 2);
      const startAngle = track.startAngle + angleWiggle;

      if (i === 0) {
        // Elite diff car
        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            eliteBrain,
            DIFF_ELITE_CAR_COLOR,
            true
          )
        );
      } else {
        // Mutated diff car
        const mutationSeed = this.rng.next() * 1000000 + i + this.generationDiff * 10000;
        const multiplier = this.getMutationMultiplier(i, halfPop);
        const sigma = adaptiveMutationRate * multiplier;
        const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            mutatedBrain,
            DIFF_CAR_COLOR,
            true
          )
        );
      }
    }

    return nextGeneration;
  }

  // Export weights as JSON
  exportWeights(): string {
    return JSON.stringify(
      {
        generationNormal: this.generationNormal,
        generationDiff: this.generationDiff,
        bestFitnessNormal: this.bestFitnessNormal,
        bestFitnessDiff: this.bestFitnessDiff,
        bestWeightsNormal: this.bestWeightsNormal,
        bestWeightsDiff: this.bestWeightsDiff,
      },
      null,
      2
    );
  }

  // Import weights from JSON
  importWeights(json: string): void {
    try {
      const data = JSON.parse(json);
      this.generationNormal = data.generationNormal || 0;
      this.generationDiff = data.generationDiff || 0;
      this.bestFitnessNormal = data.bestFitnessNormal || 0;
      this.bestFitnessDiff = data.bestFitnessDiff || 0;
      this.bestWeightsNormal = data.bestWeightsNormal;
      this.bestWeightsDiff = data.bestWeightsDiff;
    } catch (error) {
      // Silently fail
    }
  }

  // Reset evolution
  reset(): void {
    this.generationNormal = 0;
    this.generationDiff = 0;
    this.bestFitnessNormal = 0;
    this.bestFitnessDiff = 0;
    this.bestWeightsNormal = null;
    this.bestWeightsDiff = null;
  }
}
