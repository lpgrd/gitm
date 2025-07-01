import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import {
  log,
  LogLevel,
  logError,
  logSuccess,
  logWarning,
  logDebug,
  logInfo,
  formatKeyValue,
  sectionHeader,
} from '@/utils/cli';

describe('cli utilities', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Force chalk to use colors in tests
    chalk.level = 1;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('log', () => {
    it('should log with appropriate colors based on level', () => {
      log('error message', LogLevel.ERROR);
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.red('error message'));

      log('warning message', LogLevel.WARNING);
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('warning message'));

      log('success message', LogLevel.SUCCESS);
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('success message'));

      log('debug message', LogLevel.DEBUG);
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray('debug message'));

      log('info message', LogLevel.INFO);
      expect(consoleLogSpy).toHaveBeenCalledWith('info message');

      log('plain message', LogLevel.PLAIN);
      expect(consoleLogSpy).toHaveBeenCalledWith('plain message');
    });

    it('should default to info level', () => {
      log('default message');
      expect(consoleLogSpy).toHaveBeenCalledWith('default message');
    });
  });

  describe('logError', () => {
    it('should prepend "Error: " and use red color', () => {
      logError('Something went wrong');
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.red('Error: Something went wrong'));
    });
  });

  describe('logSuccess', () => {
    it('should prepend checkmark and use green color', () => {
      logSuccess('Operation completed');
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✓ Operation completed'));
    });
  });

  describe('logWarning', () => {
    it('should use yellow color', () => {
      logWarning('Be careful');
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('Be careful'));
    });
  });

  describe('logDebug', () => {
    it('should use gray color', () => {
      logDebug('Debug info');
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray('Debug info'));
    });
  });

  describe('logInfo', () => {
    it('should log without color modification', () => {
      logInfo('Information');
      expect(consoleLogSpy).toHaveBeenCalledWith('Information');
    });
  });

  describe('formatKeyValue', () => {
    it('should format key-value pairs with default indentation', () => {
      const result = formatKeyValue('Name', 'John Doe');
      expect(result).toBe(chalk.gray('  Name: John Doe'));
    });

    it('should use custom indentation', () => {
      const result = formatKeyValue('Email', 'john@example.com', 4);
      expect(result).toBe(chalk.gray('    Email: john@example.com'));
    });

    it('should handle empty values', () => {
      const result = formatKeyValue('Key', '');
      expect(result).toBe(chalk.gray('  Key: '));
    });
  });

  describe('sectionHeader', () => {
    it('should create bold section headers with newlines', () => {
      const result = sectionHeader('Configuration');
      expect(result).toBe(chalk.bold('\nConfiguration:\n'));
    });

    it('should handle empty titles', () => {
      const result = sectionHeader('');
      expect(result).toBe(chalk.bold('\n:\n'));
    });
  });
});