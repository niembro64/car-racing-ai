<template>
  <div class="simulator">
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      :style="{ width: displayWidth + 'px', height: displayHeight + 'px' }"
    ></canvas>

    <div class="hud">
      <div class="stat" :style="{ color: NORMAL_ELITE_CAR_COLOR }">N-GEN: {{ ga.generationNormal }}</div>
      <div class="stat" :style="{ color: DIFF_ELITE_CAR_COLOR }">D-GEN: {{ ga.generationDiff }}</div>
      <div class="stat">{{ adaptiveMutationRateNormal }}</div>
      <div class="stat">{{ adaptiveMutationRateDiff }}</div>
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
const generationTimeNormal = ref(0);
const generationTimeDiff = ref(0);
const generationMarkersNormal = ref<{ x: number; y: number; generation: number }[]>([]);
const generationMarkersDiff = ref<{ x: number; y: number; generation: number }[]>([]);
const dieOnBackwards = ref(DEFAULT_DIE_ON_BACKWARDS);
const killSlowCars = ref(DEFAULT_KILL_SLOW_CARS);

let animationFrameId: number | null = null;
const FIXED_DT = 1 / 60; // 60 Hz physics

const adaptiveMutationRateNormal = computed(() => {
  const minGenerationTime = 1.0;
  const effectiveTime = Math.max(generationTimeNormal.value, minGenerationTime);
  const rate = GA_MUTATION_RATE / effectiveTime;
  const formatted = rate.toFixed(4).padStart(6, ' '); // "X.XXXX" format
  return `σN=${formatted}`;
});

const adaptiveMutationRateDiff = computed(() => {
  const minGenerationTime = 1.0;
  const effectiveTime = Math.max(generationTimeDiff.value, minGenerationTime);
  const rate = GA_MUTATION_RATE / effectiveTime;
  const formatted = rate.toFixed(4).padStart(6, ' '); // "X.XXXX" format
  return `σD=${formatted}`;
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
  generationTimeNormal.value = 0;
  generationTimeDiff.value = 0;
  generationMarkersNormal.value = [];
  generationMarkersDiff.value = [];
};

// Evolve normal population independently
const evolveNormalPopulation = (reason: string, winnerCar?: Car) => {
  const normalCars = population.value.filter(car => !car.useDifferentialInputs);
  const diffCars = population.value.filter(car => car.useDifferentialInputs);

  // Find best normal car for marker
  const sortedNormal = [...normalCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);
  const bestNormal = sortedNormal[0];

  // Save best position as marker
  if (bestNormal) {
    generationMarkersNormal.value.push({ x: bestNormal.x, y: bestNormal.y, generation: ga.value.generationNormal });
  }

  // Evolve normal population
  const newNormalCars = ga.value.evolveNormalPopulation(normalCars, track, generationTimeNormal.value, winnerCar);
  generationTimeNormal.value = 0;

  // Combine with existing diff cars
  population.value = [...newNormalCars, ...diffCars];
};

// Evolve diff population independently
const evolveDiffPopulation = (reason: string, winnerCar?: Car) => {
  const normalCars = population.value.filter(car => !car.useDifferentialInputs);
  const diffCars = population.value.filter(car => car.useDifferentialInputs);

  // Find best diff car for marker
  const sortedDiff = [...diffCars].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);
  const bestDiff = sortedDiff[0];

  // Save best position as marker
  if (bestDiff) {
    generationMarkersDiff.value.push({ x: bestDiff.x, y: bestDiff.y, generation: ga.value.generationDiff });
  }

  // Evolve diff population
  const newDiffCars = ga.value.evolveDiffPopulation(diffCars, track, generationTimeDiff.value, winnerCar);
  generationTimeDiff.value = 0;

  // Combine with existing normal cars
  population.value = [...normalCars, ...newDiffCars];
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
        const sameType = car.useDifferentialInputs;

        // Kill all cars of same type immediately
        population.value.forEach(c => {
          if (c.useDifferentialInputs === sameType && c !== car) {
            c.alive = false;
            c.speed = 0;
          }
        });

        // Evolve only that car's population type
        if (sameType) {
          evolveDiffPopulation('car completed lap', car);
        } else {
          evolveNormalPopulation('car completed lap', car);
        }
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

  // Update generation times for both populations
  generationTimeNormal.value += dt;
  generationTimeDiff.value += dt;

  // Check each population independently for all-dead condition
  const normalCars = population.value.filter(c => !c.useDifferentialInputs);
  const diffCars = population.value.filter(c => c.useDifferentialInputs);

  const allNormalDead = normalCars.every(c => !c.alive);
  const allDiffDead = diffCars.every(c => !c.alive);

  if (allNormalDead && normalCars.length > 0) {
    evolveNormalPopulation('all normal cars crashed');
  }

  if (allDiffDead && diffCars.length > 0) {
    evolveDiffPopulation('all diff cars crashed');
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

// Manually trigger next generation for both populations
const nextGeneration = () => {
  evolveNormalPopulation('manual trigger');
  evolveDiffPopulation('manual trigger');
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
