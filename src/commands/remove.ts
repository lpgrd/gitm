import inquirer from 'inquirer';
import fs from 'fs/promises';
import { getAccount, deleteAccount } from '@/lib/config';
import { clearAuthState } from '@/utils/auth-state';
import { isValidProfileName } from '@/utils/shell';
import { logError, logSuccess, logWarning } from '@/utils/cli';

/**
 * Remove a git account
 * @param profile - Profile name to remove
 */
export async function removeAccount(profile: string): Promise<void> {
  // Validate profile name
  if (!isValidProfileName(profile)) {
    logError('Invalid profile name.');
    return;
  }

  const account = getAccount(profile);

  if (!account) {
    logError(`Account '${profile}' not found`);
    return;
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove account '${profile}'?`,
      default: false,
    },
  ]);

  if (!confirm) {
    return;
  }

  const { removeSSH } = await inquirer.prompt<{ removeSSH: boolean }>([
    {
      type: 'confirm',
      name: 'removeSSH',
      message: 'Also remove associated SSH keys?',
      default: true,
    },
  ]);

  if (removeSSH && account.sshKeyPath) {
    try {
      await fs.unlink(account.sshKeyPath);
      await fs.unlink(`${account.sshKeyPath}.pub`);
      logSuccess('SSH keys removed');
    } catch {
      logWarning('Could not remove SSH keys (may already be deleted)');
    }
  }

  deleteAccount(profile);
  clearAuthState(profile);
  logSuccess(`Account '${profile}' removed successfully`);
}
