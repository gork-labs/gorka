# Components Command Implementation

## Overview

The `secondbrain-cli components install` command sets up a Gorka workspace by:
1. Extracting chatmodes from embedded resources to `.github/chatmodes/`
2. Creating a `gorka.json` configuration file in `.vscode/`
3. Registering MCP servers in `.vscode/mcp.json` with proper VS Code schema

## Implementation Details

### Command Structure
```
secondbrain-cli components install
```

### Installation Workflow

#### Step 1: Extract Chatmodes
- Source: Embedded chatmodes from `internal/embedded/embedded-resources/chatmodes/`
- Target: `.github/chatmodes/`
- Files to extract:
  - Database Architect - Gorka.chatmode.md
  - Design Reviewer - Gorka.chatmode.md
  - DevOps Engineer - Gorka.chatmode.md
  - Memory Curator - Gorka.chatmode.md
  - Project Orchestrator - Gorka.chatmode.md
  - Prompt Writer - Gorka.chatmode.md
  - Security Engineer - Gorka.chatmode.md
  - Software Architect - Gorka.chatmode.md
  - Software Engineer - Gorka.chatmode.md
  - Technical Writer - Gorka.chatmode.md
  - Test Engineer - Gorka.chatmode.md

#### Step 2: Create gorka.json
Target: `.vscode/gorka.json`

Content:
```json
{
  "servers": [
    "context7",
    "deepwiki", 
    "git",
    "secondbrain"
  ],
  "inputs": [
    "openrouter-api-key",
    "secondbrain-model"
  ],
  "chatmodes": [
    "Database Architect - Gorka.chatmode.md",
    "Design Reviewer - Gorka.chatmode.md",
    "DevOps Engineer - Gorka.chatmode.md", 
    "Memory Curator - Gorka.chatmode.md",
    "Project Orchestrator - Gorka.chatmode.md",
    "Prompt Writer - Gorka.chatmode.md",
    "Security Engineer - Gorka.chatmode.md",
    "Software Architect - Gorka.chatmode.md",
    "Software Engineer - Gorka.chatmode.md",
    "Technical Writer - Gorka.chatmode.md",
    "Test Engineer - Gorka.chatmode.md"
  ],
  "instructions": [
    "DATETIME_HANDLING_GORKA.instructions.md",
    "DOCUMENTATION_STANDARDS_GORKA.instructions.md",
    "FILE_EDITING_BEST_PRACTICES_GORKA.instructions.md", 
    "MEMORY_USAGE_GUIDELINES_GORKA.instructions.md",
    "THINKING_PROCESS_GORKA.instructions.md",
    "TOOLS_FIRST_GUIDELINES_GORKA.instructions.md"
  ]
}
```

#### Step 3: Register MCP Servers
Target: `.vscode/mcp.json`

**Important**: VS Code uses `"servers"` as the root key, not `"mcpServers"`

Content:
```json
{
  "servers": {
    "context7": {
      "command": "uvx",
      "args": ["mcp-server-context7"]
    },
    "deepwiki": {
      "command": "npx", 
      "args": ["-y", "@deepwiki/mcp-server"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "${workspaceFolder}"]
    },
    "secondbrain": {
      "command": "secondbrain-mcp",
      "args": [],
      "env": {
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
        "SECONDBRAIN_MODEL": "anthropic/claude-3.5-sonnet",
        "SECONDBRAIN_WORKSPACE": "${workspaceFolder}",
        "SECONDBRAIN_MAX_PARALLEL_AGENTS": "3"
      }
    }
  }
}
```

### Key Environment Variables
- `OPENROUTER_API_KEY`: Required for OpenRouter API access (placeholder value)
- `SECONDBRAIN_MODEL`: Default to `anthropic/claude-3.5-sonnet`
- `SECONDBRAIN_WORKSPACE`: Use `${workspaceFolder}` placeholder
- `SECONDBRAIN_MAX_PARALLEL_AGENTS`: Default to `3`

### Implementation Notes

1. **No Instructions Copying**: The command does NOT copy instruction files from `.github/instructions/`. These remain in the Gorka repository.

2. **VS Code Schema Compliance**: Uses `"servers"` as root key in mcp.json, not `"mcpServers"`.

3. **Merge Strategy**: If mcp.json exists, merge with existing servers. Preserve non-Gorka servers.

4. **Placeholder Values**: Keep placeholder values for environment variables that users need to configure.

5. **Directory Creation**: Automatically create `.vscode/` and `.github/chatmodes/` directories if they don't exist.

### Error Handling
- Validate workspace directory exists and is writable
- Handle JSON parsing errors for existing mcp.json
- Provide clear error messages for permission issues
- Rollback changes on failure

### Success Output
```
Gorka components installed successfully!
- Chatmodes extracted to .github/chatmodes/
- VS Code configuration updated
- MCP servers registered
```
