import type { Point, InputModificationType, ActivationType, CarBrainConfig } from './types';

// Re-export types for backward compatibility
export type { Point, InputModificationType, ActivationType, CarBrainConfig };

// ============================================================================
// CAR BRAIN CONFIGURATION SYSTEM
// ============================================================================
// Defines all car types with their neural network architectures, colors,
// and visualization settings in a centralized, extensible structure.

export function appendMirroredWaypoints(
  waypoints: Point[],
  canvasWidth: number
): Point[] {
  if (waypoints.length <= 1) return [...waypoints];

  const mirrorX = (p: Point): Point => ({ x: canvasWidth - p.x, y: p.y });
  const tail = waypoints.slice(1);
  const mirroredTail = tail.slice().reverse().map(mirrorX);

  return [...waypoints, ...mirroredTail];
}

// ============================================================================
// GENETIC ALGORITHM PARAMETERS
// ============================================================================
// These control the evolution process and how the neural networks improve

// Base mutation rate - always applied to all mutations
export const GA_MUTATION_BASE = 0.01;

// Distance-based mutation configuration
// Formula: mutation = base + factor / (distance + denominator)
// This naturally limits mutation: max = base + factor/denominator, approaches base as distance increases
export const GA_MUTATION_DISTANCE_FACTOR = 100.0;
export const GA_MUTATION_DISTANCE_DENOMINATOR = 100.0;

// Legacy mutation rate for backward compatibility
export const GA_MUTATION_RATE = 0.08;

// Population size - number of cars per generation
// Higher = more diversity but slower evolution per generation
export const GA_POPULATION_SIZE_DESKTOP = 160;
export const GA_POPULATION_SIZE_MOBILE = 80;

// Get population size based on screen width
export function getPopulationSize(): number {
  if (typeof window === 'undefined') {
    // Server-side or test environment - use desktop size
    return GA_POPULATION_SIZE_DESKTOP;
  }
  // Mobile breakpoint at 768px (matches CSS media query)
  return window.innerWidth <= 768
    ? GA_POPULATION_SIZE_MOBILE
    : GA_POPULATION_SIZE_DESKTOP;
}

// Default constant for backward compatibility (uses desktop size for tests)
export const GA_POPULATION_SIZE = GA_POPULATION_SIZE_DESKTOP;

// Mutation multiplier range - creates diversity in mutation strength across population
// Car #1 (elite): 0× mutation (exact copy)
// Car #2 to #N: MIN_MULTIPLIER to MAX_MULTIPLIER (progressive curve)
export const GA_MUTATION_MIN_MULTIPLIER = 0.2; // Minimum mutation (similar to elite)
export const GA_MUTATION_MAX_MULTIPLIER = 3.5; // Maximum mutation (aggressive exploration)

// Mutation curve power - controls distribution of mutation rates
// Lower values (0.5-2): more cars with moderate mutation
// Higher values (5-20): most cars with low mutation, few with high mutation
export const GA_MUTATION_CURVE_POWER = 2.0;

// ============================================================================
// TRACK CONFIGURATION
// ============================================================================

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const TRACK_WIDTH_HALF = 30; // Half-width of track (pixels)
export const SEGMENTS_PER_CURVE = 30; // Smoothness of curves

// Track waypoints (mirrored to create symmetric track)
export const wp: Point[] = [
  { x: 400, y: 60 },
  { x: 700, y: 100 },
  { x: 700, y: 500 },
  { x: 560, y: 500 },
  { x: 600, y: 240 },
  { x: 500, y: 140 },
];
export const WAYPOINTS: Point[] = appendMirroredWaypoints(wp, CANVAS_WIDTH);

// ============================================================================
// CAR PHYSICS
// ============================================================================

export const CAR_FORWARD_SPEED = 200; // Constant forward speed (pixels/second)
export const CAR_STEERING_SENSITIVITY = 0.3; // Steering multiplier (1.0 = standard)
export const CAR_WIDTH = 10; // Car width (pixels)
export const CAR_HEIGHT = 20; // Car length (pixels)

// ============================================================================
// SENSOR CONFIGURATION
// ============================================================================
// Distance sensors (raycasts) that detect walls/obstacles
// Angles are relative to car's forward direction (0 = straight ahead)

export const SENSOR_RAY_ANGLES = [
  0, // 0°   - Straight ahead (critical for forward planning)
  -Math.PI / 9, // -20° - Near-left (detect upcoming left turns)
  Math.PI / 9, // +20° - Near-right (detect upcoming right turns)
  -Math.PI / 4.5, // -40° - Mid-left (see left track edge)
  Math.PI / 4.5, // +40° - Mid-right (see right track edge)
  -Math.PI / 3, // -60° - Wide-left (peripheral vision)
  Math.PI / 3, // +60° - Wide-right (peripheral vision)
  -Math.PI / 2, // -90° - Full left (side wall detection)
  Math.PI / 2, // +90° - Full right (side wall detection)
];

// Total sensors: 9 rays providing 180° field of view
// Distribution: even coverage from -90° to +90° for comprehensive environment awareness

// Sensor pair indices for differential input mode
// Each pair represents [leftRayIndex, rightRayIndex]
export const SENSOR_RAY_PAIRS = [
  [1, 2], // ±20° pair
  [3, 4], // ±40° pair
  [5, 6], // ±60° pair
  [7, 8], // ±90° pair
];

// Differential input mode computes (leftDistance - rightDistance) for each pair
// This gives 5 inputs total: 1 forward + 4 differential pairs
// Benefits: Smaller network, encodes directional bias directly

// ============================================================================
// NEURAL NETWORK ARCHITECTURE
// ============================================================================
// Network structure: [input_neurons, hidden_layer_1, ..., output_neurons]

// Standard mode: [9 inputs] → [6 hidden] → [1 output]
// - Input layer: 9 distance sensors (raw values)
// - Hidden layer: 6 neurons (pattern recognition)
// - Output layer: 1 neuron (steering: -1 = full left, +1 = full right)
export const NN_ARCH_SMALL = [SENSOR_RAY_ANGLES.length, 1];
export const NN_ARCH_MEDIUM = [SENSOR_RAY_ANGLES.length, 6, 1];
export const NN_ARCH_NORMAL_LARGE = [SENSOR_RAY_ANGLES.length, 10, 10, 1];
export const NN_ARCH_DIFF_MEDIUM = [1 + SENSOR_RAY_PAIRS.length, 6, 1];
export const NN_ARCH_DIFF_SMALL = [1 + SENSOR_RAY_PAIRS.length, 1];

export const NEURAL_NETWORK_ARCHITECTURE = NN_ARCH_DIFF_MEDIUM;

export const CAR_BRAIN_CONFIGS: CarBrainConfig[] = [
  {
    displayName: 'Diffbot',
    id: 'difflinear',
    shortName: 'DB',
    description:
      '5 differential sensor inputs (1 forward + 4 L-R pairs) with Linear activation in hidden layer of size 4',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      normal: '#880000', // Dark muted red
      elite: '#660000', // Darkest red
      ray: '#880000',
      rayHit: '#880000',
      marker: '#880000',
    },
    rayVisualization: {
      width: 0.5,
      hitRadius: 3,
    },
  },
  {
    displayName: 'Flatty',
    id: 'normlinear',
    shortName: 'FL',
    description:
      '9 raw sensor inputs with Linear activation in hidden layer of size 6',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      normal: '#226699', // Dark muted blue
      elite: '#1a4d73', // Darkest blue
      ray: '#226699',
      rayHit: '#226699',
      marker: '#226699',
    },
    rayVisualization: {
      width: 0.5,
      hitRadius: 3,
    },
  },
  {
    displayName: 'Smoothie',
    id: 'normgelu',
    shortName: 'SM',
    description:
      '9 raw sensor inputs with GELU activation in hidden layer of size 6',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      normal: '#aaaa33',
      elite: '#7a7a00', // Darkest yellow/gold
      ray: '#aaaa33',
      rayHit: '#aaaa33',
      marker: '#aaaa33',
    },
    rayVisualization: {
      width: 0.5,
      hitRadius: 3,
    },
  },
  {
    displayName: 'Bigbrain',
    id: 'relularge',
    shortName: 'BB',
    description:
      '9 raw sensor inputs with ReLU activation in two hidden layers of size 10 each',
    nn: {
      architecture: NN_ARCH_NORMAL_LARGE,
      inputModification: 'dir',
      activationType: 'relu',
    },
    // green
    colors: {
      normal: '#229922',
      elite: '#1a731a', // Darkest green
      ray: '#229922',
      rayHit: '#229922',
      marker: '#229922',
    },
    rayVisualization: {
      width: 0.5,
      hitRadius: 3,
    },
  },
  {
    displayName: 'Stairbot',
    id: 'normstep',
    shortName: 'SB',
    description:
      '9 raw sensor inputs with Step activation in hidden layer of size 6 (expected to perform poorly)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'step',
    },
    // orange
    colors: {
      normal: '#cc6600',
      elite: '#994d00', // Darkest orange
      ray: '#cc6600',
      rayHit: '#cc6600',
      marker: '#cc6600',
    },
    rayVisualization: {
      width: 0.5,
      hitRadius: 3,
    },
  },
  {
    displayName: 'Smolbrain',
    id: 'diffsmall',
    shortName: 'SB2',
    description:
      '5 differential sensor inputs (1 forward + 4 L-R pairs) with Linear activation in hidden layer of size 6',
    nn: {
      architecture: NN_ARCH_DIFF_SMALL,
      inputModification: 'pair',
      activationType: 'linear',
    },
    // purple
    colors: {
      normal: '#8844aa',
      elite: '#663380', // Darkest purple
      ray: '#8844aa',
      rayHit: '#8844aa',
      marker: '#8844aa',
    },
    rayVisualization: {
      width: 0.5,
      hitRadius: 3,
    },
  },
];

// Helper function to get config by ID
export function getCarBrainConfig(id: string): CarBrainConfig | undefined {
  return CAR_BRAIN_CONFIGS.find((config) => config.id === id);
}

// ============================================================================
// SIMULATION DEFAULTS
// ============================================================================

export const DEFAULT_DIE_ON_BACKWARDS = true; // Kill cars that go backwards
export const DEFAULT_KILL_SLOW_CARS = true; // Kill cars that don't reach 1% in 1 second
export const DEFAULT_MUTATION_BY_DISTANCE = true; // Enable distance-based mutation

// ============================================================================
// RENDERING CONFIGURATION
// ============================================================================

// Display options
export const SHOW_CAR_PERCENTAGES = false; // Show progress percentages above cars

// Canvas
export const CANVAS_BACKGROUND_COLOR = '#4a7c4e'; // Grass green

// Track
export const TRACK_SURFACE_COLOR = '#333333'; // Dark gray asphalt
export const TRACK_BOUNDARY_COLOR = '#ffffff'; // White road edges
export const TRACK_CENTERLINE_COLOR = '#fbbf24'; // Yellow lane marking
export const START_FINISH_LINE_COLOR = '#ffffff'; // Green start/finish line
export const TRACK_BOUNDARY_WIDTH = 3;
export const TRACK_CENTERLINE_WIDTH = 2;
export const START_FINISH_LINE_WIDTH = 20;

// Cars
export const CAR_LABEL_COLOR_ALIVE = '#ffffff'; // White progress label
export const CAR_LABEL_COLOR_DEAD = '#9ca3af'; // Gray progress label

// Centerline ray (debug visualization)
export const CENTERLINE_RAY_HIT_COLOR = '#ffffff'; // White centerline dot

export const GENERATION_MARKER_RADIUS = 6;
