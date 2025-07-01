import chalk from 'chalk';

/**
 * Log levels for CLI output
 */
export enum LogLevel {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info',
  DEBUG = 'debug',
  PLAIN = 'plain',
}

/**
 * Log a message with appropriate formatting
 * @param message - Message to log
 * @param level - Log level
 */
export function log(message: string, level: LogLevel = LogLevel.INFO): void {
  switch (level) {
    case LogLevel.ERROR:
      console.log(chalk.red(message));
      break;
    case LogLevel.WARNING:
      console.log(chalk.yellow(message));
      break;
    case LogLevel.SUCCESS:
      console.log(chalk.green(message));
      break;
    case LogLevel.DEBUG:
      console.log(chalk.gray(message));
      break;
    default:
      console.log(message);
  }
}

/**
 * Log an error message
 * @param message - Error message
 */
export function logError(message: string): void {
  log(`Error: ${message}`, LogLevel.ERROR);
}

/**
 * Log a success message
 * @param message - Success message
 */
export function logSuccess(message: string): void {
  log(`✓ ${message}`, LogLevel.SUCCESS);
}

/**
 * Log a warning message
 * @param message - Warning message
 */
export function logWarning(message: string): void {
  log(message, LogLevel.WARNING);
}

/**
 * Log debug information
 * @param message - Debug message
 */
export function logDebug(message: string): void {
  log(message, LogLevel.DEBUG);
}

/**
 * Log info message
 * @param message - Info message
 */
export function logInfo(message: string): void {
  log(message, LogLevel.INFO);
}

/**
 * Format a key-value pair for display
 * @param key - The key
 * @param value - The value
 * @param indent - Number of spaces to indent
 * @returns Formatted string
 */
export function formatKeyValue(key: string, value: string, indent: number = 2): string {
  const padding = ' '.repeat(indent);
  return chalk.gray(`${padding}${key}: ${value}`);
}

/**
 * Create a section header
 * @param title - Section title
 * @returns Formatted header
 */
export function sectionHeader(title: string): string {
  return chalk.bold(`\n${title}:\n`);
}
