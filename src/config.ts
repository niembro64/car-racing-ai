// ============================================================================
// CAR RACING AI - CONFIGURATION
// ============================================================================

// ----------------------------------------------------------------------------
// GENETIC ALGORITHM
// ----------------------------------------------------------------------------
export const POPULATION_SIZE = 50;
export const MUTATION_RATE = 0.2;
export const MUTATION_MIN_MULTIPLIER = 0.001;
export const MUTATION_MAX_MULTIPLIER = 0.2;
export const MUTATION_CURVE_POWER = 0.1;

// ----------------------------------------------------------------------------
// NEURAL NETWORK
// ----------------------------------------------------------------------------
export const NETWORK_LAYERS = [7, 3, 1]; // 7 rays → 1 direction output

// ----------------------------------------------------------------------------
// CAR PHYSICS
// ----------------------------------------------------------------------------
export const CAR_SPEED = 100; // Constant forward speed
export const CAR_TURN_FACTOR = 0.5; // Turning is speed × this factor
export const CAR_WIDTH = 18;
export const CAR_HEIGHT = 28;

// ----------------------------------------------------------------------------
// SENSORS (RAYS)
// ----------------------------------------------------------------------------
export const RAY_ANGLES = [
  0, // 0° (forward)
  Math.PI / 6, // 30° (right)
  Math.PI / 3, // 60° (right)
  Math.PI / 2, // 90° (right)
  -Math.PI / 6, // -30° (left)
  -Math.PI / 3, // -60° (left)
  -Math.PI / 2, // -90° (left)
];

// ----------------------------------------------------------------------------
// TRACK
// ----------------------------------------------------------------------------
export const TRACK_HALF_WIDTH = 40;

// ----------------------------------------------------------------------------
// RENDERING
// ----------------------------------------------------------------------------
export const ELITE_CAR_COLOR = '#10b981'; // Emerald green
export const NORMAL_CAR_COLOR = '#0088ff'; // Blue
