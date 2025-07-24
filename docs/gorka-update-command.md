---
title: "Gorka Update Command Reference"
author: "@bohdan-shulha"
date: "2025-07-24"
last_updated: "2025-07-24T15:50:26+02:00"
timezone: "Europe/Warsaw"
status: "approved"
version: "2.4.0"
reviewers: []
tags: ["cli", "gorka", "mcp", "management"]
document_type: "guide"
---

# Gorka Update Command Reference
*Last updated: 2025-07-24T15:50:26+02:00 (Europe/Warsaw)*
*Version: 2.4.0*
*Status: APPROVED*

## Document History
| Version | Date | Time | Author | Status | Changes |
|---------|------|------|--------|--------|---------|
| 1.0.0 | 2025-07-24 | 15:16:46 | @bohdan-shulha | Approved | Initial implementation |
| 2.0.0 | 2025-07-24 | 15:25:26 | @bohdan-shulha | Approved | Refactored to separate gorka.json metadata files |
| 2.1.0 | 2025-07-24 | 15:32:17 | @bohdan-shulha | Approved | Removed legacy mcp.json metadata support |
| 2.2.0 | 2025-07-24 | 15:36:37 | @bohdan-shulha | Approved | Added self-upgrade as top-level command |
| 2.3.0 | 2025-07-24 | 15:46:56 | @bohdan-shulha | Approved | Moved self-upgrade docs to separate file |
| 2.4.0 | 2025-07-24 | 15:50:26 | @bohdan-shulha | Approved | Removed all self-upgrade references |

## Overview

The `gorka update` command provides comprehensive management of MCP servers, chatmodes, and instructions installed by the Gorka agent system. It allows you to list, sync, add, remove, and clean up components in both global and workspace scopes.

## Command Structure

```bash
gorka update <command> [options]
```

## Available Commands

### `gorka update list`

Shows the status of installed components.

**Syntax:**
```bash
gorka update list [global|workspace|available|both]
```

**Options:**
- `global` - Show global components (VS Code user directory)
- `workspace` - Show workspace components (current project)
- `available` - Show components available from repository
- `both` or empty - Show both global and workspace components

**Examples:**
```bash
# Show all installed components
gorka update list

# Show only workspace components
gorka update list workspace

# Show available components from repository
gorka update list available
```

### `gorka update sync`

Synchronizes with the latest repository, adding new components and updating existing ones.

**Syntax:**
```bash
gorka update sync [global|workspace|both]
```

**Options:**
- `global` - Sync global configuration only
- `workspace` - Sync workspace configuration only
- `both` or empty - Sync both global and workspace

**Examples:**
```bash
# Sync both global and workspace
gorka update sync

# Sync only workspace
gorka update sync workspace
```

### `gorka update remove`

Removes gorka-managed components.

**Syntax:**
```bash
gorka update remove <type> <name> [global|workspace]
```

**Component Types:**
- `server` - MCP server
- `input` - MCP input
- `chatmode` - Chatmode file
- `instruction` - Instruction file (workspace only)

**Scope:**
- `global` - Remove from global configuration
- `workspace` or empty - Remove from workspace configuration

**Examples:**
```bash
# Remove a server from workspace
gorka update remove server memory

# Remove a chatmode from global configuration
gorka update remove chatmode "Software Engineer - Gorka.chatmode.md" global

# Remove an instruction from workspace
gorka update remove instruction "DATETIME_HANDLING_GORKA.instructions.md"
```

### `gorka update clean-orphans`

Removes components that are tracked by gorka but no longer exist in the repository.

**Syntax:**
```bash
gorka update clean-orphans [global|workspace|both]
```

**Options:**
- `global` - Clean global orphans only
- `workspace` - Clean workspace orphans only
- `both` or empty - Clean both global and workspace orphans

**Examples:**
```bash
# Clean orphans from both scopes
gorka update clean-orphans

# Clean workspace orphans only
gorka update clean-orphans workspace
```

## Component Types

### MCP Servers
- **Location**: `mcp.json` files (configuration only)
- **Tracking**: `gorka.json` files, `"servers"` array
- **Scopes**: Global and workspace
- **Examples**: `memory`, `git`, `time`, `context7`

### MCP Inputs
- **Location**: `mcp.json` files (configuration only)
- **Tracking**: `gorka.json` files, `"inputs"` array
- **Scopes**: Global and workspace
- **Examples**: Input configurations for MCP servers

### Chatmodes
- **Location**:
  - Global: `~/Library/Application Support/Code/User/chatmodes/` (macOS)
  - Workspace: `.github/chatmodes/`
- **Tracking**: `gorka.json` files, `"chatmodes"` array
- **Scopes**: Global and workspace
- **Examples**: `Software Engineer - Gorka.chatmode.md`

### Instructions
- **Location**: `.github/instructions/`
- **Tracking**: `gorka.json` files, `"instructions"` array
- **Scopes**: Workspace only
- **Examples**: `DATETIME_HANDLING_GORKA.instructions.md`

## Gorka Metadata Tracking

The update system uses metadata stored in separate `gorka.json` files to track gorka-managed components:

### Metadata File Locations
- **Global**: `~/Library/Application Support/Code/User/gorka.json` (macOS)
- **Workspace**: `.vscode/gorka.json`

### Metadata Structure
```json
{
  "servers": ["server1", "server2"],
  "inputs": ["input1"],
  "chatmodes": ["chatmode1.md", "chatmode2.md"],
  "instructions": ["instruction1.md", "instruction2.md"]
}
```

### Key Benefits:
- **Clean Separation**: No metadata embedded in MCP configuration files
- **Conflict Prevention**: Prevents overwriting non-gorka managed components
- **Safe Removal**: Only removes components explicitly managed by gorka
- **Orphan Detection**: Identifies components that no longer exist in repository
- **Third-party Compatibility**: Avoids conflicts with other MCP tooling

## File Locations

### Global Scope
- **MCP Config**: `~/Library/Application Support/Code/User/mcp.json` (macOS)
- **Gorka Metadata**: `~/Library/Application Support/Code/User/gorka.json` (macOS)
- **Chatmodes**: `~/Library/Application Support/Code/User/chatmodes/`
- **Instructions**: Not applicable for global scope

### Workspace Scope
- **MCP Config**: `.vscode/mcp.json`
- **Gorka Metadata**: `.vscode/gorka.json`
- **Chatmodes**: `.github/chatmodes/`
- **Instructions**: `.github/instructions/`

## Error Handling

### Component Not Found
```bash
$ gorka update remove server nonexistent
[ERROR] Server 'nonexistent' is not managed by gorka or doesn't exist
```

### Scope Conflicts
```bash
$ gorka update remove instruction test.md global
[ERROR] Instructions are not available in global scope
```

### Missing Configuration
```bash
$ gorka update list workspace
No gorka metadata found for workspace scope
Run 'gorka update sync' to initialize.
```

## Integration with Existing Commands

The update system is fully backward compatible with existing `gorka install` commands:

- `gorka install` - Still works as before, now with enhanced metadata tracking
- `gorka install --global` - Enhanced with metadata tracking
- `gorka clean` - Unchanged

## Advanced Usage

### Batch Operations
```bash
# Sync everything to latest
gorka update sync

# Check what would be cleaned
gorka update list
gorka update clean-orphans

# Remove multiple components
gorka update remove server old-server workspace
gorka update remove chatmode "Old Chatmode.md" workspace
```

### Maintenance Workflow
```bash
# Regular maintenance routine
gorka update list available          # See what's new
gorka update sync                    # Update to latest
gorka update clean-orphans           # Clean up old items
gorka update list                    # Verify final state
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure you have write access to VS Code user directory
   - Run with appropriate permissions if needed

3. **JSON Parsing Errors**
   - Check if MCP JSON files are valid
   - Use `jq` to validate: `jq . .vscode/mcp.json`
   - Verify gorka.json syntax: `jq . .vscode/gorka.json`

3. **Missing Files**
   - Verify repository access
   - Check if `ensure_files_available()` is working
   - Try `gorka clean` to refresh cache

### Debug Information
The update system provides detailed logging:
- `[INFO]` - General information
- `[SUCCESS]` - Successful operations
- `[WARNING]` - Non-critical issues
- `[ERROR]` - Critical failures
- `[STEP]` - Major operation steps

## Examples

### Complete Update Workflow
```bash
# Check current status
gorka update list

# See what's available
gorka update list available

# Sync with repository
gorka update sync

# Clean up old components
gorka update clean-orphans

# Verify final state
gorka update list
```

### Selective Management
```bash
# Remove specific outdated components
gorka update remove server old-memory workspace
gorka update remove chatmode "Old Engineer - Gorka.chatmode.md" global

# Sync only workspace
gorka update sync workspace

# Check for workspace orphans
gorka update clean-orphans workspace
```

This update system provides comprehensive management capabilities while maintaining the safety and reliability of the gorka agent system.
