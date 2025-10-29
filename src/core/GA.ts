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
  NORM_RELU_CAR_COLOR,
  NORM_RELU_ELITE_CAR_COLOR,
  DIFF_LINEAR_CAR_COLOR,
  DIFF_LINEAR_ELITE_CAR_COLOR,
  NEURAL_NETWORK_ARCHITECTURE_STANDARD,
  NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL,
} from '@/config';

export class GeneticAlgorithm {
  generationNormReLU: number = 0;
  generationDiffLinear: number = 0;
  bestFitnessNormReLU: number = 0;
  bestFitnessDiffLinear: number = 0;
  bestWeightsNormReLU: any = null;
  bestWeightsDiffLinear: any = null;
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

  // Initialize first generation with both NormReLU and DiffLinear cars
  initializePopulation(track: Track): Car[] {
    const population: Car[] = [];
    const halfPop = GA_POPULATION_SIZE / 2;

    // Create 50 NormReLU cars (blue) - 9 inputs, ReLU activation
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
        NORM_RELU_CAR_COLOR,
        false // NormReLU: 9 standard inputs
      );
      population.push(car);
    }

    // Create 50 DiffLinear cars (red) - 5 inputs, Linear activation
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
        DIFF_LINEAR_CAR_COLOR,
        true // DiffLinear: 5 differential inputs
      );
      population.push(car);
    }

    return population;
  }

  // Evolve NormReLU population independently
  evolveNormReLUPopulation(
    normReLUCars: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    const halfPop = GA_POPULATION_SIZE / 2;

    // Sort by performance
    const sorted = [...normReLUCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

    // Determine best car (accounting for winner)
    let bestCar: Car;
    if (winnerCar) {
      bestCar = winnerCar;
    } else {
      const nonElite = sorted.filter(car => car.color !== NORM_RELU_ELITE_CAR_COLOR);
      bestCar = nonElite[0] || sorted[0];
    }

    // Save best weights
    this.bestWeightsNormReLU = bestCar.brain.toJSON();

    // Track fitness improvements
    if (bestCar.maxDistanceReached > this.bestFitnessNormReLU) {
      this.bestFitnessNormReLU = bestCar.maxDistanceReached;
    }

    // Increment generation
    this.generationNormReLU++;

    // Calculate adaptive mutation rate
    const minGenerationTime = 1.0;
    const effectiveTime = Math.max(generationTime, minGenerationTime);
    const adaptiveMutationRate = GA_MUTATION_RATE / effectiveTime;

    // Create next generation
    const nextGeneration: Car[] = [];

    // Create elite brain
    const eliteBrain = NeuralNetwork.fromJSON(
      this.bestWeightsNormReLU,
      this.rng.next() * 1000000,
      NEURAL_NETWORK_ARCHITECTURE_STANDARD
    );

    // NORMRELU CARS (50): 1 elite + 49 mutations
    for (let i = 0; i < halfPop; i++) {
      const angleWiggle = (this.rng.next() - 0.5) * (Math.PI / 2);
      const startAngle = track.startAngle + angleWiggle;

      if (i === 0) {
        // Elite NormReLU car
        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            eliteBrain,
            NORM_RELU_ELITE_CAR_COLOR,
            false
          )
        );
      } else {
        // Mutated NormReLU car
        const mutationSeed = this.rng.next() * 1000000 + i + this.generationNormReLU * 10000;
        const multiplier = this.getMutationMultiplier(i, halfPop);
        const sigma = adaptiveMutationRate * multiplier;
        const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            mutatedBrain,
            NORM_RELU_CAR_COLOR,
            false
          )
        );
      }
    }

    return nextGeneration;
  }

  // Evolve DiffLinear population independently
  evolveDiffLinearPopulation(
    diffLinearCars: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    const halfPop = GA_POPULATION_SIZE / 2;

    // Sort by performance
    const sorted = [...diffLinearCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

    // Determine best car (accounting for winner)
    let bestCar: Car;
    if (winnerCar) {
      bestCar = winnerCar;
    } else {
      const nonElite = sorted.filter(car => car.color !== DIFF_LINEAR_ELITE_CAR_COLOR);
      bestCar = nonElite[0] || sorted[0];
    }

    // Save best weights
    this.bestWeightsDiffLinear = bestCar.brain.toJSON();

    // Track fitness improvements
    if (bestCar.maxDistanceReached > this.bestFitnessDiffLinear) {
      this.bestFitnessDiffLinear = bestCar.maxDistanceReached;
    }

    // Increment generation
    this.generationDiffLinear++;

    // Calculate adaptive mutation rate
    const minGenerationTime = 1.0;
    const effectiveTime = Math.max(generationTime, minGenerationTime);
    const adaptiveMutationRate = GA_MUTATION_RATE / effectiveTime;

    // Create next generation
    const nextGeneration: Car[] = [];

    // Create elite brain
    const eliteBrain = NeuralNetwork.fromJSON(
      this.bestWeightsDiffLinear,
      this.rng.next() * 1000000,
      NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL
    );

    // DIFFLINEAR CARS (50): 1 elite + 49 mutations
    for (let i = 0; i < halfPop; i++) {
      const angleWiggle = (this.rng.next() - 0.5) * (Math.PI / 2);
      const startAngle = track.startAngle + angleWiggle;

      if (i === 0) {
        // Elite DiffLinear car
        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            eliteBrain,
            DIFF_LINEAR_ELITE_CAR_COLOR,
            true
          )
        );
      } else {
        // Mutated DiffLinear car
        const mutationSeed = this.rng.next() * 1000000 + i + this.generationDiffLinear * 10000;
        const multiplier = this.getMutationMultiplier(i, halfPop);
        const sigma = adaptiveMutationRate * multiplier;
        const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            mutatedBrain,
            DIFF_LINEAR_CAR_COLOR,
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
        generationNormReLU: this.generationNormReLU,
        generationDiffLinear: this.generationDiffLinear,
        bestFitnessNormReLU: this.bestFitnessNormReLU,
        bestFitnessDiffLinear: this.bestFitnessDiffLinear,
        bestWeightsNormReLU: this.bestWeightsNormReLU,
        bestWeightsDiffLinear: this.bestWeightsDiffLinear,
      },
      null,
      2
    );
  }

  // Import weights from JSON
  importWeights(json: string): void {
    try {
      const data = JSON.parse(json);
      this.generationNormReLU = data.generationNormReLU || 0;
      this.generationDiffLinear = data.generationDiffLinear || 0;
      this.bestFitnessNormReLU = data.bestFitnessNormReLU || 0;
      this.bestFitnessDiffLinear = data.bestFitnessDiffLinear || 0;
      this.bestWeightsNormReLU = data.bestWeightsNormReLU;
      this.bestWeightsDiffLinear = data.bestWeightsDiffLinear;
    } catch (error) {
      // Silently fail
    }
  }

  // Reset evolution
  reset(): void {
    this.generationNormReLU = 0;
    this.generationDiffLinear = 0;
    this.bestFitnessNormReLU = 0;
    this.bestFitnessDiffLinear = 0;
    this.bestWeightsNormReLU = null;
    this.bestWeightsDiffLinear = null;
  }
}
