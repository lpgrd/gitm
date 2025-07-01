import simpleGit from 'simple-git';
import { getCurrentRepo, isGitRepository, getCurrentGitUser } from '@/utils/git';
import { detectProvider } from '@/utils/providers';
import {
  logError,
  logSuccess,
  logWarning,
  sectionHeader,
  formatKeyValue,
  logInfo,
} from '@/utils/cli';
import chalk from 'chalk';

/**
 * Show the current repository status and account configuration
 */
export async function showStatus(): Promise<void> {
  try {
    const git = simpleGit();

    // Check if we're in a git repo
    const isRepo = await isGitRepository(git);
    if (!isRepo) {
      logError('Not in a git repository');
      return;
    }

    // Get git config
    const gitUser = await getCurrentGitUser(git);

    // Get remote info
    try {
      const repo = await getCurrentRepo(git);
      const repoInfo = detectProvider(repo.url);

      console.log(sectionHeader('Repository Status'));

      if (gitUser.name && gitUser.email) {
        console.log(chalk.green('Git User Configuration:'));
        console.log(formatKeyValue('Name', gitUser.name));
        console.log(formatKeyValue('Email', gitUser.email));
      } else {
        logWarning('No git user configured for this repository');
      }

      console.log(chalk.cyan('\nRemote Configuration:'));
      console.log(formatKeyValue('Remote', repo.name));
      console.log(formatKeyValue('URL', repo.url));

      if (repoInfo) {
        console.log(formatKeyValue('Provider', repoInfo.provider));
        console.log(formatKeyValue('Organization', repoInfo.organization));
        console.log(formatKeyValue('Repository', repoInfo.repository));

        // Check if using git-multi custom host
        const gitmPattern = /^git@(.+)-([^:]+):/;
        const gitmMatch = repo.url.match(gitmPattern);
        if (gitmMatch) {
          console.log('\n');
          logSuccess(`Using gitm account: ${gitmMatch[2]}`);
        } else {
          logWarning('Not using gitm managed account');
          logInfo('Run "gitm init" to set up an account');
        }
      }
    } catch {
      logWarning('No remote configured');
    }
  } catch (error) {
    logError((error as Error).message);
  }
}
