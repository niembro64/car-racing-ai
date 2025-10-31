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

export const GA_MUTATION_BASE = 0.1;
export const GA_MUTATION_MIN = 0.01;

// Bezier curve control points for mutation decay (CSS cubic-bezier style)
// Uses CSS cubic-bezier format: cubic-bezier(P1_X, P1_Y, P2_X, P2_Y)
// X-axis = track progress (0 = start, 1 = end of track)
// Y-axis = decay amount (0 = no decay/full mutation, 1 = full decay/min mutation)
// We invert Y to get mutation: mutationFactor = 1 - Y
// So low Y values = high mutation, high Y values = low mutation
// Array format: [P1_X, P1_Y, P2_X, P2_Y]
// Current: [1, 0, 0, 1] → stays high, drops rapidly in middle, smooth end
export const GA_MUTATION_BEZIER_POINTS = [1, 0, 0.25, 0.75];

/**
 * Evaluate a cubic bezier curve at parameter t.
 * Used for smooth, customizable mutation decay curves.
 *
 * @param t - Parameter along curve (0 to 1)
 * @param p0 - Start point
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point
 * @returns Point on the bezier curve at parameter t
 */
function cubicBezier(
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): Point {
  const oneMinusT = 1 - t;
  const oneMinusTSquared = oneMinusT * oneMinusT;
  const oneMinusTCubed = oneMinusTSquared * oneMinusT;
  const tSquared = t * t;
  const tCubed = tSquared * t;

  return {
    x:
      oneMinusTCubed * p0.x +
      3 * oneMinusTSquared * t * p1.x +
      3 * oneMinusT * tSquared * p2.x +
      tCubed * p3.x,
    y:
      oneMinusTCubed * p0.y +
      3 * oneMinusTSquared * t * p1.y +
      3 * oneMinusT * tSquared * p2.y +
      tCubed * p3.y,
  };
}

/**
 * Find the y-value on a bezier curve for a given x-value.
 * Uses binary search to find the t parameter that gives the desired x,
 * then returns the corresponding y value.
 * This implements proper CSS cubic-bezier evaluation.
 *
 * @param x - The x value to look up (0 to 1) - represents track progress
 * @param p0 - Start point (0, 0)
 * @param p1 - First control point
 * @param p2 - Second control point
 * @param p3 - End point (1, 1)
 * @returns The y value at the given x
 */
function bezierYForX(
  x: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): number {
  // Clamp x to valid range
  if (x <= 0) return p0.y;
  if (x >= 1) return p3.y;

  // Binary search to find t where bezier.x = x
  let tMin = 0;
  let tMax = 1;
  let t = x; // Initial guess

  // Iterate to find the correct t value
  for (let i = 0; i < 20; i++) {
    const point = cubicBezier(t, p0, p1, p2, p3);
    const currentX = point.x;

    // Check if we're close enough
    if (Math.abs(currentX - x) < 0.0001) {
      return point.y;
    }

    // Binary search: adjust bounds based on whether we're above or below target
    if (currentX < x) {
      tMin = t;
    } else {
      tMax = t;
    }
    t = (tMin + tMax) / 2;
  }

  // Fallback: return y at final t
  return cubicBezier(t, p0, p1, p2, p3).y;
}

/**
 * Calculate the base mutation rate that would be used for the next generation.
 * This encapsulates all the logic for determining mutation rate based on:
 * - Whether distance-based mutation is enabled
 * - Current progress on the track
 * - Bezier curve-based decay
 *
 * @param mutationByDistance - Whether distance-based mutation is enabled
 * @param bestDistance - Best distance reached by this car type (in track units)
 * @param trackLength - Total length of the track
 * @returns Base mutation rate (sigma) between GA_MUTATION_MIN and GA_MUTATION_BASE
 *
 * Behavior:
 * - If mutationByDistance is false: returns GA_MUTATION_MIN (constant, low mutation)
 * - If mutationByDistance is true: uses bezier curve-based decay across full track
 *   - Curve maps track progress (0→1) to decay factor (1→0)
 *   - At 0% progress: returns GA_MUTATION_BASE (maximum mutation for exploration)
 *   - At 100% progress: returns GA_MUTATION_MIN (minimum mutation for exploitation)
 *   - Bezier curve controls the shape of decay between these points
 *
 * Bezier Curve Control (CSS cubic-bezier style):
 * - Uses CSS cubic-bezier(P1_X, P1_Y, P2_X, P2_Y) format
 * - X-axis represents track progress (0 = start, 1 = end of track)
 * - Y-axis represents decay (0 = full mutation, 1 = min mutation)
 * - For a given track progress X, we find the Y value on the curve
 * - Then invert: mutationFactor = 1 - Y
 * - Common presets (use cubic-bezier.com visualizer):
 *   - Linear: [0, 0, 1, 1] → steady linear decay
 *   - Ease-in-out: [0.42, 0, 0.58, 1] → balanced S-curve
 *   - Ease-in: [0.42, 0, 1, 1] → stay high, drop at end
 *   - Ease-out: [0, 0, 0.58, 1] → drop early, level off
 *   - Current: [1, 0, 0, 1] → stay very high, rapid drop in middle, smooth end
 *
 * Note: This returns the BASE rate. Individual cars may have this rate
 * multiplied by a rank-based factor (see getMutationMultiplier).
 */
export function getMutationRate(
  mutationByDistance: boolean,
  bestDistance: number,
  trackLength: number
): number {
  if (!mutationByDistance) {
    return GA_MUTATION_MIN;
  }

  // Calculate track progress (0 = start, 1 = complete)
  const trackProgress = Math.max(0, Math.min(1, bestDistance / trackLength));

  // Use CSS-style cubic-bezier evaluation
  // X-axis = track progress (0 to 1)
  // Y-axis = easing value (0 to 1)
  const [p1x, p1y, p2x, p2y] = GA_MUTATION_BEZIER_POINTS;

  const p0: Point = { x: 0, y: 0 }; // Start: 0% track progress → 0% decay
  const p1: Point = { x: p1x, y: p1y }; // First control point
  const p2: Point = { x: p2x, y: p2y }; // Second control point
  const p3: Point = { x: 1, y: 1 }; // End: 100% track progress → 100% decay

  // Find Y value for the given X (track progress)
  // This properly evaluates cubic-bezier where X = track progress
  const easingValue = bezierYForX(trackProgress, p0, p1, p2, p3);

  // Invert to get decay factor (1 = full mutation, 0 = min mutation)
  // When track progress is low, easing is low, so decay factor is high (lots of mutation)
  // When track progress is high, easing is high, so decay factor is low (little mutation)
  const decayFactor = 1 - easingValue;

  const range = GA_MUTATION_BASE - GA_MUTATION_MIN;
  return GA_MUTATION_MIN + range * decayFactor;
}

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

// Lap completion threshold (0.90 = 90%)
// Lower than 1.0 to account for discrete physics updates and navigation difficulty
// Cars must complete 90% of the track to trigger lap completion
export const LAP_COMPLETION_THRESHOLD = 1;

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
export const POP_AVERAGE_SAVED_WEIGHT = 0.999; // Weight for saved average (0.99 = 99%)

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

// Generation marker history
export const GENERATION_MARKERS_MAX_HISTORY = 10; // Keep last N markers per car type for MEAN calculation

// Graph visualization options
export const GRAPH_GENERATION_USE_LOG_SCALE = true;

// ============================================================================
// Comprehensive Score Calculation Weights
// ============================================================================
// Configurable weights for ranking car brain configurations
// All weights should sum to 1.0 (100%)

export const COMPREHENSIVE_SCORE_WEIGHTS = {
  // Lap speed bonus: Reward for fast lap completion times (highest priority)
  lapSpeedBonus: 0.5, // 50% weight

  // Mean performance: Average completion across recent generations
  meanPerformance: 0.25, // 25% weight

  // Best performance: Peak capability achieved
  bestPerformance: 0.125, // 12.5% weight

  // Learning efficiency: How quickly the AI learns (fewer generations = better)
  learningEfficiency: 0.125, // 12.5% weight
};

// Note: Learning efficiency and lap speed are calculated using relative comparisons
// between all car types rather than fixed parameters. The car with the best value
// gets 100 points, the worst gets 0 points, and others are scaled linearly.
