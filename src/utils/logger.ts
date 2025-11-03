/**
 * Logger utility for conditional console output
 * Separated to avoid circular dependencies with CONFIG
 */

/**
 * Configuration for console logging
 * Set to false to disable all console.log output via print()
 */
export const LOGGING_CONFIG = {
  enableConsoleLogs: true,
};

/**
 * Conditional console.log wrapper
 * Only logs if LOGGING_CONFIG.enableConsoleLogs is true
 */
export function print(...args: any[]): void {
  if (LOGGING_CONFIG.enableConsoleLogs) {
    console.log(...args);
  }
}
