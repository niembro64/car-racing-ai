// ============================================================================
// CAR RACING AI - CONFIGURATION
// ============================================================================

// ----------------------------------------------------------------------------
// GENETIC ALGORITHM
// ----------------------------------------------------------------------------
export const GA_POPULATION_SIZE = 50;
export const GA_MUTATION_RATE = 0.4;
export const GA_MUTATION_MIN_MULTIPLIER = 0.001;
export const GA_MUTATION_MAX_MULTIPLIER = 0.2;
export const GA_MUTATION_CURVE_POWER = 0.1;

// ----------------------------------------------------------------------------
// CAR PHYSICS
// ----------------------------------------------------------------------------
export const CAR_FORWARD_SPEED = 100; // Constant forward speed (pixels/second)
export const CAR_STEERING_SENSITIVITY = 0.5; // Turning multiplier (speed × direction × this)
export const CAR_WIDTH = 18;
export const CAR_HEIGHT = 28;

// ----------------------------------------------------------------------------
// SENSORS (RAYS)
// ----------------------------------------------------------------------------
export const SENSOR_RAY_ANGLES = [
  Math.PI * 0, // Forward (0°)
  Math.PI * 0.2, // Right 18°
  Math.PI * -0.2, // Left 18°
  // Math.PI * 0.5, // Right 18°
  // Math.PI * -0.5, // Left 18°
];

// ----------------------------------------------------------------------------
// NEURAL NETWORK
// ----------------------------------------------------------------------------
export const NEURAL_NETWORK_ARCHITECTURE = [SENSOR_RAY_ANGLES.length, 3, 1]; // rays → hidden → direction

// ----------------------------------------------------------------------------
// TRACK
// ----------------------------------------------------------------------------
export const TRACK_WIDTH_HALF = 40; // Half-width of track in pixels

// ----------------------------------------------------------------------------
// RENDERING - CANVAS
// ----------------------------------------------------------------------------
export const CANVAS_BACKGROUND_COLOR = '#4a7c4e'; // Grass green

// ----------------------------------------------------------------------------
// RENDERING - TRACK
// ----------------------------------------------------------------------------
export const TRACK_SURFACE_COLOR = '#333333'; // Dark gray asphalt
export const TRACK_BOUNDARY_COLOR = '#ffffff'; // White road edges
export const TRACK_CENTERLINE_COLOR = '#fbbf24'; // Yellow lane marking
export const START_FINISH_LINE_COLOR = '#10b981'; // Green start/finish line

export const TRACK_BOUNDARY_WIDTH = 3;
export const TRACK_CENTERLINE_WIDTH = 2;
export const START_FINISH_LINE_WIDTH = 10;

// ----------------------------------------------------------------------------
// RENDERING - CARS
// ----------------------------------------------------------------------------
export const ELITE_CAR_COLOR = '#900901'; // Red (elite/best car from previous generation)
export const NORMAL_CAR_COLOR = '#0088ff'; // Blue (mutated variants)

// Car label colors (percentage display above car)
export const CAR_LABEL_COLOR_ALIVE = '#ffffff'; // White
export const CAR_LABEL_COLOR_DEAD = '#9ca3af'; // Light gray (matches dead car body)

// ----------------------------------------------------------------------------
// RENDERING - RAY VISUALIZATION (ELITE CAR)
// ----------------------------------------------------------------------------
export const ELITE_CAR_RAY_COLOR = '#ffffff'; // White transparent
export const ELITE_CAR_RAY_HIT_COLOR = ELITE_CAR_COLOR;
export const ELITE_CAR_RAY_WIDTH = 1;
export const ELITE_CAR_RAY_HIT_RADIUS = 4;

// ----------------------------------------------------------------------------
// RENDERING - RAY VISUALIZATION (NORMAL CARS)
// ----------------------------------------------------------------------------
export const NORMAL_CAR_RAY_COLOR = '#ffffff'; // White transparent
export const NORMAL_CAR_RAY_HIT_COLOR = '#0088ff';
export const NORMAL_CAR_RAY_WIDTH = 1;
export const NORMAL_CAR_RAY_HIT_RADIUS = 4;
