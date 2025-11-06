import type {
  Point,
  InputModificationType,
  ActivationType,
  CarBrainConfig,
  InfoView,
  CarUsageLevel,
  VisualizationMode,
} from './types';
import type { Config } from './config.types';
import {
  SENSOR_RAY_ANGLES as _SENSOR_RAY_ANGLES,
  SENSOR_RAY_PAIRS as _SENSOR_RAY_PAIRS,
  NN_ARCH_DIRECT_S as _NN_ARCH_SMALL,
  NN_ARCH_DIRECT_M as _NN_ARCH_MEDIUM,
  NN_ARCH_DIRECT_L as _NN_ARCH_LARGE,
  NN_ARCH_PAIR_S as _NN_ARCH_DIFF_SMALL,
  NN_ARCH_PAIR_M as _NN_ARCH_DIFF_MEDIUM,
  NN_ARCH_PAIR_L as _NN_ARCH_DIFF_LARGE,
  NN_ARCH_PAIR_XL as _NN_ARCH_DIFF_XL,
} from './config_nn';
import {
  CAR_BRAIN_CONFIGS,
  CAR_BRAIN_CONFIGS_DEFINED,
} from './core/config_cars';

export type { Point, InputModificationType, ActivationType, CarBrainConfig };
export type { Config } from './config.types';

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

const multiplier: number = 100;

const canvas_width: number = 16 * multiplier;
const canvas_height: number = 9 * multiplier;

// Track waypoints defined as ratios (0.0 to 1.0) of canvas dimensions
// This allows the track to scale proportionally with canvas size
// To get absolute coordinates: x_absolute = x_ratio * canvas_width, y_absolute = y_ratio * canvas_height
export const track_waypoints_ratios: Point[] = [
  { x: 0.5, y: 0.1 },
  { x: 0.85, y: 0.12 },
  { x: 0.95, y: 0.5 },
  { x: 0.8, y: 0.9 },
  { x: 0.6125, y: 0.8333 },
  { x: 0.5625, y: 0.6667 },
  { x: 0.63, y: 0.56 },
  { x: 0.75, y: 0.6 },
  { x: 0.81, y: 0.5 },
  { x: 0.8, y: 0.35 },
  { x: 0.6875, y: 0.2667 },
  { x: 0.6125, y: 0.32 },
  { x: 0.5375, y: 0.4167 },
];

// Helper function to convert ratio waypoints to absolute coordinates
function scaleWaypointsToCanvas(
  ratios: Point[],
  width: number,
  height: number
): Point[] {
  return ratios.map((p) => ({
    x: p.x * width,
    y: p.y * height,
  }));
}

export const CONFIG: Config = {
  canvas: {
    width: canvas_width,
    height: canvas_height,
  },

  track: {
    halfWidth: 70,
    segmentsPerCurve: 10,
    waypoints: {
      base: scaleWaypointsToCanvas(
        track_waypoints_ratios,
        canvas_width,
        canvas_height
      ),
      mirrored: appendMirroredWaypoints(
        scaleWaypointsToCanvas(
          track_waypoints_ratios,
          canvas_width,
          canvas_height
        ),
        canvas_width
      ),
    },
    colors: {
      surface: '#333',
      boundary: '#000',
      centerline: '#883',
      startFinishLine: '#666',
    },
    lineWidths: {
      boundary: 3,
      centerline: 3,
      startFinishLine: 10,
    },
  },

  car: {
    physics: {
      forwardSpeed: 400,
      steeringSensitivityValues: [0.001, 0.01, 0.1],
      defaultSteeringSensitivity: 0, // Index into steeringSensitivityValues
      steeringDelaySeconds: 0.2,
    },
    dimensions: {
      simple: {
        radius: 10, // Circular car for collision/physics
        borderWidth: 2,
      },
      detailed: {
        width: 200,
        height: 300,
        borderWidth: 8,
      },
    },
    spawn: {
      angleWiggle: Math.PI / 200,
    },
    colors: {
      labelAlive: '#ffffff',
      labelDead: '#333',
      bodyAliveStroke: '#1f2937',
      bodyDead: '#444',
      bodyDeadStroke: '#222',
      directionIndicatorAlive: '#ffffff',
      directionIndicatorDead: '#666',
    },
    eliteSizeMultiplier: 1,
  },

  sensors: {
    visualization: {
      rayWidth: 1,
      hitRadius: 6,
      centerlineHitColor: '#ffffff',
    },
  },

  neuralNetwork: {
    architectures: {
      small: _NN_ARCH_SMALL,
      medium: _NN_ARCH_MEDIUM,
      large: _NN_ARCH_LARGE,
      diffSmall: _NN_ARCH_DIFF_SMALL,
      diffMedium: _NN_ARCH_DIFF_MEDIUM,
      diffLarge: _NN_ARCH_DIFF_LARGE,
      diffXL: _NN_ARCH_DIFF_XL,
    },
    sensorRays: {
      angles: _SENSOR_RAY_ANGLES,
      pairs: _SENSOR_RAY_PAIRS,
    },
  },

  geneticAlgorithm: {
    mutation: {
      startingRates: [0.01, 0.1, 1], // Mutation rates (low, medium, high)
      defaultStartingRate: 0, // Index into startingRates
      minimumRate: 0.01, // Minimum mutation rate at track completion
      networkSizeScale: {
        smallestNetwork: 1.0, // Smallest network gets full mutation
        largestNetwork: 0.5, // Largest network gets no mutation (no learning)
      },
      trackProgressCurve: [0, 0, 1, 1], // Linear decay as cars progress through track
      populationRankScale: {
        firstMutant: 0.001, // First mutant explores cautiously
        lastMutant: 1, // Last mutant explores aggressively
        curvePower: 50, // Quadratic progression between first and last
      },
    },
    population: {
      initial: {
        desktop: 20,
        mobile: 10,
      },
      bounds: {
        min: CAR_BRAIN_CONFIGS.length * 1,
        max: CAR_BRAIN_CONFIGS.length * 50,
      },
      adjustment: {
        thresholdFPS: 30,
        increasePercentage: 0.15,
        decreasePercentage: 0.15,
        minimumEscapeMultiplier: 3,
        intervalFrames: 60 * 15,
        maxChangeRate: 0.05,
      },
      average: {
        initial: 0,
        updateInterval: 1,
        savedWeight: 0.999,
      },
    },
    brainSelection: {
      defaultStrategy: 'sexual',
    },
  },

  performance: {
    enabled: true,
    targetFPS: 60,
    monitoring: {
      historySize: 1000,
      initialSmoothedFPS: 60,
      smoothingFactor: 0.1,
      trendWindowSize: 20,
      maxValidFrameTimeMs: 1000,
      maxAcceptableVarianceMs: 10,
      headroomFactor: 0.5,
      minTrendSamples: 5,
      maxTrendSlope: 5,
    },
    calibration: {
      minFrames: 60,
      historyRatio: 0.5,
    },
    ui: {
      updateInterval: 1,
    },
    fpsCalcSavedWeight: 0.999,
  },

  lap: {
    completionThreshold: 1,
  },

  scoring: {
    weights: {
      lapSpeedBonus: 0.5,
      meanPerformance: 0.25,
      bestPerformance: 0.125,
      learningEfficiency: 0.125,
    },
  },

  visualization: {
    showCarPercentages: false,
    debugShowWaypoints: false,
    waypoints: {
      fontSize: 34,
      radius: 8,
      textOffset: -12,
      colors: {
        marker: '#ff0000',
        text: '#ffffff',
        textStroke: '#000000',
      },
    },
    generationMarker: {
      radius: 8,
      fontSize: 20,
      textOffset: -2,
      maxHistory: 100,
      showGenerationNumber: false,
    },
    graph: {
      useLogScale: false,
      recentGenerationsCount: 20,
      labelRightPadding: 60,
    },
    neuronBorder: {
      color: '#fff',
      width: 0,
    },
    rotateBrainOverlay: true, // Whether the brain overlay rotates with the car or stays upright
  },

  debug: {
    disableNearnessCalculation: true,
  },

  defaults: {
    dieOnBackwards: true,
    killSlowCars: true,
    mutationByDistance: true,
    delayedSteering: true,
    speedMultiplierIndex: 2, // Index into SPEED_MULTIPLIERS (0.2, 0.5, 1, 2, 3, 4)
    showRays: true,
    defaultInfoView: 'graph-score' as InfoView,
    defaultCarUsageLevel: 'use-many' as CarUsageLevel,
    defaultVisualizationMode: 'vis-medium' as VisualizationMode,
  },
};

// Re-export print from logger utility to maintain backwards compatibility
export { print } from './utils/logger';

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

function bezierYForX(
  x: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): number {
  if (x <= 0) return p0.y;
  if (x >= 1) return p3.y;

  let tMin = 0;
  let tMax = 1;
  let t = x;

  for (let i = 0; i < 20; i++) {
    const point = cubicBezier(t, p0, p1, p2, p3);
    const currentX = point.x;

    if (Math.abs(currentX - x) < 0.0001) {
      return point.y;
    }

    if (currentX < x) {
      tMin = t;
    } else {
      tMax = t;
    }
    t = (tMin + tMax) / 2;
  }

  return cubicBezier(t, p0, p1, p2, p3).y;
}

export function getMutationRate(
  mutationByDistance: boolean,
  bestDistance: number,
  trackLength: number,
  mutationRateIndex: number = 0
): number {
  if (!mutationByDistance) {
    return CONFIG.geneticAlgorithm.mutation.minimumRate;
  }

  const trackProgress = Math.max(0, Math.min(1, bestDistance / trackLength));
  const [p1x, p1y, p2x, p2y] =
    CONFIG.geneticAlgorithm.mutation.trackProgressCurve;

  const p0: Point = { x: 0, y: 0 };
  const p1: Point = { x: p1x, y: p1y };
  const p2: Point = { x: p2x, y: p2y };
  const p3: Point = { x: 1, y: 1 };

  const easingValue = bezierYForX(trackProgress, p0, p1, p2, p3);
  const decayFactor = 1 - easingValue;

  // Select starting rate based on index
  const startingRate =
    CONFIG.geneticAlgorithm.mutation.startingRates[mutationRateIndex] ??
    CONFIG.geneticAlgorithm.mutation.startingRates[0];

  const range = startingRate - CONFIG.geneticAlgorithm.mutation.minimumRate;

  return CONFIG.geneticAlgorithm.mutation.minimumRate + range * decayFactor;
}

export function countTrainableParameters(architecture: number[]): number {
  let totalParams = 0;

  for (let i = 0; i < architecture.length - 1; i++) {
    const inputSize = architecture[i];
    const outputSize = architecture[i + 1];
    totalParams += inputSize * outputSize + outputSize;
  }

  return totalParams;
}

export function getParameterBasedMutationScale(
  parameterCount: number,
  minParams: number,
  maxParams: number
): number {
  // If all active networks have the same size, we need to compare against the global range
  if (maxParams === minParams) {
    // Calculate global min/max from all defined configs (not just active ones)
    let globalMin = Infinity;
    let globalMax = 0;
    for (const config of CAR_BRAIN_CONFIGS_DEFINED) {
      const paramCount = countTrainableParameters(config.nn.architecture);
      globalMin = Math.min(globalMin, paramCount);
      globalMax = Math.max(globalMax, paramCount);
    }

    // If even globally all networks are the same size, return average scale
    if (globalMax === globalMin) {
      return (
        (CONFIG.geneticAlgorithm.mutation.networkSizeScale.smallestNetwork +
          CONFIG.geneticAlgorithm.mutation.networkSizeScale.largestNetwork) /
        2
      );
    }

    // Scale based on where this network sits in the global range
    const normalized = (parameterCount - globalMin) / (globalMax - globalMin);
    return (
      CONFIG.geneticAlgorithm.mutation.networkSizeScale.smallestNetwork -
      normalized *
        (CONFIG.geneticAlgorithm.mutation.networkSizeScale.smallestNetwork -
          CONFIG.geneticAlgorithm.mutation.networkSizeScale.largestNetwork)
    );
  }

  // Normal case: scale based on active network range
  const normalized = (parameterCount - minParams) / (maxParams - minParams);
  const scale =
    CONFIG.geneticAlgorithm.mutation.networkSizeScale.smallestNetwork -
    normalized *
      (CONFIG.geneticAlgorithm.mutation.networkSizeScale.smallestNetwork -
        CONFIG.geneticAlgorithm.mutation.networkSizeScale.largestNetwork);

  return scale;
}

export function isMobile(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;

  const mobileRegex =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isMobileUA = mobileRegex.test(userAgent.toLowerCase());

  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return isMobileUA || (hasTouch && window.innerWidth <= 1024);
}

export function getPopulationSize(): number {
  if (typeof window === 'undefined') {
    return (
      CAR_BRAIN_CONFIGS.length *
      CONFIG.geneticAlgorithm.population.initial.desktop
    );
  }
  return isMobile()
    ? CAR_BRAIN_CONFIGS.length *
        CONFIG.geneticAlgorithm.population.initial.mobile
    : CAR_BRAIN_CONFIGS.length *
        CONFIG.geneticAlgorithm.population.initial.desktop;
}

export function getCarBrainConfig(
  shortName: string
): CarBrainConfig | undefined {
  return CAR_BRAIN_CONFIGS.find((config) => config.shortName === shortName);
}

export function mutateParameter(
  originalValue: number,
  variance: number
): number {
  if (variance <= 0) return originalValue;

  // Box-Muller transform for Gaussian distribution
  const u = Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  return originalValue + z * variance;
}
