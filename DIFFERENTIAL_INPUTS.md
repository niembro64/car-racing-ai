# Differential Input Mode

## Overview
This document explains the differential input encoding system - an alternative way to feed sensor data to the neural network that can improve learning efficiency.

## Standard vs Differential Inputs

### Standard Mode (9 inputs)
Raw distance values from all 9 sensors:
```
Input 0: Forward ray (0°) = 150 pixels
Input 1: Left 20° ray = 120 pixels
Input 2: Right 20° ray = 130 pixels
Input 3: Left 40° ray = 100 pixels
Input 4: Right 40° ray = 110 pixels
Input 5: Left 60° ray = 80 pixels
Input 6: Right 60° ray = 90 pixels
Input 7: Left 90° ray = 60 pixels
Input 8: Right 90° ray = 70 pixels

Neural Network: [9] → [6] → [1]
```

### Differential Mode (5 inputs)
Forward ray + differential pairs (left - right):
```
Input 0: Forward ray (0°) = 150 pixels
Input 1: 20° differential = 120 - 130 = -10 (more space right)
Input 2: 40° differential = 100 - 110 = -10 (more space right)
Input 3: 60° differential = 80 - 90 = -10 (more space right)
Input 4: 90° differential = 60 - 70 = -10 (more space right)

Neural Network: [5] → [4] → [1]
```

## Benefits of Differential Mode

### 1. Smaller Network
- **44% fewer inputs** (5 vs 9)
- **33% fewer hidden neurons** (4 vs 6)
- **~60% fewer total parameters** (faster learning)

### 2. Encoded Information
- **Sign** indicates which direction has more space
  - Positive (+) = more space on left
  - Negative (-) = more space on right
- **Magnitude** indicates how much more space
  - Large values = strong directional bias
  - Small values = balanced/centered on track

### 3. Faster Learning
- Network doesn't need to learn to compare left/right
- Directional bias is pre-computed
- Fewer parameters = faster convergence

### 4. Better Generalization
- Encodes the *relationship* between sensors
- Less sensitive to absolute distance values
- More focused on track geometry

## How It Works

### Ray Pairing
```javascript
SENSOR_RAY_PAIRS = [
  [1, 2],  // ±20° pair → indices 1 and 2
  [3, 4],  // ±40° pair → indices 3 and 4
  [5, 6],  // ±60° pair → indices 5 and 6
  [7, 8],  // ±90° pair → indices 7 and 8
]
```

### Input Computation
```javascript
if (useDifferentialInputs) {
  inputRays = [distances[0]];  // Forward ray

  for (const [leftIdx, rightIdx] of SENSOR_RAY_PAIRS) {
    const differential = distances[leftIdx] - distances[rightIdx];
    inputRays.push(differential);
  }
}
```

### Example Scenarios

**Scenario 1: Car centered on track**
```
Left rays:  [100, 100, 100, 100]
Right rays: [100, 100, 100, 100]
Differentials: [0, 0, 0, 0]
→ All balanced, car should go straight
```

**Scenario 2: Car drifting left**
```
Left rays:  [50, 50, 50, 50]
Right rays: [150, 150, 150, 150]
Differentials: [-100, -100, -100, -100]
→ All negative, car should steer right
```

**Scenario 3: Approaching left turn**
```
Forward: 200
Left rays:  [80, 60, 40, 20]
Right rays: [120, 140, 160, 180]
Differentials: [-40, -80, -120, -160]
→ Increasing negative gradient, prepare for left turn
```

## Activation Functions

### Standard Mode
```
Hidden layers: GELU (Gaussian Error Linear Unit)
- Smooth, non-linear
- Used in GPT, BERT, modern transformers
- Good for complex pattern learning

Output layer: Sigmoid
- Range: [0, 1]
- Mapped to steering: output × 2 - 1 → [-1, 1]
```

### Differential Mode
```
Hidden layers: Linear (Identity function)
- f(x) = x
- CRITICAL: Preserves negative differential values!
- Negative values encode "more space on right"
- Positive values encode "more space on left"

Output layer: Tanh (Hyperbolic tangent)
- Range: [-1, 1]
- Perfect for steering (no remapping needed)
- Negative = turn left, Positive = turn right
```

**Why Linear is Required for Differential Mode:**

If we used ReLU or GELU with differential inputs:
```
Differential = left_distance - right_distance
= 50 - 100 = -50 (more space on right, should turn right)

With ReLU: max(0, -50) = 0 (information LOST!)
With Linear: -50 (information preserved ✓)
```

## Network Architecture Comparison

### Standard Mode
```
Total parameters:
- Layer 1: 9 inputs × 6 neurons + 6 biases = 60 parameters
- Layer 2: 6 neurons × 1 output + 1 bias = 7 parameters
- Total: 67 parameters

Activations: GELU → Sigmoid
```

### Differential Mode
```
Total parameters:
- Layer 1: 5 inputs × 4 neurons + 4 biases = 24 parameters
- Layer 2: 4 neurons × 1 output + 1 bias = 5 parameters
- Total: 29 parameters

Activations: Linear → Tanh
```

**56% reduction in parameters!**

## When to Use Each Mode

### Use Standard Mode When:
- Track is very complex (needs all sensor information)
- Absolute distances matter (e.g., speed control based on clearance)
- You have plenty of training time
- You want maximum information density

### Use Differential Mode When:
- Track requires mostly steering decisions
- You want faster learning
- You want a more compact network
- You're focused on directional control

## Toggle Between Modes

The "Differential Inputs" button in the UI allows you to switch between modes:
- **OFF** (default): Standard 9-input mode
- **ON**: Differential 5-input mode

**Note:** Toggling resets the simulation with a new neural network architecture.

## Performance Expectations

### Standard Mode (9 inputs)
- More information available
- Slower initial learning
- Can handle more complex patterns
- May overfit on simple tracks

### Differential Mode (5 inputs)
- Faster initial learning
- More focused on steering
- Better for symmetric tracks
- More efficient for basic racing

## Implementation Details

### Car Class (Car.ts:134-146)
```typescript
if (this.useDifferentialInputs) {
  inputRays = [distances[0]]; // Forward
  for (const [leftIdx, rightIdx] of SENSOR_RAY_PAIRS) {
    const differential = distances[leftIdx] - distances[rightIdx];
    inputRays.push(differential);
  }
} else {
  inputRays = distances; // All rays
}
```

### Genetic Algorithm (GA.ts:48-50)
```typescript
const architecture = this.useDifferentialInputs
  ? NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL
  : NEURAL_NETWORK_ARCHITECTURE_STANDARD;
```

### Configuration (config.ts)
```typescript
export const NEURAL_NETWORK_ARCHITECTURE_STANDARD = [9, 6, 1];
export const NEURAL_NETWORK_ARCHITECTURE_DIFFERENTIAL = [5, 4, 1];
```

## Experiment Ideas

1. **Compare learning speed**
   - Train both modes for 50 generations
   - Measure max progress reached

2. **Try different hidden layer sizes**
   - Differential: [5, 8, 1] for more capacity
   - Standard: [9, 4, 1] for faster learning

3. **Hybrid approach**
   - Use differentials for steering
   - Add forward ray magnitude for speed control
   - Architecture: [5 inputs] → [6] → [2 outputs] (steering + speed)

4. **Normalized inputs**
   - Divide differentials by forward ray distance
   - Makes network invariant to track width

---

**This is a powerful technique used in real autonomous vehicles!**
