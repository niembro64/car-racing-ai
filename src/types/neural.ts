export interface NeuralInput {
  rays: number[]; // 8 ray distances normalized to [0, 1]
  speed: number;  // Current speed
}

export interface NeuralOutput {
  speed: number;      // Desired speed/velocity
  direction: number;  // Steering direction (negative = left, positive = right)
}

export interface NetworkWeights {
  layers: {
    weights: number[][];
    biases: number[];
  }[];
}

export interface GenomeData {
  weights: any; // brain.js JSON format
  fitness: number;
}
