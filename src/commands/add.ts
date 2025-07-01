import inquirer from 'inquirer';
import { saveAccount, accountExists, getSSHKeyPath } from '@/lib/config';
import { generateSSHKey } from '@/utils/ssh';
import { getProviderList, getProviderDisplayName, getProviderConfig } from '@/utils/providers';
import { isValidProfileName } from '@/utils/shell';
import { GitAccount } from '@/types';
import { logSuccess, logError, logWarning, logInfo } from '@/utils/cli';

/**
 * Add a new git account
 * @param profile - Profile name for the account
 * @param options - Command options
 */
export async function addAccount(profile: string, options?: { provider?: string }): Promise<void> {
  if (!isValidProfileName(profile)) {
    logError('Invalid profile name. Use only letters, numbers, dash, and underscore.');
    return;
  }
  if (accountExists(profile)) {
    logWarning(`Account '${profile}' already exists`);
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite it?',
        default: false,
      },
    ]);

    if (overwrite) {
      return;
    }
  }

  interface AddAccountAnswers {
    name: string;
    email: string;
    provider: string;
    username: string;
    generateSSH: boolean;
  }

  // Get provider list including custom ones
  const providerChoices = getProviderList().map(p => {
    const displayName = getProviderDisplayName(p);
    return {
      name: displayName,
      value: p,
    };
  });

  // Pre-select provider if specified
  const defaultProvider = options?.provider || 'github';

  const answers = await inquirer.prompt<AddAccountAnswers>([
    {
      type: 'input',
      name: 'name',
      message: 'Your name:',
      validate: (input: string) => input.trim() !== '' || 'Name is required',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Your email:',
      validate: (input: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) || 'Please enter a valid email';
      },
    },
    {
      type: 'list',
      name: 'provider',
      message: 'Git provider:',
      choices: providerChoices,
      default: defaultProvider,
      when: !options?.provider,
    },
    {
      type: 'input',
      name: 'username',
      message: 'Username/Organization (for auto-detection):',
      validate: (input: string) => input.trim() !== '' || 'Username is required',
    },
    {
      type: 'confirm',
      name: 'generateSSH',
      message: 'Generate new SSH key?',
      default: true,
    },
  ]);

  // Use provided provider if specified
  if (options?.provider) {
    answers.provider = options.provider;
  }

  const sshKeyPath = getSSHKeyPath(profile, answers.provider);

  if (answers.generateSSH) {
    try {
      await generateSSHKey(sshKeyPath, answers.email, profile);
      logSuccess('SSH key generated successfully');
    } catch (error) {
      logError(`Failed to generate SSH key: ${(error as Error).message}`);
      return;
    }
  }

  // Check if this is a custom provider
  const providerConfig = getProviderConfig(answers.provider);
  const isCustomProvider = providerConfig?.isCustom || false;

  const accountData: GitAccount = {
    name: answers.name,
    email: answers.email,
    provider: answers.provider,
    username: answers.username,
    sshKeyPath: sshKeyPath,
    createdAt: new Date().toISOString(),
  };

  // Add custom provider info if applicable
  if (isCustomProvider && providerConfig) {
    accountData.customProvider = {
      type: answers.provider,
      domain: providerConfig.host,
      sshPort: providerConfig.sshPort,
    };
  }

  saveAccount(profile, accountData);

  logSuccess(`Account '${profile}' added successfully`);
  logInfo('Next steps:');
  logInfo(`• Setup authentication: gitm auth ${profile}`);
  logInfo(`• Verify configuration: gitm verify ${profile}`);
}
