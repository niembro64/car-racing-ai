import type { Point, Segment, RayHit, ProjectionResult } from '@/types';

// Re-export types for backward compatibility
export type { Point, Segment, RayHit, ProjectionResult };

// Deterministic RNG with seed
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Box-Muller transform for gaussian random
  gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

// Segment-segment intersection
export function segmentIntersection(
  s1: Segment,
  s2: Segment
): Point | null {
  const { p1: a, p2: b } = s1;
  const { p1: c, p2: d } = s2;

  const denominator =
    (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);

  if (Math.abs(denominator) < 1e-10) return null;

  const t =
    ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator;
  const u =
    ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a.x + t * (b.x - a.x),
      y: a.y + t * (b.y - a.y)
    };
  }

  return null;
}

// Cast a ray from origin in direction, return nearest hit with segments
export function castRay(
  origin: Point,
  direction: Point,
  segments: Segment[],
  maxDist: number = 1000
): RayHit | null {
  const rayEnd: Point = {
    x: origin.x + direction.x * maxDist,
    y: origin.y + direction.y * maxDist
  };

  const raySeg: Segment = { p1: origin, p2: rayEnd };

  let nearestHit: RayHit | null = null;
  let minDist = Infinity;

  for (const seg of segments) {
    const hit = segmentIntersection(raySeg, seg);
    if (hit) {
      const dist = distance(origin, hit);
      if (dist < minDist) {
        minDist = dist;
        nearestHit = { distance: dist, point: hit };
      }
    }
  }

  return nearestHit;
}

// Distance between two points
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Project point onto segment, return projection point and parameter t
export function projectPointOntoSegment(
  point: Point,
  seg: Segment
): ProjectionResult {
  const { p1, p2 } = seg;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq < 1e-10) {
    return {
      projection: { ...p1 },
      t: 0,
      distance: distance(point, p1)
    };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq
    )
  );

  const projection: Point = {
    x: p1.x + t * dx,
    y: p1.y + t * dy
  };

  return {
    projection,
    t,
    distance: distance(point, projection)
  };
}

// Find closest point on polyline and return cumulative distance traveled
export function closestPointOnPolyline(
  point: Point,
  polyline: Point[],
  cumulativeLengths: number[]
): number {
  let minDist = Infinity;
  let bestDistance = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const seg: Segment = { p1: polyline[i], p2: polyline[i + 1] };
    const proj = projectPointOntoSegment(point, seg);

    if (proj.distance < minDist) {
      minDist = proj.distance;
      const segmentDist = distance(polyline[i], polyline[i + 1]);
      bestDistance = cumulativeLengths[i] + proj.t * segmentDist;
    }
  }

  return bestDistance;
}

// Compute cumulative arc lengths for a polyline (closed loop)
export function computeCumulativeLengths(polyline: Point[]): number[] {
  const lengths: number[] = [0];
  let cumulative = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    cumulative += distance(polyline[i], polyline[i + 1]);
    lengths.push(cumulative);
  }

  // Add the wrap-around segment from last point back to first point for closed loop
  cumulative += distance(polyline[polyline.length - 1], polyline[0]);
  lengths.push(cumulative);

  return lengths;
}

// Offset a polyline by a perpendicular distance (for track walls)
export function offsetPolyline(
  polyline: Point[],
  offset: number
): Point[] {
  const result: Point[] = [];

  for (let i = 0; i < polyline.length; i++) {
    const curr = polyline[i];
    const next = polyline[(i + 1) % polyline.length];

    // Compute tangent direction from current to next point
    const dx = next.x - curr.x;
    const dy = next.y - curr.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 0.001) {
      // Normalize tangent
      const tx = dx / len;
      const ty = dy / len;

      // Perpendicular normal (pointing right when going forward)
      const nx = -ty;
      const ny = tx;

      // Offset the point perpendicular to the tangent
      result.push({
        x: curr.x + nx * offset,
        y: curr.y + ny * offset
      });
    } else {
      // Degenerate segment, just use the point as-is
      result.push({ x: curr.x, y: curr.y });
    }
  }

  return result;
}

// Check if polygon (as array of points) intersects with any segment
export function polygonIntersectsSegments(
  polygon: Point[],
  segments: Segment[]
): boolean {
  // Create edges from polygon
  const polyEdges: Segment[] = [];
  for (let i = 0; i < polygon.length; i++) {
    polyEdges.push({
      p1: polygon[i],
      p2: polygon[(i + 1) % polygon.length]
    });
  }

  // Check each polygon edge against all segments
  for (const polyEdge of polyEdges) {
    for (const seg of segments) {
      if (segmentIntersection(polyEdge, seg)) {
        return true;
      }
    }
  }

  return false;
}

// Check if a circle intersects with a line segment
export function circleIntersectsSegment(
  center: Point,
  radius: number,
  segment: Segment
): boolean {
  // Find the closest point on the segment to the circle center
  const proj = projectPointOntoSegment(center, segment);

  // If the closest point is within the radius, there's an intersection
  return proj.distance <= radius;
}

// Check if a circle intersects with any segment from a list
export function circleIntersectsSegments(
  center: Point,
  radius: number,
  segments: Segment[]
): boolean {
  for (const seg of segments) {
    if (circleIntersectsSegment(center, radius, seg)) {
      return true;
    }
  }
  return false;
}

// Create a rectangle polygon centered at position with given angle
export function createCarPolygon(
  x: number,
  y: number,
  angle: number,
  width: number,
  height: number
): Point[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hw = width / 2;
  const hh = height / 2;

  const corners: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh }
  ];

  return corners.map(c => ({
    x: x + c.x * cos - c.y * sin,
    y: y + c.x * sin + c.y * cos
  }));
}

// Update an existing polygon array in place (for object pooling)
export function updateCarPolygon(
  polygon: Point[],
  x: number,
  y: number,
  angle: number,
  width: number,
  height: number
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hw = width / 2;
  const hh = height / 2;

  // Four corners of the rectangle (local coordinates)
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh }
  ];

  // Update existing polygon points in place
  for (let i = 0; i < 4; i++) {
    const c = corners[i];
    polygon[i].x = x + c.x * cos - c.y * sin;
    polygon[i].y = y + c.x * sin + c.y * cos;
  }
}

// Clamp value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Normalize angle to [-PI, PI]
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
