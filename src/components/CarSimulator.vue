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
        <button @click="nextGeneration" class="btn-sync">
          SYNC<br />GEN
        </button>
        <button @click="reset" class="btn-restart">
          RESTART<br />SIM
        </button>
        <button @click="toggleAllCarTypes" class="btn-car-usage">
          TYPES<br />{{
            activeCarConfigs.length <= 5
              ? '🚗'.repeat(activeCarConfigs.length)
              : `${activeCarConfigs.length} x 🚗`
          }}
        </button>
        <button @click="cycleVisualizationMode" class="btn-toggle-viz">
          <span v-html="getVisualizationModeLabel(visualizationMode)"></span>
        </button>
        <button @click="toggleCarSpeed" class="btn-speed">
          SPEED<br />{{ '🏃'.repeat(carSpeedMultiplierIndex + 1) }}
        </button>
        <button @click="toggleSteeringSensitivity" class="btn-steering">
          STEER<br />{{ '↪️'.repeat(steeringSensitivityIndex + 1) }}
        </button>
        <button @click="toggleMutationRate" class="btn-mutation">
          MUTATE<br />{{ '🧬'.repeat(mutationRateIndex + 1) }}
        </button>
        <button @click="cycleBrainStrategy" class="btn-brain-strategy">
          <span v-html="getBrainStrategyLabel(brainSelectionStrategy)"></span>
        </button>
        <button @click="toggleBrainRotation" class="btn-brain-rotation">
          {{ TEXT_CHARACTER.brain }} OVERLAY<br />{{ rotateBrainOverlay ? 'TURNS' : 'UPRIGHT' }}
        </button>
      </div>

      <div class="hud">
        <div class="hud-content">
          <!-- Table View -->
          <table
            v-if="viewMode === 'table'"
            :class="[
              'stats-table',
              { 'stats-table-compact': carUsageLevel !== 'use-few' },
            ]"
            :style="{ fontSize: tableFontSize }"
            @click="cycleView"
          >
            <thead>
              <tr>
                <th>Score</th>
                <th>Type</th>
                <th>{{ isMobile() ? '#' : '# Alive' }}</th>
                <th>Gen</th>
                <th>{{ isMobile() ? 'MUT' : 'NEXT MUT' }}</th>
                <th>{{ isMobile() ? 'NEAR' : 'NEAR' }}</th>
                <th>Mean</th>
                <th>Best</th>
                <th>{{ isMobile() ? 'DUR' : 'DURATION' }}</th>
                <th>{{ isMobile() ? 'HID' : 'HIDDEN' }}</th>
                <th>{{ isMobile() ? 'ACTV' : 'ACTIVE' }}</th>
                <th>{{ isMobile() ? 'INPT' : 'INPUT' }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="config in sortedCarBrainConfigs"
                :key="config.shortName"
                :style="{ backgroundColor: config.colors.dark }"
              >
                <td class="bar-cell">
                  <PercentageBar
                    :percentage="scoreByConfigId.get(config.shortName) ?? 0"
                    variant="white"
                    :compact="carUsageLevel !== 'use-few'"
                  />
                </td>
                <td style="font-weight: bold">
                  {{ config.displayName }}
                </td>
                <td>
                  {{ getAliveCount(config.shortName) }}
                </td>
                <td>
                  {{ ga.getGeneration(config.shortName) }}
                </td>
                <td class="bar-cell">
                  <PercentageBar
                    :percentage="
                      mutationRatePercentByConfigId.get(config.shortName) ?? 0
                    "
                    variant="white"
                    :compact="carUsageLevel !== 'use-few'"
                  />
                </td>
                <td class="bar-cell">
                  <PercentageBar
                    :percentage="
                      nearnessPercentByConfigId.get(config.shortName) ?? 0
                    "
                    variant="white"
                    :compact="carUsageLevel !== 'use-few'"
                  />
                </td>
                <td class="bar-cell">
                  <PercentageBar
                    :percentage="getMeanFitnessPercentRaw(config.shortName)"
                    variant="white"
                    :compact="carUsageLevel !== 'use-few'"
                  />
                </td>
                <td class="bar-cell">
                  <PercentageBar
                    :percentage="getBestFitnessPercentRaw(config.shortName)"
                    variant="white"
                    :compact="carUsageLevel !== 'use-few'"
                  />
                </td>
                <td>
                  {{ getBestLapTime(config.shortName) }}
                </td>
                <td>
                  {{ getHiddenLayers(config.nn.architecture) }}
                </td>
                <td
                  class="colored-cell"
                  :style="{
                    backgroundColor: getActivationColor(
                      config.nn.activationType
                    ),
                  }"
                >
                  {{
                    isMobile()
                      ? config.nn.activationType.charAt(0)
                      : config.nn.activationType
                  }}
                </td>
                <td
                  class="colored-cell"
                  :style="{
                    backgroundColor: getInputColor(config.nn.inputModification),
                  }"
                >
                  {{
                    isMobile()
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
            <div class="perf-tables-container">
              <!-- Left Column -->
              <table class="stats-table perf-table">
                <thead>
                  <tr>
                    <th colspan="2">Frame Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="label-cell">FPS Avg</td>
                    <td class="value-cell">
                      {{ currentFps.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 99.9%</td>
                    <td class="value-cell">
                      {{ fps99_9Percent.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 99.0%</td>
                    <td class="value-cell">
                      {{ fps99Percent.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 1.0%</td>
                    <td class="value-cell">
                      {{ fps1Percent.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">FPS 0.1%</td>
                    <td class="value-cell">
                      {{ fps0_1Percent.toFixed(1) }}
                    </td>
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
              <table class="stats-table perf-table">
                <thead>
                  <tr>
                    <th colspan="2">System Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="label-cell">
                      {{ TEXT_TARGET_NUMBER_PER_CAR_TYPE }}
                      {{ TEXT_CHARACTER.saved }}
                    </td>
                    <td class="value-cell">
                      {{ savedPerformanceTargetPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">
                      {{ TEXT_TARGET_NUMBER_PER_CAR_TYPE }}
                    </td>
                    <td class="value-cell">
                      {{ actualPerformanceTargetPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">
                      {{ TEXT_TARGET_NUMBER_PER_CAR_TYPE }}
                      {{ TEXT_CHARACTER.up }}
                    </td>
                    <td class="value-cell">
                      {{ performanceTargetCarsPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">
                      {{ TEXT_TARGET_NUMBER_PER_CAR_TYPE }}
                      {{ TEXT_CHARACTER.down }}
                    </td>
                    <td class="value-cell">
                      {{ performanceTargetCarsPerTypeDown.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">Avg per {{ TEXT_CHARACTER.car }}</td>
                    <td class="value-cell">
                      {{ averageCarsPerType.toFixed(1) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="label-cell">Total {{ TEXT_CHARACTER.car }}</td>
                    <td class="value-cell">{{ totalCars }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Alive {{ TEXT_CHARACTER.car }}</td>
                    <td class="value-cell">{{ aliveCars }}</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Dead {{ TEXT_CHARACTER.car }}</td>
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
                          ? TEXT_CHARACTER.up
                          : performanceTrend < 0
                          ? TEXT_CHARACTER.down
                          : TEXT_CHARACTER.neutral
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
import { NeuralNetwork } from '@/core/Neural';
import { GeneticAlgorithm } from '@/core/GA';
import { PerformanceMonitor } from '@/core/PerformanceMonitor';
import { PopulationController } from '@/core/PopulationController';
import PercentageBar from './PercentageBar.vue';
import type {
  CarBrainConfig,
  InputModificationType,
  ActivationType,
  SpeedMultiplier,
  BrainSelectionStrategy,
  GenerationMarker,
  CarUsageLevel,
  ViewMode,
  InfoView,
  VisualizationMode,
} from '@/types';
import {
  BRAIN_SELECTION_STRATEGIES,
  ACTIVATION_COLORS,
  INPUT_COLORS,
  VISUALIZATION_MODES,
} from '@/types';
import {
  SPEED_MULTIPLIERS,
} from '@/types';
import {
  CONFIG,
  print,
  getMutationRate,
  countTrainableParameters,
  getParameterBasedMutationScale,
  isMobile,
  getPopulationSize,
  track_waypoints_ratios,
} from '@/config';
import {
  CAR_BRAIN_CONFIGS,
  CAR_BRAIN_CONFIGS_DEFINED,
  getCarBrainConfigsByLevel,
  getCarUsageLevelInfo,
  getNextCarUsageLevel,
} from '@/core/config_cars';
import {
  TEXT_CHARACTER,
  TEXT_TARGET_NUMBER_PER_CAR_TYPE,
} from '@/core/config_text';

const canvasRef = ref<HTMLCanvasElement | null>(null);
// Keep canvas at fixed internal resolution for rendering
const canvasWidth = CONFIG.canvas.width;
const canvasHeight = CONFIG.canvas.height;

const track = new Track(CONFIG.track.halfWidth);

// Calculate min/max trainable parameters across all car brain architectures
// Used for parameter-based mutation scaling
let minParameters = Infinity;
let maxParameters = 0;
for (const config of CAR_BRAIN_CONFIGS_DEFINED) {
  const paramCount = countTrainableParameters(config.nn.architecture);
  minParameters = Math.min(minParameters, paramCount);
  maxParameters = Math.max(maxParameters, paramCount);
}

// Use truly random seed based on current time and Math.random()
let randomSeed = Date.now() + Math.random() * 1000000;
const ga = ref<GeneticAlgorithm>(new GeneticAlgorithm(randomSeed));

const population = ref<Car[]>([]) as Ref<Car[]>;
const visualizationMode = ref<VisualizationMode>(
  CONFIG.defaults.defaultVisualizationMode
);

// Computed properties derived from visualizationMode
const showRays = computed(() => visualizationMode.value !== 'vis-simple');

// Computed property to find the lead car (max distance) for each car type
const leadCarByConfigId = computed(() => {
  const leadCars = new Map<string, Car>();

  // Group cars by config type and find the one with max distance for each
  for (const car of population.value) {
    if (!car.alive) continue; // Only consider alive cars

    const currentLead = leadCars.get(car.configShortName);
    if (
      !currentLead ||
      car.maxDistanceReached > currentLead.maxDistanceReached
    ) {
      leadCars.set(car.configShortName, car);
    }
  }

  return leadCars;
});

const speedMultiplier = ref(1);
const carSpeedMultiplierIndex = ref<number>(
  CONFIG.defaults.speedMultiplierIndex
);
const steeringSensitivityIndex = ref<number>(CONFIG.car.physics.defaultSteeringSensitivity);
const mutationRateIndex = ref<number>(CONFIG.geneticAlgorithm.mutation.defaultStartingRate);
const mutationByDistance = ref(CONFIG.defaults.mutationByDistance);
const delayedSteering = ref(CONFIG.defaults.delayedSteering);
const brainSelectionStrategy = ref<BrainSelectionStrategy>(
  CONFIG.geneticAlgorithm.brainSelection.defaultStrategy
);
const carUsageLevel = ref<CarUsageLevel>(CONFIG.defaults.defaultCarUsageLevel);
const frameCounter = ref(0);

// Computed values from indices
const carSpeedMultiplier = computed<SpeedMultiplier>(() => SPEED_MULTIPLIERS[carSpeedMultiplierIndex.value]);
const steeringSensitivity = computed(() => CONFIG.car.physics.steeringSensitivityValues[steeringSensitivityIndex.value]);
const mutationRate = computed(() => CONFIG.geneticAlgorithm.mutation.startingRates[mutationRateIndex.value]);

// Parse InfoView config into separate viewMode and graphType states
const parseInfoView = (
  infoView: InfoView
): { viewMode: ViewMode; graphType: 'completion' | 'rate' | 'score' } => {
  switch (infoView) {
    case 'table-cars':
      return { viewMode: 'table', graphType: 'completion' };
    case 'graph-completion':
      return { viewMode: 'graph', graphType: 'completion' };
    case 'graph-rate':
      return { viewMode: 'graph', graphType: 'rate' };
    case 'graph-score':
      return { viewMode: 'graph', graphType: 'score' };
    case 'table-fps':
      return { viewMode: 'performance', graphType: 'completion' };
  }
};

const initialView = parseInfoView(CONFIG.defaults.defaultInfoView);
const viewMode = ref<ViewMode>(initialView.viewMode);
const graphType = ref<'completion' | 'rate' | 'score'>(initialView.graphType);
const graphCanvasRef = ref<HTMLCanvasElement | null>(null);
const rotateBrainOverlay = ref(CONFIG.visualization.rotateBrainOverlay);

const activeCarConfigs = computed(() => {
  return getCarBrainConfigsByLevel(carUsageLevel.value);
});

// Dynamic font size based on number of car types
const tableFontSize = computed(() => {
  const count = activeCarConfigs.value.length;
  if (count <= 3) {
    return '16px'; // Large text for few cars
  } else if (count <= 6) {
    return '14px'; // Normal text for moderate number
  } else if (count <= 10) {
    return '11px'; // Smaller text for many cars
  } else {
    return '9px'; // Very small text for lots of cars
  }
});

// ============================================================================
// Performance Management System
// ============================================================================
// Professional performance monitoring and adaptive population control

// Performance Monitor: Tracks FPS, stability, trends, and other metrics
const performanceMonitor = new PerformanceMonitor(
  CONFIG.performance.targetFPS,
  CONFIG.performance.monitoring.historySize
);

// Population Controller: Single-threshold adaptive population management (works with cars per type)
const populationController = new PopulationController(
  {
    targetFps: CONFIG.performance.targetFPS,
    minPopulation: CONFIG.geneticAlgorithm.population.bounds.min,
    maxPopulation: CONFIG.geneticAlgorithm.population.bounds.max,
    initialPopulation: getPopulationSize(),
    maxChangeRate: CONFIG.geneticAlgorithm.population.adjustment.maxChangeRate,
    adjustmentInterval:
      CONFIG.geneticAlgorithm.population.adjustment.intervalFrames,
  },
  CAR_BRAIN_CONFIGS.length
); // Initial setup uses default active configs

// UI state (for reactive display)
const currentFps = ref(60);
const performanceTargetCarsPerType = ref(
  getPopulationSize() / CAR_BRAIN_CONFIGS.length
);
const averageCarsPerType = ref(
  CONFIG.geneticAlgorithm.population.average.initial
);
let averageCarsPerTypeFrameCounter = 0;
const performanceTargetCarsPerTypeDown = computed(
  () => averageCarsPerType.value * 0.9
);
const actualPerformanceTargetPerType = ref(
  getPopulationSize() / CAR_BRAIN_CONFIGS.length
);
const savedPerformanceTargetPerType = ref(
  getPopulationSize() / CAR_BRAIN_CONFIGS.length
);
const targetPopulationTotal = computed(
  () => performanceTargetCarsPerType.value * activeCarConfigs.value.length
);
const performanceStability = ref(1.0);
const performanceTrend = ref(0);
const performanceHeadroom = ref(1.0);
const fps0_1Percent = ref(60); // 0.1% low
const fps1Percent = ref(60); // 1% low
const fps99Percent = ref(60); // 99% (1% high)
const fps99_9Percent = ref(60); // 99.9% (0.1% high)

// Profiling metrics (for display)
const avgFrameTime = ref(16.67);
const avgUpdateTime = ref(0);
const avgRenderTime = ref(0);
const updateTimeHistory: number[] = [];
const renderTimeHistory: number[] = [];
const HISTORY_SIZE = 60;

// Population control state
const adaptivePopulation = ref(CONFIG.performance.enabled);

// Dynamic generation tracking for all config types
const generationTimeByConfigId = ref<Map<string, number>>(new Map());
const generationMarkersByConfigId = ref<Map<string, GenerationMarker[]>>(
  new Map()
);
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
 * Uses relative comparisons between all car types:
 * - Lap speed (50%): Fastest lap gets 100, slowest gets 0
 * - Mean performance (25%): Direct percentage
 * - Best performance (12.5%): Direct percentage
 * - Learning efficiency (12.5%): Fewest generations gets 100, most gets 0
 * Returns a 0-100 score
 */
const calculateComprehensiveScore = (shortName: string): number => {
  // Gather data for all active car configs for relative comparison
  const allConfigs = activeCarConfigs.value;

  // Component 1: Lap Speed Bonus - Relative to all car types (highest priority)
  let speedScore = 0;
  const lapTime = bestLapTimeByConfigId.value.get(shortName);

  // Get all lap times that have completed at least one lap
  const allLapTimes = allConfigs
    .map((c) => bestLapTimeByConfigId.value.get(c.shortName))
    .filter((t) => t !== undefined && t !== Infinity) as number[];

  if (lapTime !== undefined && lapTime !== Infinity && allLapTimes.length > 0) {
    const minLapTime = Math.min(...allLapTimes); // Fastest (best)
    const maxLapTime = Math.max(...allLapTimes); // Slowest (worst)

    if (maxLapTime > minLapTime) {
      // Scale: fastest gets 100, slowest gets 0
      const speedRaw =
        100 * (1 - (lapTime - minLapTime) / (maxLapTime - minLapTime));
      speedScore = speedRaw * CONFIG.scoring.weights.lapSpeedBonus;
    } else {
      // All lap times are equal
      speedScore = 100 * CONFIG.scoring.weights.lapSpeedBonus;
    }
  }

  // Component 2: Mean Performance - Consistent track completion
  const meanCompletion = getMeanFitnessPercentRaw(shortName); // 0-100
  const meanScore = meanCompletion * CONFIG.scoring.weights.meanPerformance;

  // Component 3: Best Performance - Peak capability achieved
  const bestCompletion = getBestFitnessPercentRaw(shortName); // 0-100
  const bestScore = bestCompletion * CONFIG.scoring.weights.bestPerformance;

  // Component 4: Learning Efficiency - Relative to all car types
  let efficiencyScore = 0;
  const generations = ga.value.getGeneration(shortName);
  const allGenerations = allConfigs.map((c) =>
    ga.value.getGeneration(c.shortName)
  );
  const minGenerations = Math.min(...allGenerations); // Fewest (best)
  const maxGenerations = Math.max(...allGenerations); // Most (worst)

  if (maxGenerations > minGenerations) {
    // Scale: fewest generations gets 100, most gets 0
    const efficiencyRaw =
      100 *
      (1 - (generations - minGenerations) / (maxGenerations - minGenerations));
    efficiencyScore = efficiencyRaw * CONFIG.scoring.weights.learningEfficiency;
  } else {
    // All have same generation count
    efficiencyScore = 100 * CONFIG.scoring.weights.learningEfficiency;
  }

  // Total weighted score (0-100)
  return meanScore + bestScore + efficiencyScore + speedScore;
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

// Computed property for nearness to all-time best death point (0 to 1)
const nearnessPercentByConfigId = computed(() => {
  void frameCounter.value; // Trigger on every frame

  // If debug flag is set, return 0 for all configs
  if (CONFIG.debug.disableNearnessCalculation) {
    const nearnesses = new Map<string, number>();
    for (const config of activeCarConfigs.value) {
      nearnesses.set(config.shortName, 0);
    }
    return nearnesses;
  }

  const trackLength = track.getTotalLength();

  const nearnesses = new Map<string, number>();

  for (const config of activeCarConfigs.value) {
    // Get all-time best distance for this car type
    const alltimeBestDistance = ga.value.getBestFitness(config.shortName);

    // If no all-time best point exists yet (no deaths recorded), nearness stays at 0
    if (alltimeBestDistance === 0) {
      nearnesses.set(config.shortName, 0);
      continue;
    }

    // If all-time best completed the lap (at finish line), nearness stays at 0
    if (alltimeBestDistance >= trackLength) {
      nearnesses.set(config.shortName, 0);
      continue;
    }

    // Get current generation's best distance
    const carsOfType = population.value.filter(
      (car) => car.configShortName === config.shortName
    );
    const currentBestDistance =
      carsOfType.length > 0
        ? Math.max(...carsOfType.map((car) => car.maxDistanceReached))
        : 0;

    // Calculate nearness using infinity-based asymptotic approach
    // The idea: measure the ABSOLUTE GAP to the all-time best point
    // Formula: 1 / (1 + scaledGap) creates a hyperbolic curve
    // Stays near 0 when gap is large, explodes to 1 when gap approaches 0

    const scaleFactor = 100; // Adjust this to control explosion steepness

    let nearness: number;

    if (currentBestDistance <= alltimeBestDistance) {
      // Approaching the all-time best point
      const gap = alltimeBestDistance - currentBestDistance;

      // Scale the gap relative to the all-time best distance
      const scaledGap = (gap / alltimeBestDistance) * scaleFactor;

      // Hyperbolic function: stays near 0 until gap is tiny, then explodes
      nearness = 1 / (1 + scaledGap);
    } else {
      // Past the all-time best point - mirror the approach
      const remainingToEnd = trackLength - alltimeBestDistance;

      if (remainingToEnd <= 0) {
        nearness = 0;
      } else {
        const gap = currentBestDistance - alltimeBestDistance;

        // Scale the gap relative to remaining distance to end
        const scaledGap = (gap / remainingToEnd) * scaleFactor;

        // Hyperbolic function: explodes down from 1 to 0
        nearness = 1 / (1 + scaledGap);
      }
    }

    nearnesses.set(config.shortName, nearness * 100); // Convert to percentage
  }

  return nearnesses;
});

// Computed property for mutation rates as raw percentages (for bars)
const mutationRatePercentByConfigId = computed(() => {
  void frameCounter.value; // Trigger on every frame
  const isMutationByDistance = mutationByDistance.value; // Trigger on toggle
  const trackLength = track.getTotalLength();

  const percentages = new Map<string, number>();

  for (const config of activeCarConfigs.value) {
    // Calculate base mutation rate from track progress
    let baseRate: number;
    if (isMutationByDistance) {
      const carsOfType = population.value.filter(
        (car) => car.configShortName === config.shortName
      );
      const currentBest =
        carsOfType.length > 0
          ? Math.max(...carsOfType.map((car) => car.maxDistanceReached))
          : 0;

      const bestDistance = currentBest;

      baseRate = getMutationRate(
        mutationByDistance.value,
        bestDistance,
        trackLength,
        mutationRateIndex.value
      );
    } else {
      // When MUT DIST is OFF, use constant minimum mutation
      baseRate = getMutationRate(false, 0, trackLength, mutationRateIndex.value);
    }

    // Apply parameter-based scaling (larger networks get lower rates)
    const paramCount = countTrainableParameters(config.nn.architecture);
    const paramScale = getParameterBasedMutationScale(
      paramCount,
      minParameters,
      maxParameters
    );
    const scaledRate = baseRate * paramScale;

    // Normalize to 0-100% range (mutation starting rate is max)
    const maxStartingRate = Math.max(...CONFIG.geneticAlgorithm.mutation.startingRates);
    const normalizedPercent = (scaledRate / maxStartingRate) * 100;
    percentages.set(config.shortName, normalizedPercent);
  }

  return percentages;
});

// Get background color for activation type (uses centralized colors from types.ts)
const getActivationColor = (activationType: ActivationType): string => {
  return ACTIVATION_COLORS[activationType];
};

// Get background color for input modification type (uses centralized colors from types.ts)
const getInputColor = (inputModification: InputModificationType): string => {
  return INPUT_COLORS[inputModification];
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
  return lapTime.toFixed(3) + 's';
};

const getAliveCount = (shortName: string): number => {
  return population.value.filter(
    (car) => car.configShortName === shortName && car.alive
  ).length;
};

// Cycle through views: table-cars -> graph-completion -> graph-rate -> graph-score -> table-fps -> table-cars
const cycleView = () => {
  if (viewMode.value === 'table') {
    viewMode.value = 'graph';
    graphType.value = 'completion';
  } else if (viewMode.value === 'graph') {
    if (graphType.value === 'completion') {
      graphType.value = 'rate';
    } else if (graphType.value === 'rate') {
      graphType.value = 'score';
    } else {
      viewMode.value = 'performance';
    }
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

    // Get generation duration
    const genDuration =
      generationTimeByConfigId.value.get(config.shortName) ?? 0;

    // Calculate comprehensive score for this generation
    const comprehensiveScore = calculateComprehensiveScore(config.shortName);

    // Add new marker with temporary flags
    markers.push({
      x: bestCar.x,
      y: bestCar.y,
      generation: ga.value.getGeneration(config.shortName),
      fitness: bestCar.maxDistanceReached,
      duration: genDuration,
      score: comprehensiveScore,
      isAllTimeBest: false, // Will be calculated below
      isLastGenBest: true, // This is the most recent generation
    });

    // Update flags for all markers BEFORE pruning
    // 1. Set all previous markers' isLastGenBest to false
    for (let i = 0; i < markers.length - 1; i++) {
      markers[i].isLastGenBest = false;
    }

    // 2. Find the marker with highest fitness and mark it as all-time best
    let maxFitness = -Infinity;
    let maxFitnessIndex = -1;
    for (let i = 0; i < markers.length; i++) {
      if (markers[i].fitness > maxFitness) {
        maxFitness = markers[i].fitness;
        maxFitnessIndex = i;
      }
    }

    // 3. Update all markers' isAllTimeBest flag
    for (let i = 0; i < markers.length; i++) {
      markers[i].isAllTimeBest = i === maxFitnessIndex;
    }

    // 4. Prune markers, but ALWAYS keep the all-time best
    if (markers.length > CONFIG.visualization.generationMarker.maxHistory) {
      const allTimeBestMarker = markers[maxFitnessIndex];

      // Keep the most recent markers
      const recentMarkers = markers.slice(
        -CONFIG.visualization.generationMarker.maxHistory
      );

      // Check if all-time best is already in recent markers
      const allTimeBestInRecent = recentMarkers.some(
        (m) => m.generation === allTimeBestMarker.generation
      );

      if (!allTimeBestInRecent) {
        // All-time best is old, so we need to keep it separately
        // Keep all-time best + most recent (maxHistory - 1) markers
        const keepCount = CONFIG.visualization.generationMarker.maxHistory - 1;
        const markersToKeep = [allTimeBestMarker, ...markers.slice(-keepCount)];

        // Sort by generation to maintain chronological order
        markersToKeep.sort((a, b) => a.generation - b.generation);
        markers.splice(0, markers.length, ...markersToKeep);
      } else {
        // All-time best is recent, just keep the most recent markers
        markers.splice(
          0,
          markers.length - CONFIG.visualization.generationMarker.maxHistory
        );
      }
    }

    generationMarkersByConfigId.value.set(config.shortName, markers);
  }

  // Evolve this population with per-type target population (based on current FPS)
  const generationTime =
    generationTimeByConfigId.value.get(config.shortName) ?? 0;

  // Use "Up" target if above threshold, "Down" target if below threshold
  const targetCarsPerType =
    fps0_1Percent.value >=
    CONFIG.geneticAlgorithm.population.adjustment.thresholdFPS
      ? performanceTargetCarsPerType.value
      : performanceTargetCarsPerTypeDown.value;

  // Update the actual performance target being used (raw value)
  actualPerformanceTargetPerType.value = targetCarsPerType;

  // Get nearness value for this config (convert from percentage to ratio)
  const nearnessPercent =
    nearnessPercentByConfigId.value.get(config.shortName) ?? 0;
  const nearnessRatio = nearnessPercent / 100;

  const newCars = ga.value.evolvePopulation(
    configCars,
    config,
    track,
    generationTime,
    winnerCar,
    mutationByDistance.value,
    savedPerformanceTargetPerType.value,
    brainSelectionStrategy.value,
    nearnessRatio,
    mutationRateIndex.value
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
        CONFIG.car.physics.steeringDelaySeconds,
        carSpeedMultiplier.value,
        steeringSensitivity.value
      );

      // Update fitness and check for backwards movement
      // Distance already calculated in car.update(), reuse it for performance
      car.fitness = car.lastCenterlineDistanceAlongTrack;
      car.updateSignedFitness(
        car.lastCenterlineDistanceAlongTrack,
        trackLength
      );

      // Diagnostic: Log when cars get close to completion
      if (
        car.currentProgressRatio >= 0.8 &&
        car.currentProgressRatio < CONFIG.lap.completionThreshold &&
        frameCounter.value % 60 === 0
      ) {
        print(
          `[CLOSE] ${car.configShortName} at ${(
            car.currentProgressRatio * 100
          ).toFixed(1)}% (need ${(CONFIG.lap.completionThreshold * 100).toFixed(
            0
          )}%)`
        );
      }

      // Check if car completed a lap (reached threshold progress)
      // Use threshold < 1.0 to account for discrete physics updates
      // Cars may not land exactly at the finish line due to frame timing
      if (car.currentProgressRatio >= CONFIG.lap.completionThreshold) {
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

            print(
              `[DEBUG] Lap completion triggered! Config: ${
                config.shortName
              }, Progress: ${(car.currentProgressRatio * 100).toFixed(
                2
              )}%, Timer: ${completionTime.toFixed(2)}s`
            );

            // Verify this is tracking per car type
            print(
              `[DEBUG] Recording lap for car type: ${config.shortName} (${config.displayName})`
            );

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
                `[Lap Complete] ${TEXT_CHARACTER.trophy} ${
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

      // Kill car if it has gone backwards
      if (car.alive && car.hasGoneBackwards()) {
        car.alive = false;
        car.speed = 0;
      }

      // Kill car if it hasn't made minimum progress after 1 second
      if (car.alive && car.hasFailedMinimumProgress()) {
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
      // Log max progress reached before evolving
      const maxProgress = Math.max(
        ...configCars.map((c) => c.currentProgressRatio)
      );
      print(
        `[DEBUG] ${config.shortName} max progress: ${(
          maxProgress * 100
        ).toFixed(2)}% (threshold: ${(
          CONFIG.lap.completionThreshold * 100
        ).toFixed(1)}%)`
      );

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
  if (CONFIG.visualization.debugShowWaypoints) {
    ctx.fillStyle = CONFIG.visualization.waypoints.colors.marker;
    ctx.font = `bold ${CONFIG.visualization.waypoints.fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Iterate over ratio waypoints and scaled waypoints in parallel
    for (let i = 0; i < track_waypoints_ratios.length; i++) {
      const ratioPoint = track_waypoints_ratios[i];
      const scaledPoint = CONFIG.track.waypoints.base[i];

      ctx.beginPath();
      ctx.arc(
        scaledPoint.x,
        scaledPoint.y,
        CONFIG.visualization.waypoints.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = CONFIG.visualization.waypoints.colors.text;
      ctx.strokeStyle = CONFIG.visualization.waypoints.colors.textStroke;
      ctx.lineWidth = 3;
      const coordText = `(${ratioPoint.x.toFixed(4)}, ${ratioPoint.y.toFixed(
        4
      )})`;
      ctx.strokeText(
        coordText,
        scaledPoint.x,
        scaledPoint.y + CONFIG.visualization.waypoints.textOffset
      );
      ctx.fillText(
        coordText,
        scaledPoint.x,
        scaledPoint.y + CONFIG.visualization.waypoints.textOffset
      );
      ctx.fillStyle = CONFIG.visualization.waypoints.colors.marker;
    }
  }

  // Render generation markers dynamically for active configs (only if showRays is enabled)
  if (showRays.value) {
    ctx.font = `bold ${CONFIG.visualization.generationMarker.fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const config of activeCarConfigs.value) {
      const markers =
        generationMarkersByConfigId.value.get(config.shortName) ?? [];

      ctx.fillStyle = config.colors.dark;

      for (const marker of markers) {
        // Draw the marker dot
        ctx.beginPath();
        ctx.arc(
          marker.x,
          marker.y,
          CONFIG.visualization.generationMarker.radius,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Draw generation number above the dot (if enabled)
        if (CONFIG.visualization.generationMarker.showGenerationNumber) {
          ctx.fillText(
            marker.generation.toString(),
            marker.x,
            marker.y -
              CONFIG.visualization.generationMarker.radius +
              CONFIG.visualization.generationMarker.textOffset
          );
        }

        // Conditionally show emojis based on brain selection strategy
        const showRepeat =
          (brainSelectionStrategy.value === 'generation' ||
            brainSelectionStrategy.value === 'sexual' ||
            brainSelectionStrategy.value === 'overcorrect') &&
          marker.isLastGenBest;
        const showTrophy =
          (brainSelectionStrategy.value === 'alltime' ||
            brainSelectionStrategy.value === 'sexual' ||
            brainSelectionStrategy.value === 'overcorrect') &&
          marker.isAllTimeBest;

        // Draw repeat emoji to the left if this is last generation's best (and strategy uses it)
        if (showRepeat) {
          ctx.fillText(
            TEXT_CHARACTER.repeat,
            marker.x - CONFIG.visualization.generationMarker.radius * 3,
            marker.y
          );
        }

        // Draw trophy emoji to the right if this is all-time best (and strategy uses it)
        if (showTrophy) {
          ctx.fillText(
            TEXT_CHARACTER.trophy,
            marker.x + CONFIG.visualization.generationMarker.radius * 3,
            marker.y
          );
        }
      }
    }
  }

  // Render cars in proper layering order: rays -> car bodies -> overlays
  const deadCars = population.value.filter((car) => !car.alive);
  const aliveCars = population.value.filter((car) => car.alive);

  // Separate elites (now identified by size multiplier > 1.0)
  const elites = aliveCars.filter((car) => car.sizeMultiplier > 1.0);
  const others = aliveCars.filter((car) => car.sizeMultiplier === 1.0);

  // FIRST PASS: Render all rays (if enabled)
  if (showRays.value) {
    // Render rays for other alive cars
    for (const car of others) {
      car.renderRays(ctx);
    }

    // Render rays for elites
    for (const car of elites) {
      car.renderRays(ctx);
    }
  }

  // SECOND PASS: Render all car bodies (physical cars only)
  // Render dead cars first
  for (const car of deadCars) {
    car.render(ctx, 'simple', visualizationMode.value, rotateBrainOverlay.value);
  }

  // Render other alive cars
  for (const car of others) {
    car.render(ctx, 'simple', visualizationMode.value, rotateBrainOverlay.value);
  }

  // Render elites last (on top)
  for (const car of elites) {
    car.render(ctx, 'simple', visualizationMode.value, rotateBrainOverlay.value);
  }

  // THIRD PASS: Render detailed overlays for lead cars on top of everything
  const isDetailedMode =
    visualizationMode.value === 'vis-weights' ||
    visualizationMode.value === 'vis-think';
  if (isDetailedMode) {
    for (const car of population.value) {
      if (!car.alive) continue; // Only show overlays for alive cars

      // Check if this car is the lead car for its type
      const leadCar = leadCarByConfigId.value.get(car.configShortName);
      if (car === leadCar) {
        car.render(ctx, 'detailed', visualizationMode.value, rotateBrainOverlay.value);
      }
    }
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

  // Update UI metrics (configurable interval via performance UI update interval)
  if (updateTimeHistory.length % CONFIG.performance.ui.updateInterval === 0) {
    const metrics = performanceMonitor.getMetrics();

    // FPS Avg: Always use exponential moving average
    currentFps.value =
      metrics.currentFps * (1 - CONFIG.performance.fpsCalcSavedWeight) +
      currentFps.value * CONFIG.performance.fpsCalcSavedWeight;

    avgFrameTime.value = metrics.frameTimeMs;
    performanceStability.value = metrics.stability;
    performanceTrend.value = metrics.trend;
    performanceHeadroom.value = metrics.headroom;

    // FPS Low trackers: Immediately jump to lower values, gradually rise with higher values
    // 0.1% low
    if (metrics.p0_1Fps < fps0_1Percent.value || fps0_1Percent.value === 0) {
      fps0_1Percent.value = metrics.p0_1Fps; // Immediate drop
    } else {
      fps0_1Percent.value =
        metrics.p0_1Fps * (1 - CONFIG.performance.fpsCalcSavedWeight) +
        fps0_1Percent.value * CONFIG.performance.fpsCalcSavedWeight; // Gradual rise
    }

    // 1% low
    if (metrics.p1Fps < fps1Percent.value || fps1Percent.value === 0) {
      fps1Percent.value = metrics.p1Fps; // Immediate drop
    } else {
      fps1Percent.value =
        metrics.p1Fps * (1 - CONFIG.performance.fpsCalcSavedWeight) +
        fps1Percent.value * CONFIG.performance.fpsCalcSavedWeight; // Gradual rise
    }

    // FPS High trackers: Immediately jump to higher values, gradually decay with lower values
    // 99% (1% high)
    if (metrics.p99Fps > fps99Percent.value) {
      fps99Percent.value = metrics.p99Fps; // Immediate rise
    } else {
      fps99Percent.value =
        metrics.p99Fps * (1 - CONFIG.performance.fpsCalcSavedWeight) +
        fps99Percent.value * CONFIG.performance.fpsCalcSavedWeight; // Gradual decay
    }

    // 99.9% (0.1% high)
    if (metrics.p99_9Fps > fps99_9Percent.value) {
      fps99_9Percent.value = metrics.p99_9Fps; // Immediate rise
    } else {
      fps99_9Percent.value =
        metrics.p99_9Fps * (1 - CONFIG.performance.fpsCalcSavedWeight) +
        fps99_9Percent.value * CONFIG.performance.fpsCalcSavedWeight; // Gradual decay
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
            ? TEXT_CHARACTER.up
            : adjustment.metrics.trend < 0
            ? TEXT_CHARACTER.down
            : TEXT_CHARACTER.neutral
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
  if (
    averageCarsPerTypeFrameCounter >=
    CONFIG.geneticAlgorithm.population.average.updateInterval
  ) {
    averageCarsPerTypeFrameCounter = 0;
    // Calculate actual alive cars per type from alive car count
    const currentAliveCarsPerType =
      aliveCars.value / activeCarConfigs.value.length;
    // Formula: saved_average = new_value * NEW_WEIGHT + saved_average * SAVED_WEIGHT
    averageCarsPerType.value =
      currentAliveCarsPerType *
        (1 - CONFIG.geneticAlgorithm.population.average.savedWeight) +
      averageCarsPerType.value *
        CONFIG.geneticAlgorithm.population.average.savedWeight;
  }

  // Update saved performance target per type every frame using exponential moving average
  // Formula: saved = new * (1 - SAVED_WEIGHT) + saved * SAVED_WEIGHT
  savedPerformanceTargetPerType.value =
    actualPerformanceTargetPerType.value *
      (1 - CONFIG.geneticAlgorithm.population.average.savedWeight) +
    savedPerformanceTargetPerType.value *
      CONFIG.geneticAlgorithm.population.average.savedWeight;

  // Increment frame counter for Vue reactivity
  frameCounter.value++;

  animationFrameId = requestAnimationFrame(animate);
};

// Manually trigger next generation for all active populations
// Restart current generation for all car types (SYNC button)
// This restarts all car types at the same generation, using their current generation's weights
const nextGeneration = () => {
  for (const config of activeCarConfigs.value) {
    restartCurrentGeneration(config);
  }
};

// Restart a specific car type's current generation
// Uses the same weights that started this generation (doesn't evolve or select a winner)
const restartCurrentGeneration = (config: CarBrainConfig) => {
  const configCars = population.value.filter(
    (car) => car.configShortName === config.shortName
  );
  const otherCars = population.value.filter(
    (car) => car.configShortName !== config.shortName
  );

  // Get current generation's weights (these are the weights this generation started with)
  const bestWeights = ga.value.getBestWeights(config.shortName);

  if (!bestWeights) {
    // No weights yet (generation 0), just reinitialize
    print(`[SYNC] ${config.displayName}: No weights yet, skipping restart`);
    return;
  }

  const carsPerType = Math.round(savedPerformanceTargetPerType.value);

  print(
    `[SYNC] ${
      config.displayName
    }: Restarting generation ${ga.value.getGeneration(
      config.shortName
    )} with ${carsPerType} cars`
  );

  // Create new cars from the current generation's weights
  const newCars: Car[] = [];
  const eliteBrain = NeuralNetwork.fromJSON(
    bestWeights,
    Math.random() * 1000000,
    config.nn.architecture,
    config.nn.activationType
  );

  // Calculate mutation rate
  const trackLength = track.getTotalLength();
  const bestDistance = configCars.reduce(
    (max, car) => Math.max(max, car.maxDistanceReached),
    0
  );
  const baseMutationRate = getMutationRate(
    mutationByDistance.value,
    bestDistance,
    trackLength,
    mutationRateIndex.value
  );

  // Create cars: 1 elite + (carsPerType - 1) mutations
  for (let i = 0; i < carsPerType; i++) {
    const angleWiggle =
      (Math.random() - 0.5) * 2 * CONFIG.car.spawn.angleWiggle;
    const startAngle = track.startAngle + angleWiggle;

    if (i === 0) {
      // Elite car (exact copy of best brain, larger size)
      newCars.push(
        new Car(
          track.startPosition.x,
          track.startPosition.y,
          startAngle,
          eliteBrain,
          config.colors.dark,
          config.nn.inputModification,
          config.shortName,
          CONFIG.car.eliteSizeMultiplier
        )
      );
    } else {
      // Mutated car
      const mutationSeed = Math.random() * 1000000 + i;
      const sigma = baseMutationRate; // Use base mutation rate without curve
      const mutatedBrain = eliteBrain.mutate(sigma, mutationSeed);

      newCars.push(
        new Car(
          track.startPosition.x,
          track.startPosition.y,
          startAngle,
          mutatedBrain,
          config.colors.light,
          config.nn.inputModification,
          config.shortName,
          1.0 // Normal size
        )
      );
    }
  }

  // Reset timers for this config
  generationTimeByConfigId.value.set(config.shortName, 0);
  lapCompletionTimeByConfigId.value.set(config.shortName, Infinity);

  // Replace population (keep other car types unchanged)
  population.value = [...newCars, ...otherCars];
};

// Reset the simulation (but keep toggle button states)
const reset = () => {
  // Reset GA state
  ga.value.reset();

  // Re-initialize population with new random seed using current target population
  randomSeed = Date.now() + Math.random() * 1000000;
  ga.value = new GeneticAlgorithm(randomSeed);

  print(
    `[Reset] Re-creating ${targetPopulationTotal.value} cars (${performanceTargetCarsPerType.value} per type) | Target: ${fps0_1Percent.value} FPS (0.1% low)`
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
    getPopulationSize() / activeCarConfigs.value.length;
  actualPerformanceTargetPerType.value =
    getPopulationSize() / activeCarConfigs.value.length;
  savedPerformanceTargetPerType.value =
    getPopulationSize() / activeCarConfigs.value.length;
  // Reset average cars per type to initial configured value
  averageCarsPerType.value = CONFIG.geneticAlgorithm.population.average.initial;
  averageCarsPerTypeFrameCounter = 0;
};

// Cycle through visualization modes: vis-simple -> vis-medium -> vis-full -> vis-simple
const cycleVisualizationMode = () => {
  const currentIndex = VISUALIZATION_MODES.indexOf(visualizationMode.value);
  const nextIndex = (currentIndex + 1) % VISUALIZATION_MODES.length;
  visualizationMode.value = VISUALIZATION_MODES[nextIndex];
  print(
    `[Visualization] Mode: ${getVisualizationModeLabel(
      visualizationMode.value
    )}`
  );
};

// Get button label for visualization mode
const getVisualizationModeLabel = (mode: VisualizationMode): string => {
  switch (mode) {
    case 'vis-simple':
      return 'SHOW<br />CARS';
    case 'vis-medium':
      return 'SHOW<br />RAYS';
    case 'vis-weights':
      return 'SHOW<br />BRAIN';
    case 'vis-think':
      return 'SHOW<br />THINKING';
  }
};

// Get button label for brain strategy
const getBrainStrategyLabel = (strategy: BrainSelectionStrategy): string => {
  const brainEmoji = TEXT_CHARACTER.brain;
  switch (strategy) {
    case 'alltime':
      return `SAVE ${brainEmoji}<br />ALL-TIME`;
    case 'generation':
      return `SAVE ${brainEmoji}<br />GENERATION`;
    case 'overcorrect':
      return `SAVE ${brainEmoji}<br />INVERTED`;
    case 'sexual':
      return `SAVE ${brainEmoji}<br />SEXUAL`;
  }
};

// Cycle through car usage levels: use-few -> use-many -> use-all -> use-few
const toggleAllCarTypes = () => {
  carUsageLevel.value = getNextCarUsageLevel(carUsageLevel.value);
};

// Toggle Car Speed (cycle through speed multipliers)
const toggleCarSpeed = () => {
  carSpeedMultiplierIndex.value = (carSpeedMultiplierIndex.value + 1) % SPEED_MULTIPLIERS.length;
  print(`[Speed] Car speed set to ${carSpeedMultiplier.value}x`);
};

// Toggle Steering Sensitivity (cycle through low, medium, high)
const toggleSteeringSensitivity = () => {
  steeringSensitivityIndex.value = (steeringSensitivityIndex.value + 1) % CONFIG.car.physics.steeringSensitivityValues.length;
  print(`[Steering] Sensitivity set to ${steeringSensitivity.value}`);
};

// Toggle Mutation Rate (cycle through low, medium, high)
const toggleMutationRate = () => {
  mutationRateIndex.value = (mutationRateIndex.value + 1) % CONFIG.geneticAlgorithm.mutation.startingRates.length;
  print(`[Mutation] Rate set to ${mutationRate.value}`);
};

// Cycle through brain selection strategies
const cycleBrainStrategy = () => {
  // Use the strategies from BRAIN_SELECTION_STRATEGIES to automatically include all
  const strategies = BRAIN_SELECTION_STRATEGIES.map((s) => s.id);
  const currentIndex = strategies.indexOf(brainSelectionStrategy.value);
  const nextIndex = (currentIndex + 1) % strategies.length;
  brainSelectionStrategy.value = strategies[nextIndex];

  const strategyInfo = BRAIN_SELECTION_STRATEGIES.find(
    (s) => s.id === brainSelectionStrategy.value
  );
  print(
    `[Strategy] ${strategyInfo?.emoji} Switched to: ${strategyInfo?.name} - ${strategyInfo?.description}`
  );
};

// Toggle brain overlay rotation
const toggleBrainRotation = () => {
  rotateBrainOverlay.value = !rotateBrainOverlay.value;
  print(`[Visualization] Brain overlay rotation: ${rotateBrainOverlay.value ? 'ON (rotates with car)' : 'OFF (stays upright)'}`);
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

  const leftPadding = 45;
  const rightPadding = CONFIG.visualization.graph.labelRightPadding; // Extra space for car type labels to the right of dots
  const bottomPadding = 45;
  const topPadding = 25; // Extra space at top
  const graphWidth = width - leftPadding - rightPadding;
  const graphHeight = height - bottomPadding - topPadding;

  // Clear canvas
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  // Calculate fitness history for each active config (only last N generations)
  const configHistories: Map<string, { xValue: number; score: number }[]> =
    new Map();

  const trackLength = track.getTotalLength();
  const RECENT_GENERATIONS_COUNT =
    CONFIG.visualization.graph.recentGenerationsCount;

  for (const config of activeCarConfigs.value) {
    const markers =
      generationMarkersByConfigId.value.get(config.shortName) ?? [];
    if (markers.length === 0) continue;

    // Take only the last 20 markers (most recent generations)
    const recentMarkers = markers.slice(-RECENT_GENERATIONS_COUNT);

    // Find the latest generation number for this car type
    const latestGeneration = recentMarkers[recentMarkers.length - 1].generation;

    const history: { xValue: number; score: number }[] = [];

    // For each marker (generation), show the appropriate metric
    for (const marker of recentMarkers) {
      const fitnessPercent = (marker.fitness / trackLength) * 100;

      // X-axis: relative generation (0 = latest, -1 = one back, etc.)
      const relativeGen = marker.generation - latestGeneration;

      // Y-axis: track completion %, completion rate (% per second), or comprehensive score
      let yValue: number;
      if (graphType.value === 'completion') {
        yValue = fitnessPercent;
      } else if (graphType.value === 'rate') {
        yValue = marker.duration > 0 ? fitnessPercent / marker.duration : 0;
      } else {
        // score
        yValue = marker.score;
      }

      history.push({ xValue: relativeGen, score: yValue });
    }

    configHistories.set(config.shortName, history);
  }

  // Find min and max scores across all data for y-axis scaling (linear, dynamic)
  let minScore = Infinity;
  let maxScore = -Infinity;

  for (const history of configHistories.values()) {
    for (const point of history) {
      minScore = Math.min(minScore, point.score);
      maxScore = Math.max(maxScore, point.score);
    }
  }

  // If no valid data, use default range
  if (minScore === Infinity || maxScore === -Infinity) {
    minScore = 0;
    maxScore = graphType.value === 'completion' ? 100 : 10;
  } else {
    // Add minimal padding (3% on each side) for better visualization
    const range = maxScore - minScore;
    const padding = range * 0.03;
    minScore = Math.max(0, minScore - padding);
    maxScore = maxScore + padding;

    // Cap completion at 100
    if (graphType.value === 'completion') {
      maxScore = Math.min(100, maxScore);
    }
  }

  // Scale helper: map relative generation to x position
  // Relative gen ranges from -(N-1) (oldest) to 0 (latest) for N generations
  const relativeGenToX = (relativeGen: number): number => {
    // Map from [-(N-1), 0] to [0, graphWidth]
    // relativeGen = -(N-1) -> x = 0
    // relativeGen = 0 -> x = graphWidth
    const maxNegative = -(RECENT_GENERATIONS_COUNT - 1);
    return (
      leftPadding +
      ((relativeGen - maxNegative) / (0 - maxNegative)) * graphWidth
    );
  };

  // Scale helper: map score to y position (linear scale)
  const scoreToY = (score: number): number => {
    const normalizedScore = (score - minScore) / (maxScore - minScore);
    return height - bottomPadding - normalizedScore * graphHeight;
  };

  // Draw axes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftPadding, topPadding);
  ctx.lineTo(leftPadding, height - bottomPadding);
  ctx.lineTo(width - rightPadding, height - bottomPadding);
  ctx.stroke();

  // Draw graph title at the top
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  const graphTitle =
    graphType.value === 'completion'
      ? 'Lap Completion'
      : graphType.value === 'rate'
      ? 'Lap Efficiency'
      : 'Score';
  ctx.fillText(graphTitle, width / 2, topPadding - 8);

  // Draw grid lines and labels
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  // Y-axis grid (linear scale with dynamic range)
  const numYGridLines = 10;
  for (let i = 0; i <= numYGridLines; i++) {
    const score = minScore + (i * (maxScore - minScore)) / numYGridLines;
    const y = scoreToY(score);

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPadding, y);
    ctx.lineTo(width - rightPadding, y);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';

    // Format y-axis labels based on graph type
    let label: string;
    if (graphType.value === 'completion') {
      label = `${score.toFixed(1)}%`;
    } else if (graphType.value === 'rate') {
      label = score.toFixed(2);
    } else {
      // score graph type
      label = score.toFixed(1);
    }
    ctx.fillText(label, leftPadding - 5, y + 3);
  }

  // X-axis grid (relative generations from -(N-1) to 0)
  const numGridLines = 10;
  const maxNegative = -(RECENT_GENERATIONS_COUNT - 1);
  const step = (0 - maxNegative) / numGridLines;

  for (let i = 0; i <= numGridLines; i++) {
    const relativeGen = maxNegative + i * step;
    const x = relativeGenToX(relativeGen);

    ctx.strokeStyle = '#333333';
    ctx.beginPath();
    ctx.moveTo(x, topPadding);
    ctx.lineTo(x, height - bottomPadding);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(
      Math.round(relativeGen).toString(),
      x,
      height - bottomPadding + 15
    );
  }

  // Axis labels
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Recent Generations', width / 2, height - 5);

  ctx.save();
  ctx.translate(12, height / 2);
  ctx.rotate(-Math.PI / 2);
  const yAxisLabel =
    graphType.value === 'completion'
      ? 'Track Completion (%)'
      : graphType.value === 'rate'
      ? 'Track Completion (% / sec)'
      : 'Comprehensive Score';
  ctx.fillText(yAxisLabel, 0, 0);
  ctx.restore();

  // Calculate dynamic line width based on number of car types
  // Fewer cars = thicker lines, more cars = thinner lines
  const numCarTypes = activeCarConfigs.value.length;
  const dynamicLineWidth = Math.max(1.5, Math.min(6, 12 / numCarTypes));

  // Draw lines for each active config
  for (const config of activeCarConfigs.value) {
    const history = configHistories.get(config.shortName);
    if (!history || history.length === 0) continue;

    ctx.strokeStyle = config.colors.dark;
    ctx.lineWidth = dynamicLineWidth;
    ctx.beginPath();

    let started = false;
    for (const point of history) {
      const x = relativeGenToX(point.xValue);
      const y = scoreToY(point.score);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Draw label at the end of the line (to the right of the dot)
    const lastPoint = history[history.length - 1];
    const lastX = relativeGenToX(lastPoint.xValue);
    const lastY = scoreToY(lastPoint.score);

    // Draw dot at end (size proportional to line width)
    const dotRadius = dynamicLineWidth * 1.5;
    ctx.fillStyle = config.colors.dark;
    ctx.beginPath();
    ctx.arc(lastX, lastY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw label to the right of the dot
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(config.displayName, lastX + dotRadius + 5, lastY + 5);
  }
};

// Watch for graph visibility and render when shown
watch(viewMode, (mode) => {
  if (mode === 'graph') {
    // Use nextTick to ensure canvas is mounted
    nextTick(() => renderGraph());
  }
});

// Watch for graph type changes and re-render
watch(graphType, () => {
  if (viewMode.value === 'graph') {
    nextTick(() => renderGraph());
  }
});

// Update graph in real-time when visible
watch(frameCounter, () => {
  if (viewMode.value === 'graph') {
    renderGraph();
  }
});

// Watch for changes in car usage level - reset and reinitialize
watch(carUsageLevel, () => {
  const levelInfo = getCarUsageLevelInfo(carUsageLevel.value);
  print(`[Toggle] Car usage level: ${levelInfo.description}`);

  // Update population controller with new car type count
  populationController.setPopulation(getPopulationSize());

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
  padding: 0;
  margin: 0;
  height: 100vh;
  max-height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #242;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 400px;
  flex-shrink: 0;
}

.hud {
  display: flex;
  justify-content: center;
  margin: 0;
  flex: 1;
  min-width: 0;
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
  height: 100%;
  table-layout: fixed;
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 14px;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
}

.stats-table thead {
  flex-shrink: 0;
  display: table;
  width: 100%;
  table-layout: fixed;
}

.stats-table thead tr {
  display: table-row;
}

.stats-table th {
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 6px 8px;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  display: table-cell;
}

.stats-table tbody {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.stats-table tbody tr {
  flex: 1;
  color: #ffffff;
  display: flex;
  align-items: center;
  min-height: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-table tbody tr:last-child {
  border-bottom: none;
}

.stats-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05);
}

.stats-table td {
  padding: 0 8px;
  color: #ffffff;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
}

.stats-table td.colored-cell {
  padding: 0;
  margin: 0;
  width: 100%;
  height: 100%;
  background-clip: padding-box;
}

.stats-table td.bar-cell {
  padding: 2px 4px;
  align-self: stretch;
  align-items: stretch;
}

/* Compact mode for when ALL TYPES is toggled on */
.stats-table-compact {
  font-size: 9px !important;
}

.stats-table-compact th {
  padding: 3px !important;
  font-size: 8px !important;
  letter-spacing: 0px !important;
}

.stats-table-compact td {
  padding: 0 3px !important;
  line-height: 1.1;
}

/* Performance view container */
.performance-view {
  cursor: pointer;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
}

.perf-tables-container {
  display: flex;
  gap: 10px;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
}

/* Performance table specific styling */
.perf-table {
  position: relative !important;
  flex: 1;
  min-width: 0;
  width: auto !important;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  table-layout: fixed;
  font-family: 'Courier New', 'Courier', monospace;
  font-weight: bold;
}

.perf-table thead {
  flex-shrink: 0;
  display: table;
  width: 100%;
  table-layout: fixed;
}

.perf-table thead tr {
  display: table-row;
}

.perf-table thead th {
  display: table-cell;
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 6px 8px;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.3px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.perf-table tbody {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.perf-table tbody tr {
  flex: 1;
  display: flex;
  min-height: 0;
  align-items: center;
  color: #ffffff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.perf-table tbody tr:last-child {
  border-bottom: none;
}

.perf-table tbody tr td {
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.perf-table .label-cell {
  text-align: left;
  flex: 3;
  font-weight: bold;
  justify-content: flex-start;
}

.perf-table .value-cell {
  text-align: right;
  flex: 2;
  justify-content: flex-end;
}

/* Mobile layout: Table on top, buttons below */
@media (max-width: 768px) {
  .info-container {
    flex-direction: column-reverse;
    gap: 16px;
    padding: 6px 12px;
  }

  .controls {
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
  padding: 0;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 14px;
  font-weight: bold;
  line-height: 1.2;
  min-height: 44px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, border-color 0.15s ease;
  touch-action: manipulation;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  margin: 0;
  background: #6b7280;
  color: #ffffff;
  border: 2px solid #4b5563;
  box-sizing: border-box;
}

button:hover {
  background: #7f8794;
  border-color: #5a6370;
}

button:active {
  background: #4b5563;
  border-color: #374151;
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
