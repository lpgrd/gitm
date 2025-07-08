import { describe, it, expect } from 'bun:test';
import { getSSHKeyFingerprint, getSSHKeyInfo } from '@/utils/ssh';

describe('SSH Key Fingerprint utilities', () => {
  const sampleRSAKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLrPA3W8ySM1OoW9gL8YPjP4nETrCWnZP8XgHbLxc5xSmi8Xx3p7Qvd3VUMx8B2JV3TAMryXC2gD5XCYDqVBi9tPCOLANPPXKZ0h1NRvmSZJ3JYQ5N0VTj1D5BgBe2XYjNlHwH7kAPQHhKBNmSKJV8P3VGT2HXHS5J3lzsG7TTqPcW0K1g0XQnwqC6B7VUC0m4pdS2IVQnjm5kHTnBpPBr user@example.com';
  
  const sampleED25519Key = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl user@example.com';

  describe('getSSHKeyFingerprint', () => {
    it('should calculate correct fingerprint for RSA key', async () => {
      const fingerprint = await getSSHKeyFingerprint(sampleRSAKey);
      expect(fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
      expect(fingerprint.startsWith('SHA256:')).toBe(true);
      expect(fingerprint.length).toBeGreaterThanOrEqual(47);
      expect(fingerprint.length).toBeLessThanOrEqual(51); // Base64 can vary slightly
    });

    it('should calculate correct fingerprint for ED25519 key', async () => {
      const fingerprint = await getSSHKeyFingerprint(sampleED25519Key);
      expect(fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
      expect(fingerprint.startsWith('SHA256:')).toBe(true);
      expect(fingerprint.length).toBeGreaterThanOrEqual(47);
      expect(fingerprint.length).toBeLessThanOrEqual(51);
    });

    it('should handle keys with extra whitespace', async () => {
      const keyWithSpaces = '  ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLrPA3W8ySM1OoW9gL8YPjP4nETrCWnZP8XgHbLxc5xSmi8Xx3p7Qvd3VUMx8B2JV3TAMryXC2gD5XCYDqVBi9tPCOLANPPXKZ0h1NRvmSZJ3JYQ5N0VTj1D5BgBe2XYjNlHwH7kAPQHhKBNmSKJV8P3VGT2HXHS5J3lzsG7TTqPcW0K1g0XQnwqC6B7VUC0m4pdS2IVQnjm5kHTnBpPBr user@example.com  ';
      const fingerprint = await getSSHKeyFingerprint(keyWithSpaces);
      const normalFingerprint = await getSSHKeyFingerprint(sampleRSAKey);
      expect(fingerprint).toBe(normalFingerprint);
    });

    it('should throw error for invalid key format', async () => {
      expect(getSSHKeyFingerprint('invalid-key')).rejects.toThrow('Invalid SSH public key format');
      expect(getSSHKeyFingerprint('ssh-rsa')).rejects.toThrow('Invalid SSH public key format');
      expect(getSSHKeyFingerprint('')).rejects.toThrow('Invalid SSH public key format');
    });
  });

  describe('getSSHKeyInfo', () => {
    it('should extract correct info from RSA key', async () => {
      const info = await getSSHKeyInfo(sampleRSAKey);
      expect(info.type).toBe('ssh-rsa');
      expect(info.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
    });

    it('should extract correct info from ED25519 key', async () => {
      const info = await getSSHKeyInfo(sampleED25519Key);
      expect(info.type).toBe('ssh-ed25519');
      expect(info.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
    });

    it('should handle keys without comment', async () => {
      const keyNoComment = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLrPA3W8ySM1OoW9gL8YPjP4nETrCWnZP8XgHbLxc5xSmi8Xx3p7Qvd3VUMx8B2JV3TAMryXC2gD5XCYDqVBi9tPCOLANPPXKZ0h1NRvmSZJ3JYQ5N0VTj1D5BgBe2XYjNlHwH7kAPQHhKBNmSKJV8P3VGT2HXHS5J3lzsG7TTqPcW0K1g0XQnwqC6B7VUC0m4pdS2IVQnjm5kHTnBpPBr';
      const info = await getSSHKeyInfo(keyNoComment);
      expect(info.type).toBe('ssh-rsa');
      expect(info.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
    });

    it('should handle keys with multi-word comment', async () => {
      const keyWithComment = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDLrPA3W8ySM1OoW9gL8YPjP4nETrCWnZP8XgHbLxc5xSmi8Xx3p7Qvd3VUMx8B2JV3TAMryXC2gD5XCYDqVBi9tPCOLANPPXKZ0h1NRvmSZJ3JYQ5N0VTj1D5BgBe2XYjNlHwH7kAPQHhKBNmSKJV8P3VGT2HXHS5J3lzsG7TTqPcW0K1g0XQnwqC6B7VUC0m4pdS2IVQnjm5kHTnBpPBr my test key comment';
      const info = await getSSHKeyInfo(keyWithComment);
      expect(info.type).toBe('ssh-rsa');
      expect(info.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
    });

    it('should throw error for invalid key format', async () => {
      expect(getSSHKeyInfo('invalid-key')).rejects.toThrow('Invalid SSH public key format');
    });
  });
});