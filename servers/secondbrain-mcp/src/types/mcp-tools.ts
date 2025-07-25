export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  allowUnsafeTools?: boolean;
  // Context-specific configuration
  context?: 'main' | 'subagent' | 'both';
}

export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: any;
  serverId: string;
  serverName: string;
  safe: boolean;
  originalTool: any; // Store original tool definition
}

export interface ToolExecutionResult {
  success: boolean;
  content?: any;
  error?: string;
  serverId: string;
  toolName: string;
}

export interface MCPServerStatus {
  id: string;
  name: string;
  connected: boolean;
  toolCount: number;
  safeToolCount: number;
  lastError?: string;
  lastConnected?: Date;
}
