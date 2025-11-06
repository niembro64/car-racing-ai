const sra = [0, 0.1, 0.25, 0.5];

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

// Original architectures
export const NN_ARCH_DIRECT_S = [SENSOR_RAY_ANGLES.length, 1];
export const NN_ARCH_DIRECT_M = [SENSOR_RAY_ANGLES.length, 2, 1];
export const NN_ARCH_DIRECT_L = [SENSOR_RAY_ANGLES.length, 3, 2, 1];
export const NN_ARCH_DIRECT_XL = [SENSOR_RAY_ANGLES.length, 5, 5, 1];
export const NN_ARCH_PAIR_S = [1 + SENSOR_RAY_PAIRS.length, 1];
export const NN_ARCH_PAIR_M = [1 + SENSOR_RAY_PAIRS.length, 2, 1];
export const NN_ARCH_PAIR_L = [1 + SENSOR_RAY_PAIRS.length, 3, 2, 1];
export const NN_ARCH_PAIR_XL = [1 + SENSOR_RAY_PAIRS.length, 5, 5, 1];
