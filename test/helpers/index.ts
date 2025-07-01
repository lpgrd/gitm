import { vi, beforeEach, afterEach } from 'vitest';
import type { GitAccount } from '@/types';

/**
 * Create a mock GitAccount for testing
 */
export function createMockAccount(overrides?: Partial<GitAccount>): GitAccount {
  return {
    name: 'Test User',
    email: 'test@example.com',
    provider: 'github',
    username: 'testuser',
    sshKeyPath: '/home/user/.ssh/gitm_test_github',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock the config module
 */
export function mockConfig() {
  return {
    getAccounts: vi.fn(() => ({})),
    getAccount: vi.fn(),
    saveAccount: vi.fn(),
    deleteAccount: vi.fn(),
    accountExists: vi.fn(() => false),
    getSSHKeyPath: vi.fn(),
    getDefaultProvider: vi.fn(() => 'github'),
    setDefaultProvider: vi.fn(),
  };
}

/**
 * Create a temporary directory path for testing
 */
export function getTempPath(name: string): string {
  return `/tmp/gitm-test-${Date.now()}-${name}`;
}

/**
 * Mock console methods to avoid cluttering test output
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalError = console.error;
  
  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
  });
  
  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
  });
  
  return {
    getLogCalls: () => (console.log as ReturnType<typeof vi.fn>).mock.calls,
    getErrorCalls: () => (console.error as ReturnType<typeof vi.fn>).mock.calls,
  };
}