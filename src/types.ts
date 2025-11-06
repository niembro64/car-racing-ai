import { TEXT_CHARACTER } from './core/config_text';

// ============================================================================
// GEOMETRY TYPES
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  p1: Point;
  p2: Point;
}

export interface RayHit {
  distance: number;
  point: Point;
}

// ============================================================================
// NEURAL NETWORK TYPES
// ============================================================================

export interface NeuralInput {
  rays: number[]; // Ray distances normalized to [0, 1]
}

export interface NeuralOutput {
  direction: number; // Steering direction (negative = left, positive = right)
}

export type ActivationType =
  | 'relu'
  | 'linear'
  | 'gelu'
  | 'step'
  | 'swiglu'
  | '-';

export type InputModificationType = 'dir' | 'pair';

// ============================================================================
// CAR NEURAL NETWORK TYPE (New structure)
// ============================================================================

// A single neuron with its learned parameters and activation function
export interface CarNeuron {
  weights: number[];    // Input weights for this neuron
  bias: number;         // Bias for this neuron
  activation: ActivationType; // Activation function for this neuron
}

// A hidden layer contains multiple neurons
export interface CarHiddenLayer {
  neurons: CarNeuron[];
}

// Output layer contains a single neuron (steering output)
export interface CarOutputLayer {
  neuron: CarNeuron;
}

// Complete car neural network structure
export interface CarNeuralNetwork {
  inputType: InputModificationType;  // How inputs are processed (pair/dir)
  hiddenLayers: CarHiddenLayer[];    // Array of hidden layers (can be empty)
  outputLayer: CarOutputLayer;       // Single output neuron
  color: string;                     // Car type color (for border rendering)
}

// ============================================================================
// LEGACY NETWORK STRUCTURE (For backward compatibility)
// ============================================================================

// Network layer structure (legacy)
export interface Layer {
  weights: number[][];
  biases: number[];
}

// Complete network structure (legacy)
export interface NetworkStructure {
  layers: Layer[];
}

// Legacy network weights interface (for backward compatibility)
export interface NetworkWeights {
  layers: {
    weights: number[][];
    biases: number[];
  }[];
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert legacy NetworkStructure to new CarNeuralNetwork format
 */
export function legacyToCarNetwork(
  legacy: NetworkStructure,
  inputType: InputModificationType,
  hiddenActivation: ActivationType,
  color: string
): CarNeuralNetwork {
  const hiddenLayers: CarHiddenLayer[] = [];

  // Process all layers except the last (output layer)
  for (let i = 0; i < legacy.layers.length - 1; i++) {
    const layer = legacy.layers[i];
    const neurons: CarNeuron[] = [];

    for (let j = 0; j < layer.weights.length; j++) {
      neurons.push({
        weights: layer.weights[j],
        bias: layer.biases[j],
        activation: hiddenActivation
      });
    }

    hiddenLayers.push({ neurons });
  }

  // Process output layer (always linear activation)
  const outputLayerData = legacy.layers[legacy.layers.length - 1];
  const outputLayer: CarOutputLayer = {
    neuron: {
      weights: outputLayerData.weights[0],  // Output layer has 1 neuron
      bias: outputLayerData.biases[0],
      activation: 'linear'
    }
  };

  return {
    inputType,
    hiddenLayers,
    outputLayer,
    color
  };
}

/**
 * Convert new CarNeuralNetwork to legacy NetworkStructure format
 */
export function carNetworkToLegacy(car: CarNeuralNetwork): NetworkStructure {
  const layers: Layer[] = [];

  // Convert hidden layers
  for (const hiddenLayer of car.hiddenLayers) {
    const weights: number[][] = [];
    const biases: number[] = [];

    for (const neuron of hiddenLayer.neurons) {
      weights.push(neuron.weights);
      biases.push(neuron.bias);
    }

    layers.push({ weights, biases });
  }

  // Convert output layer
  layers.push({
    weights: [car.outputLayer.neuron.weights],
    biases: [car.outputLayer.neuron.bias]
  });

  return { layers };
}

// Genome data for serialization
export interface GenomeData {
  weights: any; // brain.js JSON format
  fitness: number;
}

// Speed multiplier options - type is derived from this array
export const SPEED_MULTIPLIERS = [0.2, 0.5, 1, 2, 3, 4] as const;
export type SpeedMultiplier = (typeof SPEED_MULTIPLIERS)[number];

// Steering sensitivity options - type is derived from this array
export const STEERING_SENSITIVITIES = ['low', 'medium', 'high'] as const;
export type SteeringSensitivity = (typeof STEERING_SENSITIVITIES)[number];

// Mutation rate options - type is derived from this array
export const MUTATION_RATES = ['low', 'medium', 'high'] as const;
export type MutationRate = (typeof MUTATION_RATES)[number];
// ============================================================================
// CAR BRAIN CONFIGURATION TYPES
// ============================================================================

export type CarUsageLevel = 'use-few' | 'use-many' | 'use-all';

// Metadata for car usage levels
export interface CarUsageLevelInfo {
  id: CarUsageLevel;
  name: string; // Short display name (e.g., 'FEW', 'MANY', 'ALL')
  description: string; // Full description (e.g., 'FEW (2 types)')
}

// View mode types for visualization (internal state)
export const VIEW_MODES = ['table', 'graph', 'performance'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

// Car visualization mode
export const CAR_VIZ_MODES = ['simple', 'detailed'] as const;
export type CarVizMode = (typeof CAR_VIZ_MODES)[number];

// Visualization mode - controls what debug info is shown
export const VISUALIZATION_MODES = ['vis-simple', 'vis-medium', 'vis-weights', 'vis-think'] as const;
export type VisualizationMode = (typeof VISUALIZATION_MODES)[number];

// Info section view types (all 5 clickable views)
export const INFO_VIEWS = [
  'table-cars',
  'graph-completion',
  'graph-rate',
  'graph-score',
  'table-fps',
] as const;
export type InfoView = (typeof INFO_VIEWS)[number];

export const CAR_USAGE_LEVELS: CarUsageLevelInfo[] = [
  {
    id: 'use-few',
    name: 'TWO ' + TEXT_CHARACTER.car,
    description: 'FEW (2 types)',
  },
  {
    id: 'use-many',
    name: 'A FEW ' + TEXT_CHARACTER.car,
    description: 'MANY (5 types)',
  },
  {
    id: 'use-all',
    name: 'ALL ' + TEXT_CHARACTER.car,
    description: 'ALL types',
  },
];

export interface CarBrainConfig {
  useCar: CarUsageLevel; // Usage level: 'use-few' (2 cars), 'use-many' (several), 'use-all' (rest)
  // Identification
  displayName: string; // Full name for desktop (e.g., 'Spark', 'Wave')
  shortName: string; // Abbreviated name for mobile/HUD (e.g., 'SP', 'WV')
  description: string; // Human-readable description of the approach

  // Neural network configuration
  nn: {
    architecture: number[]; // Layer sizes [input, hidden..., output]
    inputModification: InputModificationType; // 'dir' = raw sensors, 'pair' = differential pairs
    activationType: ActivationType; // Hidden layer activation function
  };

  // Visual appearance
  colors: {
    dark: string; // Darker shade for elite cars and markers
    light: string; // Lighter shade for normal cars and rays
  };
}

// ============================================================================
// GENETIC ALGORITHM TYPES
// ============================================================================

// Per-config evolution state
export interface ConfigEvolutionState {
  generation: number;

  // Best brain from most recent generation
  bestFitnessLastGeneration: number;
  bestWeightsLastGeneration: any | null;

  // Best brain ever seen (all-time record)
  bestFitnessAllTime: number;
  bestWeightsAllTime: any | null;

  totalTime: number; // Total elapsed time in seconds for this config
}

// Brain selection strategy for evolution
export type BrainSelectionStrategy =
  | 'generation' // Always save current generation's best
  | 'alltime' // Only save if equal or better than all-time best
  | 'averaging' // Average saved brain with current generation's best
  | 'overcorrect'; // All-time best + (all-time - generation), extrapolates opposite direction

// Strategy metadata for UI display
export interface StrategyInfo {
  id: BrainSelectionStrategy;
  name: string;
  description: string;
  emoji: string;
}

export const BRAIN_SELECTION_STRATEGIES: StrategyInfo[] = [
  {
    id: 'generation',
    name: 'GEN',
    description: "Always save current generation's best",
    emoji: TEXT_CHARACTER.repeat,
  },
  {
    id: 'alltime',
    name: 'BEST',
    description: 'Only save if equal or better than all-time best',
    emoji: TEXT_CHARACTER.trophy,
  },
  {
    id: 'averaging',
    name: 'AVG',
    description: "Average saved brain with current generation's best",
    emoji: TEXT_CHARACTER.sexual,
  },
  {
    id: 'overcorrect',
    name: 'OVER',
    description:
      'All-time best + (all-time - generation), extrapolates opposite direction',
    emoji: TEXT_CHARACTER.rocket,
  },
];

// ============================================================================
// VISUALIZATION COLORS
// ============================================================================

// Centralized color definitions for neural network visualization
// Used in both the car rendering and the info table

export const ACTIVATION_COLORS: Record<ActivationType, string> = {
  '-': '#888',       // Gray (no activation)
  'linear': '#ea0',  // Orange-yellow (linear activation)
  'relu': '#58c',    // Blue family
  'gelu': '#4a8',    // Green-cyan family
  'step': '#c5c',    // Purple-magenta family
  'swiglu': '#f69',  // Red-pink family
};

export const INPUT_COLORS: Record<InputModificationType, string> = {
  'pair': '#e84',    // Bright orange-red (differential pairs)
  'dir': '#3bd',     // Bright cyan (direct inputs)
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

// Type for the result of projecting a point onto a segment
export interface ProjectionResult {
  projection: Point;
  t: number;
  distance: number;
}

// Type for centerline point result
export interface CenterlinePointResult {
  point: Point;
  distance: number;
}

// Type for ray casting results
export interface RayCastResult {
  distances: number[];
  hits: (RayHit | null)[];
}

// Type for generation marker metadata
export interface GenerationMarker {
  x: number;
  y: number;
  generation: number;
  fitness: number;
  duration: number; // How long this generation lasted in seconds
  score: number; // Comprehensive score (0-100)
  isAllTimeBest: boolean; // Maps to bestWeightsAllTime brain (trophy emoji)
  isLastGenBest: boolean; // Maps to bestWeightsLastGeneration brain (repeat emoji)
}

// Type for neural network forward pass intermediate values
export interface NeuronActivation {
  weightedInputs: number[]; // weight[i] * input[i] for each input
  preActivationSum: number; // sum of weighted inputs + bias
  postActivationOutput: number; // output after applying activation function
}

export interface LayerActivations {
  neurons: NeuronActivation[];
}

export interface ForwardPassActivations {
  inputValues: number[]; // Initial input to the network
  hiddenLayers: LayerActivations[]; // Activations for each hidden layer
  outputLayer: LayerActivations; // Activations for output layer
}
