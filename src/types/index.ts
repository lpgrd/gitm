/**
 * Git provider configuration
 */
export interface GitProvider {
  /** Display name of the provider */
  name: string;
  /** Hostname for HTTPS URLs */
  host: string;
  /** Hostname for SSH URLs */
  sshHost: string;
  /** SSH port (defaults to 22) */
  sshPort?: number;
  /** URL patterns for detecting this provider */
  urlPatterns: RegExp[];
  /** Whether this is a custom provider */
  isCustom?: boolean;
}

/**
 * Stored custom provider configuration (serializable)
 */
export interface StoredCustomProvider {
  /** Display name of the provider */
  name: string;
  /** Hostname for HTTPS URLs */
  host: string;
  /** Hostname for SSH URLs */
  sshHost: string;
  /** SSH port (defaults to 22) */
  sshPort?: number;
  /** URL patterns for detecting this provider (as strings) */
  urlPatterns: string[];
  /** Whether this is a custom provider */
  isCustom?: boolean;
}

/**
 * Git account configuration
 */
export interface GitAccount {
  /** User's full name */
  name: string;
  /** User's email address */
  email: string;
  /** Git provider (github, gitlab, bitbucket, or custom) */
  provider: string;
  /** Username or organization name for auto-detection */
  username: string;
  /** Path to SSH private key */
  sshKeyPath: string;
  /** ISO timestamp when account was created */
  createdAt: string;
  /** Custom provider configuration (for self-hosted instances) */
  customProvider?: {
    /** Provider type (github, gitlab, bitbucket, gitea, etc.) */
    type: string;
    /** Custom domain */
    domain: string;
    /** SSH port (defaults to 22) */
    sshPort?: number;
  };
}

/**
 * Collection of git accounts indexed by profile name
 */
export interface GitAccounts {
  [profile: string]: GitAccount;
}

/**
 * Repository information extracted from URL
 */
export interface RepoInfo {
  /** Git provider key */
  provider: string;
  /** Organization or username */
  organization: string;
  /** Repository name */
  repository: string;
}

/**
 * Repository detection result
 */
export interface DetectionResult {
  /** Matched profile name */
  profile: string | null;
  /** Matched account data */
  account: GitAccount | null;
  /** Repository information */
  repoInfo: RepoInfo;
  /** Candidate accounts if multiple matches */
  candidates?: Array<[string, GitAccount]>;
}

/**
 * Remote repository information
 */
export interface RemoteInfo {
  /** Remote URL */
  url: string;
  /** Remote name (e.g., 'origin') */
  name: string;
}

/**
 * Clone command options
 */
export interface CloneOptions {
  /** Directory to clone into */
  directory?: string;
}

/**
 * SSH key generation options
 */
export interface SSHKeyOptions {
  /** Key type */
  type?: 'ed25519' | 'rsa';
  /** Key bits (for RSA) */
  bits?: number;
  /** Passphrase for key */
  passphrase?: string;
  /** Comment for the key */
  comment?: string;
}

/**
 * Configuration keys used in the config store
 */
export enum ConfigKeys {
  ACCOUNTS = 'accounts',
  DEFAULT_PROVIDER = 'defaultProvider',
  CUSTOM_PROVIDERS = 'customProviders',
}
