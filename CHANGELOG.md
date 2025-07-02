# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-07-01

### Added
- Initial release of `gitm`
- Multi-account management for `GitHub`, `GitLab`, and `Bitbucket`
- Automatic SSH key generation and management
- Smart account detection based on repository URL
- Commands: `add`, `list`, `use`, `init`, `clone`, `remove`, `status`, `auth`, `verify`
- TypeScript implementation with full type safety
- Security-focused design with command injection protection
- Interactive authentication setup with persistent state
- Support for both `HTTPS` and `SSH` workflows
- Comprehensive documentation and examples

## [1.0.2] - 2025-07-02

### Added
- Windows compatibility support
- SSH tools availability checking with platform-specific installation instructions
- Windows-specific documentation in README with setup guides
- Platform-aware error messages for SSH agent issues
- Build-time version injection to eliminate runtime package.json dependencies
- `.npmignore` file to reduce published package size

### Changed
- SSH config file permissions (`chmod`) now only applied on Unix-like systems
- Hardcoded Unix paths (`~/.ssh`) replaced with platform-aware paths using `path.join()`
- Package scripts cleaned up and consolidated
- Updated build configuration `tsup.config.ts` to reduce the build size

### Fixed
- Version mismatch between `gitm -V` and package.json

### Removed
- Code coverage dependencies and scripts (`vitest coverage`, `c8`, `jest`)
- Duplicate npm scripts (consolidated lint/format variants)