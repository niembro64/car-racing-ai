import { describe, it, expect } from 'vitest';
import { NeuralNetwork } from '../core/Neural';
import type { NeuralInput } from '../types/neural';

describe('NeuralNetwork', () => {
  it('should create a random neural network', () => {
    const brain = NeuralNetwork.createRandom(12345);
    expect(brain).toBeDefined();
  });

  it('should produce consistent output for same input with same seed', () => {
    const brain1 = NeuralNetwork.createRandom(12345);
    const brain2 = NeuralNetwork.createRandom(12345);

    const input: NeuralInput = {
      rays: [0.5, 0.3, 0.8]
    };

    const output1 = brain1.run(input);
    const output2 = brain2.run(input);

    expect(output1.direction).toBe(output2.direction);
  });

  it('should produce output in valid range [-1, 1]', () => {
    const brain = NeuralNetwork.createRandom(12345);

    const input: NeuralInput = {
      rays: [0.5, 0.3, 0.8]
    };

    const output = brain.run(input);

    expect(output.direction).toBeGreaterThanOrEqual(-1);
    expect(output.direction).toBeLessThanOrEqual(1);
  });

  it('should handle multiple different inputs', () => {
    const brain = NeuralNetwork.createRandom(12345);

    const inputs: NeuralInput[] = [
      { rays: [0.1, 0.2, 0.3] },
      { rays: [0.9, 0.8, 0.7] },
      { rays: [0.0, 0.5, 1.0] }
    ];

    inputs.forEach(input => {
      const output = brain.run(input);
      expect(output.direction).toBeGreaterThanOrEqual(-1);
      expect(output.direction).toBeLessThanOrEqual(1);
    });
  });

  it('should export and import weights correctly', () => {
    const brain1 = NeuralNetwork.createRandom(12345);
    const weights = brain1.toJSON();
    const brain2 = NeuralNetwork.fromJSON(weights, 54321);

    const input: NeuralInput = {
      rays: [0.5, 0.3, 0.8]
    };

    const output1 = brain1.run(input);
    const output2 = brain2.run(input);

    expect(output1.direction).toBe(output2.direction);
  });

  it('should create different outputs after mutation', () => {
    const brain = NeuralNetwork.createRandom(12345);
    const mutatedBrain = brain.mutate(0.1, 54321);

    const input: NeuralInput = {
      rays: [0.5, 0.3, 0.8]
    };

    const output1 = brain.run(input);
    const output2 = mutatedBrain.run(input);

    // Outputs should be different after mutation
    expect(output1.direction).not.toBe(output2.direction);
  });

  it('should throw error for incorrect input size', () => {
    const brain = NeuralNetwork.createRandom(12345);

    const invalidInput: NeuralInput = {
      rays: [0.5, 0.3] // Wrong size (should be 3)
    };

    expect(() => brain.run(invalidInput)).toThrow();
  });

  it('should handle edge case inputs', () => {
    const brain = NeuralNetwork.createRandom(12345);

    // All zeros
    const output1 = brain.run({ rays: [0, 0, 0] });
    expect(output1.direction).toBeGreaterThanOrEqual(-1);
    expect(output1.direction).toBeLessThanOrEqual(1);

    // All ones
    const output2 = brain.run({ rays: [1, 1, 1] });
    expect(output2.direction).toBeGreaterThanOrEqual(-1);
    expect(output2.direction).toBeLessThanOrEqual(1);
  });
});
