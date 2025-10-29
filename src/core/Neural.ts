import type { NeuralInput, NeuralOutput } from '@/types/neural';
import { clamp } from './math/geom';
import { SeededRandom } from './math/geom';
import { NEURAL_NETWORK_ARCHITECTURE } from '@/config';

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

  constructor(
    weights: NetworkStructure | undefined,
    seed: number,
    architecture?: number[]
  ) {
    this.rng = new SeededRandom(seed);
    this.layerSizes = architecture || NEURAL_NETWORK_ARCHITECTURE;

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

  // GELU activation (Gaussian Error Linear Unit)
  // Used in GPT, BERT, Vision Transformers - state-of-the-art activation
  // Formula: GELU(x) ≈ 0.5 * x * (1 + tanh(√(2/π) * (x + 0.044715 * x³)))
  private gelu(x: number): number {
    const clampedX = clamp(x, -10, 10);
    const cube = clampedX * clampedX * clampedX;
    const inner = Math.sqrt(2 / Math.PI) * (clampedX + 0.044715 * cube);
    return 0.5 * clampedX * (1 + Math.tanh(inner));
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

        // Use GELU for hidden layers, sigmoid for output
        if (i < this.structure.layers.length - 1) {
          next.push(this.gelu(sum));
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
    // Input array is just the rays
    const inputArray = input.rays;

    if (inputArray.length !== NEURAL_NETWORK_ARCHITECTURE[0]) {
      throw new Error(
        'Expected input length ' +
          NEURAL_NETWORK_ARCHITECTURE[0] +
          ', got ' +
          inputArray.length
      );
    }

    // Check for NaN
    if (inputArray.some((v) => isNaN(v) || !isFinite(v))) {
      console.warn('NaN detected in input, returning safe defaults');
      return { direction: 0 };
    }

    const output = this.forward(inputArray);

    if (!output || output.length !== 1) {
      console.warn('Invalid network output, returning safe defaults');
      return { direction: 0 };
    }

    // Map output to [-1, 1] range (negative = left, positive = right)
    const direction = clamp(output[0] * 2 - 1, -1, 1);

    // Final NaN check
    if (isNaN(direction)) {
      console.warn('NaN in output after clipping, returning safe defaults');
      return { direction: 0 };
    }

    // Debug: log raw outputs occasionally
    if ((window as any).__debugCarNN && Math.random() < 0.001) {
      console.log(
        'NN raw output:',
        output[0].toFixed(3),
        '-> direction:',
        direction.toFixed(2)
      );
    }

    return { direction };
  }

  // Export weights as JSON
  toJSON(): NetworkStructure {
    return JSON.parse(JSON.stringify(this.structure));
  }

  // Create a mutated copy of this network
  mutate(sigma: number, seed: number): NeuralNetwork {
    const currentWeights = this.toJSON();
    const mutatedWeights = this.mutateWeights(currentWeights, sigma, seed);
    return new NeuralNetwork(mutatedWeights, seed);
  }

  // Mutate weights by adding gaussian noise
  private mutateWeights(
    weights: NetworkStructure,
    sigma: number,
    seed: number
  ): NetworkStructure {
    const mutated = JSON.parse(JSON.stringify(weights));
    const mutationRng = new SeededRandom(seed);

    for (const layer of mutated.layers) {
      // Mutate weights - each weight gets a unique random noise
      for (let i = 0; i < layer.weights.length; i++) {
        for (let j = 0; j < layer.weights[i].length; j++) {
          const noise = mutationRng.gaussian(0, sigma);
          layer.weights[i][j] = clamp(layer.weights[i][j] + noise, -10, 10);
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
  static createRandom(seed: number, architecture?: number[]): NeuralNetwork {
    return new NeuralNetwork(undefined, seed, architecture);
  }

  // Load network from JSON
  static fromJSON(weights: NetworkStructure, seed: number): NeuralNetwork {
    return new NeuralNetwork(weights, seed);
  }
}
