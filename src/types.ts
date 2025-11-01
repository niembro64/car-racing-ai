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

// Network layer structure
export interface Layer {
  weights: number[][];
  biases: number[];
}

// Complete network structure
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

// Genome data for serialization
export interface GenomeData {
  weights: any; // brain.js JSON format
  fitness: number;
}

// Speed multiplier options - type is derived from this array
export const SPEED_MULTIPLIERS = [0.25, 0.5, 1, 2, 3, 4] as const;
export type SpeedMultiplier = (typeof SPEED_MULTIPLIERS)[number];
// ============================================================================
// CAR BRAIN CONFIGURATION TYPES
// ============================================================================

export interface CarBrainConfig {
  useCar: boolean; // Whether to use this config for cars
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
  bestFitness: number;
  bestWeights: any;
  totalTime: number; // Total elapsed time in seconds for this config
}

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
