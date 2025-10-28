import { Car } from './Car';
import { NeuralNetwork } from './Neural';
import { Track } from './Track';
import { SeededRandom } from './math/geom';
import {
  POPULATION_SIZE,
  INITIAL_SIGMA,
  MIN_SIGMA,
  STAGNATION_THRESHOLD,
  MUTATION_CURVE_TYPE,
  MUTATION_MIN_MULTIPLIER,
  MUTATION_MAX_MULTIPLIER,
  MUTATION_CURVE_POWER,
  ELITE_CAR_COLOR,
  NETWORK_LAYERS
} from '@/config';

export class GeneticAlgorithm {
  generation: number = 0;
  bestFitness: number = 0;
  bestWeights: any = null;
  currentSigma: number = INITIAL_SIGMA;

  private stagnationCounter: number = 0;
  private lastBestFitness: number = 0;
  private rng: SeededRandom;

  constructor(seed: number = 12345) {
    this.rng = new SeededRandom(seed);
  }

  // Calculate mutation multiplier for a given brain index
  private getMutationMultiplier(index: number): number {
    if (index === 0) {
      // Elite car - no mutation
      return 0;
    }

    // Calculate progress from 0 to 1 for indices 1 to POPULATION_SIZE-1
    const progress = (index - 1) / (POPULATION_SIZE - 2);

    if (MUTATION_CURVE_TYPE === 'linear') {
      // Linear interpolation
      return MUTATION_MIN_MULTIPLIER +
             (MUTATION_MAX_MULTIPLIER - MUTATION_MIN_MULTIPLIER) * progress;
    } else {
      // Exponential curve: multiplier = min + (max - min) * progress^power
      const range = MUTATION_MAX_MULTIPLIER - MUTATION_MIN_MULTIPLIER;
      return MUTATION_MIN_MULTIPLIER + range * Math.pow(progress, MUTATION_CURVE_POWER);
    }
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
          brain
        )
      );
    }

    return population;
  }

  // Evolve to next generation
  evolvePopulation(population: Car[], track: Track): Car[] {
    // Sort cars by signedFitness (best to worst) - can be negative, can be > trackLength
    const sortedCars = [...population].sort((a, b) => b.signedFitness - a.signedFitness);

    // Log top performers with percentage
    const trackLength = track.getTotalLength();
    const topFitness = sortedCars.slice(0, 5).map((c, i) => {
      const pct = (c.signedFitness / trackLength * 100).toFixed(1);
      return `#${i+1}=${pct}%`;
    }).join(', ');
    console.log(`Top 5 fitness: ${topFitness}`);

    const bestSignedFitness = sortedCars[0].signedFitness;
    const bestPct = (bestSignedFitness / trackLength * 100).toFixed(1);
    console.log(`Best car: ${bestPct}%, position: (${sortedCars[0].x.toFixed(1)}, ${sortedCars[0].y.toFixed(1)})`);

    // Take only top 10% of cars
    const topCount = Math.max(1, Math.ceil(sortedCars.length * 0.1));
    const topCars = sortedCars.slice(0, topCount);
    console.log(`Averaging top ${topCount} cars (top 10%)`);

    // Calculate weights for top cars
    // 100th percentile (best) = 1.0, 90th percentile (worst of top 10%) = 0.0
    const weights: number[] = [];
    let weightSum = 0;

    for (let rank = 0; rank < topCount; rank++) {
      // Linear weight: rank 0 (best) = 1.0, rank (topCount-1) = 0.0
      const weight = topCount > 1 ? (topCount - 1 - rank) / (topCount - 1) : 1.0;
      weights.push(weight);
      weightSum += weight;
    }

    console.log(`Weight distribution: 1st=${weights[0].toFixed(2)}, ${topCount > 1 ? `mid=${weights[Math.floor(topCount/2)].toFixed(2)}, ` : ''}last=${weights[topCount-1].toFixed(2)}`);

    // Create weighted average brain from top performers
    this.bestWeights = this.averageBrains(topCars.map(c => c.brain.toJSON()), weights, weightSum);

    // Track improvement using signedFitness
    const improved = bestSignedFitness > this.bestFitness;
    if (improved) {
      this.bestFitness = bestSignedFitness;
      this.stagnationCounter = 0;
      console.log(`Gen ${this.generation}: New best fitness = ${bestPct}%`);
    } else {
      this.stagnationCounter++;
      console.log(`Gen ${this.generation}: Best fitness = ${bestPct}% (stagnation: ${this.stagnationCounter})`);
    }

    // Adjust mutation rate if stagnating
    if (this.stagnationCounter >= STAGNATION_THRESHOLD) {
      this.currentSigma = Math.max(MIN_SIGMA, this.currentSigma * 0.8);
      console.log(`Reduced sigma to ${this.currentSigma.toFixed(4)}`);
      this.stagnationCounter = 0;
    }

    // Create next generation
    this.generation++;
    const nextGeneration: Car[] = [];

    const eliteBrain = NeuralNetwork.fromJSON(this.bestWeights);

    // Print saved weights at start of generation
    if (this.bestWeights && this.bestWeights.layers && this.bestWeights.layers[0]) {
      const savedSampleWeights = this.bestWeights.layers[0].weights[0].slice(0, 5);
      const savedSampleBiases = this.bestWeights.layers[0].biases.slice(0, 5);
      console.log(`[Gen ${this.generation}] Saved weights:`, savedSampleWeights.map((w: number) => w.toFixed(4)));
      console.log(`[Gen ${this.generation}] Saved biases:`, savedSampleBiases.map((b: number) => b.toFixed(4)));
    }

    // Calculate mutation range for logging
    const minMult = this.getMutationMultiplier(1);
    const midMult = this.getMutationMultiplier(Math.floor(POPULATION_SIZE / 2));
    const maxMult = this.getMutationMultiplier(POPULATION_SIZE - 1);
    console.log(`Starting Gen ${this.generation} with ${MUTATION_CURVE_TYPE} mutation curve:`);
    console.log(`  Brain 1: ${minMult.toFixed(2)}× sigma, Brain ${Math.floor(POPULATION_SIZE/2)}: ${midMult.toFixed(2)}× sigma, Brain ${POPULATION_SIZE-1}: ${maxMult.toFixed(2)}× sigma, base σ=${this.currentSigma.toFixed(3)}`);

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
      const sigma = this.currentSigma * multiplier;

      const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);
      nextGeneration.push(
        new Car(
          track.startPosition.x,
          track.startPosition.y,
          track.startAngle,
          mutatedBrain
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
      bestWeights: this.bestWeights,
      sigma: this.currentSigma
    }, null, 2);
  }

  // Import weights from JSON
  importWeights(json: string): void {
    try {
      const data = JSON.parse(json);
      this.generation = data.generation || 0;
      this.bestFitness = data.bestFitness || 0;
      this.bestWeights = data.bestWeights;
      this.currentSigma = data.sigma || INITIAL_SIGMA;
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
    this.currentSigma = INITIAL_SIGMA;
    this.stagnationCounter = 0;
    console.log('Reset evolution');
  }
}
