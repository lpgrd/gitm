import { describe, it, expect } from 'vitest';
import {
  detectProvider,
  getProviderList,
  isValidProvider,
  getProviderDisplayName,
} from '@/utils/providers';

describe('provider utilities', () => {
  describe('detectProvider', () => {
    it('should detect GitHub URLs', () => {
      const httpResult = detectProvider('https://github.com/user/repo.git');
      expect(httpResult).toEqual({
        provider: 'github',
        organization: 'user',
        repository: 'repo',
      });

      const sshResult = detectProvider('git@github.com:user/repo.git');
      expect(sshResult).toEqual({
        provider: 'github',
        organization: 'user',
        repository: 'repo',
      });

      const noGitExt = detectProvider('https://github.com/user/repo');
      expect(noGitExt).toEqual({
        provider: 'github',
        organization: 'user',
        repository: 'repo',
      });
    });

    it('should detect GitLab URLs', () => {
      const httpResult = detectProvider('https://gitlab.com/user/repo.git');
      expect(httpResult).toEqual({
        provider: 'gitlab',
        organization: 'user',
        repository: 'repo',
      });

      const sshResult = detectProvider('git@gitlab.com:user/repo.git');
      expect(sshResult).toEqual({
        provider: 'gitlab',
        organization: 'user',
        repository: 'repo',
      });
    });

    it('should detect Bitbucket URLs', () => {
      const httpResult = detectProvider('https://bitbucket.org/user/repo.git');
      expect(httpResult).toEqual({
        provider: 'bitbucket',
        organization: 'user',
        repository: 'repo',
      });

      const sshResult = detectProvider('git@bitbucket.org:user/repo.git');
      expect(sshResult).toEqual({
        provider: 'bitbucket',
        organization: 'user',
        repository: 'repo',
      });
    });

    it('should handle nested organization paths', () => {
      const result = detectProvider('https://gitlab.com/group/subgroup/repo.git');
      expect(result).toEqual({
        provider: 'gitlab',
        organization: 'group',
        repository: 'subgroup/repo',
      });
    });

    it('should return null for unknown providers', () => {
      expect(detectProvider('https://unknown.com/user/repo.git')).toBeNull();
      expect(detectProvider('not-a-url')).toBeNull();
      expect(detectProvider('')).toBeNull();
    });

  });

  describe('getProviderList', () => {
    it('should return list of supported providers', () => {
      const providers = getProviderList();
      expect(providers).toContain('github');
      expect(providers).toContain('gitlab');
      expect(providers).toContain('bitbucket');
      expect(providers.length).toBe(3);
    });
  });

  describe('isValidProvider', () => {
    it('should return true for valid providers', () => {
      expect(isValidProvider('github')).toBe(true);
      expect(isValidProvider('gitlab')).toBe(true);
      expect(isValidProvider('bitbucket')).toBe(true);
    });

    it('should return false for invalid providers', () => {
      expect(isValidProvider('unknown')).toBe(false);
      expect(isValidProvider('')).toBe(false);
      expect(isValidProvider('GitHub')).toBe(false); // case sensitive
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return display names for valid providers', () => {
      expect(getProviderDisplayName('github')).toBe('GitHub');
      expect(getProviderDisplayName('gitlab')).toBe('GitLab');
      expect(getProviderDisplayName('bitbucket')).toBe('Bitbucket');
    });

    it('should return the key for unknown providers', () => {
      expect(getProviderDisplayName('unknown')).toBe('unknown');
      expect(getProviderDisplayName('')).toBe('');
    });
  });
});