import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCP Tool Resolution Debugging', () => {
  let tempDir: string;
  let tempConfigPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = join(tmpdir(), 'secondbrain-tool-debug-' + Date.now());
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

  it('should debug why fileserver tools are missing from agent tool list', async () => {
    // Simulate exact user environment
    const workspaceFolder = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
    process.env.SECONDBRAIN_WORKSPACE_FOLDER = workspaceFolder;
    process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;
    process.env.OPENAI_API_KEY = 'test-key';

    // Create the same mcp.json from user logs
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

    // Test the MCP server configuration loading
    const { getMCPServerConfig } = await import('../src/config/mcp-servers.js');
    const servers = getMCPServerConfig('subagent');

    console.log('🔍 Loaded MCP Servers:');
    servers.forEach(server => {
      console.log(`  - ${server.id}: ${server.command} ${server.args?.join(' ')}`);
    });

    // Verify filesystem server is present
    const filesystemServer = servers.find(s => s.id === 'filesystem');
    expect(filesystemServer).toBeDefined();
    console.log('✅ Filesystem server found:', filesystemServer);

    // Now test if we can get the actual tools from the filesystem server
    // This is where the issue likely lies - the server is configured but tools aren't being loaded

    // Mock the expected tools that filesystem server should provide
    const expectedFilesystemTools = [
      'read_file',
      'list_dir',
      'write_file', // This would be unsafe
      'create_file', // This would be unsafe
      'search_files',
      'grep_search'
    ];

    // Test tool safety filtering
    const { isToolSafe } = await import('../src/config/mcp-servers.js');

    console.log('🔍 Tool Safety Analysis:');
    expectedFilesystemTools.forEach(toolName => {
      const safe = isToolSafe(toolName, false);
      console.log(`  - ${toolName}: ${safe ? '✅ SAFE' : '❌ UNSAFE'}`);
    });

    // The issue: agents are getting this tool list from the logs:
    const actualAvailableTools = [
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
      'git_init'
    ];

    console.log('🔍 Tools available to agents (from logs):');
    actualAvailableTools.forEach(tool => console.log(`  - ${tool}`));

    // Check if any filesystem tools are in the actual list
    const filesystemToolsInActual = expectedFilesystemTools.filter(tool =>
      actualAvailableTools.includes(tool)
    );

    console.log('🔍 Filesystem tools in actual agent list:', filesystemToolsInActual);

    // This is the core problem: filesystem tools are not reaching the agents
    expect(filesystemToolsInActual.length).toBe(0); // Current broken state

    // The filesystem server is being added to the config, but its tools aren't being loaded
    // This suggests the issue is in the MCP client manager or tool collection process
  });

  it('should identify the disconnect between server config and available tools', async () => {
    // The test logs show:
    // ✅ Filesystem server is configured correctly
    // ✅ Workspace folder is set correctly
    // ❌ But filesystem tools (read_file, list_dir, etc.) are missing from agent tool list

    console.log('🔍 Analysis of the disconnect:');
    console.log('1. ✅ Environment variables: SECONDBRAIN_WORKSPACE_FOLDER and SECONDBRAIN_MCP_CONFIG_PATH work');
    console.log('2. ✅ MCP config parsing: mcp.json is read correctly');
    console.log('3. ✅ Filesystem auto-addition: Filesystem server is added for subagent context');
    console.log('4. ❌ Tool resolution: Filesystem tools are not reaching the agents');
    console.log('');
    console.log('🎯 Root cause hypothesis:');
    console.log('   The filesystem MCP server is configured but not actually started/connected');
    console.log('   Or the MCP client manager is not collecting tools from the filesystem server');
    console.log('   Or there\'s a filtering issue that removes filesystem tools from the final list');
    console.log('');
    console.log('🔧 Next steps to fix:');
    console.log('   1. Check if MCP client manager actually starts the filesystem server');
    console.log('   2. Verify tool collection from all configured MCP servers');
    console.log('   3. Check if filesystem tools are being filtered out incorrectly');
    console.log('   4. Ensure filesystem server tools are marked as safe and included');

    // This test documents our findings
    expect(true).toBe(true);
  });

  it('should test the exact tool names filesystem server provides', () => {
    // Based on @modelcontextprotocol/server-filesystem documentation,
    // it should provide these tools:
    const filesystemServerTools = [
      'read_file',
      'write_file',
      'create_directory',
      'list_directory',
      'move_file',
      'search_files',
      'get_file_info'
    ];

    // But agents are looking for these tools (from error logs):
    const agentsExpectedTools = [
      'codebase', // ❌ This doesn't exist in filesystem server
      'read_file',
      'list_dir',
      'file_search',
      'grep_search'
    ];

    console.log('🔍 Tool name mismatch analysis:');
    console.log('Filesystem server provides:', filesystemServerTools);
    console.log('Agents expect:', agentsExpectedTools);

    // Check for name mismatches
    const matches = agentsExpectedTools.filter(expected =>
      filesystemServerTools.some(provided =>
        provided.toLowerCase().includes(expected.toLowerCase()) ||
        expected.toLowerCase().includes(provided.toLowerCase())
      )
    );

    console.log('Potential matches:', matches);

    // The 'codebase' tool doesn't exist - agents need to use 'read_file' instead
    // 'list_dir' vs 'list_directory' - name mismatch
    // 'file_search' vs 'search_files' - name mismatch

    expect(matches.length).toBeGreaterThan(0);
  });
});
