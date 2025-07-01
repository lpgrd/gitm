#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { addAccount } from '@/commands/add';
import { listAccounts } from '@/commands/list';
import { useAccount } from '@/commands/use';
import { initRepo } from '@/commands/init';
import { cloneRepo } from '@/commands/clone';
import { removeAccount } from '@/commands/remove';
import { showStatus } from '@/commands/status';
import { authenticateAccount } from '@/commands/auth';
import { verifyAccount } from '@/commands/verify';
import { listProviders, addProvider, removeProvider, showProvider } from '@/commands/provider';

const program = new Command();

program.name('gitm').description('Seamlessly manage multiple git accounts').version('1.0.0');

program
  .command('add <profile>')
  .description('Add a new git account')
  .option('--provider <provider>', 'Use a specific provider (including custom ones)')
  .action(addAccount);

program
  .command('list')
  .alias('ls')
  .description('List all configured accounts')
  .action(listAccounts);

program
  .command('use <profile>')
  .description('Set git account for current repository')
  .action(useAccount);

program
  .command('init')
  .description('Auto-detect and set account for current repository')
  .option('--no-ssh', 'Keep HTTPS URLs instead of converting to SSH')
  .action(initRepo);

program
  .command('clone <url>')
  .description('Clone repository with correct account')
  .option('-d, --directory <dir>', 'Directory to clone into')
  .option('--no-ssh', 'Keep HTTPS URLs instead of converting to SSH')
  .action(cloneRepo);

program
  .command('remove <profile>')
  .alias('rm')
  .description('Remove a git account')
  .action(removeAccount);

program.command('status').description('Show current account for repository').action(showStatus);

program
  .command('auth <profile>')
  .description('Setup authentication for an account')
  .action(authenticateAccount);

program
  .command('verify <profile>')
  .description('Verify account configuration and authentication')
  .action(verifyAccount);

// Provider management commands
const provider = program.command('provider').description('Manage custom git providers');

provider.command('list').alias('ls').description('List all custom providers').action(listProviders);

provider.command('add [key]').description('Add a custom provider').action(addProvider);

provider
  .command('remove <key>')
  .alias('rm')
  .description('Remove a custom provider')
  .action(removeProvider);

provider
  .command('show <key>')
  .description('Show details of a custom provider')
  .action(showProvider);

// Handle errors gracefully
program.exitOverride();

try {
  program.parse();
} catch (error: any) {
  // Commander throws specific errors for help and version that we should handle gracefully
  if (error.code === 'commander.version') {
    // Version was displayed successfully, exit cleanly
    process.exit(0);
  } else if (error.code === 'commander.help' || error.code === 'commander.helpDisplayed') {
    // Help was displayed successfully, exit cleanly
    process.exit(0);
  } else {
    console.error(chalk.red('Error:'), error.message || error);
    process.exit(1);
  }
}
