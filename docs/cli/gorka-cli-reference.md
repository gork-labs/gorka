---
title: "Gorka CLI Reference - Complete Command Guide"
author: "@bohdan-shulha"
date: "2025-07-24"
last_updated: "2025-07-24T16:10:32+02:00"
timezone: "Europe/Warsaw"
status: "approved"
version: "1.0.0"
reviewers: []
tags: ["cli", "reference", "commands", "gorka"]
document_type: "api"
---

# Gorka CLI Reference - Complete Command Guide
*Last updated: 2025-07-24T16:10:32+02:00 (Europe/Warsaw)*
*Version: 1.0.0*
*Status: APPROVED*

## Document History
| Version | Date | Time | Author | Status | Changes |
|---------|------|------|--------|--------|---------|
| 1.0.0 | 2025-07-24 | 16:10:32 | @bohdan-shulha | Approved | Initial comprehensive CLI reference |

## Overview

The `gorka` command-line interface provides comprehensive management of the Gorka agent system, including installation, updates, maintenance, and troubleshooting capabilities.

## Command Structure

```bash
gorka <command> [subcommand] [options]
```

## Quick Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `gorka install` | Install agent system | `gorka install --global` |
| `gorka update` | Manage components | `gorka update sync` |
| `gorka self-upgrade` | Upgrade gorka binary | `gorka self-upgrade` |
| `gorka clean` | Clear cache | `gorka clean` |
| `gorka help` | Show help | `gorka help` |

## Installation Commands

### `gorka install`
Install the Gorka agent system configurations.

**Syntax:**
```bash
gorka install [--global]
```

**Options:**
- No options: Install workspace configuration (default)
- `--global`: Install global configuration for all projects

**What it does:**
- **Workspace mode** (`gorka install`):
  - Merges MCP configurations to `.vscode/mcp.json`
  - Copies chatmodes to `.github/chatmodes/`
  - Copies instructions to `.github/instructions/`
  - Creates memory.json for workspace context
  - Updates gorka metadata in `.vscode/gorka.json`

- **Global mode** (`gorka install --global`):
  - Merges MCP configurations to VS Code user settings
  - Copies chatmodes to VS Code user directory
  - Updates gorka metadata in user directory
  - Also installs workspace config if `.vscode` directory exists

**Examples:**
```bash
# Install for current workspace only
gorka install

# Install globally for all projects
gorka install --global

# Global install will also install workspace config if .vscode exists
cd my-project && gorka install --global
```

**Output locations:**
- **macOS Global**: `~/Library/Application Support/Code/User/`
- **Linux Global**: `~/.config/Code/User/`
- **Workspace**: `.vscode/` and `.github/` directories

## Update Management Commands

### `gorka update list`
Show status of installed components.

**Syntax:**
```bash
gorka update list [scope]
```

**Scopes:**
- `global`: Show global components only
- `workspace`: Show workspace components only
- `available`: Show available components from repository
- `both` or empty: Show both global and workspace (default)

**Examples:**
```bash
# Show all installed components
gorka update list

# Show only workspace components
gorka update list workspace

# Show what's available in repository
gorka update list available
```

**Sample output:**
```
=== Current workspace Components ===

MCP Servers (gorka-managed):
  ✓ memory
  ✓ git
  ✓ time

MCP Inputs (gorka-managed):

Chatmodes (gorka-managed):
  ✓ Software Architect - Gorka.chatmode.md
  ✓ Design Reviewer - Gorka.chatmode.md

Instructions (gorka-managed):
  ✓ DOCUMENTATION_STANDARDS_GORKA.instructions.md
  ✓ THINKING_PROCESS_GORKA.instructions.md
```

### `gorka update sync`
Synchronize with latest repository, updating components.

**Syntax:**
```bash
gorka update sync [scope]
```

**Scopes:**
- `global`: Sync global configuration only
- `workspace`: Sync workspace configuration only
- `both` or empty: Sync both (default)

**What it does:**
- Downloads latest repository content
- Updates MCP server configurations
- Updates chatmode files
- Updates instruction files
- Maintains gorka metadata tracking
- Preserves non-gorka managed components

**Examples:**
```bash
# Sync everything
gorka update sync

# Sync only workspace
gorka update sync workspace

# Sync only global
gorka update sync global
```

### `gorka update remove`
Remove gorka-managed components.

**Syntax:**
```bash
gorka update remove <type> <name> [scope]
```

**Component Types:**
- `server`: MCP server
- `input`: MCP input configuration
- `chatmode`: Chatmode file
- `instruction`: Instruction file (workspace only)

**Scopes:**
- `global`: Remove from global configuration
- `workspace` or empty: Remove from workspace (default)

**Examples:**
```bash
# Remove a server from workspace
gorka update remove server memory

# Remove a chatmode from global
gorka update remove chatmode "Software Engineer - Gorka.chatmode.md" global

# Remove an instruction (workspace only)
gorka update remove instruction "OLD_INSTRUCTION.md"
```

**Safety features:**
- Only removes gorka-managed components
- Will not remove manually added components
- Provides clear error messages for non-existent components

### `gorka update clean-orphans`
Remove components tracked by gorka but no longer in repository.

**Syntax:**
```bash
gorka update clean-orphans [scope]
```

**Scopes:**
- `global`: Clean global orphans only
- `workspace`: Clean workspace orphans only
- `both` or empty: Clean both (default)

**What it does:**
- Compares gorka metadata with repository contents
- Removes tracked components not found in repository
- Cleans up associated files
- Updates metadata to reflect current state

**Examples:**
```bash
# Clean all orphans
gorka update clean-orphans

# Clean workspace orphans only
gorka update clean-orphans workspace
```

**Use cases:**
- After repository restructuring
- Component removal from upstream
- Cleanup after failed installations

## Maintenance Commands

### `gorka self-upgrade`
Upgrade the gorka binary itself to the latest version.

**Syntax:**
```bash
gorka self-upgrade
```

**Safety features:**
- **Backup creation**: Automatic timestamped backup
- **Validation testing**: New binary tested before installation
- **Atomic replacement**: Single operation to avoid partial states
- **Automatic rollback**: Restores backup on any failure
- **Permission handling**: Preserves executable permissions
- **Change detection**: Skips upgrade if already current

**Process:**
1. Downloads latest repository
2. Validates new binary functionality
3. Creates timestamped backup of current binary
4. Replaces binary atomically
5. Tests new installation
6. Removes backup on success, restores on failure

**Examples:**
```bash
# Upgrade to latest version
gorka self-upgrade
```

**Sample output:**
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

### `gorka clean`
Clear cached repository files.

**Syntax:**
```bash
gorka clean
```

**What it does:**
- Removes cached repository clone
- Forces fresh download on next operation
- Useful for troubleshooting repository issues

**Use cases:**
- Repository access problems
- Corrupted cache
- Testing with fresh repository state

## Utility Commands

### `gorka help`
Show help information.

**Syntax:**
```bash
gorka help
```

**Output:**
```
Usage: gorka <command> [options]

Commands:
  gorka install          - Install workspace MCP configuration + copy chatmodes/instructions to .github directory
  gorka install --global - Install global MCP configuration and chatmodes to VS Code user folder + workspace MCP if .vscode exists
  gorka update           - Manage installed components (run 'gorka update' for details)
  gorka self-upgrade     - Upgrade gorka binary to latest version
  gorka help             - Show this help message
  gorka clean            - Clean cached repository files
```

## Common Workflows

### Initial Setup
```bash
# Install gorka binary (via setup script)
curl -fsSL https://raw.githubusercontent.com/gork-labs/gorka/main/setup.sh | bash

# Install for current workspace
gorka install

# Or install globally
gorka install --global
```

### Regular Maintenance
```bash
# Weekly maintenance routine
gorka update list                # Check current state
gorka update list available      # See what's available
gorka update sync               # Update components
gorka update clean-orphans      # Clean up old items
gorka self-upgrade             # Keep gorka current
```

### Component Management
```bash
# Add new components (via sync)
gorka update sync

# Remove unwanted components
gorka update remove server old-server
gorka update remove chatmode "Old Agent.md"

# Clean up after repository changes
gorka update clean-orphans
```

### Troubleshooting
```bash
# Refresh repository cache
gorka clean

# Check what's actually installed
gorka update list

# Reset to repository state
gorka update sync
```

## File Locations

### Global Scope
- **macOS**:
  - MCP Config: `~/Library/Application Support/Code/User/mcp.json`
  - Gorka Metadata: `~/Library/Application Support/Code/User/gorka.json`
  - Chatmodes: `~/Library/Application Support/Code/User/chatmodes/`

- **Linux**:
  - MCP Config: `~/.config/Code/User/mcp.json`
  - Gorka Metadata: `~/.config/Code/User/gorka.json`
  - Chatmodes: `~/.config/Code/User/chatmodes/`

### Workspace Scope
- **MCP Config**: `.vscode/mcp.json`
- **Gorka Metadata**: `.vscode/gorka.json`
- **Chatmodes**: `.github/chatmodes/`
- **Instructions**: `.github/instructions/`
- **Memory**: `.vscode/memory.json`

### Cache
- **Repository Cache**: `~/.local/share/gorka/`

## Error Handling

### Common Error Messages

#### Permission Errors
```
[ERROR] No write permission to upgrade gorka binary at: /usr/local/bin/gorka
[ERROR] Try running with appropriate permissions or contact your system administrator
```
**Solution**: Run with `sudo` or install gorka in user-writable location

#### Component Not Found
```
[ERROR] Server 'nonexistent' is not managed by gorka or doesn't exist
```
**Solution**: Use `gorka update list` to see available components

#### Repository Access Issues
```
[ERROR] Failed to download latest repository
```
**Solutions**:
- Check internet connectivity
- Try `gorka clean` to refresh cache
- Verify GitHub access

#### Missing Configuration
```
No gorka metadata found for workspace scope
Run 'gorka update sync' to initialize.
```
**Solution**: Run `gorka update sync` to set up tracking

### Debugging Steps

1. **Check current state**:
   ```bash
   gorka update list
   ```

2. **Verify repository access**:
   ```bash
   gorka update list available
   ```

3. **Refresh cache if needed**:
   ```bash
   gorka clean
   gorka update sync
   ```

4. **Check file permissions**:
   - Verify write access to installation directories
   - Check VS Code settings directory permissions

5. **Reset to known state**:
   ```bash
   gorka clean
   gorka update sync
   ```

## Best Practices

### Installation
- Use global install for consistent experience across projects
- Workspace install for project-specific customization
- Always check installation with `gorka update list`

### Maintenance
- Run `gorka update sync` weekly to stay current
- Use `gorka update clean-orphans` monthly
- Keep gorka binary updated with `gorka self-upgrade`

### Component Management
- Check what's available before making changes
- Use specific removal rather than bulk operations
- Clean orphans after major repository updates

### Troubleshooting
- Start with `gorka update list` to understand current state
- Use `gorka clean` for repository-related issues
- Check file permissions for access errors
- Verify network connectivity for download issues

This reference provides comprehensive coverage of all gorka CLI capabilities for effective system management.
