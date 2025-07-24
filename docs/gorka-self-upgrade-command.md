---
title: "Gorka Self-Upgrade Command Reference"
author: "@bohdan-shulha"
date: "2025-07-24"
last_updated: "2025-07-24T15:46:56+02:00"
timezone: "Europe/Warsaw"
status: "approved"
version: "1.0.0"
reviewers: []
tags: ["cli", "gorka", "self-upgrade", "binary-management"]
document_type: "guide"
---

# Gorka Self-Upgrade Command Reference
*Last updated: 2025-07-24T15:46:56+02:00 (Europe/Warsaw)*
*Version: 1.0.0*
*Status: APPROVED*

## Document History
| Version | Date | Time | Author | Status | Changes |
|---------|------|------|--------|--------|---------|
| 1.0.0 | 2025-07-24 | 15:46:56 | @bohdan-shulha | Approved | Initial documentation for self-upgrade command |

## Overview

The `gorka self-upgrade` command provides a safe and reliable way to upgrade the gorka binary itself to the latest version from the repository. This top-level command handles the entire upgrade process with comprehensive safety measures and error handling.

## Command Structure

```bash
gorka self-upgrade
```

## Features

- **Repository Sync**: Downloads latest gorka binary from the GitHub repository
- **Safety-First Design**: Creates automatic backup of current binary before any changes
- **Binary Validation**: Tests new binary functionality before installation
- **Atomic Replacement**: Replaces binary in a single operation to avoid partial states
- **Automatic Rollback**: Restores backup automatically on any failure
- **Permission Handling**: Preserves executable permissions correctly
- **Environment Detection**: Works with both local development and installed copies
- **Change Detection**: Skips upgrade if already up-to-date

## Safety Measures

### Pre-Installation Checks
- **Permission Verification**: Confirms write access to binary location before starting
- **Repository Access**: Validates ability to download latest version
- **Binary Existence**: Ensures new binary exists in repository

### Backup and Validation
- **Timestamped Backup**: Creates backup with unique timestamp: `gorka.backup.1642681234`
- **Functionality Test**: Validates new binary responds to basic commands
- **Checksum Comparison**: Compares file hashes to detect actual changes

### Error Recovery
- **Automatic Rollback**: Restores original binary on any installation failure
- **Backup Cleanup**: Removes backup only after successful validation
- **Permission Restoration**: Ensures executable permissions are maintained

## Usage Examples

### Basic Usage
```bash
# Upgrade gorka to latest version
gorka self-upgrade
```

### Typical Output
```
[STEP] Starting gorka self-upgrade
[INFO] Downloading latest gorka version...
[SUCCESS] Repository updated successfully
[INFO] Validating new binary...
[INFO] Creating backup of current binary...
[INFO] Installing new binary...
[SUCCESS] Gorka successfully upgraded!
[INFO] New version installed at: /usr/local/bin/gorka
[INFO] Testing new installation...
[SUCCESS] Upgrade completed successfully
```

### Already Up-to-Date
```
[STEP] Starting gorka self-upgrade
[INFO] Downloading latest gorka version...
[SUCCESS] Repository updated successfully
[SUCCESS] Gorka is already up to date
```

## Error Handling

### Permission Errors
```
[STEP] Starting gorka self-upgrade
[ERROR] No write permission to upgrade gorka binary at: /usr/local/bin/gorka
[ERROR] Try running with appropriate permissions or contact your system administrator
```

**Solutions:**
- Run with sudo: `sudo gorka self-upgrade`
- Change binary location permissions
- Install gorka in user-writable location

### Download Failures
```
[STEP] Starting gorka self-upgrade
[INFO] Downloading latest gorka version...
[ERROR] Failed to download latest repository
```

**Solutions:**
- Check internet connectivity
- Verify GitHub access
- Try again later if repository is temporarily unavailable

### Binary Validation Failures
```
[STEP] Starting gorka self-upgrade
[INFO] Downloading latest gorka version...
[SUCCESS] Repository updated successfully
[INFO] Validating new binary...
[ERROR] New binary failed validation test
```

**Solutions:**
- Repository may contain broken binary
- Try again later after repository is fixed
- Report issue to gorka maintainers

### Installation Failures with Rollback
```
[STEP] Starting gorka self-upgrade
[INFO] Downloading latest gorka version...
[SUCCESS] Repository updated successfully
[INFO] Validating new binary...
[INFO] Creating backup of current binary...
[INFO] Installing new binary...
[ERROR] Failed to install new binary, restoring backup...
```

**Recovery:**
- Original binary is automatically restored
- System returns to previous working state
- Safe to retry after resolving underlying issue

## Technical Details

### Binary Path Resolution
The command automatically determines the path of the currently running gorka binary using:
1. `readlink -f "$0"` (Linux)
2. `realpath "$0"` (macOS/BSD)
3. `$0` (fallback)

### Repository Integration
- Uses existing `ensure_files_available()` function
- Leverages git clone/pull mechanism
- Respects development vs. production environment detection

### Atomic Operation Design
1. **Download**: Get latest repository
2. **Validate**: Test new binary functionality
3. **Backup**: Create timestamped backup
4. **Install**: Copy new binary over current (atomic filesystem operation)
5. **Test**: Verify new installation works
6. **Cleanup**: Remove backup on success, restore on failure

### Change Detection
Uses SHA256 checksums when available to determine if upgrade is necessary:
```bash
current_hash=$(sha256sum "$current_binary" | cut -d' ' -f1)
new_hash=$(sha256sum "$new_binary" | cut -d' ' -f1)
```

## Integration with Gorka Ecosystem

### Maintenance Workflows
The self-upgrade command integrates well with other gorka maintenance tasks:
```bash
# Complete system maintenance
gorka update list available          # Check for component updates
gorka update sync                    # Update components
gorka update clean-orphans           # Clean up old items
gorka self-upgrade                   # Upgrade gorka itself
gorka update list                    # Verify final state
```

### Development Environment Behavior
When running from a development repository (detected by presence of local files), the command:
- Uses local repository files instead of downloading
- Still performs all safety checks and validations
- Provides appropriate feedback about development context

## Best Practices

### Regular Maintenance
- Include `gorka self-upgrade` in regular maintenance routines
- Run after major repository updates
- Consider scripting with other maintenance commands

### Safety Considerations
- Always ensure you have backup access to gorka functionality
- Test in non-production environments first when possible
- Monitor upgrade process output for any warnings

### Troubleshooting Workflow
1. **Check Permissions**: Ensure write access to binary location
2. **Verify Connectivity**: Confirm ability to access GitHub repository
3. **Review Output**: Check all error messages for specific guidance
4. **Retry if Transient**: Network or temporary repository issues may resolve
5. **Report Persistent Issues**: Contact maintainers for ongoing problems

## Security Considerations

### Repository Trust
- Downloads only from official gork-labs/gorka repository
- Uses existing repository configuration
- Validates binary functionality before installation

### Binary Integrity
- Tests basic functionality before and after installation
- Maintains backup for emergency restoration
- Uses atomic file operations to prevent partial states

### Permission Model
- Requires write access to binary location
- Preserves original file permissions
- Does not escalate privileges automatically

This command provides a robust, safe method for keeping the gorka binary up-to-date while maintaining system stability and security.
