import { describe, it, expect, beforeEach, afterEach, jest } from 'bun:test';
import fs from 'fs/promises';
import { setSecureFilePermissions } from '@/utils/ssh';
import * as shell from '@/utils/shell';

describe('File Permissions', () => {
  const mockSafeExec = jest.spyOn(shell, 'safeExec');
  const mockChmod = jest.spyOn(fs, 'chmod');
  const originalPlatform = process.platform;
  const originalUsername = process.env.USERNAME;
  const originalUser = process.env.USER;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSafeExec.mockResolvedValue({ stdout: '', stderr: '' });
    mockChmod.mockResolvedValue();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    process.env.USERNAME = originalUsername;
    process.env.USER = originalUser;
  });

  describe('Unix/Linux/macOS', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
    });

    it('should set 0o600 permissions on Unix systems', async () => {
      const testPath = '/home/user/.ssh/config';
      
      await setSecureFilePermissions(testPath);
      
      expect(mockChmod).toHaveBeenCalledWith(testPath, 0o600);
      expect(mockSafeExec).not.toHaveBeenCalled();
    });
  });

  describe('Windows', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.USERNAME = 'TestUser';
    });

    it('should use icacls to set permissions on Windows', async () => {
      const testPath = 'C:\\Users\\TestUser\\.ssh\\config';
      
      await setSecureFilePermissions(testPath);
      
      expect(mockChmod).not.toHaveBeenCalled();
      
      // Check that inheritance is removed
      expect(mockSafeExec).toHaveBeenCalledWith('icacls', [testPath, '/inheritance:r']);
      
      // Check that current user gets full control
      expect(mockSafeExec).toHaveBeenCalledWith('icacls', [testPath, '/grant:r', 'TestUser:F']);
      
      // Check that other users are removed
      expect(mockSafeExec).toHaveBeenCalledWith('icacls', [testPath, '/remove', 'Users']);
      expect(mockSafeExec).toHaveBeenCalledWith('icacls', [testPath, '/remove', 'Everyone']);
    });

    it('should handle missing USERNAME env var', async () => {
      delete process.env.USERNAME;
      process.env.USER = 'TestUser2';
      
      const testPath = 'C:\\Users\\TestUser2\\.ssh\\config';
      
      await setSecureFilePermissions(testPath);
      
      expect(mockSafeExec).toHaveBeenCalledWith('icacls', [testPath, '/grant:r', 'TestUser2:F']);
    });

    it('should not fail when removing non-existent users', async () => {
      const testPath = 'C:\\Users\\TestUser\\.ssh\\config';
      
      // Simulate failure on remove commands
      mockSafeExec.mockImplementation(async (cmd, args) => {
        if (args && args.includes('/remove')) {
          throw new Error('No mapping between account names and security IDs was done');
        }
        return { stdout: '', stderr: '' };
      });
      
      // Should not throw
      await expect(setSecureFilePermissions(testPath)).resolves.not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should log warning but not throw on permission errors', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockChmod.mockRejectedValue(new Error('Permission denied'));
      
      await setSecureFilePermissions('/test/path');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not set secure permissions')
      );
      
      consoleSpy.mockRestore();
    });
  });
});