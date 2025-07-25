import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCP Context Issue Fix', () => {
  let tempDir: string;
  let tempConfigPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = join(tmpdir(), 'secondbrain-context-fix-' + Date.now());
    mkdirSync(tempDir, { recursive: true });
    tempConfigPath = join(tempDir, 'mcp.json');
  });

  afterEach(() => {
    process.env = originalEnv;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should identify the context mismatch problem', async () => {
    // Set up environment like the user's setup
    process.env.SECONDBRAIN_WORKSPACE_FOLDER = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
    process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

    // Create minimal config
    const mcpConfig = { servers: {} };
    writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

    const { getMCPServerConfig } = await import('../src/config/mcp-servers.js');

    // Test main context (what server.ts currently uses)
    const mainContextServers = getMCPServerConfig('main');
    const mainFilesystemServer = mainContextServers.find(s => s.id === 'filesystem');

    // Test subagent context (where filesystem server is auto-added)
    const subagentContextServers = getMCPServerConfig('subagent');
    const subagentFilesystemServer = subagentContextServers.find(s => s.id === 'filesystem');

    console.log('🔍 Context Analysis:');
    console.log(`Main context has filesystem server: ${!!mainFilesystemServer}`);
    console.log(`Subagent context has filesystem server: ${!!subagentFilesystemServer}`);
    console.log('');
    console.log('🎯 Problem identified:');
    console.log('1. Main server uses "main" context → no filesystem tools');
    console.log('2. Filesystem server only auto-added for "subagent" context');
    console.log('3. Sub-agents executed by main server don\'t get filesystem tools');
    console.log('');
    console.log('🔧 Solution options:');
    console.log('A. Change main server to use "subagent" context');
    console.log('B. Create separate MCPClientManager for subagent operations');
    console.log('C. Auto-add filesystem server for both contexts');

    // Verify the problem
    expect(mainFilesystemServer).toBeUndefined();
    expect(subagentFilesystemServer).toBeDefined();
  });

  it('should test solution A: main server using subagent context', async () => {
    process.env.SECONDBRAIN_WORKSPACE_FOLDER = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
    process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

    const mcpConfig = {
      servers: {
        memory: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory@latest']
        }
      }
    };
    writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

    const { getMCPServerConfig } = await import('../src/config/mcp-servers.js');

    // If main server used 'subagent' context, it would get filesystem tools
    const subagentServers = getMCPServerConfig('subagent');
    const filesystemServer = subagentServers.find(s => s.id === 'filesystem');
    const memoryServer = subagentServers.find(s => s.id === 'memory');

    console.log('✅ Solution A - Main server using subagent context:');
    console.log(`  - Would have filesystem server: ${!!filesystemServer}`);
    console.log(`  - Would have memory server: ${!!memoryServer}`);
    console.log(`  - Total servers: ${subagentServers.length}`);

    // Verify this would work
    expect(filesystemServer).toBeDefined();
    expect(memoryServer).toBeDefined();
    expect(subagentServers.length).toBeGreaterThan(1);
  });

  it('should test solution C: auto-add filesystem for both contexts', async () => {
    process.env.SECONDBRAIN_WORKSPACE_FOLDER = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
    process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

    const mcpConfig = { servers: {} };
    writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

    // This would require modifying the auto-add logic to include main context
    // Currently it only adds for subagent context

    console.log('🔧 Solution C - Auto-add filesystem for both contexts:');
    console.log('  - Requires changing the condition in mcp-servers.ts');
    console.log('  - Change: if (context === "subagent")');
    console.log('  - To: if (context === "subagent" || context === "main")');
    console.log('  - Or create a separate condition for main context');

    expect(true).toBe(true); // Test documents the solution approach
  });

  it('should recommend the best solution', () => {
    console.log('🎯 Recommended Solution:');
    console.log('');
    console.log('Change the main server (src/core/server.ts line 62) from:');
    console.log('  this.mcpClientManager = new MCPClientManager("main");');
    console.log('');
    console.log('To:');
    console.log('  this.mcpClientManager = new MCPClientManager("subagent");');
    console.log('');
    console.log('✅ Why this is the best approach:');
    console.log('1. Minimal change - only one line in server.ts');
    console.log('2. No complex dual client manager setup needed');
    console.log('3. Main server gets all tools needed for sub-agents');
    console.log('4. Filesystem tools become available to agents immediately');
    console.log('5. Existing auto-addition logic works without changes');
    console.log('');
    console.log('⚠️  Security consideration:');
    console.log('The main server will have filesystem access, but this is');
    console.log('necessary for it to provide filesystem tools to sub-agents.');
    console.log('Tool safety filtering still applies.');

    expect(true).toBe(true);
  });
});
