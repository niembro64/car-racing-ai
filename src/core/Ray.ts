import type { Point, Segment, RayHit } from './math/geom';
import { castRay } from './math/geom';

export class RayCaster {
  // Ray angles relative to car heading (in radians) - 360° coverage
  private static readonly RAY_ANGLES = [
    0,                 // 0° (forward)
    Math.PI / 4,       // 45° (right-forward)
    Math.PI / 2,       // 90° (right)
    3 * Math.PI / 4,   // 135° (right-back)
    Math.PI,           // 180° (back)
    -3 * Math.PI / 4,  // -135° (left-back)
    -Math.PI / 2,      // -90° (left)
    -Math.PI / 4       // -45° (left-forward)
  ];

  private maxRayDistance: number;

  constructor(maxRayDistance: number = 500) {
    this.maxRayDistance = maxRayDistance;
  }

  // Cast all rays from a position with given heading angle
  castRays(
    position: Point,
    heading: number,
    wallSegments: Segment[]
  ): { distances: number[]; hits: (RayHit | null)[] } {
    const distances: number[] = [];
    const hits: (RayHit | null)[] = [];

    for (const relativeAngle of RayCaster.RAY_ANGLES) {
      const rayAngle = heading + relativeAngle;
      const direction: Point = {
        x: Math.cos(rayAngle),
        y: Math.sin(rayAngle)
      };

      const hit = castRay(
        position,
        direction,
        wallSegments,
        this.maxRayDistance
      );

      hits.push(hit);

      if (hit) {
        // Normalize distance to [0, 1]
        const normalized = 1 - Math.min(hit.distance / this.maxRayDistance, 1);
        distances.push(normalized);
      } else {
        // No hit means max distance
        distances.push(0);
      }
    }

    return { distances, hits };
  }

  // Render rays on canvas for debugging
  renderRays(
    ctx: CanvasRenderingContext2D,
    position: Point,
    hits: (RayHit | null)[]
  ): void {
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
    ctx.lineWidth = 1;

    for (const hit of hits) {
      if (hit) {
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(hit.point.x, hit.point.y);
        ctx.stroke();

        // Draw hit point
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(hit.point.x, hit.point.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
