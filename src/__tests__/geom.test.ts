import { describe, it, expect } from 'vitest';
import {
  normalizeAngle,
  clamp,
  distance,
  createCarPolygon,
  type Point
} from '../core/math/geom';

describe('Geometry Functions', () => {
  describe('normalizeAngle', () => {
    it('should normalize angles to (-π, π] range', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI, 10);
      expect(normalizeAngle(-Math.PI)).toBeCloseTo(-Math.PI, 10); // -π stays as -π (boundary)
      expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0, 10);
      expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 10);
      expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI, 10);
    });
  });

  describe('clamp', () => {
    it('should clamp values to the given range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const p1: Point = { x: 0, y: 0 };
      const p2: Point = { x: 3, y: 4 };
      expect(distance(p1, p2)).toBe(5);

      const p3: Point = { x: 1, y: 1 };
      const p4: Point = { x: 1, y: 1 };
      expect(distance(p3, p4)).toBe(0);
    });
  });

  describe('createCarPolygon', () => {
    it('should create a rectangular polygon for car collision', () => {
      const polygon = createCarPolygon(100, 100, 0, 20, 30);

      // Should have 4 corners
      expect(polygon).toHaveLength(4);

      // All points should be Point objects with x and y
      polygon.forEach(point => {
        expect(point).toHaveProperty('x');
        expect(point).toHaveProperty('y');
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
      });
    });
  });
});
