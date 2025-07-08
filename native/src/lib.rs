//! Native performance optimizations for GitM CLI
//! 
//! This module provides fast implementations of SSH operations that would
//! otherwise require spawning external processes or be slow in JavaScript.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use sha2::{Sha256, Digest};
use std::fs;
use std::process::Command;
use base64::{Engine as _, engine::general_purpose};

/// Fast SSH operations struct
/// Provides optimized implementations for SSH-related operations
#[napi]
pub struct FastSsh;

#[napi]
impl FastSsh {
    #[napi]
    pub fn new() -> Self {
        FastSsh
    }

    /// Generate SSH key fingerprint by directly calculating SHA256 hash
    /// 
    /// This is much faster than spawning ssh-keygen process.
    /// 
    /// # Arguments
    /// * `key_path` - Path to the SSH public key file
    /// 
    /// # Returns
    /// * SSH fingerprint in SHA256:base64 format
    /// 
    /// # Errors
    /// * If file cannot be read
    /// * If key format is invalid
    /// * If base64 data is malformed
    #[napi]
    pub fn get_fingerprint(&self, key_path: String) -> Result<String> {
        let content = fs::read_to_string(&key_path)
            .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;

        // Parse the public key
        let parts: Vec<&str> = content.trim().split_whitespace().collect();
        if parts.len() < 2 {
            return Err(Error::new(Status::InvalidArg, "Invalid SSH key format"));
        }

        // Decode base64 key data
        let key_data = general_purpose::STANDARD.decode(parts[1])
            .map_err(|e| Error::new(Status::InvalidArg, format!("Invalid base64: {}", e)))?;

        // Calculate SHA256 hash
        let mut hasher = Sha256::new();
        hasher.update(&key_data);
        let hash = hasher.finalize();

        // Convert to base64 and format as SSH fingerprint
        let fingerprint = general_purpose::STANDARD.encode(hash);
        Ok(format!("SHA256:{}", fingerprint.trim_end_matches('=')))
    }

    /// Check if file has secure permissions (600 on Unix)
    /// 
    /// On Unix: checks if file has 0600 permissions (read/write for owner only)
    /// On Windows: just checks if file exists (permissions handled differently)
    /// 
    /// # Arguments
    /// * `file_path` - Path to the file to check
    /// 
    /// # Returns
    /// * `true` if permissions are secure, `false` otherwise
    #[napi]
    pub async fn check_permissions(&self, file_path: String) -> Result<bool> {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let metadata = fs::metadata(&file_path)
                .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;
            let mode = metadata.permissions().mode();
            Ok((mode & 0o777) == 0o600)
        }

        #[cfg(not(unix))]
        {
            // On Windows, just check if file exists and is readable by current user
            Ok(std::path::Path::new(&file_path).exists())
        }
    }

    /// Generate SSH key using optimized subprocess call
    /// 
    /// Currently still uses ssh-keygen but with optimized parameters
    /// for faster generation (no passphrase prompt, quiet mode).
    /// 
    /// # Arguments
    /// * `key_path` - Path where the key should be saved
    /// * `key_type` - Type of key ('ed25519' or 'rsa')
    /// * `bits` - Optional key size in bits (only for RSA)
    /// 
    /// # Errors
    /// * If ssh-keygen command fails
    #[napi]
    pub async fn generate_key_fast(
        &self,
        key_path: String,
        key_type: String,
        bits: Option<u32>,
    ) -> Result<()> {
        // For now, we still use ssh-keygen but with optimized parameters
        let mut cmd = Command::new("ssh-keygen");
        cmd.arg("-t").arg(&key_type)
            .arg("-f").arg(&key_path)
            .arg("-N").arg("") // No passphrase
            .arg("-C").arg("") // No comment
            .arg("-q"); // Quiet mode

        if let Some(b) = bits {
            cmd.arg("-b").arg(b.to_string());
        }

        let output = cmd.output()
            .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(Error::new(Status::GenericFailure, stderr.to_string()));
        }

        Ok(())
    }

    /// Batch set Windows permissions using PowerShell
    /// 
    /// Sets secure permissions for multiple files in a single PowerShell
    /// script execution, which is much faster than individual icacls calls.
    /// 
    /// # Arguments
    /// * `file_paths` - List of file paths to secure
    /// 
    /// # Platform
    /// * Only available on Windows
    /// * Returns error on other platforms
    /// 
    /// # Errors
    /// * If not running on Windows
    /// * If PowerShell execution fails
    #[napi]
    pub async fn set_windows_permissions_batch(&self, _file_paths: Vec<String>) -> Result<()> {
        #[cfg(not(target_os = "windows"))]
        {
            return Err(Error::new(Status::GenericFailure, "This function is only available on Windows"));
        }
        
        #[cfg(target_os = "windows")]
        {
        let username = std::env::var("USERNAME")
            .or_else(|_| std::env::var("USER"))
            .map_err(|_| Error::new(Status::GenericFailure, "Could not determine user"))?;

        // Create PowerShell script for batch operations
        let mut script = String::new();
        for path in &file_paths {
            script.push_str(&format!(
                r#"
$acl = Get-Acl "{}"
$acl.SetAccessRuleProtection($true, $false)
$permission = "{}", "FullControl", "Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl "{}" $acl
"#,
                path, username, path
            ));
        }

        let output = Command::new("powershell")
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-Command")
            .arg(&script)
            .output()
            .map_err(|e| Error::new(Status::GenericFailure, e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(Error::new(Status::GenericFailure, stderr.to_string()));
        }

        Ok(())
        }
    }
}

/// Fast base64 encoding
/// 
/// Encodes a string to base64 format.
/// 
/// # Arguments
/// * `input` - String to encode
/// 
/// # Returns
/// * Base64 encoded string
#[napi]
pub fn encode_base64(input: String) -> String {
    general_purpose::STANDARD.encode(input.as_bytes())
}

/// Fast base64 decoding
/// 
/// Decodes a base64 string back to UTF-8.
/// 
/// # Arguments
/// * `input` - Base64 string to decode
/// 
/// # Returns
/// * Decoded UTF-8 string
/// 
/// # Errors
/// * If input is not valid base64
/// * If decoded bytes are not valid UTF-8
#[napi]
pub fn decode_base64(input: String) -> Result<String> {
    let decoded = general_purpose::STANDARD.decode(&input)
        .map_err(|e| Error::new(Status::InvalidArg, e.to_string()))?;
    String::from_utf8(decoded)
        .map_err(|e| Error::new(Status::InvalidArg, e.to_string()))
}