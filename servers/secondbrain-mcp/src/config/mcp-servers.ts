import { readFileSync } from 'fs';
import { MCPServerConfig } from '../types/mcp-tools.js';
import { logger } from '../utils/logger.js';

/*
Expected mcp.json file structure:
{
  "servers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "enabled": true,
      "allowUnsafeTools": false,
      "context": "subagent"
    },
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "enabled": true,
      "allowUnsafeTools": false,
      "context": "both"
    }
  }
}
*/// Safety filter patterns for tool names
export const UNSAFE_TOOL_PATTERNS = [
  // File system operations
  /create.*file/i,
  /write.*file/i,
  /delete.*file/i,
  /remove.*file/i,
  /move.*file/i,
  /copy.*file/i,
  /rename.*file/i,

  // Directory operations
  /create.*dir/i,
  /mkdir/i,
  /rmdir/i,
  /delete.*dir/i,
  /remove.*dir/i,

  // Git operations
  /git.*commit/i,
  /git.*push/i,
  /git.*merge/i,
  /git.*rebase/i,
  /git.*reset/i,
  /git.*checkout/i,
  /git.*branch/i,
  /git.*tag/i,

  // Database operations
  /insert/i,
  /update/i,
  /delete/i,
  /drop/i,
  /create.*table/i,
  /alter.*table/i,

  // System operations
  /execute/i,
  /run.*command/i,
  /shell/i,
  /system/i,
  /process/i,

  // Network operations
  /upload/i,
  /download/i,
  /post/i,
  /put/i,
  /patch/i,
  /delete.*request/i,

  // Memory operations (some)
  /delete.*memory/i,
  /clear.*memory/i,
  /reset.*memory/i,
];

// Safe tool patterns (these are explicitly allowed even if they might match unsafe patterns)
export const SAFE_TOOL_PATTERNS = [
  /read/i,
  /list/i,
  /search/i,
  /get/i,
  /show/i,
  /view/i,
  /analyze/i,
  /validate/i,
  /check/i,
  /inspect/i,
  /browse/i,
  /query/i,
  /fetch/i,
  /status/i,
  /info/i,
  /log/i,
  /diff/i,
  /history/i,
];

export function isToolSafe(toolName: string, allowUnsafeTools: boolean = false): boolean {
  // Unsafe tools are always disallowed for security
  // (ignoring allowUnsafeTools parameter per user requirement)

  // First check if it's explicitly safe
  if (SAFE_TOOL_PATTERNS.some(pattern => pattern.test(toolName))) {
    return true;
  }

  // Then check if it matches any unsafe patterns
  if (UNSAFE_TOOL_PATTERNS.some(pattern => pattern.test(toolName))) {
    return false;
  }

  // Default to safe for unknown patterns (conservative approach)
  return true;
}

export function getMCPServerConfig(context: 'main' | 'subagent' = 'main'): MCPServerConfig[] {
  // Read MCP server configuration from JSON file specified by environment variable
  const configPath = process.env.SECONDBRAIN_MCP_CONFIG_PATH;

  if (!configPath) {
    logger.warn('SECONDBRAIN_MCP_CONFIG_PATH environment variable not set. No MCP servers will be loaded.');
    return [];
  }

  // Substitute workspace folder variable if present
  let resolvedConfigPath = configPath;
  if (configPath.includes('${workspaceFolder}') && process.env.SECONDBRAIN_WORKSPACE_FOLDER) {
    resolvedConfigPath = configPath.replace('${workspaceFolder}', process.env.SECONDBRAIN_WORKSPACE_FOLDER);
  }

  try {
    const configContent = readFileSync(resolvedConfigPath, 'utf-8');
    const parsed = JSON.parse(configContent);

    // Handle both VS Code format and our custom format
    let serversMap: any;

    if (parsed.mcpServers) {
      // VS Code format: { "mcpServers": { "serverId": config } }
      serversMap = parsed.mcpServers;
    } else if (parsed.servers) {
      // Our format: { "servers": { "serverId": config } }
      serversMap = parsed.servers;
    } else {
      logger.error('Invalid MCP configuration format - missing servers field', {
        configPath: resolvedConfigPath,
        expectedFields: ['servers', 'mcpServers']
      });
      return [];
    }

    if (!serversMap || typeof serversMap !== 'object') {
      logger.error('Invalid MCP configuration format - servers must be object', {
        configPath: resolvedConfigPath,
        actualType: typeof serversMap
      });
      return [];
    }

    // Convert servers map to array with id field
    const allServers: MCPServerConfig[] = Object.entries(serversMap).map(([id, config]: [string, any]) => ({
      id,
      name: config.name || id,
      type: config.type || 'stdio',
      command: config.command,
      args: config.args || [],
      enabled: config.enabled !== false, // Default to true
      allowUnsafeTools: config.allowUnsafeTools || false,
      context: config.context || 'both',
      env: config.env || {},
      ...config
    }));

    // Filter out the secondbrain server itself to prevent recursion
    const filteredServers = allServers.filter((server: MCPServerConfig) =>
      server.enabled &&
      server.id !== 'secondbrain' &&
      !server.name?.includes('secondbrain') &&
      (!server.context || server.context === context || server.context === 'both')
    );

    // Auto-add filesystem MCP server for subagent context if not already configured
    if (context === 'subagent') {
      const hasFilesystemServer = filteredServers.some(server =>
        server.id === 'filesystem' ||
        server.name === 'filesystem' ||
        server.command?.includes('server-filesystem')
      );

      if (!hasFilesystemServer) {
        // Get workspace folder and other allowed directories from environment
        const workspaceFolder = process.env.SECONDBRAIN_WORKSPACE_FOLDER;
        const additionalDirs = process.env.SECONDBRAIN_ALLOWED_DIRECTORIES?.split(':').filter(Boolean) || [];

        const filesystemArgs = ['-y', '@modelcontextprotocol/server-filesystem'];
        const allowedDirectories: string[] = [];

        // Add workspace folder as primary allowed directory
        if (workspaceFolder) {
          filesystemArgs.push(workspaceFolder);
          allowedDirectories.push(workspaceFolder);
        }

        // Add additional directories if configured
        for (const dir of additionalDirs) {
          const trimmedDir = dir.trim();
          if (trimmedDir && !allowedDirectories.includes(trimmedDir)) {
            filesystemArgs.push(trimmedDir);
            allowedDirectories.push(trimmedDir);
          }
        }

        if (allowedDirectories.length > 0) {
          logger.info('Configuring filesystem server with allowed directories', {
            allowedDirectories
          });
        } else {
          logger.warn('No allowed directories configured - filesystem server will have limited access', {
            workspaceFolder,
            additionalDirs
          });
        }

        const filesystemServer: MCPServerConfig = {
          id: 'filesystem',
          name: 'filesystem',
          command: 'npx',
          args: filesystemArgs,
          enabled: true,
          allowUnsafeTools: false,
          context: 'subagent',
          env: {}
        };

        filteredServers.push(filesystemServer);
        logger.info('Auto-added filesystem MCP server for subagent context', {
          allowedDirectories
        });
      }
    }

    logger.info(`Loaded ${filteredServers.length} MCP servers for context '${context}' from ${resolvedConfigPath}`);
    return filteredServers;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      logger.error('MCP configuration file not found', {
        configPath: resolvedConfigPath
      });
    } else {
      logger.error('Error reading MCP configuration', {
        configPath: resolvedConfigPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return [];
  }
}
