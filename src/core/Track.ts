import type { Point, Segment } from './math/geom';
import {
  offsetPolyline,
  computeCumulativeLengths,
  closestPointOnPolyline
} from './math/geom';
import {
  TRACK_HALF_WIDTH,
  TRACK_CENTER_X,
  TRACK_CENTER_Y,
  TRACK_RADIUS_X,
  TRACK_RADIUS_Y,
  TRACK_SEGMENTS
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
    console.log(`Centerline has ${this.centerline.length} points`);

    // Offset to create walls
    this.innerWall = offsetPolyline(this.centerline, -halfWidth);
    this.outerWall = offsetPolyline(this.centerline, halfWidth);
    console.log(`Walls created: inner=${this.innerWall.length}, outer=${this.outerWall.length}`);

    // Create wall segments
    this.wallSegments = [];

    // Inner wall segments
    for (let i = 0; i < this.innerWall.length; i++) {
      this.wallSegments.push({
        p1: this.innerWall[i],
        p2: this.innerWall[(i + 1) % this.innerWall.length]
      });
    }

    // Outer wall segments
    for (let i = 0; i < this.outerWall.length; i++) {
      this.wallSegments.push({
        p1: this.outerWall[i],
        p2: this.outerWall[(i + 1) % this.outerWall.length]
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

    console.log(`Start position: (${this.startPosition.x.toFixed(1)}, ${this.startPosition.y.toFixed(1)})`);
    console.log(`Start angle: ${(this.startAngle * 180 / Math.PI).toFixed(1)}°`);
    console.log(`Track length: ${this.getTotalLength().toFixed(1)}`);
  }

  // Catmull-Rom spline interpolation between points
  private catmullRomSpline(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: 0.5 * (
        (2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      ),
      y: 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      )
    };
  }

  // Interpolate smooth curve through waypoints
  private interpolateWaypoints(waypoints: Point[], segmentsPerCurve: number = 20): Point[] {
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

    // Close the loop
    points.push({ ...points[0] });

    return points;
  }

  // Create a complex race track with multiple corner types
  private createComplexTrack(): Point[] {
    // Define waypoints for a flowing, smooth track layout
    // Canvas: 800x600, leaving ~60px margin (accounting for track width)
    // More waypoints = smoother curves, especially in direction changes
    const waypoints: Point[] = [
      // Start/finish straight (left side) - extended for smooth loop closure
      { x: 100, y: 300 },
      { x: 150, y: 300 },
      { x: 210, y: 298 },

      // Gentle climbing right turn
      { x: 300, y: 285 },
      { x: 390, y: 255 },
      { x: 470, y: 215 },
      { x: 540, y: 170 },
      { x: 600, y: 130 },

      // Wide sweeping right at top (many points for smoothness)
      { x: 650, y: 105 },
      { x: 690, y: 95 },
      { x: 725, y: 105 },
      { x: 745, y: 130 },
      { x: 755, y: 165 },
      { x: 758, y: 210 },

      // Long straight down right side
      { x: 755, y: 280 },
      { x: 750, y: 360 },

      // Smooth S-curve (wide radius)
      { x: 735, y: 410 },
      { x: 710, y: 450 },
      { x: 695, y: 485 },
      { x: 695, y: 515 },

      // Sweeping turn across bottom (gradual)
      { x: 670, y: 540 },
      { x: 620, y: 555 },
      { x: 550, y: 560 },
      { x: 470, y: 558 },
      { x: 390, y: 550 },
      { x: 320, y: 535 },

      // Gentle left turn at bottom left (more waypoints for smoothness)
      { x: 260, y: 515 },
      { x: 215, y: 490 },
      { x: 180, y: 460 },
      { x: 155, y: 425 },
      { x: 138, y: 385 },

      // Smooth return up left side to complete loop
      { x: 128, y: 345 },
      { x: 120, y: 320 },
      { x: 108, y: 305 },
    ];

    // Use more segments for ultra-smooth curves
    const result = this.interpolateWaypoints(waypoints, 20);
    console.log(`Track created with ${result.length} centerline points`);
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
        y: cy + Math.sin(angle) * radiusY
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
  getClosestPointOnCenterline(position: Point): { point: Point; distance: number } {
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
        t = Math.max(0, Math.min(1, ((position.x - p1.x) * dx + (position.y - p1.y) * dy) / lenSq));
      }

      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;

      const distSq = (position.x - projX) * (position.x - projX) + (position.y - projY) * (position.y - projY);

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
    ctx.moveTo(
      p1.x + nx * this.halfWidth,
      p1.y + ny * this.halfWidth
    );
    ctx.lineTo(
      p1.x - nx * this.halfWidth,
      p1.y - ny * this.halfWidth
    );
    ctx.stroke();
  }
}
