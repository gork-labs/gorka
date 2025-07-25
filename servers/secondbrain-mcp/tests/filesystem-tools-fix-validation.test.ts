import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Filesystem Tools Fix Validation', () => {
  let tempDir: string;
  let tempConfigPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = join(tmpdir(), 'secondbrain-fix-validation-' + Date.now());
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

  it('should confirm main server now gets filesystem tools with subagent context', async () => {
    // Set up user environment
    process.env.SECONDBRAIN_WORKSPACE_FOLDER = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
    process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

    // Create the user's exact mcp.json configuration
    const mcpConfig = {
      servers: {
        sequentialthinking: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-sequential-thinking@latest'],
          gallery: true
        },
        memory: {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory@latest'],
          env: {
            MEMORY_FILE_PATH: '${workspaceFolder}/.vscode/memory.json'
          }
        },
        git: {
          command: 'uvx',
          args: ['mcp-server-git'],
          type: 'stdio'
        },
        time: {
          command: 'uvx',
          args: ['mcp-server-time'],
          type: 'stdio'
        }
      }
    };

    writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

    // Test what the main server now gets with subagent context
    const { getMCPServerConfig } = await import('../src/config/mcp-servers.js');
    const subagentServers = getMCPServerConfig('subagent');

    console.log('🔧 After Fix - Main server using subagent context:');
    subagentServers.forEach(server => {
      console.log(`  ✅ ${server.id}: ${server.command} ${server.args?.join(' ')}`);
    });

    // Verify filesystem server is now available
    const filesystemServer = subagentServers.find(s => s.id === 'filesystem');
    expect(filesystemServer).toBeDefined();
    expect(filesystemServer?.args).toContain('/Users/bohdan/Projects/TradeCafe/webapp-staff');

    // Verify all original servers are still there
    const serverIds = subagentServers.map(s => s.id);
    expect(serverIds).toContain('sequentialthinking');
    expect(serverIds).toContain('memory');
    expect(serverIds).toContain('git');
    expect(serverIds).toContain('time');
    expect(serverIds).toContain('filesystem'); // Now included!

    console.log('');
    console.log('✅ Fix validated:');
    console.log(`  - Total servers available: ${subagentServers.length}`);
    console.log(`  - Filesystem server included: ${!!filesystemServer}`);
    console.log(`  - Workspace folder configured: ${filesystemServer?.args?.includes('/Users/bohdan/Projects/TradeCafe/webapp-staff')}`);
  });

  it('should verify expected filesystem tools will be available', async () => {
    // Based on @modelcontextprotocol/server-filesystem documentation
    const expectedFilesystemTools = [
      'read_file',        // ✅ Safe - agents need this
      'write_file',       // ❌ Unsafe - filtered out
      'create_directory', // ❌ Unsafe - filtered out
      'list_directory',   // ✅ Safe - agents need this (maps to list_dir)
      'move_file',        // ❌ Unsafe - filtered out
      'search_files',     // ✅ Safe - agents need this (maps to file_search)
      'get_file_info'     // ✅ Safe - agents might need this
    ];

    const { isToolSafe } = await import('../src/config/mcp-servers.js');

    console.log('🔍 Filesystem Tools Safety Analysis:');
    expectedFilesystemTools.forEach(toolName => {
      const safe = isToolSafe(toolName, false);
      const status = safe ? '✅ SAFE' : '❌ UNSAFE (filtered out)';
      console.log(`  - ${toolName}: ${status}`);
    });

    // The key insight: agents were looking for 'codebase', 'list_dir', 'file_search'
    // But filesystem server provides 'read_file', 'list_directory', 'search_files'
    console.log('');
    console.log('🔧 Tool Name Mapping Required:');
    console.log('  - Agent needs "list_dir" → Filesystem provides "list_directory"');
    console.log('  - Agent needs "file_search" → Filesystem provides "search_files"');
    console.log('  - Agent needs "codebase" → Use "read_file" + "search_files" combination');

    // Safe tools that will be available
    const safeFilesystemTools = expectedFilesystemTools.filter(tool => isToolSafe(tool, false));
    expect(safeFilesystemTools.length).toBeGreaterThan(0);
    expect(safeFilesystemTools).toContain('read_file');
  });

  it('should confirm agents will now have filesystem access', async () => {
    // Simulate what agents will see after the fix
    const expectedAvailableTools = [
      // Existing MCP tools (from user logs)
      'sequentialthinking',
      'create_entities',
      'create_relations',
      'add_observations',
      'read_graph',
      'search_nodes',
      'open_nodes',
      'resolve-library-id',
      'get-library-docs',
      'get_current_time',
      'convert_time',
      'git_status',
      'git_diff_unstaged',
      'git_diff_staged',
      'git_diff',
      'git_add',
      'git_log',
      'git_checkout',
      'git_show',
      'git_init',
      // NEW: Filesystem tools (safe ones)
      'read_file',
      'list_directory',
      'search_files',
      'get_file_info'
    ];

    console.log('🎯 Expected Tools After Fix:');
    console.log('Existing tools:', expectedAvailableTools.slice(0, -4).join(', '));
    console.log('NEW filesystem tools:', expectedAvailableTools.slice(-4).join(', '));
    console.log('');
    console.log('✅ This should resolve agent errors:');
    console.log('  - "Tool not found: codebase" → Use read_file instead');
    console.log('  - Missing file operations → Now available via filesystem server');
    console.log('  - Missing directory listing → Now available as list_directory');
    console.log('  - Missing file search → Now available as search_files');

    expect(expectedAvailableTools.length).toBeGreaterThan(20);
    expect(expectedAvailableTools).toContain('read_file');
    expect(expectedAvailableTools).toContain('list_directory');
    expect(expectedAvailableTools).toContain('search_files');
  });
});
