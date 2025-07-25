import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { VSCodeToolProxy, VSCodeToolResult } from './vscode-tool-proxy.js';

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  content: string;
  isError: boolean;
}

export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  type: string;
}

export interface McpConnection {
  process: ChildProcess;
  requestId: number;
  pendingRequests: Map<number, { resolve: Function; reject: Function }>;
}

/**
 * Simplified Tool Proxy - Routes tool calls to appropriate MCP servers
 * Uses simple heuristics and lets MCP servers handle validation
 */
export class ToolProxy {
  private static instance: ToolProxy;
  private mcpConnections: Map<string, McpConnection> = new Map();
  private serverConfigs: Map<string, McpServerConfig> = new Map();
  private successfulRoutes: Map<string, string> = new Map(); // Cache successful tool→server mappings
  private vsCodeToolProxy: VSCodeToolProxy;

  private constructor() {
    this.initializeFromConfig();
    this.vsCodeToolProxy = VSCodeToolProxy.getInstance();
  }

  static getInstance(): ToolProxy {
    if (!ToolProxy.instance) {
      ToolProxy.instance = new ToolProxy();
    }
    return ToolProxy.instance;
  }

  private initializeFromConfig(): void {
    try {
      // Read MCP configuration from the specified path
      const mcpConfigContent = fs.readFileSync(config.mcpConfigPath, 'utf-8');
      const mcpConfig = JSON.parse(mcpConfigContent);

      // Extract server configurations
      if (mcpConfig.servers) {
        for (const [serverName, serverConfig] of Object.entries(mcpConfig.servers as Record<string, any>)) {
          if (serverConfig.type === 'stdio') {
            this.serverConfigs.set(serverName, {
              command: serverConfig.command,
              args: serverConfig.args || [],
              env: serverConfig.env || {},
              type: serverConfig.type
            });
          }
        }
      }

      logger.info('Initialized MCP tool proxy', {
        serversConfigured: this.serverConfigs.size,
        configPath: config.mcpConfigPath
      });

    } catch (error) {
      logger.error('Failed to initialize MCP tool proxy from config', {
        configPath: config.mcpConfigPath,
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to basic configuration
      this.initializeFallbackConfig();
    }
  }

  private initializeFallbackConfig(): void {
    // Basic fallback configuration for essential tools
    this.serverConfigs.set('memory', {
      command: 'npx',
      args: ['-y', '@gorka/memory-mcp'],
      type: 'stdio'
    });

    this.serverConfigs.set('time', {
      command: 'npx',
      args: ['-y', '@gorka/time-mcp'],
      type: 'stdio'
    });

    logger.info('Initialized fallback MCP configuration');
  }

  /**
   * Simple heuristic to guess which server might have a tool
   */
  private guessServerForTool(toolName: string): string[] {
    // Check cache first
    const cachedServer = this.successfulRoutes.get(toolName);
    if (cachedServer && this.serverConfigs.has(cachedServer)) {
      return [cachedServer];
    }

    const servers: string[] = [];

    // Git tools
    if (toolName.startsWith('git_') || toolName.includes('git')) {
      if (this.serverConfigs.has('git')) servers.push('git');
    }

    // Memory/knowledge graph tools
    if (['create_entities', 'search_nodes', 'add_observations', 'create_relations',
         'delete_entities', 'read_graph', 'open_nodes', 'delete_observations',
         'delete_relations'].includes(toolName)) {
      if (this.serverConfigs.has('memory')) servers.push('memory');
    }

    // Time tools
    if (toolName === 'get_current_time' || toolName.includes('time')) {
      if (this.serverConfigs.has('time')) servers.push('time');
    }

    // If no specific match, try all servers
    if (servers.length === 0) {
      servers.push(...this.serverConfigs.keys());
    }

    return servers;
  }

  private async connectToServer(serverName: string): Promise<McpConnection> {
    const existingConnection = this.mcpConnections.get(serverName);
    if (existingConnection) {
      return existingConnection;
    }

    const serverConfig = this.serverConfigs.get(serverName);
    if (!serverConfig) {
      throw new Error(`No configuration found for server: ${serverName}`);
    }

    logger.info('Starting MCP server connection', { serverName, command: serverConfig.command });

    const childProcess = spawn(serverConfig.command, serverConfig.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...serverConfig.env }
    });

    const connection: McpConnection = {
      process: childProcess,
      requestId: 1,
      pendingRequests: new Map()
    };

    // Handle process errors
    childProcess.on('error', (error: Error) => {
      logger.error('MCP server process error', { serverName, error: error.message });
      this.mcpConnections.delete(serverName);
    });

    childProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      logger.info('MCP server process exited', { serverName, code, signal });
      this.mcpConnections.delete(serverName);
    });

    // Set up JSON-RPC communication
    this.setupJsonRpcCommunication(connection, serverName);

    // Initialize the server with handshake
    await this.initializeServer(connection);

    this.mcpConnections.set(serverName, connection);
    logger.info('Successfully connected to MCP server', { serverName });

    return connection;
  }

  private setupJsonRpcCommunication(connection: McpConnection, serverName: string): void {
    let buffer = '';

    connection.process.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString();

      // Process complete JSON-RPC messages
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          try {
            const message = JSON.parse(line);
            this.handleJsonRpcMessage(connection, message, serverName);
          } catch (error) {
            logger.error('Failed to parse JSON-RPC message', {
              serverName,
              line,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    });

    connection.process.stderr?.on('data', (data: Buffer) => {
      logger.debug('MCP server stderr', { serverName, data: data.toString() });
    });
  }

  private handleJsonRpcMessage(connection: McpConnection, message: any, serverName: string): void {
    logger.debug('Received JSON-RPC message', { serverName, message });

    if (message.id && connection.pendingRequests.has(message.id)) {
      const pending = connection.pendingRequests.get(message.id)!;
      connection.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(`MCP Error: ${message.error.message || JSON.stringify(message.error)}`));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private async sendJsonRpcRequest(connection: McpConnection, method: string, params: any = {}): Promise<any> {
    const requestId = connection.requestId++;

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      connection.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout for request
      setTimeout(() => {
        if (connection.pendingRequests.has(requestId)) {
          connection.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout for method: ${method}`));
        }
      }, 30000); // 30 second timeout

      const requestStr = JSON.stringify(request) + '\n';
      connection.process.stdin?.write(requestStr);
    });
  }

  private async initializeServer(connection: McpConnection): Promise<void> {
    // Send initialize request
    await this.sendJsonRpcRequest(connection, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'secondbrain-mcp',
        version: '0.4.0'
      }
    });

    // Send initialized notification
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };

    const requestStr = JSON.stringify(notification) + '\n';
    connection.process.stdin?.write(requestStr);
  }

  /**
   * Execute a tool call - tries servers until one succeeds
   * Alias for backward compatibility
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<ToolResult> {
    return this.executeTool({ name: toolName, arguments: args });
  }

  /**
   * Execute a tool call - tries servers until one succeeds
   */
  async executeTool(toolCall: ToolCall): Promise<ToolResult> {
    // First check if this is a VS Code tool we can handle directly
    if (this.vsCodeToolProxy.isVSCodeTool(toolCall.name)) {
      logger.info('Executing VS Code tool locally', {
        toolName: toolCall.name,
        arguments: toolCall.arguments
      });

      const result = await this.vsCodeToolProxy.executeVSCodeTool(toolCall.name, toolCall.arguments);
      return {
        content: result.content,
        isError: result.isError
      };
    }

    // Check if this is a VS Code built-in tool that we can't handle
    const vscodeBuiltinTools = [
      'run_in_terminal', 'get_errors', 'list_code_usages', 'semantic_search'
    ];

    if (vscodeBuiltinTools.includes(toolCall.name)) {
      return {
        content: `ERROR: Tool "${toolCall.name}" is a VS Code built-in tool that cannot be executed by sub-agents. Sub-agents have access to file system tools (read_file, list_dir, grep_search, file_search, create_file, replace_string_in_file) and external MCP server tools (git, memory, time, etc.). Please use available tools or ask the primary agent to execute this tool.`,
        isError: true
      };
    }

    // Handle external MCP server tools
    const potentialServers = this.guessServerForTool(toolCall.name);
    let lastError: Error | null = null;

    for (const serverName of potentialServers) {
      try {
        const connection = await this.connectToServer(serverName);

        logger.info('Attempting tool execution', {
          toolName: toolCall.name,
          serverName,
          arguments: toolCall.arguments
        });

        // Execute the tool call
        const result = await this.sendJsonRpcRequest(connection, 'tools/call', {
          name: toolCall.name,
          arguments: toolCall.arguments
        });

        // Success! Cache this route and return result
        this.successfulRoutes.set(toolCall.name, serverName);

        logger.info('Tool execution successful', {
          toolName: toolCall.name,
          serverName
        });

        return {
          content: result.content || JSON.stringify(result),
          isError: false
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.debug('Tool execution failed on server', {
          toolName: toolCall.name,
          serverName,
          error: lastError.message
        });
        // Continue trying other servers
      }
    }

    // All servers failed
    const errorMessage = lastError?.message || 'Unknown error';
    logger.error('Tool execution failed on all servers', {
      toolName: toolCall.name,
      serversAttempted: potentialServers,
      error: errorMessage
    });

    return {
      content: `Error executing ${toolCall.name}: ${errorMessage}`,
      isError: true
    };
  }

  /**
   * Get available tools for a specific chatmode (simplified - just tool names)
   */
  getAvailableToolsForChatmode(chatmodeName: string): string[] {
    // Return common tool names that agents can attempt to use
    // Includes both local VS Code tools and external MCP server tools
    const baseTools = ['get_current_time'];

    // Local VS Code tools that sub-agents can actually use
    const localVSCodeTools = this.vsCodeToolProxy.getAvailableVSCodeTools();

    switch (chatmodeName.toLowerCase()) {
      case 'memory curator':
        return [...baseTools, ...localVSCodeTools, 'create_entities', 'search_nodes', 'add_observations', 'create_relations', 'read_graph'];

      case 'software engineer':
      case 'software architect':
        return [...baseTools, ...localVSCodeTools, 'git_status', 'git_diff', 'git_log', 'search_nodes', 'create_entities'];

      case 'database architect':
      case 'security engineer':
        return [...baseTools, ...localVSCodeTools, 'git_status', 'git_diff', 'search_nodes', 'create_entities'];

      default:
        // Most agents get basic memory and time tools plus file system access
        return [...baseTools, ...localVSCodeTools, 'search_nodes', 'create_entities'];
    }
  }

  /**
   * Cleanup connections when shutting down
   */
  async disconnect(): Promise<void> {
    for (const [serverName, connection] of this.mcpConnections) {
      try {
        connection.process.kill();
        logger.info('Disconnected from MCP server', { serverName });
      } catch (error) {
        logger.error('Error disconnecting from MCP server', {
          serverName,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    this.mcpConnections.clear();
  }
}
