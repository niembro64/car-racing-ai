// ============================================================================
// CAR RACING AI - CONFIGURATION
// ============================================================================
// All tunable parameters in one place for easy experimentation

// ----------------------------------------------------------------------------
// SIMULATION SETTINGS
// ----------------------------------------------------------------------------
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
// ----------------------------------------------------------------------------
// GENETIC ALGORITHM
// ----------------------------------------------------------------------------
export const POPULATION_SIZE = 100;
export const INITIAL_SIGMA = 0.01; // Starting mutation rate
export const MIN_SIGMA = 0.000000001; // Minimum mutation rate
export const STAGNATION_THRESHOLD = 1; // Generations before reducing sigma

// Progressive mutation curve settings
export const MUTATION_CURVE_TYPE = 'exponential'; // 'linear' or 'exponential'
export const MUTATION_MIN_MULTIPLIER = 0.0; // Brain 1 starts at 0× (exact copy)
export const MUTATION_MAX_MULTIPLIER = 16.0; // Brain N ends at 16× sigma
export const MUTATION_CURVE_POWER = 2.5; // Exponential growth power (higher = more aggressive curve)

// ----------------------------------------------------------------------------
// NEURAL NETWORK
// ----------------------------------------------------------------------------
export const NETWORK_LAYERS = [9, 2];
// ----------------------------------------------------------------------------
// CAR PHYSICS
// ----------------------------------------------------------------------------
export const CAR_ACCELERATION = 200;
export const CAR_BRAKE_POWER = 300;
export const CAR_DRAG = 0.98; // Multiplied per second
export const CAR_STEER_RATE = 1.0; // Max turn rate: ~57 degrees/second (direction ±1)
export const CAR_MAX_SPEED = 150;
export const CAR_WIDTH = 18;
export const CAR_HEIGHT = 28;

// ----------------------------------------------------------------------------
// SENSORS (RAYS)
// ----------------------------------------------------------------------------
export const RAY_MAX_DISTANCE = 500;
export const RAY_ANGLES = [
  0, // 0° (forward)
  Math.PI / 4, // 45° (right-forward)
  Math.PI / 2, // 90° (right)
  (3 * Math.PI) / 4, // 135° (right-back)
  Math.PI, // 180° (back)
  (-3 * Math.PI) / 4, // -135° (left-back)
  -Math.PI / 2, // -90° (left)
  -Math.PI / 4, // -45° (left-forward)
];

// ----------------------------------------------------------------------------
// TRACK
// ----------------------------------------------------------------------------
export const TRACK_HALF_WIDTH = 40;
export const TRACK_CENTER_X = 400;
export const TRACK_CENTER_Y = 300;
export const TRACK_RADIUS_X = 250;
export const TRACK_RADIUS_Y = 150;
export const TRACK_SEGMENTS = 32; // Number of segments in the oval

// ----------------------------------------------------------------------------
// RENDERING
// ----------------------------------------------------------------------------
export const ELITE_CAR_COLOR = '#10b981'; // Emerald green
export const NORMAL_CAR_COLOR = '#3b82f6'; // Blue
export const DEAD_CAR_COLOR = '#9ca3af'; // Gray
