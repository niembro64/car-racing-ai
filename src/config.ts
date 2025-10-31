import type {
  Point,
  InputModificationType,
  ActivationType,
  CarBrainConfig,
  SpeedMultiplier,
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
export const SEGMENTS_PER_CURVE = 10;

// Lap completion threshold (0.995 = 99.5%)
// Lower than 1.0 to account for discrete physics updates
export const LAP_COMPLETION_THRESHOLD = 0.995;

export const SHOW_CAR_PERCENTAGES = false;
export const DEBUG_SHOW_WAYPOINTS = false;

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

export const CAR_FORWARD_SPEED = 100;
export const CAR_STEERING_SENSITIVITY = 0.2;
export const CAR_WIDTH = 10;
export const CAR_HEIGHT = 20;
export const CAR_START_ANGLE_WIGGLE = Math.PI / 16;

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
export const NN_ARCH_MEDIUM = [SENSOR_RAY_ANGLES.length, 3, 1];
export const NN_ARCH_LARGE = [SENSOR_RAY_ANGLES.length, 3, 2, 1];
export const NN_ARCH_DIFF_SMALL = [1 + SENSOR_RAY_PAIRS.length, 1];
export const NN_ARCH_DIFF_MEDIUM = [1 + SENSOR_RAY_PAIRS.length, 3, 1];
export const NN_ARCH_DIFF_LARGE = [1 + SENSOR_RAY_PAIRS.length, 3, 2, 1];

export const NEURAL_NETWORK_ARCHITECTURE = NN_ARCH_DIFF_MEDIUM;

// Ray visualization settings
export const RAY_VISUALIZATION_WIDTH = 0.5;
export const RAY_VISUALIZATION_HIT_RADIUS = 3;

export const CAR_BRAIN_CONFIGS_DEFINED: CarBrainConfig[] = [
  // === None/Raw (no hidden layers, no activation function) ===
  {
    useCar: true,
    displayName: 'Pico',
    shortName: 'PC',
    description: 'No hidden layers, differential inputs (1 fwd + 4 L-R pairs)',
    nn: {
      architecture: NN_ARCH_DIFF_SMALL,
      inputModification: 'pair',
      activationType: '-',
    },
    colors: {
      light: '#cccccc',
      dark: '#999999',
    },
  },
  {
    useCar: true,
    displayName: 'Nano',
    shortName: 'NA',
    description: 'No hidden layers, direct raw sensor inputs (9 rays)',
    nn: {
      architecture: NN_ARCH_SMALL,
      inputModification: 'dir',
      activationType: '-',
    },
    colors: {
      light: '#aaaaaa',
      dark: '#777777',
    },
  },

  // === Linear activation (orange/yellow family) ===
  {
    useCar: true,
    displayName: 'Spark',
    shortName: 'SP',
    description: 'Linear activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#cc8833',
      dark: '#995522',
    },
  },
  {
    useCar: false,
    displayName: 'Flame',
    shortName: 'FL',
    description: 'Linear activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#aa6611',
      dark: '#774400',
    },
  },
  {
    useCar: true,
    displayName: 'Glow',
    shortName: 'GL',
    description: 'Linear activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#ccaa33',
      dark: '#997722',
    },
  },
  {
    useCar: false,
    displayName: 'Blaze',
    shortName: 'BL',
    description: 'Linear activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#aa8811',
      dark: '#775500',
    },
  },

  // === ReLU activation (blue family) ===
  {
    useCar: false,
    displayName: 'Drop',
    shortName: 'DR',
    description: 'ReLU activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#5588cc',
      dark: '#336699',
    },
  },
  {
    useCar: false,
    displayName: 'Wave',
    shortName: 'WV',
    description: 'ReLU activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#3366aa',
      dark: '#224477',
    },
  },
  {
    useCar: false,
    displayName: 'Mist',
    shortName: 'MI',
    description: 'ReLU activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#55aacc',
      dark: '#338899',
    },
  },
  {
    useCar: false,
    displayName: 'Tide',
    shortName: 'TD',
    description: 'ReLU activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#3388aa',
      dark: '#226677',
    },
  },

  // === GELU activation (green/cyan family) ===
  {
    useCar: true,
    displayName: 'Leaf',
    shortName: 'LF',
    description: 'GELU activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#44cc88',
      dark: '#229955',
    },
  },
  {
    useCar: false,
    displayName: 'Vine',
    shortName: 'VN',
    description: 'GELU activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#22aa66',
      dark: '#117733',
    },
  },
  {
    useCar: true,
    displayName: 'Moss',
    shortName: 'MS',
    description: 'GELU activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#44ccaa',
      dark: '#229977',
    },
  },
  {
    useCar: false,
    displayName: 'Fern',
    shortName: 'FN',
    description: 'GELU activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#22aa88',
      dark: '#117755',
    },
  },

  // === Step activation (purple/magenta family) ===
  {
    useCar: false,
    displayName: 'Bit',
    shortName: 'BT',
    description: 'Step activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#cc55cc',
      dark: '#993399',
    },
  },
  {
    useCar: false,
    displayName: 'Byte',
    shortName: 'BY',
    description: 'Step activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#aa33aa',
      dark: '#771177',
    },
  },
  {
    useCar: false,
    displayName: 'Chip',
    shortName: 'CH',
    description: 'Step activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#9955cc',
      dark: '#663399',
    },
  },
  {
    useCar: false,
    displayName: 'Core',
    shortName: 'CR',
    description: 'Step activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#7733aa',
      dark: '#551177',
    },
  },
];

export const CAR_BRAIN_CONFIGS = CAR_BRAIN_CONFIGS_DEFINED.filter(
  (config) => config.useCar
);

export const GA_POPULATION_SIZE_DESKTOP = CAR_BRAIN_CONFIGS.length * 20;
export const GA_POPULATION_SIZE_MOBILE = CAR_BRAIN_CONFIGS.length * 10;

export const GA_POPULATION_SIZE = GA_POPULATION_SIZE_DESKTOP;

export function getCarBrainConfig(shortName: string): CarBrainConfig | undefined {
  return CAR_BRAIN_CONFIGS.find((config) => config.shortName === shortName);
}

// ============================================================================
// Performance Management System
// ============================================================================
// Advanced adaptive population control using PID control theory and
// multi-metric performance monitoring for optimal system performance

export const PERFORMANCE_MANAGEMENT_ENABLED = true;

// Performance Monitor Configuration
export const PERF_TARGET_FPS = 60;
export const PERF_HISTORY_SIZE = 60 * 20; // 2 seconds of history at 60fps

// Population Controller Configuration
export const POP_INITIAL = CAR_BRAIN_CONFIGS.length * 20; // 180 cars (30 per type)
export const POP_MIN = CAR_BRAIN_CONFIGS.length * 1; // 6 cars (1 per type)
export const POP_MAX = CAR_BRAIN_CONFIGS.length * 50; // 300 cars (50 per type)

// PID Controller Gains (tuned for stability and responsiveness)
// P: Responds to current error (how far from target FPS)
// I: Eliminates steady-state error (accumulates over time)
// D: Dampens oscillation (responds to rate of change)
export const PID_KP = 2.0; // Proportional gain
export const PID_KI = 0.1; // Integral gain
export const PID_KD = 1; // Derivative gain

// Adjustment Constraints
export const POP_MAX_CHANGE_RATE = 0.15; // Max 15% change per adjustment
export const POP_ADJUSTMENT_INTERVAL = 180; // Adjust every 180 frames (3s at 60fps)

// Hysteresis (prevents oscillation near target)
export const POP_HYSTERESIS_THRESHOLD = 0.05; // ±5% of target FPS

// Performance Thresholds
export const PERF_EMERGENCY_FPS = 20; // Aggressive reduction below this
export const PERF_SAFE_FPS = 50; // Conservative growth above this

// Legacy compatibility (for gradual migration)
export const ADAPTIVE_POPULATION_ENABLED = PERFORMANCE_MANAGEMENT_ENABLED;
export const ADAPTIVE_POPULATION_INITIAL = POP_INITIAL;
export const ADAPTIVE_TARGET_FPS = PERF_TARGET_FPS;
export const ADAPTIVE_MIN_CARS_PER_TYPE = 1;

export const DEFAULT_DIE_ON_BACKWARDS = true;
export const DEFAULT_KILL_SLOW_CARS = true;
export const DEFAULT_MUTATION_BY_DISTANCE = true;
export const DEFAULT_DELAYED_STEERING = true;
export const CAR_STEERING_DELAY_SECONDS = 0.2;
export const DEFAULT_SPEED_MULTIPLIER: SpeedMultiplier = 2;

export const ENABLE_CONSOLE_LOGS = true;

// Console logging utility
export function print(...args: any[]): void {
  if (ENABLE_CONSOLE_LOGS) {
    console.log(...args);
  }
}

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

// Graph visualization options
export const GRAPH_GENERATION_USE_LOG_SCALE = true;
