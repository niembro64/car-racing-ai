import { describe, it, expect } from 'vitest';
import { NeuralNetwork } from '../core/Neural';
import type { NeuralInput } from '../types/neural';
import { NEURAL_NETWORK_ARCHITECTURE_STANDARD, SENSOR_RAY_ANGLES } from '../config';

// Use STANDARD architecture for tests (9 inputs matching raw sensor data)
const TEST_ARCHITECTURE = NEURAL_NETWORK_ARCHITECTURE_STANDARD;

// Helper function to create test input with correct number of rays
const createTestInput = (values?: number[]): NeuralInput => {
  const rayCount = SENSOR_RAY_ANGLES.length;
  if (values && values.length !== rayCount) {
    throw new Error(`Test input must have ${rayCount} rays, got ${values.length}`);
  }
  return {
    rays: values || Array(rayCount).fill(0).map((_, i) => (i + 1) / (rayCount + 1))
  };
};

describe('NeuralNetwork', () => {
  it('should create a random neural network', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');
    expect(brain).toBeDefined();
  });

  it('should produce consistent output for same input with same seed', () => {
    const brain1 = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');
    const brain2 = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');

    const input = createTestInput();

    const output1 = brain1.run(input);
    const output2 = brain2.run(input);

    expect(output1.direction).toBe(output2.direction);
  });

  it('should produce output in valid range [-1, 1]', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');

    const input = createTestInput();

    const output = brain.run(input);

    expect(output.direction).toBeGreaterThanOrEqual(-1);
    expect(output.direction).toBeLessThanOrEqual(1);
  });

  it('should handle multiple different inputs', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');

    const rayCount = SENSOR_RAY_ANGLES.length;
    const inputs: NeuralInput[] = [
      createTestInput(Array(rayCount).fill(0).map((_, i) => 0.1 * (i + 1))),
      createTestInput(Array(rayCount).fill(0).map((_, i) => 0.9 - 0.1 * i)),
      createTestInput(Array(rayCount).fill(0).map((_, i) => (i % 2 === 0) ? 1.0 : 0.0))
    ];

    inputs.forEach(input => {
      const output = brain.run(input);
      expect(output.direction).toBeGreaterThanOrEqual(-1);
      expect(output.direction).toBeLessThanOrEqual(1);
    });
  });

  it('should export and import weights correctly', () => {
    const brain1 = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');
    const weights = brain1.toJSON();
    const brain2 = NeuralNetwork.fromJSON(weights, 54321, TEST_ARCHITECTURE, 'relu');

    const input = createTestInput();

    const output1 = brain1.run(input);
    const output2 = brain2.run(input);

    expect(output1.direction).toBe(output2.direction);
  });

  it('should create different outputs after mutation', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');
    const mutatedBrain = brain.mutate(0.1, 54321);

    const input = createTestInput();

    const output1 = brain.run(input);
    const output2 = mutatedBrain.run(input);

    // Outputs should be different after mutation
    expect(output1.direction).not.toBe(output2.direction);
  });

  it('should throw error for incorrect input size', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');

    const invalidInput: NeuralInput = {
      rays: [0.5, 0.3] // Wrong size
    };

    expect(() => brain.run(invalidInput)).toThrow();
  });

  it('should handle edge case inputs', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');

    const rayCount = SENSOR_RAY_ANGLES.length;

    // All zeros
    const output1 = brain.run(createTestInput(Array(rayCount).fill(0)));
    expect(output1.direction).toBeGreaterThanOrEqual(-1);
    expect(output1.direction).toBeLessThanOrEqual(1);

    // All ones
    const output2 = brain.run(createTestInput(Array(rayCount).fill(1)));
    expect(output2.direction).toBeGreaterThanOrEqual(-1);
    expect(output2.direction).toBeLessThanOrEqual(1);
  });

  it('should mutate ALL weights and biases in the network', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');
    const mutatedBrain = brain.mutate(0.5, 54321); // Higher sigma for more visible changes

    const originalWeights = brain.toJSON();
    const mutatedWeights = mutatedBrain.toJSON();

    // Verify same structure
    expect(originalWeights.layers.length).toBe(mutatedWeights.layers.length);

    let totalParams = 0;
    let mutatedParams = 0;

    // Check every layer
    for (let i = 0; i < originalWeights.layers.length; i++) {
      const origLayer = originalWeights.layers[i];
      const mutLayer = mutatedWeights.layers[i];

      // Check all weights
      for (let j = 0; j < origLayer.weights.length; j++) {
        for (let k = 0; k < origLayer.weights[j].length; k++) {
          totalParams++;
          if (origLayer.weights[j][k] !== mutLayer.weights[j][k]) {
            mutatedParams++;
          }
        }
      }

      // Check all biases
      for (let j = 0; j < origLayer.biases.length; j++) {
        totalParams++;
        if (origLayer.biases[j] !== mutLayer.biases[j]) {
          mutatedParams++;
        }
      }
    }

    // At least 90% of parameters should have mutated with sigma=0.5
    // (Some might not change if noise is exactly 0, but that's extremely rare)
    const mutationRate = mutatedParams / totalParams;
    expect(mutationRate).toBeGreaterThan(0.9);

    // Log for visibility
    console.log(`Mutated ${mutatedParams}/${totalParams} parameters (${(mutationRate * 100).toFixed(1)}%)`);
  });

  it('should initialize all parameters for any architecture', () => {
    const brain = NeuralNetwork.createRandom(12345, TEST_ARCHITECTURE, 'relu');
    const weights = brain.toJSON();

    // Verify correct number of layers
    const expectedLayers = TEST_ARCHITECTURE.length - 1;
    expect(weights.layers.length).toBe(expectedLayers);

    // Verify each layer has correct dimensions
    for (let i = 0; i < expectedLayers; i++) {
      const inputSize = TEST_ARCHITECTURE[i];
      const outputSize = TEST_ARCHITECTURE[i + 1];

      expect(weights.layers[i].weights.length).toBe(outputSize);
      expect(weights.layers[i].weights[0].length).toBe(inputSize);
      expect(weights.layers[i].biases.length).toBe(outputSize);
    }

    // Verify all parameters are initialized (not undefined/null) and count them
    let paramCount = 0;
    let expectedParams = 0;

    // Calculate expected param count
    for (let i = 0; i < expectedLayers; i++) {
      const inputSize = TEST_ARCHITECTURE[i];
      const outputSize = TEST_ARCHITECTURE[i + 1];
      expectedParams += (inputSize * outputSize) + outputSize; // weights + biases
    }

    // Verify all parameters
    for (const layer of weights.layers) {
      for (const neuronWeights of layer.weights) {
        for (const weight of neuronWeights) {
          expect(weight).toBeDefined();
          expect(typeof weight).toBe('number');
          expect(isNaN(weight)).toBe(false);
          paramCount++;
        }
      }
      for (const bias of layer.biases) {
        expect(bias).toBeDefined();
        expect(typeof bias).toBe('number');
        expect(isNaN(bias)).toBe(false);
        paramCount++;
      }
    }

    expect(paramCount).toBe(expectedParams);
    console.log(`Verified all ${paramCount} parameters are properly initialized for architecture [${TEST_ARCHITECTURE.join(', ')}]`);
  });
});
