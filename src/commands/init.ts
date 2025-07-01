import inquirer from 'inquirer';
import { getCurrentRepo, detectAccountForRepo, applyAccountToRepo } from '@/utils/git';
import { logError, logSuccess, logInfo, logWarning } from '@/utils/cli';

/**
 * Initialize repository with auto-detected or selected account
 * @param options - Command options including ssh flag
 */
export async function initRepo(options: { ssh?: boolean } = { ssh: true }): Promise<void> {
  try {
    const repo = await getCurrentRepo();

    const detection = await detectAccountForRepo(repo.url);

    if (!detection) {
      // Let's check if accounts actually exist
      const { getAccounts } = await import('@/lib/config');
      const accounts = getAccounts();
      const accountCount = Object.keys(accounts).length;

      if (accountCount === 0) {
        logError('No accounts configured');
        logInfo('Add an account first: gitm add <profile>');
      } else {
        logError('Could not match repository to any configured account');
        logInfo('Run "gitm list" to see configured accounts');
      }
      return;
    }

    let selectedProfile: string;

    if (detection.profile) {
      logSuccess(`Auto-detected account: ${detection.profile}`);
      selectedProfile = detection.profile;
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
    } else {
      logError('No accounts available');
      return;
    }

    await applyAccountToRepo(selectedProfile, options.ssh || false);

    logSuccess(`Account '${selectedProfile}' configured for this repository`);

    if (options.ssh !== false && repo.url.startsWith('https://')) {
      logSuccess('Remote URL converted to SSH for secure authentication');
    } else if (options.ssh === false && repo.url.startsWith('https://')) {
      logWarning('Important: HTTPS URLs may not work correctly with multiple accounts');
      logInfo('SSH is recommended for multi-account management');
      logInfo(`To convert to SSH, run: gitm use ${selectedProfile}`);
    }
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Not in a git repository')) {
      logError('Not in a git repository');
    } else {
      logError(errorMessage);
    }
  }
}
