import { RepoInfo, GitProvider } from '@/types';
import { GIT_PROVIDERS } from '@/config/constants';
import { getCustomProviders } from '@/lib/config';

// Cache for compiled regex patterns and providers
let cachedProviders: Record<string, GitProvider> | null = null;
let providersLastUpdated = 0;
const CACHE_TTL = 60000; // 1 minute cache TTL for custom providers

// Pre-compiled regex for gitm-managed URLs
const GITM_MANAGED_PATTERN = /^git@([^:]+)-([^:]+):([^/]+)\/(.+?)(?:\.git)?$/;

/**
 * Get all providers including custom ones with caching
 * @returns Combined providers object with built-in and custom providers
 * @remarks Cache is refreshed every 60 seconds to pick up custom provider changes
 */
export function getAllProviders(): Record<string, GitProvider> {
  const now = Date.now();

  // Return cached providers if still valid
  if (cachedProviders && now - providersLastUpdated < CACHE_TTL) {
    return cachedProviders;
  }

  // Rebuild cache
  const customProviders = getCustomProviders();
  cachedProviders = { ...GIT_PROVIDERS, ...customProviders };
  providersLastUpdated = now;

  return cachedProviders;
}

/**
 * Detect the git provider and extract repository information from a URL
 * @param url - The repository URL to parse
 * @returns Repository information if detected, null otherwise
 */
export function detectProvider(url: string): RepoInfo | null {
  // First check if this is a gitm-managed URL (e.g., git@github.com-personal:org/repo.git)
  const gitmMatch = url.match(GITM_MANAGED_PATTERN);

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

  // Try to match against each provider's patterns
  for (const [key, provider] of Object.entries(allProviders)) {
    // Early exit optimization: skip if URL doesn't contain provider host
    if (!url.includes(provider.host) && !url.includes(provider.sshHost || provider.host)) {
      continue;
    }

    for (const pattern of provider.urlPatterns) {
      const match = pattern.exec(url);
      if (match && match[1] && match[2]) {
        return {
          provider: key,
          organization: match[1],
          repository: match[2].replace(/\.git$/, ''),
        };
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
