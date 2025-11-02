# All-Time Best Brain Preservation

## Problem

Previously, the genetic algorithm was **unconditionally** saving the best brain from each generation, even if that generation performed worse than previous generations. This caused the loss of superior brains when a generation happened to underperform.

### Old Behavior (Bug)
```typescript
// ❌ ALWAYS overwrites, even if worse
state.bestWeights = bestCar.brain.toJSON();

// ✓ Only tracks if better
if (bestCar.maxDistanceReached > state.bestFitness) {
  state.bestFitness = bestCar.maxDistanceReached;
}
```

**Result**: Brain and fitness could be out of sync. A worse brain could replace a better one.

---

## Solution

Now the system only updates `bestWeights` when a car achieves **equal or better** fitness than the all-time best.

### New Behavior (Fixed)
```typescript
// ✅ Only saves if equal or better
if (bestCar.maxDistanceReached >= state.bestFitness) {
  state.bestWeights = bestCar.brain.toJSON();
  state.bestFitness = bestCar.maxDistanceReached;
  console.log(`New best! ${previousBest} → ${bestCar.maxDistanceReached}`);
} else {
  console.log(`No improvement. Keeping previous brain.`);
}
```

**Result**: The all-time best brain is preserved across generations, ensuring consistent forward progress.

---

## Implementation Details

### File Changed
- **`src/core/GA.ts`** (lines 148-171)

### Logic
1. **Compare fitness**: Check if `bestCar.maxDistanceReached >= state.bestFitness`
2. **Update if better**: Save brain weights AND update fitness
3. **Keep if worse**: Log the decision but preserve previous best brain
4. **Use `>=` not `>`**: Allows equal fitness to update (fresher equivalent brain)

### Logging
- **Improvement found**:
  ```
  [DIFF] Gen 5: New best! 1250 → 1500 (+20.0%)
  ```
- **First generation**:
  ```
  [DIFF] Gen 0: First best saved: 850
  ```
- **No improvement**:
  ```
  [DIFF] Gen 3: No improvement (best: 900, all-time: 1500). Keeping previous brain.
  ```

---

## Benefits

✅ **Preserves progress**: Best brain is never lost to a bad generation
✅ **Consistent evolution**: Next generation always starts from true best
✅ **Transparent logging**: Console shows when improvements happen
✅ **Handles edge cases**: First generation, equal fitness, lap winners all work correctly

---

## How It Works in Evolution

### Generation Lifecycle

1. **Cars run** → Fitness measured (distance traveled)
2. **Best selected** → Highest `maxDistanceReached` found
3. **Comparison** → Compare to all-time best
4. **Conditional save**:
   - If `>=` all-time best → Save new brain ✅
   - If `<` all-time best → Keep old brain 🛡️
5. **Next generation** → Created from all-time best brain (elite + mutations)

### Example Scenario

| Gen | Best This Gen | All-Time Best | Action |
|-----|--------------|---------------|--------|
| 0 | 850 | 0 | **Save** (first) |
| 1 | 1200 | 850 | **Save** (improved +41%) |
| 2 | 900 | 1200 | **Keep** old brain |
| 3 | 1100 | 1200 | **Keep** old brain |
| 4 | 1500 | 1200 | **Save** (improved +25%) |
| 5 | 1500 | 1500 | **Save** (equal, fresher) |

---

## Per-Car-Type Tracking

Each car configuration maintains its own independent all-time best:

```typescript
interface ConfigEvolutionState {
  generation: number;
  bestFitness: number;      // All-time best fitness
  bestWeights: any;         // All-time best brain (JSON)
  totalTime: number;
}
```

Stored in: `Map<shortName, ConfigEvolutionState>`

This means:
- **DIFF** cars have their own all-time best
- **RAW** cars have their own all-time best
- Each evolves independently at its own pace
- No cross-contamination between configurations

---

## Testing

To verify the fix works:

1. **Run the simulator** and watch console logs
2. **Look for improvements**: Should see "New best!" messages
3. **Observe stagnation**: Should see "No improvement. Keeping previous brain."
4. **Verify progress**: All-time best fitness should never decrease
5. **Check elite cars**: Elite (1.5x size) should always represent true all-time best

---

## Technical Notes

### Why `>=` instead of `>`?

Using `>=` allows a brain with **equal** fitness to replace the old one:
- Genetic diversity can help escape local maxima
- Fresher brain might have different mutation potential
- User specifically requested "equal or better"

### Thread Safety

Not needed - evolution happens sequentially per car type in the main thread.

### Persistence

When exporting/importing weights, `bestFitness` is included:
```typescript
exportWeights() {
  return JSON.stringify({
    stateByShortName: {
      DIFF: { generation, bestFitness, bestWeights, totalTime },
      RAW: { generation, bestFitness, bestWeights, totalTime }
    }
  });
}
```

This ensures imported brains maintain their fitness context.

---

## Related Files

- `src/core/GA.ts` - Main evolution logic (MODIFIED)
- `src/types.ts` - ConfigEvolutionState definition
- `src/core/Neural.ts` - Brain serialization (toJSON/fromJSON)
- `src/components/CarSimulator.vue` - Evolution trigger
- `src/core/Car.ts` - Fitness tracking (maxDistanceReached)
