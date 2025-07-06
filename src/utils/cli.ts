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

/**
 * Mask an email address for privacy
 * @param email - Email address to mask
 * @returns Masked email (e.g., u***r@e****e.com)
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const [local, domain] = parts;

  // Check for empty local part
  if (!local) return email;

  const domainParts = domain.split('.');

  // Check if domain has at least one dot (valid email format)
  if (domainParts.length < 2) return email;

  // Mask local part (keep first and last char if length > 2)
  let maskedLocal: string;
  if (local.length === 1) {
    maskedLocal = local;
  } else if (local.length === 2) {
    maskedLocal = local[0] + '*';
  } else if (local.length <= 5) {
    // For short names, use exact number of asterisks
    maskedLocal = local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
  } else {
    // For longer names, limit to 3 asterisks
    maskedLocal = local[0] + '***' + local[local.length - 1];
  }

  // Mask domain (keep first and last char of main part if length > 2)
  const mainDomain = domainParts[0];
  let maskedDomain: string;
  if (mainDomain.length === 1) {
    maskedDomain = mainDomain;
  } else if (mainDomain.length === 2) {
    maskedDomain = mainDomain[0] + '*';
  } else if (mainDomain.length <= 6) {
    // For short domains, use exact number of asterisks
    maskedDomain =
      mainDomain[0] + '*'.repeat(mainDomain.length - 2) + mainDomain[mainDomain.length - 1];
  } else {
    // For longer domains, limit to 4 asterisks
    maskedDomain = mainDomain[0] + '****' + mainDomain[mainDomain.length - 1];
  }

  // Reconstruct email with TLD intact
  const tld = domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomain}.${tld}`;
}
