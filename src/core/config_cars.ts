import type { CarBrainConfig } from '@/types';
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
    useCar: true,
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
    useCar: true,
    displayName: 'Nano',
    shortName: 'NA',
    description: 'No hidden layers, direct raw sensor inputs (9 rays)',
    nn: {
      architecture: NN_ARCH_SMALL,
      inputModification: 'dir',
      activationType: '-',
    },
    colors: {
      light: '#aaaaaa',
      dark: '#777777',
    },
  },

  // === Linear activation (orange/yellow family) ===
  {
    useCar: true,
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
    useCar: false,
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
    useCar: true,
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
    useCar: false,
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
    useCar: false,
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
    useCar: false,
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
    useCar: false,
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
    useCar: false,
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
    useCar: true,
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
    useCar: false,
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
    useCar: true,
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
    useCar: false,
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
    useCar: false,
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
    useCar: false,
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
    useCar: false,
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
    useCar: false,
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
];

export const CAR_BRAIN_CONFIGS = CAR_BRAIN_CONFIGS_DEFINED.filter(
  (config) => config.useCar
);
