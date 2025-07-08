/**
 * Lazy imports for heavy dependencies to improve startup performance
 */

let inquirerCache: typeof import('inquirer') | null = null;
let chalkCache: typeof import('chalk').default | null = null;
let simpleGitCache: typeof import('simple-git').default | null = null;

/**
 * Lazy load inquirer (used for interactive prompts)
 */
export async function getInquirer() {
  if (!inquirerCache) {
    const module = await import('inquirer');
    inquirerCache = module;
  }
  return inquirerCache;
}

/**
 * Lazy load chalk (used for terminal colors)
 */
export async function getChalk() {
  if (!chalkCache) {
    const module = await import('chalk');
    chalkCache = module.default;
  }
  return chalkCache;
}

/**
 * Lazy load simple-git (used for git operations)
 */
export async function getSimpleGit() {
  if (!simpleGitCache) {
    const module = await import('simple-git');
    simpleGitCache = module.default;
  }
  return simpleGitCache;
}

/**
 * Create a git instance with lazy loading
 */
export async function createGitInstance(baseDir?: string) {
  const simpleGit = await getSimpleGit();
  return simpleGit(baseDir);
}
