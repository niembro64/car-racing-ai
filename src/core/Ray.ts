import type { Point, Segment, RayHit, RayCastResult } from '@/types';
import { castRay } from './math/geom';
import { SENSOR_RAY_ANGLES } from '@/config';

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
  ): RayCastResult {
    const distances: number[] = [];
    const hits: (RayHit | null)[] = [];

    for (const relativeAngle of SENSOR_RAY_ANGLES) {
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
    hits: (RayHit | null)[],
    rayColor: string,
    hitColor: string,
    lineWidth: number,
    hitRadius: number
  ): void {
    ctx.strokeStyle = rayColor;
    ctx.lineWidth = lineWidth;

    for (const hit of hits) {
      if (hit) {
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(hit.point.x, hit.point.y);
        ctx.stroke();

        // Draw hit point
        ctx.fillStyle = hitColor;
        ctx.beginPath();
        ctx.arc(hit.point.x, hit.point.y, hitRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
