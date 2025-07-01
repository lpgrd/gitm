import inquirer from 'inquirer';
import {
  getCustomProviders,
  saveCustomProvider,
  deleteCustomProvider,
  customProviderExists,
} from '@/lib/config';
import { GitProvider } from '@/types';
import { isValidProfileName } from '@/utils/shell';
import { logSuccess, logError, logInfo } from '@/utils/cli';
import chalk from 'chalk';

/**
 * List all custom providers
 */
export async function listProviders(): Promise<void> {
  const providers = getCustomProviders();
  const providerList = Object.entries(providers);

  if (providerList.length === 0) {
    logInfo('No custom providers configured');
    logInfo('Add a custom provider with: gitm provider add');
    return;
  }

  console.log(chalk.bold('\nCustom Providers:\n'));

  providerList.forEach(([key, provider]) => {
    console.log(chalk.cyan(`${key}:`));
    console.log(`  Name: ${provider.name}`);
    console.log(`  Host: ${provider.host}`);
    console.log(`  SSH Host: ${provider.sshHost}`);
    if (provider.sshPort && provider.sshPort !== 22) {
      console.log(`  SSH Port: ${provider.sshPort}`);
    }
    console.log();
  });
}

/**
 * Add a new custom provider
 * @param key - Unique key for the provider
 */
export async function addProvider(key?: string): Promise<void> {
  // If key not provided, prompt for it
  if (!key) {
    const { providerKey } = await inquirer.prompt<{ providerKey: string }>([
      {
        type: 'input',
        name: 'providerKey',
        message: 'Provider key (e.g., gitlab-self):',
        validate: (input: string) => {
          if (!isValidProfileName(input)) {
            return 'Invalid key. Use only letters, numbers, dash, and underscore.';
          }
          if (customProviderExists(input)) {
            return `Provider '${input}' already exists`;
          }
          return true;
        },
      },
    ]);
    key = providerKey;
  } else {
    if (!isValidProfileName(key)) {
      logError('Invalid provider key. Use only letters, numbers, dash, and underscore.');
      return;
    }
    if (customProviderExists(key)) {
      logError(`Provider '${key}' already exists`);
      return;
    }
  }

  interface ProviderAnswers {
    name: string;
    type: string;
    domain: string;
    sshPort: number;
  }

  const answers = await inquirer.prompt<ProviderAnswers>([
    {
      type: 'input',
      name: 'name',
      message: 'Provider display name:',
      default: 'Self-hosted Git',
      validate: (input: string) => input.trim() !== '' || 'Name is required',
    },
    {
      type: 'list',
      name: 'type',
      message: 'Provider type:',
      choices: [
        { name: 'GitLab (self-hosted)', value: 'gitlab' },
        { name: 'GitHub Enterprise', value: 'github' },
        { name: 'Bitbucket Server', value: 'bitbucket' },
        { name: 'Gitea', value: 'gitea' },
        { name: 'Other', value: 'other' },
      ],
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Domain (e.g., git.company.com):',
      validate: (input: string) => {
        const domainRegex =
          /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        return domainRegex.test(input) || 'Please enter a valid domain';
      },
    },
    {
      type: 'number',
      name: 'sshPort',
      message: 'SSH port:',
      default: 22,
      validate: (input: number) => {
        return (input > 0 && input < 65536) || 'Please enter a valid port number';
      },
    },
  ]);

  // Create URL patterns based on the domain
  const urlPatterns = [
    new RegExp(`${answers.domain.replace(/\./g, '\\.')}[:/]([^/]+)\\/(.+?)(?:\\.git)?$`),
    new RegExp(`^git@${answers.domain.replace(/\./g, '\\.')}:([^/]+)\\/(.+?)(?:\\.git)?$`),
  ];

  const provider: GitProvider = {
    name: answers.name,
    host: answers.domain,
    sshHost: answers.domain,
    sshPort: answers.sshPort !== 22 ? answers.sshPort : undefined,
    urlPatterns,
    isCustom: true,
  };

  saveCustomProvider(key, provider);

  logSuccess(`Custom provider '${key}' added successfully`);
  logInfo('\nYou can now use this provider when adding accounts:');
  logInfo(`gitm add <profile> --provider ${key}`);
}

/**
 * Remove a custom provider
 * @param key - Provider key to remove
 */
export async function removeProvider(key: string): Promise<void> {
  if (!customProviderExists(key)) {
    logError(`Provider '${key}' not found`);
    return;
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to remove provider '${key}'?`,
      default: false,
    },
  ]);

  if (!confirm) {
    return;
  }

  deleteCustomProvider(key);
  logSuccess(`Provider '${key}' removed successfully`);
}

/**
 * Show details of a specific provider
 * @param key - Provider key
 */
export async function showProvider(key: string): Promise<void> {
  const providers = getCustomProviders();
  const provider = providers[key];

  if (!provider) {
    logError(`Provider '${key}' not found`);
    return;
  }

  console.log(chalk.bold(`\nProvider: ${key}\n`));
  console.log(`Name: ${provider.name}`);
  console.log(`Host: ${provider.host}`);
  console.log(`SSH Host: ${provider.sshHost}`);
  if (provider.sshPort && provider.sshPort !== 22) {
    console.log(`SSH Port: ${provider.sshPort}`);
  }
  console.log(`\nURL Patterns:`);
  provider.urlPatterns.forEach((pattern, index) => {
    console.log(`  ${index + 1}. ${pattern.source}`);
  });
}
