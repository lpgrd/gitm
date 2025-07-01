import { GitProvider } from '@/types';
import os from 'os';
import path from 'path';

/**
 * SSH key directory path
 */
export const SSH_KEY_DIR = path.join(os.homedir(), '.ssh');

/**
 * SSH config file path
 */
export const SSH_CONFIG_PATH = path.join(SSH_KEY_DIR, 'config');

/**
 * Default SSH key type
 */
export const DEFAULT_SSH_KEY_TYPE = 'ed25519';

/**
 * Git provider configurations
 */
export const GIT_PROVIDERS: Record<string, GitProvider> = {
  github: {
    name: 'GitHub',
    host: 'github.com',
    sshHost: 'github.com',
    urlPatterns: [
      /github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/,
      /^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/,
    ],
  },
  gitlab: {
    name: 'GitLab',
    host: 'gitlab.com',
    sshHost: 'gitlab.com',
    urlPatterns: [
      /gitlab\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/,
      /^git@gitlab\.com:([^/]+)\/(.+?)(?:\.git)?$/,
    ],
  },
  bitbucket: {
    name: 'Bitbucket',
    host: 'bitbucket.org',
    sshHost: 'bitbucket.org',
    urlPatterns: [
      /bitbucket\.org[:/]([^/]+)\/(.+?)(?:\.git)?$/,
      /^git@bitbucket\.org:([^/]+)\/(.+?)(?:\.git)?$/,
    ],
  },
};
