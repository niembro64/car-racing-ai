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

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

// Helper function to convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n * 255)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Calculate relative luminance (perceived brightness)
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  // Apply gamma correction
  const adjust = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
}

// Convert RGB to HSL
function rgbToHsl(rgb: {
  r: number;
  g: number;
  b: number;
}): { h: number; s: number; l: number } {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

// Convert HSL to RGB
function hslToRgb(hsl: {
  h: number;
  s: number;
  l: number;
}): { r: number; g: number; b: number } {
  const { h, s, l } = hsl;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r, g, b };
}

// Adjust color to target luminance while preserving hue and saturation
function adjustToLuminanceWithSaturation(
  hue: number, // 0-1
  saturation: number, // 0-1
  targetLuminance: number
): string {
  // Binary search for the right lightness value
  let minL = 0;
  let maxL = 1;
  let iterations = 0;
  const maxIterations = 50;

  while (iterations < maxIterations) {
    const testL = (minL + maxL) / 2;
    const testRgb = hslToRgb({ h: hue, s: saturation, l: testL });
    const testLuminance = getLuminance(testRgb);

    if (Math.abs(testLuminance - targetLuminance) < 0.001) {
      return rgbToHex(testRgb.r, testRgb.g, testRgb.b);
    }

    if (testLuminance < targetLuminance) {
      minL = testL;
    } else {
      maxL = testL;
    }

    iterations++;
  }

  const finalRgb = hslToRgb({ h: hue, s: saturation, l: (minL + maxL) / 2 });
  return rgbToHex(finalRgb.r, finalRgb.g, finalRgb.b);
}

// Target luminance values for perceptually equal brightness
const LIGHT_LUMINANCE = 0.9; // Moderate brightness for light colors
const DARK_LUMINANCE = 0.3; // Darker for dark colors

// Saturation levels for variety
const SAT_HOT = 0.7; // Highly saturated, vibrant "hot" colors
const SAT_VIVID = 0.6; // Vivid, saturated colors
const SAT_MEDIUM = 0.5; // Medium saturation
const SAT_PASTEL = 0.4; // Pastel, "easter" colors
const SAT_SOFT = 0.3; // Very soft, whitish colors
const SAT_NEUTRAL = 0.2; // Nearly grayscale

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
      light: adjustToLuminanceWithSaturation(0, SAT_NEUTRAL, LIGHT_LUMINANCE), // Pure gray
      dark: adjustToLuminanceWithSaturation(0, SAT_NEUTRAL, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.58, SAT_SOFT, LIGHT_LUMINANCE), // Blue-gray pastel
      dark: adjustToLuminanceWithSaturation(0.58, SAT_SOFT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.14, SAT_HOT, LIGHT_LUMINANCE), // Hot yellow-orange
      dark: adjustToLuminanceWithSaturation(0.14, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.11, SAT_PASTEL, LIGHT_LUMINANCE), // Peach pastel
      dark: adjustToLuminanceWithSaturation(0.11, SAT_PASTEL, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.03, SAT_HOT, LIGHT_LUMINANCE), // Hot red-orange
      dark: adjustToLuminanceWithSaturation(0.03, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.1, SAT_VIVID, LIGHT_LUMINANCE), // Vivid orange
      dark: adjustToLuminanceWithSaturation(0.1, SAT_VIVID, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.08, SAT_MEDIUM, LIGHT_LUMINANCE), // Medium brown-orange
      dark: adjustToLuminanceWithSaturation(0.08, SAT_MEDIUM, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.55, SAT_PASTEL, LIGHT_LUMINANCE), // Sky blue pastel
      dark: adjustToLuminanceWithSaturation(0.55, SAT_PASTEL, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.61, SAT_HOT, LIGHT_LUMINANCE), // Hot royal blue
      dark: adjustToLuminanceWithSaturation(0.61, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.5, SAT_HOT, LIGHT_LUMINANCE), // Hot cyan
      dark: adjustToLuminanceWithSaturation(0.5, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.5, SAT_MEDIUM, LIGHT_LUMINANCE), // Medium teal
      dark: adjustToLuminanceWithSaturation(0.5, SAT_MEDIUM, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.22, SAT_VIVID, LIGHT_LUMINANCE), // Vivid yellow-green
      dark: adjustToLuminanceWithSaturation(0.22, SAT_VIVID, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.33, SAT_HOT, LIGHT_LUMINANCE), // Hot forest green
      dark: adjustToLuminanceWithSaturation(0.33, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.4, SAT_HOT, LIGHT_LUMINANCE), // Hot spring green
      dark: adjustToLuminanceWithSaturation(0.4, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.38, SAT_PASTEL, LIGHT_LUMINANCE), // Mint pastel
      dark: adjustToLuminanceWithSaturation(0.38, SAT_PASTEL, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.72, SAT_MEDIUM, LIGHT_LUMINANCE), // Medium purple
      dark: adjustToLuminanceWithSaturation(0.72, SAT_MEDIUM, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.75, SAT_HOT, LIGHT_LUMINANCE), // Hot electric violet
      dark: adjustToLuminanceWithSaturation(0.75, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.7, SAT_SOFT, LIGHT_LUMINANCE), // Lavender pastel
      dark: adjustToLuminanceWithSaturation(0.7, SAT_SOFT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.73, SAT_VIVID, LIGHT_LUMINANCE), // Vivid indigo
      dark: adjustToLuminanceWithSaturation(0.73, SAT_VIVID, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.92, SAT_PASTEL, LIGHT_LUMINANCE), // Pink pastel
      dark: adjustToLuminanceWithSaturation(0.92, SAT_PASTEL, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.92, SAT_HOT, LIGHT_LUMINANCE), // Hot deep pink
      dark: adjustToLuminanceWithSaturation(0.92, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.98, SAT_HOT, LIGHT_LUMINANCE), // Hot crimson
      dark: adjustToLuminanceWithSaturation(0.98, SAT_HOT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.94, SAT_SOFT, LIGHT_LUMINANCE), // Light pink easter
      dark: adjustToLuminanceWithSaturation(0.94, SAT_SOFT, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.89, SAT_VIVID, LIGHT_LUMINANCE), // Vivid magenta
      dark: adjustToLuminanceWithSaturation(0.89, SAT_VIVID, DARK_LUMINANCE),
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
      light: adjustToLuminanceWithSaturation(0.83, SAT_VIVID, LIGHT_LUMINANCE), // Vivid dark magenta
      dark: adjustToLuminanceWithSaturation(0.83, SAT_VIVID, DARK_LUMINANCE),
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
