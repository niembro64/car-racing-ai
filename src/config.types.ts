import type { Point, BrainSelectionStrategy, SpeedMultiplier } from './types';

// ============================================================================
// CANVAS CONFIG
// ============================================================================

export interface CanvasConfig {
  width: number;
  height: number;
}

// ============================================================================
// TRACK CONFIG
// ============================================================================

export interface TrackWaypointsConfig {
  base: Point[];
  mirrored: Point[];
}

export interface TrackColorsConfig {
  surface: string;
  boundary: string;
  centerline: string;
  startFinishLine: string;
}

export interface TrackLineWidthsConfig {
  boundary: number;
  centerline: number;
  startFinishLine: number;
}

export interface TrackConfig {
  halfWidth: number;
  segmentsPerCurve: number;
  waypoints: TrackWaypointsConfig;
  colors: TrackColorsConfig;
  lineWidths: TrackLineWidthsConfig;
}

// ============================================================================
// CAR CONFIG
// ============================================================================

export interface CarPhysicsConfig {
  forwardSpeed: number;
  steeringSensitivity: number;
  steeringDelaySeconds: number;
}

export interface CarDimensionsConfig {
  width: number;
  height: number;
}

export interface CarSpawnConfig {
  angleWiggle: number;
}

export interface CarColorsConfig {
  labelAlive: string;
  labelDead: string;
  bodyAliveStroke: string;
  bodyDead: string;
  bodyDeadStroke: string;
  directionIndicatorAlive: string;
  directionIndicatorDead: string;
}

export interface CarConfig {
  physics: CarPhysicsConfig;
  dimensions: CarDimensionsConfig;
  spawn: CarSpawnConfig;
  colors: CarColorsConfig;
}

// ============================================================================
// SENSORS CONFIG
// ============================================================================

export interface SensorsVisualizationConfig {
  rayWidth: number;
  hitRadius: number;
  centerlineHitColor: string;
}

export interface SensorsConfig {
  visualization: SensorsVisualizationConfig;
}

// ============================================================================
// NEURAL NETWORK CONFIG
// ============================================================================

export interface NeuralNetworkArchitecturesConfig {
  small: number[];
  medium: number[];
  large: number[];
  diffSmall: number[];
  diffMedium: number[];
  diffLarge: number[];
}

export interface NeuralNetworkSensorRaysConfig {
  angles: number[];
  pairs: number[][];
}

export interface NeuralNetworkConfig {
  architectures: NeuralNetworkArchitecturesConfig;
  sensorRays: NeuralNetworkSensorRaysConfig;
}

// ============================================================================
// GENETIC ALGORITHM CONFIG
// ============================================================================

export interface MutationParameterScaleConfig {
  min: number;
  max: number;
}

export interface MutationRankMultiplierConfig {
  min: number;
  max: number;
  curvePower: number;
}

export interface ProgressiveMutationConfig {
  enabled: boolean;
  baseVariance: number;
  growthRate: number;
  growthType: 'linear' | 'exponential';
}

export interface MutationConfig {
  base: number;
  min: number;
  startingMutationParameterScaleAgainstSize: MutationParameterScaleConfig;
  bezierPoints: [number, number, number, number];
  rankMultiplier: MutationRankMultiplierConfig;
  progressive: ProgressiveMutationConfig;
}

export interface PopulationInitialConfig {
  desktop: number;
  mobile: number;
}

export interface PopulationBoundsConfig {
  min: number;
  max: number;
}

export interface PopulationAdjustmentConfig {
  thresholdFPS: number;
  increasePercentage: number;
  decreasePercentage: number;
  minimumEscapeMultiplier: number;
  intervalFrames: number;
  maxChangeRate: number;
}

export interface PopulationAverageConfig {
  initial: number;
  updateInterval: number;
  savedWeight: number;
}

export interface PopulationConfig {
  initial: PopulationInitialConfig;
  bounds: PopulationBoundsConfig;
  adjustment: PopulationAdjustmentConfig;
  average: PopulationAverageConfig;
}

export interface BrainSelectionConfig {
  defaultStrategy: BrainSelectionStrategy;
}

export interface GeneticAlgorithmConfig {
  mutation: MutationConfig;
  population: PopulationConfig;
  brainSelection: BrainSelectionConfig;
}

// ============================================================================
// PERFORMANCE CONFIG
// ============================================================================

export interface PerformanceMonitoringConfig {
  historySize: number;
  initialSmoothedFPS: number;
  smoothingFactor: number;
  trendWindowSize: number;
  maxValidFrameTimeMs: number;
  maxAcceptableVarianceMs: number;
  headroomFactor: number;
  minTrendSamples: number;
  maxTrendSlope: number;
}

export interface PerformanceCalibrationConfig {
  minFrames: number;
  historyRatio: number;
}

export interface PerformanceUIConfig {
  updateInterval: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  targetFPS: number;
  monitoring: PerformanceMonitoringConfig;
  calibration: PerformanceCalibrationConfig;
  ui: PerformanceUIConfig;
  fpsCalcSavedWeight: number;
}

// ============================================================================
// LAP CONFIG
// ============================================================================

export interface LapConfig {
  completionThreshold: number;
}

// ============================================================================
// SCORING CONFIG
// ============================================================================

export interface ScoringWeightsConfig {
  lapSpeedBonus: number;
  meanPerformance: number;
  bestPerformance: number;
  learningEfficiency: number;
}

export interface ScoringConfig {
  weights: ScoringWeightsConfig;
}

// ============================================================================
// VISUALIZATION CONFIG
// ============================================================================

export interface VisualizationWaypointColorsConfig {
  marker: string;
  text: string;
  textStroke: string;
}

export interface VisualizationWaypointsConfig {
  fontSize: number;
  radius: number;
  textOffset: number;
  colors: VisualizationWaypointColorsConfig;
}

export interface VisualizationGenerationMarkerConfig {
  radius: number;
  fontSize: number;
  textOffset: number;
  maxHistory: number;
  showGenerationNumber: boolean;
}

export interface VisualizationGraphConfig {
  useLogScale: boolean;
}

export interface VisualizationConfig {
  showCarPercentages: boolean;
  debugShowWaypoints: boolean;
  waypoints: VisualizationWaypointsConfig;
  generationMarker: VisualizationGenerationMarkerConfig;
  graph: VisualizationGraphConfig;
}

// ============================================================================
// DEFAULTS CONFIG
// ============================================================================

export interface DefaultsConfig {
  dieOnBackwards: boolean;
  killSlowCars: boolean;
  mutationByDistance: boolean;
  delayedSteering: boolean;
  speedMultiplier: SpeedMultiplier;
  showRays: boolean;
}

// ============================================================================
// MAIN CONFIG TYPE
// ============================================================================

export interface Config {
  canvas: CanvasConfig;
  track: TrackConfig;
  car: CarConfig;
  sensors: SensorsConfig;
  neuralNetwork: NeuralNetworkConfig;
  geneticAlgorithm: GeneticAlgorithmConfig;
  performance: PerformanceConfig;
  lap: LapConfig;
  scoring: ScoringConfig;
  visualization: VisualizationConfig;
  defaults: DefaultsConfig;
}
