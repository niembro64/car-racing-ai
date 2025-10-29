import { describe, it, expect } from 'vitest';
import * as config from '../config';

describe('Configuration', () => {
  it('should have all genetic algorithm settings', () => {
    expect(config.GA_POPULATION_SIZE).toBeDefined();
    expect(config.GA_MUTATION_RATE).toBeDefined();
    expect(config.GA_MUTATION_MIN_MULTIPLIER).toBeDefined();
    expect(config.GA_MUTATION_MAX_MULTIPLIER).toBeDefined();
    expect(config.GA_MUTATION_CURVE_POWER).toBeDefined();
  });

  it('should have all car physics settings', () => {
    expect(config.CAR_FORWARD_SPEED).toBeDefined();
    expect(config.CAR_STEERING_SENSITIVITY).toBeDefined();
    expect(config.CAR_WIDTH).toBeDefined();
    expect(config.CAR_HEIGHT).toBeDefined();
  });

  it('should have sensor ray angles', () => {
    expect(config.SENSOR_RAY_ANGLES).toBeDefined();
    expect(Array.isArray(config.SENSOR_RAY_ANGLES)).toBe(true);
    expect(config.SENSOR_RAY_ANGLES.length).toBeGreaterThan(0);
  });

  it('should have neural network architecture', () => {
    expect(config.NEURAL_NETWORK_ARCHITECTURE).toBeDefined();
    expect(Array.isArray(config.NEURAL_NETWORK_ARCHITECTURE)).toBe(true);
    expect(config.NEURAL_NETWORK_ARCHITECTURE.length).toBeGreaterThanOrEqual(2);
  });

  it('should have track settings', () => {
    expect(config.TRACK_WIDTH_HALF).toBeDefined();
    expect(config.TRACK_WIDTH_HALF).toBeGreaterThan(0);
  });

  it('should have all rendering colors', () => {
    expect(config.CANVAS_BACKGROUND_COLOR).toBeDefined();
    expect(config.TRACK_SURFACE_COLOR).toBeDefined();
    expect(config.TRACK_BOUNDARY_COLOR).toBeDefined();
    expect(config.TRACK_CENTERLINE_COLOR).toBeDefined();
    expect(config.START_FINISH_LINE_COLOR).toBeDefined();
    expect(config.NORM_RELU_CAR_COLOR).toBeDefined();
    expect(config.NORM_RELU_ELITE_CAR_COLOR).toBeDefined();
    expect(config.DIFF_LINEAR_CAR_COLOR).toBeDefined();
    expect(config.DIFF_LINEAR_ELITE_CAR_COLOR).toBeDefined();
    expect(config.CAR_LABEL_COLOR_ALIVE).toBeDefined();
    expect(config.CAR_LABEL_COLOR_DEAD).toBeDefined();
  });

  it('should have all rendering dimensions', () => {
    expect(config.TRACK_BOUNDARY_WIDTH).toBeDefined();
    expect(config.TRACK_CENTERLINE_WIDTH).toBeDefined();
    expect(config.START_FINISH_LINE_WIDTH).toBeDefined();
  });

  it('should have DiffLinear car ray visualization settings', () => {
    expect(config.DIFF_LINEAR_CAR_RAY_COLOR).toBeDefined();
    expect(config.DIFF_LINEAR_CAR_RAY_HIT_COLOR).toBeDefined();
    expect(config.DIFF_LINEAR_CAR_RAY_WIDTH).toBeDefined();
    expect(config.DIFF_LINEAR_CAR_RAY_HIT_RADIUS).toBeDefined();
  });

  it('should have NormReLU car ray visualization settings', () => {
    expect(config.NORM_RELU_CAR_RAY_COLOR).toBeDefined();
    expect(config.NORM_RELU_CAR_RAY_HIT_COLOR).toBeDefined();
    expect(config.NORM_RELU_CAR_RAY_WIDTH).toBeDefined();
    expect(config.NORM_RELU_CAR_RAY_HIT_RADIUS).toBeDefined();
  });

  it('should have valid numeric values', () => {
    expect(config.GA_POPULATION_SIZE).toBeGreaterThan(0);
    expect(config.GA_MUTATION_RATE).toBeGreaterThan(0);
    expect(config.CAR_FORWARD_SPEED).toBeGreaterThan(0);
    expect(config.CAR_STEERING_SENSITIVITY).toBeGreaterThan(0);
    expect(config.CAR_WIDTH).toBeGreaterThan(0);
    expect(config.CAR_HEIGHT).toBeGreaterThan(0);
  });

  it('should have valid neural network architectures for both modes', () => {
    // Standard mode uses all raw sensor rays
    expect(config.NEURAL_NETWORK_ARCHITECTURE_STANDARD[0]).toBe(config.SENSOR_RAY_ANGLES.length);

    // Differential mode uses 1 forward ray + 4 differential pairs
    expect(config.NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL[0]).toBe(1 + config.SENSOR_RAY_PAIRS.length);

    // Both should have output layer of size 1 (steering)
    expect(config.NEURAL_NETWORK_ARCHITECTURE_STANDARD[config.NEURAL_NETWORK_ARCHITECTURE_STANDARD.length - 1]).toBe(1);
    expect(config.NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL[config.NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL.length - 1]).toBe(1);
  });

  it('should have valid hex colors', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    const rgbaColorRegex = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;

    const colors = [
      config.CANVAS_BACKGROUND_COLOR,
      config.TRACK_SURFACE_COLOR,
      config.TRACK_BOUNDARY_COLOR,
      config.TRACK_CENTERLINE_COLOR,
      config.START_FINISH_LINE_COLOR,
      config.NORM_RELU_CAR_COLOR,
      config.NORM_RELU_ELITE_CAR_COLOR,
      config.DIFF_LINEAR_CAR_COLOR,
      config.DIFF_LINEAR_ELITE_CAR_COLOR,
      config.CAR_LABEL_COLOR_ALIVE,
      config.CAR_LABEL_COLOR_DEAD,
      config.NORM_RELU_CAR_RAY_HIT_COLOR,
      config.DIFF_LINEAR_CAR_RAY_HIT_COLOR
    ];

    colors.forEach(color => {
      expect(hexColorRegex.test(color) || rgbaColorRegex.test(color)).toBe(true);
    });
  });
});
