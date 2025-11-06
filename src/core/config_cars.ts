import type { CarBrainConfig, CarUsageLevel, CarUsageLevelInfo } from '@/types';
import { CAR_USAGE_LEVELS } from '@/types';
import {
  NN_ARCH_PAIR_L,
  NN_ARCH_PAIR_M,
  NN_ARCH_PAIR_S,
  NN_ARCH_PAIR_XL,
  NN_ARCH_DIRECT_L,
  NN_ARCH_DIRECT_M,
  NN_ARCH_DIRECT_S,
} from '@/config_nn';

export const CAR_BRAIN_CONFIGS_DEFINED: CarBrainConfig[] = [
  // === None/Raw (no hidden layers, no activation function) ===
  // Gray family - neutral/basic
  {
    useCar: 'use-few',
    displayName: 'Pico',
    shortName: 'PC',
    description: 'No hidden layers, differential inputs (1 fwd + 4 L-R pairs)',
    nn: {
      architecture: NN_ARCH_PAIR_S,
      inputModification: 'pair',
      activationType: '-',
    },
    colors: {
      light: '#c7c2c2', // Light gray - differential, no hidden
      dark: '#8c8080',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Nano',
    shortName: 'NA',
    description: 'No hidden layers, direct raw sensor inputs (9 rays)',
    nn: {
      architecture: NN_ARCH_DIRECT_S,
      inputModification: 'dir',
      activationType: '-',
    },
    colors: {
      light: '#a3adb8', // Blue-gray - direct, no hidden
      dark: '#616e7a',
    },
  },

  // === Linear activation (orange/amber family) ===
  // Orange hues - warm, simple transformation
  {
    useCar: 'use-many',
    displayName: 'Spark',
    shortName: 'SP',
    description: 'Linear activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#e8d447', // Bright yellow-orange - differential, 1 hidden
      dark: '#a89530',
    },
  },
  {
    useCar: 'use-many',
    displayName: 'Flame',
    shortName: 'FL',
    description:
      'Linear activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#e89658', // Pure orange - differential, 2 hidden
      dark: '#a8683c',
    },
  },
  {
    useCar: 'use-many',
    displayName: 'Glow',
    shortName: 'GL',
    description: 'Linear activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#d9a847', // Golden amber - direct, 1 hidden
      dark: '#a27a2f',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Shine',
    shortName: 'SH',
    description: 'Linear activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#cc6633', // Brown-orange - direct, 2 hidden
      dark: '#944822',
    },
  },
  {
    useCar: 'use-few',
    displayName: 'Blaze',
    shortName: 'BL',
    description:
      'Linear activation, differential inputs, 3 hidden layers (4, 3, 2)',
    nn: {
      architecture: NN_ARCH_PAIR_XL,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#e85833', // Deep red-orange - differential, 3 hidden (largest)
      dark: '#a83820',
    },
  },

  // === ReLU activation (blue family) ===
  // Blue hues - cool, rectified activation
  {
    useCar: 'use-all',
    displayName: 'Drop',
    shortName: 'DR',
    description: 'ReLU activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#6db5dd', // Sky blue - differential, 1 hidden
      dark: '#3d81a3',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Wave',
    shortName: 'WV',
    description: 'ReLU activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#6687e8', // Royal blue - differential, 2 hidden
      dark: '#3a5ea8',
    },
  },
  {
    useCar: 'use-many',
    displayName: 'Mist',
    shortName: 'MI',
    description: 'ReLU activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#66ccd4', // Cyan - direct, 1 hidden
      dark: '#429ca3',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Tide',
    shortName: 'TD',
    description: 'ReLU activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#5fa3b8', // Teal - direct, 2 hidden
      dark: '#3b7485',
    },
  },
  {
    useCar: 'use-few',
    displayName: 'Surge',
    shortName: 'SG',
    description: 'SWISH activation, direct inputs, 3 hidden layers (4, 3, 2)',
    nn: {
      architecture: NN_ARCH_PAIR_XL,
      inputModification: 'pair',
      activationType: 'swish',
    },
    colors: {
      light: '#4d8fb8', // Deep blue - direct, 2 hidden (larger)
      dark: '#2f5c85',
    },
  },

  // === GELU activation (green/teal family) ===
  // Green hues - natural, smooth activation
  {
    useCar: 'use-all',
    displayName: 'Leaf',
    shortName: 'LF',
    description: 'GELU activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#8fcc5c', // Lime green - differential, 1 hidden
      dark: '#649438',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Vine',
    shortName: 'VN',
    description: 'GELU activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#3ba857', // Forest green - differential, 2 hidden
      dark: '#28753c',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Moss',
    shortName: 'MS',
    description: 'GELU activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#70ccaa', // Mint/seafoam - direct, 1 hidden
      dark: '#429470',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Fern',
    shortName: 'FN',
    description: 'GELU activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#4db89e', // Teal-green - direct, 2 hidden
      dark: '#328569',
    },
  },

  // === Step activation (purple/violet family) ===
  // Purple hues - digital, binary activation
  {
    useCar: 'use-all',
    displayName: 'Bit',
    shortName: 'BT',
    description: 'Step activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#ac70cc', // Purple - differential, 1 hidden
      dark: '#7a4294',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Byte',
    shortName: 'BY',
    description: 'Step activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#b366cc', // Deep violet - differential, 2 hidden
      dark: '#804294',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Chip',
    shortName: 'CH',
    description: 'Step activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#c4a3e8', // Lavender - direct, 1 hidden
      dark: '#8756b8',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Core',
    shortName: 'CR',
    description: 'Step activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#8070e8', // Indigo - direct, 2 hidden
      dark: '#5442a8',
    },
  },

  // === SWISH activation (red/pink family) ===
  // Red hues - advanced, gated activation
  {
    useCar: 'use-all',
    displayName: 'Neo',
    shortName: 'NE',
    description: 'SWISH activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'swish',
    },
    colors: {
      light: '#e8668f', // Rose/magenta - differential, 1 hidden
      dark: '#a83d64',
    },
  },
];

// Filter configs by usage level
export const CAR_BRAIN_CONFIGS_FEW = CAR_BRAIN_CONFIGS_DEFINED.filter(
  (config) => config.useCar === 'use-few'
);

export const CAR_BRAIN_CONFIGS_MANY = CAR_BRAIN_CONFIGS_DEFINED.filter(
  (config) => config.useCar === 'use-few' || config.useCar === 'use-many'
);

export const CAR_BRAIN_CONFIGS_ALL = CAR_BRAIN_CONFIGS_DEFINED.filter(
  (config) =>
    config.useCar === 'use-few' ||
    config.useCar === 'use-many' ||
    config.useCar === 'use-all'
);

// Default export - currently set to 'use-few' (2 cars)
export const CAR_BRAIN_CONFIGS = CAR_BRAIN_CONFIGS_FEW;

// Helper function to get configs by usage level
export function getCarBrainConfigsByLevel(
  level: CarUsageLevel
): CarBrainConfig[] {
  switch (level) {
    case 'use-few':
      return CAR_BRAIN_CONFIGS_FEW;
    case 'use-many':
      return CAR_BRAIN_CONFIGS_MANY;
    case 'use-all':
      return CAR_BRAIN_CONFIGS_ALL;
  }
}

// Helper function to get metadata for a usage level
export function getCarUsageLevelInfo(level: CarUsageLevel): CarUsageLevelInfo {
  const info = CAR_USAGE_LEVELS.find((l) => l.id === level);
  if (!info) {
    throw new Error(`Unknown car usage level: ${level}`);
  }
  return info;
}

// Helper function to get the next usage level in the cycle
export function getNextCarUsageLevel(current: CarUsageLevel): CarUsageLevel {
  const currentIndex = CAR_USAGE_LEVELS.findIndex((l) => l.id === current);
  const nextIndex = (currentIndex + 1) % CAR_USAGE_LEVELS.length;
  return CAR_USAGE_LEVELS[nextIndex].id;
}
