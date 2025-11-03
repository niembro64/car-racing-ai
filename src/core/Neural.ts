import type {
  NeuralInput,
  NeuralOutput,
  Layer,
  NetworkStructure,
  ActivationType,
} from '@/types';
import { SeededRandom } from './math/geom';

export class NeuralNetwork {
  private structure: NetworkStructure;
  private rng: SeededRandom;
  private layerSizes: number[];
  private activationType: ActivationType;

  constructor(
    weights: NetworkStructure | undefined,
    seed: number,
    architecture: number[],
    activationType: ActivationType = 'relu'
  ) {
    this.rng = new SeededRandom(seed);
    this.layerSizes = architecture;
    this.activationType = activationType;

    if (weights) {
      this.structure = JSON.parse(JSON.stringify(weights));
    } else {
      this.structure = this.initializeRandom();
    }
  }

  // Initialize random weights using He initialization for better convergence
  // He initialization: weights ~ N(0, sqrt(2/n_in)) for ReLU-like activations
  // Xavier initialization: weights ~ N(0, sqrt(2/(n_in + n_out))) for linear/tanh
  private initializeRandom(): NetworkStructure {
    const layers: Layer[] = [];

    for (let i = 0; i < this.layerSizes.length - 1; i++) {
      const inputSize = this.layerSizes[i];
      const outputSize = this.layerSizes[i + 1];

      const weights: number[][] = [];
      const biases: number[] = [];

      // Use He initialization for ReLU/GELU, Xavier for linear/tanh
      // For uniform distribution: limit = sqrt(6 / (fan_in + fan_out))
      const limit = this.activationType === 'relu' || this.activationType === 'gelu' || this.activationType === 'swiglu'
        ? Math.sqrt(6.0 / inputSize)  // He initialization (scaled for uniform dist)
        : Math.sqrt(6.0 / (inputSize + outputSize));  // Xavier initialization

      for (let j = 0; j < outputSize; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < inputSize; k++) {
          // Uniform distribution in [-limit, limit]
          neuronWeights.push((this.rng.next() * 2 - 1) * limit);
        }
        weights.push(neuronWeights);
        // Initialize biases to small values
        biases.push((this.rng.next() * 2 - 1) * 0.01);
      }

      layers.push({ weights, biases });
    }

    return { layers };
  }

  private linear(x: number): number {
    return x;
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

  // Step activation (Heaviside step function)
  // Returns 0 for x < 0, 1 for x >= 0
  private step(x: number): number {
    return x >= 0 ? 1 : 0;
  }

  // SWIGLU activation (Swish-Gated Linear Unit)
  // SWIGLU(x) = x * swish(x) where swish(x) = x * sigmoid(x)
  // This gives: SWIGLU(x) = x * (x / (1 + e^(-x))) = x² / (1 + e^(-x))
  private swiglu(x: number): number {
    const sigmoid = 1.0 / (1.0 + Math.exp(-x));
    return x * x * sigmoid;
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
          next.push(this.linear(sum));
          // next.push(this.tanh(sum));
        } else if (this.activationType === 'relu') {
          next.push(this.relu(sum)); // ReLU for hidden layers
        } else if (this.activationType === 'gelu') {
          next.push(this.gelu(sum)); // GELU for hidden layers
        } else if (this.activationType === 'step') {
          next.push(this.step(sum)); // Step for hidden layers
        } else if (this.activationType === 'swiglu') {
          next.push(this.swiglu(sum)); // SWIGLU for hidden layers
        } else if (this.activationType === 'linear') {
          next.push(this.linear(sum)); // Linear for hidden layers
        } else if (this.activationType === '-') {
          // No hidden layers - this code path should never execute
          next.push(this.linear(sum));
        } else {
          throw new Error('Unknown activation type: ' + this.activationType);
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

    const direction = output[0];

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
      for (let i = 0; i < layer.weights.length; i++) {
        for (let j = 0; j < layer.weights[i].length; j++) {
          const noise = mutationRng.gaussian(0, sigma);
          layer.weights[i][j] += noise;
        }
      }

      for (let i = 0; i < layer.biases.length; i++) {
        const noise = mutationRng.gaussian(0, sigma);
        layer.biases[i] += noise;
      }
    }

    return mutated;
  }

  // Create a random network
  static createRandom(
    seed: number,
    architecture: number[],
    activationType: ActivationType
  ): NeuralNetwork {
    return new NeuralNetwork(undefined, seed, architecture, activationType);
  }

  // Load network from JSON
  static fromJSON(
    weights: NetworkStructure,
    seed: number,
    architecture: number[],
    activationType: ActivationType
  ): NeuralNetwork {
    return new NeuralNetwork(weights, seed, architecture, activationType);
  }
}

/**
 * Average two neural network weight structures element-wise
 * Used for "sexual reproduction" brain selection strategy
 *
 * @param weights1 - First parent network weights
 * @param weights2 - Second parent network weights
 * @returns Averaged network weights (offspring)
 */
export function averageNetworkWeights(
  weights1: NetworkStructure,
  weights2: NetworkStructure
): NetworkStructure {
  // Deep clone first structure as base
  const result: NetworkStructure = JSON.parse(JSON.stringify(weights1));

  // Average each layer's weights and biases
  for (let layerIdx = 0; layerIdx < result.layers.length; layerIdx++) {
    const layer1 = weights1.layers[layerIdx];
    const layer2 = weights2.layers[layerIdx];
    const resultLayer = result.layers[layerIdx];

    // Average weights matrix
    for (let i = 0; i < resultLayer.weights.length; i++) {
      for (let j = 0; j < resultLayer.weights[i].length; j++) {
        resultLayer.weights[i][j] =
          (layer1.weights[i][j] + layer2.weights[i][j]) / 2;
      }
    }

    // Average biases vector
    for (let i = 0; i < resultLayer.biases.length; i++) {
      resultLayer.biases[i] =
        (layer1.biases[i] + layer2.biases[i]) / 2;
    }
  }

  return result;
}
