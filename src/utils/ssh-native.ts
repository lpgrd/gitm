import { SSHKeyOptions } from '@/types';

/**
 * Native SSH instance interface representing the Rust struct methods
 */
interface NativeSSHInstance {
  getFingerprint(keyPath: string): string;
  checkPermissions(filePath: string): Promise<boolean>;
  generateKeyFast(keyPath: string, keyType: string, bits?: number): Promise<void>;
  setWindowsPermissionsBatch?(filePaths: string[]): Promise<void>;
}

/**
 * Native SSH class constructor interface
 */
interface NativeSSHClass {
  new (): NativeSSHInstance;
}

/**
 * Native module interface exported from Rust
 */
interface NativeModule {
  FastSsh: NativeSSHClass;
  encodeBase64(input: string): string;
  decodeBase64(input: string): string;
}

let nativeModule: NativeModule | null = null;

/**
 * Load native module if available
 * @returns The native module instance or null if not available
 * @private
 */
async function loadNativeModule(): Promise<NativeModule | null> {
  if (nativeModule !== null) {
    return nativeModule;
  }

  try {
    // Try to load the native module
    nativeModule = (await import('@gitm/native')) as NativeModule;
    return nativeModule;
  } catch {
    // Native module not available, fall back to Node.js implementation
    console.debug('Native module not available, using fallback implementation');
    return null;
  }
}

/**
 * Get SSH key fingerprint using native module if available
 * @param keyPath - Path to the SSH public key file
 * @returns SHA256 fingerprint string or null if native module unavailable
 * @example
 * const fingerprint = await getFingerprintNative('/home/user/.ssh/id_ed25519.pub');
 * if (fingerprint) {
 *   console.log(fingerprint); // SHA256:AbCdEf...
 * }
 */
export async function getFingerprintNative(keyPath: string): Promise<string | null> {
  const native = await loadNativeModule();
  if (!native) {
    return null;
  }

  try {
    const ssh = new native.FastSsh();
    return ssh.getFingerprint(keyPath);
  } catch (error) {
    console.debug('Native fingerprint failed, falling back to ssh-keygen', error);
    return null;
  }
}

/**
 * Generate SSH key using native module if available
 * @param keyPath - Path where the SSH key should be generated
 * @param options - SSH key generation options
 * @returns true if generation succeeded, false if native module unavailable or failed
 * @example
 * const success = await generateKeyNative('/home/user/.ssh/id_ed25519', {
 *   type: 'ed25519',
 *   passphrase: '',
 *   comment: 'user@example.com'
 * });
 */
export async function generateKeyNative(keyPath: string, options: SSHKeyOptions): Promise<boolean> {
  const native = await loadNativeModule();
  if (!native) {
    return false;
  }

  try {
    const ssh = new native.FastSsh();
    await ssh.generateKeyFast(keyPath, options.type || 'ed25519', options.bits);
    return true;
  } catch (error) {
    console.debug('Native key generation failed, falling back to ssh-keygen', error);
    return false;
  }
}

/**
 * Set Windows permissions in batch using native module
 * @param filePaths - Array of file paths to set permissions for
 * @returns true if permissions were set successfully, false otherwise
 * @remarks Only works on Windows platform
 * @example
 * const success = await setWindowsPermissionsBatchNative([
 *   'C:\\Users\\user\\.ssh\\id_rsa',
 *   'C:\\Users\\user\\.ssh\\config'
 * ]);
 */
export async function setWindowsPermissionsBatchNative(filePaths: string[]): Promise<boolean> {
  if (process.platform !== 'win32') {
    return false;
  }

  const native = await loadNativeModule();
  if (!native || !native.FastSsh.prototype.setWindowsPermissionsBatch) {
    return false;
  }

  try {
    const ssh = new native.FastSsh();
    await ssh.setWindowsPermissionsBatch!(filePaths);
    return true;
  } catch (error) {
    console.debug('Native batch permissions failed', error);
    return false;
  }
}
