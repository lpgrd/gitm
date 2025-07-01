import { getAccount } from '@/lib/config';
import { sshKeyExists } from '@/utils/ssh';
import { logError, logSuccess, logWarning, logDebug, logInfo, sectionHeader } from '@/utils/cli';
import { safeExec, isValidProfileName } from '@/utils/shell';
import chalk from 'chalk';
import fs from 'fs/promises';
import { SSH_CONFIG_PATH } from '@/config/constants';

/**
 * Verify that an account is properly configured
 * @param profile - Profile name to verify
 */
export async function verifyAccount(profile: string): Promise<void> {
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

  console.log(sectionHeader(`Verifying account: ${profile}`));

  let allGood = true;

  // 1. Check SSH key exists
  console.log(chalk.cyan('\n1. SSH Key Status:'));
  const keyExists = await sshKeyExists(account.sshKeyPath);
  if (keyExists) {
    logSuccess('SSH key pair exists');
    logDebug(`  Private key: ${account.sshKeyPath}`);
    logDebug(`  Public key: ${account.sshKeyPath}.pub`);
  } else {
    logError('SSH key pair missing');
    logInfo('  Run: gitm add ' + profile + ' to regenerate');
    allGood = false;
  }

  // 2. Check SSH config
  console.log(chalk.cyan('\n2. SSH Config:'));
  try {
    const sshConfig = await fs.readFile(SSH_CONFIG_PATH, 'utf-8');
    const expectedHost = `${account.provider}.com-${profile}`;

    if (sshConfig.includes(expectedHost)) {
      logSuccess(`SSH config contains host: ${expectedHost}`);
    } else {
      logWarning('SSH config entry missing');
      logInfo('  Run: gitm use ' + profile + ' in a repository to fix');
      allGood = false;
    }
  } catch {
    logWarning('SSH config file not found');
    allGood = false;
  }

  // 3. Test SSH connection
  console.log(chalk.cyan('\n3. SSH Connection Test:'));
  const sshHost =
    account.provider === 'bitbucket'
      ? `${account.provider}.org-${profile}`
      : `${account.provider}.com-${profile}`;

  try {
    const { stderr } = await safeExec('ssh', ['-o', 'ConnectTimeout=10', '-T', `git@${sshHost}`]);

    // Check for success patterns in stderr (git providers use stderr for messages)
    if (
      stderr.includes('successfully authenticated') ||
      stderr.includes('Welcome to GitLab') ||
      stderr.includes('logged in as')
    ) {
      logSuccess('SSH authentication working');
      logDebug(`  ${stderr.trim()}`);
    } else {
      logWarning('SSH authentication not verified');
      logInfo('  Have you added your SSH key to ' + account.provider + '?');
      logInfo('  Run: gitm auth ' + profile);
      allGood = false;
    }
  } catch (error: any) {
    // SSH commands to git providers often exit with code 1 even on success
    const output = error.stderr || error.message;

    if (
      output.includes('successfully authenticated') ||
      output.includes('Welcome to GitLab') ||
      output.includes('logged in as')
    ) {
      logSuccess('SSH authentication working');
      logDebug(`  ${output.trim()}`);
    } else if (
      output.includes('Operation timed out') ||
      output.includes('Connection timed out') ||
      output.includes('port 22')
    ) {
      logError('SSH connection timed out - Port 22 may be blocked');
      logDebug('  This is often due to corporate firewalls or ISP restrictions');
      logDebug('  See "gitm auth ' + profile + '" for alternative solutions');
      allGood = false;
    } else if (output.includes('Permission denied')) {
      logError('SSH authentication failed');
      logDebug('  Your SSH key is not added to ' + account.provider);
      logInfo('  Run: gitm auth ' + profile);
      allGood = false;
    } else {
      logWarning('Could not verify SSH connection');
      logDebug(`  ${output.trim()}`);
      allGood = false;
    }
  }

  // 4. Check SSH agent
  console.log(chalk.cyan('\n4. SSH Agent:'));
  try {
    const { stdout } = await safeExec('ssh-add', ['-l']);
    if (stdout.includes(account.sshKeyPath)) {
      logSuccess('SSH key loaded in agent');
    } else {
      logWarning('SSH key not in agent');
      logInfo('  Run: ssh-add ' + account.sshKeyPath);
    }
  } catch {
    logWarning('SSH agent not running or no keys loaded');
  }

  // Summary
  console.log(chalk.bold('\n' + (allGood ? '✅ Summary:' : '⚠️  Summary:')));
  if (allGood) {
    logSuccess(`Account '${profile}' is fully configured and working`);
  } else {
    logWarning(`Account '${profile}' needs attention. See above for details.`);
  }
}
