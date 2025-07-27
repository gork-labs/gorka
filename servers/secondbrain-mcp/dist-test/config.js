import * as path from 'path';
import * as os from 'os';
function getDefaultConfig() {
    const homeDir = os.homedir();
    const defaultStorePath = path.join(homeDir, '.secondbrain');
    // Validate required environment variables
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.SECONDBRAIN_MODEL;
    if (!openrouterApiKey) {
        console.error('❌ FATAL: OPENROUTER_API_KEY environment variable is required');
        process.exit(1);
    }
    if (!model) {
        console.error('❌ FATAL: SECONDBRAIN_MODEL environment variable is required');
        console.error('   Example: SECONDBRAIN_MODEL=meta-llama/llama-3.1-8b-instruct:free');
        process.exit(1);
    }
    return {
        // Session Management
        sessionStorePath: process.env.SECONDBRAIN_SESSION_PATH || defaultStorePath,
        maxTotalCalls: parseInt(process.env.SECONDBRAIN_MAX_CALLS || '50'),
        maxRefinementIterations: parseInt(process.env.SECONDBRAIN_MAX_REFINEMENTS || '5'),
        maxParallelAgents: parseInt(process.env.SECONDBRAIN_MAX_PARALLEL_AGENTS || '5'),
        maxDepth: parseInt(process.env.SECONDBRAIN_MAX_DEPTH || '2'),
        sessionTimeoutMinutes: parseInt(process.env.SECONDBRAIN_SESSION_TIMEOUT || '30'),
        // Subagent Management
        subagentsPath: process.env.SECONDBRAIN_SUBAGENTS_PATH || path.join(process.cwd(), '.vscode', 'secondbrain', 'subagents'),
        mcpConfigPath: process.env.SECONDBRAIN_MCP_CONFIG_PATH || path.join(process.cwd(), '..', '..', '.vscode', 'mcp.json'),
        // OpenRouter API Configuration
        openrouterApiKey: openrouterApiKey,
        model: model,
        // Quality Control
        qualityThreshold: parseInt(process.env.SECONDBRAIN_QUALITY_THRESHOLD || '70'),
        enableQualityValidation: process.env.SECONDBRAIN_ENABLE_QUALITY_VALIDATION !== 'false',
        // Logging
        logLevel: (process.env.SECONDBRAIN_LOG_LEVEL || 'info'),
        enableStructuredLogging: process.env.SECONDBRAIN_STRUCTURED_LOGGING !== 'false'
    };
}
export const config = getDefaultConfig();
export function validateConfig(cfg) {
    const errors = [];
    // Note: openrouterApiKey and model are already validated during config creation
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
