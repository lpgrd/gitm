import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAccountForRepo } from '@/utils/git';
import { detectProvider } from '@/utils/providers';
import { getAccounts } from '@/lib/config';
import { createMockAccount } from '../../helpers';

vi.mock('@/utils/providers');
vi.mock('@/lib/config');

describe('git utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectAccountForRepo', () => {
    it('should return null when no provider is detected', async () => {
      vi.mocked(detectProvider).mockReturnValue(null);
      
      const result = await detectAccountForRepo('invalid-url');
      
      expect(result).toBeNull();
    });

    it('should find exact match by username', async () => {
      const mockAccount = createMockAccount({
        provider: 'github',
        username: 'testuser',
      });
      
      vi.mocked(detectProvider).mockReturnValue({
        provider: 'github',
        organization: 'testuser',
        repository: 'test-repo',
      });
      
      vi.mocked(getAccounts).mockReturnValue({
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
      
      vi.mocked(detectProvider).mockReturnValue({
        provider: 'github',
        organization: 'someorg',
        repository: 'test-repo',
      });
      
      vi.mocked(getAccounts).mockReturnValue({
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
      
      vi.mocked(detectProvider).mockReturnValue({
        provider: 'github',
        organization: 'someorg',
        repository: 'test-repo',
      });
      
      vi.mocked(getAccounts).mockReturnValue({
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
      
      vi.mocked(detectProvider).mockReturnValue({
        provider: 'bitbucket',
        organization: 'bbuser',
        repository: 'test-repo',
      });
      
      vi.mocked(getAccounts).mockReturnValue({
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
      
      vi.mocked(detectProvider).mockReturnValue({
        provider: 'github',
        organization: 'testuser',
        repository: 'test-repo',
      });
      
      vi.mocked(getAccounts).mockReturnValue({
        personal: mockAccount,
      });
      
      const result = await detectAccountForRepo('https://github.com/testuser/test-repo.git');
      
      expect(result?.profile).toBe('personal');
    });
  });
});