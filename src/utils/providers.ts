import { RepoInfo, GitProvider } from '@/types';
import { GIT_PROVIDERS } from '@/config/constants';
import { getCustomProviders } from '@/lib/config';

/**
 * Get all providers including custom ones
 * @returns Combined providers object
 */
export function getAllProviders(): Record<string, GitProvider> {
  const customProviders = getCustomProviders();
  return { ...GIT_PROVIDERS, ...customProviders };
}

/**
 * Detect the git provider and extract repository information from a URL
 * @param url - The repository URL to parse
 * @returns Repository information if detected, null otherwise
 */
export function detectProvider(url: string): RepoInfo | null {
  // First check if this is a gitm-managed URL (e.g., git@github.com-personal:org/repo.git)
  const gitmManagedPattern = /^git@([^:]+)-([^:]+):([^/]+)\/(.+?)(?:\.git)?$/;
  const gitmMatch = url.match(gitmManagedPattern);

  if (gitmMatch) {
    const [, domain, , organization, repository] = gitmMatch;

    // Try to find the provider based on the domain
    let providerKey = null;

    // Check standard providers
    if (domain.includes('github')) {
      providerKey = 'github';
    } else if (domain.includes('gitlab')) {
      providerKey = 'gitlab';
    } else if (domain.includes('bitbucket')) {
      providerKey = 'bitbucket';
    } else {
      // Check custom providers
      const customProviders = getCustomProviders();
      for (const [key, provider] of Object.entries(customProviders)) {
        if (domain.includes(provider.host.replace(/\./g, '-'))) {
          providerKey = key;
          break;
        }
      }
    }

    if (providerKey) {
      return {
        provider: providerKey,
        organization,
        repository: repository.replace(/\.git$/, ''),
      };
    }
  }

  // Fall back to standard detection
  const allProviders = getAllProviders();

  for (const [key, provider] of Object.entries(allProviders)) {
    for (const pattern of provider.urlPatterns) {
      if (pattern.test(url)) {
        const match = url.match(pattern);
        if (match) {
          return {
            provider: key,
            organization: match[1],
            repository: match[2].replace(/\.git$/, ''),
          };
        }
      }
    }
  }
  return null;
}

/**
 * Get a list of all supported git providers
 * @returns Array of provider names
 */
export function getProviderList(): string[] {
  const allProviders = getAllProviders();
  return Object.keys(allProviders);
}

/**
 * Check if a provider is supported
 * @param provider - The provider name to check
 * @returns True if the provider is supported
 */
export function isValidProvider(provider: string): boolean {
  const allProviders = getAllProviders();
  return provider in allProviders;
}

/**
 * Get provider display name
 * @param provider - The provider key
 * @returns The display name or the key if not found
 */
export function getProviderDisplayName(provider: string): string {
  const allProviders = getAllProviders();
  return allProviders[provider]?.name || provider;
}

/**
 * Get provider configuration
 * @param provider - The provider key
 * @returns Provider configuration or null
 */
export function getProviderConfig(provider: string): GitProvider | null {
  const allProviders = getAllProviders();
  return allProviders[provider] || null;
}
