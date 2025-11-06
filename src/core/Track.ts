import type { Point, Segment, CenterlinePointResult } from '@/types';
import {
  offsetPolyline,
  computeCumulativeLengths,
  closestPointOnPolyline,
} from './math/geom';
import { CONFIG } from '@/config';
import { SpatialGrid } from './SpatialGrid';

export class Track {
  centerline: Point[];
  innerWall: Point[];
  outerWall: Point[];
  wallSegments: Segment[];
  spatialGrid: SpatialGrid;
  cumulativeLengths: number[];
  halfWidth: number;
  startPosition!: Point; // Initialized via setStartIndex
  startAngle!: number; // Initialized via setStartIndex
  startIndex: number;

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

    // Create spatial grid for fast collision/ray queries
    // Cell size of 100 provides good balance between memory and query speed
    this.spatialGrid = new SpatialGrid(this.wallSegments, 100);

    // Compute cumulative lengths for fitness calculation
    this.cumulativeLengths = computeCumulativeLengths(this.centerline);

    // Initialize start position at beginning (will be set properly by setStartIndex)
    this.startIndex = 0;
    this.setStartIndex(0);
  }

  // Set the start/finish line to a specific centerline index
  private setStartIndex(index: number): void {
    this.startIndex = index % this.centerline.length;
    this.startPosition = { ...this.centerline[this.startIndex] };
    const nextIndex = (this.startIndex + 1) % this.centerline.length;
    const next = this.centerline[nextIndex];
    this.startAngle = Math.atan2(
      next.y - this.startPosition.y,
      next.x - this.startPosition.x
    );
  }

  // Randomize the start/finish line position from preset positions
  randomizeStartPosition(): void {
    const presetPositions = CONFIG.track.presetStartPositions;
    const randomPreset = presetPositions[Math.floor(Math.random() * presetPositions.length)];

    // Add ±5% randomness to the preset position
    const randomOffset = (Math.random() - 0.5) * 0.1; // -0.05 to +0.05
    const positionRatio = Math.max(0, Math.min(1, randomPreset + randomOffset));

    // Convert distance ratio to centerline index using cumulative lengths
    const targetDistance = positionRatio * this.getTotalLength();
    let closestIndex = 0;
    let minDiff = Math.abs(this.cumulativeLengths[0] - targetDistance);

    for (let i = 1; i < this.cumulativeLengths.length; i++) {
      const diff = Math.abs(this.cumulativeLengths[i] - targetDistance);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }

    this.setStartIndex(closestIndex);
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
    const result = this.interpolateWaypoints(CONFIG.track.waypoints.mirrored, CONFIG.track.segmentsPerCurve);
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
    ctx.fillStyle = CONFIG.track.colors.surface;
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
    ctx.strokeStyle = CONFIG.track.colors.boundary;
    ctx.lineWidth = CONFIG.track.lineWidths.boundary;
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
    ctx.strokeStyle = CONFIG.track.colors.centerline;
    ctx.lineWidth = CONFIG.track.lineWidths.centerline;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(this.centerline[0].x, this.centerline[0].y);
    for (let i = 1; i < this.centerline.length; i++) {
      ctx.lineTo(this.centerline[i].x, this.centerline[i].y);
    }
    ctx.closePath(); // Close the loop back to the start
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start line
    const startIdx = this.startIndex;
    const nextIdx = (this.startIndex + 1) % this.centerline.length;
    const p1 = this.centerline[startIdx];
    const p2 = this.centerline[nextIdx];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;

    ctx.strokeStyle = CONFIG.track.colors.startFinishLine;
    ctx.lineWidth = CONFIG.track.lineWidths.startFinishLine;
    ctx.beginPath();
    ctx.moveTo(p1.x + nx * this.halfWidth, p1.y + ny * this.halfWidth);
    ctx.lineTo(p1.x - nx * this.halfWidth, p1.y - ny * this.halfWidth);
    ctx.stroke();
  }
}
