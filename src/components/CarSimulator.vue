<template>
  <div class="simulator">
    <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight"></canvas>

    <div class="hud">
      <div class="stat">Generation: {{ ga.generation }}</div>
      <div class="stat">Time: {{ generationTimeDisplay }} | {{ adaptiveMutationRate }}</div>
      <div class="stat">Alive: {{ aliveCount }} / {{ population.length }}</div>
      <div class="stat">Best: {{ bestFitnessPercent }}</div>
      <div class="stat">Speed: {{ speedMultiplier }}x</div>
    </div>

    <div class="controls">
      <button @click="nextGeneration" class="next-gen-btn">Next Generation</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Track } from '@/core/Track';
import { Car } from '@/core/Car';
import { GeneticAlgorithm } from '@/core/GA';
import { TRACK_HALF_WIDTH, MUTATION_RATE } from '@/config';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasWidth = 800;
const canvasHeight = 600;

const track = new Track(TRACK_HALF_WIDTH);
const ga = new GeneticAlgorithm(12345);

const population = ref<Car[]>([]);
const showRays = ref(true);
const speedMultiplier = ref(1);
const debugNN = ref(false);
const generationTime = ref(0);

let animationFrameId: number | null = null;
let lastTime = 0;
const FIXED_DT = 1 / 60; // 60 Hz physics

const aliveCount = computed(() => {
  return population.value.filter(car => car.alive).length;
});

const bestFitnessPercent = computed(() => {
  const trackLength = track.getTotalLength();
  const percentage = (ga.bestFitness / trackLength) * 100;
  const sign = percentage >= 0 ? '+' : '-';
  const absValue = Math.abs(percentage);
  const formatted = absValue.toFixed(1).padStart(4, ' '); // "XX.X" format
  return `${sign}${formatted}%`;
});

const generationTimeDisplay = computed(() => {
  const formatted = generationTime.value.toFixed(1).padStart(4, ' '); // "XX.X" format
  return `${formatted}s`;
});

const adaptiveMutationRate = computed(() => {
  const minGenerationTime = 1.0;
  const effectiveTime = Math.max(generationTime.value, minGenerationTime);
  const rate = MUTATION_RATE / effectiveTime;
  const formatted = rate.toFixed(4).padStart(6, ' '); // "X.XXXX" format
  return `σ=${formatted}`;
});

// Initialize simulation
const init = () => {
  population.value = ga.initializePopulation(track);
  generationTime.value = 0;
};

// Evolve to next generation (can be called manually or automatically)
const evolveToNextGeneration = (reason: string) => {
  const aliveCarCount = population.value.filter(car => car.alive).length;
  console.log(`Generation ended: ${reason}. ${aliveCarCount}/${population.value.length} cars alive. Time: ${generationTime.value.toFixed(2)}s`);

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
};

// Render frame
const render = (ctx: CanvasRenderingContext2D) => {
  // Clear canvas
  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Render track
  track.render(ctx);

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

  // Separate elite (green car)
  const elite = aliveCars.find(car => car.color === '#10b981');
  const others = aliveCars.filter(car => car.color !== '#10b981');

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
const animate = (currentTime: number) => {
  const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : FIXED_DT;
  lastTime = currentTime;

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

// Toggle speed
const toggleSpeed = () => {
  const speeds = [1, 2, 4, 8];
  const currentIndex = speeds.indexOf(speedMultiplier.value);
  speedMultiplier.value = speeds[(currentIndex + 1) % speeds.length];
};

// Toggle rays
const toggleRays = () => {
  showRays.value = !showRays.value;
};

// Toggle neural network debug logging
const toggleDebug = () => {
  debugNN.value = !debugNN.value;
  (window as any).__debugCarNN = debugNN.value;
  console.log('Neural Network Debug:', debugNN.value ? 'ENABLED' : 'DISABLED');
};

// Manually trigger next generation
const nextGeneration = () => {
  evolveToNextGeneration('manual trigger');
};

// Reset evolution
const resetEvolution = () => {
  if (confirm('Are you sure you want to reset the evolution?')) {
    ga.reset();
    init();
  }
};

// Export weights
const exportWeights = () => {
  const json = ga.exportWeights();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `car-racing-weights-gen${ga.generation}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Import weights
const importWeights = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        ga.importWeights(json);
        init();
      };
      reader.readAsText(file);
    }
  };
  input.click();
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
  gap: 20px;
  padding: 40px 20px;
}

canvas {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  background: #ffffff;
}

.hud {
  display: flex;
  gap: 32px;
  color: #374151;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  background: #ffffff;
  padding: 12px 28px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.stat {
  font-weight: 600;
  color: #1f2937;
}

.controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

button {
  padding: 10px 20px;
  background: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

button:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.next-gen-btn {
  background: #3b82f6;
}

.next-gen-btn:hover {
  background: #2563eb;
}
</style>
