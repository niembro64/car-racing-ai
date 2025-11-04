import type { CarBrainConfig, CarUsageLevel, CarUsageLevelInfo } from '@/types';
import { CAR_USAGE_LEVELS } from '@/types';
import {
  NN_ARCH_DIFF_LARGE,
  NN_ARCH_DIFF_MEDIUM,
  NN_ARCH_DIFF_SMALL,
  NN_ARCH_LARGE,
  NN_ARCH_MEDIUM,
  NN_ARCH_SMALL,
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
      architecture: NN_ARCH_DIFF_SMALL,
      inputModification: 'pair',
      activationType: '-',
    },
    colors: {
      light: '#b8b8b8', // Light gray - differential, no hidden
      dark: '#7a7a7a',
    },
  },
  {
    useCar: 'use-few',
    displayName: 'Nano',
    shortName: 'NA',
    description: 'No hidden layers, direct raw sensor inputs (9 rays)',
    nn: {
      architecture: NN_ARCH_SMALL,
      inputModification: 'dir',
      activationType: '-',
    },
    colors: {
      light: '#999999', // Medium gray - direct, no hidden
      dark: '#5a5a5a',
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
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#e89f3c', // Bright orange - differential, 1 hidden
      dark: '#c2742a',
    },
  },
  {
    useCar: 'use-many',
    displayName: 'Flame',
    shortName: 'FL',
    description:
      'Linear activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#d67020', // Deep orange - differential, 2 hidden
      dark: '#a85518',
    },
  },
  {
    useCar: 'use-many',
    displayName: 'Glow',
    shortName: 'GL',
    description: 'Linear activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#d9a550', // Amber - direct, 1 hidden
      dark: '#b5803c',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Shine',
    shortName: 'SH',
    description: 'Linear activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#c28835', // Dark amber - direct, 2 hidden
      dark: '#986828',
    },
  },

  // === ReLU activation (blue family) ===
  // Blue hues - cool, rectified activation
  {
    useCar: 'use-many',
    displayName: 'Drop',
    shortName: 'DR',
    description: 'ReLU activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#5b9bd5', // Sky blue - differential, 1 hidden
      dark: '#3a78b5',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Wave',
    shortName: 'WV',
    description: 'ReLU activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#3470b8', // Deep blue - differential, 2 hidden
      dark: '#285590',
    },
  },
  {
    useCar: 'use-many',
    displayName: 'Mist',
    shortName: 'MI',
    description: 'ReLU activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#6eb8d8', // Cyan-blue - direct, 1 hidden
      dark: '#4a95b5',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Tide',
    shortName: 'TD',
    description: 'ReLU activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#4a8fb8', // Teal-blue - direct, 2 hidden
      dark: '#3a6f95',
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
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#5bb85d', // Grass green - differential, 1 hidden
      dark: '#3a9540',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Vine',
    shortName: 'VN',
    description: 'GELU activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#3a9540', // Forest green - differential, 2 hidden
      dark: '#2a7530',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Moss',
    shortName: 'MS',
    description: 'GELU activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#5bbf98', // Teal-green - direct, 1 hidden
      dark: '#3a9d78',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Fern',
    shortName: 'FN',
    description: 'GELU activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#3a9d78', // Deep teal - direct, 2 hidden
      dark: '#2a7d5a',
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
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#9b6bb8', // Violet - differential, 1 hidden
      dark: '#7a4a95',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Byte',
    shortName: 'BY',
    description: 'Step activation, differential inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_DIFF_LARGE,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#7a4a95', // Deep violet - differential, 2 hidden
      dark: '#5a3575',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Chip',
    shortName: 'CH',
    description: 'Step activation, direct inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_MEDIUM,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#b880d5', // Lavender - direct, 1 hidden
      dark: '#9560b5',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Core',
    shortName: 'CR',
    description: 'Step activation, direct inputs, 2 hidden layers (3, 2)',
    nn: {
      architecture: NN_ARCH_LARGE,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#9560b5', // Deep lavender - direct, 2 hidden
      dark: '#754595',
    },
  },

  // === SWIGLU activation (red/pink family) ===
  // Red hues - advanced, gated activation
  {
    useCar: 'use-all',
    displayName: 'Neo',
    shortName: 'NE',
    description: 'SWIGLU activation, differential inputs, 1 hidden layer (3)',
    nn: {
      architecture: NN_ARCH_DIFF_MEDIUM,
      inputModification: 'pair',
      activationType: 'swiglu',
    },
    colors: {
      light: '#d85b70', // Rose red - differential, 1 hidden
      dark: '#b53a50',
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
  (config) => config.useCar === 'use-few' || config.useCar === 'use-many' || config.useCar === 'use-all'
);

// Default export - currently set to 'use-few' (2 cars)
export const CAR_BRAIN_CONFIGS = CAR_BRAIN_CONFIGS_FEW;

// Helper function to get configs by usage level
export function getCarBrainConfigsByLevel(level: CarUsageLevel): CarBrainConfig[] {
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
