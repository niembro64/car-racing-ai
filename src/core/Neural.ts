import type { NeuralInput, NeuralOutput } from '@/types/neural';
import { clamp } from './math/geom';
import { SeededRandom } from './math/geom';
import { NETWORK_LAYERS } from '@/config';

// Simple feed-forward neural network implementation
interface Layer {
  weights: number[][];
  biases: number[];
}

interface NetworkStructure {
  layers: Layer[];
}

export class NeuralNetwork {
  private structure: NetworkStructure;
  private rng: SeededRandom;
  private layerSizes: number[];

  constructor(weights?: NetworkStructure, seed: number = Date.now()) {
    this.rng = new SeededRandom(seed);
    this.layerSizes = NETWORK_LAYERS;

    if (weights) {
      this.structure = JSON.parse(JSON.stringify(weights));
    } else {
      this.structure = this.initializeRandom();
    }
  }

  // Initialize random weights
  private initializeRandom(): NetworkStructure {
    const layers: Layer[] = [];

    for (let i = 0; i < this.layerSizes.length - 1; i++) {
      const inputSize = this.layerSizes[i];
      const outputSize = this.layerSizes[i + 1];

      const weights: number[][] = [];
      const biases: number[] = [];

      // Xavier initialization
      const scale = Math.sqrt(2.0 / (inputSize + outputSize));

      for (let j = 0; j < outputSize; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < inputSize; k++) {
          neuronWeights.push((this.rng.next() * 2 - 1) * scale);
        }
        weights.push(neuronWeights);
        biases.push((this.rng.next() * 2 - 1) * scale);
      }

      layers.push({ weights, biases });
    }

    return { layers };
  }

  // ReLU activation
  private relu(x: number): number {
    return Math.max(0, x);
  }

  // Sigmoid activation
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-clamp(x, -10, 10)));
  }

  // Forward pass through network
  private forward(input: number[]): number[] {
    let current = input;

    for (let i = 0; i < this.structure.layers.length; i++) {
      const layer = this.structure.layers[i];
      const next: number[] = [];

      for (let j = 0; j < layer.weights.length; j++) {
        let sum = layer.biases[j];

        for (let k = 0; k < current.length; k++) {
          sum += current[k] * layer.weights[j][k];
        }

        // Use ReLU for hidden layers, sigmoid for output
        if (i < this.structure.layers.length - 1) {
          next.push(this.relu(sum));
        } else {
          next.push(this.sigmoid(sum));
        }
      }

      current = next;
    }

    return current;
  }

  // Run the network with sensor inputs
  run(input: NeuralInput): NeuralOutput {
    if (input.rays.length !== 8) {
      throw new Error('Expected 8 ray distances');
    }

    // Prepare input array: 8 rays + speed
    const inputArray = [...input.rays, input.speed];

    // Check for NaN
    if (inputArray.some(v => isNaN(v) || !isFinite(v))) {
      console.warn('NaN detected in input, returning safe defaults');
      return { speed: 0, direction: 0 };
    }

    const output = this.forward(inputArray);

    if (!output || output.length !== 2) {
      console.warn('Invalid network output, returning safe defaults');
      return { speed: 0, direction: 0 };
    }

    // Map outputs to appropriate ranges
    // Speed: map [0,1] to [-1,1] (negative = reverse, positive = forward)
    const speed = clamp(output[0] * 2 - 1, -1, 1);

    // Direction: map [0,1] to [-1,1] (negative = left, positive = right)
    const direction = clamp(output[1] * 2 - 1, -1, 1);

    // Final NaN check
    if (isNaN(speed) || isNaN(direction)) {
      console.warn('NaN in output after clipping, returning safe defaults');
      return { speed: 0, direction: 0 };
    }

    // Debug: log raw outputs occasionally
    if ((window as any).__debugCarNN && Math.random() < 0.001) {
      console.log('NN raw outputs:', output.map(o => o.toFixed(3)), '-> mapped:', { speed: speed.toFixed(2), direction: direction.toFixed(2) });
    }

    return { speed, direction };
  }

  // Export weights as JSON
  toJSON(): NetworkStructure {
    return JSON.parse(JSON.stringify(this.structure));
  }

  // Create a mutated copy of this network
  mutate(sigma: number = 0.02, seed?: number): NeuralNetwork {
    const currentWeights = this.toJSON();
    const newSeed = seed !== undefined ? seed : Math.random() * 1000000;
    const mutatedWeights = this.mutateWeights(currentWeights, sigma, newSeed);
    return new NeuralNetwork(mutatedWeights, newSeed);
  }

  // Mutate weights by adding gaussian noise
  private mutateWeights(weights: NetworkStructure, sigma: number, seed: number): NetworkStructure {
    const mutated = JSON.parse(JSON.stringify(weights));
    const mutationRng = new SeededRandom(seed);

    for (const layer of mutated.layers) {
      // Mutate weights - each weight gets a unique random noise
      for (let i = 0; i < layer.weights.length; i++) {
        for (let j = 0; j < layer.weights[i].length; j++) {
          const noise = mutationRng.gaussian(0, sigma);
          layer.weights[i][j] = clamp(
            layer.weights[i][j] + noise,
            -10,
            10
          );
        }
      }

      // Mutate biases - each bias gets a unique random noise
      for (let i = 0; i < layer.biases.length; i++) {
        const noise = mutationRng.gaussian(0, sigma);
        layer.biases[i] = clamp(layer.biases[i] + noise, -10, 10);
      }
    }

    return mutated;
  }

  // Create a random network
  static createRandom(seed: number = Date.now()): NeuralNetwork {
    return new NeuralNetwork(undefined, seed);
  }

  // Load network from JSON
  static fromJSON(weights: NetworkStructure, seed: number = Date.now()): NeuralNetwork {
    return new NeuralNetwork(weights, seed);
  }
}
