import { describe, it, expect, beforeEach, jest, mock } from 'bun:test';
import { detectAccountForRepo } from '@/utils/git';
import { createMockAccount } from '../../helpers';

// Mock the modules before importing

mock.module('@/utils/providers', () => ({
  detectProvider: jest.fn(),
}));

mock.module('@/lib/config', () => ({
  getAccounts: jest.fn(),
}));

// Now import the modules after mocking
import { detectProvider } from '@/utils/providers';
import { getAccounts } from '@/lib/config';

describe('git utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectAccountForRepo', () => {
    it('should return null when no provider is detected', async () => {
      (detectProvider as any).mockReturnValue(null);
      
      const result = await detectAccountForRepo('invalid-url');
      
      expect(result).toBeNull();
    });

    it('should find exact match by username', async () => {
      const mockAccount = createMockAccount({
        provider: 'github',
        username: 'testuser',
      });
      
      (detectProvider as any).mockReturnValue({
        provider: 'github',
        organization: 'testuser',
        repository: 'test-repo',
      });
      
      (getAccounts as any).mockReturnValue({
        personal: mockAccount,
      });
      
      const result = await detectAccountForRepo('https://github.com/testuser/test-repo.git');
      
      expect(result).toEqual({
        profile: 'personal',
        account: mockAccount,
        repoInfo: {
          provider: 'github',
          organization: 'testuser',
          repository: 'test-repo',
        },
      });
    });

    it('should return single provider account when only one exists', async () => {
      const mockAccount = createMockAccount({
        provider: 'github',
        username: 'differentuser',
      });
      
      (detectProvider as any).mockReturnValue({
        provider: 'github',
        organization: 'someorg',
        repository: 'test-repo',
      });
      
      (getAccounts as any).mockReturnValue({
        work: mockAccount,
      });
      
      const result = await detectAccountForRepo('https://github.com/someorg/test-repo.git');
      
      expect(result).toEqual({
        profile: 'work',
        account: mockAccount,
        repoInfo: {
          provider: 'github',
          organization: 'someorg',
          repository: 'test-repo',
        },
      });
    });

    it('should return candidates when multiple provider accounts exist', async () => {
      const personalAccount = createMockAccount({
        provider: 'github',
        username: 'personal',
      });
      
      const workAccount = createMockAccount({
        provider: 'github',
        username: 'work',
        name: 'Work User',
        email: 'work@example.com',
      });
      
      (detectProvider as any).mockReturnValue({
        provider: 'github',
        organization: 'someorg',
        repository: 'test-repo',
      });
      
      (getAccounts as any).mockReturnValue({
        personal: personalAccount,
        work: workAccount,
      });
      
      const result = await detectAccountForRepo('https://github.com/someorg/test-repo.git');
      
      expect(result).toEqual({
        profile: null,
        account: null,
        repoInfo: {
          provider: 'github',
          organization: 'someorg',
          repository: 'test-repo',
        },
        candidates: [
          ['personal', personalAccount],
          ['work', workAccount],
        ],
      });
    });

    it('should return all accounts as candidates when no provider match', async () => {
      const githubAccount = createMockAccount({
        provider: 'github',
        username: 'ghuser',
      });
      
      const gitlabAccount = createMockAccount({
        provider: 'gitlab',
        username: 'gluser',
      });
      
      (detectProvider as any).mockReturnValue({
        provider: 'bitbucket',
        organization: 'bbuser',
        repository: 'test-repo',
      });
      
      (getAccounts as any).mockReturnValue({
        github: githubAccount,
        gitlab: gitlabAccount,
      });
      
      const result = await detectAccountForRepo('https://bitbucket.org/bbuser/test-repo.git');
      
      expect(result).toEqual({
        profile: null,
        account: null,
        repoInfo: {
          provider: 'bitbucket',
          organization: 'bbuser',
          repository: 'test-repo',
        },
        candidates: [
          ['github', githubAccount],
          ['gitlab', gitlabAccount],
        ],
      });
    });

    it('should handle case-insensitive username matching', async () => {
      const mockAccount = createMockAccount({
        provider: 'github',
        username: 'TestUser',
      });
      
      (detectProvider as any).mockReturnValue({
        provider: 'github',
        organization: 'testuser',
        repository: 'test-repo',
      });
      
      (getAccounts as any).mockReturnValue({
        personal: mockAccount,
      });
      
      const result = await detectAccountForRepo('https://github.com/testuser/test-repo.git');
      
      expect(result?.profile).toBe('personal');
    });
  });
});