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
        <button @click="reset">RESTART</button>
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
        <button
          @click="toggleDelayedSteering"
          :class="{ active: delayedSteering }"
        >
          DELAY TURN
        </button>
        <button @click="toggleAllCarTypes" :class="{ active: useAllCarTypes }">
          ALL TYPES
        </button>
        <button
          @click="toggleCarSpeed"
          :class="{ active: carSpeedMultiplier > 1 }"
        >
          {{ carSpeedMultiplier }}x SPEED
        </button>
      </div>

      <div class="hud">
        <div class="hud-content">
          <!-- Table View -->
          <table
            v-if="viewMode === 'table'"
            :class="['stats-table', { 'stats-table-compact': useAllCarTypes }]"
            @click="cycleView"
          >
            <thead>
              <tr>
                <th v-if="!isMobile">Score</th>
                <th>Type</th>
                <th>Gen</th>
                <th>{{ isMobile ? 'MUT' : 'NEXT MUT' }}</th>
                <th>Mean</th>
                <th>Best</th>
                <th>Duration</th>
                <th>Hidden</th>
                <th>{{ isMobile ? 'A' : 'Activ' }}</th>
                <th>{{ isMobile ? 'I' : 'Input' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="config in sortedCarBrainConfigs"
                :key="config.shortName"
                :style="{ backgroundColor: config.colors.dark }"
              >
                <td v-if="!isMobile">
                  <PercentageBar
                    :percentage="scoreByConfigId.get(config.shortName) ?? 0"
                    variant="white"
                    :compact="useAllCarTypes"
                  />
                </td>
                <td style="font-weight: bold">
                  {{ isMobile ? config.shortName : config.displayName }}
                </td>
                <td>
                  {{ ga.getGeneration(config.shortName) }}
                </td>
                <td>
                  <PercentageBar
                    :percentage="
                      mutationRatePercentByConfigId.get(config.shortName) ?? 0
                    "
                    variant="white"
                    :compact="useAllCarTypes"
                  />
                </td>
                <td>
                  <PercentageBar
                    :percentage="getMeanFitnessPercentRaw(config.shortName)"
                    variant="white"
                    :compact="useAllCarTypes"
                  />
                </td>
                <td>
                  <PercentageBar
                    :percentage="getBestFitnessPercentRaw(config.shortName)"
                    variant="white"
                    :compact="useAllCarTypes"
                  />
                </td>
                <td>
                  {{ getBestLapTime(config.shortName) }}
                </td>
                <td>
                  {{ getHiddenLayers(config.nn.architecture) }}
                </td>
                <td
                  :style="{
                    backgroundColor: getActivationColor(
                      config.nn.activationType
                    ),
                  }"
                >
                  {{
                    isMobile
                      ? config.nn.activationType.charAt(0)
                      : config.nn.activationType
                  }}
                </td>
                <td
                  :style="{
                    backgroundColor: getInputColor(config.nn.inputModification),
                  }"
                >
                  {{
                    isMobile
                      ? config.nn.inputModification.charAt(0)
                      : config.nn.inputModification
                  }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Graph View -->
          <div
            v-else-if="viewMode === 'graph'"
            class="graph-view"
            @click="cycleView"
          >
            <canvas ref="graphCanvasRef"></canvas>
          </div>

          <!-- Performance View -->
          <div v-else class="performance-view" @click="cycleView">
            <div style="display: flex; gap: 10px; width: 100%">
              <!-- Left Column -->
              <table class="stats-table perf-table" style="flex: 1">
                <thead>
                  <tr>
                    <th colspan="2">Frame Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="label-cell">FPS Avg</td>
                    <td class="value-cell">{{ currentFps.toFixed(1) }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 0.1% High</td>
                    <td class="value-cell">{{ fpsTarget.toFixed(1) }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 1% High</td>
                    <td class="value-cell">{{ fps1PercentHigh.toFixed(1) }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 5% High</td>
                    <td class="value-cell">{{ fps5PercentHigh.toFixed(1) }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 0.1% Low</td>
                    <td class="value-cell">
                      {{ fps0_1PercentLow.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 1% Low</td>
                    <td class="value-cell">{{ fps1PercentLow.toFixed(1) }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 5% Low</td>
                    <td class="value-cell">{{ fps5PercentLow.toFixed(1) }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Frame Time</td>
                    <td class="value-cell">{{ avgFrameTime.toFixed(2) }}ms</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Update Time</td>
                    <td class="value-cell">{{ avgUpdateTime.toFixed(2) }}ms</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Render Time</td>
                    <td class="value-cell">{{ avgRenderTime.toFixed(2) }}ms</td>
                  </tr>
                </tbody>
              </table>

              <!-- Right Column -->
              <table class="stats-table perf-table" style="flex: 1">
                <thead>
                  <tr>
                    <th colspan="2">System Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="label-cell">PTPT Saved</td>
                    <td class="value-cell">
                      {{ savedPerformanceTargetPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">PTPT</td>
                    <td class="value-cell">
                      {{ actualPerformanceTargetPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">PTPT Up</td>
                    <td class="value-cell">
                      {{ performanceTargetCarsPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">PTPT Down</td>
                    <td class="value-cell">
                      {{ performanceTargetCarsPerTypeDown.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">Avg C per Type</td>
                    <td class="value-cell">
                      {{ averageCarsPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">Total Cars</td>
                    <td class="value-cell">{{ totalCars }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Alive Cars</td>
                    <td class="value-cell">{{ aliveCars }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Dead Cars</td>
                    <td class="value-cell">{{ deadCars }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Adaptive</td>
                    <td class="value-cell">
                      {{ adaptivePopulation ? 'PID' : 'OFF' }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">Headroom</td>
                    <td class="value-cell">
                      {{ (performanceHeadroom * 100).toFixed(0) }}%
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">Stability</td>
                    <td class="value-cell">
                      {{ (performanceStability * 100).toFixed(0) }}%
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">Trend</td>
                    <td class="value-cell">
                      {{
                        performanceTrend > 0
                          ? '↗'
                          : performanceTrend < 0
                          ? '↘'
                          : '→'
                      }}
                      {{ performanceTrend >= 0 ? '+' : ''
                      }}{{ (performanceTrend * 100).toFixed(0) }}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  type Ref,
} from 'vue';
import { Track } from '@/core/Track';
import { Car } from '@/core/Car';
import { GeneticAlgorithm } from '@/core/GA';
import { PerformanceMonitor } from '@/core/PerformanceMonitor';
import { PopulationController } from '@/core/PopulationController';
import PercentageBar from './PercentageBar.vue';
import type {
  CarBrainConfig,
  InputModificationType,
  ActivationType,
  SpeedMultiplier,
} from '@/types';
import { SPEED_MULTIPLIERS } from '@/types';
import {
  TRACK_WIDTH_HALF,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GENERATION_MARKER_RADIUS,
  LAP_COMPLETION_THRESHOLD,
  DEFAULT_DIE_ON_BACKWARDS,
  DEFAULT_KILL_SLOW_CARS,
  DEFAULT_MUTATION_BY_DISTANCE,
  DEFAULT_DELAYED_STEERING,
  DEFAULT_SPEED_MULTIPLIER,
  CAR_STEERING_DELAY_SECONDS,
  GA_MUTATION_BASE,
  GA_MUTATION_PROGRESS_FACTOR,
  GA_MUTATION_MIN,
  DEBUG_SHOW_WAYPOINTS,
  PERFORMANCE_MANAGEMENT_ENABLED,
  PERF_TARGET_FPS,
  PERF_HISTORY_SIZE,
  PERF_UI_UPDATE_INTERVAL,
  FPS_CALC_SAVED_WEIGHT,
  POP_INITIAL,
  POP_MIN,
  POP_MAX,
  POP_MAX_CHANGE_RATE,
  POP_ADJUSTMENT_INTERVAL,
  POP_THRESHOLD_FPS,
  POP_AVERAGE_INITIAL,
  POP_AVERAGE_UPDATE_INTERVAL,
  POP_AVERAGE_SAVED_WEIGHT,
  GRAPH_GENERATION_USE_LOG_SCALE,
  print,
  wp,
} from '@/config';
import { CAR_BRAIN_CONFIGS, CAR_BRAIN_CONFIGS_DEFINED } from '@/core/config_cars';

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
const carSpeedMultiplier = ref<SpeedMultiplier>(DEFAULT_SPEED_MULTIPLIER);
const dieOnBackwards = ref(DEFAULT_DIE_ON_BACKWARDS);
const killSlowCars = ref(DEFAULT_KILL_SLOW_CARS);
const mutationByDistance = ref(DEFAULT_MUTATION_BY_DISTANCE);
const delayedSteering = ref(DEFAULT_DELAYED_STEERING);
const useAllCarTypes = ref(false); // Toggle between active cars only and all cars
const frameCounter = ref(0);
const viewMode = ref<'table' | 'graph' | 'performance'>('table');
const graphCanvasRef = ref<HTMLCanvasElement | null>(null);

// Check if mobile for responsive formatting
const isMobile = computed(() => {
  return typeof window !== 'undefined' && window.innerWidth <= 768;
});

// Active car configs based on toggle
const activeCarConfigs = computed(() => {
  return useAllCarTypes.value ? CAR_BRAIN_CONFIGS_DEFINED : CAR_BRAIN_CONFIGS;
});

// ============================================================================
// Performance Management System
// ============================================================================
// Professional performance monitoring and adaptive population control

// Performance Monitor: Tracks FPS, stability, trends, and other metrics
const performanceMonitor = new PerformanceMonitor(
  PERF_TARGET_FPS,
  PERF_HISTORY_SIZE
);

// Population Controller: Single-threshold adaptive population management (works with cars per type)
const populationController = new PopulationController(
  {
    targetFps: PERF_TARGET_FPS,
    minPopulation: POP_MIN,
    maxPopulation: POP_MAX,
    initialPopulation: POP_INITIAL,
    maxChangeRate: POP_MAX_CHANGE_RATE,
    adjustmentInterval: POP_ADJUSTMENT_INTERVAL,
  },
  CAR_BRAIN_CONFIGS.length
); // Initial setup uses default active configs

// UI state (for reactive display)
const currentFps = ref(60);
const performanceTargetCarsPerType = ref(
  POP_INITIAL / CAR_BRAIN_CONFIGS.length
);
const averageCarsPerType = ref(POP_AVERAGE_INITIAL);
let averageCarsPerTypeFrameCounter = 0; // Frame counter for average update interval
const performanceTargetCarsPerTypeDown = computed(
  () => averageCarsPerType.value * 0.9 // 10% below average
);
const actualPerformanceTargetPerType = ref(
  POP_INITIAL / CAR_BRAIN_CONFIGS.length
);
const savedPerformanceTargetPerType = ref(
  POP_INITIAL / CAR_BRAIN_CONFIGS.length
);
const targetPopulationTotal = computed(
  () => performanceTargetCarsPerType.value * activeCarConfigs.value.length
);
const performanceStability = ref(1.0);
const performanceTrend = ref(0);
const performanceHeadroom = ref(1.0);
const fps0_1PercentLow = ref(60);
const fps1PercentLow = ref(60);
const fps5PercentLow = ref(60);

// Profiling metrics (for display)
const avgFrameTime = ref(16.67);
const avgUpdateTime = ref(0);
const avgRenderTime = ref(0);
const updateTimeHistory: number[] = [];
const renderTimeHistory: number[] = [];
const HISTORY_SIZE = 60;

// Population control state
const adaptivePopulation = ref(PERFORMANCE_MANAGEMENT_ENABLED);
const fpsTarget = ref(0); // Will be set dynamically based on 0.1% high (99.9th percentile)
const fps1PercentHigh = ref(0); // 99th percentile (1% high)
const fps5PercentHigh = ref(0); // 95th percentile (5% high)

// Dynamic generation tracking for all config types
const generationTimeByConfigId = ref<Map<string, number>>(new Map());
const generationMarkersByConfigId = ref<
  Map<string, { x: number; y: number; generation: number; fitness: number }[]>
>(new Map());
const lapCompletionTimeByConfigId = ref<Map<string, number>>(new Map()); // Current generation lap time
const bestLapTimeByConfigId = ref<Map<string, number>>(new Map()); // Best lap time ever (across all generations)

// Initialize tracking maps for all possible configs (including inactive ones)
for (const config of CAR_BRAIN_CONFIGS_DEFINED) {
  generationTimeByConfigId.value.set(config.shortName, 0);
  generationMarkersByConfigId.value.set(config.shortName, []);
  lapCompletionTimeByConfigId.value.set(config.shortName, Infinity); // Current gen: Start at infinity
  bestLapTimeByConfigId.value.set(config.shortName, Infinity); // Best ever: Start at infinity
}

let animationFrameId: number | null = null;
const FIXED_DT = 1 / 60; // 60 Hz physics

/**
 * Hierarchical comparison function for car brain configs
 * Priority order:
 * 1. Best lap time ever (lower is better) - Infinity if never completed
 * 2. Best fitness (higher is better)
 * 3. Mean fitness (higher is better)
 *
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
/**
 * Calculate comprehensive score for a car configuration
 * Combines multiple factors: performance, learning efficiency, speed, consistency
 * Returns a 0-100 score
 */
const calculateComprehensiveScore = (shortName: string): number => {
  // Component 1: Mean Performance (40% weight) - Most important: consistent track completion
  const meanCompletion = getMeanFitnessPercentRaw(shortName); // 0-100
  const meanScore = meanCompletion * 0.4;

  // Component 2: Best Performance (20% weight) - Peak capability achieved
  const bestCompletion = getBestFitnessPercentRaw(shortName); // 0-100
  const bestScore = bestCompletion * 0.2;

  // Component 3: Learning Efficiency (20% weight) - Fewer generations = better learner
  const generations = ga.value.getGeneration(shortName);
  // Penalize 0.5 points per generation (200 generations = 0 efficiency score)
  const efficiencyRaw = Math.max(0, 100 - generations * 0.5);
  const efficiencyScore = efficiencyRaw * 0.2;

  // Component 4: Lap Speed Bonus (10% weight) - Reward fast lap times
  const lapTime = bestLapTimeByConfigId.value.get(shortName);
  let speedScore = 0;
  if (lapTime !== undefined && lapTime !== Infinity) {
    // 30 second lap = 100 points, 60 second lap = 50 points, etc.
    const speedRaw = Math.min(100, (30 / lapTime) * 100);
    speedScore = speedRaw * 0.1;
  }

  // Component 5: Consistency (10% weight) - How close mean is to best
  let consistencyScore = 0;
  if (bestCompletion > 0) {
    const consistencyRaw = (meanCompletion / bestCompletion) * 100;
    consistencyScore = consistencyRaw * 0.1;
  }

  // Total weighted score (0-100)
  return (
    meanScore + bestScore + efficiencyScore + speedScore + consistencyScore
  );
};

const compareConfigs = (a: CarBrainConfig, b: CarBrainConfig): number => {
  // Compare by comprehensive score (higher is better)
  const scoreA = calculateComprehensiveScore(a.shortName);
  const scoreB = calculateComprehensiveScore(b.shortName);
  return scoreB - scoreA;
};

/**
 * Computed score for display purposes
 * Uses comprehensive scoring: performance, efficiency, speed, consistency
 */
const scoreByConfigId = computed(() => {
  const scores = new Map<string, number>();

  // Calculate comprehensive score for each config
  for (const config of activeCarConfigs.value) {
    const score = calculateComprehensiveScore(config.shortName);
    scores.set(config.shortName, score);
  }

  return scores;
});

// Performance computed properties
const totalCars = computed(() => population.value.length);
const aliveCars = computed(
  () => population.value.filter((c) => c.alive).length
);
const deadCars = computed(
  () => population.value.filter((c) => !c.alive).length
);

// Computed property to sort car brain configs by hierarchical comparison
const sortedCarBrainConfigs = computed(() => {
  // Use the hierarchical comparison function directly
  return [...activeCarConfigs.value].sort(compareConfigs);
});

// Computed property for mutation rates as raw percentages (for bars)
const mutationRatePercentByConfigId = computed(() => {
  void frameCounter.value; // Trigger on every frame
  const isMutationByDistance = mutationByDistance.value; // Trigger on toggle

  const percentages = new Map<string, number>();

  for (const config of activeCarConfigs.value) {
    if (isMutationByDistance) {
      const trackLength = track.getTotalLength();

      const carsOfType = population.value.filter(
        (car) => car.configShortName === config.shortName
      );
      const currentBest =
        carsOfType.length > 0
          ? Math.max(...carsOfType.map((car) => car.maxDistanceReached))
          : 0;

      const bestDistance = currentBest;

      const progressPercentage = bestDistance / trackLength;
      const mutationReduction =
        progressPercentage * GA_MUTATION_PROGRESS_FACTOR;
      const rate = Math.max(
        GA_MUTATION_MIN,
        GA_MUTATION_BASE - mutationReduction
      );

      // Normalize to 0-100% range (GA_MUTATION_BASE is max)
      const normalizedPercent = (rate / GA_MUTATION_BASE) * 100;
      percentages.set(config.shortName, normalizedPercent);
    } else {
      // When MUT DIST is OFF, use constant minimum mutation
      const normalizedPercent = (GA_MUTATION_MIN / GA_MUTATION_BASE) * 100;
      percentages.set(config.shortName, normalizedPercent);
    }
  }

  return percentages;
});

// Get background color for activation type
const getActivationColor = (activationType: ActivationType): string => {
  switch (activationType) {
    case '-':
      return '#888'; // Gray (no activation)
    case 'linear':
      return '#b85'; // Orange-yellow family
    case 'relu':
      return '#58c'; // Blue family
    case 'gelu':
      return '#4a8'; // Green-cyan family
    case 'step':
      return '#c5c'; // Purple-magenta family
    default:
      throw new Error(`Unknown activation type: ${activationType}`);
  }
};

// Get background color for input modification type
const getInputColor = (inputModification: InputModificationType): string => {
  switch (inputModification) {
    case 'pair':
      return '#843'; // Warmer (reddish-brown)
    case 'dir':
      return '#368'; // Cooler (blue)
    default:
      throw new Error(`Unknown input modification type: ${inputModification}`);
  }
};

const getHiddenLayers = (architecture: number[]): string => {
  const hiddenLayers = architecture.slice(1, -1);
  return `[${hiddenLayers.join(',')}]`;
};

// Helper to get raw mean fitness percentage (not formatted)
const getMeanFitnessPercentRaw = (shortName: string): number => {
  const markers = generationMarkersByConfigId.value.get(shortName) ?? [];

  if (markers.length === 0) {
    return 0;
  }

  const trackLength = track.getTotalLength();
  const totalFitness = markers.reduce((sum, marker) => sum + marker.fitness, 0);
  const meanFitness = totalFitness / markers.length;

  return (meanFitness / trackLength) * 100;
};

// Helper to get raw best fitness percentage (not formatted)
const getBestFitnessPercentRaw = (shortName: string): number => {
  const markers = generationMarkersByConfigId.value.get(shortName) ?? [];

  if (markers.length === 0) {
    return 0;
  }

  const trackLength = track.getTotalLength();
  const bestFitness = Math.max(...markers.map((marker) => marker.fitness));

  return (bestFitness / trackLength) * 100;
};

const getBestLapTime = (shortName: string): string => {
  const lapTime = bestLapTimeByConfigId.value.get(shortName) ?? Infinity;
  if (lapTime === Infinity) {
    return '-'; // Em dash for no lap completed
  }
  return lapTime.toFixed(1) + 's';
};

// Cycle through views: table -> graph -> performance -> table
const cycleView = () => {
  if (viewMode.value === 'table') {
    viewMode.value = 'graph';
  } else if (viewMode.value === 'graph') {
    viewMode.value = 'performance';
  } else {
    viewMode.value = 'table';
  }
};

// Initialize simulation
const init = () => {
  // Initialize with target population (PID controller will adapt based on performance)
  print(
    `[Init] Starting with ${targetPopulationTotal.value} cars (${performanceTargetCarsPerType.value} per type) | PID-based adaptive control enabled`
  );

  population.value = ga.value.initializePopulation(
    track,
    targetPopulationTotal.value,
    activeCarConfigs.value
  );

  // Reset generation times, markers, and lap times for active configs
  for (const config of activeCarConfigs.value) {
    generationTimeByConfigId.value.set(config.shortName, 0);
    generationMarkersByConfigId.value.set(config.shortName, []);
    lapCompletionTimeByConfigId.value.set(config.shortName, Infinity);
  }
};

// Generic evolution function that works with any car brain config
const evolvePopulationByConfig = (
  config: CarBrainConfig,
  _reason: string,
  winnerCar?: Car
) => {
  // Separate cars by shortName (unique identifier)
  const configCars = population.value.filter(
    (car) => car.configShortName === config.shortName
  );
  const otherCars = population.value.filter(
    (car) => car.configShortName !== config.shortName
  );

  // Find best car for marker
  const sortedCars = [...configCars].sort(
    (a, b) => b.maxDistanceReached - a.maxDistanceReached
  );
  const bestCar = sortedCars[0];

  // Save best position as marker (with fitness)
  if (bestCar) {
    const markers =
      generationMarkersByConfigId.value.get(config.shortName) ?? [];
    markers.push({
      x: bestCar.x,
      y: bestCar.y,
      generation: ga.value.getGeneration(config.shortName),
      fitness: bestCar.maxDistanceReached,
    });

    // Keep only last 100 markers per config
    if (markers.length > 100) {
      markers.splice(0, markers.length - 100);
    }

    generationMarkersByConfigId.value.set(config.shortName, markers);
  }

  // Evolve this population with per-type target population (based on current FPS)
  const generationTime =
    generationTimeByConfigId.value.get(config.shortName) ?? 0;

  // Use "Up" target if above threshold, "Down" target if below threshold
  const targetCarsPerType =
    fps0_1PercentLow.value >= POP_THRESHOLD_FPS
      ? performanceTargetCarsPerType.value
      : performanceTargetCarsPerTypeDown.value;

  // Update the actual performance target being used (raw value)
  actualPerformanceTargetPerType.value = targetCarsPerType;

  print(
    `[Evolution] ${config.displayName}: ${savedPerformanceTargetPerType.value.toFixed(
      1
    )} cars for this type (raw: ${targetCarsPerType.toFixed(1)}) | Total: ${targetPopulationTotal.value} | Target: ${
      fpsTarget.value
    } FPS`
  );

  const newCars = ga.value.evolvePopulation(
    configCars,
    config,
    track,
    generationTime,
    winnerCar,
    mutationByDistance.value,
    savedPerformanceTargetPerType.value
  );
  generationTimeByConfigId.value.set(config.shortName, 0);
  lapCompletionTimeByConfigId.value.set(config.shortName, Infinity); // Reset lap time for new generation

  // Combine with other car types
  population.value = [...newCars, ...otherCars];
};

// Update physics
const updatePhysics = (dt: number) => {
  const trackLength = track.getTotalLength();

  for (const car of population.value) {
    if (car.alive) {
      car.update(
        dt,
        track.wallSegments,
        track,
        delayedSteering.value,
        CAR_STEERING_DELAY_SECONDS,
        carSpeedMultiplier.value
      );

      // Update fitness and check for backwards movement
      const result = track.getClosestPointOnCenterline({ x: car.x, y: car.y });
      car.fitness = result.distance;
      car.updateSignedFitness(result.distance, trackLength);

      // Check if car completed a lap (reached ~99.5% progress)
      // Use threshold < 1.0 to account for discrete physics updates
      // Cars may not land exactly at the finish line due to frame timing
      if (car.currentProgressRatio >= LAP_COMPLETION_THRESHOLD) {
        // Find the config for this car type by shortName (check all defined configs)
        const config = CAR_BRAIN_CONFIGS_DEFINED.find(
          (c) => c.shortName === car.configShortName
        );

        if (config) {
          // Record lap completion time (only if not already recorded this generation)
          const currentLapTime =
            lapCompletionTimeByConfigId.value.get(config.shortName) ?? Infinity;
          if (currentLapTime === Infinity) {
            const completionTime =
              generationTimeByConfigId.value.get(config.shortName) ?? 0;

            // Record current generation lap time
            lapCompletionTimeByConfigId.value.set(
              config.shortName,
              completionTime
            );

            // Update best lap time if this is better
            const bestLapTime =
              bestLapTimeByConfigId.value.get(config.shortName) ?? Infinity;
            if (completionTime < bestLapTime) {
              bestLapTimeByConfigId.value.set(config.shortName, completionTime);
              print(
                `[Lap Complete] 🏆 ${
                  config.displayName
                } NEW BEST: ${completionTime.toFixed(2)}s (prev: ${
                  bestLapTime === Infinity ? '-' : bestLapTime.toFixed(2) + 's'
                })`
              );
            } else {
              print(
                `[Lap Complete] ${
                  config.displayName
                } completed lap in ${completionTime.toFixed(
                  2
                )}s (best: ${bestLapTime.toFixed(2)}s)`
              );
            }
          }

          // Kill all cars of same type immediately
          population.value.forEach((c) => {
            if (c.configShortName === config.shortName && c !== car) {
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

  // Update generation times for active config types
  for (const config of activeCarConfigs.value) {
    const currentTime =
      generationTimeByConfigId.value.get(config.shortName) ?? 0;
    generationTimeByConfigId.value.set(config.shortName, currentTime + dt);
  }

  // Check each config population independently for all-dead condition
  for (const config of activeCarConfigs.value) {
    const configCars = population.value.filter(
      (c) => c.configShortName === config.shortName
    );
    const allDead = configCars.every((c) => !c.alive);

    if (allDead && configCars.length > 0) {
      evolvePopulationByConfig(
        config,
        `all ${config.displayName} cars crashed`
      );
    }
  }

  // Keep only last 100 dead cars in memory
  const aliveCars = population.value.filter((c) => c.alive);
  const deadCars = population.value.filter((c) => !c.alive);

  if (deadCars.length > 100) {
    // Remove oldest dead cars, keep last 100
    const recentDeadCars = deadCars.slice(-100);
    population.value = [...aliveCars, ...recentDeadCars];
  }
};

// Render frame
const render = (ctx: CanvasRenderingContext2D) => {
  // Clear canvas (transparent - background color comes from page)
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Render track
  track.render(ctx);

  // Render waypoint debug markers
  if (DEBUG_SHOW_WAYPOINTS) {
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const point of wp) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      const coordText = `(${Math.round(point.x)}, ${Math.round(point.y)})`;
      ctx.strokeText(coordText, point.x, point.y - 12);
      ctx.fillText(coordText, point.x, point.y - 12);
      ctx.fillStyle = '#ff0000';
    }
  }

  // Render generation markers dynamically for active configs
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  for (const config of activeCarConfigs.value) {
    const markers =
      generationMarkersByConfigId.value.get(config.shortName) ?? [];
    ctx.fillStyle = config.colors.dark;

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

  // Separate elites (now identified by size multiplier > 1.0)
  const elites = aliveCars.filter((car) => car.sizeMultiplier > 1.0);
  const others = aliveCars.filter((car) => car.sizeMultiplier === 1.0);

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

// ============================================================================
// Performance Tracking and Population Management
// ============================================================================

/**
 * Update performance metrics using PerformanceMonitor
 */
const updatePerformanceMetrics = (updateTime: number, renderTime: number) => {
  // Record frame in PerformanceMonitor (handles FPS, trends, stability)
  performanceMonitor.recordFrame();

  // Track update/render times for profiling
  updateTimeHistory.push(updateTime);
  if (updateTimeHistory.length > HISTORY_SIZE) {
    updateTimeHistory.shift();
  }

  renderTimeHistory.push(renderTime);
  if (renderTimeHistory.length > HISTORY_SIZE) {
    renderTimeHistory.shift();
  }

  // Update UI metrics (configurable interval via PERF_UI_UPDATE_INTERVAL)
  if (updateTimeHistory.length % PERF_UI_UPDATE_INTERVAL === 0) {
    const metrics = performanceMonitor.getMetrics();

    // FPS Avg: Always use exponential moving average
    currentFps.value =
      metrics.currentFps * (1 - FPS_CALC_SAVED_WEIGHT) +
      currentFps.value * FPS_CALC_SAVED_WEIGHT;

    avgFrameTime.value = metrics.frameTimeMs;
    performanceStability.value = metrics.stability;
    performanceTrend.value = metrics.trend;
    performanceHeadroom.value = metrics.headroom;

    // FPS Low trackers: Immediately jump to lower values, gradually rise with higher values
    if (
      metrics.p0_1Fps < fps0_1PercentLow.value ||
      fps0_1PercentLow.value === 0
    ) {
      fps0_1PercentLow.value = metrics.p0_1Fps; // Immediate drop
    } else {
      fps0_1PercentLow.value =
        metrics.p0_1Fps * (1 - FPS_CALC_SAVED_WEIGHT) +
        fps0_1PercentLow.value * FPS_CALC_SAVED_WEIGHT; // Gradual rise
    }

    if (metrics.p1Fps < fps1PercentLow.value || fps1PercentLow.value === 0) {
      fps1PercentLow.value = metrics.p1Fps; // Immediate drop
    } else {
      fps1PercentLow.value =
        metrics.p1Fps * (1 - FPS_CALC_SAVED_WEIGHT) +
        fps1PercentLow.value * FPS_CALC_SAVED_WEIGHT; // Gradual rise
    }

    if (metrics.p5Fps < fps5PercentLow.value || fps5PercentLow.value === 0) {
      fps5PercentLow.value = metrics.p5Fps; // Immediate drop
    } else {
      fps5PercentLow.value =
        metrics.p5Fps * (1 - FPS_CALC_SAVED_WEIGHT) +
        fps5PercentLow.value * FPS_CALC_SAVED_WEIGHT; // Gradual rise
    }

    // FPS High trackers: Immediately jump to higher values, gradually decay with lower values
    // FPS 0.1% High (99.9th percentile)
    if (metrics.p99_9Fps > fpsTarget.value) {
      fpsTarget.value = metrics.p99_9Fps; // Immediate rise
    } else {
      fpsTarget.value =
        metrics.p99_9Fps * (1 - FPS_CALC_SAVED_WEIGHT) +
        fpsTarget.value * FPS_CALC_SAVED_WEIGHT; // Gradual decay
    }

    // FPS 1% High (99th percentile)
    if (metrics.p99Fps > fps1PercentHigh.value) {
      fps1PercentHigh.value = metrics.p99Fps; // Immediate rise
    } else {
      fps1PercentHigh.value =
        metrics.p99Fps * (1 - FPS_CALC_SAVED_WEIGHT) +
        fps1PercentHigh.value * FPS_CALC_SAVED_WEIGHT; // Gradual decay
    }

    // FPS 5% High (95th percentile)
    if (metrics.p95Fps > fps5PercentHigh.value) {
      fps5PercentHigh.value = metrics.p95Fps; // Immediate rise
    } else {
      fps5PercentHigh.value =
        metrics.p95Fps * (1 - FPS_CALC_SAVED_WEIGHT) +
        fps5PercentHigh.value * FPS_CALC_SAVED_WEIGHT; // Gradual decay
    }

    avgUpdateTime.value =
      updateTimeHistory.reduce((a, b) => a + b, 0) / updateTimeHistory.length;
    avgRenderTime.value =
      renderTimeHistory.reduce((a, b) => a + b, 0) / renderTimeHistory.length;
  }
};

/**
 * Adjust population using PID-based PopulationController
 * Uses multiple performance metrics for intelligent, stable adjustments
 */
const adjustPopulationSize = () => {
  if (!adaptivePopulation.value) return;

  // Only adjust if we have calibrated performance data
  if (!performanceMonitor.isCalibrated()) return;

  // Get comprehensive performance metrics
  const metrics = performanceMonitor.getMetrics();

  // Calculate optimal population using PID controller
  const adjustment = populationController.calculateOptimalPopulation(metrics);

  // Update UI state (per-type population)
  performanceTargetCarsPerType.value = adjustment.populationPerType;

  // Log adjustment details
  if (adjustment.delta !== 0) {
    print(
      `[PerfMgmt] ${adjustment.reason} | ` +
        `Total: ${adjustment.totalPopulation} (${adjustment.populationPerType}/type × ${adjustment.numTypes} types) | ` +
        `Stability: ${(adjustment.metrics.stability * 100).toFixed(0)}% | ` +
        `Trend: ${
          adjustment.metrics.trend > 0
            ? '↗'
            : adjustment.metrics.trend < 0
            ? '↘'
            : '→'
        } ${(adjustment.metrics.trend * 100).toFixed(0)}% | ` +
        `Headroom: ${(adjustment.metrics.headroom * 100).toFixed(0)}%`
    );
  }
};

// Main animation loop
const animate = () => {
  const ctx = canvasRef.value?.getContext('2d');
  if (!ctx) return;

  // Track update time
  const updateStartTime = performance.now();

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

  const updateEndTime = performance.now();
  const updateTime = updateEndTime - updateStartTime;

  // Track render time
  const renderStartTime = performance.now();
  render(ctx);
  const renderEndTime = performance.now();
  const renderTime = renderEndTime - renderStartTime;

  // Update performance metrics
  updatePerformanceMetrics(updateTime, renderTime);

  // Adjust population using PID controller (runs at its own interval)
  adjustPopulationSize();

  // Update average cars per type using exponential moving average
  // Only update based on configured interval
  averageCarsPerTypeFrameCounter++;
  if (averageCarsPerTypeFrameCounter >= POP_AVERAGE_UPDATE_INTERVAL) {
    averageCarsPerTypeFrameCounter = 0;
    // Calculate actual alive cars per type from alive car count
    const currentAliveCarsPerType =
      aliveCars.value / activeCarConfigs.value.length;
    // Formula: saved_average = new_value * NEW_WEIGHT + saved_average * SAVED_WEIGHT
    averageCarsPerType.value =
      currentAliveCarsPerType * (1 - POP_AVERAGE_SAVED_WEIGHT) +
      averageCarsPerType.value * POP_AVERAGE_SAVED_WEIGHT;
  }

  // Update saved performance target per type every frame using exponential moving average
  // Formula: saved = new * (1 - SAVED_WEIGHT) + saved * SAVED_WEIGHT
  savedPerformanceTargetPerType.value =
    actualPerformanceTargetPerType.value * (1 - POP_AVERAGE_SAVED_WEIGHT) +
    savedPerformanceTargetPerType.value * POP_AVERAGE_SAVED_WEIGHT;

  // Increment frame counter for Vue reactivity
  frameCounter.value++;

  animationFrameId = requestAnimationFrame(animate);
};

// Manually trigger next generation for all active populations
const nextGeneration = () => {
  for (const config of activeCarConfigs.value) {
    evolvePopulationByConfig(config, 'manual trigger');
  }
};

// Reset the simulation (but keep toggle button states)
const reset = () => {
  // Reset GA state
  ga.value.reset();

  // Re-initialize population with new random seed using current target population
  randomSeed = Date.now() + Math.random() * 1000000;
  ga.value = new GeneticAlgorithm(randomSeed);

  print(
    `[Reset] Re-creating ${targetPopulationTotal.value} cars (${performanceTargetCarsPerType.value} per type) | Target: ${fpsTarget.value} FPS`
  );

  population.value = ga.value.initializePopulation(
    track,
    targetPopulationTotal.value,
    activeCarConfigs.value
  );

  // Clear generation times, markers, and lap times for active configs
  for (const config of activeCarConfigs.value) {
    generationTimeByConfigId.value.set(config.shortName, 0);
    generationMarkersByConfigId.value.set(config.shortName, []);
    lapCompletionTimeByConfigId.value.set(config.shortName, Infinity);
    bestLapTimeByConfigId.value.set(config.shortName, Infinity); // Reset best lap times on manual reset
  }

  // Reset performance management system
  performanceMonitor.reset();
  populationController.reset();
  frameCounter.value = 0;

  // Reset target population to initial value
  performanceTargetCarsPerType.value =
    POP_INITIAL / activeCarConfigs.value.length;
  actualPerformanceTargetPerType.value =
    POP_INITIAL / activeCarConfigs.value.length;
  savedPerformanceTargetPerType.value =
    POP_INITIAL / activeCarConfigs.value.length;
  // Reset average cars per type to initial configured value
  averageCarsPerType.value = POP_AVERAGE_INITIAL;
  averageCarsPerTypeFrameCounter = 0;
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

// Toggle All Car Types mode
const toggleAllCarTypes = () => {
  useAllCarTypes.value = !useAllCarTypes.value;
};

// Toggle Delayed Steering mode
const toggleDelayedSteering = () => {
  delayedSteering.value = !delayedSteering.value;
};

// Toggle Car Speed (cycle through speed multipliers)
const toggleCarSpeed = () => {
  const currentIndex = SPEED_MULTIPLIERS.indexOf(carSpeedMultiplier.value);
  const nextIndex = (currentIndex + 1) % SPEED_MULTIPLIERS.length;
  carSpeedMultiplier.value = SPEED_MULTIPLIERS[nextIndex];
  print(`[Speed] Car speed set to ${carSpeedMultiplier.value}x`);
};

// Render graph
const renderGraph = () => {
  const canvas = graphCanvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Get actual rendered size of the graph-view container (accounting for padding)
  const container = canvas.parentElement;
  if (!container) return;

  // Container has 12px padding on all sides, so inner content area is smaller
  const containerPadding = 12;
  const width = container.clientWidth - containerPadding * 2;
  const height = container.clientHeight - containerPadding * 2;

  canvas.width = width;
  canvas.height = height;

  const padding = 45;
  const topPadding = 25; // Extra space at top for labels above dots
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding - topPadding;

  // Clear canvas
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  // Calculate raw score history for each active config
  const configHistories: Map<string, { generation: number; score: number }[]> =
    new Map();

  for (const config of activeCarConfigs.value) {
    const markers =
      generationMarkersByConfigId.value.get(config.shortName) ?? [];
    if (markers.length === 0) continue;

    const history: { generation: number; score: number }[] = [];
    const trackLength = track.getTotalLength();

    // For each generation, calculate score up to that point
    for (let i = 0; i < markers.length; i++) {
      const markersUpToNow = markers.slice(0, i + 1);

      // Calculate mean (average of all fitness values up to now)
      const totalFitness = markersUpToNow.reduce(
        (sum, m) => sum + m.fitness,
        0
      );
      const meanFitness = totalFitness / markersUpToNow.length;
      const meanPercent = (meanFitness / trackLength) * 100;

      // Calculate best (max fitness up to now)
      const bestFitness = Math.max(...markersUpToNow.map((m) => m.fitness));
      const bestPercent = (bestFitness / trackLength) * 100;

      // Score is average of mean and best
      const score = (meanPercent + bestPercent) / 2;

      history.push({ generation: markers[i].generation, score });
    }

    configHistories.set(config.shortName, history);
  }

  // Find minimum generation count across all car types
  let minGeneration = Infinity;
  for (const history of configHistories.values()) {
    if (history.length > 0) {
      const lastGen = history[history.length - 1].generation;
      minGeneration = Math.min(minGeneration, lastGen);
    }
  }

  if (!isFinite(minGeneration) || minGeneration === 0) minGeneration = 1;

  // Truncate all histories to only show up to minimum generation
  for (const history of configHistories.values()) {
    const truncatedLength = history.findIndex(
      (point) => point.generation > minGeneration
    );
    if (truncatedLength !== -1) {
      history.splice(truncatedLength);
    }
  }

  const maxGeneration = minGeneration;

  // Normalize scores: for each generation, show each as percentage of total sum
  // Build a map of generation -> total sum of all scores
  const generationTotalScores = new Map<number, number>();

  for (const history of configHistories.values()) {
    for (const point of history) {
      const currentTotal = generationTotalScores.get(point.generation) ?? 0;
      generationTotalScores.set(point.generation, currentTotal + point.score);
    }
  }

  // Normalize all scores as percentage of total
  for (const history of configHistories.values()) {
    for (const point of history) {
      const totalScore = generationTotalScores.get(point.generation) ?? 1;
      // Normalize so all scores sum to 100%
      point.score = totalScore > 0 ? (point.score / totalScore) * 100 : 0;
    }
  }

  // Scale helper: map generation to x position (log or linear)
  const genToX = (gen: number): number => {
    if (GRAPH_GENERATION_USE_LOG_SCALE) {
      const maxLog = Math.log10(maxGeneration + 1);
      const logPos = Math.log10(gen + 1) / maxLog;
      return padding + logPos * graphWidth;
    } else {
      // Linear scale
      return padding + (gen / maxGeneration) * graphWidth;
    }
  };

  // Draw axes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, topPadding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw grid lines and labels
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  // Y-axis grid (0-100%)
  for (let i = 0; i <= 10; i++) {
    const y = height - padding - (i * graphHeight) / 10;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(`${i * 10}%`, padding - 5, y + 3);
  }

  // X-axis grid
  if (GRAPH_GENERATION_USE_LOG_SCALE) {
    // Logarithmic generations: 1, 10, 100, 1000, etc.
    let power = 0;
    while (Math.pow(10, power) - 1 <= maxGeneration) {
      const gen = Math.pow(10, power) - 1;
      const x = genToX(gen);

      ctx.strokeStyle = '#333333';
      ctx.beginPath();
      ctx.moveTo(x, topPadding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const label = gen === 0 ? '0' : `${Math.pow(10, power)}`;
      ctx.fillText(label, x, height - padding + 15);

      power++;
    }
  } else {
    // Linear scale: evenly spaced grid lines
    const numGridLines = 10;
    const step = Math.ceil(maxGeneration / numGridLines);
    for (let i = 0; i <= numGridLines; i++) {
      const gen = Math.min(i * step, maxGeneration);
      const x = genToX(gen);

      ctx.strokeStyle = '#333333';
      ctx.beginPath();
      ctx.moveTo(x, topPadding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(gen.toString(), x, height - padding + 15);
    }
  }

  // Axis labels
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Generation', width / 2, height - 5);

  ctx.save();
  ctx.translate(12, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Score (%)', 0, 0);
  ctx.restore();

  // Draw lines for each active config
  for (const config of activeCarConfigs.value) {
    const history = configHistories.get(config.shortName);
    if (!history || history.length === 0) continue;

    ctx.strokeStyle = config.colors.dark;
    ctx.lineWidth = 4;
    ctx.beginPath();

    let started = false;
    for (const point of history) {
      const x = genToX(point.generation);
      const y = height - padding - (point.score / 100) * graphHeight;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw label at the end of the line (above the dot)
    const lastPoint = history[history.length - 1];
    const lastX = genToX(lastPoint.generation);
    const lastY = height - padding - (lastPoint.score / 100) * graphHeight;

    // Draw dot at end (larger)
    ctx.fillStyle = config.colors.dark;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Draw label above the dot (larger font)
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(config.shortName, lastX, lastY - 12);
  }
};

// Watch for graph visibility and render when shown
watch(viewMode, (mode) => {
  if (mode === 'graph') {
    // Use nextTick to ensure canvas is mounted
    nextTick(() => renderGraph());
  }
});

// Update graph in real-time when visible
watch(frameCounter, () => {
  if (viewMode.value === 'graph') {
    renderGraph();
  }
});

// Watch for toggle of all car types - reset and reinitialize
watch(useAllCarTypes, () => {
  print(
    `[Toggle] ${
      useAllCarTypes.value
        ? 'Enabling all car types'
        : 'Using active car types only'
    }`
  );

  // Update population controller with new car type count
  populationController.setPopulation(POP_INITIAL);

  // Reset and reinitialize with new car types
  reset();
});

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
  justify-content: flex-start;
  gap: 8px;
  padding: 8px;
  margin: 0;
  height: 100vh;
  max-height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #4a7c4e;
  box-sizing: border-box;
}

.canvas-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  image-rendering: auto;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
}

.info-container {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: center;
  padding: 0 8px 8px 8px;
  width: 100%;
  max-width: 1200px;
  flex-shrink: 0;
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

.hud-content {
  width: 800px;
  max-width: calc(100vw - 32px);
  height: 280px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

@media (max-width: 850px) {
  .hud-content {
    width: 100%;
  }
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 14px;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.stats-table th {
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 4px 6px;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.stats-table td {
  padding: 4px 6px;
  color: #ffffff;
  text-align: center;
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

/* Compact mode for when ALL TYPES is toggled on */
.stats-table-compact {
  font-size: 9px !important;
}

.stats-table-compact th {
  padding: 1px 3px !important;
  font-size: 8px !important;
  letter-spacing: 0px !important;
}

.stats-table-compact td {
  padding: 1px 3px !important;
  line-height: 1.1;
}

/* Performance table specific styling */
.perf-table .label-cell {
  text-align: left;
  width: 60%;
  font-weight: bold;
}

.perf-table .value-cell {
  text-align: right;
  width: 40%;
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

/* Graph View */
.graph-view {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
}

.graph-view canvas {
  display: block;
  border-radius: 4px;
  background: #1a1a1a;
  width: 100%;
  height: 100%;
}
</style>
