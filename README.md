# gitm - Git Multi-Account Manager

[![npm version](https://img.shields.io/npm/v/@loopgrid/gitm)](https://www.npmjs.com/package/@loopgrid/gitm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Seamlessly manage multiple Git accounts on a single machine with automatic SSH key management and account detection.

## Features

- 🔐 **Automatic SSH key management** - Generate and manage ED25519 SSH keys per account
- 🎯 **Smart account detection** - Automatically detect which account to use based on repository
- 🌐 **Multi-provider support** - Works with GitHub, GitLab, Bitbucket, and self-hosted instances
- 🏢 **Custom provider support** - Add GitHub Enterprise, GitLab self-hosted, and more
- ⚡ **Zero configuration** - Works out of the box with sensible defaults
- 🔒 **Security-focused** - No credential storage, uses SSH keys exclusively

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Examples](#examples)
- [How It Works](#how-it-works)
- [Custom Providers](#custom-providers)
- [HTTPS vs SSH](#https-vs-ssh)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

### All Platforms
- Node.js 14 or higher
- Git installed and configured

### Windows Specific Requirements
gitm requires OpenSSH to be installed. You have several options:

**Option 1: Windows 10/11 Built-in OpenSSH (Recommended)**
1. Open Settings → Apps → Optional Features
2. Click "Add a feature"
3. Search for "OpenSSH Client" and install it
4. Restart your terminal

**Option 2: Git for Windows**
1. Install [Git for Windows](https://git-scm.com/download/win)
2. During installation, select "Use Git and optional Unix tools from the Command Prompt"
3. This will add `ssh`, `ssh-keygen`, and `ssh-add` to your PATH

**Option 3: Use Git Bash**
- If you have Git installed, run gitm commands from Git Bash which includes all SSH tools

## Installation

```bash
npm install -g @loopgrid/gitm
```

## Quick Start

### 1. Add your accounts

```bash
# Add personal GitHub account
gitm add personal
# ✔ Name: John Doe
# ✔ Email: john@personal.com
# ✔ Provider: github
# ✔ Username: johndoe

# Add work account
gitm add work
```

### 2. Authenticate

```bash
# Interactive authentication setup
gitm auth personal
# This will:
# - Show your SSH public key
# - Guide you to add it to GitHub/GitLab/Bitbucket
# - Test the connection
```

### 3. Clone or initialize

```bash
# Clone with automatic account detection
gitm clone git@github.com:johndoe/project.git

# Or initialize existing repository
cd existing-project
gitm init
```

## Commands

### Account Management

#### `gitm add <profile> [options]`
Add a new Git account.

```bash
gitm add personal
gitm add work --provider gitlab-self  # Use custom provider
```

Options:
- `--provider <name>` - Specify provider (default: prompts)

#### `gitm list`
List all configured accounts.

```bash
gitm list
# personal (John Doe) - john@personal.com [github]
# work (Jane Smith) - jane@company.com [gitlab]
```

#### `gitm remove <profile>`
Remove an account and optionally its SSH keys.

```bash
gitm remove personal
# ? Are you sure? Yes
# ? Remove SSH keys? Yes
```

### Authentication

#### `gitm auth <profile>`
Interactive authentication setup with checklist.

```bash
gitm auth work
# Shows SSH key, provides browser links, and guides through setup
```

#### `gitm verify <profile>`
Verify account configuration and test SSH connection.

```bash
gitm verify personal
# ✓ Account exists
# ✓ SSH key found
# ✓ SSH connection successful
```

### Repository Management

#### `gitm init [options]`
Initialize repository with account auto-detection.

```bash
gitm init
# Auto-detects account based on remote URL
# Or prompts to select from matching accounts

gitm init --no-ssh  # Keep HTTPS URLs
```

Options:
- `--no-ssh` - Don't convert HTTPS URLs to SSH

#### `gitm use <profile>`
Set specific account for current repository.

```bash
gitm use work
# Updates git config and remote URLs
```

#### `gitm clone <url> [options]`
Clone repository with automatic account setup.

```bash
gitm clone git@github.com:company/project.git
gitm clone https://github.com/user/repo.git -d my-folder
```

Options:
- `-d, --directory <path>` - Target directory
- `--no-ssh` - Keep HTTPS URLs

#### `gitm status`
Show current repository's account configuration.

```bash
gitm status
# Repository: project
# Remote: git@github.com-work:company/project.git
# Account: work (Jane Smith)
# ✓ Using gitm account: work
```

### Provider Management

#### `gitm provider add [key]`
Add custom provider for self-hosted instances.

```bash
gitm provider add gitlab-self
# ? Display name: Company GitLab
# ? Provider type: GitLab (self-hosted)
# ? Domain: gitlab.company.com
# ? SSH port: 22
```

#### `gitm provider list`
List all custom providers.

```bash
gitm provider list
# gitlab-self:
#   Name: Company GitLab
#   Host: gitlab.company.com
#   SSH Port: 22
```

#### `gitm provider remove <key>`
Remove a custom provider.

```bash
gitm provider remove gitlab-self
```

#### `gitm provider show <key>`
Show detailed provider information.

```bash
gitm provider show gitlab-self
```

## Examples

### Example 1: Personal and Work Accounts

```bash
# Setup
gitm add personal
gitm add work
gitm auth personal
gitm auth work

# Clone personal project
gitm clone git@github.com:johndoe/blog.git
cd blog
gitm status  # Shows: Using gitm account: personal

# Clone work project
gitm clone git@github.com:company/app.git
cd app
gitm status  # Shows: Using gitm account: work
```

### Example 2: Multiple Accounts Same Provider

```bash
# Two GitHub accounts
gitm add personal-github
gitm add contractor-github

# Clone automatically detects based on organization
gitm clone git@github.com:personal-org/project.git  # Uses personal-github
gitm clone git@github.com:client-org/project.git    # Uses contractor-github
```

### Example 3: Self-Hosted GitLab

```bash
# Add custom provider
gitm provider add gitlab-work

# Add account using custom provider
gitm add work --provider gitlab-work

# Clone from self-hosted instance
gitm clone git@gitlab.company.com:team/project.git
```

### Example 4: Converting Existing Repository

```bash
cd existing-project
git remote -v  # Shows HTTPS URLs

gitm init
# ✔ Auto-detected account: personal
# ✔ Remote URL converted to SSH

git remote -v  # Now shows SSH URLs with gitm
```

## How It Works

### SSH Key Management
Each account gets its own SSH key stored in `~/.ssh/`:
```
~/.ssh/gitm_personal_github
~/.ssh/gitm_personal_github.pub
~/.ssh/gitm_work_gitlab
~/.ssh/gitm_work_gitlab.pub
```

### SSH Config
gitm creates custom SSH hosts in `~/.ssh/config`:
```ssh
# gitm: personal
Host github.com-personal
  HostName github.com
  User git
  IdentityFile ~/.ssh/gitm_personal_github
  IdentitiesOnly yes

# gitm: work  
Host github.com-work
  HostName github.com
  User git
  IdentityFile ~/.ssh/gitm_work_github
  IdentitiesOnly yes
```

### Remote URLs
Repository remotes use custom SSH hosts:
```bash
# Instead of: git@github.com:user/repo.git
# gitm uses: git@github.com-personal:user/repo.git
```

This ensures each repository uses the correct SSH key automatically.

## Custom Providers

gitm supports any Git hosting service including self-hosted instances.

### Adding a Provider

```bash
gitm provider add github-enterprise
# Provider display name: GitHub Enterprise
# Provider type: GitHub Enterprise  
# Domain: github.company.com
# SSH port: 22
```

### Supported Types
- GitHub Enterprise
- GitLab (self-hosted)
- Bitbucket Server
- Gitea
- Other (generic)

### Using Custom Providers

```bash
# Add account with custom provider
gitm add work --provider github-enterprise

# Works automatically with clone/init
gitm clone git@github.company.com:team/project.git
```

## HTTPS vs SSH

### Why SSH is Recommended

1. **Multiple identities** - Each account has its own SSH key
2. **No password prompts** - SSH keys provide seamless authentication
3. **Better security** - No tokens stored in plain text

### Using HTTPS

While gitm is designed for SSH, you can use HTTPS with limitations:

```bash
gitm clone https://github.com/user/repo.git --no-ssh
```

**Limitations:**
- Cannot distinguish between multiple accounts on same provider
- Requires manual credential management
- May conflict when switching accounts

### Converting to SSH

```bash
cd your-https-repo
gitm init  # Offers to convert remotes to SSH
```

## Troubleshooting

### SSH Connection Issues

```bash
# 1. Verify your setup
gitm verify personal

# 2. Check SSH key is added to provider
gitm auth personal  # Re-run setup

# 3. Test SSH directly
ssh -T git@github.com-personal
```

### Windows: SSH Agent Not Running

If you see "Could not add key to ssh-agent" on Windows:

```bash
# Start ssh-agent service (run as Administrator)
Get-Service ssh-agent | Set-Service -StartupType Automatic
Start-Service ssh-agent

# Or manually add your key
ssh-add C:\Users\YourName\.ssh\gitm_personal_github
```

### Port 22 Blocked

If your network blocks port 22:

```bash
# Option 1: Use HTTPS
gitm clone https://github.com/user/repo.git --no-ssh

# Option 2: Configure SSH over HTTPS (port 443)
# Add to ~/.ssh/config:
Host github.com-personal
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/gitm_personal_github
```

### Wrong Account Detected

```bash
# Check current configuration
gitm status

# Manually set correct account
gitm use personal
```

### Permission Denied (403)

This usually means the SSH key isn't properly configured:

```bash
# Re-run authentication
gitm auth personal

# Ensure key is added to Git provider
# Copy key manually if needed:
cat ~/.ssh/gitm_personal_github.pub
```

## FAQ

**Q: Can I use the same email for multiple accounts?**  
A: Yes, gitm identifies accounts by profile name, not email.

**Q: What happens to my existing SSH keys?**  
A: gitm creates separate keys prefixed with `gitm_` and doesn't touch existing keys.

**Q: Can I use this with Git GUIs?**  
A: Yes, gitm configures standard Git settings that work with any Git client.

**Q: How do I backup my accounts?**  
A: Backup `~/.ssh/gitm_*` files and run `gitm list` to document your accounts.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Run tests
npm test

# Type checking
npm run typecheck
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built to solve the daily struggle of developers juggling multiple Git accounts.

---

**Note:** This project is not affiliated with GitHub, GitLab, or Bitbucket.