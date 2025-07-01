import simpleGit, { SimpleGit } from 'simple-git';
import { RemoteInfo, DetectionResult, GitAccount } from '@/types';
import { detectProvider } from '@/utils/providers';
import { getAccount, getAccounts } from '@/lib/config';
import { sanitizeForFilename } from '@/utils/shell';

/**
 * Get the current repository's remote information
 * @param git - SimpleGit instance (optional)
 * @returns Remote information
 * @throws Error if not in a git repository or no remote configured
 */
export async function getCurrentRepo(git?: SimpleGit): Promise<RemoteInfo> {
  const gitInstance = git || simpleGit(process.cwd());

  const isRepo = await gitInstance.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not in a git repository');
  }

  const remotes = await gitInstance.getRemotes(true);
  if (remotes.length === 0) {
    throw new Error('No remote configured');
  }

  const remote = remotes.find(r => r.name === 'origin') || remotes[0];
  return {
    url: remote.refs.fetch || remote.refs.push || '',
    name: remote.name,
  };
}

/**
 * Detect the appropriate account for a repository URL
 * @param url - Repository URL
 * @returns Detection result with matched account or candidates
 */
export async function detectAccountForRepo(url: string): Promise<DetectionResult | null> {
  const repoInfo = detectProvider(url);
  if (!repoInfo) {
    return null;
  }

  const accounts = getAccounts();

  for (const [profile, account] of Object.entries(accounts)) {
    if (
      account.provider === repoInfo.provider &&
      account.username.toLowerCase() === repoInfo.organization.toLowerCase()
    ) {
      return { profile, account, repoInfo };
    }
  }

  const providerAccounts = Object.entries(accounts).filter(
    ([_, account]) => account.provider === repoInfo.provider
  );

  if (providerAccounts.length === 1) {
    return {
      profile: providerAccounts[0][0],
      account: providerAccounts[0][1],
      repoInfo,
    };
  }

  if (providerAccounts.length > 1) {
    return {
      profile: null,
      account: null,
      repoInfo,
      candidates: providerAccounts,
    };
  }

  const allAccounts = Object.entries(accounts);
  if (allAccounts.length > 0) {
    return {
      profile: null,
      account: null,
      repoInfo,
      candidates: allAccounts,
    };
  }

  return null;
}

/**
 * Set git configuration for the current repository
 * @param account - Account to use for configuration
 * @param git - SimpleGit instance (optional)
 */
export async function setRepoConfig(account: GitAccount, git?: SimpleGit): Promise<void> {
  const gitInstance = git || simpleGit(process.cwd());

  // Sanitize values to prevent any potential injection
  const safeName = account.name.replace(/['"\\]/g, '');
  const safeEmail = account.email.replace(/['"\\]/g, '');

  await gitInstance.addConfig('user.name', safeName);
  await gitInstance.addConfig('user.email', safeEmail);
}

/**
 * Update the remote URL for a repository
 * @param remoteName - Name of the remote (e.g., 'origin')
 * @param newUrl - New URL to set
 * @param git - SimpleGit instance (optional)
 */
export async function updateRemoteUrl(
  remoteName: string,
  newUrl: string,
  git?: SimpleGit
): Promise<void> {
  const gitInstance = git || simpleGit(process.cwd());

  const safeRemoteName = sanitizeForFilename(remoteName);

  if (!newUrl.match(/^(https?:\/\/|git@|ssh:\/\/)/)) {
    throw new Error('Invalid remote URL format');
  }

  await gitInstance.remote(['set-url', safeRemoteName, newUrl]);
}

/**
 * Check if current directory is a git repository
 * @param git - SimpleGit instance (optional)
 * @returns True if in a git repository
 */
export async function isGitRepository(git?: SimpleGit): Promise<boolean> {
  const gitInstance = git || simpleGit(process.cwd());
  try {
    return await gitInstance.checkIsRepo();
  } catch {
    return false;
  }
}

/**
 * Get current git user configuration
 * @param git - SimpleGit instance (optional)
 * @returns Object with name and email, or null values if not set
 */
export async function getCurrentGitUser(git?: SimpleGit): Promise<{
  name: string | null;
  email: string | null;
}> {
  const gitInstance = git || simpleGit(process.cwd());

  try {
    const [name, email] = await Promise.all([
      gitInstance.getConfig('user.name'),
      gitInstance.getConfig('user.email'),
    ]);

    return {
      name: name.value,
      email: email.value,
    };
  } catch {
    return { name: null, email: null };
  }
}

/**
 * Apply account configuration to repository
 * @param profile - Profile name to apply
 * @param shouldUpdateRemoteUrl - Whether to update remote URL to SSH format
 * @param git - SimpleGit instance (optional)
 */
export async function applyAccountToRepo(
  profile: string,
  shouldUpdateRemoteUrl: boolean = false,
  git?: SimpleGit
): Promise<void> {
  const account = getAccount(profile);
  if (!account) {
    throw new Error(`Account '${profile}' not found`);
  }

  const gitInstance = git || simpleGit(process.cwd());

  await setRepoConfig(account, gitInstance);

  const { updateSSHConfig, addSSHKeyToAgent, getSSHRemoteUrl } = await import('@/utils/ssh');
  await updateSSHConfig(profile, account.provider, account.sshKeyPath, account.customProvider);
  await addSSHKeyToAgent(account.sshKeyPath);

  if (shouldUpdateRemoteUrl) {
    const repo = await getCurrentRepo(gitInstance);
    const repoInfo = detectProvider(repo.url);

    if (!repoInfo) {
      throw new Error('Could not detect git provider from remote URL');
    }

    const newUrl = getSSHRemoteUrl(
      account.provider,
      profile,
      repoInfo.organization,
      repoInfo.repository,
      account.customProvider
    );

    await updateRemoteUrl(repo.name, newUrl, gitInstance);
  }
}
