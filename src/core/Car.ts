import type { Point, Segment, RayHit } from './math/geom';
import {
  createCarPolygon,
  polygonIntersectsSegments,
  clamp,
  normalizeAngle
} from './math/geom';
import { NeuralNetwork } from './Neural';
import { RayCaster } from './Ray';
import type { NeuralInput, NeuralOutput } from '@/types/neural';
import {
  CAR_ACCELERATION,
  CAR_BRAKE_POWER,
  CAR_DRAG,
  CAR_STEER_RATE,
  CAR_MAX_SPEED,
  CAR_WIDTH,
  CAR_HEIGHT
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

  // Dimensions
  width: number = CAR_WIDTH;
  height: number = CAR_HEIGHT;

  // Neural network
  brain: NeuralNetwork;

  // Sensors
  rayCaster: RayCaster;
  lastRayHits: (RayHit | null)[] = [];
  lastRayDistances: number[] = [];

  // Color for rendering
  color: string;

  constructor(
    x: number,
    y: number,
    angle: number,
    brain: NeuralNetwork,
    color: string = '#0088ff'
  ) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.alive = true;
    this.fitness = 0;
    this.signedFitness = 0;
    this.lastCenterlineDistance = 0;
    this.brain = brain;
    this.rayCaster = new RayCaster(500);
    this.color = color;
  }

  // Update physics and AI
  update(dt: number, wallSegments: Segment[]): void {
    if (!this.alive) return;

    // Cast rays for sensors using PHYSICS angle
    // Rays should be relative to direction of travel, not visual orientation
    const { distances, hits } = this.rayCaster.castRays(
      { x: this.x, y: this.y },
      this.angle,
      wallSegments
    );

    this.lastRayDistances = distances;
    this.lastRayHits = hits;

    // Prepare neural network input
    const input: NeuralInput = {
      rays: distances,
      speed: clamp(this.speed / CAR_MAX_SPEED, 0, 1) // Normalize speed
    };

    // Get AI output
    const output: NeuralOutput = this.brain.run(input);

    // Debug log for first car only (to avoid spam)
    if ((window as any).__debugCarNN && Math.random() < 0.01) {
      console.log('Neural Net IO:', {
        input: { rays: input.rays.map(r => r.toFixed(2)), speed: input.speed.toFixed(2) },
        output: { speed: output.speed.toFixed(2), direction: output.direction.toFixed(2) }
      });
    }

    // Apply physics
    this.applyPhysics(output, dt);

    // Check collision
    this.checkCollision(wallSegments);
  }

  // Apply physics based on AI output
  private applyPhysics(output: NeuralOutput, dt: number): void {
    // Set speed directly from neural network output
    // Output speed is in range [-1, 1], map to actual velocity
    const desiredSpeed = output.speed * CAR_MAX_SPEED;

    // Smoothly transition to desired speed (with acceleration limit)
    const speedDiff = desiredSpeed - this.speed;
    const maxAccel = CAR_ACCELERATION * dt;
    if (Math.abs(speedDiff) > maxAccel) {
      this.speed += Math.sign(speedDiff) * maxAccel;
    } else {
      this.speed = desiredSpeed;
    }

    // Apply drag
    this.speed *= Math.pow(CAR_DRAG, dt);

    // Clamp speed
    this.speed = clamp(this.speed, -CAR_MAX_SPEED * 0.5, CAR_MAX_SPEED);

    // Update position
    const headingX = Math.cos(this.angle);
    const headingY = Math.sin(this.angle);
    this.x += headingX * this.speed * dt;
    this.y += headingY * this.speed * dt;

    // Update angle based on direction output
    // Direction in range [-1, 1] maps to turning rate
    // -1 = full left turn, 0 = straight, 1 = full right turn
    // Maximum turn rate is CAR_STEER_RATE radians/second
    this.angle += output.direction * CAR_STEER_RATE * dt;
    this.angle = normalizeAngle(this.angle);

    // Prevent NaN propagation
    if (isNaN(this.x) || isNaN(this.y) || isNaN(this.angle) || isNaN(this.speed)) {
      console.warn('NaN detected in car physics, marking as crashed');
      this.alive = false;
      this.speed = 0;
    }
  }

  // Update signed fitness based on centerline distance with wrap-around detection
  updateSignedFitness(currentCenterlineDistance: number, trackLength: number): void {
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

    // Accumulate signed distance
    this.signedFitness += delta;

    // Update last position for next frame
    this.lastCenterlineDistance = currentCenterlineDistance;
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
  render(ctx: CanvasRenderingContext2D, showRays: boolean = false, trackLength?: number, centerlinePoint?: { x: number; y: number }): void {
    // Render line from car to nearest centerline point
    if (centerlinePoint) {
      ctx.save();
      ctx.strokeStyle = this.alive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(156, 163, 175, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(centerlinePoint.x, centerlinePoint.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Render rays if requested and car is alive
    if (showRays && this.alive) {
      this.rayCaster.renderRays(ctx, { x: this.x, y: this.y }, this.lastRayHits);
    }

    // Render percentage label above car
    if (trackLength) {
      const percentage = (this.signedFitness / trackLength) * 100;
      const sign = percentage >= 0 ? '+' : '';
      ctx.save();
      ctx.fillStyle = this.alive ? '#1f2937' : '#9ca3af';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${sign}${percentage.toFixed(0)}%`, this.x, this.y - this.height / 2 - 6);
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
