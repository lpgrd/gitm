import { safeExec } from '@/utils/shell';

/**
 * Check if a command exists in the system PATH
 * @param command - Command to check
 * @returns True if command exists, false otherwise
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      // On Windows, use 'where' command
      await safeExec('where', [command]);
    } else {
      // On Unix-like systems, use 'which' command
      await safeExec('which', [command]);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if required SSH tools are available
 * @returns Object with availability of each tool
 */
export async function checkSSHTools(): Promise<{
  sshKeygen: boolean;
  sshAdd: boolean;
  ssh: boolean;
}> {
  const [sshKeygen, sshAdd, ssh] = await Promise.all([
    commandExists('ssh-keygen'),
    commandExists('ssh-add'),
    commandExists('ssh'),
  ]);

  return {
    sshKeygen,
    sshAdd,
    ssh,
  };
}

/**
 * Get platform-specific instructions for installing SSH tools
 * @returns Installation instructions
 */
export function getSSHInstallInstructions(): string {
  switch (process.platform) {
    case 'win32':
      return `To use gitm on Windows, you need OpenSSH installed:

Option 1: Windows 10/11 Built-in OpenSSH (Recommended)
  1. Open Settings > Apps > Optional Features
  2. Click "Add a feature"
  3. Search for "OpenSSH Client" and install it
  4. Restart your terminal

Option 2: Git for Windows
  1. Install Git for Windows from https://git-scm.com/download/win
  2. During installation, select "Use Git and optional Unix tools from the Command Prompt"
  3. This will add ssh, ssh-keygen, and ssh-add to your PATH

Option 3: Use Git Bash
  If you have Git installed, you can run gitm from Git Bash which includes all SSH tools`;

    case 'darwin':
      return 'SSH tools should be pre-installed on macOS. If missing, install Xcode Command Line Tools:\n  xcode-select --install';

    default:
      return 'Install OpenSSH using your package manager:\n  Ubuntu/Debian: sudo apt-get install openssh-client\n  Fedora: sudo dnf install openssh-clients\n  Arch: sudo pacman -S openssh';
  }
}
