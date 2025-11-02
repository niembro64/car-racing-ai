import { Car } from './Car';
import { NeuralNetwork, averageNetworkWeights } from './Neural';
import { Track } from './Track';
import { SeededRandom } from './math/geom';
import type { CarBrainConfig, ConfigEvolutionState, BrainSelectionStrategy } from '@/types';
import {
  CONFIG,
  getPopulationSize,
  getMutationRate,
  countTrainableParameters,
  getParameterBasedMutationScale,
} from '@/config';
import { CAR_BRAIN_CONFIGS, CAR_BRAIN_CONFIGS_DEFINED } from './config_cars';
import { TEXT_CHARACTER } from './config_text';

export class GeneticAlgorithm {
  // Map from config shortName to evolution state
  private stateByShortName: Map<string, ConfigEvolutionState> = new Map();
  private rng: SeededRandom;
  private minParameters: number;
  private maxParameters: number;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);

    // Calculate min/max trainable parameters across all architectures
    // Used for parameter-based mutation scaling
    this.minParameters = Infinity;
    this.maxParameters = 0;
    for (const config of CAR_BRAIN_CONFIGS_DEFINED) {
      const paramCount = countTrainableParameters(config.nn.architecture);
      this.minParameters = Math.min(this.minParameters, paramCount);
      this.maxParameters = Math.max(this.maxParameters, paramCount);
    }

    // Initialize state for all defined configs (including inactive ones)
    for (const config of CAR_BRAIN_CONFIGS_DEFINED) {
      this.stateByShortName.set(config.shortName, {
        generation: 0,
        bestFitnessLastGeneration: 0,
        bestWeightsLastGeneration: null,
        bestFitnessAllTime: 0,
        bestWeightsAllTime: null,
        totalTime: 0,
      });
    }
  }

  // Generic accessors
  getGeneration(shortName: string): number {
    return this.stateByShortName.get(shortName)?.generation ?? 0;
  }

  getBestFitness(shortName: string): number {
    // Return all-time best fitness for display purposes
    return this.stateByShortName.get(shortName)?.bestFitnessAllTime ?? 0;
  }

  getBestWeights(shortName: string): any {
    // Return all-time best weights for display purposes
    return this.stateByShortName.get(shortName)?.bestWeightsAllTime ?? null;
  }

  getTotalTime(shortName: string): number {
    return this.stateByShortName.get(shortName)?.totalTime ?? 0;
  }

  // Calculate mutation multiplier for a given brain index within a subpopulation
  private getMutationMultiplier(index: number, subPopSize: number): number {
    if (index === 0) {
      return 0; // Elite car - no mutation
    }

    const progress = (index - 1) / (subPopSize - 2);
    const range = CONFIG.geneticAlgorithm.mutation.rankMultiplier.max - CONFIG.geneticAlgorithm.mutation.rankMultiplier.min;
    return (
      CONFIG.geneticAlgorithm.mutation.rankMultiplier.min +
      range * Math.pow(progress, CONFIG.geneticAlgorithm.mutation.rankMultiplier.curvePower)
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

        const angleWiggle = (Math.random() - 0.5) * 2 * CONFIG.car.spawn.angleWiggle;
        const startAngle = track.startAngle + angleWiggle;

        const car = new Car(
          track.startPosition.x,
          track.startPosition.y,
          startAngle,
          brain,
          config.colors.dark,
          config.nn.inputModification,
          config.shortName,
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
    carsForThisType?: number,
    brainSelectionStrategy?: BrainSelectionStrategy
  ): Car[] {
    const state = this.stateByShortName.get(config.shortName);
    if (!state) {
      throw new Error(`Unknown config shortName: ${config.shortName}`);
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

    // Update total time (accumulate generation time)
    state.totalTime += generationTime;

    // ALWAYS update best from last generation
    const currentGenBestWeights = bestCar.brain.toJSON();
    state.bestWeightsLastGeneration = currentGenBestWeights;
    state.bestFitnessLastGeneration = bestCar.maxDistanceReached;

    // Apply brain selection strategy to determine what to use for next generation
    const strategy = brainSelectionStrategy || 'alltime'; // Default to all-time best

    // Determine which brain to use for seeding next generation
    let brainToSeed: any;

    switch (strategy) {
      case 'generation':
        // Strategy 1: Use current generation's best to seed next generation
        // Still track all-time best for comparison/display
        brainToSeed = state.bestWeightsLastGeneration;

        // Track all-time best
        if (bestCar.maxDistanceReached > state.bestFitnessAllTime) {
          const previousAllTime = state.bestFitnessAllTime;
          state.bestWeightsAllTime = currentGenBestWeights;
          state.bestFitnessAllTime = bestCar.maxDistanceReached;

          if (previousAllTime > 0) {
            const improvement = ((bestCar.maxDistanceReached - previousAllTime) / previousAllTime * 100).toFixed(1);
            console.log(`[${config.shortName}] ${TEXT_CHARACTER.repeat} Gen ${state.generation}: Using gen best (${bestCar.maxDistanceReached.toFixed(0)}). New all-time: ${previousAllTime.toFixed(0)} ${TEXT_CHARACTER.neutral} ${bestCar.maxDistanceReached.toFixed(0)} (+${improvement}%)`);
          } else {
            console.log(`[${config.shortName}] ${TEXT_CHARACTER.repeat} Gen ${state.generation}: Using gen best (${bestCar.maxDistanceReached.toFixed(0)}). First all-time best.`);
          }
        } else if (state.bestFitnessAllTime > 0) {
          const regression = ((state.bestFitnessAllTime - bestCar.maxDistanceReached) / state.bestFitnessAllTime * 100).toFixed(1);
          console.log(`[${config.shortName}] ${TEXT_CHARACTER.repeat} Gen ${state.generation}: Using gen best (${bestCar.maxDistanceReached.toFixed(0)}, -${regression}% from all-time ${state.bestFitnessAllTime.toFixed(0)})`);
        } else {
          console.log(`[${config.shortName}] ${TEXT_CHARACTER.repeat} Gen ${state.generation}: Using gen best (${bestCar.maxDistanceReached.toFixed(0)})`);
        }
        break;

      case 'alltime':
        // Strategy 2: Only update all-time best if equal or better, use it to seed
        if (bestCar.maxDistanceReached >= state.bestFitnessAllTime) {
          state.bestWeightsAllTime = currentGenBestWeights;
          const previousAllTime = state.bestFitnessAllTime;
          state.bestFitnessAllTime = bestCar.maxDistanceReached;

          if (previousAllTime > 0) {
            const improvement = ((bestCar.maxDistanceReached - previousAllTime) / previousAllTime * 100).toFixed(1);
            console.log(`[${config.shortName}] ${TEXT_CHARACTER.trophy} Gen ${state.generation}: New all-time best! ${previousAllTime.toFixed(0)} ${TEXT_CHARACTER.neutral} ${bestCar.maxDistanceReached.toFixed(0)} (+${improvement}%)`);
          } else {
            console.log(`[${config.shortName}] ${TEXT_CHARACTER.trophy} Gen ${state.generation}: First all-time best: ${bestCar.maxDistanceReached.toFixed(0)}`);
          }
        } else {
          console.log(`[${config.shortName}] ${TEXT_CHARACTER.trophy} Gen ${state.generation}: No improvement (gen: ${bestCar.maxDistanceReached.toFixed(0)}, all-time: ${state.bestFitnessAllTime.toFixed(0)}). Keeping all-time brain.`);
        }

        brainToSeed = state.bestWeightsAllTime;
        break;

      case 'averaging':
        // Strategy 3: Average all-time best with current generation's best
        // On first generation, just use the first brain
        if (!state.bestWeightsAllTime || state.bestFitnessAllTime === 0) {
          state.bestWeightsAllTime = currentGenBestWeights;
          state.bestFitnessAllTime = bestCar.maxDistanceReached;
          brainToSeed = state.bestWeightsAllTime;
          console.log(`[${config.shortName}] ${TEXT_CHARACTER.sexual} Gen ${state.generation}: First brain: ${bestCar.maxDistanceReached.toFixed(0)}`);
        } else {
          // Average the two brains
          const averagedWeights = averageNetworkWeights(state.bestWeightsAllTime, currentGenBestWeights);
          state.bestWeightsAllTime = averagedWeights;
          brainToSeed = averagedWeights;

          // Track the max fitness seen
          const previousMaxFitness = state.bestFitnessAllTime;
          state.bestFitnessAllTime = Math.max(state.bestFitnessAllTime, bestCar.maxDistanceReached);

          console.log(`[${config.shortName}] ${TEXT_CHARACTER.sexual} Gen ${state.generation}: Averaged (all-time fitness: ${previousMaxFitness.toFixed(0)}, gen: ${bestCar.maxDistanceReached.toFixed(0)}, max seen: ${state.bestFitnessAllTime.toFixed(0)})`);
        }
        break;
    }

    // Increment generation
    state.generation++;

    // Calculate base mutation rate using the helper function
    const trackLength = track.getTotalLength();
    const baseMutationRate = getMutationRate(
      mutationByDistance,
      bestCar.maxDistanceReached,
      trackLength
    );

    // Apply parameter-based scaling (larger networks get lower mutation rates)
    const paramCount = countTrainableParameters(config.nn.architecture);
    const paramScale = getParameterBasedMutationScale(
      paramCount,
      this.minParameters,
      this.maxParameters
    );
    const scaledMutationRate = baseMutationRate * paramScale;

    // Create next generation
    const nextGeneration: Car[] = [];

    // Create elite brain from the seed brain determined by strategy
    const eliteBrain = NeuralNetwork.fromJSON(
      brainToSeed,
      this.rng.next() * 1000000,
      config.nn.architecture,
      config.nn.activationType
    );

    // Create cars: 1 elite + (carsPerType - 1) mutations
    for (let i = 0; i < carsPerType; i++) {
      const angleWiggle = (this.rng.next() - 0.5) * 2 * CONFIG.car.spawn.angleWiggle;
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
            config.shortName,
            1.5  // Elite cars are 1.5x larger
          )
        );
      } else {
        // Mutated car
        const mutationSeed = this.rng.next() * 1000000 + i + state.generation * 10000;

        // Apply mutation curve only when NOT using distance-based mutation
        // Distance-based mutation already provides enough variation
        // Note: scaledMutationRate already includes parameter-based scaling
        const sigma = mutationByDistance
          ? scaledMutationRate
          : scaledMutationRate * this.getMutationMultiplier(i, carsPerType);

        const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

        nextGeneration.push(
          new Car(
            track.startPosition.x,
            track.startPosition.y,
            startAngle,
            mutatedBrain,
            config.colors.dark,
            config.nn.inputModification,
            config.shortName,
            1.0  // Normal size for mutated cars
          )
        );
      }
    }

    return nextGeneration;
  }

  getCurrentMutationRate(shortName: string, mutationByDistance: boolean, track: Track, currentBestDistance: number): number {
    const state = this.stateByShortName.get(shortName);
    if (!state) return 0;

    const trackLength = track.getTotalLength();
    return getMutationRate(mutationByDistance, currentBestDistance, trackLength);
  }

  // Export weights as JSON
  exportWeights(): string {
    // Convert Map to plain object for JSON serialization
    const stateObject: Record<string, ConfigEvolutionState> = {};
    for (const [shortName, state] of this.stateByShortName.entries()) {
      stateObject[shortName] = state;
    }

    return JSON.stringify(
      {
        stateByShortName: stateObject,
      },
      null,
      2
    );
  }

  // Import weights from JSON
  importWeights(json: string): void {
    try {
      const data = JSON.parse(json);

      // Load state by shortName
      if (data.stateByShortName) {
        for (const [shortName, stateData] of Object.entries(data.stateByShortName)) {
          const state = stateData as any;

          // Migration: Handle old format (bestFitness/bestWeights) -> new format
          // Old format only had one brain, we'll treat it as all-time best
          if (state.bestFitness !== undefined && state.bestWeights !== undefined) {
            // Old format detected
            const migratedState: ConfigEvolutionState = {
              generation: state.generation || 0,
              bestFitnessLastGeneration: state.bestFitness || 0,
              bestWeightsLastGeneration: state.bestWeights || null,
              bestFitnessAllTime: state.bestFitness || 0,
              bestWeightsAllTime: state.bestWeights || null,
              totalTime: state.totalTime || 0,
            };
            this.stateByShortName.set(shortName, migratedState);
          } else {
            // New format - use as-is
            this.stateByShortName.set(shortName, state as ConfigEvolutionState);
          }
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Reset evolution
  reset(): void {
    for (const state of this.stateByShortName.values()) {
      state.generation = 0;
      state.bestFitnessLastGeneration = 0;
      state.bestWeightsLastGeneration = null;
      state.bestFitnessAllTime = 0;
      state.bestWeightsAllTime = null;
      state.totalTime = 0;
    }
  }
}
