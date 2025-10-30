import { Car } from './Car';
import { NeuralNetwork } from './Neural';
import { Track } from './Track';
import { SeededRandom } from './math/geom';
import type { CarBrainConfig, ConfigEvolutionState } from '@/types';
import {
  getPopulationSize,
  GA_MUTATION_BASE,
  GA_MUTATION_PROGRESS_FACTOR,
  GA_MUTATION_MIN,
  GA_MUTATION_MIN_MULTIPLIER,
  GA_MUTATION_MAX_MULTIPLIER,
  GA_MUTATION_CURVE_POWER,
  CAR_BRAIN_CONFIGS,
  CAR_BRAIN_CONFIGS_DEFINED,
  CAR_START_ANGLE_WIGGLE,
} from '@/config';

export class GeneticAlgorithm {
  // Map from config ID to evolution state
  private stateByConfigId: Map<string, ConfigEvolutionState> = new Map();
  private rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);

    // Initialize state for all defined configs (including inactive ones)
    for (const config of CAR_BRAIN_CONFIGS_DEFINED) {
      this.stateByConfigId.set(config.id, {
        generation: 0,
        bestFitness: 0,
        bestWeights: null,
        totalTime: 0,
      });
    }
  }

  // Accessor methods for backward compatibility and convenience
  get generationNormReLU(): number {
    return this.stateByConfigId.get('normgelu')?.generation ?? 0;
  }

  get generationDiffLinear(): number {
    return this.stateByConfigId.get('difflinear')?.generation ?? 0;
  }

  get bestFitnessNormReLU(): number {
    return this.stateByConfigId.get('normgelu')?.bestFitness ?? 0;
  }

  get bestFitnessDiffLinear(): number {
    return this.stateByConfigId.get('difflinear')?.bestFitness ?? 0;
  }

  get bestWeightsNormReLU(): any {
    return this.stateByConfigId.get('normgelu')?.bestWeights ?? null;
  }

  get bestWeightsDiffLinear(): any {
    return this.stateByConfigId.get('difflinear')?.bestWeights ?? null;
  }

  // Generic accessors
  getGeneration(configId: string): number {
    return this.stateByConfigId.get(configId)?.generation ?? 0;
  }

  getBestFitness(configId: string): number {
    return this.stateByConfigId.get(configId)?.bestFitness ?? 0;
  }

  getBestWeights(configId: string): any {
    return this.stateByConfigId.get(configId)?.bestWeights ?? null;
  }

  getTotalTime(configId: string): number {
    return this.stateByConfigId.get(configId)?.totalTime ?? 0;
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

  // Initialize first generation with cars from all configured types
  initializePopulation(track: Track, populationSize?: number, configs?: CarBrainConfig[]): Car[] {
    const population: Car[] = [];
    const activeConfigs = configs ?? CAR_BRAIN_CONFIGS;
    const targetSize = populationSize ?? getPopulationSize();
    const carsPerType = Math.floor(targetSize / activeConfigs.length);

    for (const config of activeConfigs) {
      // Create cars for this type
      for (let i = 0; i < carsPerType; i++) {
        const brainSeed =
          Date.now() + Math.random() * 1000000 + i * Math.random() * 1000;

        const brain = NeuralNetwork.createRandom(
          brainSeed,
          config.nn.architecture,
          config.nn.activationType
        );

        const angleWiggle = (Math.random() - 0.5) * 2 * CAR_START_ANGLE_WIGGLE;
        const startAngle = track.startAngle + angleWiggle;

        const car = new Car(
          track.startPosition.x,
          track.startPosition.y,
          startAngle,
          brain,
          config.colors.dark,
          config.nn.inputModification,
          config.id,
          1.0  // Normal size for initial population
        );
        population.push(car);
      }
    }

    return population;
  }

  // Generic evolution method that works with any car brain configuration
  evolvePopulation(
    cars: Car[],
    config: CarBrainConfig,
    track: Track,
    generationTime: number,
    winnerCar?: Car,
    mutationByDistance: boolean = true,
    carsForThisType?: number
  ): Car[] {
    const state = this.stateByConfigId.get(config.id);
    if (!state) {
      throw new Error(`Unknown config ID: ${config.id}`);
    }

    // If no per-type size specified, use default divided equally
    const defaultTotalSize = getPopulationSize();
    const carsPerType = carsForThisType ?? Math.floor(defaultTotalSize / CAR_BRAIN_CONFIGS.length);

    // Sort by performance
    const sorted = [...cars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

    // Determine best car (accounting for winner)
    let bestCar: Car;
    if (winnerCar) {
      bestCar = winnerCar;
    } else {
      // Filter out elite cars (those with sizeMultiplier > 1.0) to find best non-elite
      const nonElite = sorted.filter(car => car.sizeMultiplier === 1.0);
      bestCar = nonElite[0] || sorted[0];
    }

    // Save best weights
    state.bestWeights = bestCar.brain.toJSON();

    // Update total time (accumulate generation time)
    state.totalTime += generationTime;

    // Track fitness improvements
    if (bestCar.maxDistanceReached > state.bestFitness) {
      state.bestFitness = bestCar.maxDistanceReached;
    }

    // Increment generation
    state.generation++;

    let baseMutationRate: number;
    if (mutationByDistance) {
      const trackLength = track.getTotalLength();
      // Use CURRENT generation's best, not all-time best
      const progressPercentage = bestCar.maxDistanceReached / trackLength;
      const mutationReduction = progressPercentage * GA_MUTATION_PROGRESS_FACTOR;
      baseMutationRate = Math.max(GA_MUTATION_MIN, GA_MUTATION_BASE - mutationReduction);
    } else {
      baseMutationRate = GA_MUTATION_MIN;
    }

    // Create next generation
    const nextGeneration: Car[] = [];

    // Create elite brain
    const eliteBrain = NeuralNetwork.fromJSON(
      state.bestWeights,
      this.rng.next() * 1000000,
      config.nn.architecture,
      config.nn.activationType
    );

    // Create cars: 1 elite + (carsPerType - 1) mutations
    for (let i = 0; i < carsPerType; i++) {
      const angleWiggle = (this.rng.next() - 0.5) * 2 * CAR_START_ANGLE_WIGGLE;
      const startAngle = track.startAngle + angleWiggle;

      if (i === 0) {
        // Elite car (exact copy of best brain, larger size)
        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            eliteBrain,
            config.colors.dark,
            config.nn.inputModification,
            config.id,
            1.5  // Elite cars are 1.5x larger
          )
        );
      } else {
        // Mutated car
        const mutationSeed = this.rng.next() * 1000000 + i + state.generation * 10000;

        // Apply mutation curve only when NOT using distance-based mutation
        // Distance-based mutation already provides enough variation
        const sigma = mutationByDistance
          ? baseMutationRate
          : baseMutationRate * this.getMutationMultiplier(i, carsPerType);

        const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            mutatedBrain,
            config.colors.dark,
            config.nn.inputModification,
            config.id,
            1.0  // Normal size for mutated cars
          )
        );
      }
    }

    return nextGeneration;
  }

  getCurrentMutationRate(configId: string, mutationByDistance: boolean, track: Track, currentBestDistance: number): number {
    const state = this.stateByConfigId.get(configId);
    if (!state) return 0;

    if (mutationByDistance) {
      const trackLength = track.getTotalLength();
      // Use CURRENT generation's best, not all-time best
      const progressPercentage = currentBestDistance / trackLength;
      const mutationReduction = progressPercentage * GA_MUTATION_PROGRESS_FACTOR;
      return Math.max(GA_MUTATION_MIN, GA_MUTATION_BASE - mutationReduction);
    } else {
      return GA_MUTATION_MIN;
    }
  }

  // Backward compatibility wrappers
  evolveNormReLUPopulation(
    normReLUCars: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    const config = CAR_BRAIN_CONFIGS.find(c => c.id === 'normgelu');
    if (!config) throw new Error('NormGeLU config not found');
    return this.evolvePopulation(normReLUCars, config, track, generationTime, winnerCar);
  }

  evolveDiffLinearPopulation(
    diffLinearCars: Car[],
    track: Track,
    generationTime: number,
    winnerCar?: Car
  ): Car[] {
    const config = CAR_BRAIN_CONFIGS.find(c => c.id === 'difflinear');
    if (!config) throw new Error('DiffLinear config not found');
    return this.evolvePopulation(diffLinearCars, config, track, generationTime, winnerCar);
  }

  // Export weights as JSON
  exportWeights(): string {
    // Convert Map to plain object for JSON serialization
    const stateObject: Record<string, ConfigEvolutionState> = {};
    for (const [configId, state] of this.stateByConfigId.entries()) {
      stateObject[configId] = state;
    }

    // Also include backward-compatible keys for existing save files
    return JSON.stringify(
      {
        stateByConfigId: stateObject,
        // Backward compatibility
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

      // Try new format first
      if (data.stateByConfigId) {
        for (const [configId, state] of Object.entries(data.stateByConfigId)) {
          this.stateByConfigId.set(configId, state as ConfigEvolutionState);
        }
      } else {
        // Fall back to old format for backward compatibility
        const normreluState = this.stateByConfigId.get('normrelu');
        const difflinearState = this.stateByConfigId.get('difflinear');

        if (normreluState) {
          normreluState.generation = data.generationNormReLU || 0;
          normreluState.bestFitness = data.bestFitnessNormReLU || 0;
          normreluState.bestWeights = data.bestWeightsNormReLU || null;
        }

        if (difflinearState) {
          difflinearState.generation = data.generationDiffLinear || 0;
          difflinearState.bestFitness = data.bestFitnessDiffLinear || 0;
          difflinearState.bestWeights = data.bestWeightsDiffLinear || null;
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Reset evolution
  reset(): void {
    for (const state of this.stateByConfigId.values()) {
      state.generation = 0;
      state.bestFitness = 0;
      state.bestWeights = null;
      state.totalTime = 0;
    }
  }
}
