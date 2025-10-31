import type {
  Point,
  InputModificationType,
  ActivationType,
  CarBrainConfig,
  SpeedMultiplier,
} from './types';
import {
  SENSOR_RAY_ANGLES,
  SENSOR_RAY_PAIRS,
  NN_ARCH_SMALL,
  NN_ARCH_MEDIUM,
  NN_ARCH_LARGE,
  NN_ARCH_DIFF_SMALL,
  NN_ARCH_DIFF_MEDIUM,
  NN_ARCH_DIFF_LARGE,
} from './config_nn';
import { CAR_BRAIN_CONFIGS } from './core/config_cars';

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
export const LAP_COMPLETION_THRESHOLD = 0.999;

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

// Re-export constants from config_nn.ts
export {
  SENSOR_RAY_ANGLES,
  SENSOR_RAY_PAIRS,
  NN_ARCH_SMALL,
  NN_ARCH_MEDIUM,
  NN_ARCH_LARGE,
  NN_ARCH_DIFF_SMALL,
  NN_ARCH_DIFF_MEDIUM,
  NN_ARCH_DIFF_LARGE,
};

export const NEURAL_NETWORK_ARCHITECTURE = NN_ARCH_DIFF_MEDIUM;

// Ray visualization settings
export const RAY_VISUALIZATION_WIDTH = 0.5;
export const RAY_VISUALIZATION_HIT_RADIUS = 3;

export const GA_POPULATION_SIZE_DESKTOP = CAR_BRAIN_CONFIGS.length * 20;
export const GA_POPULATION_SIZE_MOBILE = CAR_BRAIN_CONFIGS.length * 10;

export const GA_POPULATION_SIZE = GA_POPULATION_SIZE_DESKTOP;

export function getCarBrainConfig(
  shortName: string
): CarBrainConfig | undefined {
  return CAR_BRAIN_CONFIGS.find((config) => config.shortName === shortName);
}

// ============================================================================
// Population Controller Configuration
// ============================================================================
// Adaptive population management with single threshold system
// Adjusts car population every second based on 0.1% low FPS

export const PERFORMANCE_MANAGEMENT_ENABLED = true;

// Performance Monitor Settings
export const PERF_TARGET_FPS = 60; // Target FPS (used for display only)
export const PERF_HISTORY_SIZE = 1000; // ~16 seconds of FPS history at 60fps (needed for accurate percentiles)
export const PERF_INITIAL_SMOOTHED_FPS = 60; // Initial smoothed FPS value
export const PERF_SMOOTHING_FACTOR = 0.1; // EMA smoothing factor (0-1, lower = smoother)
export const PERF_TREND_WINDOW_SIZE = 20; // Number of samples for trend calculation
export const PERF_MAX_VALID_FRAME_TIME_MS = 1000; // Maximum valid frame time (ignore spikes above this)
export const PERF_MAX_ACCEPTABLE_VARIANCE_MS = 10; // Maximum acceptable frame time variance for stability
export const PERF_HEADROOM_FACTOR = 0.5; // Factor for headroom calculation (0.5 = 50% of target)
export const PERF_MIN_TREND_SAMPLES = 5; // Minimum samples needed for trend calculation
export const PERF_MAX_TREND_SLOPE = 5; // Maximum trend slope (FPS per sample) for normalization
export const PERF_CALIBRATION_MIN_FRAMES = 60; // Minimum frames before metrics are considered reliable
export const PERF_CALIBRATION_HISTORY_RATIO = 0.5; // Minimum ratio of history filled for calibration (50%)
export const PERF_UI_UPDATE_INTERVAL = 1; // Update FPS display every N frames (1 = every frame)
export const FPS_CALC_SAVED_WEIGHT = 0.99;
// Population Bounds
export const POP_INITIAL = CAR_BRAIN_CONFIGS.length * 20; 
export const POP_MIN = CAR_BRAIN_CONFIGS.length * 1; // 6 cars (1 per type minimum)
export const POP_MAX = CAR_BRAIN_CONFIGS.length * 50; // 300 cars (50 per type maximum)

// Single Threshold System
export const POP_THRESHOLD_FPS = 20; // The ONLY threshold: 0.1% low FPS target
export const POP_INCREASE_PERCENTAGE = 0.15; // Add 15% when above threshold
export const POP_DECREASE_PERCENTAGE = 0.15; // Remove 15% when below threshold
export const POP_MINIMUM_ESCAPE_MULTIPLIER = 3; // At minimum: add (types × 3) cars instead of percentage

// Adjustment Timing
export const POP_ADJUSTMENT_INTERVAL = 60 * 15; // Adjust every 60 frames (1 second at 60fps)
export const POP_MAX_CHANGE_RATE = 0.05; // Maximum population change per adjustment (5%)

// Average Cars per Type Tracking
export const POP_AVERAGE_INITIAL = 0; // Initial value for average cars per type
export const POP_AVERAGE_UPDATE_INTERVAL = 1; // Update average every N frames (1 = every frame)
export const POP_AVERAGE_SAVED_WEIGHT = 0.99; // Weight for saved average (0.99 = 99%)

export const DEFAULT_DIE_ON_BACKWARDS = true;
export const DEFAULT_KILL_SLOW_CARS = true;
export const DEFAULT_MUTATION_BY_DISTANCE = true;
export const DEFAULT_DELAYED_STEERING = true;
export const CAR_STEERING_DELAY_SECONDS = 1;
export const DEFAULT_SPEED_MULTIPLIER: SpeedMultiplier = 1;

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
