import * as path from 'path';
import * as os from 'os';

export interface SecondBrainConfig {
  // Session Management
  sessionStorePath: string;
  maxTotalCalls: number;
  maxRefinementIterations: number;
  maxParallelAgents: number;
  maxDepth: number;
  sessionTimeoutMinutes: number;

  // Chatmode Management
  chatmodesPath: string;
  mcpConfigPath: string;

  // API Configuration
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultModel: string;
  subAgentModel: string;

  // Quality Control
  qualityThreshold: number;
  enableQualityValidation: boolean;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableStructuredLogging: boolean;
}

function getDefaultConfig(): SecondBrainConfig {
  const homeDir = os.homedir();
  const defaultStorePath = path.join(homeDir, '.secondbrain');

  return {
    // Session Management
    sessionStorePath: process.env.SECONDBRAIN_SESSION_PATH || defaultStorePath,
    maxTotalCalls: parseInt(process.env.SECONDBRAIN_MAX_CALLS || '50'),
    maxRefinementIterations: parseInt(process.env.SECONDBRAIN_MAX_REFINEMENTS || '5'),
    maxParallelAgents: parseInt(process.env.SECONDBRAIN_MAX_PARALLEL_AGENTS || '5'),
    maxDepth: parseInt(process.env.SECONDBRAIN_MAX_DEPTH || '2'),
    sessionTimeoutMinutes: parseInt(process.env.SECONDBRAIN_SESSION_TIMEOUT || '30'),

    // Chatmode Management
    chatmodesPath: process.env.SECONDBRAIN_CHATMODES_PATH || path.join(process.cwd(), '..', '..', 'chatmodes'),
    mcpConfigPath: process.env.SECONDBRAIN_MCP_CONFIG_PATH || path.join(process.cwd(), '..', '..', '.vscode', 'mcp.json'),

    // API Configuration
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.SECONDBRAIN_PRIMARY_MODEL || 'gpt-4',
    subAgentModel: process.env.SECONDBRAIN_SUBAGENT_MODEL || 'gpt-4o-mini',

    // Quality Control
    qualityThreshold: parseInt(process.env.SECONDBRAIN_QUALITY_THRESHOLD || '70'),
    enableQualityValidation: process.env.SECONDBRAIN_ENABLE_QUALITY_VALIDATION !== 'false',

    // Logging
    logLevel: (process.env.SECONDBRAIN_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    enableStructuredLogging: process.env.SECONDBRAIN_STRUCTURED_LOGGING !== 'false'
  };
}

export const config = getDefaultConfig();

export function validateConfig(cfg: SecondBrainConfig): void {
  const errors: string[] = [];

  if (!cfg.openaiApiKey && !cfg.anthropicApiKey) {
    errors.push('At least one API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) must be provided');
  }

  if (cfg.maxTotalCalls < 1 || cfg.maxTotalCalls > 100) {
    errors.push('maxTotalCalls must be between 1 and 100');
  }

  if (cfg.maxRefinementIterations < 1 || cfg.maxRefinementIterations > 10) {
    errors.push('maxRefinementIterations must be between 1 and 10');
  }

  if (cfg.qualityThreshold < 0 || cfg.qualityThreshold > 100) {
    errors.push('qualityThreshold must be between 0 and 100');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
}
