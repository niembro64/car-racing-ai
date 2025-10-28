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
  NORMAL_CAR_COLOR
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

    // Exponential curve from GA_MUTATION_MIN_MULTIPLIER to GA_MUTATION_MAX_MULTIPLIER
    const progress = (index - 1) / (GA_POPULATION_SIZE - 2);
    const range = GA_MUTATION_MAX_MULTIPLIER - GA_MUTATION_MIN_MULTIPLIER;
    return GA_MUTATION_MIN_MULTIPLIER + range * Math.pow(progress, GA_MUTATION_CURVE_POWER);
  }

  // Initialize first generation
  initializePopulation(track: Track): Car[] {
    const population: Car[] = [];

    console.log('Starting with random population');
    console.log(`Spawning ${GA_POPULATION_SIZE} cars at (${track.startPosition.x.toFixed(1)}, ${track.startPosition.y.toFixed(1)}) with random angles`);

    // Truly random initialization - each car gets a unique random seed and angle
    for (let i = 0; i < GA_POPULATION_SIZE; i++) {
      // Use Math.random() directly for true randomness in initial population
      const brainSeed = Date.now() + Math.random() * 1000000 + i * Math.random() * 1000;
      const brain = NeuralNetwork.createRandom(brainSeed);

      // Random starting angle for diversity
      const randomAngle = Math.random() * Math.PI * 2;

      const car = new Car(
        track.startPosition.x,
        track.startPosition.y,
        randomAngle,
        brain,
        NORMAL_CAR_COLOR
      );
      population.push(car);
    }

    console.log(`Created ${population.length} cars, all alive: ${population.every(c => c.alive)}`);
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

    // Filter out the elite car (exact copy) and select best from mutated cars
    const mutatedCars = sortedCars.filter(car => car.color !== ELITE_CAR_COLOR);
    const bestMutatedCar = mutatedCars[0];

    if (bestMutatedCar) {
      console.log(`Using best mutated car's brain (excluding elite copy)`);
      this.bestWeights = bestMutatedCar.brain.toJSON();
    } else {
      // Fallback: if no mutated cars (shouldn't happen), use the best overall
      console.log(`Fallback: using best car's brain (no mutated cars found)`);
      this.bestWeights = sortedCars[0].brain.toJSON();
    }

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
    const adaptiveMutationRate = GA_MUTATION_RATE / effectiveTime;

    console.log(`Generation time: ${generationTime.toFixed(2)}s, Adaptive σ: ${adaptiveMutationRate.toFixed(4)} (base: ${GA_MUTATION_RATE.toFixed(3)})`);

    // Calculate mutation range for logging
    const minMult = this.getMutationMultiplier(1);
    const midMult = this.getMutationMultiplier(Math.floor(GA_POPULATION_SIZE / 2));
    const maxMult = this.getMutationMultiplier(GA_POPULATION_SIZE - 1);
    console.log(`Starting Gen ${this.generation}:`);
    console.log(`  Brain 1: ${minMult.toFixed(2)}×, Brain ${Math.floor(GA_POPULATION_SIZE/2)}: ${midMult.toFixed(2)}×, Brain ${GA_POPULATION_SIZE-1}: ${maxMult.toFixed(2)}×`);

    // First car is exact elite copy with random angle
    nextGeneration.push(
      new Car(
        track.startPosition.x,
        track.startPosition.y,
        this.rng.next() * Math.PI * 2,
        eliteBrain,
        ELITE_CAR_COLOR
      )
    );

    // Rest are mutations with progressive mutation rates and random angles
    for (let i = 1; i < GA_POPULATION_SIZE; i++) {
      const mutationSeed = this.rng.next() * 1000000 + i + this.generation * 10000;
      const multiplier = this.getMutationMultiplier(i);
      const sigma = adaptiveMutationRate * multiplier;

      const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);
      nextGeneration.push(
        new Car(
          track.startPosition.x,
          track.startPosition.y,
          this.rng.next() * Math.PI * 2,
          mutatedBrain,
          NORMAL_CAR_COLOR
        )
      );
    }

    // Verify mutation diversity by checking a few cars
    if (nextGeneration.length >= 4) {
      const samples = [
        1,
        Math.floor(GA_POPULATION_SIZE * 0.33),
        Math.floor(GA_POPULATION_SIZE * 0.66),
        GA_POPULATION_SIZE - 1
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
