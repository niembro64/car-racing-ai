/**
 * ============================================================================
 * GENETIC RACING AI - CONFIGURATION
 * ============================================================================
 *
 * This file contains all tunable parameters for the genetic algorithm-based
 * racing simulation. The AI learns to drive using:
 *
 * 1. NEURAL NETWORK: Processes sensor data → outputs steering
 *    - 9 distance sensors (raycasts) detect track boundaries
 *    - 6 hidden neurons learn racing patterns
 *    - 1 output neuron controls steering (-1 to +1)
 *
 * 2. GENETIC ALGORITHM: Evolves neural network weights
 *    - Population of 100 cars per generation
 *    - Elite selection: best car's brain is preserved
 *    - Mutation: progressive mutation rates create diversity
 *    - Adaptive: mutation increases with selection pressure
 *
 * 3. FITNESS FUNCTION: Distance traveled along track centerline
 *    - Rewards forward progress
 *    - Penalizes crashes and backwards movement
 *    - Allows multiple laps (unbounded progress)
 *
 * KEY TUNING TIPS:
 * - Increase GA_MUTATION_RATE for faster exploration (risk: instability)
 * - Increase NEURAL_NETWORK_ARCHITECTURE[1] for complex track learning
 * - Increase GA_POPULATION_SIZE for more diversity (slower per generation)
 * - Decrease GA_MUTATION_CURVE_POWER to give more cars high mutation
 */

import { Point } from './core/math/geom';

// ============================================================================
// CAR BRAIN CONFIGURATION SYSTEM
// ============================================================================
// Defines all car types with their neural network architectures, colors,
// and visualization settings in a centralized, extensible structure.

export interface CarBrainConfig {
  // Identification
  id: string; // Unique identifier (e.g., 'normrelu', 'difflinear')
  displayName: string; // Full name for display (e.g., 'NormReLU', 'DiffLinear')
  shortName: string; // Abbreviated name for HUD (e.g., 'NR', 'DL')
  description: string; // Human-readable description of the approach

  // Neural network configuration
  architecture: number[]; // Layer sizes [input, hidden..., output]
  useDifferentialInputs: boolean; // true = differential pairs, false = raw sensors
  activationType: 'relu' | 'linear' | 'gelu'; // Hidden layer activation function

  // Visual appearance
  colors: {
    normal: string; // Color for standard (mutated) cars
    elite: string; // Color for elite (best) car
    ray: string; // Color for sensor rays
    rayHit: string; // Color for ray hit points
    marker: string; // Color for generation markers on track
  };

  // Ray visualization settings
  rayVisualization: {
    width: number; // Line width for sensor rays
    hitRadius: number; // Radius of hit point circles
  };
}

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

// Base mutation rate (σ) - controls how much weights change per generation
// Adaptive: automatically increases when generations die quickly (fast selection pressure)
export const GA_MUTATION_RATE = 0.08;

// Population size - number of cars per generation
// Higher = more diversity but slower evolution per generation
export const GA_POPULATION_SIZE = 100;

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
export const NEURAL_NETWORK_ARCHITECTURE_STANDARD = [
  SENSOR_RAY_ANGLES.length,
  6,
  1,
];

export const NEURAL_NETWORK_ARCHITECTURE_LARGE = [
  SENSOR_RAY_ANGLES.length,
  10,
  10,
  1,
];

// Differential mode: [5 inputs] → [4 hidden] → [1 output]
// - Input layer: 1 forward sensor + 4 differential pairs (left - right)
// - Hidden layer: 4 neurons (smaller network for fewer inputs)
// - Output layer: 1 neuron (steering: -1 = full left, +1 = full right)
export const NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL = [
  1 + SENSOR_RAY_PAIRS.length,
  4,
  1,
];

// Default architecture (can be changed at runtime)
export const NEURAL_NETWORK_ARCHITECTURE =
  NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL;

// Note: Can experiment with deeper networks for complex tracks:
// - [9, 8, 1] - More capacity in single hidden layer
// - [9, 8, 4, 1] - Two hidden layers for hierarchical feature learning

// ============================================================================
// CAR BRAIN TYPE DEFINITIONS
// ============================================================================
// Array of all car brain configurations to be evolved in parallel.
// Each config represents a distinct approach to the racing problem.
//
// ┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
// │                            CAR BRAIN CONFIGURATION TABLE                                           │
// ├─────────────┬──────────────┬──────┬────────────┬────────────┬────────────┬────────────────────────┤
// │ ID          │ Display Name │ Code │ Inputs     │ Activation │ Arch       │ Colors                 │
// ├─────────────┼──────────────┼──────┼────────────┼────────────┼────────────┼────────────────────────┤
// │ difflinear  │ DIFF_LINEAR  │  DL  │ 5 (diff)   │ Linear     │ [5, 4, 1]  │ Red    (#880000/ff5555)│
// │ normlinear  │ NORM_LINEAR  │  NL  │ 9 (raw)    │ Linear     │ [9, 6, 1]  │ Blue   (#226699/33aaff)│
// │ normrelu    │ NORM_RELU    │  NR  │ 9 (raw)    │ ReLU       │ [9, 6, 1]  │ Yellow (#fbbf24/fcd34d)│
// └─────────────┴──────────────┴──────┴────────────┴────────────┴────────────┴────────────────────────┘
//
// Input Types:
//   • 5 (diff) = 1 forward sensor + 4 differential pairs (left - right)
//   • 9 (raw)  = 9 individual sensor rays covering 180° field of view
//
// Activation Types:
//   • Linear = Identity function in hidden layers (f(x) = x)
//   • ReLU   = Rectified Linear Unit in hidden layers (f(x) = max(0, x))
//
// Colors: normal/elite (normal = mutated cars, elite = best car)
//
// Population Split:
//   • Total population = 100 cars
//   • Cars per type = 100 / 3 ≈ 33 cars each
//   • Each type evolves independently
//

export const CAR_BRAIN_CONFIGS: CarBrainConfig[] = [
  {
    id: 'difflinear',
    displayName: 'DIFF_LINEAR',
    shortName: 'DL',
    description:
      '5 differential sensor inputs (1 forward + 4 L-R pairs) with Linear activation in hidden layers',
    architecture: NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL,
    useDifferentialInputs: true,
    activationType: 'linear',
    colors: {
      normal: '#880000', // Dark muted red
      elite: '#ff5555', // Bright red
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
    id: 'normlinear',
    displayName: 'NORM_LINEAR',
    shortName: 'NL',
    description: '9 raw sensor inputs with Linear activation in hidden layers',
    architecture: NEURAL_NETWORK_ARCHITECTURE_STANDARD,
    useDifferentialInputs: false,
    activationType: 'linear',
    colors: {
      normal: '#226699', // Dark muted blue
      elite: '#33aaff', // Bright blue
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
    id: 'normrelu',
    displayName: 'NORM_RELU',
    shortName: 'NR',
    description: '9 raw sensor inputs with ReLU activation in hidden layers',
    architecture: NEURAL_NETWORK_ARCHITECTURE_STANDARD,
    useDifferentialInputs: false,
    activationType: 'relu',

    colors: {
      normal: '#aaaa33',
      elite: '#fcd34d',
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
    id: 'gelularge',
    displayName: 'GELU_LARGE',
    shortName: 'GL',
    description: '10 raw sensor inputs with GELU activation in hidden layers',
    architecture: NEURAL_NETWORK_ARCHITECTURE_LARGE,
    useDifferentialInputs: false,
    activationType: 'gelu',
    // green
    colors: {
      normal: '#33aa33',
      elite: '#6ee66e',
      ray: '#33aa33',
      rayHit: '#33aa33',
      marker: '#33aa33',
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

export const DEFAULT_DIFFERENTIAL_INPUTS = true; // Default input mode for Car constructor
export const DEFAULT_DIE_ON_BACKWARDS = true; // Kill cars that go backwards
export const DEFAULT_KILL_SLOW_CARS = true; // Kill cars that don't reach 1% in 1 second

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
export const START_FINISH_LINE_COLOR = '#fbbf24'; // Green start/finish line
export const TRACK_BOUNDARY_WIDTH = 3;
export const TRACK_CENTERLINE_WIDTH = 2;
export const START_FINISH_LINE_WIDTH = 20;

// Cars
export const CAR_LABEL_COLOR_ALIVE = '#ffffff'; // White progress label
export const CAR_LABEL_COLOR_DEAD = '#9ca3af'; // Gray progress label

// NormReLU cars (blue) - 9 inputs, ReLU activation
export const NORM_RELU_CAR_COLOR = '#226699'; // Dark muted blue (mutated variants)
export const NORM_RELU_ELITE_CAR_COLOR = '#33aaff'; // Bright blue (elite)
export const NORM_RELU_CAR_RAY_COLOR = NORM_RELU_CAR_COLOR;
export const NORM_RELU_CAR_RAY_HIT_COLOR = NORM_RELU_CAR_COLOR;
export const NORM_RELU_CAR_RAY_WIDTH = 0.5;
export const NORM_RELU_CAR_RAY_HIT_RADIUS = 3;

// DiffLinear cars (red) - 5 inputs, Linear activation
export const DIFF_LINEAR_CAR_COLOR = '#880000'; // Dark muted red (mutated variants)
export const DIFF_LINEAR_ELITE_CAR_COLOR = '#ff5555'; // Bright red (elite)
export const DIFF_LINEAR_CAR_RAY_COLOR = DIFF_LINEAR_CAR_COLOR;
export const DIFF_LINEAR_CAR_RAY_HIT_COLOR = DIFF_LINEAR_CAR_COLOR;
export const DIFF_LINEAR_CAR_RAY_WIDTH = 0.5;
export const DIFF_LINEAR_CAR_RAY_HIT_RADIUS = 3;

// Centerline ray (debug visualization)
export const CENTERLINE_RAY_HIT_COLOR = '#ffffff'; // White centerline dot

// Generation markers
export const NORM_RELU_MARKER_COLOR = NORM_RELU_CAR_COLOR; // Blue markers for NormReLU cars
export const DIFF_LINEAR_MARKER_COLOR = DIFF_LINEAR_CAR_COLOR; // Red markers for DiffLinear cars
export const GENERATION_MARKER_RADIUS = 6;
