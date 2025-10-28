import type { Point, Segment, RayHit } from './math/geom';
import { castRay } from './math/geom';
import { RAY_ANGLES } from '@/config';

export class RayCaster {

  // Very large casting distance to ensure we always hit a wall
  private readonly CAST_DISTANCE = 10000;
  // Normalization factor based on reasonable maximum distance
  private readonly NORMALIZE_DISTANCE = 1000;

  constructor() {
    // No parameters needed - rays always hit walls on closed track
  }

  // Cast all rays from a position with given heading angle
  castRays(
    position: Point,
    heading: number,
    wallSegments: Segment[]
  ): { distances: number[]; hits: (RayHit | null)[] } {
    const distances: number[] = [];
    const hits: (RayHit | null)[] = [];

    for (const relativeAngle of RAY_ANGLES) {
      const rayAngle = heading + relativeAngle;
      const direction: Point = {
        x: Math.cos(rayAngle),
        y: Math.sin(rayAngle)
      };

      const hit = castRay(
        position,
        direction,
        wallSegments,
        this.CAST_DISTANCE
      );

      hits.push(hit);

      if (hit) {
        // Normalize distance to [0, 1] using reasonable maximum
        const normalized = 1 - Math.min(hit.distance / this.NORMALIZE_DISTANCE, 1);
        distances.push(normalized);
      } else {
        // Should never happen on closed track, but return 0 if no hit
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
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 1;

    for (const hit of hits) {
      if (hit) {
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(hit.point.x, hit.point.y);
        ctx.stroke();

        // Draw hit point
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(hit.point.x, hit.point.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
