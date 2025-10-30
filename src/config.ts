import type {
  Point,
  InputModificationType,
  ActivationType,
  CarBrainConfig,
} from './types';

export type { Point, InputModificationType, ActivationType, CarBrainConfig };

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

export const GA_MUTATION_BASE = 0.25;
export const GA_MUTATION_PROGRESS_FACTOR = 0.24;
export const GA_MUTATION_MIN = 0.01;

export function getPopulationSize(): number {
  if (typeof window === 'undefined') {
    return GA_POPULATION_SIZE_DESKTOP;
  }
  return window.innerWidth <= 768
    ? GA_POPULATION_SIZE_MOBILE
    : GA_POPULATION_SIZE_DESKTOP;
}

export const GA_MUTATION_MIN_MULTIPLIER = 0.3;
export const GA_MUTATION_MAX_MULTIPLIER = 4.0;
export const GA_MUTATION_CURVE_POWER = 2.0;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const TRACK_WIDTH_HALF = 40;
export const SEGMENTS_PER_CURVE = 20;

export const SHOW_CAR_PERCENTAGES = false;
export const DEBUG_SHOW_WAYPOINTS = true;

export const wp: Point[] = [
  { x: 400, y: 60 },
  { x: 700, y: 100 },
  { x: 700, y: 500 },
  { x: 490, y: 500 },
  { x: 450, y: 400 },
  { x: 460, y: 340 },
  { x: 530, y: 310 },
  { x: 600, y: 300 },
  { x: 630, y: 250 },
  { x: 600, y: 200 },
  { x: 550, y: 160 },
  { x: 490, y: 170 },
  { x: 430, y: 250 },
];
export const WAYPOINTS: Point[] = appendMirroredWaypoints(wp, CANVAS_WIDTH);

export const CAR_FORWARD_SPEED = 250;
export const CAR_STEERING_SENSITIVITY = 0.4;
export const CAR_WIDTH = 10;
export const CAR_HEIGHT = 20;
export const CAR_START_ANGLE_WIGGLE = Math.PI / 6;

export const SENSOR_RAY_ANGLES = [
  0,
  -Math.PI / 9,
  Math.PI / 9,
  -Math.PI / 4.5,
  Math.PI / 4.5,
  -Math.PI / 3,
  Math.PI / 3,
  -Math.PI / 2,
  Math.PI / 2,
];

export const SENSOR_RAY_PAIRS = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
];

export const NN_ARCH_SMALL = [SENSOR_RAY_ANGLES.length, 1];
export const NN_ARCH_MEDIUM = [SENSOR_RAY_ANGLES.length, 4, 1];
export const NN_ARCH_LARGE = [SENSOR_RAY_ANGLES.length, 6, 3, 1];
export const NN_ARCH_DIFF_SMALL = [1 + SENSOR_RAY_PAIRS.length, 1];
export const NN_ARCH_DIFF_MEDIUM = [1 + SENSOR_RAY_PAIRS.length, 4, 1];

// export const NN_ARCH_SMALL = [SENSOR_RAY_ANGLES.length, 4, 1];
// export const NN_ARCH_MEDIUM = [SENSOR_RAY_ANGLES.length, 8, 1];
// export const NN_ARCH_LARGE = [SENSOR_RAY_ANGLES.length, 12, 8, 1];
// export const NN_ARCH_DIFF_MEDIUM = [1 + SENSOR_RAY_PAIRS.length, 6, 1];
// export const NN_ARCH_DIFF_SMALL = [1 + SENSOR_RAY_PAIRS.length, 3, 1];

export const NEURAL_NETWORK_ARCHITECTURE = NN_ARCH_DIFF_MEDIUM;

export const CAR_BRAIN_CONFIGS: CarBrainConfig[] = [
  {
    displayName: 'DiffBot',
    id: 'difflinear',
    shortName: 'DB',
    description:
      '5 differential sensor inputs (1 forward + 4 L-R pairs) with Linear activation in hidden layer of size 6',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      normal: '#880000',
      elite: '#660000',
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
      '9 raw sensor inputs with Linear activation in hidden layer of size 8',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      normal: '#226699',
      elite: '#1a4d73',
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
      '9 raw sensor inputs with GELU activation in hidden layer of size 8',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      normal: '#aaaa33',
      elite: '#7a7a00',
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
    displayName: 'BigBrain',
    id: 'relularge',
    shortName: 'BB',
    description:
      '9 raw sensor inputs with ReLU activation in two hidden layers of size 10 each',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      normal: '#229922',
      elite: '#1a731a',
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
    displayName: 'WiggleBot',
    id: 'normstep',
    shortName: 'SB',
    description:
      '9 raw sensor inputs with Step activation in hidden layer of size 6 (expected to perform poorly)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      normal: '#cc6600',
      elite: '#994d00',
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
    displayName: 'SmolDiff',
    id: 'diffsmall',
    shortName: 'SB2',
    description:
      '5 differential sensor inputs (1 forward + 4 L-R pairs) with Linear activation in hidden layer of size 6',
    nn: {
      architecture: NN_ARCH_DIFF_SMALL,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      normal: '#8844aa',
      elite: '#663380',
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

export const GA_POPULATION_SIZE_DESKTOP = CAR_BRAIN_CONFIGS.length * 20;
export const GA_POPULATION_SIZE_MOBILE = CAR_BRAIN_CONFIGS.length * 10;

export const GA_POPULATION_SIZE = GA_POPULATION_SIZE_DESKTOP;

export function getCarBrainConfig(id: string): CarBrainConfig | undefined {
  return CAR_BRAIN_CONFIGS.find((config) => config.id === id);
}

// Adaptive Population Control Settings
export const ADAPTIVE_POPULATION_ENABLED = true;
export const ADAPTIVE_POPULATION_INITIAL = CAR_BRAIN_CONFIGS.length * 10; // 60 cars (10 per type)
export const ADAPTIVE_POPULATION_MIN = CAR_BRAIN_CONFIGS.length * 5; // 30 cars (5 per type)
export const ADAPTIVE_POPULATION_MAX = CAR_BRAIN_CONFIGS.length * 15; // 90 cars (15 per type)
export const ADAPTIVE_POPULATION_STEP = CAR_BRAIN_CONFIGS.length * 1; // Adjust by 6 cars (1 per type)
export const ADAPTIVE_FPS_TARGET = 55; // Target FPS to maintain
export const ADAPTIVE_FPS_LOW_THRESHOLD = 50; // Below this, reduce population
export const ADAPTIVE_FPS_HIGH_THRESHOLD = 58; // Above this, can increase population
export const ADAPTIVE_ADJUSTMENT_INTERVAL = 180; // Frames between adjustments (3 seconds at 60fps)

export const DEFAULT_DIE_ON_BACKWARDS = true;
export const DEFAULT_KILL_SLOW_CARS = true;
export const DEFAULT_MUTATION_BY_DISTANCE = true;

export const CANVAS_BACKGROUND_COLOR = '#4a7c4e';

// export const TRACK_SURFACE_COLOR = '#000';
// export const TRACK_SURFACE_COLOR = '#333333';
export const TRACK_SURFACE_COLOR = '#888';
export const TRACK_BOUNDARY_COLOR = '#ffffff';
export const TRACK_CENTERLINE_COLOR = '#fbbf24';
export const START_FINISH_LINE_COLOR = '#ffffff';
export const TRACK_BOUNDARY_WIDTH = 3;
export const TRACK_CENTERLINE_WIDTH = 2;
export const START_FINISH_LINE_WIDTH = 20;

export const CAR_LABEL_COLOR_ALIVE = '#ffffff';
export const CAR_LABEL_COLOR_DEAD = '#9ca3af';

export const CENTERLINE_RAY_HIT_COLOR = '#ffffff';

export const GENERATION_MARKER_RADIUS = 6;
