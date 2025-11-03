# Brain Selection Strategies - Design Document

## Overview

Three different strategies for selecting which neural network weights to save and use for the next generation.

---

## The Three Strategies

### 1. 🔄 **Generation Best** (Original)

**"Always overwrite with current generation's best"**

**Logic:**

- Save the best performing car's brain from current generation
- Unconditionally overwrites previous saved brain
- Ignores historical performance

**Pros:**

- Fast exploration of solution space
- Can escape local maxima
- Simple and aggressive

**Cons:**

- Can regress if generation performs worse
- No guarantee of progress
- Loses good brains from previous generations

**Use case:** Early exploration, when stuck in local maxima

---

### 2. 🏆 **All-Time Best** (Current)

**"Only overwrite if equal or better"**

**Logic:**

- Compare current generation's best to all-time best
- Only save if `currentBest.fitness >= allTimeBest.fitness`
- Preserves best brain across generations

**Pros:**

- Guaranteed forward progress (monotonic)
- Never loses best solution
- Stable convergence

**Cons:**

- Can get stuck in local maxima
- Less exploration
- May miss combination opportunities

**Use case:** Stable training, preserving good solutions

---

### 3. 🧬 **Sexual Reproduction / Averaging**

**"Average saved brain with generation's best"**

**Logic:**

- Take saved brain (parent 1)
- Take current generation's best (parent 2)
- Average all weights and biases element-wise
- Save the averaged "offspring" brain

**Pros:**

- Genetic diversity through crossover
- Combines traits from two good brains
- Can discover novel solutions
- Biological realism

**Cons:**

- Averaged brain might perform worse than either parent
- Can lose specialized behaviors
- More complex implementation

**Use case:** Genetic diversity, escaping plateaus, exploration

---

## Implementation Plan

### 1. Type Definitions

**File:** `src/types.ts`

```typescript
// Brain selection strategy for evolution
export type BrainSelectionStrategy =
  | 'generation' // Always save current generation's best
  | 'alltime' // Only save if equal or better than all-time best
  | 'averaging' // Average saved brain with current generation's best
  | 'overcorrect';

// Strategy metadata for UI display
export interface StrategyInfo {
  id: BrainSelectionStrategy;
  name: string;
  description: string;
  emoji: string;
}

export const BRAIN_SELECTION_STRATEGIES: StrategyInfo[] = [
  {
    id: 'generation',
    name: 'Gen Best',
    description: "Always save current generation's best",
    emoji: '🔄',
  },
  {
    id: 'alltime',
    name: 'All-Time',
    description: 'Only save if equal or better',
    emoji: '🏆',
  },
  {
    id: 'averaging',
    name: 'Averaging',
    description: 'Average saved + current best',
    emoji: '🧬',
  },
];
```

---

### 2. Weight Averaging Function

**File:** `src/core/Neural.ts`

```typescript
/**
 * Average two neural network weight structures element-wise
 * Used for "sexual reproduction" strategy
 */
export function averageNetworkWeights(
  weights1: NetworkStructure,
  weights2: NetworkStructure
): NetworkStructure {
  // Deep clone first structure as base
  const result: NetworkStructure = JSON.parse(JSON.stringify(weights1));

  // Average each layer's weights and biases
  for (let layerIdx = 0; layerIdx < result.layers.length; layerIdx++) {
    const layer1 = weights1.layers[layerIdx];
    const layer2 = weights2.layers[layerIdx];
    const resultLayer = result.layers[layerIdx];

    // Average weights matrix
    for (let i = 0; i < resultLayer.weights.length; i++) {
      for (let j = 0; j < resultLayer.weights[i].length; j++) {
        resultLayer.weights[i][j] =
          (layer1.weights[i][j] + layer2.weights[i][j]) / 2;
      }
    }

    // Average biases vector
    for (let i = 0; i < resultLayer.biases.length; i++) {
      resultLayer.biases[i] = (layer1.biases[i] + layer2.biases[i]) / 2;
    }
  }

  return result;
}
```

---

### 3. Configuration

**File:** `src/config.ts`

```typescript
export const CONFIG = {
  // ... existing config ...

  geneticAlgorithm: {
    // ... existing GA config ...

    brainSelection: {
      strategy: 'alltime' as BrainSelectionStrategy, // Default strategy
    },
  },
};
```

---

### 4. Core Evolution Logic

**File:** `src/core/GA.ts` - `evolvePopulation()` method

```typescript
// After determining bestCar (around line 146)

// Apply brain selection strategy
const strategy = config.brainSelectionStrategy || 'alltime'; // Get from config

switch (strategy) {
  case 'generation':
    // Strategy 1: Always save current generation's best
    state.bestWeights = bestCar.brain.toJSON();

    // Update fitness if improved
    if (bestCar.maxDistanceReached > state.bestFitness) {
      const improvement = (
        ((bestCar.maxDistanceReached - state.bestFitness) / state.bestFitness) *
        100
      ).toFixed(1);
      console.log(
        `[${config.shortName}] Gen ${
          state.generation
        }: Gen best saved: ${bestCar.maxDistanceReached.toFixed(
          0
        )} (was: ${state.bestFitness.toFixed(0)}, ${
          improvement >= 0 ? '+' : ''
        }${improvement}%)`
      );
      state.bestFitness = bestCar.maxDistanceReached;
    } else {
      console.log(
        `[${config.shortName}] Gen ${
          state.generation
        }: Gen best saved: ${bestCar.maxDistanceReached.toFixed(
          0
        )} (regression from ${state.bestFitness.toFixed(0)})`
      );
      state.bestFitness = bestCar.maxDistanceReached; // Update to current even if worse
    }
    break;

  case 'alltime':
    // Strategy 2: Only save if equal or better (current implementation)
    if (bestCar.maxDistanceReached >= state.bestFitness) {
      state.bestWeights = bestCar.brain.toJSON();
      const previousBest = state.bestFitness;
      state.bestFitness = bestCar.maxDistanceReached;

      if (previousBest > 0) {
        const improvement = (
          ((bestCar.maxDistanceReached - previousBest) / previousBest) *
          100
        ).toFixed(1);
        console.log(
          `[${config.shortName}] Gen ${
            state.generation
          }: New all-time best! ${previousBest.toFixed(
            0
          )} → ${bestCar.maxDistanceReached.toFixed(0)} (+${improvement}%)`
        );
      } else {
        console.log(
          `[${config.shortName}] Gen ${
            state.generation
          }: First best saved: ${bestCar.maxDistanceReached.toFixed(0)}`
        );
      }
    } else {
      console.log(
        `[${config.shortName}] Gen ${
          state.generation
        }: No improvement (best: ${bestCar.maxDistanceReached.toFixed(
          0
        )}, all-time: ${state.bestFitness.toFixed(0)}). Keeping previous brain.`
      );
    }
    break;

  case 'averaging':
    // Strategy 3: Average saved brain with current generation's best
    const currentBestWeights = bestCar.brain.toJSON();

    // On first generation, just save the first brain
    if (!state.bestWeights || state.bestFitness === 0) {
      state.bestWeights = currentBestWeights;
      state.bestFitness = bestCar.maxDistanceReached;
      console.log(
        `[${config.shortName}] Gen ${
          state.generation
        }: First brain saved: ${bestCar.maxDistanceReached.toFixed(0)}`
      );
    } else {
      // Average the two brains
      const averagedWeights = averageNetworkWeights(
        state.bestWeights,
        currentBestWeights
      );
      state.bestWeights = averagedWeights;

      // Track the max fitness seen (hybrid's fitness is unknown until tested)
      const previousBest = state.bestFitness;
      state.bestFitness = Math.max(
        state.bestFitness,
        bestCar.maxDistanceReached
      );

      console.log(
        `[${config.shortName}] Gen ${
          state.generation
        }: Averaged brains (saved: ${previousBest.toFixed(
          0
        )}, gen: ${bestCar.maxDistanceReached.toFixed(
          0
        )}, max: ${state.bestFitness.toFixed(0)})`
      );
    }
    break;
}
```

---

### 5. UI Implementation

**File:** `src/components/CarSimulator.vue`

#### State Management

```typescript
// Add reactive state
const brainSelectionStrategy = ref<BrainSelectionStrategy>(
  CONFIG.geneticAlgorithm.brainSelection.strategy
);

// Cycle through strategies
const cycleBrainStrategy = () => {
  const strategies: BrainSelectionStrategy[] = [
    'generation',
    'alltime',
    'averaging',
  ];
  const currentIndex = strategies.indexOf(brainSelectionStrategy.value);
  const nextIndex = (currentIndex + 1) % strategies.length;
  brainSelectionStrategy.value = strategies[nextIndex];

  // Persist to localStorage
  localStorage.setItem('brainSelectionStrategy', brainSelectionStrategy.value);

  print(
    `[Strategy] Switched to: ${
      BRAIN_SELECTION_STRATEGIES.find(
        (s) => s.id === brainSelectionStrategy.value
      )?.name
    }`
  );
};

// Load from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('brainSelectionStrategy');
  if (saved && ['generation', 'alltime', 'averaging'].includes(saved)) {
    brainSelectionStrategy.value = saved as BrainSelectionStrategy;
  }
});
```

#### Template

```vue
<!-- Add button in controls area -->
<button @click="cycleBrainStrategy" class="control-button">
  <span>{{ BRAIN_SELECTION_STRATEGIES.find(s => s.id === brainSelectionStrategy)?.emoji }}</span>
  <span>{{ BRAIN_SELECTION_STRATEGIES.find(s => s.id === brainSelectionStrategy)?.name }}</span>
</button>
```

#### Pass to GA

```typescript
// When calling ga.value.evolvePopulation(), pass strategy
const newCars = ga.value.evolvePopulation(
  configCars,
  config,
  winnerCar,
  generationTime,
  track,
  mutationByDistance.value,
  brainSelectionStrategy.value // Pass current strategy
);
```

---

### 6. Update GA Method Signature

**File:** `src/core/GA.ts`

```typescript
evolvePopulation(
  cars: Car[],
  config: CarBrainConfig,
  winnerCar: Car | null,
  generationTime: number,
  track: Track,
  useMutationByDistance: boolean,
  brainSelectionStrategy?: BrainSelectionStrategy  // New optional parameter
): Car[] {
  // Default to 'alltime' if not provided
  const strategy = brainSelectionStrategy || 'alltime';

  // ... rest of method
}
```

---

## Logging Format

### Strategy 1: Generation Best

```
[DIFF] Gen 5: Gen best saved: 1200 (was: 1500, -20.0%)  // Regression
[DIFF] Gen 6: Gen best saved: 1800 (was: 1200, +50.0%)  // Improvement
```

### Strategy 2: All-Time Best

```
[DIFF] Gen 5: New all-time best! 1500 → 1800 (+20.0%)
[DIFF] Gen 6: No improvement (best: 1200, all-time: 1800). Keeping previous brain.
```

### Strategy 3: Averaging

```
[DIFF] Gen 5: Averaged brains (saved: 1500, gen: 1200, max: 1500)
[DIFF] Gen 6: Averaged brains (saved: 1500, gen: 1800, max: 1800)
```

---

## Testing Scenarios

### 1. Generation Best

- Start at 0
- Gen 0: Save brain (1000)
- Gen 1: Worse (800) → Still saves (should regress)
- Gen 2: Better (1200) → Saves
- **Verify**: Gen 2 starts from Gen 1's brain (800), not Gen 0's (1000)

### 2. All-Time Best

- Start at 0
- Gen 0: Save brain (1000)
- Gen 1: Worse (800) → Keeps Gen 0's brain
- Gen 2: Better (1200) → Saves new brain
- **Verify**: Gen 2 starts from Gen 0's brain (1000), not Gen 1's (800)

### 3. Averaging

- Start at 0
- Gen 0: Save brain (1000)
- Gen 1: Average Gen 0 (1000) + Gen 1 best (800) = hybrid
- Gen 2: Average Gen 1 hybrid + Gen 2 best (1200) = new hybrid
- **Verify**: Each generation produces a new averaged brain

---

## Edge Cases

### First Generation

- No previous brain exists
- All strategies: Just save the first brain

### Ties

- Multiple cars with same max fitness
- Already handled: `sorted[0]` picks first one

### Winner Car Override

- Lap completion winner provided
- Already handled: `bestCar = winnerCar` takes precedence

### Architecture Mismatch (Averaging)

- Should not happen (same config type)
- Averaging assumes same layer sizes
- Consider adding validation

---

## Future Enhancements

1. **Weighted Averaging**

   - Weight by fitness: `(w1*f1 + w2*f2) / (f1+f2)`
   - Favors better performing parent

2. **Multi-Parent Averaging**

   - Average top 3 brains instead of just 2

3. **Crossover Strategies**

   - Layer-wise crossover (swap whole layers)
   - Neuron-wise crossover (swap individual neurons)

4. **Adaptive Strategy**

   - Auto-switch based on progress
   - Use "generation" when stuck, "alltime" when improving

5. **Per-Car-Type Strategy**
   - Different strategies for DIFF vs RAW
   - More experimental configurations

---

## Files to Modify

1. ✅ `src/types.ts` - Add BrainSelectionStrategy type
2. ✅ `src/config.ts` - Add default strategy config
3. ✅ `src/core/Neural.ts` - Add averageNetworkWeights function
4. ✅ `src/core/GA.ts` - Update evolvePopulation with strategy logic
5. ✅ `src/components/CarSimulator.vue` - Add UI toggle and state management

---

## Timeline

1. **Phase 1**: Types and config (5 min)
2. **Phase 2**: Weight averaging function (10 min)
3. **Phase 3**: GA strategy logic (15 min)
4. **Phase 4**: UI toggle (10 min)
5. **Phase 5**: Testing (10 min)

**Total**: ~50 minutes
