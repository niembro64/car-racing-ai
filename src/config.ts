import { Point } from './core/math/geom';

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

// ----------------------------------------------------------------------------
// GENETIC ALGORITHM
// ----------------------------------------------------------------------------
export const GA_MUTATION_RATE = 0.07;
export const GA_MUTATION_MIN_MULTIPLIER = 0.15;
export const GA_MUTATION_MAX_MULTIPLIER = 0.5;
export const GA_MUTATION_CURVE_POWER = 9.0;

export const SEGMENTS_PER_CURVE = 30;
export const TRACK_WIDTH_HALF = 30;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const wp: Point[] = [
  { x: 400, y: 60 },
  { x: 700, y: 100 },
  { x: 700, y: 500 },
  { x: 560, y: 500 },
  { x: 600, y: 240 },
  { x: 500, y: 140 },
];
export const WAYPOINTS: Point[] = appendMirroredWaypoints(wp, CANVAS_WIDTH);

// ----------------------------------------------------------------------------
// CAR PHYSICS
export const GA_POPULATION_SIZE = 200;
// ----------------------------------------------------------------------------
export const CAR_FORWARD_SPEED = 200; // Constant forward speed (pixels/second)
export const CAR_STEERING_SENSITIVITY = 3; // Turning multiplier (speed × direction × this)
export const CAR_WIDTH = 10;
export const CAR_HEIGHT = 20;

// ----------------------------------------------------------------------------
// SENSORS (RAYS)
// ----------------------------------------------------------------------------
export const SENSOR_RAY_ANGLES = [
  Math.PI * 0.0,
  // Math.PI * -0.01,
  // Math.PI * 0.01,
  // Math.PI * -0.1,
  // Math.PI * 0.1,
  Math.PI * 0.25,
  Math.PI * -0.25,
  // Math.PI * 0.49,
  // Math.PI * -0.49,
  Math.PI * 0.5,
  Math.PI * -0.5,
];

// ----------------------------------------------------------------------------
// NEURAL NETWORK
// ----------------------------------------------------------------------------
export const NEURAL_NETWORK_ARCHITECTURE = [SENSOR_RAY_ANGLES.length, 1]; // rays → direction

// ----------------------------------------------------------------------------
// TRACK
// ----------------------------------------------------------------------------

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

// ----------------------------------------------------------------------------
// RENDERING - GENERATION MARKERS
// ----------------------------------------------------------------------------
export const GENERATION_MARKER_COLOR = '#ff8888'; // Red
export const GENERATION_MARKER_RADIUS = 3;
