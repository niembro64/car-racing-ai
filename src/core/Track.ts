import type { Point, Segment } from './math/geom';
import {
  offsetPolyline,
  computeCumulativeLengths,
  closestPointOnPolyline,
} from './math/geom';
import { TRACK_HALF_WIDTH } from '@/config';

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
    console.log(`Centerline has ${this.centerline.length} points`);

    // Offset to create walls
    this.innerWall = offsetPolyline(this.centerline, -halfWidth);
    this.outerWall = offsetPolyline(this.centerline, halfWidth);
    console.log(
      `Walls created: inner=${this.innerWall.length}, outer=${this.outerWall.length}`
    );

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

    console.log(`Total wall segments: ${this.wallSegments.length}`);

    // Compute cumulative lengths for fitness calculation
    this.cumulativeLengths = computeCumulativeLengths(this.centerline);

    // Start position and angle
    this.startPosition = { ...this.centerline[0] };
    const next = this.centerline[1];
    this.startAngle = Math.atan2(
      next.y - this.startPosition.y,
      next.x - this.startPosition.x
    );

    console.log(
      `Start position: (${this.startPosition.x.toFixed(
        1
      )}, ${this.startPosition.y.toFixed(1)})`
    );
    console.log(
      `Start angle: ${((this.startAngle * 180) / Math.PI).toFixed(1)}°`
    );
    console.log(`Track length: ${this.getTotalLength().toFixed(1)}`);
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
    segmentsPerCurve: number = 20
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
    // Define waypoints for a flowing, smooth track layout with perfect symmetry at start/finish
    // Canvas: 800x600, with 60px margin on all sides (accounting for 40px track half-width)
    // Smaller track for better visibility
    // Strategy: Rounded rectangle loop - car travels LEFT to RIGHT through start line
    // Path goes: right along top → down right side → left along bottom → up left side → back to start
    // IMPORTANT:
    // - Add many waypoints at sharp turns to prevent wall overlap
    // - NO overlapping or crossing paths - simple closed loop
    // - Put start/finish in MIDDLE of long straight with TIGHT even spacing for minimal curvature
    const waypoints: Point[] = [
      { x: 400, y: 50 },
      // { x: 700, y: 90 },
      // { x: 670, y: 95 },
      { x: 530, y: 290 },
      { x: 580, y: 390 },
      { x: 468, y: 500 },
      { x: 308, y: 450 },
      // { x: 285, y: 470 },
      // { x: 290, y: 410 },
      // { x: 103, y: 400 },
      { x: 79, y: 300 },
      { x: 99, y: 100 },
      // { x: 59, y: 92 },
      // { x: 159, y: 122 },
      // { x: 200, y: 200 },
      // { x: 250, y: 200 },
      // { x: 300, y: 190 },
      // { x: 350, y: 120 },
    ];

    // High interpolation for ultra-smooth curves
    const result = this.interpolateWaypoints(waypoints, 35);
    console.log(`Track created with ${result.length} centerline points`);

    // Verify smooth closure (C¹ tangent and C² curvature continuity)
    if (result.length >= 4) {
      const pMinus2 = result[result.length - 2];
      const pMinus1 = result[result.length - 1];
      const p0 = result[0];
      const p1 = result[1];
      const p2 = result[2];

      // Check tangent matching (first derivative)
      const tangentEnd = Math.atan2(p0.y - pMinus1.y, p0.x - pMinus1.x);
      const tangentStart = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const tangentDiff = (Math.abs(tangentEnd - tangentStart) * 180) / Math.PI;

      // Check curvature matching (second derivative)
      const tangentBefore = Math.atan2(
        pMinus1.y - pMinus2.y,
        pMinus1.x - pMinus2.x
      );
      const tangentAfter = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const curvEnd = tangentEnd - tangentBefore;
      const curvStart = tangentAfter - tangentStart;
      const curvDiff = (Math.abs(curvEnd - curvStart) * 180) / Math.PI;

      console.log(`=== Loop Closure Quality ===`);
      console.log(
        `Tangent difference: ${tangentDiff.toFixed(2)}° (should be ~0°)`
      );
      console.log(
        `Curvature difference: ${curvDiff.toFixed(2)}° (should be ~0°)`
      );
    }

    return result;
  }

  // Create an oval-shaped centerline (legacy, kept for reference)
  private createOvalCenterline(
    cx: number,
    cy: number,
    radiusX: number,
    radiusY: number,
    segments: number
  ): Point[] {
    const points: Point[] = [];

    // Start at 12:00 (top) and go clockwise
    // Offset angle by -π/2 to start at top
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
      points.push({
        x: cx + Math.cos(angle) * radiusX,
        y: cy + Math.sin(angle) * radiusY,
      });
    }

    // Close the loop
    points.push({ ...points[0] });

    return points;
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
  getClosestPointOnCenterline(position: Point): {
    point: Point;
    distance: number;
  } {
    let minDist = Infinity;
    let closestPoint: Point = this.centerline[0];
    let bestDistance = 0;

    for (let i = 0; i < this.centerline.length - 1; i++) {
      const p1 = this.centerline[i];
      const p2 = this.centerline[i + 1];

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
        bestDistance = this.cumulativeLengths[i] + t * segmentDist;
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
    // Draw outer wall
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 3;
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
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
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

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p1.x + nx * this.halfWidth, p1.y + ny * this.halfWidth);
    ctx.lineTo(p1.x - nx * this.halfWidth, p1.y - ny * this.halfWidth);
    ctx.stroke();
  }
}
