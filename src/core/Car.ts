import type {
  Point,
  Segment,
  RayHit,
  NeuralInput,
  NeuralOutput,
  InputModificationType,
  CarNeuralNetwork,
  CarVizMode,
} from '@/types';
import { ACTIVATION_COLORS, INPUT_COLORS } from '@/types';
import {
  createCarPolygon,
  updateCarPolygon,
  polygonIntersectsSegments,
  normalizeAngle,
} from './math/geom';
import { NeuralNetwork } from './Neural';
import { RayCaster } from './Ray';
import { CONFIG } from '@/config';
import { CAR_BRAIN_CONFIGS_DEFINED } from './config_cars';

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
  elapsedTime: number; // Total time this car has been alive (in seconds)

  // Dimensions (always use simple/small for physics/collision)
  width: number = CONFIG.car.dimensions.simple.width;
  height: number = CONFIG.car.dimensions.simple.height;
  sizeMultiplier: number = 1.0; // Scale factor for elite cars

  // Neural network
  brain: NeuralNetwork;

  // Sensors
  rayCaster: RayCaster;
  lastRayHits: (RayHit | null)[] = [];
  lastRayDistances: number[] = [];

  // Centerline tracking
  lastCenterlinePoint: Point | null = null;
  lastCenterlineDistanceAlongTrack: number = 0; // Distance along track centerline

  // Color for rendering
  color: string;

  // Input mode
  inputModification: InputModificationType;

  // Config identifier (which brain config this car belongs to)
  configShortName: string;

  // Object pooling - reused polygon for collision detection
  private polygonCache: Point[];

  constructor(
    x: number,
    y: number,
    angle: number,
    brain: NeuralNetwork,
    color: string,
    inputModification: InputModificationType,
    configShortName: string = 'UNK',
    sizeMultiplier: number = 1.0
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
    this.elapsedTime = 0;
    this.sizeMultiplier = sizeMultiplier;
    this.inputModification = inputModification;
    this.configShortName = configShortName;
    this.brain = brain;
    this.rayCaster = new RayCaster();
    this.color = color;

    // Initialize polygon cache for object pooling (4 corners)
    this.polygonCache = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];
  }

  // Update physics and AI
  update(
    dt: number,
    wallSegments: Segment[],
    track: any,
    steeringDelayEnabled: boolean,
    steeringDelaySeconds: number,
    speedMultiplier: number
  ): void {
    if (!this.alive) return;

    // Increment frame counter and elapsed time
    this.frameCount++;
    this.elapsedTime += dt;

    // Cast rays for sensors using PHYSICS angle
    // Rays should be relative to direction of travel, not visual orientation
    const { distances, hits } = this.rayCaster.castRays(
      { x: this.x, y: this.y },
      this.angle,
      wallSegments,
      track.spatialGrid
    );

    this.lastRayDistances = distances;
    this.lastRayHits = hits;

    // Get closest point on centerline (for fitness calculation and visualization)
    const centerlineResult = track.getClosestPointOnCenterline({
      x: this.x,
      y: this.y,
    });
    this.lastCenterlinePoint = centerlineResult.point;
    this.lastCenterlineDistanceAlongTrack = centerlineResult.distance;

    // Prepare neural network input based on mode
    let inputRays: number[];

    if (this.inputModification === 'pair') {
      // Differential mode: forward ray + (left - right) pairs
      inputRays = [distances[0]]; // Forward ray (index 0)

      // Add differential pairs (left - right)
      for (const [leftIdx, rightIdx] of CONFIG.neuralNetwork.sensorRays.pairs) {
        const differential = distances[leftIdx] - distances[rightIdx];
        inputRays.push(differential);
      }
    } else {
      // Direct mode: all raw ray distances
      inputRays = distances;
    }

    const input: NeuralInput = {
      rays: inputRays,
    };

    // Get AI output (only direction)
    let output: NeuralOutput = this.brain.run(input);

    // Check if steering should be delayed
    // Adjust delay by speed multiplier to keep effective delay consistent
    const adjustedDelay = steeringDelaySeconds / speedMultiplier;
    if (steeringDelayEnabled && this.elapsedTime < adjustedDelay) {
      // Prevent steering by forcing direction to 0
      output = { ...output, direction: 0 };
    }

    // Apply physics
    this.applyPhysics(output, dt, speedMultiplier);

    // Check collision
    this.checkCollision(track);
  }

  // Apply physics based on AI output
  private applyPhysics(
    output: NeuralOutput,
    dt: number,
    speedMultiplier: number = 1
  ): void {
    // Constant forward speed (with optional multiplier)
    this.speed = CONFIG.car.physics.forwardSpeed * speedMultiplier;

    // Update position
    const headingX = Math.cos(this.angle);
    const headingY = Math.sin(this.angle);
    this.x += headingX * this.speed * dt;
    this.y += headingY * this.speed * dt;

    // Turning is proportional to speed (direction from neural network)
    this.angle += output.direction * this.speed * CONFIG.car.physics.steeringSensitivity * dt;
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
  private checkCollision(track: any): void {
    if (!this.alive) return;

    // Update polygon cache in place (object pooling - no allocation)
    updateCarPolygon(
      this.polygonCache,
      this.x,
      this.y,
      this.angle - Math.PI / 2, // Match visual orientation
      this.width * this.sizeMultiplier,
      this.height * this.sizeMultiplier
    );

    // Use spatial grid to query only nearby wall segments
    // Query radius based on car diagonal + small margin
    const queryRadius = Math.sqrt(this.width * this.width + this.height * this.height) * this.sizeMultiplier + 20;
    const nearbySegments = track.spatialGrid.queryPoint(
      { x: this.x, y: this.y },
      queryRadius
    );

    if (polygonIntersectsSegments(this.polygonCache, nearbySegments)) {
      this.alive = false;
      this.speed = 0;
    }
  }

  // Helper: Convert a weight/bias value to grayscale color
  // Values around 0 are gray, positive values are whiter, negative values are blacker
  private valueToGrayscale(value: number): string {
    // Clamp value to reasonable range for visualization
    const clampedValue = Math.max(-3, Math.min(3, value));

    // Map [-3, 3] to [0, 255] with 0 mapping to gray (136 = 0x88)
    // Negative: [0, 136], Positive: [136, 255]
    const gray = 136; // Mid-gray (#888)

    if (clampedValue >= 0) {
      // Positive: interpolate from gray to white
      const t = clampedValue / 3; // [0, 1]
      const brightness = Math.round(gray + t * (255 - gray));
      const hex = brightness.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    } else {
      // Negative: interpolate from black to gray
      const t = (clampedValue + 3) / 3; // [0, 1]
      const brightness = Math.round(t * gray);
      const hex = brightness.toString(16).padStart(2, '0');
      return `#${hex}${hex}${hex}`;
    }
  }

  // Helper: Get activation function color (uses centralized colors from types.ts)
  private getActivationColor(activationType: string): string {
    return ACTIVATION_COLORS[activationType as keyof typeof ACTIVATION_COLORS] || '#888';
  }

  // Helper: Get input modification color (uses centralized colors from types.ts)
  private getInputColor(): string {
    return INPUT_COLORS[this.inputModification];
  }

  // Render car on canvas
  render(ctx: CanvasRenderingContext2D, showRays: boolean = false, vizMode: CarVizMode = 'simple'): void {
    // Find the config for this car type by shortName (check all defined configs)
    const config = CAR_BRAIN_CONFIGS_DEFINED.find(
      (c) => c.shortName === this.configShortName
    );

    if (!config) {
      console.error(
        'No config found for car with shortName =',
        this.configShortName
      );
      return;
    }

    // Render rays if requested and car is alive
    if (showRays && this.alive) {
      // Render centerline ray (showing distance from car to track center)
      if (this.lastCenterlinePoint) {
        const rayColor = config.colors.light;
        const hitColor = CONFIG.sensors.visualization.centerlineHitColor;
        const lineWidth = CONFIG.sensors.visualization.rayWidth;
        const hitRadius = CONFIG.sensors.visualization.hitRadius;

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

      // Use colors and settings from config
      const rayColor = config.colors.light;
      const hitColor = config.colors.light;
      const lineWidth = CONFIG.sensors.visualization.rayWidth;
      const hitRadius = CONFIG.sensors.visualization.hitRadius;

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
    if (CONFIG.visualization.showCarPercentages) {
      const percentage = this.currentProgressRatio * 100;
      const sign = percentage >= 0 ? '+' : '-';
      const absValue = Math.abs(percentage);
      const formatted = absValue.toFixed(1).padStart(4, ' '); // "XX.X" format
      ctx.save();
      ctx.fillStyle = this.alive ? CONFIG.car.colors.labelAlive : CONFIG.car.colors.labelDead;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        `${sign}${formatted}%`,
        this.x,
        this.y - (this.height * this.sizeMultiplier) / 2 - 6
      );
      ctx.restore();
    }

    // ========================================================================
    // ALWAYS RENDER SMALL CAR (the physical car)
    // ========================================================================
    ctx.save();
    ctx.translate(this.x, this.y);
    // Rotate by angle - 90° so visual front matches physics heading
    // (angle=0 in physics = moving right, so visual should point right)
    ctx.rotate(this.angle - Math.PI / 2);

    // Small car dimensions (the actual physical car)
    const smallWidth = this.width * this.sizeMultiplier;
    const smallHeight = this.height * this.sizeMultiplier;

    // Simple rectangle with car type color
    ctx.fillStyle = this.alive ? this.color : CONFIG.car.colors.bodyDead;
    ctx.fillRect(
      -smallWidth / 2,
      -smallHeight / 2,
      smallWidth,
      smallHeight
    );

    // Draw border
    ctx.strokeStyle = this.alive ? this.color : CONFIG.car.colors.bodyDeadStroke;
    ctx.lineWidth = CONFIG.car.dimensions.simple.borderWidth;
    ctx.strokeRect(
      -smallWidth / 2,
      -smallHeight / 2,
      smallWidth,
      smallHeight
    );

    // Draw windshield
    ctx.fillStyle = this.alive ? CONFIG.car.colors.directionIndicatorAlive : CONFIG.car.colors.directionIndicatorDead;
    const windshieldHeight = 4;
    const windshieldY = smallHeight / 2 - windshieldHeight;
    ctx.fillRect(-smallWidth / 4, windshieldY, smallWidth / 2, windshieldHeight);

    ctx.restore();

    // ========================================================================
    // If SIMPLE mode, we're done
    // ========================================================================
    if (vizMode === 'simple') {
      return;
    }

    // ========================================================================
    // DETAILED MODE: Draw neural network visualization overlay on top
    // ========================================================================
    // This is purely visual and doesn't affect physics/collision
    if (!this.alive) {
      return; // Don't show detailed view for dead cars
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle - Math.PI / 2);

    // Use large dimensions for detailed visualization
    const detailedWidth = CONFIG.car.dimensions.detailed.width * this.sizeMultiplier;
    const detailedHeight = CONFIG.car.dimensions.detailed.height * this.sizeMultiplier;

    // GET CAR NEURAL NETWORK STRUCTURE
    // This is the ONLY source of truth for rendering
    // Structure: { inputType, hiddenLayers[], outputLayer, color }
    // Each neuron has: { weights[], bias, activation }
    const carNetwork: CarNeuralNetwork = this.brain.toCarNetwork(this.inputModification, this.color);

    // ========================================================================
    // CALCULATE EQUAL PARTITIONS FOR ALL SECTIONS
    // ========================================================================
    // Sections (front to back):
    // 1. Input type (carNetwork.inputType)
    // 2. Hidden layer 1 (carNetwork.hiddenLayers[0].neurons[])
    // 3. Hidden layer 2 (carNetwork.hiddenLayers[1].neurons[]) - if exists
    // ...
    // N. Output layer (carNetwork.outputLayer.neuron)
    const numHiddenLayers = carNetwork.hiddenLayers.length;
    const totalSections = 1 + numHiddenLayers + 1; // input + hidden layers + output
    const sectionHeight = detailedHeight / totalSections; // Equal partitions

    let currentSectionIdx = 0;

    // ========================================================================
    // SECTION 0: INPUT TYPE (from carNetwork.inputType)
    // ========================================================================
    {
      const sectionTop = detailedHeight / 2 - currentSectionIdx * sectionHeight;
      const sectionBottom = sectionTop - sectionHeight;

      // Draw input type color background
      ctx.fillStyle = this.alive ? this.getInputColor() : CONFIG.car.colors.bodyDead;
      ctx.fillRect(
        -detailedWidth / 2,
        sectionBottom,
        detailedWidth,
        sectionHeight
      );

      // Draw section border
      ctx.strokeStyle = this.alive ? CONFIG.car.colors.bodyAliveStroke : CONFIG.car.colors.bodyDeadStroke;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(
        -detailedWidth / 2,
        sectionBottom,
        detailedWidth,
        sectionHeight
      );

      currentSectionIdx++;
    }

    // ========================================================================
    // SECTIONS 1 to N: HIDDEN LAYERS (from carNetwork.hiddenLayers[])
    // ========================================================================
    // Each hidden layer contains neurons with their OWN activation functions
    for (let hiddenLayerIdx = 0; hiddenLayerIdx < numHiddenLayers; hiddenLayerIdx++) {
      const sectionTop = detailedHeight / 2 - currentSectionIdx * sectionHeight;
      const sectionBottom = sectionTop - sectionHeight;

      // Get this hidden layer's neurons from carNetwork
      const hiddenLayer = carNetwork.hiddenLayers[hiddenLayerIdx];
      const neurons = hiddenLayer.neurons;
      const numNeurons = neurons.length;
      const neuronWidth = detailedWidth / numNeurons;

      // Render each neuron in this hidden layer (left to right)
      for (let neuronIdx = 0; neuronIdx < numNeurons; neuronIdx++) {
        const neuronLeft = -detailedWidth / 2 + neuronIdx * neuronWidth;

        // Get THIS neuron's data (weights, bias, activation) from carNetwork
        const neuron = neurons[neuronIdx];

        // Fill neuron background
        ctx.fillStyle = this.alive ? '#444' : CONFIG.car.colors.bodyDead;
        ctx.fillRect(
          neuronLeft,
          sectionBottom,
          neuronWidth,
          sectionHeight
        );

        // Draw neuron contents: weights -> bias -> activation (only if alive)
        if (this.alive) {
          // Read directly from THIS neuron (no top-level activation)
          const weights = neuron.weights;
          const bias = neuron.bias;
          const activation = neuron.activation; // Per-neuron activation
          const numWeights = weights.length;

          // Divide neuron into 3 EQUAL parts (front to back):
          // 1/3 weights (array of grayscale items) - at FRONT
          // 1/3 bias (single grayscale item) - in MIDDLE
          // 1/3 activation (colorful item) - at BACK
          const thirdHeight = sectionHeight / 3;

          // WEIGHTS (front third - from sectionTop backwards by 1/3)
          const weightsTop = sectionTop - thirdHeight;
          const weightBoxWidth = neuronWidth / numWeights;

          for (let weightIdx = 0; weightIdx < numWeights; weightIdx++) {
            const weight = weights[weightIdx];
            const boxLeft = neuronLeft + weightIdx * weightBoxWidth;

            ctx.fillStyle = this.valueToGrayscale(weight);
            ctx.fillRect(boxLeft, weightsTop, weightBoxWidth, thirdHeight);
          }

          // BIAS (middle third - from sectionTop backwards by 2/3)
          const biasTop = sectionTop - 2 * thirdHeight;
          ctx.fillStyle = this.valueToGrayscale(bias);
          ctx.fillRect(neuronLeft, biasTop, neuronWidth, thirdHeight);

          // ACTIVATION (back third - at sectionBottom)
          const activationTop = sectionBottom;
          ctx.fillStyle = this.getActivationColor(activation);
          ctx.fillRect(neuronLeft, activationTop, neuronWidth, thirdHeight);
        }
      }

      // Draw hidden layer section border
      ctx.strokeStyle = this.alive ? CONFIG.car.colors.bodyAliveStroke : CONFIG.car.colors.bodyDeadStroke;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(
        -detailedWidth / 2,
        sectionBottom,
        detailedWidth,
        sectionHeight
      );

      currentSectionIdx++;
    }

    // ========================================================================
    // LAST SECTION: OUTPUT LAYER (from carNetwork.outputLayer.neuron)
    // ========================================================================
    // Output layer has a SINGLE neuron with its own activation (typically 'linear')
    {
      const sectionTop = detailedHeight / 2 - currentSectionIdx * sectionHeight;
      const sectionBottom = sectionTop - sectionHeight;

      // Get the output neuron from carNetwork
      const outputNeuron = carNetwork.outputLayer.neuron;
      const neuronWidth = detailedWidth; // Single neuron spans full width
      const neuronLeft = -detailedWidth / 2;

      // Fill neuron background
      ctx.fillStyle = this.alive ? '#444' : CONFIG.car.colors.bodyDead;
      ctx.fillRect(
        neuronLeft,
        sectionBottom,
        neuronWidth,
        sectionHeight
      );

      // Draw neuron contents: weights -> bias -> activation (only if alive)
      if (this.alive) {
        // Read directly from the output neuron (no top-level activation)
        const weights = outputNeuron.weights;
        const bias = outputNeuron.bias;
        const activation = outputNeuron.activation; // This neuron's activation
        const numWeights = weights.length;

        // Divide neuron into 3 EQUAL parts (front to back):
        // 1/3 weights (array of grayscale items) - at FRONT
        // 1/3 bias (single grayscale item) - in MIDDLE
        // 1/3 activation (colorful item) - at BACK
        const thirdHeight = sectionHeight / 3;

        // WEIGHTS (front third - from sectionTop backwards by 1/3)
        const weightsTop = sectionTop - thirdHeight;
        const weightBoxWidth = neuronWidth / numWeights;

        for (let weightIdx = 0; weightIdx < numWeights; weightIdx++) {
          const weight = weights[weightIdx];
          const boxLeft = neuronLeft + weightIdx * weightBoxWidth;

          ctx.fillStyle = this.valueToGrayscale(weight);
          ctx.fillRect(boxLeft, weightsTop, weightBoxWidth, thirdHeight);
        }

        // BIAS (middle third - from sectionTop backwards by 2/3)
        const biasTop = sectionTop - 2 * thirdHeight;
        ctx.fillStyle = this.valueToGrayscale(bias);
        ctx.fillRect(neuronLeft, biasTop, neuronWidth, thirdHeight);

        // ACTIVATION (back third - at sectionBottom)
        const activationTop = sectionBottom;
        ctx.fillStyle = this.getActivationColor(activation);
        ctx.fillRect(neuronLeft, activationTop, neuronWidth, thirdHeight);
      }

      // Draw output layer section border
      ctx.strokeStyle = this.alive ? CONFIG.car.colors.bodyAliveStroke : CONFIG.car.colors.bodyDeadStroke;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(
        -detailedWidth / 2,
        sectionBottom,
        detailedWidth,
        sectionHeight
      );
    }

    // Draw overall car border using the car type color
    ctx.strokeStyle = this.alive ? carNetwork.color : CONFIG.car.colors.bodyDeadStroke;
    ctx.lineWidth = CONFIG.car.dimensions.detailed.borderWidth;
    ctx.strokeRect(
      -detailedWidth / 2,
      -detailedHeight / 2,
      detailedWidth,
      detailedHeight
    );

    // Draw windshield (direction indicator) inside the input section
    // Drawn last so it appears on top of everything
    ctx.fillStyle = this.alive ? CONFIG.car.colors.directionIndicatorAlive : CONFIG.car.colors.directionIndicatorDead;
    // Position at the very front edge of the car (top of input section)
    const detailedWindshieldHeight = 4;
    const detailedWindshieldY = detailedHeight / 2 - detailedWindshieldHeight;
    ctx.fillRect(-detailedWidth / 4, detailedWindshieldY, detailedWidth / 2, detailedWindshieldHeight);

    ctx.restore();
  }

  // Get car polygon for collision detection
  getPolygon(): Point[] {
    return createCarPolygon(
      this.x,
      this.y,
      this.angle - Math.PI / 2, // Match visual orientation
      this.width * this.sizeMultiplier,
      this.height * this.sizeMultiplier
    );
  }

  // Clone with a new brain
  clone(newBrain: NeuralNetwork): Car {
    return new Car(
      this.x,
      this.y,
      this.angle,
      newBrain,
      this.color,
      this.inputModification,
      this.configShortName
    );
  }
}
