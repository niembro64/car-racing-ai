<template>
  <div class="simulator">
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
    ></canvas>

    <div class="hud">
      <div class="stat">Generation: {{ ga.generation }}</div>
      <div class="stat">{{ adaptiveMutationRate }}</div>
    </div>

    <div class="controls">
      <button @click="nextGeneration" class="next-gen-btn">Next Generation</button>
      <button @click="reset" class="reset-btn">Reset</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue';
import { Track } from '@/core/Track';
import { Car } from '@/core/Car';
import { GeneticAlgorithm } from '@/core/GA';
import { TRACK_WIDTH_HALF, GA_MUTATION_RATE, ELITE_CAR_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT, GENERATION_MARKER_COLOR, GENERATION_MARKER_RADIUS } from '@/config';

const canvasRef = ref<HTMLCanvasElement | null>(null);
// Keep canvas at fixed internal resolution for rendering
const canvasWidth = CANVAS_WIDTH;
const canvasHeight = CANVAS_HEIGHT;

// Calculate CSS display dimensions
const displayWidth = ref(CANVAS_WIDTH);
const displayHeight = ref(CANVAS_HEIGHT);

const updateCanvasDimensions = () => {
  // Reserve space for HUD (approximately 60px) and controls (approximately 70px)
  const reservedHeight = 130;

  const maxWidth = window.innerWidth;
  const maxHeight = window.innerHeight - reservedHeight;

  // Maintain 4:3 aspect ratio (800:600)
  const aspectRatio = 4 / 3;

  if (maxWidth / maxHeight > aspectRatio) {
    // Height is the limiting factor
    displayHeight.value = maxHeight;
    displayWidth.value = Math.floor(maxHeight * aspectRatio);
  } else {
    // Width is the limiting factor
    displayWidth.value = maxWidth;
    displayHeight.value = Math.floor(maxWidth / aspectRatio);
  }
};

const track = new Track(TRACK_WIDTH_HALF);
// Use truly random seed based on current time and Math.random()
const randomSeed = Date.now() + Math.random() * 1000000;
const ga = new GeneticAlgorithm(randomSeed);

const population = ref<Car[]>([]) as Ref<Car[]>;
const showRays = ref(true);
const speedMultiplier = ref(1);
const generationTime = ref(0);
const generationMarkers = ref<{ x: number; y: number; generation: number }[]>([]);

let animationFrameId: number | null = null;
const FIXED_DT = 1 / 60; // 60 Hz physics

const adaptiveMutationRate = computed(() => {
  const minGenerationTime = 1.0;
  const effectiveTime = Math.max(generationTime.value, minGenerationTime);
  const rate = GA_MUTATION_RATE / effectiveTime;
  const formatted = rate.toFixed(4).padStart(6, ' '); // "X.XXXX" format
  return `σ=${formatted}`;
});

// Initialize simulation
const init = () => {
  population.value = ga.initializePopulation(track);
  generationTime.value = 0;
  generationMarkers.value = [];
};

// Evolve to next generation (can be called manually or automatically)
const evolveToNextGeneration = (reason: string) => {
  const aliveCarCount = population.value.filter(car => car.alive).length;
  console.log(`Generation ended: ${reason}. ${aliveCarCount}/${population.value.length} cars alive. Time: ${generationTime.value.toFixed(2)}s`);

  // Find the best car (by maxDistanceReached) and save its position
  const sortedCars = [...population.value].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);
  const bestCar = sortedCars[0];
  generationMarkers.value.push({ x: bestCar.x, y: bestCar.y, generation: ga.generation });

  // Evolve to next generation (pass generation time for adaptive mutation rate)
  population.value = ga.evolvePopulation(population.value, track, generationTime.value);
  generationTime.value = 0;
};

// Update physics
const updatePhysics = (dt: number) => {
  for (const car of population.value) {
    if (car.alive) {
      car.update(dt, track.wallSegments);
    }
  }

  generationTime.value += dt;

  // Check if all cars have crashed - if so, automatically evolve to next generation
  const allDead = population.value.every(car => !car.alive);
  if (allDead) {
    evolveToNextGeneration('all cars crashed');
  }
};

// Render frame
const render = (ctx: CanvasRenderingContext2D) => {
  // Clear canvas (transparent - background color comes from page)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Render track
  track.render(ctx);

  // Render generation markers (red dots showing best car position from each generation)
  ctx.fillStyle = GENERATION_MARKER_COLOR;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  for (const marker of generationMarkers.value) {
    // Draw the dot
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, GENERATION_MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw the generation number above the dot
    ctx.fillText(marker.generation.toString(), marker.x, marker.y - GENERATION_MARKER_RADIUS - 2);
  }

  // Update fitness for all cars before rendering (for percentage display)
  const trackLength = track.getTotalLength();
  const carCenterlinePoints = new Map<any, { x: number; y: number }>();

  for (const car of population.value) {
    const result = track.getClosestPointOnCenterline({ x: car.x, y: car.y });
    car.fitness = result.distance;
    car.updateSignedFitness(result.distance, trackLength);
    carCenterlinePoints.set(car, result.point);
  }

  // Render cars (dead first, then alive, then elite last)
  const deadCars = population.value.filter(car => !car.alive);
  const aliveCars = population.value.filter(car => car.alive);

  // Separate elite (lead car)
  const elite = aliveCars.find(car => car.color === ELITE_CAR_COLOR);
  const others = aliveCars.filter(car => car.color !== ELITE_CAR_COLOR);

  // Render dead cars first
  for (const car of deadCars) {
    car.render(ctx, false, trackLength, carCenterlinePoints.get(car));
  }

  // Render other alive cars
  for (const car of others) {
    car.render(ctx, showRays.value, trackLength, carCenterlinePoints.get(car));
  }

  // Render elite last (on top) with rays if enabled
  if (elite) {
    elite.render(ctx, showRays.value, trackLength, carCenterlinePoints.get(elite));
  }
};

// Main animation loop
const animate = () => {
  const ctx = canvasRef.value?.getContext('2d');
  if (!ctx) return;

  // Run multiple physics steps for fast-forward
  const steps = speedMultiplier.value === 1 ? 1 : speedMultiplier.value === 2 ? 2 : speedMultiplier.value === 4 ? 4 : 8;

  for (let i = 0; i < steps; i++) {
    updatePhysics(FIXED_DT);
  }

  // Render at normal rate
  render(ctx);

  animationFrameId = requestAnimationFrame(animate);
};

// Manually trigger next generation
const nextGeneration = () => {
  evolveToNextGeneration('manual trigger');
};

// Reset the simulation by reloading the page
const reset = () => {
  window.location.reload();
};

// Lifecycle
onMounted(() => {
  updateCanvasDimensions();
  window.addEventListener('resize', updateCanvasDimensions);
  init();
  animationFrameId = requestAnimationFrame(animate);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasDimensions);
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.simulator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0;
  margin: 0;
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #4a7c4e; /* Grass green background */
}

canvas {
  display: block;
  margin: 0;
  padding: 0;
  /* Use CSS to scale the canvas display size while keeping internal resolution at 800x600 */
  image-rendering: auto;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

.hud {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  color: #ffffff;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  padding: 8px 16px;
  margin: 0;
}

.stat {
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

@media (max-width: 640px) {
  .simulator {
    gap: 6px;
  }

  .hud {
    font-size: 12px;
    gap: 12px;
    padding: 6px 12px;
  }
}

.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin: 0;
  padding: 0;
}

button {
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  touch-action: manipulation;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  margin: 0;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.next-gen-btn {
  background: #d1d5db;
  color: #000000;
  border: 2px solid #9ca3af;
}

.next-gen-btn:hover {
  background: #e5e7eb;
  color: #000000;
  border-color: #6b7280;
}

.next-gen-btn:active {
  background: #c0c4c9;
}

.reset-btn {
  background: #d1d5db;
  color: #000000;
  border: 2px solid #9ca3af;
}

.reset-btn:hover {
  background: #e5e7eb;
  color: #000000;
  border-color: #6b7280;
}

.reset-btn:active {
  background: #c0c4c9;
}

@media (max-width: 640px) {
  button {
    padding: 14px 28px;
    font-size: 16px;
  }
}
</style>
