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
  NN_ARCH_DIRECT_XL,
} from '@/config_nn';

export const CAR_BRAIN_CONFIGS_DEFINED: CarBrainConfig[] = [
  // ============================================================================
  // NO ACTIVATION - Gray family (neutral/minimal)
  // ============================================================================
  {
    useCar: 'use-all',
    displayName: 'Minimal',
    shortName: 'MN',
    description: 'No activation, pair inputs, no hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_S,
      inputModification: 'pair',
      activationType: '-',
    },
    colors: {
      light: '#c7c2c2', // Light gray
      dark: '#8c8080',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Basic',
    shortName: 'BS',
    description: 'No activation, direct inputs, no hidden layers',
    nn: {
      architecture: NN_ARCH_DIRECT_S,
      inputModification: 'dir',
      activationType: '-',
    },
    colors: {
      light: '#a3adb8', // Blue-gray
      dark: '#616e7a',
    },
  },

  // ============================================================================
  // LINEAR ACTIVATION - Orange/amber family (warm tones)
  // ============================================================================
  {
    useCar: 'use-all',
    displayName: 'Spark',
    shortName: 'SP',
    description: 'Linear activation, pair inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#FFD700', // Gold - bright yellow
      dark: '#B8960A',
    },
  },
  {
    useCar: 'use-many',
    displayName: 'Flare',
    shortName: 'FL',
    description: 'Linear activation, pair inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#FF8C00', // Dark orange
      dark: '#B86300',
    },
  },
  {
    useCar: 'use-few',
    displayName: 'Blaze',
    shortName: 'BL',
    description: 'Linear activation, pair inputs, 3 hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_XL,
      inputModification: 'pair',
      activationType: 'linear',
    },
    colors: {
      light: '#FF4500', // Orange-red
      dark: '#B83100',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Glow',
    shortName: 'GL',
    description: 'Linear activation, direct inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#FFA500', // Orange/amber
      dark: '#B87400',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Ember',
    shortName: 'EM',
    description: 'Linear activation, direct inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'linear',
    },
    colors: {
      light: '#D2691E', // Chocolate - brown-orange
      dark: '#954A15',
    },
  },

  // ============================================================================
  // RELU ACTIVATION - Blue family (cool tones)
  // ============================================================================
  {
    useCar: 'use-all',
    displayName: 'Ripple',
    shortName: 'RP',
    description: 'ReLU activation, pair inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#87CEEB', // Sky blue - light
      dark: '#5B99B8',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Wave',
    shortName: 'WV',
    description: 'ReLU activation, pair inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'relu',
    },
    colors: {
      light: '#4169E1', // Royal blue - deep
      dark: '#2E4A9D',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Mist',
    shortName: 'MI',
    description: 'ReLU activation, direct inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#00CED1', // Dark turquoise
      dark: '#009194',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Tide',
    shortName: 'TD',
    description: 'ReLU activation, direct inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'relu',
    },
    colors: {
      light: '#008B8B', // Dark cyan/teal
      dark: '#006161',
    },
  },

  // ============================================================================
  // GELU ACTIVATION - Green family (natural tones)
  // ============================================================================
  {
    useCar: 'use-all',
    displayName: 'Sprout',
    shortName: 'SR',
    description: 'GELU activation, pair inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#9ACD32', // Yellow-green
      dark: '#6B8F23',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Vine',
    shortName: 'VN',
    description: 'GELU activation, pair inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'gelu',
    },
    colors: {
      light: '#228B22', // Forest green
      dark: '#186118',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Moss',
    shortName: 'MS',
    description: 'GELU activation, direct inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#00FF7F', // Spring green - bright
      dark: '#00B358',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Fern',
    shortName: 'FN',
    description: 'GELU activation, direct inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'gelu',
    },
    colors: {
      light: '#2E8B57', // Sea green
      dark: '#20613D',
    },
  },

  // ============================================================================
  // STEP ACTIVATION - Purple family (digital/binary tones)
  // ============================================================================
  {
    useCar: 'use-all',
    displayName: 'Pulse',
    shortName: 'PL',
    description: 'Step activation, pair inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#9370DB', // Medium purple
      dark: '#66509E',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Byte',
    shortName: 'BY',
    description: 'Step activation, pair inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'step',
    },
    colors: {
      light: '#8B00FF', // Electric violet
      dark: '#6100B3',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Flip',
    shortName: 'FP',
    description: 'Step activation, direct inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#E6E6FA', // Lavender - light
      dark: '#A1A1B8',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Core',
    shortName: 'CR',
    description: 'Step activation, direct inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'step',
    },
    colors: {
      light: '#4B0082', // Indigo - dark
      dark: '#34005C',
    },
  },

  // ============================================================================
  // SWISH ACTIVATION - Red/pink family (advanced/gated tones)
  // ============================================================================
  {
    useCar: 'use-all',
    displayName: 'Swirl',
    shortName: 'SW',
    description: 'SWISH activation, pair inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_PAIR_M,
      inputModification: 'pair',
      activationType: 'swish',
    },
    colors: {
      light: '#FF69B4', // Hot pink - bright
      dark: '#B3497E',
    },
  },
  {
    useCar: 'use-few',
    displayName: 'Twist',
    shortName: 'TW',
    description: 'SWISH activation, pair inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_L,
      inputModification: 'pair',
      activationType: 'swish',
    },
    colors: {
      light: '#FF1493', // Deep pink
      dark: '#B30E68',
    },
  },
  {
    useCar: 'use-few',
    displayName: 'Surge',
    shortName: 'SG',
    description: 'SWISH activation, pair inputs, 3 hidden layers',
    nn: {
      architecture: NN_ARCH_PAIR_XL,
      inputModification: 'pair',
      activationType: 'swish',
    },
    colors: {
      light: '#DC143C', // Crimson - red-pink
      dark: '#9B0E2A',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Flow',
    shortName: 'FW',
    description: 'SWISH activation, direct inputs, 1 hidden layer',
    nn: {
      architecture: NN_ARCH_DIRECT_M,
      inputModification: 'dir',
      activationType: 'swish',
    },
    colors: {
      light: '#FFB6C1', // Light pink
      dark: '#B38087',
    },
  },
  {
    useCar: 'use-all',
    displayName: 'Flux',
    shortName: 'FX',
    description: 'SWISH activation, direct inputs, 2 hidden layers',
    nn: {
      architecture: NN_ARCH_DIRECT_L,
      inputModification: 'dir',
      activationType: 'swish',
    },
    colors: {
      light: '#C71585', // Medium violet-red
      dark: '#8B0F5D',
    },
  },
  {
    useCar: 'use-few',
    displayName: 'Whirl',
    shortName: 'WH',
    description: 'SWISH activation, direct inputs, 2 hidden layers (large)',
    nn: {
      architecture: NN_ARCH_DIRECT_XL,
      inputModification: 'dir',
      activationType: 'swish',
    },
    colors: {
      light: '#8B008B', // Dark magenta
      dark: '#610061',
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
