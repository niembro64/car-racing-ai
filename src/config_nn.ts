import { print } from './utils/logger';

const sra = [0, 0.03, 0.07, 0.125, 0.25, 0.5];

export const SENSOR_RAY_ANGLES: number[] = [];

for (let i = 0; i < sra.length; i++) {
  const a = sra[i] * Math.PI;

  SENSOR_RAY_ANGLES.push(a);

  if (a !== 0) {
    SENSOR_RAY_ANGLES.push(-a);
  }
}

export const SENSOR_RAY_PAIRS: [number, number][] = [];

for (let i = 1; i < SENSOR_RAY_ANGLES.length; i += 1) {
  if (i % 2 === 0) {
    continue;
  }

  SENSOR_RAY_PAIRS.push([i, i + 1]);
}

print(
  'Sensor Ray Angles:',
  SENSOR_RAY_ANGLES.map((a) => a.toFixed(2))
);
print(
  'Sensor Ray Pairs:',
  SENSOR_RAY_PAIRS.map((p) => `[${p[0]}, ${p[1]}]`)
);

// Original architectures
export const NN_ARCH_SMALL = [SENSOR_RAY_ANGLES.length, 1];
export const NN_ARCH_MEDIUM = [SENSOR_RAY_ANGLES.length, 3, 1];
export const NN_ARCH_LARGE = [SENSOR_RAY_ANGLES.length, 3, 2, 1];
export const NN_ARCH_DIFF_SMALL = [1 + SENSOR_RAY_PAIRS.length, 1];
export const NN_ARCH_DIFF_MEDIUM = [1 + SENSOR_RAY_PAIRS.length, 3, 1];
export const NN_ARCH_DIFF_LARGE = [1 + SENSOR_RAY_PAIRS.length, 3, 2, 1];

// Enhanced architectures with more capacity
export const NN_ARCH_XL = [SENSOR_RAY_ANGLES.length, 6, 3, 1];
export const NN_ARCH_XXL = [SENSOR_RAY_ANGLES.length, 8, 4, 1];
export const NN_ARCH_DIFF_XL = [1 + SENSOR_RAY_PAIRS.length, 6, 3, 1];
export const NN_ARCH_DIFF_XXL = [1 + SENSOR_RAY_PAIRS.length, 8, 4, 1];
