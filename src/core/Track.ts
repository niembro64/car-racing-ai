import type { Point, Segment, CenterlinePointResult } from '@/types';
import {
  offsetPolyline,
  computeCumulativeLengths,
  closestPointOnPolyline,
} from './math/geom';
import {
  TRACK_SURFACE_COLOR,
  TRACK_BOUNDARY_COLOR,
  TRACK_CENTERLINE_COLOR,
  START_FINISH_LINE_COLOR,
  TRACK_BOUNDARY_WIDTH,
  TRACK_CENTERLINE_WIDTH,
  START_FINISH_LINE_WIDTH,
  WAYPOINTS,
  SEGMENTS_PER_CURVE,
} from '@/config';

export class Track {
  centerline: Point[];
  innerWall: Point[];
  outerWall: Point[];
  wallSegments: Segment[];
  cumulativeLengths: number[];
  halfWidth: number;
  startPosition: Point;
  startAngle: number;

  constructor(halfWidth: number) {
    this.halfWidth = halfWidth;

    // Create a complex race track centerline with multiple curve types
    this.centerline = this.createComplexTrack();

    // Offset to create walls
    this.innerWall = offsetPolyline(this.centerline, -halfWidth);
    this.outerWall = offsetPolyline(this.centerline, halfWidth);

    // Create wall segments
    this.wallSegments = [];

    // Inner wall segments
    for (let i = 0; i < this.innerWall.length; i++) {
      this.wallSegments.push({
        p1: this.innerWall[i],
        p2: this.innerWall[(i + 1) % this.innerWall.length],
      });
    }

    // Outer wall segments
    for (let i = 0; i < this.outerWall.length; i++) {
      this.wallSegments.push({
        p1: this.outerWall[i],
        p2: this.outerWall[(i + 1) % this.outerWall.length],
      });
    }

    // Compute cumulative lengths for fitness calculation
    this.cumulativeLengths = computeCumulativeLengths(this.centerline);

    // Start position and angle
    this.startPosition = { ...this.centerline[0] };
    const next = this.centerline[1];
    this.startAngle = Math.atan2(
      next.y - this.startPosition.y,
      next.x - this.startPosition.x
    );
  }

  // Catmull-Rom spline interpolation between points
  private catmullRomSpline(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    t: number
  ): Point {
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  // Interpolate smooth curve through waypoints
  private interpolateWaypoints(
    waypoints: Point[],
    segmentsPerCurve: number
  ): Point[] {
    const points: Point[] = [];

    for (let i = 0; i < waypoints.length; i++) {
      const p0 = waypoints[(i - 1 + waypoints.length) % waypoints.length];
      const p1 = waypoints[i];
      const p2 = waypoints[(i + 1) % waypoints.length];
      const p3 = waypoints[(i + 2) % waypoints.length];

      for (let j = 0; j < segmentsPerCurve; j++) {
        const t = j / segmentsPerCurve;
        points.push(this.catmullRomSpline(p0, p1, p2, p3, t));
      }
    }

    // DON'T duplicate first point - modulo wrapping handles closure
    // This ensures proper tangent and curvature continuity at loop junction

    return points;
  }

  // Create a complex race track with multiple corner types
  private createComplexTrack(): Point[] {
    // High interpolation for ultra-smooth curves
    const result = this.interpolateWaypoints(WAYPOINTS, SEGMENTS_PER_CURVE);
    return result;
  }

  // Calculate fitness (distance traveled along centerline)
  calculateFitness(position: Point): number {
    return closestPointOnPolyline(
      position,
      this.centerline,
      this.cumulativeLengths
    );
  }

  // Get closest point on centerline and the distance traveled
  getClosestPointOnCenterline(position: Point): CenterlinePointResult {
    let minDist = Infinity;
    let closestPoint: Point = this.centerline[0];
    let bestDistance = 0;

    // Check all segments including the wrap-around segment (last point to first point)
    for (let i = 0; i < this.centerline.length; i++) {
      const p1 = this.centerline[i];
      const p2 = this.centerline[(i + 1) % this.centerline.length]; // Wrap around

      // Project point onto segment
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;

      let t = 0;
      if (lenSq > 0) {
        t = Math.max(
          0,
          Math.min(
            1,
            ((position.x - p1.x) * dx + (position.y - p1.y) * dy) / lenSq
          )
        );
      }

      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;

      const distSq =
        (position.x - projX) * (position.x - projX) +
        (position.y - projY) * (position.y - projY);

      if (distSq < minDist * minDist) {
        minDist = Math.sqrt(distSq);
        closestPoint = { x: projX, y: projY };
        const segmentDist = Math.sqrt(lenSq);

        // For the last segment (wrap-around), distance continues from the last cumulative length
        if (i === this.centerline.length - 1) {
          bestDistance = this.cumulativeLengths[i] + t * segmentDist;
        } else {
          bestDistance = this.cumulativeLengths[i] + t * segmentDist;
        }
      }
    }

    return { point: closestPoint, distance: bestDistance };
  }

  // Get total track length
  getTotalLength(): number {
    return this.cumulativeLengths[this.cumulativeLengths.length - 1];
  }

  // Render track on canvas
  render(ctx: CanvasRenderingContext2D): void {
    // Fill track area with asphalt
    ctx.fillStyle = TRACK_SURFACE_COLOR;
    ctx.beginPath();
    ctx.moveTo(this.outerWall[0].x, this.outerWall[0].y);
    for (let i = 1; i < this.outerWall.length; i++) {
      ctx.lineTo(this.outerWall[i].x, this.outerWall[i].y);
    }
    ctx.closePath();
    // Cut out inner area
    ctx.moveTo(this.innerWall[0].x, this.innerWall[0].y);
    for (let i = 1; i < this.innerWall.length; i++) {
      ctx.lineTo(this.innerWall[i].x, this.innerWall[i].y);
    }
    ctx.closePath();
    ctx.fill('evenodd');

    // Draw outer wall
    ctx.strokeStyle = TRACK_BOUNDARY_COLOR;
    ctx.lineWidth = TRACK_BOUNDARY_WIDTH;
    ctx.beginPath();
    ctx.moveTo(this.outerWall[0].x, this.outerWall[0].y);
    for (let i = 1; i < this.outerWall.length; i++) {
      ctx.lineTo(this.outerWall[i].x, this.outerWall[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw inner wall
    ctx.beginPath();
    ctx.moveTo(this.innerWall[0].x, this.innerWall[0].y);
    for (let i = 1; i < this.innerWall.length; i++) {
      ctx.lineTo(this.innerWall[i].x, this.innerWall[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw centerline (dashed)
    ctx.strokeStyle = TRACK_CENTERLINE_COLOR;
    ctx.lineWidth = TRACK_CENTERLINE_WIDTH;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(this.centerline[0].x, this.centerline[0].y);
    for (let i = 1; i < this.centerline.length; i++) {
      ctx.lineTo(this.centerline[i].x, this.centerline[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start line
    const startIdx = 0;
    const nextIdx = 1;
    const p1 = this.centerline[startIdx];
    const p2 = this.centerline[nextIdx];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;

    ctx.strokeStyle = START_FINISH_LINE_COLOR;
    ctx.lineWidth = START_FINISH_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(p1.x + nx * this.halfWidth, p1.y + ny * this.halfWidth);
    ctx.lineTo(p1.x - nx * this.halfWidth, p1.y - ny * this.halfWidth);
    ctx.stroke();
  }
}
