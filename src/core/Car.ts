import type { Point, Segment, RayHit } from './math/geom';
import {
  createCarPolygon,
  polygonIntersectsSegments,
  normalizeAngle,
} from './math/geom';
import { NeuralNetwork } from './Neural';
import { RayCaster } from './Ray';
import type { NeuralInput, NeuralOutput } from '@/types/neural';
import {
  CAR_FORWARD_SPEED,
  CAR_STEERING_SENSITIVITY,
  CAR_WIDTH,
  CAR_HEIGHT,
  NORM_RELU_ELITE_CAR_COLOR,
  DIFF_LINEAR_ELITE_CAR_COLOR,
  CAR_LABEL_COLOR_ALIVE,
  CAR_LABEL_COLOR_DEAD,
  NORM_RELU_CAR_RAY_COLOR,
  NORM_RELU_CAR_RAY_HIT_COLOR,
  NORM_RELU_CAR_RAY_WIDTH,
  NORM_RELU_CAR_RAY_HIT_RADIUS,
  DIFF_LINEAR_CAR_RAY_COLOR,
  DIFF_LINEAR_CAR_RAY_HIT_COLOR,
  DIFF_LINEAR_CAR_RAY_WIDTH,
  DIFF_LINEAR_CAR_RAY_HIT_RADIUS,
  CENTERLINE_RAY_HIT_COLOR,
  SENSOR_RAY_PAIRS,
  SHOW_CAR_PERCENTAGES,
  DEFAULT_DIFFERENTIAL_INPUTS,
} from '@/config';

export class Car {
  // Position and motion
  x: number;
  y: number;
  angle: number;
  speed: number;

  // State
  alive: boolean;
  fitness: number;
  signedFitness: number; // Accumulated signed distance (can be negative, can be > trackLength)
  lastCenterlineDistance: number; // Previous frame's centerline distance for delta calculation
  maxDistanceReached: number; // Farthest position ever reached on track (used for scoring)
  startingDistance: number; // Initial centerline distance (for measuring relative progress)
  currentProgressRatio: number; // Current course percentage done as a ratio (same as displayed percentage / 100)
  previousProgressRatio: number; // Previous course percentage done as a ratio
  frameCount: number; // Number of frames this car has been alive

  // Dimensions
  width: number = CAR_WIDTH;
  height: number = CAR_HEIGHT;

  // Neural network
  brain: NeuralNetwork;

  // Sensors
  rayCaster: RayCaster;
  lastRayHits: (RayHit | null)[] = [];
  lastRayDistances: number[] = [];

  // Centerline tracking
  lastCenterlinePoint: Point | null = null;

  // Color for rendering
  color: string;

  // Input mode
  useDifferentialInputs: boolean;

  constructor(
    x: number,
    y: number,
    angle: number,
    brain: NeuralNetwork,
    color: string,
    useDifferentialInputs: boolean = DEFAULT_DIFFERENTIAL_INPUTS
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.alive = true;
    this.fitness = 0;
    this.signedFitness = 0;
    this.lastCenterlineDistance = 0;
    this.maxDistanceReached = 0;
    this.startingDistance = 0;
    this.currentProgressRatio = 0;
    this.previousProgressRatio = -1;
    this.frameCount = 0;
    this.useDifferentialInputs = useDifferentialInputs;
    this.brain = brain;
    this.rayCaster = new RayCaster();
    this.color = color;
  }

  // Update physics and AI
  update(dt: number, wallSegments: Segment[], track: any): void {
    if (!this.alive) return;

    // Increment frame counter
    this.frameCount++;

    // Cast rays for sensors using PHYSICS angle
    // Rays should be relative to direction of travel, not visual orientation
    const { distances, hits } = this.rayCaster.castRays(
      { x: this.x, y: this.y },
      this.angle,
      wallSegments
    );

    this.lastRayDistances = distances;
    this.lastRayHits = hits;

    // Get closest point on centerline (for visualization only)
    const centerlineResult = track.getClosestPointOnCenterline({
      x: this.x,
      y: this.y,
    });
    this.lastCenterlinePoint = centerlineResult.point;

    // Prepare neural network input based on mode
    let inputRays: number[];

    if (this.useDifferentialInputs) {
      // Differential mode: forward ray + (left - right) pairs
      inputRays = [distances[0]]; // Forward ray (index 0)

      // Add differential pairs (left - right)
      for (const [leftIdx, rightIdx] of SENSOR_RAY_PAIRS) {
        const differential = distances[leftIdx] - distances[rightIdx];
        inputRays.push(differential);
      }
    } else {
      // Standard mode: all raw ray distances
      inputRays = distances;
    }

    const input: NeuralInput = {
      rays: inputRays,
    };

    // Get AI output (only direction)
    const output: NeuralOutput = this.brain.run(input);

    // Apply physics
    this.applyPhysics(output, dt);

    // Check collision
    this.checkCollision(wallSegments);
  }

  // Apply physics based on AI output
  private applyPhysics(output: NeuralOutput, dt: number): void {
    // Constant forward speed
    this.speed = CAR_FORWARD_SPEED;

    // Update position
    const headingX = Math.cos(this.angle);
    const headingY = Math.sin(this.angle);
    this.x += headingX * this.speed * dt;
    this.y += headingY * this.speed * dt;

    // Turning is proportional to speed (direction from neural network)
    this.angle += output.direction * this.speed * CAR_STEERING_SENSITIVITY * dt;
    this.angle = normalizeAngle(this.angle);

    // Prevent NaN propagation
    if (isNaN(this.x) || isNaN(this.y) || isNaN(this.angle)) {
      this.alive = false;
      this.speed = 0;
    }
  }

  // Update signed fitness based on centerline distance with wrap-around detection
  updateSignedFitness(
    currentCenterlineDistance: number,
    trackLength: number
  ): void {
    // Initialize on first call
    if (this.startingDistance === 0 && this.lastCenterlineDistance === 0) {
      this.startingDistance = currentCenterlineDistance;
      this.lastCenterlineDistance = currentCenterlineDistance;
      this.signedFitness = 0;
      this.maxDistanceReached = 0; // Progress starts at 0
      this.currentProgressRatio = 0;
      // Keep previousProgressRatio at -1 (set in constructor) to detect backwards movement on first update
      return;
    }

    // Store previous ratio before updating
    this.previousProgressRatio = this.currentProgressRatio;

    // Calculate delta from last position
    let delta = currentCenterlineDistance - this.lastCenterlineDistance;

    // Handle wrap-around at start/finish line
    if (delta > trackLength / 2) {
      // Car likely went backward and wrapped around (0 -> trackLength direction)
      delta = delta - trackLength;
    } else if (delta < -trackLength / 2) {
      // Car likely went forward and wrapped around (trackLength -> 0 direction)
      delta = delta + trackLength;
    }

    // Accumulate signed distance (can be negative, can be > trackLength)
    this.signedFitness += delta;

    // Update current progress ratio (0.0 at start, 0.5 halfway through 1st lap,
    // 1.0 at 1st lap complete, 2.0 at 2nd lap complete, 10.0 at 10th lap complete)
    this.currentProgressRatio = this.signedFitness / trackLength;

    // Track maximum cumulative distance reached (for scoring)
    // maxDistanceReached is used for selection - only tracks forward progress
    // For display, we use signedFitness which can be negative
    if (this.signedFitness > this.maxDistanceReached) {
      this.maxDistanceReached = this.signedFitness;
    }

    // Update last position for next frame
    this.lastCenterlineDistance = currentCenterlineDistance;
  }

  // Check if car has gone backwards or failed to move forward
  hasGoneBackwards(): boolean {
    return this.currentProgressRatio <= this.previousProgressRatio;
  }

  // Check if car has failed to make minimum progress after 1 second (60 frames)
  hasFailedMinimumProgress(): boolean {
    return this.frameCount >= 60 && this.currentProgressRatio < 0.01; // 1% progress
  }

  // Check collision with walls
  private checkCollision(wallSegments: Segment[]): void {
    if (!this.alive) return;

    const polygon = createCarPolygon(
      this.x,
      this.y,
      this.angle - Math.PI / 2, // Match visual orientation
      this.width,
      this.height
    );

    if (polygonIntersectsSegments(polygon, wallSegments)) {
      this.alive = false;
      this.speed = 0;
    }
  }

  // Render car on canvas
  render(ctx: CanvasRenderingContext2D, showRays: boolean = false): void {
    // Render rays if requested and car is alive
    if (showRays && this.alive) {
      // Render centerline ray (showing distance from car to track center)
      if (this.lastCenterlinePoint) {
        const isElite = this.color === NORM_RELU_ELITE_CAR_COLOR || this.color === DIFF_LINEAR_ELITE_CAR_COLOR;

        // Use colors based on input type
        const rayColor = this.useDifferentialInputs ? DIFF_LINEAR_CAR_RAY_COLOR : NORM_RELU_CAR_RAY_COLOR;
        const hitColor = CENTERLINE_RAY_HIT_COLOR;
        const lineWidth = this.useDifferentialInputs ? DIFF_LINEAR_CAR_RAY_WIDTH : NORM_RELU_CAR_RAY_WIDTH;
        const hitRadius = this.useDifferentialInputs ? DIFF_LINEAR_CAR_RAY_HIT_RADIUS : NORM_RELU_CAR_RAY_HIT_RADIUS;

        ctx.save();
        // Draw line to centerline
        ctx.strokeStyle = rayColor;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.lastCenterlinePoint.x, this.lastCenterlinePoint.y);
        ctx.stroke();

        // Draw hit point on centerline
        ctx.fillStyle = hitColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(
          this.lastCenterlinePoint.x,
          this.lastCenterlinePoint.y,
          hitRadius,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }
      // Use colors based on input type (DiffLinear vs NormReLU)
      const rayColor = this.useDifferentialInputs ? DIFF_LINEAR_CAR_RAY_COLOR : NORM_RELU_CAR_RAY_COLOR;
      const hitColor = this.useDifferentialInputs ? DIFF_LINEAR_CAR_RAY_HIT_COLOR : NORM_RELU_CAR_RAY_HIT_COLOR;
      const lineWidth = this.useDifferentialInputs ? DIFF_LINEAR_CAR_RAY_WIDTH : NORM_RELU_CAR_RAY_WIDTH;
      const hitRadius = this.useDifferentialInputs ? DIFF_LINEAR_CAR_RAY_HIT_RADIUS : NORM_RELU_CAR_RAY_HIT_RADIUS;

      this.rayCaster.renderRays(
        ctx,
        { x: this.x, y: this.y },
        this.lastRayHits,
        rayColor,
        hitColor,
        lineWidth,
        hitRadius
      );
    }

    // Render percentage label above car (shows current progress including negative)
    // Progress ratio: 0.0 at start, 0.5 at halfway through first lap, 1.0 at first lap complete, etc.
    if (SHOW_CAR_PERCENTAGES) {
      const percentage = this.currentProgressRatio * 100;
      const sign = percentage >= 0 ? '+' : '-';
      const absValue = Math.abs(percentage);
      const formatted = absValue.toFixed(1).padStart(4, ' '); // "XX.X" format
      ctx.save();
      ctx.fillStyle = this.alive ? CAR_LABEL_COLOR_ALIVE : CAR_LABEL_COLOR_DEAD;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${sign}${formatted}%`, this.x, this.y - this.height / 2 - 6);
      ctx.restore();
    }

    // Render car body
    ctx.save();
    ctx.translate(this.x, this.y);
    // Rotate by angle - 90° so visual front matches physics heading
    // (angle=0 in physics = moving right, so visual should point right)
    ctx.rotate(this.angle - Math.PI / 2);

    // Car color based on state
    if (this.alive) {
      ctx.fillStyle = this.color;
      ctx.strokeStyle = '#1f2937';
    } else {
      ctx.fillStyle = '#9ca3af';
      ctx.strokeStyle = '#6b7280';
    }

    ctx.lineWidth = 1;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Draw direction indicator (white stripe at front)
    ctx.fillStyle = this.alive ? '#ffffff' : '#d1d5db';
    ctx.fillRect(-this.width / 4, this.height / 2 - 4, this.width / 2, 4);

    ctx.restore();
  }

  // Get car polygon for collision detection
  getPolygon(): Point[] {
    return createCarPolygon(
      this.x,
      this.y,
      this.angle - Math.PI / 2, // Match visual orientation
      this.width,
      this.height
    );
  }

  // Clone with a new brain
  clone(newBrain: NeuralNetwork): Car {
    return new Car(this.x, this.y, this.angle, newBrain, this.color);
  }
}
