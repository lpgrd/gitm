import { getAccount } from '@/lib/config';
import { setRepoConfig, getCurrentRepo, updateRemoteUrl } from '@/utils/git';
import { updateSSHConfig, addSSHKeyToAgent, getSSHRemoteUrl } from '@/utils/ssh';
import { detectProvider } from '@/utils/providers';
import { isValidProfileName } from '@/utils/shell';
import { logError, logSuccess, logDebug, logWarning, logInfo, formatKeyValue, maskEmail } from '@/utils/cli';

/**
 * Set a specific account for the current repository
 * @param profile - Profile name to use
 */
export async function useAccount(profile: string): Promise<void> {
  // Validate profile name
  if (!isValidProfileName(profile)) {
    logError('Invalid profile name.');
    return;
  }

  const account = getAccount(profile);

  if (!account) {
    logError(`Account '${profile}' not found`);
    logDebug('Available accounts: gitm list');
    return;
  }

  try {
    // Check if we're in a git repo
    const repo = await getCurrentRepo();
    const repoInfo = detectProvider(repo.url);

    if (!repoInfo) {
      logWarning('Could not detect git provider from remote URL');
      logDebug('Remote URL: ' + repo.url);
      return;
    }

    // Set git config for this repo
    await setRepoConfig(account);
    logSuccess('Git config updated');

    // Update SSH config
    await updateSSHConfig(profile, account.provider, account.sshKeyPath);
    logSuccess('SSH config updated');

    // Add key to ssh-agent
    await addSSHKeyToAgent(account.sshKeyPath);

    // Update remote URL to use our custom host
    const newUrl = getSSHRemoteUrl(
      account.provider,
      profile,
      repoInfo.organization,
      repoInfo.repository
    );

    await updateRemoteUrl(repo.name, newUrl);
    logSuccess('Remote URL updated');

    logSuccess(`Account '${profile}' is now active for this repository`);
    logDebug('\nRepository configuration:');
    logDebug(formatKeyValue('Name', account.name));
    logDebug(formatKeyValue('Email', maskEmail(account.email)));
    logDebug(formatKeyValue('Remote', newUrl));
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Not in a git repository')) {
      logError('Not in a git repository');
      logInfo('Navigate to a git repository first.');
    } else {
      logError(errorMessage);
    }
  }
}
