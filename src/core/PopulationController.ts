/**
 * PopulationController - Intelligent adaptive population management
 *
 * Uses a PID-like control algorithm with multiple performance metrics to
 * dynamically adjust car population for optimal performance.
 *
 * Features:
 * - PID control for smooth, stable adjustments
 * - Multi-metric decision making (FPS, stability, trend)
 * - Predictive adjustments based on performance trends
 * - Hysteresis to prevent oscillation
 * - Configurable safety constraints
 */

import type { PerformanceMetrics } from './PerformanceMonitor';

export interface PopulationControllerConfig {
  targetFps: number;
  minPopulation: number;
  maxPopulation: number;
  initialPopulation: number;

  // PID gains
  kProportional: number; // Proportional gain
  kIntegral: number;     // Integral gain
  kDerivative: number;   // Derivative gain

  // Adjustment constraints
  maxChangeRate: number;      // Max population change per adjustment (fraction)
  adjustmentInterval: number; // Frames between adjustments

  // Hysteresis (prevent oscillation near target)
  hysteresisThreshold: number; // FPS deviation needed to trigger change

  // Safety thresholds
  emergencyFpsThreshold: number; // Aggressive reduction below this FPS
  safeFpsThreshold: number;      // Conservative growth above this FPS
}

export interface PopulationAdjustment {
  totalPopulation: number; // Total across all types
  populationPerType: number; // Population per car type
  numTypes: number; // Number of car types
  delta: number;
  reason: string;
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
  private numCarTypes: number;

  // PID state
  private currentPopulation: number;
  private errorIntegral: number = 0;
  private lastError: number = 0;
  private adjustmentCounter: number = 0;

  // State tracking
  private consecutiveIncreases: number = 0;
  private consecutiveDecreases: number = 0;

  constructor(config: PopulationControllerConfig, numCarTypes: number) {
    this.config = config;
    this.numCarTypes = numCarTypes;
    this.currentPopulation = config.initialPopulation;
  }

  /**
   * Calculate optimal population based on current performance metrics
   */
  calculateOptimalPopulation(metrics: PerformanceMetrics): PopulationAdjustment {
    this.adjustmentCounter++;

    // Only adjust at specified intervals
    if (this.adjustmentCounter % this.config.adjustmentInterval !== 0) {
      return this.noChange(metrics);
    }

    // Calculate FPS error (how far from target)
    const fpsError = this.config.targetFps - metrics.currentFps;
    const relativeError = fpsError / this.config.targetFps;

    // Check if we're in hysteresis zone (too close to target to adjust)
    if (Math.abs(relativeError) < this.config.hysteresisThreshold && metrics.stability > 0.7) {
      return this.noChange(metrics, 'Within hysteresis zone, performance stable');
    }

    // Emergency handling: Severe performance degradation
    // Check both current FPS and 0.1% low FPS to prevent extreme frame drops
    const emergencyThreshold = this.config.emergencyFpsThreshold;
    const extremeLowThreshold = this.config.targetFps / 2; // 0.1% low should never go below half target

    if (metrics.currentFps < emergencyThreshold || metrics.p0_1Fps < extremeLowThreshold) {
      const reason = metrics.p0_1Fps < extremeLowThreshold
        ? '0.1% low FPS critically low'
        : 'current FPS critically low';
      return this.emergencyReduction(metrics, fpsError, reason);
    }

    // Calculate PID components
    const proportional = this.calculateProportional(fpsError, metrics);
    const integral = this.calculateIntegral(fpsError);
    const derivative = this.calculateDerivative(fpsError, metrics);

    // Combine PID terms
    const pidOutput = proportional + integral + derivative;

    // Apply predictive adjustment based on trend
    const predictive = this.calculatePredictive(metrics);

    // Final population change (negative pidOutput = need to reduce population)
    let populationChange = -(pidOutput + predictive);

    // Apply rate limiting
    const maxChange = this.currentPopulation * this.config.maxChangeRate;
    populationChange = Math.max(-maxChange, Math.min(maxChange, populationChange));

    // Calculate new population
    let newPopulation = Math.round(this.currentPopulation + populationChange);

    // Apply constraints
    newPopulation = Math.max(this.config.minPopulation, Math.min(this.config.maxPopulation, newPopulation));

    // Track consecutive changes for stability analysis
    this.updateConsecutiveTracking(newPopulation);

    // Update state
    this.lastError = fpsError;
    const actualChange = newPopulation - this.currentPopulation;
    this.currentPopulation = newPopulation;

    // Generate reason string
    const reason = this.generateReason(actualChange, metrics, { proportional, integral, derivative, predictive });

    return {
      totalPopulation: newPopulation,
      populationPerType: Math.floor(newPopulation / this.numCarTypes),
      numTypes: this.numCarTypes,
      delta: actualChange,
      reason,
      metrics: {
        fps: metrics.currentFps,
        error: relativeError,
        stability: metrics.stability,
        trend: metrics.trend,
        headroom: metrics.headroom
      }
    };
  }

  /**
   * Proportional term: Responds to current error
   */
  private calculateProportional(fpsError: number, metrics: PerformanceMetrics): number {
    // Scale by stability - more aggressive when unstable
    const stabilityFactor = 1.0 + (1.0 - metrics.stability) * 0.5;

    // Additional factor based on 0.1% low FPS
    // If 0.1% low is getting close to half target FPS, be more aggressive
    const extremeLowThreshold = this.config.targetFps / 2;
    const extremeLowMargin = metrics.p0_1Fps - extremeLowThreshold;
    const extremeLowBuffer = this.config.targetFps * 0.3; // React when within 30% FPS of threshold

    let extremeLowFactor = 1.0;
    if (extremeLowMargin < extremeLowBuffer) {
      // Scale from 1.0 to 2.0 as we approach threshold
      extremeLowFactor = 1.0 + (1.0 - extremeLowMargin / extremeLowBuffer) * 1.0;
    }

    return this.config.kProportional * fpsError * stabilityFactor * extremeLowFactor;
  }

  /**
   * Integral term: Accumulates error over time (eliminates steady-state error)
   */
  private calculateIntegral(fpsError: number): number {
    // Accumulate error
    this.errorIntegral += fpsError;

    // Anti-windup: Clamp integral to prevent excessive accumulation
    const maxIntegral = this.config.targetFps * 10;
    this.errorIntegral = Math.max(-maxIntegral, Math.min(maxIntegral, this.errorIntegral));

    // Decay integral when performance is good (prevent overshoot)
    if (Math.abs(fpsError) < this.config.targetFps * 0.1) {
      this.errorIntegral *= 0.95;
    }

    return this.config.kIntegral * this.errorIntegral;
  }

  /**
   * Derivative term: Responds to rate of change (damping)
   */
  private calculateDerivative(fpsError: number, metrics: PerformanceMetrics): number {
    const errorRate = fpsError - this.lastError;

    // Use trend as additional derivative signal
    const trendComponent = metrics.trend * this.config.targetFps * 0.1;

    return this.config.kDerivative * (errorRate - trendComponent);
  }

  /**
   * Predictive term: Anticipate future needs based on trends
   */
  private calculatePredictive(metrics: PerformanceMetrics): number {
    // If performance is degrading, reduce population preemptively
    if (metrics.trend < -0.3 && metrics.headroom < 0.3) {
      return this.currentPopulation * 0.05; // Reduce by 5%
    }

    // If performance is improving with headroom, can add population
    if (metrics.trend > 0.3 && metrics.headroom > 0.7 && metrics.stability > 0.8) {
      return -this.currentPopulation * 0.03; // Increase by 3%
    }

    return 0;
  }

  /**
   * Emergency reduction when performance is critical
   */
  private emergencyReduction(metrics: PerformanceMetrics, fpsError: number, triggerReason: string = 'current FPS critically low'): PopulationAdjustment {
    // Aggressive reduction: 20-40% depending on severity
    const severity = Math.min(1, fpsError / this.config.emergencyFpsThreshold);
    const reductionFactor = 0.2 + severity * 0.2;

    const newPopulation = Math.max(
      this.config.minPopulation,
      Math.round(this.currentPopulation * (1 - reductionFactor))
    );

    const delta = newPopulation - this.currentPopulation;
    this.currentPopulation = newPopulation;
    this.errorIntegral = 0; // Reset integral to prevent windup

    return {
      totalPopulation: newPopulation,
      populationPerType: Math.floor(newPopulation / this.numCarTypes),
      numTypes: this.numCarTypes,
      delta,
      reason: `🚨 EMERGENCY: ${triggerReason} (curr: ${metrics.currentFps.toFixed(1)}, 0.1%: ${metrics.p0_1Fps.toFixed(1)}), reducing ${Math.abs(delta)} cars`,
      metrics: {
        fps: metrics.currentFps,
        error: fpsError / this.config.targetFps,
        stability: metrics.stability,
        trend: metrics.trend,
        headroom: metrics.headroom
      }
    };
  }

  /**
   * No change needed
   */
  private noChange(metrics: PerformanceMetrics, reason: string = 'Not adjustment interval'): PopulationAdjustment {
    return {
      totalPopulation: this.currentPopulation,
      populationPerType: Math.floor(this.currentPopulation / this.numCarTypes),
      numTypes: this.numCarTypes,
      delta: 0,
      reason,
      metrics: {
        fps: metrics.currentFps,
        error: (this.config.targetFps - metrics.currentFps) / this.config.targetFps,
        stability: metrics.stability,
        trend: metrics.trend,
        headroom: metrics.headroom
      }
    };
  }

  /**
   * Generate human-readable reason for adjustment
   */
  private generateReason(
    delta: number,
    metrics: PerformanceMetrics,
    pidComponents: { proportional: number; integral: number; derivative: number; predictive: number }
  ): string {
    if (delta === 0) {
      return `Stable at ${this.currentPopulation} cars (FPS: ${metrics.currentFps.toFixed(1)})`;
    }

    const direction = delta > 0 ? '⬆️ Adding' : '⬇️ Reducing';
    const amount = Math.abs(delta);

    // Determine primary reason
    let primaryReason = '';
    const absComponents = {
      proportional: Math.abs(pidComponents.proportional),
      integral: Math.abs(pidComponents.integral),
      derivative: Math.abs(pidComponents.derivative),
      predictive: Math.abs(pidComponents.predictive)
    };

    const maxComponent = Math.max(
      absComponents.proportional,
      absComponents.integral,
      absComponents.derivative,
      absComponents.predictive
    );

    if (maxComponent === absComponents.proportional) {
      primaryReason = delta < 0 ? 'FPS below target' : 'FPS above target';
    } else if (maxComponent === absComponents.integral) {
      primaryReason = 'Persistent performance gap';
    } else if (maxComponent === absComponents.derivative) {
      primaryReason = metrics.trend < 0 ? 'Performance degrading' : 'Performance improving';
    } else {
      primaryReason = metrics.trend < 0 ? 'Predicted degradation' : 'Predicted headroom';
    }

    return `${direction} ${amount} cars: ${primaryReason} (FPS: ${metrics.currentFps.toFixed(1)}, Stability: ${(metrics.stability * 100).toFixed(0)}%)`;
  }

  /**
   * Track consecutive increases/decreases for stability monitoring
   */
  private updateConsecutiveTracking(newPopulation: number): void {
    if (newPopulation > this.currentPopulation) {
      this.consecutiveIncreases++;
      this.consecutiveDecreases = 0;
    } else if (newPopulation < this.currentPopulation) {
      this.consecutiveDecreases++;
      this.consecutiveIncreases = 0;
    } else {
      this.consecutiveIncreases = 0;
      this.consecutiveDecreases = 0;
    }

    // If oscillating too much, increase hysteresis
    if (this.consecutiveIncreases > 5 || this.consecutiveDecreases > 5) {
      // Reset to break the pattern
      this.errorIntegral *= 0.5;
      this.consecutiveIncreases = 0;
      this.consecutiveDecreases = 0;
    }
  }

  /**
   * Get current population
   */
  getPopulation(): number {
    return this.currentPopulation;
  }

  /**
   * Set population directly (e.g., for manual override)
   */
  setPopulation(population: number): void {
    this.currentPopulation = Math.max(
      this.config.minPopulation,
      Math.min(this.config.maxPopulation, population)
    );
    this.errorIntegral = 0; // Reset PID state
    this.lastError = 0;
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.currentPopulation = this.config.initialPopulation;
    this.errorIntegral = 0;
    this.lastError = 0;
    this.adjustmentCounter = 0;
    this.consecutiveIncreases = 0;
    this.consecutiveDecreases = 0;
  }
}
