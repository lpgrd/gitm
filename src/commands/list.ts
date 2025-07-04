import { getAccounts } from '@/lib/config';
import { log, logWarning, logInfo, sectionHeader, formatKeyValue, maskEmail } from '@/utils/cli';
import chalk from 'chalk';

/**
 * List all configured git accounts
 */
export function listAccounts(): void {
  const accounts = getAccounts();
  const profiles = Object.keys(accounts);

  if (profiles.length === 0) {
    logWarning('No accounts configured yet.');
    logInfo('Add an account with: gitm add <profile>');
    return;
  }

  log(sectionHeader('Configured accounts'));

  profiles.forEach(profile => {
    const account = accounts[profile];
    log(chalk.cyan(`  ${profile}`));
    log(formatKeyValue('Name', account.name, 4));
    log(formatKeyValue('Email', maskEmail(account.email), 4));
    log(formatKeyValue('Provider', account.provider, 4));
    log(formatKeyValue('Username', account.username, 4));
    console.log();
  });
}
