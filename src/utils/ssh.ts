import fs from 'fs/promises';
import crypto from 'crypto';
import { SSH_CONFIG_PATH, DEFAULT_SSH_KEY_TYPE, SSH_KEY_DIR } from '@/config/constants';
import { SSHKeyOptions } from '@/types';
import { safeExec, isPathSafe } from '@/utils/shell';

/**
 * Set secure file permissions for SSH-related files
 * @param filePath - Path to the file
 * @throws Error if permission setting fails
 */
export async function setSecureFilePermissions(filePath: string): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // Windows: Use icacls to set permissions
      // Remove inheritance and grant only current user full control
      const username = process.env.USERNAME || process.env.USER;
      if (!username) {
        throw new Error('Could not determine current user');
      }

      // Reset permissions, remove inheritance, grant only current user
      const commands = [
        // Remove inheritance while copying current permissions
        ['icacls', [filePath, '/inheritance:r']],
        // Grant full control only to current user
        ['icacls', [filePath, '/grant:r', `${username}:F`]],
        // Remove all other users if they exist
        ['icacls', [filePath, '/remove', 'Users']],
        ['icacls', [filePath, '/remove', 'Everyone']],
        ['icacls', [filePath, '/remove', 'Authenticated Users']],
      ];

      for (const [cmd, args] of commands) {
        try {
          await safeExec(cmd as string, args as string[]);
        } catch (error) {
          // Some remove commands might fail if the user/group doesn't exist, that's ok
          if (!args.includes('/remove')) {
            throw error;
          }
        }
      }
    } else {
      // Unix-like systems: Use chmod
      await fs.chmod(filePath, 0o600);
    }
  } catch (error) {
    // Log warning but don't fail the operation
    console.warn(
      `Warning: Could not set secure permissions on ${filePath}: ${(error as Error).message}`
    );
  }
}

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
  options: SSHKeyOptions = {}
): Promise<void> {
  // Validate the key path is within SSH directory
  if (!isPathSafe(keyPath, SSH_KEY_DIR)) {
    throw new Error('Invalid key path: must be within SSH directory');
  }

  const keyType = options.type || DEFAULT_SSH_KEY_TYPE;
  const passphrase = options.passphrase || '';
  const comment = options.comment || email;

  const args = ['-t', keyType, '-f', keyPath, '-N', passphrase, '-C', comment];

  if (keyType === 'rsa' && options.bits) {
    args.splice(2, 0, '-b', options.bits.toString());
  }

  try {
    await safeExec('ssh-keygen', args);

    // Set secure permissions on the private key
    await setSecureFilePermissions(keyPath);

    // Public key should be readable but not writable by others
    if (process.platform !== 'win32') {
      await fs.chmod(`${keyPath}.pub`, 0o644);
    }
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

    // Set proper permissions
    await setSecureFilePermissions(SSH_CONFIG_PATH);
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

/**
 * Get the fingerprint of an SSH public key
 * @param publicKey - The SSH public key content
 * @returns The SHA256 fingerprint of the key
 */
export function getSSHKeyFingerprint(publicKey: string): string {
  // Extract the base64-encoded key data (second part of the key)
  const keyParts = publicKey.trim().split(/\s+/);
  if (keyParts.length < 2) {
    throw new Error('Invalid SSH public key format');
  }

  const keyData = keyParts[1];
  const keyBuffer = Buffer.from(keyData, 'base64');

  // Calculate SHA256 hash
  const hash = crypto.createHash('sha256').update(keyBuffer).digest('base64');

  // Format as standard SSH fingerprint (remove padding)
  const fingerprint = hash.replace(/=+$/, '');

  return `SHA256:${fingerprint}`;
}

/**
 * Get SSH key info including type and fingerprint
 * @param publicKey - The SSH public key content
 * @returns Object with key type and fingerprint
 */
export function getSSHKeyInfo(publicKey: string): { type: string; fingerprint: string } {
  const keyParts = publicKey.trim().split(/\s+/);
  if (keyParts.length < 2) {
    throw new Error('Invalid SSH public key format');
  }

  const keyType = keyParts[0]; // e.g., ssh-rsa, ssh-ed25519
  const fingerprint = getSSHKeyFingerprint(publicKey);

  return {
    type: keyType,
    fingerprint,
  };
}
