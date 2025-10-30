<template>
  <div class="simulator">
    <div class="canvas-container">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
      ></canvas>
    </div>

    <div class="info-container">
      <div class="controls">
        <button @click="nextGeneration">SYNC</button>
        <button @click="reset">RESET</button>
        <button
          @click="toggleDieOnBackwards"
          :class="{ active: dieOnBackwards }"
        >
          DIE REV
        </button>
        <button @click="toggleKillSlowCars" :class="{ active: killSlowCars }">
          DIE SLOW
        </button>
        <button
          @click="toggleMutationByDistance"
          :class="{ active: mutationByDistance }"
        >
          MUT DIST
        </button>
      </div>

      <div class="hud">
        <table class="stats-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Gen</th>
              <th>Mutation</th>
              <th>Mean</th>
              <th>Best</th>
              <th>Act</th>
              <th>Input</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="config in sortedCarBrainConfigs"
              :key="config.id"
              :style="{ backgroundColor: config.colors.elite }"
            >
              <td style="font-weight: bold">
                {{ config.displayName }}
              </td>
              <td>
                {{ ga.getGeneration(config.id) }}
              </td>
              <td>
                {{ getAdaptiveMutationRate(config.id) }}
              </td>
              <td>
                {{ getMeanFitnessPercent(config.id) }}
              </td>
              <td>
                {{ getBestFitnessPercent(config.id) }}
              </td>
              <td
                :style="{
                  backgroundColor: getActivationColor(config.nn.activationType),
                }"
              >
                {{ config.nn.activationType }}
              </td>
              <td
                :style="{
                  backgroundColor: getInputColor(config.nn.inputModification),
                }"
              >
                {{ config.nn.inputModification }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';
import { Track } from '@/core/Track';
import { Car } from '@/core/Car';
import { GeneticAlgorithm } from '@/core/GA';
import {
  TRACK_WIDTH_HALF,
  CAR_BRAIN_CONFIGS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GENERATION_MARKER_RADIUS,
  DEFAULT_DIE_ON_BACKWARDS,
  DEFAULT_KILL_SLOW_CARS,
  DEFAULT_MUTATION_BY_DISTANCE,
  type CarBrainConfig,
  InputModificationType,
  ActivationType,
} from '@/config';

const canvasRef = ref<HTMLCanvasElement | null>(null);
// Keep canvas at fixed internal resolution for rendering
const canvasWidth = CANVAS_WIDTH;
const canvasHeight = CANVAS_HEIGHT;

const track = new Track(TRACK_WIDTH_HALF);
// Use truly random seed based on current time and Math.random()
let randomSeed = Date.now() + Math.random() * 1000000;
const ga = ref<GeneticAlgorithm>(new GeneticAlgorithm(randomSeed));

const population = ref<Car[]>([]) as Ref<Car[]>;
const showRays = ref(true);
const speedMultiplier = ref(1);
const dieOnBackwards = ref(DEFAULT_DIE_ON_BACKWARDS);
const killSlowCars = ref(DEFAULT_KILL_SLOW_CARS);
const mutationByDistance = ref(DEFAULT_MUTATION_BY_DISTANCE);

// Dynamic generation tracking for all config types
const generationTimeByConfigId = ref<Map<string, number>>(new Map());
const generationMarkersByConfigId = ref<
  Map<string, { x: number; y: number; generation: number; fitness: number }[]>
>(new Map());

// Initialize tracking maps for all configs
for (const config of CAR_BRAIN_CONFIGS) {
  generationTimeByConfigId.value.set(config.id, 0);
  generationMarkersByConfigId.value.set(config.id, []);
}

let animationFrameId: number | null = null;
const FIXED_DT = 1 / 60; // 60 Hz physics

// Computed property to sort car brain configs by generation (ascending)
const sortedCarBrainConfigs = computed(() => {
  return [...CAR_BRAIN_CONFIGS].sort((a, b) => {
    const genA = ga.value.getGeneration(a.id);
    const genB = ga.value.getGeneration(b.id);
    return genA - genB;
  });
});

// Get background color for activation type
const getActivationColor = (activationType: ActivationType): string => {
  switch (activationType) {
    case 'relu':
      return '#202'; // Blue
    case 'gelu':
      return '#220'; // Green
    case 'linear':
      return '#064'; // Purple
    case 'step':
      return '#342'; // Red
    default:
      throw new Error(`Unknown activation type: ${activationType}`);
  }
};

// Get background color for input modification type
const getInputColor = (inputModification: InputModificationType): string => {
  switch (inputModification) {
    case 'dir':
      return '#403'; // Blue
    case 'pair':
      return '#330'; // Purple
    default:
      throw new Error(`Unknown input modification type: ${inputModification}`);
  }
};

// Format percentage to always be 5 characters: "100.%", "99.3%", "1.34%", "0.34%"
const formatPercentage = (value: number): string => {
  if (value >= 100) {
    return '100.%';
  } else if (value >= 10) {
    return `${value.toFixed(1)}%`;
  } else if (value >= 1) {
    return `${value.toFixed(2)}%`;
  } else {
    return `${value.toFixed(2)}%`;
  }
};

// Generic helper to compute current mutation rate for a config
const getAdaptiveMutationRate = (configId: string): string => {
  const rate = ga.value.getCurrentMutationRate(
    configId,
    mutationByDistance.value
  );
  return rate.toFixed(4); // Just the number for table display
};

// Generic helper to compute mean fitness percentage for a config (average of all generation markers)
const getMeanFitnessPercent = (configId: string): string => {
  const markers = generationMarkersByConfigId.value.get(configId) ?? [];

  if (markers.length === 0) {
    return formatPercentage(0);
  }

  const trackLength = track.getTotalLength();
  const totalFitness = markers.reduce((sum, marker) => sum + marker.fitness, 0);
  const meanFitness = totalFitness / markers.length;

  return formatPercentage((meanFitness / trackLength) * 100);
};

// Generic helper to compute best fitness percentage for a config (max of all generation markers)
const getBestFitnessPercent = (configId: string): string => {
  const markers = generationMarkersByConfigId.value.get(configId) ?? [];

  if (markers.length === 0) {
    return formatPercentage(0);
  }

  const trackLength = track.getTotalLength();
  const bestFitness = Math.max(...markers.map((marker) => marker.fitness));

  return formatPercentage((bestFitness / trackLength) * 100);
};

// Initialize simulation
const init = () => {
  population.value = ga.value.initializePopulation(track);

  // Reset generation times and markers for all configs
  for (const config of CAR_BRAIN_CONFIGS) {
    generationTimeByConfigId.value.set(config.id, 0);
    generationMarkersByConfigId.value.set(config.id, []);
  }
};

// Generic evolution function that works with any car brain config
const evolvePopulationByConfig = (
  config: CarBrainConfig,
  _reason: string,
  winnerCar?: Car
) => {
  // Separate cars by configId (unique identifier)
  const configCars = population.value.filter(
    (car) => car.configId === config.id
  );
  const otherCars = population.value.filter(
    (car) => car.configId !== config.id
  );

  // Find best car for marker
  const sortedCars = [...configCars].sort(
    (a, b) => b.maxDistanceReached - a.maxDistanceReached
  );
  const bestCar = sortedCars[0];

  // Save best position as marker (with fitness)
  if (bestCar) {
    const markers = generationMarkersByConfigId.value.get(config.id) ?? [];
    markers.push({
      x: bestCar.x,
      y: bestCar.y,
      generation: ga.value.getGeneration(config.id),
      fitness: bestCar.maxDistanceReached,
    });
    generationMarkersByConfigId.value.set(config.id, markers);
  }

  // Evolve this population
  const generationTime = generationTimeByConfigId.value.get(config.id) ?? 0;
  const newCars = ga.value.evolvePopulation(
    configCars,
    config,
    track,
    generationTime,
    winnerCar,
    mutationByDistance.value
  );
  generationTimeByConfigId.value.set(config.id, 0);

  // Combine with other car types
  population.value = [...newCars, ...otherCars];
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
        // Find the config for this car type by configId
        const config = CAR_BRAIN_CONFIGS.find((c) => c.id === car.configId);

        if (config) {
          // Kill all cars of same type immediately
          population.value.forEach((c) => {
            if (c.configId === config.id && c !== car) {
              c.alive = false;
              c.speed = 0;
            }
          });

          // Evolve only that car's population type
          evolvePopulationByConfig(config, 'car completed lap', car);
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

  // Update generation times for all config types
  for (const config of CAR_BRAIN_CONFIGS) {
    const currentTime = generationTimeByConfigId.value.get(config.id) ?? 0;
    generationTimeByConfigId.value.set(config.id, currentTime + dt);
  }

  // Check each config population independently for all-dead condition
  for (const config of CAR_BRAIN_CONFIGS) {
    const configCars = population.value.filter((c) => c.configId === config.id);
    const allDead = configCars.every((c) => !c.alive);

    if (allDead && configCars.length > 0) {
      evolvePopulationByConfig(
        config,
        `all ${config.displayName} cars crashed`
      );
    }
  }
};

// Render frame
const render = (ctx: CanvasRenderingContext2D) => {
  // Clear canvas (transparent - background color comes from page)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Render track
  track.render(ctx);

  // Render generation markers dynamically for all configs
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  for (const config of CAR_BRAIN_CONFIGS) {
    const markers = generationMarkersByConfigId.value.get(config.id) ?? [];
    ctx.fillStyle = config.colors.marker;

    for (const marker of markers) {
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, GENERATION_MARKER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(
        marker.generation.toString(),
        marker.x,
        marker.y - GENERATION_MARKER_RADIUS - 2
      );
    }
  }

  // Render cars (dead first, then alive, then elites last)
  const deadCars = population.value.filter((car) => !car.alive);
  const aliveCars = population.value.filter((car) => car.alive);

  // Separate elites (check against all config elite colors)
  const eliteColors = CAR_BRAIN_CONFIGS.map((c) => c.colors.elite);
  const elites = aliveCars.filter((car) => eliteColors.includes(car.color));
  const others = aliveCars.filter((car) => !eliteColors.includes(car.color));

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
  const steps =
    speedMultiplier.value === 1
      ? 1
      : speedMultiplier.value === 2
      ? 2
      : speedMultiplier.value === 4
      ? 4
      : 8;

  for (let i = 0; i < steps; i++) {
    updatePhysics(FIXED_DT);
  }

  // Render at normal rate
  render(ctx);

  animationFrameId = requestAnimationFrame(animate);
};

// Manually trigger next generation for all populations
const nextGeneration = () => {
  for (const config of CAR_BRAIN_CONFIGS) {
    evolvePopulationByConfig(config, 'manual trigger');
  }
};

// Reset the simulation (but keep toggle button states)
const reset = () => {
  // Reset GA state
  ga.value.reset();

  // Re-initialize population with new random seed
  randomSeed = Date.now() + Math.random() * 1000000;
  ga.value = new GeneticAlgorithm(randomSeed);
  population.value = ga.value.initializePopulation(track);

  // Clear generation times and markers for all configs
  for (const config of CAR_BRAIN_CONFIGS) {
    generationTimeByConfigId.value.set(config.id, 0);
    generationMarkersByConfigId.value.set(config.id, []);
  }
};

// Toggle Kill Backwards mode
const toggleDieOnBackwards = () => {
  dieOnBackwards.value = !dieOnBackwards.value;
};

// Toggle Kill Slow mode
const toggleKillSlowCars = () => {
  killSlowCars.value = !killSlowCars.value;
};

// Toggle Mutation by Distance mode
const toggleMutationByDistance = () => {
  mutationByDistance.value = !mutationByDistance.value;
};

// Lifecycle
onMounted(() => {
  init();
  animationFrameId = requestAnimationFrame(animate);
});

onUnmounted(() => {
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

.canvas-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 100vw;
  flex-shrink: 1;
  padding: 8px;
  box-sizing: border-box;
}

canvas {
  display: block;
  max-width: 100%;
  max-height: calc(
    100vh - 280px
  ); /* Reserve more space for controls and table */
  width: auto;
  height: auto;
  object-fit: contain;
  margin: 0;
  padding: 0;
  /* Use CSS to scale the canvas display size while keeping internal resolution at 800x600 */
  image-rendering: auto;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

/* Desktop: ensure canvas fits within viewport */
@media (min-width: 769px) {
  .canvas-container {
    max-height: calc(100vh - 220px);
  }

  canvas {
    max-height: calc(100vh - 240px);
  }
}

.info-container {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: center;
  padding: 8px 16px;
  width: 100%;
  max-width: 1200px;
}

.controls {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
}

.hud {
  display: flex;
  justify-content: center;
  margin: 0;
}

.stats-table {
  border-collapse: collapse;
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 14px;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.stats-table th {
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 4px 6px;
  text-align: left;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.stats-table td {
  padding: 4px 6px;
  color: #ffffff;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-table tbody tr {
  color: #ffffff;
}

.stats-table tbody tr:last-child td {
  border-bottom: none;
}

.stats-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Mobile layout: Table on top, buttons below */
@media (max-width: 768px) {
  .info-container {
    flex-direction: column-reverse;
    gap: 16px;
    padding: 6px 12px;
  }

  .controls {
    grid-template-columns: repeat(2, 1fr);
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .hud {
    width: 100%;
  }

  .stats-table {
    font-size: 12px;
    width: 100%;
  }

  .stats-table th,
  .stats-table td {
    padding: 3px 5px;
  }

  .stats-table th {
    font-size: 8px;
    letter-spacing: 0.2px;
  }

  .simulator {
    gap: 6px;
  }
}

button {
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 14px;
  font-weight: bold;
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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  background: #e5e7eb;
  border-color: #6b7280;
}

/* SYNC and RESET buttons (first two) - flash green when pressed */
button:nth-child(1):active,
button:nth-child(2):active {
  transform: translateY(0);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  background: #10b981;
  color: #ffffff;
  border-color: #059669;
}

/* Toggle buttons - active state (green) */
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

/* Toggle buttons - inactive state (red) */
button:nth-child(3):not(.active),
button:nth-child(4):not(.active),
button:nth-child(5):not(.active) {
  background: #ef4444;
  color: #ffffff;
  border-color: #dc2626;
}

button:not(.active):nth-child(3):hover,
button:not(.active):nth-child(4):hover,
button:not(.active):nth-child(5):hover {
  background: #dc2626;
  border-color: #b91c1c;
}

button:not(.active):nth-child(3):active,
button:not(.active):nth-child(4):active,
button:not(.active):nth-child(5):active {
  background: #b91c1c;
}
</style>
