/**
 * PerformanceMonitor - Advanced system performance tracking
 *
 * Tracks multiple metrics:
 * - FPS (frames per second)
 * - Frame time variance (stability)
 * - Performance trends (improving/degrading)
 * - Percentile analysis (p50, p95, p99)
 */

export interface PerformanceMetrics {
  currentFps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  p50Fps: number; // Median
  p95Fps: number; // 95th percentile
  p99Fps: number; // 99th percentile
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
  private smoothedFps: number = 60;
  private smoothingFactor: number = 0.1; // EMA smoothing
  private trendWindow: number[] = [];
  private readonly trendWindowSize: number = 20;

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

    if (frameTime > 0 && frameTime < 1000) { // Ignore invalid measurements
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

    // Percentiles
    const p50Fps = this.getPercentile(sortedFps, 0.5);
    const p95Fps = this.getPercentile(sortedFps, 0.95);
    const p99Fps = this.getPercentile(sortedFps, 0.99);

    // Frame time variance (standard deviation)
    const avgFrameTime = this.frameTimeHistory.reduce((sum, t) => sum + t, 0) / this.frameTimeHistory.length;
    const variance = this.frameTimeHistory.reduce((sum, t) => sum + Math.pow(t - avgFrameTime, 2), 0) / this.frameTimeHistory.length;
    const frameTimeVariance = Math.sqrt(variance);

    // Trend analysis (-1 to 1, negative = degrading, positive = improving)
    const trend = this.calculateTrend();

    // Stability (0 to 1, based on variance)
    // Lower variance = more stable
    const maxAcceptableVariance = 10; // ms
    const stability = Math.max(0, 1 - (frameTimeVariance / maxAcceptableVariance));

    // Headroom (how much capacity we have)
    // Based on how far we are from target FPS
    const headroom = Math.min(1, Math.max(0, (this.smoothedFps - this.targetFps * 0.5) / (this.targetFps * 0.5)));

    return {
      currentFps: this.smoothedFps,
      averageFps,
      minFps,
      maxFps,
      p50Fps,
      p95Fps,
      p99Fps,
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
    if (this.trendWindow.length < 5) {
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
    // A slope of ±5 FPS per sample is considered max trend
    return Math.max(-1, Math.min(1, slope / 5));
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
      p50Fps: this.targetFps,
      p95Fps: this.targetFps,
      p99Fps: this.targetFps,
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
    return this.fpsHistory.length >= Math.min(60, this.maxHistorySize * 0.5);
  }
}
