import { getAccount } from '@/lib/config';
import { readPublicKey, updateSSHConfig, getSSHKeyInfo } from '@/utils/ssh';
import { logError, logSuccess, logInfo, log, LogLevel } from '@/utils/cli';
import { getAuthState, updateAuthState, clearAuthState, isAuthCompleted } from '@/utils/auth-state';
import { safeExec } from '@/utils/shell';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';

interface AuthStep {
  id: string;
  label: string;
  completed: boolean;
}

/**
 * Help user authenticate with their git provider
 * @param profile - Profile name to authenticate
 */
export async function authenticateAccount(profile: string): Promise<void> {
  const account = getAccount(profile);

  if (!account) {
    logError(`Account '${profile}' not found`);
    return;
  }

  if (isAuthCompleted(profile)) {
    const { rerun } = await inquirer.prompt<{ rerun: boolean }>([
      {
        type: 'confirm',
        name: 'rerun',
        message: 'Authentication already completed. Run setup again?',
        default: false,
      },
    ]);

    if (!rerun) {
      logSuccess('Authentication is already set up for this profile.');
      return;
    }
    clearAuthState(profile);
  }

  try {
    const publicKey = await readPublicKey(account.sshKeyPath);
    const keyInfo = getSSHKeyInfo(publicKey);

    console.log(chalk.bold('\nSSH Key Details for ' + profile + ':\n'));
    console.log(chalk.cyan('Type: ') + keyInfo.type);
    console.log(chalk.cyan('Fingerprint: ') + keyInfo.fingerprint);

    const providerUrls: Record<string, string> = {
      github: 'https://github.com/settings/keys',
      gitlab: 'https://gitlab.com/-/profile/keys',
      bitbucket: 'https://bitbucket.org/account/settings/ssh-keys/',
    };

    let url = providerUrls[account.provider];

    // Handle custom providers
    if (!url && account.customProvider) {
      const baseUrl = `https://${account.customProvider.domain}`;
      // Try to guess the SSH key settings URL based on provider type
      if (account.customProvider.type === 'gitlab') {
        url = `${baseUrl}/-/profile/keys`;
      } else if (account.customProvider.type === 'github') {
        url = `${baseUrl}/settings/keys`;
      } else if (account.customProvider.type === 'bitbucket') {
        url = `${baseUrl}/account/settings/ssh-keys/`;
      } else {
        // Generic fallback
        url = baseUrl;
      }
    }

    console.log(chalk.bold('\nSetup Instructions:\n'));
    console.log('1. Copy the SSH key above');
    console.log('2. Open your browser to:');
    console.log(chalk.cyan(`   ${url}`));
    console.log('3. Add a new SSH key with a descriptive title');
    console.log(`   Suggested title: ${chalk.green(`gitm (${profile})`)}`);

    const savedState = getAuthState(profile);

    const steps: AuthStep[] = [
      { id: 'copy', label: 'Copy SSH key to clipboard', completed: savedState.copyCompleted },
      { id: 'browser', label: 'Open browser to add key', completed: savedState.browserCompleted },
      { id: 'add', label: 'Add SSH key to provider', completed: savedState.addCompleted },
      { id: 'test', label: 'Test SSH connection', completed: savedState.testCompleted },
    ];

    if (steps.some(s => s.completed)) {
      logSuccess('Resuming authentication setup...');
    }

    let allCompleted = false;

    while (!allCompleted) {
      console.log(chalk.bold('\n📋 Authentication Checklist:\n'));

      steps.forEach(step => {
        const checkbox = step.completed ? chalk.green('✓') : chalk.gray('☐');
        const label = step.completed ? chalk.strikethrough.gray(step.label) : step.label;
        console.log(`  ${checkbox} ${label}`);
      });

      allCompleted = steps.every(s => s.completed);

      if (allCompleted) {
        logSuccess('Authentication setup completed successfully.');
        break;
      }

      const availableChoices = [];

      if (!steps.find(s => s.id === 'copy')?.completed) {
        availableChoices.push({ name: '📋 Copy SSH key to clipboard', value: 'copy' });
      }

      if (!steps.find(s => s.id === 'browser')?.completed) {
        availableChoices.push({ name: '🌐 Open browser to add key', value: 'browser' });
      }

      if (!steps.find(s => s.id === 'add')?.completed) {
        availableChoices.push({ name: "✅ I've added the key to my provider", value: 'add' });
      }

      if (
        !steps.find(s => s.id === 'test')?.completed &&
        steps.find(s => s.id === 'add')?.completed
      ) {
        availableChoices.push({ name: '🔧 Test SSH connection', value: 'test' });
      }

      if (
        !steps.find(s => s.id === 'test')?.completed &&
        steps.find(s => s.id === 'add')?.completed
      ) {
        availableChoices.push({ name: '⏭️  Skip test (network issues)', value: 'skip-test' });
      }

      availableChoices.push({ name: '❌ Exit (complete later)', value: 'exit' });

      const { action } = await inquirer.prompt<{ action: string }>([
        {
          type: 'list',
          name: 'action',
          message: '\nWhat would you like to do next?',
          choices: availableChoices,
        },
      ]);

      switch (action) {
        case 'copy':
          try {
            await copyToClipboard(publicKey);
            steps.find(s => s.id === 'copy')!.completed = true;
            updateAuthState(profile, { copyCompleted: true });
            logSuccess('SSH key copied to clipboard');
          } catch (error) {
            logError((error as Error).message);
          }
          break;

        case 'browser':
          try {
            await openBrowser(url);
            steps.find(s => s.id === 'browser')!.completed = true;
            updateAuthState(profile, { browserCompleted: true });
            logSuccess('Opening browser...');
          } catch {
            logError('Could not open browser. Please open manually:');
            log(chalk.cyan(url), LogLevel.PLAIN);
            steps.find(s => s.id === 'browser')!.completed = true;
            updateAuthState(profile, { browserCompleted: true });
          }
          break;

        case 'add':
          steps.find(s => s.id === 'add')!.completed = true;
          updateAuthState(profile, { addCompleted: true });
          logSuccess('SSH key successfully added to provider.');
          break;

        case 'test': {
          console.log();
          try {
            await updateSSHConfig(
              profile,
              account.provider,
              account.sshKeyPath,
              account.customProvider
            );
          } catch (error) {
            logError(`Failed to update SSH config: ${(error as Error).message}`);
          }

          const testResult = await testSSHConnection(
            profile,
            account.provider,
            account.customProvider
          );
          if (testResult) {
            steps.find(s => s.id === 'test')!.completed = true;
            updateAuthState(profile, { testCompleted: true });
          } else {
            logError('Connection test failed. Please check:');
            logInfo('- Is the SSH key correctly added to your provider?');
            logInfo('- Did you use the entire public key including "ssh-ed25519"?');
          }
          break;
        }

        case 'skip-test':
          console.log(chalk.yellow('\nSkipping SSH test due to network issues.'));
          logInfo('You can verify the connection later by:');
          logInfo('1. Running: gitm verify ' + profile);
          logInfo('2. Or trying to clone/push to a repository');
          steps.find(s => s.id === 'test')!.completed = true;
          updateAuthState(profile, { testCompleted: true });
          break;

        case 'exit':
          console.log(chalk.yellow('\nExiting... Complete the remaining steps later.'));
          console.log(chalk.gray('Run "gitm auth ' + profile + '" to continue setup.'));
          return;
      }
    }
  } catch (error) {
    logError(`Failed to read SSH key: ${(error as Error).message}`);
  }
}

/**
 * Copy text to clipboard (cross-platform) - secure version
 */
async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // Write to temp file to avoid shell injection
      const tempFile = path.join(os.tmpdir(), `gitm-clipboard-${Date.now()}.tmp`);
      await fs.writeFile(tempFile, text, 'utf-8');

      try {
        await safeExec('pbcopy', [], {
          input: await fs.readFile(tempFile),
        });
      } finally {
        await fs.unlink(tempFile).catch(() => {});
      }
    } else if (platform === 'linux') {
      // Try xclip first, then xsel
      try {
        await safeExec('xclip', ['-selection', 'clipboard'], {
          input: Buffer.from(text),
        });
      } catch {
        await safeExec('xsel', ['--clipboard', '--input'], {
          input: Buffer.from(text),
        });
      }
    } else if (platform === 'win32') {
      // Windows clip command reads from stdin
      await safeExec('clip', [], {
        input: Buffer.from(text),
      });
    }
  } catch {
    throw new Error('Could not copy to clipboard. Please copy manually.');
  }
}

/**
 * Open URL in default browser - secure version
 */
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;

  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  try {
    if (platform === 'darwin') {
      await safeExec('open', [url]);
    } else if (platform === 'linux') {
      await safeExec('xdg-open', [url]);
    } else if (platform === 'win32') {
      await safeExec('cmd', ['/c', 'start', '', url]);
    }
  } catch {
    throw new Error('Could not open browser');
  }
}

/**
 * Test SSH connection to git provider - secure version
 * @returns true if connection successful
 */
async function testSSHConnection(
  profile: string,
  provider: string,
  customProvider?: { domain: string; sshPort?: number }
): Promise<boolean> {
  let hostname: string;
  if (customProvider) {
    hostname = customProvider.domain;
  } else {
    hostname = provider === 'bitbucket' ? 'bitbucket.org' : `${provider}.com`;
  }

  const host = `${hostname.replace(/\./g, '-')}-${profile}`;
  const args = ['-o', 'ConnectTimeout=10', '-T', `git@${host}`];

  try {
    const { stdout, stderr } = await safeExec('ssh', args);
    const output = stdout || stderr;

    // Git providers return different success messages
    if (
      output.includes('successfully authenticated') ||
      output.includes('Welcome to GitLab') ||
      output.includes('logged in as')
    ) {
      logSuccess('SSH authentication successful');
      log(chalk.gray(output.trim()), LogLevel.PLAIN);
      return true;
    } else {
      logError('SSH authentication failed');
      log(chalk.gray(output.trim()), LogLevel.PLAIN);
      return false;
    }
  } catch (error: any) {
    // SSH test commands often "fail" with exit code 1 even on success
    const output = error.stdout || error.stderr || error.message;

    if (
      output.includes('successfully authenticated') ||
      output.includes('Welcome to GitLab') ||
      output.includes('logged in as')
    ) {
      logSuccess('SSH authentication successful');
      log(chalk.gray(output.trim()), LogLevel.PLAIN);
      return true;
    } else if (
      output.includes('Operation timed out') ||
      output.includes('Connection timed out') ||
      output.includes('port 22')
    ) {
      logError('SSH connection timed out - Port 22 may be blocked');
      console.log();
      logInfo('This often happens on corporate networks or certain ISPs.');
      logInfo('Alternative solutions:');
      logInfo('1. Try using HTTPS instead of SSH for this repository');
      logInfo('2. Configure SSH to use port 443:');
      const sshConfigPath = path.join(os.homedir(), '.ssh', 'config');
      const identityPath = path.join(os.homedir(), '.ssh', `gitm_${profile}_${provider}`);
      log(chalk.cyan(`   Add this to ${sshConfigPath}:`), LogLevel.PLAIN);
      log(chalk.gray(`   Host ${provider}.com-${profile}`), LogLevel.PLAIN);
      log(chalk.gray(`     HostName ssh.${provider}.com`), LogLevel.PLAIN);
      log(chalk.gray('     Port 443'), LogLevel.PLAIN);
      log(chalk.gray('     User git'), LogLevel.PLAIN);
      log(chalk.gray(`     IdentityFile ${identityPath}`), LogLevel.PLAIN);
      logInfo("3. Check if you're behind a firewall or proxy");
      return false;
    } else if (output.includes('Permission denied')) {
      logError('SSH authentication failed - Permission denied');
      log(chalk.gray(output.trim()), LogLevel.PLAIN);
      return false;
    } else {
      logError('SSH authentication failed');
      log(chalk.gray(output.trim()), LogLevel.PLAIN);
      return false;
    }
  }
}
