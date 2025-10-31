// Neural Network Architecture Constants
// Separated to avoid circular dependency with config_cars.ts

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
