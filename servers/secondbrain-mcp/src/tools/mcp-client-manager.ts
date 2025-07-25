import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../utils/logger.js';
import {
  MCPServerConfig,
  DiscoveredTool,
  ToolExecutionResult,
  MCPServerStatus
} from '../types/mcp-tools.js';
import { getMCPServerConfig, isToolSafe } from '../config/mcp-servers.js';

interface MCPConnection {
  client: Client;
  transport: StdioClientTransport;
  config: MCPServerConfig;
  connected: boolean;
  tools: DiscoveredTool[];
  lastError?: string;
  lastConnected?: Date;
}

export class MCPClientManager {
  private connections: Map<string, MCPConnection> = new Map();
  private discoveredTools: Map<string, DiscoveredTool> = new Map();
  private initialized: boolean = false;
  private context: 'main' | 'subagent';

  constructor(context: 'main' | 'subagent' = 'main') {
    this.context = context;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing MCP Client Manager', {
      context: this.context
    });

    const serverConfigs = getMCPServerConfig(this.context);
    const enabledServers = serverConfigs.filter(config => config.enabled);

    logger.info('Connecting to MCP servers', {
      totalServers: serverConfigs.length,
      enabledServers: enabledServers.length,
      serverIds: enabledServers.map(s => s.id)
    });

    // Connect to servers in parallel
    const connectionPromises = enabledServers.map(config =>
      this.connectToServer(config).catch(error => {
        logger.error('Failed to connect to MCP server', {
          serverId: config.id,
          serverName: config.name,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      })
    );

    const connections = await Promise.all(connectionPromises);
    const successfulConnections = connections.filter(Boolean);

    logger.info('MCP server connections completed', {
      attempted: enabledServers.length,
      successful: successfulConnections.length,
      failed: enabledServers.length - successfulConnections.length
    });

    // Discover tools from all connected servers
    await this.discoverAllTools();

    this.initialized = true;

    logger.info('MCP Client Manager initialized', {
      connectedServers: this.connections.size,
      totalTools: this.discoveredTools.size,
      safeTools: Array.from(this.discoveredTools.values()).filter(t => t.safe).length
    });
  }

  /**
   * Process placeholder variables in server configuration
   * Replaces ${workspaceFolder} and other placeholders with actual values
   */
  private processServerConfigPlaceholders(config: MCPServerConfig): MCPServerConfig {
    const workspaceFolder = process.env.SECONDBRAIN_WORKSPACE_FOLDER;

    // Create a copy of the config to avoid modifying the original
    const processedConfig: MCPServerConfig = JSON.parse(JSON.stringify(config));

    // Process args array
    if (processedConfig.args) {
      processedConfig.args = processedConfig.args.map(arg => {
        if (typeof arg === 'string' && arg.includes('${workspaceFolder}') && workspaceFolder) {
          return arg.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
        }
        return arg;
      });
    }

    // Process environment variables
    if (processedConfig.env) {
      const processedEnv: Record<string, string> = {};

      for (const [key, value] of Object.entries(processedConfig.env)) {
        if (typeof value === 'string' && value.includes('${workspaceFolder}') && workspaceFolder) {
          processedEnv[key] = value.replace(/\$\{workspaceFolder\}/g, workspaceFolder);
        } else {
          processedEnv[key] = value;
        }
      }

      processedConfig.env = processedEnv;
    }

    // Log placeholder replacements for debugging
    if (workspaceFolder) {
      logger.info('Applied workspaceFolder placeholder replacement', {
        serverId: config.id,
        workspaceFolder,
        originalEnv: config.env,
        processedEnv: processedConfig.env
      });
    } else {
      logger.warn('SECONDBRAIN_WORKSPACE_FOLDER not set - placeholder replacement skipped', {
        serverId: config.id
      });
    }

    return processedConfig;
  }

  private async connectToServer(config: MCPServerConfig): Promise<MCPConnection | null> {
    // Process placeholders in server configuration
    const processedConfig = this.processServerConfigPlaceholders(config);

    logger.info('Connecting to MCP server', {
      serverId: processedConfig.id,
      serverName: processedConfig.name,
      command: processedConfig.command,
      args: processedConfig.args,
      env: processedConfig.env
    });

    try {
      const client = new Client(
        {
          name: 'secondbrain-mcp',
          version: '0.8.1',
        },
        {
          capabilities: {},
        }
      );

      const transport = new StdioClientTransport({
        command: processedConfig.command,
        args: processedConfig.args,
        env: processedConfig.env,
      });

      await client.connect(transport);

      const connection: MCPConnection = {
        client,
        transport,
        config: processedConfig,
        connected: true,
        tools: [],
        lastConnected: new Date(),
      };

      this.connections.set(processedConfig.id, connection);

      logger.info('Successfully connected to MCP server', {
        serverId: processedConfig.id,
        serverName: processedConfig.name
      });

      return connection;

    } catch (error) {
      logger.error('Failed to connect to MCP server', {
        serverId: processedConfig.id,
        serverName: processedConfig.name,
        error: error instanceof Error ? error.message : String(error)
      });

      // Store failed connection for status reporting
      const failedConnection: MCPConnection = {
        client: null as any,
        transport: null as any,
        config: processedConfig,
        connected: false,
        tools: [],
        lastError: error instanceof Error ? error.message : String(error),
      };

      this.connections.set(processedConfig.id, failedConnection);

      return null;
    }
  }

  private async discoverAllTools(): Promise<void> {
    logger.info('Discovering tools from connected MCP servers');

    const discoveryPromises = Array.from(this.connections.values())
      .filter(conn => conn.connected)
      .map(connection => this.discoverToolsFromServer(connection));

    await Promise.all(discoveryPromises);

    logger.info('Tool discovery completed', {
      totalTools: this.discoveredTools.size,
      safeTools: Array.from(this.discoveredTools.values()).filter(t => t.safe).length,
      unsafeTools: Array.from(this.discoveredTools.values()).filter(t => !t.safe).length
    });
  }

  private async discoverToolsFromServer(connection: MCPConnection): Promise<void> {
    const { client, config } = connection;

    try {
      logger.info('Discovering tools from server', {
        serverId: config.id,
        serverName: config.name
      });

      // Use the dedicated listTools method instead of generic request
      const response = await client.listTools();

      const tools: DiscoveredTool[] = response.tools.map((tool: any) => {
        const safe = isToolSafe(tool.name, config.allowUnsafeTools);

        return {
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema,
          serverId: config.id,
          serverName: config.name,
          safe,
          originalTool: tool,
        };
      });

      connection.tools = tools;

      // Add tools to global discovered tools map
      for (const tool of tools) {
        // Handle name conflicts by prefixing with server ID
        const toolKey = this.discoveredTools.has(tool.name)
          ? `${config.id}:${tool.name}`
          : tool.name;

        this.discoveredTools.set(toolKey, tool);
      }

      const safeToolCount = tools.filter(t => t.safe).length;
      const unsafeToolCount = tools.length - safeToolCount;

      logger.info('Tools discovered from server', {
        serverId: config.id,
        serverName: config.name,
        totalTools: tools.length,
        safeTools: safeToolCount,
        unsafeTools: unsafeToolCount,
        toolNames: tools.map(t => `${t.name}${t.safe ? '' : ' (unsafe)'}`)
      });

    } catch (error) {
      logger.error('Failed to discover tools from server', {
        serverId: config.id,
        serverName: config.name,
        error: error instanceof Error ? error.message : String(error)
      });

      connection.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  async callTool(toolName: string, args: any): Promise<ToolExecutionResult> {
    if (!this.initialized) {
      throw new Error('MCP Client Manager not initialized');
    }

    const tool = this.discoveredTools.get(toolName);
    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Tool not found: ${toolName}`
      );
    }

    if (!tool.safe) {
      logger.warn('Attempt to call unsafe tool blocked', {
        toolName,
        serverId: tool.serverId,
        args
      });

      throw new McpError(
        ErrorCode.InvalidRequest,
        `Tool ${toolName} is marked as unsafe and cannot be executed`
      );
    }

    const connection = this.connections.get(tool.serverId);
    if (!connection || !connection.connected) {
      throw new McpError(
        ErrorCode.InternalError,
        `MCP server ${tool.serverId} is not connected`
      );
    }

    try {
      logger.info('Executing tool via MCP server', {
        toolName,
        serverId: tool.serverId,
        serverName: tool.serverName,
        args
      });

      // Use the dedicated callTool method instead of generic request
      const response = await connection.client.callTool({
        name: tool.name,
        arguments: args,
      });

      logger.info('Tool execution completed', {
        toolName,
        serverId: tool.serverId,
        success: true
      });

      return {
        success: true,
        content: response.content,
        serverId: tool.serverId,
        toolName,
      };

    } catch (error) {
      logger.error('Tool execution failed', {
        toolName,
        serverId: tool.serverId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        serverId: tool.serverId,
        toolName,
      };
    }
  }

  getDiscoveredTools(): DiscoveredTool[] {
    return Array.from(this.discoveredTools.values());
  }

  getSafeTools(): DiscoveredTool[] {
    return Array.from(this.discoveredTools.values()).filter(tool => tool.safe);
  }

  getServerStatus(): MCPServerStatus[] {
    return Array.from(this.connections.values()).map(connection => ({
      id: connection.config.id,
      name: connection.config.name,
      connected: connection.connected,
      toolCount: connection.tools.length,
      safeToolCount: connection.tools.filter(t => t.safe).length,
      lastError: connection.lastError,
      lastConnected: connection.lastConnected,
    }));
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up MCP connections');

    const cleanupPromises = Array.from(this.connections.values())
      .filter(conn => conn.connected)
      .map(async connection => {
        try {
          await connection.client.close();
          logger.info('Closed MCP connection', {
            serverId: connection.config.id,
            serverName: connection.config.name
          });
        } catch (error) {
          logger.error('Error closing MCP connection', {
            serverId: connection.config.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

    await Promise.all(cleanupPromises);

    this.connections.clear();
    this.discoveredTools.clear();
    this.initialized = false;

    logger.info('MCP Client Manager cleanup completed');
  }
}
