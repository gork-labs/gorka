---
title: "Gorka Update Command Reference"
author: "@bohdan-shulha"
date: "2025-07-24"
last_updated: "2025-07-24T18:01:15+02:00"
timezone: "Europe/Warsaw"
status: "approved"
version: "2.5.2"
reviewers: []
tags: ["cli", "gorka", "mcp", "management"]
document_type: "guide"
---

# Gorka Update Command Reference
*Last updated: 2025-07-24T18:01:15+02:00 (Europe/Warsaw)*
*Version: 2.5.2*
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
| 2.5.0 | 2025-07-24 | 17:49:05 | @bohdan-shulha | Approved | Removed global option support, fixed corrupted frontmatter |
| 2.5.1 | 2025-07-24 | 17:54:05 | @bohdan-shulha | Approved | Fixed malformed frontmatter with embedded syntax |
| 2.5.2 | 2025-07-24 | 18:01:15 | @bohdan-shulha | Approved | Repaired frontmatter corruption completely |

## Overview

The `gorka update` command provides comprehensive management of MCP servers, chatmodes, and instructions installed by the Gorka agent system. It allows you to list, sync, add, remove, and clean up components in your workspace.

## Command Structure

```bash
gorka update <command> [options]
```

## Available Commands

### `gorka update list`

Shows the status of installed components.

**Syntax:**
```bash
gorka update list [available]
```

**Options:**
- Default - Show workspace components (current project)
- `available` - Show components available from repository

**Examples:**
```bash
# Show installed components
gorka update list

# Show available components from repository
gorka update list available
```

### `gorka update sync`

Synchronizes with the latest repository, adding new components and updating existing ones.

**Syntax:**
```bash
gorka update sync
```

**Examples:**
```bash
# Sync workspace components
gorka update sync
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
- `instruction` - Instruction file

**Examples:**
```bash
# Remove a server from workspace
gorka update remove server memory

# Remove a chatmode
gorka update remove chatmode "Software Engineer - Gorka.chatmode.md"

# Remove an instruction
gorka update remove instruction "DATETIME_HANDLING_GORKA.instructions.md"
```

### `gorka update clean-orphans`

Removes components that are tracked by gorka but no longer exist in the repository.

**Syntax:**
```bash
gorka update clean-orphans
```

**Examples:**
```bash
# Clean orphaned components
gorka update clean-orphans
```

## Component Types

### MCP Servers
- **Location**: `mcp.json` files (configuration only)
- **Tracking**: `gorka.json` files, `"servers"` array
- **Scope**: Workspace
- **Examples**: `memory`, `git`, `time`, `context7`

### MCP Inputs
- **Location**: `mcp.json` files (configuration only)
- **Tracking**: `gorka.json` files, `"inputs"` array
- **Scope**: Workspace
- **Examples**: Input configurations for MCP servers

### Chatmodes
- **Location**: `.github/chatmodes/`
- **Tracking**: `gorka.json` files, `"chatmodes"` array
- **Scope**: Workspace
- **Examples**: `Software Engineer - Gorka.chatmode.md`

### Instructions
- **Location**: `.github/instructions/`
- **Tracking**: `gorka.json` files, `"instructions"` array
- **Scope**: Workspace
- **Examples**: `DATETIME_HANDLING_GORKA.instructions.md`

## Gorka Metadata Tracking

The update system uses metadata stored in separate `gorka.json` files to track gorka-managed components:

### Metadata File Locations
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

### Missing Configuration
```bash
$ gorka update list
No gorka metadata found for workspace scope
Run 'gorka update sync' to initialize.
```

## Integration with Existing Commands

The update system is fully backward compatible with existing `gorka install` commands:

- `gorka install` - Enhanced with metadata tracking
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
gorka update remove server old-server
gorka update remove chatmode "Old Chatmode.md"
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

2. **JSON Parsing Errors**
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
gorka update remove server old-memory
gorka update remove chatmode "Old Engineer - Gorka.chatmode.md"

# Sync workspace
gorka update sync

# Check for orphaned components
gorka update clean-orphans
```

This update system provides comprehensive management capabilities while maintaining the safety and reliability of the gorka agent system.
