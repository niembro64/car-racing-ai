import { Car } from './Car';
import { NeuralNetwork } from './Neural';
import { Track } from './Track';
import { SeededRandom } from './math/geom';
import {
  POPULATION_SIZE,
  MUTATION_RATE,
  MUTATION_MIN_MULTIPLIER,
  MUTATION_MAX_MULTIPLIER,
  MUTATION_CURVE_POWER,
  ELITE_CAR_COLOR,
  NORMAL_CAR_COLOR,
  NETWORK_LAYERS
} from '@/config';

export class GeneticAlgorithm {
  generation: number = 0;
  bestFitness: number = 0;
  bestWeights: any = null;
  private rng: SeededRandom;

  constructor(seed: number) {
    this.rng = new SeededRandom(seed);
  }

  // Calculate mutation multiplier for a given brain index
  private getMutationMultiplier(index: number): number {
    if (index === 0) {
      return 0; // Elite car - no mutation
    }

    // Exponential curve from MUTATION_MIN_MULTIPLIER to MUTATION_MAX_MULTIPLIER
    const progress = (index - 1) / (POPULATION_SIZE - 2);
    const range = MUTATION_MAX_MULTIPLIER - MUTATION_MIN_MULTIPLIER;
    return MUTATION_MIN_MULTIPLIER + range * Math.pow(progress, MUTATION_CURVE_POWER);
  }

  // Calculate weighted average of multiple brains
  private averageBrains(brains: any[], weights: number[], weightSum: number): any {
    if (brains.length === 0) {
      throw new Error('Cannot average zero brains');
    }

    const template = brains[0];
    const averaged: any = {
      layers: []
    };

    // For each layer
    for (let layerIdx = 0; layerIdx < template.layers.length; layerIdx++) {
      const layer = template.layers[layerIdx];
      const avgWeights: number[][] = [];
      const avgBiases: number[] = [];

      // For each neuron in this layer
      for (let neuronIdx = 0; neuronIdx < layer.weights.length; neuronIdx++) {
        const neuronWeights: number[] = [];

        // For each weight in this neuron
        for (let weightIdx = 0; weightIdx < layer.weights[neuronIdx].length; weightIdx++) {
          let weightedSum = 0;
          for (let brainIdx = 0; brainIdx < brains.length; brainIdx++) {
            const brainWeight = brains[brainIdx].layers[layerIdx].weights[neuronIdx][weightIdx];
            weightedSum += brainWeight * weights[brainIdx];
          }
          neuronWeights.push(weightedSum / weightSum);
        }

        avgWeights.push(neuronWeights);

        // Average bias for this neuron
        let biasSum = 0;
        for (let brainIdx = 0; brainIdx < brains.length; brainIdx++) {
          const brainBias = brains[brainIdx].layers[layerIdx].biases[neuronIdx];
          biasSum += brainBias * weights[brainIdx];
        }
        avgBiases.push(biasSum / weightSum);
      }

      averaged.layers.push({
        weights: avgWeights,
        biases: avgBiases
      });
    }

    return averaged;
  }

  // Initialize first generation
  initializePopulation(track: Track): Car[] {
    const population: Car[] = [];

    console.log('Starting with random population');
    // Random initialization with unique seeds for diversity
    for (let i = 0; i < POPULATION_SIZE; i++) {
      const brain = NeuralNetwork.createRandom(this.rng.next() * 1000000 + i * 12345);
      population.push(
        new Car(
          track.startPosition.x,
          track.startPosition.y,
          track.startAngle,
          brain,
          NORMAL_CAR_COLOR
        )
      );
    }

    return population;
  }

  // Evolve to next generation
  evolvePopulation(population: Car[], track: Track, generationTime: number): Car[] {
    // Sort cars by maxDistanceReached (farthest position ever reached)
    const sortedCars = [...population].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

    // Log top performers with percentage
    const trackLength = track.getTotalLength();
    const topFitness = sortedCars.slice(0, 5).map((c, i) => {
      const percentage = (c.maxDistanceReached / trackLength * 100);
      const sign = percentage >= 0 ? '+' : '-';
      const absValue = Math.abs(percentage);
      const formatted = absValue.toFixed(1).padStart(4, ' ');
      return `#${i+1}=${sign}${formatted}%`;
    }).join(', ');
    console.log(`Top 5 fitness: ${topFitness}`);

    const bestMaxDistance = sortedCars[0].maxDistanceReached;
    const percentage = (bestMaxDistance / trackLength * 100);
    const sign = percentage >= 0 ? '+' : '-';
    const absValue = Math.abs(percentage);
    const bestPct = absValue.toFixed(1).padStart(4, ' ');
    console.log(`Best car: ${sign}${bestPct}%, position: (${sortedCars[0].x.toFixed(1)}, ${sortedCars[0].y.toFixed(1)})`);

    // Take all cars that reached at least 85% of the best car's distance
    const threshold = bestMaxDistance * 0.85;
    const topCars = sortedCars.filter(car => car.maxDistanceReached >= threshold);
    const topCount = Math.max(1, topCars.length); // Ensure at least 1 car (the best)
    const thresholdPercentage = (threshold / trackLength * 100);
    const thresholdSign = thresholdPercentage >= 0 ? '+' : '-';
    const thresholdAbs = Math.abs(thresholdPercentage);
    const thresholdPct = thresholdAbs.toFixed(1).padStart(4, ' ');
    console.log(`Averaging ${topCount} cars (≥85% of best: ${thresholdSign}${thresholdPct}%)`);

    // Calculate weights for selected cars - equal weighting for all cars above threshold
    const weights: number[] = [];
    let weightSum = 0;

    for (let rank = 0; rank < topCount; rank++) {
      // Equal weight: all qualifying cars weighted equally
      const weight = 1.0;
      weights.push(weight);
      weightSum += weight;
    }

    console.log(`Equal weighting: all ${topCount} qualifying cars weighted at 1.0 (simple average)`);

    // Create weighted average brain from top performers
    this.bestWeights = this.averageBrains(topCars.map(c => c.brain.toJSON()), weights, weightSum);

    // Track improvement
    if (bestMaxDistance > this.bestFitness) {
      this.bestFitness = bestMaxDistance;
      console.log(`Gen ${this.generation}: New best fitness = ${bestPct}%`);
    } else {
      console.log(`Gen ${this.generation}: Best fitness = ${bestPct}%`);
    }

    // Create next generation
    this.generation++;
    const nextGeneration: Car[] = [];

    const eliteBrain = NeuralNetwork.fromJSON(this.bestWeights, this.rng.next() * 1000000);

    // Print saved weights at start of generation
    if (this.bestWeights && this.bestWeights.layers && this.bestWeights.layers[0]) {
      const savedSampleWeights = this.bestWeights.layers[0].weights[0].slice(0, 5);
      const savedSampleBiases = this.bestWeights.layers[0].biases.slice(0, 5);
      console.log(`[Gen ${this.generation}] Saved weights:`, savedSampleWeights.map((w: number) => w.toFixed(4)));
      console.log(`[Gen ${this.generation}] Saved biases:`, savedSampleBiases.map((b: number) => b.toFixed(4)));
    }

    // Calculate adaptive mutation rate (inverse of generation time)
    // Use minimum threshold to prevent extreme mutation rates for very short generations
    const minGenerationTime = 1.0; // seconds
    const effectiveTime = Math.max(generationTime, minGenerationTime);
    const adaptiveMutationRate = MUTATION_RATE / effectiveTime;

    console.log(`Generation time: ${generationTime.toFixed(2)}s, Adaptive σ: ${adaptiveMutationRate.toFixed(4)} (base: ${MUTATION_RATE.toFixed(3)})`);

    // Calculate mutation range for logging
    const minMult = this.getMutationMultiplier(1);
    const midMult = this.getMutationMultiplier(Math.floor(POPULATION_SIZE / 2));
    const maxMult = this.getMutationMultiplier(POPULATION_SIZE - 1);
    console.log(`Starting Gen ${this.generation}:`);
    console.log(`  Brain 1: ${minMult.toFixed(2)}×, Brain ${Math.floor(POPULATION_SIZE/2)}: ${midMult.toFixed(2)}×, Brain ${POPULATION_SIZE-1}: ${maxMult.toFixed(2)}×`);

    // First car is exact elite copy
    nextGeneration.push(
      new Car(
        track.startPosition.x,
        track.startPosition.y,
        track.startAngle,
        eliteBrain,
        ELITE_CAR_COLOR
      )
    );

    // Rest are mutations with progressive mutation rates
    for (let i = 1; i < POPULATION_SIZE; i++) {
      const mutationSeed = this.rng.next() * 1000000 + i + this.generation * 10000;
      const multiplier = this.getMutationMultiplier(i);
      const sigma = adaptiveMutationRate * multiplier;

      const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);
      nextGeneration.push(
        new Car(
          track.startPosition.x,
          track.startPosition.y,
          track.startAngle,
          mutatedBrain,
          NORMAL_CAR_COLOR
        )
      );
    }

    // Verify mutation diversity by checking a few cars
    if (nextGeneration.length >= 4) {
      const samples = [
        1,
        Math.floor(POPULATION_SIZE * 0.33),
        Math.floor(POPULATION_SIZE * 0.66),
        POPULATION_SIZE - 1
      ];
      console.log('Mutation diversity check:');
      samples.forEach(idx => {
        if (idx < nextGeneration.length && idx > 0) {
          const carWeights = nextGeneration[idx].brain.toJSON();
          const w0 = carWeights.layers[0].weights[0][0];
          const savedW0 = this.bestWeights.layers[0].weights[0][0];
          const diff = Math.abs(w0 - savedW0);
          const mult = this.getMutationMultiplier(idx);
          console.log(`  Car ${idx}: multiplier=${mult.toFixed(2)}×, weight[0][0]=${w0.toFixed(4)}, diff from saved=${diff.toFixed(4)}`);
        }
      });
    }

    return nextGeneration;
  }

  // Export weights as JSON
  exportWeights(): string {
    return JSON.stringify({
      generation: this.generation,
      bestFitness: this.bestFitness,
      bestWeights: this.bestWeights
    }, null, 2);
  }

  // Import weights from JSON
  importWeights(json: string): void {
    try {
      const data = JSON.parse(json);
      this.generation = data.generation || 0;
      this.bestFitness = data.bestFitness || 0;
      this.bestWeights = data.bestWeights;
      console.log('Imported weights successfully');
    } catch (error) {
      console.error('Failed to import weights:', error);
    }
  }

  // Reset evolution
  reset(): void {
    this.generation = 0;
    this.bestFitness = 0;
    this.bestWeights = null;
    console.log('Reset evolution');
  }
}
