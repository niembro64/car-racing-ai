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
  Math.PI * 0,
  // Math.PI * 0.05,
  // Math.PI * -0.05,
  Math.PI * 0.1,
  Math.PI * -0.1
];
// ----------------------------------------------------------------------------
// NEURAL NETWORK
// ----------------------------------------------------------------------------
export const NETWORK_LAYERS = [RAY_ANGLES.length, 3, 1]; // 7 rays → 1 direction output

// ----------------------------------------------------------------------------
// TRACK
// ----------------------------------------------------------------------------
export const TRACK_HALF_WIDTH = 40;

// ----------------------------------------------------------------------------
// RENDERING
// ----------------------------------------------------------------------------
export const ELITE_CAR_COLOR = '#10b981'; // Emerald green
export const NORMAL_CAR_COLOR = '#0088ff'; // Blue
