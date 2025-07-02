import fs from 'fs/promises';
import { SSH_CONFIG_PATH, DEFAULT_SSH_KEY_TYPE, SSH_KEY_DIR } from '@/config/constants';
import { SSHKeyOptions } from '@/types';
import { safeExec, isPathSafe } from '@/utils/shell';

/**
 * Generate a new SSH key pair
 * @param keyPath - Path where the key should be saved
 * @param email - Email address for the key comment
 * @param comment - Additional comment for the key
 * @param options - SSH key generation options
 * @throws Error if key generation fails
 */
export async function generateSSHKey(
  keyPath: string,
  email: string,
  comment: string,
  options: SSHKeyOptions = {}
): Promise<void> {
  // Validate the key path is within SSH directory
  if (!isPathSafe(keyPath, SSH_KEY_DIR)) {
    throw new Error('Invalid key path: must be within SSH directory');
  }

  const keyType = options.type || DEFAULT_SSH_KEY_TYPE;
  const keyComment = `${email} (gitm: ${comment})`;
  const passphrase = options.passphrase || '';

  const args = ['-t', keyType, '-f', keyPath, '-N', passphrase, '-C', keyComment];

  if (keyType === 'rsa' && options.bits) {
    args.push('-b', options.bits.toString());
  }

  try {
    await safeExec('ssh-keygen', args);
  } catch (error) {
    throw new Error(`Failed to generate SSH key: ${(error as Error).message}`);
  }
}

/**
 * Update SSH config file with host configuration
 * @param profile - Profile name
 * @param provider - Git provider name
 * @param sshKeyPath - Path to the SSH key
 * @param customProvider - Custom provider configuration
 * @throws Error if config update fails
 */
export async function updateSSHConfig(
  profile: string,
  provider: string,
  sshKeyPath: string,
  customProvider?: { domain: string; sshPort?: number }
): Promise<void> {
  // Validate SSH key path
  if (!isPathSafe(sshKeyPath, SSH_KEY_DIR)) {
    throw new Error('Invalid SSH key path');
  }

  const { getProviderConfig } = await import('@/utils/providers');
  const providerConfig = getProviderConfig(provider);

  // Determine hostname and port
  let hostname: string;
  let port: number | undefined;

  if (customProvider) {
    hostname = customProvider.domain;
    port = customProvider.sshPort;
  } else if (providerConfig) {
    hostname = providerConfig.sshHost || providerConfig.host;
    port = providerConfig.sshPort;
  } else {
    // Fallback for standard providers
    hostname = provider === 'bitbucket' ? 'bitbucket.org' : `${provider}.com`;
  }

  const host = `${hostname.replace(/\./g, '-')}-${profile}`;

  let configEntry = `
# gitm: ${profile}
Host ${host}
  HostName ${hostname}
  User git
  IdentityFile ${sshKeyPath}
  IdentitiesOnly yes`;

  // Add port if not default
  if (port && port !== 22) {
    configEntry += `\n  Port ${port}`;
  }

  configEntry += '\n';

  try {
    let existingConfig = '';
    try {
      existingConfig = await fs.readFile(SSH_CONFIG_PATH, 'utf-8');
    } catch {
      // Config file doesn't exist, that's ok
    }

    // Remove existing entry for this profile if it exists
    const marker = `# gitm: ${profile}`;
    if (existingConfig.includes(marker)) {
      const lines = existingConfig.split('\n');
      const startIdx = lines.findIndex(line => line.includes(marker));
      let endIdx = startIdx + 1;

      while (
        endIdx < lines.length &&
        lines[endIdx].trim() !== '' &&
        !lines[endIdx].startsWith('Host ')
      ) {
        endIdx++;
      }

      lines.splice(startIdx, endIdx - startIdx);
      existingConfig = lines.join('\n');
    }

    // Append new entry
    const newConfig = existingConfig.trim() + '\n' + configEntry;
    await fs.writeFile(SSH_CONFIG_PATH, newConfig);

    // Set proper permissions (Unix-like systems only)
    if (process.platform !== 'win32') {
      await fs.chmod(SSH_CONFIG_PATH, 0o600);
    }
  } catch (error) {
    throw new Error(`Failed to update SSH config: ${(error as Error).message}`);
  }
}

/**
 * Add SSH key to the SSH agent
 * @param keyPath - Path to the SSH key
 */
export async function addSSHKeyToAgent(keyPath: string): Promise<void> {
  // Validate SSH key path
  if (!isPathSafe(keyPath, SSH_KEY_DIR)) {
    throw new Error('Invalid SSH key path');
  }

  try {
    await safeExec('ssh-add', [keyPath]);
  } catch {
    // It's ok if this fails, not all systems have ssh-agent running
    if (process.platform === 'win32') {
      console.warn(
        'Could not add key to ssh-agent. On Windows, you may need to start the ssh-agent service.'
      );
    } else {
      console.warn('Could not add key to ssh-agent (this is ok)');
    }
  }
}

/**
 * Get SSH remote URL for a repository
 * @param provider - Git provider name
 * @param profile - Profile name
 * @param organization - Organization or username
 * @param repository - Repository name
 * @param customProvider - Custom provider configuration
 * @returns The SSH URL
 */
export function getSSHRemoteUrl(
  provider: string,
  profile: string,
  organization: string,
  repository: string,
  customProvider?: { domain: string; sshPort?: number }
): string {
  // Sanitize inputs to prevent injection in git URLs
  const safeOrg = organization.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeRepo = repository.replace(/[^a-zA-Z0-9_.-]/g, '');

  let hostname: string;

  if (customProvider) {
    hostname = customProvider.domain;
  } else {
    // Fallback for standard providers
    hostname = provider === 'bitbucket' ? 'bitbucket.org' : `${provider}.com`;
  }

  const host = `${hostname.replace(/\./g, '-')}-${profile}`;
  return `git@${host}:${safeOrg}/${safeRepo}.git`;
}

/**
 * Check if an SSH key exists
 * @param keyPath - Path to the SSH key
 * @returns True if both private and public keys exist
 */
export async function sshKeyExists(keyPath: string): Promise<boolean> {
  // Validate SSH key path
  if (!isPathSafe(keyPath, SSH_KEY_DIR)) {
    return false;
  }

  try {
    await fs.access(keyPath);
    await fs.access(`${keyPath}.pub`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read SSH public key
 * @param keyPath - Path to the SSH private key
 * @returns The public key content
 */
export async function readPublicKey(keyPath: string): Promise<string> {
  // Validate SSH key path
  if (!isPathSafe(keyPath, SSH_KEY_DIR)) {
    throw new Error('Invalid SSH key path');
  }

  return await fs.readFile(`${keyPath}.pub`, 'utf-8');
}
