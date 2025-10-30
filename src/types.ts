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

export type ActivationType = 'relu' | 'linear' | 'gelu' | 'step';

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

// ============================================================================
// CAR BRAIN CONFIGURATION TYPES
// ============================================================================

export interface CarBrainConfig {
  // Identification
  id: string; // Unique identifier (e.g., 'normgelu', 'difflinear')
  displayName: string; // Full name for display (e.g., 'Smoothie', 'Diffbot')
  shortName: string; // Abbreviated name for HUD (e.g., 'SM', 'DB')
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

  // Ray visualization settings
  rayVisualization: {
    width: number; // Line width for sensor rays
    hitRadius: number; // Radius of hit point circles
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
  secondsToBest: number; // Time in seconds to reach current best fitness
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
