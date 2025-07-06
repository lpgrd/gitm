import { describe, it, expect } from 'vitest';
import { maskEmail } from '@/utils/cli';

describe('Privacy utilities', () => {
  describe('maskEmail', () => {
    it('should mask standard email addresses', () => {
      expect(maskEmail('user@example.com')).toBe('u**r@e****e.com');
      expect(maskEmail('john.doe@company.org')).toBe('j***e@c****y.org');
      expect(maskEmail('alice@test.co.uk')).toBe('a***e@t**t.co.uk');
    });

    it('should handle short email parts', () => {
      expect(maskEmail('a@b.com')).toBe('a@b.com');
      expect(maskEmail('ab@cd.com')).toBe('a*@c*.com');
      expect(maskEmail('abc@de.com')).toBe('a*c@d*.com');
    });

    it('should handle complex email addresses', () => {
      expect(maskEmail('very.long.email@subdomain.example.com')).toBe('v***l@s****n.example.com');
      expect(maskEmail('test+tag@email.com')).toBe('t***g@e***l.com');
    });

    it('should return invalid emails unchanged', () => {
      expect(maskEmail('notanemail')).toBe('notanemail');
      expect(maskEmail('missing@domain')).toBe('missing@domain');
      expect(maskEmail('@nodomain.com')).toBe('@nodomain.com');
    });

    it('should limit asterisks to reasonable length', () => {
      expect(maskEmail('verylonglocalpart@verylongdomainname.com')).toBe('v***t@v****e.com');
    });
  });
});