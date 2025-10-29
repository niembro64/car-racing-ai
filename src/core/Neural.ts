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
  private activationType: 'relu' | 'linear' | 'gelu';

  constructor(
    weights: NetworkStructure | undefined,
    seed: number,
    architecture?: number[],
    activationType: 'relu' | 'linear' | 'gelu' = 'relu'
  ) {
    this.rng = new SeededRandom(seed);
    this.layerSizes = architecture || NEURAL_NETWORK_ARCHITECTURE;
    this.activationType = activationType;

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

  // Tanh activation (output range -1 to 1, good for steering)
  private tanh(x: number): number {
    return Math.tanh(clamp(x, -10, 10));
  }

  // ReLU activation (max(0, x))
  private relu(x: number): number {
    return Math.max(0, x);
  }

  // GELU activation (Gaussian Error Linear Unit)
  // Approximation: GELU(x) ≈ 0.5 * x * (1 + tanh(sqrt(2/π) * (x + 0.044715 * x³)))
  private gelu(x: number): number {
    const sqrt2OverPi = Math.sqrt(2.0 / Math.PI);
    const coefficient = 0.044715;
    const inner = sqrt2OverPi * (x + coefficient * Math.pow(x, 3));
    return 0.5 * x * (1.0 + Math.tanh(inner));
  }

  // Forward pass through network
  private forward(input: number[]): number[] {
    let current = input;

    for (let i = 0; i < this.structure.layers.length; i++) {
      const layer = this.structure.layers[i];
      const next: number[] = [];
      const isOutputLayer = i === this.structure.layers.length - 1;

      for (let j = 0; j < layer.weights.length; j++) {
        let sum = layer.biases[j];

        for (let k = 0; k < current.length; k++) {
          sum += current[k] * layer.weights[j][k];
        }

        // Use appropriate activation based on layer and config
        if (isOutputLayer) {
          next.push(this.tanh(sum)); // Always tanh for output
        } else if (this.activationType === 'relu') {
          next.push(this.relu(sum)); // ReLU for hidden layers
        } else if (this.activationType === 'gelu') {
          next.push(this.gelu(sum)); // GELU for hidden layers
        } else {
          next.push(sum); // Linear (identity) for hidden layers
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

    if (inputArray.length !== this.layerSizes[0]) {
      throw new Error(
        'Expected input length ' +
          this.layerSizes[0] +
          ', got ' +
          inputArray.length
      );
    }

    // Check for NaN
    if (inputArray.some((v) => isNaN(v) || !isFinite(v))) {
      return { direction: 0 };
    }

    const output = this.forward(inputArray);

    if (!output || output.length !== 1) {
      return { direction: 0 };
    }

    // Tanh output is already in [-1, 1] range (negative = left, positive = right)
    const direction = clamp(output[0], -1, 1);

    // Final NaN check
    if (isNaN(direction)) {
      return { direction: 0 };
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
    return new NeuralNetwork(
      mutatedWeights,
      seed,
      this.layerSizes,
      this.activationType
    );
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
  static createRandom(
    seed: number,
    architecture: number[],
    activationType: 'relu' | 'linear' | 'gelu'
  ): NeuralNetwork {
    return new NeuralNetwork(undefined, seed, architecture, activationType);
  }

  // Load network from JSON
  static fromJSON(
    weights: NetworkStructure,
    seed: number,
    architecture: number[],
    activationType: 'relu' | 'linear' | 'gelu'
  ): NeuralNetwork {
    return new NeuralNetwork(weights, seed, architecture, activationType);
  }
}
