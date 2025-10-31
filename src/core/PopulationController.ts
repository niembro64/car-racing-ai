/**
 * PopulationController - Adaptive population management
 *
 * Works with CARS PER TYPE (not total population)
 *
 * SINGLE THRESHOLD: POP_THRESHOLD_FPS (0.1% low)
 * - Below threshold → Decrease cars/type by POP_DECREASE_PERCENTAGE
 * - At/Above threshold → Increase cars/type by POP_INCREASE_PERCENTAGE
 *
 * Special case: At minimum, adds POP_MINIMUM_ESCAPE_MULTIPLIER cars per type
 * Adjusts every POP_ADJUSTMENT_INTERVAL frames (1 second at 60 FPS)
 * Cars per type tracked as decimals for precision, rounded for actual spawning
 *
 * All configuration values imported from config.ts
 */

import type { PerformanceMetrics } from './PerformanceMonitor';
import {
  POP_THRESHOLD_FPS,
  POP_INCREASE_PERCENTAGE,
  POP_DECREASE_PERCENTAGE,
  POP_MINIMUM_ESCAPE_MULTIPLIER,
} from '@/config';

export interface PopulationControllerConfig {
  targetFps: number;            // Used for display/metrics only (not for logic)
  minPopulation: number;        // Minimum cars allowed (1 per type)
  maxPopulation: number;        // Maximum cars allowed (50 per type)
  initialPopulation: number;    // Starting population
  maxChangeRate: number;        // Max population change per adjustment (15%)
  adjustmentInterval: number;   // Frames between adjustments (60 = 1 second at 60fps)
}

export interface PopulationAdjustment {
  totalPopulation: number;     // Total across all types (rounded for spawning)
  populationPerType: number;   // Cars per type (decimal value for precision)
  numTypes: number;             // Number of car types
  delta: number;                // Change in cars per type (can be decimal)
  reason: string;               // Human-readable reason for adjustment
  metrics: {
    fps: number;
    error: number;
    stability: number;
    trend: number;
    headroom: number;
  };
}

export class PopulationController {
  private config: PopulationControllerConfig;
  private numberOfCarTypes: number;

  // Current state (tracked as cars per type, can be decimal)
  private currentCarsPerType: number;
  private frameCounterSinceLastAdjustment: number = 0;

  // Tracking for stability
  private consecutiveCarsPerTypeIncreases: number = 0;
  private consecutiveCarsPerTypeDecreases: number = 0;

  constructor(config: PopulationControllerConfig, numCarTypes: number) {
    this.config = config;
    this.numberOfCarTypes = numCarTypes;
    // Convert initial population to cars per type
    this.currentCarsPerType = config.initialPopulation / numCarTypes;
  }

  /**
   * Calculate optimal population based on current performance metrics.
   * Updates every second (60 frames at 60 FPS).
   */
  calculateOptimalPopulation(metrics: PerformanceMetrics): PopulationAdjustment {
    this.frameCounterSinceLastAdjustment++;

    // Only adjust every second (60 frames at 60fps)
    if (this.frameCounterSinceLastAdjustment % this.config.adjustmentInterval !== 0) {
      return this.returnNoChangeNeeded(metrics, 'Waiting for next adjustment interval');
    }

    // SINGLE THRESHOLD LOGIC: Only one number matters - 0.1% low vs POP_THRESHOLD_FPS
    const pointOnePercentLowFps = metrics.p0_1Fps;

    let carsPerTypeChangeAmount = 0;
    let adjustmentReason = '';

    // Calculate min/max cars per type from config
    const minCarsPerType = this.config.minPopulation / this.numberOfCarTypes;
    const maxCarsPerType = this.config.maxPopulation / this.numberOfCarTypes;

    // Check if we're at minimum cars per type
    const isAtMinimumCarsPerType = this.currentCarsPerType <= minCarsPerType;

    // DECREASE: 0.1% low is below threshold
    if (pointOnePercentLowFps < POP_THRESHOLD_FPS) {
      carsPerTypeChangeAmount = -(this.currentCarsPerType * POP_DECREASE_PERCENTAGE);
      adjustmentReason = `0.1% low below threshold (0.1%: ${pointOnePercentLowFps.toFixed(1)}, Threshold: ${POP_THRESHOLD_FPS})`;
    }
    // INCREASE: 0.1% low is at or above threshold
    else {
      if (isAtMinimumCarsPerType) {
        // At minimum: add fixed amount to escape quickly
        carsPerTypeChangeAmount = POP_MINIMUM_ESCAPE_MULTIPLIER;
        adjustmentReason = `0.1% low above threshold, escaping minimum (0.1%: ${pointOnePercentLowFps.toFixed(1)}, Threshold: ${POP_THRESHOLD_FPS})`;
      } else {
        // Normal: add percentage
        carsPerTypeChangeAmount = this.currentCarsPerType * POP_INCREASE_PERCENTAGE;
        adjustmentReason = `0.1% low above threshold (0.1%: ${pointOnePercentLowFps.toFixed(1)}, Threshold: ${POP_THRESHOLD_FPS})`;
      }
    }

    // Apply maximum change rate constraint
    // EXCEPT when at minimum - then we want to escape quickly
    if (!isAtMinimumCarsPerType) {
      const maximumAllowedCarsPerTypeChange = this.currentCarsPerType * this.config.maxChangeRate;
      carsPerTypeChangeAmount = Math.max(-maximumAllowedCarsPerTypeChange, Math.min(maximumAllowedCarsPerTypeChange, carsPerTypeChangeAmount));
    }

    // Calculate new cars per type with constraints (keep as decimal for precision)
    let newCarsPerType = this.currentCarsPerType + carsPerTypeChangeAmount;
    newCarsPerType = Math.max(minCarsPerType, Math.min(maxCarsPerType, newCarsPerType));

    // Track consecutive changes for oscillation detection
    this.updateConsecutiveChangeTracking(newCarsPerType);

    // Update current cars per type
    const actualCarsPerTypeChange = newCarsPerType - this.currentCarsPerType;
    this.currentCarsPerType = newCarsPerType;

    // Calculate total population (rounded for actual car spawning)
    const newTotalPopulation = Math.round(newCarsPerType * this.numberOfCarTypes);

    // Generate user-friendly reason
    const changeDirection = actualCarsPerTypeChange > 0 ? '⬆️ Adding' : '⬇️ Reducing';
    const changeAmount = Math.abs(actualCarsPerTypeChange).toFixed(1);
    const finalReason = `${changeDirection} ${changeAmount} cars/type: ${adjustmentReason}`;

    return {
      totalPopulation: newTotalPopulation,
      populationPerType: newCarsPerType,
      numTypes: this.numberOfCarTypes,
      delta: actualCarsPerTypeChange,
      reason: finalReason,
      metrics: {
        fps: metrics.currentFps,
        error: (POP_THRESHOLD_FPS - pointOnePercentLowFps) / POP_THRESHOLD_FPS,
        stability: metrics.stability,
        trend: metrics.trend,
        headroom: metrics.headroom
      }
    };
  }

  /**
   * Return when no population change is needed
   */
  private returnNoChangeNeeded(
    metrics: PerformanceMetrics,
    reason: string
  ): PopulationAdjustment {
    const totalPopulation = Math.round(this.currentCarsPerType * this.numberOfCarTypes);
    return {
      totalPopulation: totalPopulation,
      populationPerType: this.currentCarsPerType,
      numTypes: this.numberOfCarTypes,
      delta: 0,
      reason,
      metrics: {
        fps: metrics.currentFps,
        error: (POP_THRESHOLD_FPS - metrics.p0_1Fps) / POP_THRESHOLD_FPS,
        stability: metrics.stability,
        trend: metrics.trend,
        headroom: metrics.headroom
      }
    };
  }

  /**
   * Track consecutive cars per type increases/decreases to detect oscillation
   */
  private updateConsecutiveChangeTracking(newCarsPerType: number): void {
    if (newCarsPerType > this.currentCarsPerType) {
      this.consecutiveCarsPerTypeIncreases++;
      this.consecutiveCarsPerTypeDecreases = 0;
    } else if (newCarsPerType < this.currentCarsPerType) {
      this.consecutiveCarsPerTypeDecreases++;
      this.consecutiveCarsPerTypeIncreases = 0;
    } else {
      this.consecutiveCarsPerTypeIncreases = 0;
      this.consecutiveCarsPerTypeDecreases = 0;
    }

    // If oscillating excessively (changing direction repeatedly), stabilize
    const isOscillatingExcessively =
      this.consecutiveCarsPerTypeIncreases > 5 ||
      this.consecutiveCarsPerTypeDecreases > 5;

    if (isOscillatingExcessively) {
      // Reset counters to break the oscillation pattern
      this.consecutiveCarsPerTypeIncreases = 0;
      this.consecutiveCarsPerTypeDecreases = 0;
    }
  }

  /**
   * Get current total population across all car types
   */
  getPopulation(): number {
    return Math.round(this.currentCarsPerType * this.numberOfCarTypes);
  }

  /**
   * Get current cars per type (can be decimal)
   */
  getCarsPerType(): number {
    return this.currentCarsPerType;
  }

  /**
   * Set population directly (e.g., for manual override or initial setup)
   */
  setPopulation(newPopulation: number): void {
    const minCarsPerType = this.config.minPopulation / this.numberOfCarTypes;
    const maxCarsPerType = this.config.maxPopulation / this.numberOfCarTypes;
    const newCarsPerType = newPopulation / this.numberOfCarTypes;
    this.currentCarsPerType = Math.max(minCarsPerType, Math.min(maxCarsPerType, newCarsPerType));
  }

  /**
   * Reset controller to initial state
   */
  reset(): void {
    this.currentCarsPerType = this.config.initialPopulation / this.numberOfCarTypes;
    this.frameCounterSinceLastAdjustment = 0;
    this.consecutiveCarsPerTypeIncreases = 0;
    this.consecutiveCarsPerTypeDecreases = 0;
  }
}
