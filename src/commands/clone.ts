import simpleGit from 'simple-git';
import path from 'path';
import inquirer from 'inquirer';
import { detectAccountForRepo } from '@/utils/git';
import { getSSHRemoteUrl, updateSSHConfig, addSSHKeyToAgent } from '@/utils/ssh';
import { getAccount, getAccounts } from '@/lib/config';
import { CloneOptions } from '@/types';
import { logError, logSuccess, logWarning, logInfo } from '@/utils/cli';

/**
 * Clone a repository with the appropriate account
 * @param url - Repository URL to clone
 * @param options - Clone options
 */
export async function cloneRepo(
  url: string,
  options: CloneOptions & { ssh?: boolean } = { ssh: true }
): Promise<void> {
  const detection = await detectAccountForRepo(url);
  const accounts = getAccounts();

  if (!detection || Object.keys(accounts).length === 0) {
    logWarning('No accounts configured');
    logInfo('Cloning with default git settings...');

    const git = simpleGit();
    await git.clone(url, options.directory ?? 'repository');

    logSuccess('Repository cloned');
    logInfo('Run "gitm add <profile>" to add an account');
    return;
  }

  let selectedProfile: string;
  let selectedAccount;

  if (detection.profile) {
    selectedProfile = detection.profile;
    selectedAccount = detection.account;
    logSuccess(`Auto-detected account: ${selectedProfile}`);
  } else if (detection.candidates && detection.candidates.length > 0) {
    const { profile } = await inquirer.prompt<{ profile: string }>([
      {
        type: 'list',
        name: 'profile',
        message: 'Select account to use for this repository:',
        choices: detection.candidates.map(([profileName, account]) => ({
          name: `${profileName} (${account.name} - ${account.email})`,
          value: profileName,
        })),
      },
    ]);

    selectedProfile = profile;
    selectedAccount = getAccount(profile);
  } else {
    logError('No accounts available');
    return;
  }

  if (!selectedAccount) {
    logError('Account not found');
    return;
  }

  // Default to SSH unless explicitly disabled or URL is already SSH
  let useSSH = options.ssh !== false;

  // If URL is already SSH, always use SSH
  if (url.startsWith('git@') || url.includes('ssh://')) {
    useSSH = true;
  }

  await updateSSHConfig(
    selectedProfile,
    selectedAccount.provider,
    selectedAccount.sshKeyPath,
    selectedAccount.customProvider
  );
  await addSSHKeyToAgent(selectedAccount.sshKeyPath);

  let cloneUrl = url;
  if (useSSH && detection.repoInfo) {
    cloneUrl = getSSHRemoteUrl(
      selectedAccount.provider,
      selectedProfile,
      detection.repoInfo.organization,
      detection.repoInfo.repository,
      selectedAccount.customProvider
    );
  }

  const git = simpleGit();
  const targetDir = options.directory || detection.repoInfo?.repository || 'repository';

  try {
    await git.clone(cloneUrl, targetDir);
    logSuccess('Repository cloned successfully');

    const repoGit = simpleGit(targetDir);
    await repoGit.addConfig('user.name', selectedAccount.name);
    await repoGit.addConfig('user.email', selectedAccount.email);

    logSuccess(`Git config set for account '${selectedProfile}'`);
    logInfo(`Repository: ${path.resolve(targetDir)}`);
    logInfo(`Account: ${selectedAccount.name} <${selectedAccount.email}>`);

    if (!useSSH && url.startsWith('https://')) {
      logInfo("Note: Cloned with HTTPS. Use 'gitm use <profile>' to switch to SSH");
    }
  } catch (error) {
    logError(`Clone failed: ${(error as Error).message}`);

    if (useSSH) {
      logInfo('Make sure you have added your SSH key to your git provider:');
      logInfo(`Run: gitm auth ${selectedProfile}`);
    }
  }
}
