import { spawn } from 'child_process';
import path from 'path';

interface ExecOptions {
  input?: Buffer | string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Safely execute a command using spawn to prevent shell injection
 * @param command - The command to execute
 * @param args - Array of arguments
 * @param options - Execution options
 * @returns Promise with stdout and stderr
 */
export function safeExec(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false, // Disable shell to prevent injection
      stdio: options.input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
      cwd: options.cwd,
      env: options.env,
    });

    let stdout = '';
    let stderr = '';

    if (options.input && child.stdin) {
      if (typeof options.input === 'string') {
        child.stdin.write(options.input);
      } else {
        child.stdin.write(options.input);
      }
      child.stdin.end();
    }

    child.stdout?.on('data', data => {
      stdout += data.toString();
    });

    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('error', error => {
      reject(error);
    });

    child.on('exit', code => {
      if (code === 0 || code === 1) {
        // Git commands often exit with 1 even on success
        resolve({ stdout, stderr });
      } else {
        interface CommandError extends Error {
          code: number;
          stdout: string;
          stderr: string;
        }
        const error = new Error(`Command failed with exit code ${code}`) as CommandError;
        error.code = code || -1;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

/**
 * Validate that a path stays within the allowed directory
 * @param inputPath - The path to validate
 * @param allowedDir - The directory that inputPath must be within
 * @returns True if path is within allowed directory
 * @remarks Prevents directory traversal attacks by ensuring paths stay within bounds
 * @example
 * isPathSafe('/home/user/.ssh/id_rsa', '/home/user/.ssh'); // true
 * isPathSafe('/home/user/../other/.ssh/id_rsa', '/home/user/.ssh'); // false
 */
export function isPathSafe(inputPath: string, allowedDir: string): boolean {
  const resolved = path.resolve(inputPath);
  const allowed = path.resolve(allowedDir);
  return resolved.startsWith(allowed + path.sep) || resolved === allowed;
}

/**
 * Escape a string for safe shell usage (when shell execution is absolutely necessary)
 * @param arg - The argument to escape
 * @returns Escaped string
 */
export function escapeShellArg(arg: string): string {
  // Replace single quotes with '\''
  return `'${arg.replace(/'/g, "'\"'\"'")}'`;
}

/**
 * Validate profile name to prevent injection
 * @param profile - Profile name to validate
 * @returns True if valid
 */
export function isValidProfileName(profile: string): boolean {
  // Allow only alphanumeric, dash, underscore
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(profile) && profile.length > 0 && profile.length < 50;
}

/**
 * Sanitize a string to be safe for filenames
 * @param input - The input string
 * @returns Sanitized string
 */
export function sanitizeForFilename(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '_');
}
