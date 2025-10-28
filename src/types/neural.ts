export interface NeuralInput {
  rays: number[]; // Ray distances normalized to [0, 1]
}

export interface NeuralOutput {
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
