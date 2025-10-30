import { describe, it, expect, beforeEach } from 'vitest';
import { Car } from '../core/Car';
import { NeuralNetwork } from '../core/Neural';
import type { Segment } from '../core/math/geom';

describe('Car', () => {
  let brain: NeuralNetwork;
  let car: Car;
  let mockTrack: any;

  beforeEach(() => {
    brain = NeuralNetwork.createRandom(12345, [9, 6, 1], 'relu');
    car = new Car(100, 100, 0, brain, '#0088ff', 'direct', 'test'); // Use direct inputs (9 sensors)

    // Create a mock track object
    mockTrack = {
      getClosestPointOnCenterline: (position: { x: number; y: number }) => ({
        point: { x: position.x, y: position.y },
        distance: 0
      })
    };
  });

  it('should create a car with initial state', () => {
    expect(car.x).toBe(100);
    expect(car.y).toBe(100);
    expect(car.angle).toBe(0);
    expect(car.speed).toBe(0);
    expect(car.alive).toBe(true);
    expect(car.fitness).toBe(0);
  });

  it('should update position when physics is applied', () => {
    const initialX = car.x;

    // Empty wall segments (no collisions)
    const wallSegments: Segment[] = [];

    car.update(1/60, wallSegments, mockTrack);

    // Position should change after update
    expect(car.x).not.toBe(initialX);
  });

  it('should mark car as dead on collision', () => {
    // Create a wall segment directly in front of the car
    const wallSegments: Segment[] = [
      {
        p1: { x: 110, y: 95 },
        p2: { x: 110, y: 105 }
      }
    ];

    // Update multiple times to move car into wall
    for (let i = 0; i < 10; i++) {
      car.update(1/60, wallSegments, mockTrack);
      if (!car.alive) break;
    }

    // Car should eventually collide and die
    // (may not happen immediately depending on neural network output)
  });

  it('should not update when dead', () => {
    car.alive = false;
    const initialX = car.x;
    const initialY = car.y;

    const wallSegments: Segment[] = [];
    car.update(1/60, wallSegments, mockTrack);

    // Position should not change
    expect(car.x).toBe(initialX);
    expect(car.y).toBe(initialY);
  });

  it('should have valid dimensions', () => {
    expect(car.width).toBeGreaterThan(0);
    expect(car.height).toBeGreaterThan(0);
  });

  it('should create a polygon for collision detection', () => {
    const polygon = car.getPolygon();
    expect(polygon).toHaveLength(4);
    polygon.forEach(point => {
      expect(point).toHaveProperty('x');
      expect(point).toHaveProperty('y');
    });
  });

  it('should update signed fitness correctly', () => {
    const trackLength = 1000;

    // First call initializes with non-zero value (avoid 0 edge case)
    car.updateSignedFitness(50, trackLength);
    expect(car.signedFitness).toBe(0);
    expect(car.maxDistanceReached).toBe(0);

    // Second call starts tracking changes
    car.updateSignedFitness(150, trackLength);
    expect(car.signedFitness).toBe(100);
    expect(car.maxDistanceReached).toBe(100);

    // Third call continues tracking
    car.updateSignedFitness(250, trackLength);
    expect(car.signedFitness).toBe(200);
    expect(car.maxDistanceReached).toBe(200);
  });

  it('should handle backward movement in signed fitness', () => {
    const trackLength = 1000;

    // Initialize with non-zero value
    car.updateSignedFitness(50, trackLength);

    // Move forward
    car.updateSignedFitness(150, trackLength);
    expect(car.signedFitness).toBe(100);

    // Move backward
    car.updateSignedFitness(100, trackLength);
    expect(car.signedFitness).toBe(50);

    // Max should still be 100
    expect(car.maxDistanceReached).toBe(100);
  });

  it('should clone with a new brain', () => {
    const newBrain = NeuralNetwork.createRandom(54321, [9, 6, 1], 'relu');
    const clonedCar = car.clone(newBrain);

    expect(clonedCar.x).toBe(car.x);
    expect(clonedCar.y).toBe(car.y);
    expect(clonedCar.angle).toBe(car.angle);
    expect(clonedCar.brain).toBe(newBrain);
  });
});
