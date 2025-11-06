import type {
  NeuralInput,
  NeuralOutput,
  Layer,
  NetworkStructure,
  ActivationType,
  CarNeuralNetwork,
  InputModificationType,
  ForwardPassActivations,
  NeuronActivation,
  LayerActivations,
} from '@/types';
import { legacyToCarNetwork, carNetworkToLegacy } from '@/types';
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

  // Initialize random weights using standard initialization
  // He initialization: weights ~ N(0, sqrt(2/n_in)) for ReLU-like activations
  // Xavier/Glorot initialization: weights ~ N(0, sqrt(2/(n_in + n_out))) for linear/tanh
  private initializeRandom(): NetworkStructure {
    const layers: Layer[] = [];

    for (let i = 0; i < this.layerSizes.length - 1; i++) {
      const inputSize = this.layerSizes[i];
      const outputSize = this.layerSizes[i + 1];

      const weights: number[][] = [];
      const biases: number[] = [];

      // Standard deviation for Gaussian initialization
      // He initialization: std = sqrt(2 / n_in) for ReLU/GELU/SWISH
      // Xavier initialization: std = sqrt(2 / (n_in + n_out)) for linear/tanh/sigmoid
      const stddev =
        this.activationType === 'relu' ||
        this.activationType === 'gelu' ||
        this.activationType === 'swish'
          ? Math.sqrt(2.0 / inputSize) // He initialization
          : Math.sqrt(2.0 / (inputSize + outputSize)); // Xavier/Glorot initialization

      for (let j = 0; j < outputSize; j++) {
        const neuronWeights: number[] = [];
        for (let k = 0; k < inputSize; k++) {
          // Gaussian/Normal distribution N(0, stddev)
          neuronWeights.push(this.rng.gaussian(0, stddev));
        }
        weights.push(neuronWeights);
        // Initialize biases to zero (standard practice)
        biases.push(0);
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

  // SWISH activation (Swish-Gated Linear Unit)
  // SWISH(x) = x * swish(x) where swish(x) = x * sigmoid(x)
  // This gives: SWISH(x) = x * (x / (1 + e^(-x))) = x² / (1 + e^(-x))
  private swish(x: number): number {
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
        } else if (this.activationType === 'swish') {
          next.push(this.swish(sum)); // SWISH for hidden layers
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

  // Forward pass that captures all intermediate values for visualization
  forwardWithActivations(input: number[]): ForwardPassActivations {
    const hiddenLayers: LayerActivations[] = [];
    let currentInput = input;

    for (let i = 0; i < this.structure.layers.length; i++) {
      const layer = this.structure.layers[i];
      const neurons: NeuronActivation[] = [];
      const isOutputLayer = i === this.structure.layers.length - 1;
      const nextLayerInputs: number[] = [];

      for (let j = 0; j < layer.weights.length; j++) {
        const weightedInputs: number[] = [];
        let preActivationSum = layer.biases[j];

        // Compute weighted inputs
        for (let k = 0; k < currentInput.length; k++) {
          const weightedInput = currentInput[k] * layer.weights[j][k];
          weightedInputs.push(weightedInput);
          preActivationSum += weightedInput;
        }

        // Apply activation function
        let postActivationOutput: number;
        if (isOutputLayer) {
          postActivationOutput = this.linear(preActivationSum);
        } else if (this.activationType === 'relu') {
          postActivationOutput = this.relu(preActivationSum);
        } else if (this.activationType === 'gelu') {
          postActivationOutput = this.gelu(preActivationSum);
        } else if (this.activationType === 'step') {
          postActivationOutput = this.step(preActivationSum);
        } else if (this.activationType === 'swish') {
          postActivationOutput = this.swish(preActivationSum);
        } else if (this.activationType === 'linear') {
          postActivationOutput = this.linear(preActivationSum);
        } else if (this.activationType === '-') {
          postActivationOutput = this.linear(preActivationSum);
        } else {
          throw new Error('Unknown activation type: ' + this.activationType);
        }

        neurons.push({
          weightedInputs,
          preActivationSum,
          postActivationOutput,
        });

        nextLayerInputs.push(postActivationOutput);
      }

      if (isOutputLayer) {
        return {
          inputValues: input,
          hiddenLayers,
          outputLayer: { neurons },
        };
      } else {
        hiddenLayers.push({ neurons });
        currentInput = nextLayerInputs;
      }
    }

    // Should never reach here, but handle the case of no layers
    return {
      inputValues: input,
      hiddenLayers: [],
      outputLayer: { neurons: [] },
    };
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

  // Export weights as JSON (legacy format)
  toJSON(): NetworkStructure {
    return JSON.parse(JSON.stringify(this.structure));
  }

  // Export as new CarNeuralNetwork format
  toCarNetwork(inputType: InputModificationType, color: string): CarNeuralNetwork {
    return legacyToCarNetwork(this.structure, inputType, this.activationType, color);
  }

  // Create network from CarNeuralNetwork format
  static fromCarNetwork(
    carNetwork: CarNeuralNetwork,
    seed: number,
    architecture: number[]
  ): NeuralNetwork {
    // Extract activation type from first hidden layer neuron, or use '-' if no hidden layers
    const hiddenActivation = carNetwork.hiddenLayers.length > 0
      ? carNetwork.hiddenLayers[0].neurons[0].activation
      : '-';

    // Convert to legacy format
    const legacy = carNetworkToLegacy(carNetwork);

    return new NeuralNetwork(legacy, seed, architecture, hiddenActivation);
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
      resultLayer.biases[i] = (layer1.biases[i] + layer2.biases[i]) / 2;
    }
  }

  return result;
}

/**
 * Overcorrect network weights by extrapolating opposite to generation's direction
 * Formula: overcorrect = alltime + (alltime - generation) = 2*alltime - generation
 * Used for "overcorrect" brain selection strategy
 *
 * @param alltimeWeights - All-time best network weights
 * @param generationWeights - Current generation's best network weights
 * @returns Overcorrected network weights
 */
export function overcorrectNetworkWeights(
  alltimeWeights: NetworkStructure,
  generationWeights: NetworkStructure
): NetworkStructure {
  // Deep clone alltime structure as base
  const result: NetworkStructure = JSON.parse(JSON.stringify(alltimeWeights));

  const amount = 1; // Scaling factor for overcorrection

  // Apply overcorrect formula to each layer's weights and biases
  for (let layerIdx = 0; layerIdx < result.layers.length; layerIdx++) {
    const layerAlltime = alltimeWeights.layers[layerIdx];
    const layerGeneration = generationWeights.layers[layerIdx];
    const resultLayer = result.layers[layerIdx];

    // Overcorrect weights matrix: 2*alltime - generation
    for (let i = 0; i < resultLayer.weights.length; i++) {
      for (let j = 0; j < resultLayer.weights[i].length; j++) {
        resultLayer.weights[i][j] =
          layerAlltime.weights[i][j] +
          (layerAlltime.weights[i][j] - layerGeneration.weights[i][j]) * amount;
      }
    }

    // Overcorrect biases vector: 2*alltime - generation
    for (let i = 0; i < resultLayer.biases.length; i++) {
      resultLayer.biases[i] =
        layerAlltime.biases[i] +
        (layerAlltime.biases[i] - layerGeneration.biases[i]) * amount;
    }
  }

  return result;
}

/**
 * Blend two neural network weight structures using a ratio
 * Used for injecting randomness based on nearness to all-time best point
 *
 * @param weights1 - First network weights (strategic seed)
 * @param weights2 - Second network weights (random seed)
 * @param blendRatio - Ratio from 0 to 1, where 0 = all weights1, 1 = all weights2
 * @returns Blended network weights
 */
export function blendNetworkWeights(
  weights1: NetworkStructure,
  weights2: NetworkStructure,
  blendRatio: number
): NetworkStructure {
  // Deep clone first structure as base
  const result: NetworkStructure = JSON.parse(JSON.stringify(weights1));

  // Clamp blend ratio to [0, 1]
  const ratio = Math.max(0, Math.min(1, blendRatio));

  // Blend each layer's weights and biases
  for (let layerIdx = 0; layerIdx < result.layers.length; layerIdx++) {
    const layer1 = weights1.layers[layerIdx];
    const layer2 = weights2.layers[layerIdx];
    const resultLayer = result.layers[layerIdx];

    // Blend weights matrix: (1 - ratio) * weights1 + ratio * weights2
    for (let i = 0; i < resultLayer.weights.length; i++) {
      for (let j = 0; j < resultLayer.weights[i].length; j++) {
        resultLayer.weights[i][j] =
          (1 - ratio) * layer1.weights[i][j] + ratio * layer2.weights[i][j];
      }
    }

    // Blend biases vector: (1 - ratio) * biases1 + ratio * biases2
    for (let i = 0; i < resultLayer.biases.length; i++) {
      resultLayer.biases[i] =
        (1 - ratio) * layer1.biases[i] + ratio * layer2.biases[i];
    }
  }

  return result;
}
