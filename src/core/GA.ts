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
  generation: number = 0;
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

  // Evolve to next generation with dual populations
  evolvePopulation(
    population: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    const halfPop = GA_POPULATION_SIZE / 2;

    // Separate cars by input type
    const normalCars = population.filter(car => !car.useDifferentialInputs);
    const diffCars = population.filter(car => car.useDifferentialInputs);

    // Sort each group by performance
    const sortedNormal = [...normalCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);
    const sortedDiff = [...diffCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

    // Determine best car for each type (accounting for winner)
    let bestNormalCar: Car;
    let bestDiffCar: Car;

    if (winnerCar) {
      // Winner completed lap - use as best for its type
      if (winnerCar.useDifferentialInputs) {
        bestDiffCar = winnerCar;
        // For normal, use best from its group (excluding elite)
        const nonEliteNormal = sortedNormal.filter(car => car.color !== NORMAL_ELITE_CAR_COLOR);
        bestNormalCar = nonEliteNormal[0] || sortedNormal[0];
      } else {
        bestNormalCar = winnerCar;
        // For diff, use best from its group (excluding elite)
        const nonEliteDiff = sortedDiff.filter(car => car.color !== DIFF_ELITE_CAR_COLOR);
        bestDiffCar = nonEliteDiff[0] || sortedDiff[0];
      }
    } else {
      // No winner - use best from each group (excluding elites)
      const nonEliteNormal = sortedNormal.filter(car => car.color !== NORMAL_ELITE_CAR_COLOR);
      const nonEliteDiff = sortedDiff.filter(car => car.color !== DIFF_ELITE_CAR_COLOR);
      bestNormalCar = nonEliteNormal[0] || sortedNormal[0];
      bestDiffCar = nonEliteDiff[0] || sortedDiff[0];
    }

    // Save best weights for each type
    this.bestWeightsNormal = bestNormalCar.brain.toJSON();
    this.bestWeightsDiff = bestDiffCar.brain.toJSON();

    // Track fitness improvements
    if (bestNormalCar.maxDistanceReached > this.bestFitnessNormal) {
      this.bestFitnessNormal = bestNormalCar.maxDistanceReached;
    }
    if (bestDiffCar.maxDistanceReached > this.bestFitnessDiff) {
      this.bestFitnessDiff = bestDiffCar.maxDistanceReached;
    }

    // Increment generation
    this.generation++;

    // Calculate adaptive mutation rate
    const minGenerationTime = 1.0;
    const effectiveTime = Math.max(generationTime, minGenerationTime);
    const adaptiveMutationRate = GA_MUTATION_RATE / effectiveTime;

    // Create next generation
    const nextGeneration: Car[] = [];

    // Create elite normal brain
    const eliteNormalBrain = NeuralNetwork.fromJSON(
      this.bestWeightsNormal,
      this.rng.next() * 1000000,
      NEURAL_NETWORK_ARCHITECTURE_STANDARD
    );

    // Create elite diff brain
    const eliteDiffBrain = NeuralNetwork.fromJSON(
      this.bestWeightsDiff,
      this.rng.next() * 1000000,
      NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL
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
            eliteNormalBrain,
            NORMAL_ELITE_CAR_COLOR,
            false
          )
        );
      } else {
        // Mutated normal car
        const mutationSeed = this.rng.next() * 1000000 + i + this.generation * 10000;
        const multiplier = this.getMutationMultiplier(i, halfPop);
        const sigma = adaptiveMutationRate * multiplier;
        const mutatedBrain = eliteNormalBrain.mutate(sigma, mutationSeed);

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
            eliteDiffBrain,
            DIFF_ELITE_CAR_COLOR,
            true
          )
        );
      } else {
        // Mutated diff car
        const mutationSeed = this.rng.next() * 1000000 + (i + halfPop) + this.generation * 10000;
        const multiplier = this.getMutationMultiplier(i, halfPop);
        const sigma = adaptiveMutationRate * multiplier;
        const mutatedBrain = eliteDiffBrain.mutate(sigma, mutationSeed);

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
        generation: this.generation,
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
      this.generation = data.generation || 0;
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
    this.generation = 0;
    this.bestFitnessNormal = 0;
    this.bestFitnessDiff = 0;
    this.bestWeightsNormal = null;
    this.bestWeightsDiff = null;
  }
}
