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
      light: '#cccccc',
      dark: '#999999',
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
      light: '#777',
      dark: '#111',
    },
  },

  // === Linear activation (orange/yellow family) ===
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
      light: '#cc8833',
      dark: '#995522',
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
      light: '#aa6611',
      dark: '#774400',
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
      light: '#ccaa33',
      dark: '#997722',
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
      light: '#aa8811',
      dark: '#775500',
    },
  },

  // === ReLU activation (blue family) ===
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
      light: '#5588cc',
      dark: '#336699',
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
      light: '#3366aa',
      dark: '#224477',
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
      light: '#55aacc',
      dark: '#338899',
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
      light: '#3388aa',
      dark: '#226677',
    },
  },

  // === GELU activation (green/cyan family) ===
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
      light: '#44cc88',
      dark: '#229955',
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
      light: '#22aa66',
      dark: '#117733',
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
      light: '#44ccaa',
      dark: '#229977',
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
      light: '#22aa88',
      dark: '#117755',
    },
  },

  // === Step activation (purple/magenta family) ===
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
      light: '#cc55cc',
      dark: '#993399',
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
      light: '#aa33aa',
      dark: '#771177',
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
      light: '#9955cc',
      dark: '#663399',
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
      light: '#7733aa',
      dark: '#551177',
    },
  },

  // === SWIGLU activation (red/pink family) ===
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
      light: '#ff6699',
      dark: '#cc3366',
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
