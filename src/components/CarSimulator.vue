<template>
  <div class="simulator">
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
    ></canvas>

    <div class="hud">
      <div class="stat">GEN: {{ ga.generation }}</div>
      <div class="stat">{{ adaptiveMutationRate }}</div>
      <div class="stat" :style="{ color: NORMAL_ELITE_CAR_COLOR }">NORMAL: {{ normalBestPercent }}%</div>
      <div class="stat" :style="{ color: DIFF_ELITE_CAR_COLOR }">DIFF: {{ diffBestPercent }}%</div>
    </div>

    <div class="controls">
      <button @click="nextGeneration">NEXT GEN</button>
      <button @click="reset">RESET</button>
      <button @click="toggleDieOnBackwards" :class="{ active: dieOnBackwards }">
        KILL BACK: {{ dieOnBackwards ? 'ON' : 'OFF' }}
      </button>
      <button @click="toggleKillSlowCars" :class="{ active: killSlowCars }">
        KILL SLOW: {{ killSlowCars ? 'ON' : 'OFF' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue';
import { Track } from '@/core/Track';
import { Car } from '@/core/Car';
import { GeneticAlgorithm } from '@/core/GA';
import { TRACK_WIDTH_HALF, GA_MUTATION_RATE, NORMAL_ELITE_CAR_COLOR, DIFF_ELITE_CAR_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT, NORMAL_MARKER_COLOR, DIFF_MARKER_COLOR, GENERATION_MARKER_RADIUS, DEFAULT_DIE_ON_BACKWARDS, DEFAULT_KILL_SLOW_CARS } from '@/config';

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
let randomSeed = Date.now() + Math.random() * 1000000;
const ga = ref<GeneticAlgorithm>(new GeneticAlgorithm(randomSeed));

const population = ref<Car[]>([]) as Ref<Car[]>;
const showRays = ref(true);
const speedMultiplier = ref(1);
const generationTime = ref(0);
const generationMarkersNormal = ref<{ x: number; y: number; generation: number }[]>([]);
const generationMarkersDiff = ref<{ x: number; y: number; generation: number }[]>([]);
const dieOnBackwards = ref(DEFAULT_DIE_ON_BACKWARDS);
const killSlowCars = ref(DEFAULT_KILL_SLOW_CARS);

let animationFrameId: number | null = null;
const FIXED_DT = 1 / 60; // 60 Hz physics

const adaptiveMutationRate = computed(() => {
  const minGenerationTime = 1.0;
  const effectiveTime = Math.max(generationTime.value, minGenerationTime);
  const rate = GA_MUTATION_RATE / effectiveTime;
  const formatted = rate.toFixed(4).padStart(6, ' '); // "X.XXXX" format
  return `σ=${formatted}`;
});

const normalBestPercent = computed(() => {
  const trackLength = track.getTotalLength();
  return ((ga.value.bestFitnessNormal / trackLength) * 100).toFixed(1);
});

const diffBestPercent = computed(() => {
  const trackLength = track.getTotalLength();
  return ((ga.value.bestFitnessDiff / trackLength) * 100).toFixed(1);
});

// Initialize simulation
const init = () => {
  population.value = ga.value.initializePopulation(track);
  generationTime.value = 0;
  generationMarkersNormal.value = [];
  generationMarkersDiff.value = [];
};

// Evolve to next generation (can be called manually or automatically)
const evolveToNextGeneration = (reason: string, winnerCar?: Car) => {
  // Separate cars by type and find best of each
  const normalCars = population.value.filter(car => !car.useDifferentialInputs);
  const diffCars = population.value.filter(car => car.useDifferentialInputs);

  const sortedNormal = [...normalCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);
  const sortedDiff = [...diffCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);

  const bestNormal = sortedNormal[0];
  const bestDiff = sortedDiff[0];

  // Save best positions as markers
  if (bestNormal) {
    generationMarkersNormal.value.push({ x: bestNormal.x, y: bestNormal.y, generation: ga.value.generation });
  }
  if (bestDiff) {
    generationMarkersDiff.value.push({ x: bestDiff.x, y: bestDiff.y, generation: ga.value.generation });
  }

  // Evolve to next generation (pass generation time for adaptive mutation rate)
  population.value = ga.value.evolvePopulation(population.value, track, generationTime.value, winnerCar);
  generationTime.value = 0;
};

// Update physics
const updatePhysics = (dt: number) => {
  const trackLength = track.getTotalLength();

  for (const car of population.value) {
    if (car.alive) {
      car.update(dt, track.wallSegments, track);

      // Update fitness and check for backwards movement
      const result = track.getClosestPointOnCenterline({ x: car.x, y: car.y });
      car.fitness = result.distance;
      car.updateSignedFitness(result.distance, trackLength);

      // Check if car completed a lap (reached 100% progress)
      if (car.currentProgressRatio >= 1.0) {
        // Kill all other cars immediately
        population.value.forEach(c => {
          if (c !== car) {
            c.alive = false;
            c.speed = 0;
          }
        });

        // Evolve to next generation immediately using winner's brain
        evolveToNextGeneration('car completed lap', car);
        return; // Stop processing this frame
      }

      // Kill car if it has gone backwards (when Kill Backwards is enabled)
      if (dieOnBackwards.value && car.alive && car.hasGoneBackwards()) {
        car.alive = false;
        car.speed = 0;
      }

      // Kill car if it hasn't made minimum progress after 1 second (when Kill Slow is enabled)
      if (killSlowCars.value && car.alive && car.hasFailedMinimumProgress()) {
        car.alive = false;
        car.speed = 0;
      }
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

  // Render generation markers (blue for normal, red for diff)
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Render normal car markers (blue)
  ctx.fillStyle = NORMAL_MARKER_COLOR;
  for (const marker of generationMarkersNormal.value) {
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, GENERATION_MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(marker.generation.toString(), marker.x, marker.y - GENERATION_MARKER_RADIUS - 2);
  }

  // Render diff car markers (red)
  ctx.fillStyle = DIFF_MARKER_COLOR;
  for (const marker of generationMarkersDiff.value) {
    ctx.beginPath();
    ctx.arc(marker.x, marker.y, GENERATION_MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(marker.generation.toString(), marker.x, marker.y - GENERATION_MARKER_RADIUS - 2);
  }

  // Render cars (dead first, then alive, then elites last)
  const deadCars = population.value.filter(car => !car.alive);
  const aliveCars = population.value.filter(car => car.alive);

  // Separate elites (both normal and diff)
  const elites = aliveCars.filter(car => car.color === NORMAL_ELITE_CAR_COLOR || car.color === DIFF_ELITE_CAR_COLOR);
  const others = aliveCars.filter(car => car.color !== NORMAL_ELITE_CAR_COLOR && car.color !== DIFF_ELITE_CAR_COLOR);

  // Render dead cars first
  for (const car of deadCars) {
    car.render(ctx, false);
  }

  // Render other alive cars
  for (const car of others) {
    car.render(ctx, showRays.value);
  }

  // Render elites last (on top) with rays if enabled
  for (const car of elites) {
    car.render(ctx, showRays.value);
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

// Toggle Kill Backwards mode
const toggleDieOnBackwards = () => {
  dieOnBackwards.value = !dieOnBackwards.value;
};

// Toggle Kill Slow mode
const toggleKillSlowCars = () => {
  killSlowCars.value = !killSlowCars.value;
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
  background: #d1d5db;
  color: #000000;
  border: 2px solid #9ca3af;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  background: #e5e7eb;
  border-color: #6b7280;
}

button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background: #c0c4c9;
}

button.active {
  background: #10b981;
  color: #ffffff;
  border-color: #059669;
}

button.active:hover {
  background: #059669;
  border-color: #047857;
}

button.active:active {
  background: #047857;
}

@media (max-width: 640px) {
  button {
    padding: 14px 28px;
    font-size: 16px;
  }
}
</style>
