import Conf from 'conf';
import path from 'path';
import { GitAccount, GitAccounts, ConfigKeys, GitProvider, StoredCustomProvider } from '@/types';
import { SSH_KEY_DIR } from '@/config/constants';
import { APP_VERSION } from '@/config/version';

/**
 * Configuration store instance
 */
const config = new Conf({
  projectName: 'gitm',
  projectVersion: APP_VERSION,
});

/**
 * Get all configured accounts
 * @returns Object containing all accounts indexed by profile name
 */
export function getAccounts(): GitAccounts {
  return config.get(ConfigKeys.ACCOUNTS, {}) as GitAccounts;
}

/**
 * Get a specific account by profile name
 * @param profile - The profile name to look up
 * @returns The account data if found, undefined otherwise
 */
export function getAccount(profile: string): GitAccount | undefined {
  const accounts = getAccounts();
  return accounts[profile];
}

/**
 * Save or update an account
 * @param profile - The profile name
 * @param accountData - The account data to save
 */
export function saveAccount(profile: string, accountData: GitAccount): void {
  const accounts = getAccounts();
  accounts[profile] = accountData;
  config.set(ConfigKeys.ACCOUNTS, accounts);
}

/**
 * Delete an account
 * @param profile - The profile name to delete
 */
export function deleteAccount(profile: string): void {
  const accounts = getAccounts();
  delete accounts[profile];
  config.set(ConfigKeys.ACCOUNTS, accounts);
}

/**
 * Check if an account exists
 * @param profile - The profile name to check
 * @returns True if the account exists, false otherwise
 */
export function accountExists(profile: string): boolean {
  const accounts = getAccounts();
  return profile in accounts;
}

/**
 * Get the SSH key path for a profile
 * @param profile - The profile name
 * @param provider - The git provider (defaults to 'github')
 * @returns The full path to the SSH key
 */
export function getSSHKeyPath(profile: string, provider: string = 'github'): string {
  return path.join(SSH_KEY_DIR, `gitm_${profile}_${provider}`);
}

/**
 * Get the default git provider
 * @returns The default provider name
 */
export function getDefaultProvider(): string {
  return config.get(ConfigKeys.DEFAULT_PROVIDER, 'github') as string;
}

/**
 * Set the default git provider
 * @param provider - The provider name to set as default
 */
export function setDefaultProvider(provider: string): void {
  config.set(ConfigKeys.DEFAULT_PROVIDER, provider);
}

/**
 * Get all custom providers
 * @returns Object containing custom providers indexed by key
 */
export function getCustomProviders(): Record<string, GitProvider> {
  const storedProviders = config.get(ConfigKeys.CUSTOM_PROVIDERS, {}) as Record<
    string,
    StoredCustomProvider
  >;
  const providers: Record<string, GitProvider> = {};

  // Convert stored providers back to GitProvider with RegExp patterns
  for (const [key, stored] of Object.entries(storedProviders)) {
    providers[key] = {
      ...stored,
      urlPatterns: stored.urlPatterns.map(pattern => new RegExp(pattern)),
    };
  }

  return providers;
}

/**
 * Save a custom provider
 * @param key - Unique key for the provider
 * @param provider - Provider configuration
 */
export function saveCustomProvider(key: string, provider: GitProvider): void {
  const storedProviders = config.get(ConfigKeys.CUSTOM_PROVIDERS, {}) as Record<
    string,
    StoredCustomProvider
  >;

  // Convert RegExp patterns to strings for storage
  const storedProvider: StoredCustomProvider = {
    ...provider,
    urlPatterns: provider.urlPatterns.map(pattern => pattern.source),
    isCustom: true,
  };

  storedProviders[key] = storedProvider;
  config.set(ConfigKeys.CUSTOM_PROVIDERS, storedProviders);
}

/**
 * Delete a custom provider
 * @param key - Provider key to delete
 */
export function deleteCustomProvider(key: string): void {
  const storedProviders = config.get(ConfigKeys.CUSTOM_PROVIDERS, {}) as Record<
    string,
    StoredCustomProvider
  >;
  delete storedProviders[key];
  config.set(ConfigKeys.CUSTOM_PROVIDERS, storedProviders);
}

/**
 * Check if a custom provider exists
 * @param key - Provider key to check
 * @returns True if the provider exists
 */
export function customProviderExists(key: string): boolean {
  const providers = getCustomProviders();
  return key in providers;
}
