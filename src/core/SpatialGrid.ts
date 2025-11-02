import type { Point, Segment } from '@/types';

/**
 * Spatial Grid for fast segment queries
 * Partitions 2D space into uniform grid cells for O(1) spatial lookups
 */
export class SpatialGrid {
  private cellSize: number;
  private minX: number;
  private minY: number;
  private maxX: number;
  private maxY: number;
  private cols: number;
  private rows: number;
  private grid: Map<number, Segment[]>;

  constructor(segments: Segment[], cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();

    // Calculate bounding box
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;

    for (const seg of segments) {
      this.minX = Math.min(this.minX, seg.p1.x, seg.p2.x);
      this.minY = Math.min(this.minY, seg.p1.y, seg.p2.y);
      this.maxX = Math.max(this.maxX, seg.p1.x, seg.p2.x);
      this.maxY = Math.max(this.maxY, seg.p1.y, seg.p2.y);
    }

    // Add padding
    const padding = cellSize;
    this.minX -= padding;
    this.minY -= padding;
    this.maxX += padding;
    this.maxY += padding;

    // Calculate grid dimensions
    this.cols = Math.ceil((this.maxX - this.minX) / cellSize);
    this.rows = Math.ceil((this.maxY - this.minY) / cellSize);

    // Insert all segments into grid cells
    for (const seg of segments) {
      this.insertSegment(seg);
    }
  }

  /**
   * Convert world coordinates to grid cell index
   * (Currently unused but kept for potential future optimizations)
   */
  // private getCellIndex(x: number, y: number): number {
  //   const col = Math.floor((x - this.minX) / this.cellSize);
  //   const row = Math.floor((y - this.minY) / this.cellSize);
  //   return row * this.cols + col;
  // }

  /**
   * Insert a segment into all cells it overlaps
   */
  private insertSegment(seg: Segment): void {
    // Get bounding box of segment
    const minX = Math.min(seg.p1.x, seg.p2.x);
    const minY = Math.min(seg.p1.y, seg.p2.y);
    const maxX = Math.max(seg.p1.x, seg.p2.x);
    const maxY = Math.max(seg.p1.y, seg.p2.y);

    // Get cell range
    const minCol = Math.max(0, Math.floor((minX - this.minX) / this.cellSize));
    const minRow = Math.max(0, Math.floor((minY - this.minY) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((maxX - this.minX) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((maxY - this.minY) / this.cellSize));

    // Insert segment into all overlapping cells
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * this.cols + col;
        if (!this.grid.has(index)) {
          this.grid.set(index, []);
        }
        this.grid.get(index)!.push(seg);
      }
    }
  }

  /**
   * Query segments near a ray
   * Returns all segments in cells that the ray passes through
   * Uses proper DDA grid traversal for accurate cell detection
   */
  queryRay(origin: Point, direction: Point, maxDist: number): Segment[] {
    const segments = new Set<Segment>();

    // Calculate ray end point
    const rayEndX = origin.x + direction.x * maxDist;
    const rayEndY = origin.y + direction.y * maxDist;

    // Get bounding box of ray (more robust than DDA for this use case)
    const minX = Math.min(origin.x, rayEndX);
    const minY = Math.min(origin.y, rayEndY);
    const maxX = Math.max(origin.x, rayEndX);
    const maxY = Math.max(origin.y, rayEndY);

    // Add padding to ensure we don't miss segments at boundaries
    const padding = this.cellSize * 0.5;

    const minCol = Math.max(0, Math.floor((minX - padding - this.minX) / this.cellSize));
    const minRow = Math.max(0, Math.floor((minY - padding - this.minY) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((maxX + padding - this.minX) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((maxY + padding - this.minY) / this.cellSize));

    // Query all cells in bounding box
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * this.cols + col;
        const cellSegments = this.grid.get(index);

        if (cellSegments) {
          for (const seg of cellSegments) {
            segments.add(seg);
          }
        }
      }
    }

    return Array.from(segments);
  }

  /**
   * Query segments near a point (for collision detection)
   */
  queryPoint(point: Point, radius: number): Segment[] {
    const segments = new Set<Segment>();

    const minCol = Math.max(0, Math.floor((point.x - radius - this.minX) / this.cellSize));
    const minRow = Math.max(0, Math.floor((point.y - radius - this.minY) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((point.x + radius - this.minX) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((point.y + radius - this.minY) / this.cellSize));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * this.cols + col;
        const cellSegments = this.grid.get(index);

        if (cellSegments) {
          for (const seg of cellSegments) {
            segments.add(seg);
          }
        }
      }
    }

    return Array.from(segments);
  }

  /**
   * Query segments in a bounding box
   */
  queryAABB(minX: number, minY: number, maxX: number, maxY: number): Segment[] {
    const segments = new Set<Segment>();

    const minCol = Math.max(0, Math.floor((minX - this.minX) / this.cellSize));
    const minRow = Math.max(0, Math.floor((minY - this.minY) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((maxX - this.minX) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((maxY - this.minY) / this.cellSize));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const index = row * this.cols + col;
        const cellSegments = this.grid.get(index);

        if (cellSegments) {
          for (const seg of cellSegments) {
            segments.add(seg);
          }
        }
      }
    }

    return Array.from(segments);
  }
}
