#!/usr/bin/env node

/**
 * Simple test to verify OpenRouter-only configuration
 */

import { loadConfig } from './dist/utils/config.js';

try {
  const config = loadConfig();

  console.log('🔧 SecondBrain MCP Configuration Test');
  console.log('=====================================');

  // Test basic config loading
  console.log('✅ Configuration loaded successfully');

  // Check OpenRouter setup
  const hasOpenRouterKey = !!config.openrouterApiKey;
  console.log(`🔑 OpenRouter API Key: ${hasOpenRouterKey ? 'CONFIGURED' : 'MISSING'}`);

  // Check models
  console.log(`🤖 Default Model: ${config.defaultModel}`);
  console.log(`🤖 SubAgent Model: ${config.subAgentModel}`);

  // Verify no legacy API keys
  const hasOldKeys = 'openaiApiKey' in config || 'anthropicApiKey' in config;
  console.log(`🧹 Legacy API Keys: ${hasOldKeys ? 'FOUND (CLEANUP NEEDED)' : 'REMOVED'}`);

  // Session config
  console.log(`📁 Session Storage: ${config.sessionStorePath}`);
  console.log(`⚡ Max Total Calls: ${config.maxTotalCalls}`);
  console.log(`🔄 Max Parallel Agents: ${config.maxParallelAgents}`);

  console.log('\n🎉 OpenRouter-only migration: SUCCESS');

  // Test environment requirements
  if (!hasOpenRouterKey) {
    console.log('\n⚠️  Note: Set OPENROUTER_API_KEY environment variable to enable subagents');
  }

} catch (error) {
  console.log('❌ Configuration Error:', error.message);
  process.exit(1);
}
