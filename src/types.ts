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

export type CarUsageLevel = 'use-few' | 'use-many' | 'use-all';

// Metadata for car usage levels
export interface CarUsageLevelInfo {
  id: CarUsageLevel;
  name: string; // Short display name (e.g., 'FEW', 'MANY', 'ALL')
  description: string; // Full description (e.g., 'FEW (2 types)')
}

export const CAR_USAGE_LEVELS: CarUsageLevelInfo[] = [
  {
    id: 'use-few',
    name: 'FEW',
    description: 'FEW (2 types)',
  },
  {
    id: 'use-many',
    name: 'MANY',
    description: 'MANY (5 types)',
  },
  {
    id: 'use-all',
    name: 'ALL',
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
  | 'generation'   // Always save current generation's best
  | 'alltime'      // Only save if equal or better than all-time best
  | 'averaging'    // Average saved brain with current generation's best
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
    description: 'Always save current generation\'s best',
    emoji: TEXT_CHARACTER.repeat
  },
  {
    id: 'alltime',
    name: 'BEST',
    description: 'Only save if equal or better than all-time best',
    emoji: TEXT_CHARACTER.trophy
  },
  {
    id: 'averaging',
    name: 'AVG',
    description: 'Average saved brain with current generation\'s best',
    emoji: TEXT_CHARACTER.sexual
  },
  {
    id: 'overcorrect',
    name: 'OVER',
    description: 'All-time best + (all-time - generation), extrapolates opposite direction',
    emoji: TEXT_CHARACTER.rocket
  }
];

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
  isAllTimeBest: boolean;  // Maps to bestWeightsAllTime brain (trophy emoji)
  isLastGenBest: boolean;  // Maps to bestWeightsLastGeneration brain (repeat emoji)
}
