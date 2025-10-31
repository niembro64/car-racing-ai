/**
 * PerformanceMonitor - Advanced system performance tracking
 *
 * Tracks multiple metrics:
 * - FPS (frames per second)
 * - Frame time variance (stability)
 * - Performance trends (improving/degrading)
 * - Percentile analysis (p50, p95, p99)
 *
 * All configuration values imported from config.ts
 */

import {
  PERF_INITIAL_SMOOTHED_FPS,
  PERF_SMOOTHING_FACTOR,
  PERF_TREND_WINDOW_SIZE,
  PERF_MAX_VALID_FRAME_TIME_MS,
  PERF_MAX_ACCEPTABLE_VARIANCE_MS,
  PERF_HEADROOM_FACTOR,
  PERF_MIN_TREND_SAMPLES,
  PERF_MAX_TREND_SLOPE,
  PERF_CALIBRATION_MIN_FRAMES,
  PERF_CALIBRATION_HISTORY_RATIO,
} from '@/config';

export interface PerformanceMetrics {
  currentFps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  p0_1Fps: number; // 0.1% low (worst 0.1% of frames)
  p1Fps: number; // 1% low (worst 1% of frames)
  p5Fps: number; // 5% low (worst 5% of frames)
  p50Fps: number; // Median
  p95Fps: number; // 95th percentile
  p99Fps: number; // 99th percentile
  p99_9Fps: number; // 99.9th percentile (0.1% high - best 0.1% of frames)
  frameTimeMs: number;
  frameTimeVariance: number; // Standard deviation
  trend: number; // -1 to 1 (degrading to improving)
  stability: number; // 0 to 1 (unstable to stable)
  headroom: number; // How much performance headroom (0 to 1)
}

export class PerformanceMonitor {
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private readonly maxHistorySize: number;
  private readonly targetFps: number;
  private lastFrameTime: number = performance.now();

  // Smoothing and trend tracking
  private smoothedFps: number = PERF_INITIAL_SMOOTHED_FPS;
  private smoothingFactor: number = PERF_SMOOTHING_FACTOR;
  private trendWindow: number[] = [];
  private readonly trendWindowSize: number = PERF_TREND_WINDOW_SIZE;

  constructor(targetFps: number = 60, historySize: number = 120) {
    this.targetFps = targetFps;
    this.maxHistorySize = historySize;
  }

  /**
   * Record a new frame and update metrics
   */
  recordFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (frameTime > 0 && frameTime < PERF_MAX_VALID_FRAME_TIME_MS) { // Ignore invalid measurements
      const fps = 1000 / frameTime;

      // Update FPS history
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift();
      }

      // Update frame time history
      this.frameTimeHistory.push(frameTime);
      if (this.frameTimeHistory.length > this.maxHistorySize) {
        this.frameTimeHistory.shift();
      }

      // Update smoothed FPS (Exponential Moving Average)
      this.smoothedFps = this.smoothingFactor * fps + (1 - this.smoothingFactor) * this.smoothedFps;

      // Update trend window
      this.trendWindow.push(fps);
      if (this.trendWindow.length > this.trendWindowSize) {
        this.trendWindow.shift();
      }
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getMetrics(): PerformanceMetrics {
    if (this.fpsHistory.length === 0) {
      return this.getDefaultMetrics();
    }

    const sortedFps = [...this.fpsHistory].sort((a, b) => a - b);
    const averageFps = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    const minFps = Math.min(...this.fpsHistory);
    const maxFps = Math.max(...this.fpsHistory);

    // Percentiles (low percentiles = worst frames, high percentiles = best frames)
    const p0_1Fps = this.getPercentile(sortedFps, 0.001); // 0.1% low
    const p1Fps = this.getPercentile(sortedFps, 0.01); // 1% low
    const p5Fps = this.getPercentile(sortedFps, 0.05); // 5% low
    const p50Fps = this.getPercentile(sortedFps, 0.5);
    const p95Fps = this.getPercentile(sortedFps, 0.95);
    const p99Fps = this.getPercentile(sortedFps, 0.99);
    const p99_9Fps = this.getPercentile(sortedFps, 0.999); // 99.9th percentile (0.1% high)

    // Frame time variance (standard deviation)
    const avgFrameTime = this.frameTimeHistory.reduce((sum, t) => sum + t, 0) / this.frameTimeHistory.length;
    const variance = this.frameTimeHistory.reduce((sum, t) => sum + Math.pow(t - avgFrameTime, 2), 0) / this.frameTimeHistory.length;
    const frameTimeVariance = Math.sqrt(variance);

    // Trend analysis (-1 to 1, negative = degrading, positive = improving)
    const trend = this.calculateTrend();

    // Stability (0 to 1, based on variance)
    // Lower variance = more stable
    const stability = Math.max(0, 1 - (frameTimeVariance / PERF_MAX_ACCEPTABLE_VARIANCE_MS));

    // Headroom (how much capacity we have)
    // Based on how far we are from target FPS
    const headroom = Math.min(1, Math.max(0, (this.smoothedFps - this.targetFps * PERF_HEADROOM_FACTOR) / (this.targetFps * PERF_HEADROOM_FACTOR)));

    return {
      currentFps: this.smoothedFps,
      averageFps,
      minFps,
      maxFps,
      p0_1Fps,
      p1Fps,
      p5Fps,
      p50Fps,
      p95Fps,
      p99Fps,
      p99_9Fps,
      frameTimeMs: avgFrameTime,
      frameTimeVariance,
      trend,
      stability,
      headroom
    };
  }

  /**
   * Calculate trend (-1 to 1)
   * Uses linear regression on recent FPS samples
   */
  private calculateTrend(): number {
    if (this.trendWindow.length < PERF_MIN_TREND_SAMPLES) {
      return 0;
    }

    // Simple linear regression
    const n = this.trendWindow.length;
    const xSum = (n * (n - 1)) / 2; // 0 + 1 + 2 + ... + (n-1)
    const ySum = this.trendWindow.reduce((sum, fps) => sum + fps, 0);
    const xySum = this.trendWindow.reduce((sum, fps, i) => sum + i * fps, 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);

    // Normalize slope to -1 to 1 range
    return Math.max(-1, Math.min(1, slope / PERF_MAX_TREND_SLOPE));
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.floor(sortedArray.length * percentile);
    return sortedArray[Math.min(index, sortedArray.length - 1)];
  }

  /**
   * Get default metrics when no data is available
   */
  private getDefaultMetrics(): PerformanceMetrics {
    return {
      currentFps: this.targetFps,
      averageFps: this.targetFps,
      minFps: this.targetFps,
      maxFps: this.targetFps,
      p0_1Fps: this.targetFps,
      p1Fps: this.targetFps,
      p5Fps: this.targetFps,
      p50Fps: this.targetFps,
      p95Fps: this.targetFps,
      p99Fps: this.targetFps,
      p99_9Fps: this.targetFps,
      frameTimeMs: 1000 / this.targetFps,
      frameTimeVariance: 0,
      trend: 0,
      stability: 1,
      headroom: 1
    };
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.trendWindow = [];
    this.smoothedFps = this.targetFps;
    this.lastFrameTime = performance.now();
  }

  /**
   * Check if we have enough data for reliable metrics
   */
  isCalibrated(): boolean {
    return this.fpsHistory.length >= Math.min(PERF_CALIBRATION_MIN_FRAMES, this.maxHistorySize * PERF_CALIBRATION_HISTORY_RATIO);
  }
}
