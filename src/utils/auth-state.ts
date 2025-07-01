import Conf from 'conf';

interface AuthState {
  [profile: string]: {
    copyCompleted: boolean;
    browserCompleted: boolean;
    addCompleted: boolean;
    testCompleted: boolean;
    lastUpdated: string;
  };
}

const authStateConfig = new Conf({
  projectName: 'gitm-auth-state',
  projectVersion: '1.0.0',
});

/**
 * Get authentication state for a profile
 * @param profile - Profile name
 * @returns Authentication state or default state
 */
export function getAuthState(profile: string): AuthState[string] {
  const states = authStateConfig.get('authStates', {}) as AuthState;
  return (
    states[profile] || {
      copyCompleted: false,
      browserCompleted: false,
      addCompleted: false,
      testCompleted: false,
      lastUpdated: new Date().toISOString(),
    }
  );
}

/**
 * Update authentication state for a profile
 * @param profile - Profile name
 * @param updates - Partial state updates
 */
export function updateAuthState(profile: string, updates: Partial<AuthState[string]>): void {
  const states = authStateConfig.get('authStates', {}) as AuthState;
  states[profile] = {
    ...getAuthState(profile),
    ...updates,
    lastUpdated: new Date().toISOString(),
  };
  authStateConfig.set('authStates', states);
}

/**
 * Clear authentication state for a profile
 * @param profile - Profile name
 */
export function clearAuthState(profile: string): void {
  const states = authStateConfig.get('authStates', {}) as AuthState;
  delete states[profile];
  authStateConfig.set('authStates', states);
}

/**
 * Check if all authentication steps are completed
 * @param profile - Profile name
 * @returns True if all steps are completed
 */
export function isAuthCompleted(profile: string): boolean {
  const state = getAuthState(profile);
  return state.copyCompleted && state.browserCompleted && state.addCompleted && state.testCompleted;
}
