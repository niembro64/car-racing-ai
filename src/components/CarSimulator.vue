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
      <div class="stat">Inputs: {{ useDifferentialInputs ? 'Differential (5)' : 'Standard (9)' }}</div>
    </div>

    <div class="controls">
      <button @click="nextGeneration">Next Generation</button>
      <button @click="reset">Reset</button>
      <button @click="toggleDieOnBackwards" :class="{ active: dieOnBackwards }">
        Kill Backwards: {{ dieOnBackwards ? ' ON' : 'OFF' }}
      </button>
      <button @click="toggleKillSlowCars" :class="{ active: killSlowCars }">
        Kill Slow: {{ killSlowCars ? ' ON' : 'OFF' }}
      </button>
      <button @click="toggleDifferentialInputs" :class="{ active: useDifferentialInputs }">
        Differential Inputs: {{ useDifferentialInputs ? ' ON' : 'OFF' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue';
import { Track } from '@/core/Track';
import { Car } from '@/core/Car';
import { GeneticAlgorithm } from '@/core/GA';
import { TRACK_WIDTH_HALF, GA_MUTATION_RATE, ELITE_CAR_COLOR, CANVAS_WIDTH, CANVAS_HEIGHT, GENERATION_MARKER_COLOR, GENERATION_MARKER_RADIUS, DEFAULT_DIE_ON_BACKWARDS, DEFAULT_KILL_SLOW_CARS, DEFAULT_DIFFERENTIAL_INPUTS } from '@/config';

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
const useDifferentialInputs = ref(DEFAULT_DIFFERENTIAL_INPUTS);
let randomSeed = Date.now() + Math.random() * 1000000;
const ga = ref<GeneticAlgorithm>(new GeneticAlgorithm(randomSeed, useDifferentialInputs.value));

const population = ref<Car[]>([]) as Ref<Car[]>;
const showRays = ref(true);
const speedMultiplier = ref(1);
const generationTime = ref(0);
const generationMarkers = ref<{ x: number; y: number; generation: number }[]>([]);
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

// Initialize simulation
const init = () => {
  population.value = ga.value.initializePopulation(track);
  generationTime.value = 0;
  generationMarkers.value = [];
};

// Evolve to next generation (can be called manually or automatically)
const evolveToNextGeneration = (reason: string, winnerCar?: Car) => {
  const aliveCarCount = population.value.filter(car => car.alive).length;
  console.log(`Generation ended: ${reason}. ${aliveCarCount}/${population.value.length} cars alive. Time: ${generationTime.value.toFixed(2)}s`);

  // Find the best car (by maxDistanceReached) and save its position
  const sortedCars = [...population.value].sort((a, b) => b.maxDistanceReached - a.maxDistanceReached);
  const bestCar = winnerCar || sortedCars[0];
  generationMarkers.value.push({ x: bestCar.x, y: bestCar.y, generation: ga.value.generation });

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
        const isElite = car.color === ELITE_CAR_COLOR;
        console.log(`🏁 ${isElite ? 'ELITE' : 'NORMAL'} CAR FINISHED LAP! Progress: ${(car.currentProgressRatio * 100).toFixed(1)}%`);

        // Log all cars' progress for debugging
        console.log('All cars progress at finish:', population.value.map((c, i) => ({
          index: i,
          elite: c.color === ELITE_CAR_COLOR,
          alive: c.alive,
          progress: (c.currentProgressRatio * 100).toFixed(1) + '%'
        })));

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

  // Render cars (dead first, then alive, then elite last)
  const deadCars = population.value.filter(car => !car.alive);
  const aliveCars = population.value.filter(car => car.alive);

  // Separate elite (lead car)
  const elite = aliveCars.find(car => car.color === ELITE_CAR_COLOR);
  const others = aliveCars.filter(car => car.color !== ELITE_CAR_COLOR);

  // Render dead cars first
  for (const car of deadCars) {
    car.render(ctx, false);
  }

  // Render other alive cars
  for (const car of others) {
    car.render(ctx, showRays.value);
  }

  // Render elite last (on top) with rays if enabled
  if (elite) {
    elite.render(ctx, showRays.value);
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

// Toggle differential inputs mode (completely resets simulation)
const toggleDifferentialInputs = () => {
  useDifferentialInputs.value = !useDifferentialInputs.value;

  // Complete reset: new GA instance with new architecture
  randomSeed = Date.now() + Math.random() * 1000000;
  ga.value = new GeneticAlgorithm(randomSeed, useDifferentialInputs.value);

  // Reset all state
  generationMarkers.value = [];
  generationTime.value = 0;

  // Initialize new population
  init();

  console.log(`Switched to ${useDifferentialInputs.value ? 'differential' : 'standard'} input mode`);
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
