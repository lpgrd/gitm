import { describe, it, expect } from 'bun:test';
import { sanitizeForFilename } from '@/utils/shell';

describe('shell utilities', () => {
  describe('sanitizeForFilename', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeForFilename('normal-name')).toBe('normal-name');
      expect(sanitizeForFilename('name with spaces')).toBe('name_with_spaces');
      expect(sanitizeForFilename('name/with/slashes')).toBe('name_with_slashes');
      expect(sanitizeForFilename('name\\with\\backslashes')).toBe('name_with_backslashes');
      expect(sanitizeForFilename('name:with:colons')).toBe('name_with_colons');
      expect(sanitizeForFilename('name*with*asterisks')).toBe('name_with_asterisks');
      expect(sanitizeForFilename('name?with?questions')).toBe('name_with_questions');
      expect(sanitizeForFilename('name"with"quotes')).toBe('name_with_quotes');
      expect(sanitizeForFilename('name<with>brackets')).toBe('name_with_brackets');
      expect(sanitizeForFilename('name|with|pipes')).toBe('name_with_pipes');
    });

    it('should handle empty strings', () => {
      expect(sanitizeForFilename('')).toBe('');
    });

    it('should handle strings with only invalid characters', () => {
      expect(sanitizeForFilename('///\\\\')).toBe('_____');
    });
  });

  // TODO: Add tests for safeExec once we figure out the proper mocking strategy
});