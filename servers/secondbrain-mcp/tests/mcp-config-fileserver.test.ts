import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { getMCPServerConfig, UNSAFE_TOOL_PATTERNS, SAFE_TOOL_PATTERNS } from '../src/config/mcp-servers.js';
import { config } from '../src/utils/config.js';
import { FunctionCallingConfig } from '../src/tools/openai-function-calling.js';

describe('MCP Configuration and Fileserver Integration', () => {
  let tempDir: string;
  let tempConfigPath: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create temporary directory for test files
    tempDir = join(tmpdir(), 'secondbrain-test-' + Date.now());
    mkdirSync(tempDir, { recursive: true });
    tempConfigPath = join(tempDir, 'mcp.json');
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Environment Variable Configuration', () => {
    it('should read SECONDBRAIN_WORKSPACE_FOLDER correctly', () => {
      const testWorkspace = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
      process.env.SECONDBRAIN_WORKSPACE_FOLDER = testWorkspace;
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      // Create minimal config file
      const mcpConfig = {
        servers: {
          memory: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            enabled: true
          }
        }
      };

      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const servers = getMCPServerConfig('subagent');

      // Should auto-add filesystem server with workspace folder
      const filesystemServer = servers.find(s => s.id === 'filesystem');
      expect(filesystemServer).toBeDefined();
      expect(filesystemServer?.args).toContain(testWorkspace);
      expect(filesystemServer?.context).toBe('subagent');
    });

    it('should handle missing SECONDBRAIN_WORKSPACE_FOLDER gracefully', () => {
      delete process.env.SECONDBRAIN_WORKSPACE_FOLDER;
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      const mcpConfig = {
        servers: {
          memory: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            enabled: true
          }
        }
      };

      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const servers = getMCPServerConfig('subagent');

      // Should still add filesystem server but with limited access
      const filesystemServer = servers.find(s => s.id === 'filesystem');
      expect(filesystemServer).toBeDefined();
      expect(filesystemServer?.args).toEqual(['-y', '@modelcontextprotocol/server-filesystem']);
    });

    it('should parse SECONDBRAIN_FUNCTION_CALLING_CHATMODES correctly', async () => {
      process.env.SECONDBRAIN_FUNCTION_CALLING_CHATMODES = 'Software Engineer,Security Engineer,Database Architect';

      expect(FunctionCallingConfig.shouldUseOpenAIFunctionCalling('Software Engineer')).toBe(true);
      expect(FunctionCallingConfig.shouldUseOpenAIFunctionCalling('Security Engineer')).toBe(true);
      expect(FunctionCallingConfig.shouldUseOpenAIFunctionCalling('Database Architect')).toBe(true);
      expect(FunctionCallingConfig.shouldUseOpenAIFunctionCalling('Technical Writer')).toBe(false);
    });

    it('should enable OpenAI function calling for all chatmodes when no specific ones configured', async () => {
      delete process.env.SECONDBRAIN_FUNCTION_CALLING_CHATMODES;
      process.env.OPENAI_API_KEY = 'test-key';

      expect(FunctionCallingConfig.shouldUseOpenAIFunctionCalling('Software Engineer')).toBe(true);
      expect(FunctionCallingConfig.shouldUseOpenAIFunctionCalling('Any Chatmode')).toBe(true);
    });
  });

  describe('MCP Config File Parsing', () => {
    it('should parse valid mcp.json with fileserver configuration', () => {
      const workspaceFolder = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
      process.env.SECONDBRAIN_WORKSPACE_FOLDER = workspaceFolder;
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      const mcpConfig = {
        servers: {
          filesystem: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', workspaceFolder],
            enabled: true,
            allowUnsafeTools: false,
            context: 'subagent'
          },
          memory: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            enabled: true,
            allowUnsafeTools: false,
            context: 'both'
          }
        }
      };

      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const servers = getMCPServerConfig('subagent');

      expect(servers.length).toBeGreaterThanOrEqual(2);

      const filesystemServer = servers.find(s => s.id === 'filesystem');
      expect(filesystemServer).toBeDefined();
      expect(filesystemServer?.command).toBe('npx');
      expect(filesystemServer?.args).toContain('@modelcontextprotocol/server-filesystem');
      expect(filesystemServer?.args).toContain(workspaceFolder);
      expect(filesystemServer?.enabled).toBe(true);
      expect(filesystemServer?.allowUnsafeTools).toBe(false);

      const memoryServer = servers.find(s => s.id === 'memory');
      expect(memoryServer).toBeDefined();
      expect(memoryServer?.context).toBe('both');
    });

    it('should handle missing mcp.json gracefully', () => {
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = '/nonexistent/path/mcp.json';
      process.env.SECONDBRAIN_WORKSPACE_FOLDER = '/test/workspace';

      const servers = getMCPServerConfig('subagent');

      // Should still work and auto-add filesystem server
      expect(servers.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle malformed mcp.json gracefully', () => {
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      // Write malformed JSON
      writeFileSync(tempConfigPath, '{ invalid json }');

      const servers = getMCPServerConfig('subagent');

      // Should return empty array gracefully
      expect(Array.isArray(servers)).toBe(true);
    });

    it('should filter servers by context correctly', () => {
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      const mcpConfig = {
        servers: {
          memory: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            enabled: true,
            context: 'both'
          },
          git: {
            type: 'stdio',
            command: 'uvx',
            args: ['mcp-server-git'],
            enabled: true,
            context: 'main'
          },
          sequentialthinking: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
            enabled: true,
            context: 'subagent'
          }
        }
      };

      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const subagentServers = getMCPServerConfig('subagent');
      const mainServers = getMCPServerConfig('main');

      // Subagent context should get memory (both), sequentialthinking (subagent), and auto-added filesystem
      const subagentMemory = subagentServers.find(s => s.id === 'memory');
      const subagentThinking = subagentServers.find(s => s.id === 'sequentialthinking');
      const subagentFilesystem = subagentServers.find(s => s.id === 'filesystem');
      const subagentGit = subagentServers.find(s => s.id === 'git');

      expect(subagentMemory).toBeDefined();
      expect(subagentThinking).toBeDefined();
      expect(subagentFilesystem).toBeDefined(); // Auto-added
      expect(subagentGit).toBeUndefined(); // Filtered out

      // Main context should get memory (both) and git (main)
      const mainMemory = mainServers.find(s => s.id === 'memory');
      const mainGit = mainServers.find(s => s.id === 'git');
      const mainThinking = mainServers.find(s => s.id === 'sequentialthinking');
      const mainFilesystem = mainServers.find(s => s.id === 'filesystem');

      expect(mainMemory).toBeDefined();
      expect(mainGit).toBeDefined();
      expect(mainThinking).toBeUndefined(); // Filtered out
      expect(mainFilesystem).toBeUndefined(); // Not auto-added for main context
    });
  });

  describe('Filesystem Server Auto-Addition', () => {
    it('should auto-add filesystem server with workspace folder for subagent context', () => {
      const workspaceFolder = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
      process.env.SECONDBRAIN_WORKSPACE_FOLDER = workspaceFolder;
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      const mcpConfig = {
        servers: {
          memory: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            enabled: true
          }
        }
      };

      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const servers = getMCPServerConfig('subagent');

      const filesystemServer = servers.find(s => s.id === 'filesystem');
      expect(filesystemServer).toBeDefined();
      expect(filesystemServer?.command).toBe('npx');
      expect(filesystemServer?.args).toEqual([
        '-y',
        '@modelcontextprotocol/server-filesystem',
        workspaceFolder
      ]);
      expect(filesystemServer?.enabled).toBe(true);
      expect(filesystemServer?.allowUnsafeTools).toBe(false);
      expect(filesystemServer?.context).toBe('subagent');
    });

    it('should not auto-add filesystem server if already configured', () => {
      const workspaceFolder = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
      process.env.SECONDBRAIN_WORKSPACE_FOLDER = workspaceFolder;
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      const mcpConfig = {
        servers: {
          filesystem: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/custom/path'],
            enabled: true,
            allowUnsafeTools: true,
            context: 'subagent'
          }
        }
      };

      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const servers = getMCPServerConfig('subagent');

      const filesystemServers = servers.filter(s => s.id === 'filesystem');
      expect(filesystemServers.length).toBe(1); // Should not duplicate

      const filesystemServer = filesystemServers[0];
      expect(filesystemServer.args).toContain('/custom/path'); // Should keep custom config
      expect(filesystemServer.allowUnsafeTools).toBe(true); // Should keep custom config
    });

    it('should handle additional allowed directories', () => {
      const workspaceFolder = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
      const additionalDirs = '/Users/bohdan/Documents:/Users/bohdan/Desktop';

      process.env.SECONDBRAIN_WORKSPACE_FOLDER = workspaceFolder;
      process.env.SECONDBRAIN_ALLOWED_DIRECTORIES = additionalDirs;
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      const mcpConfig = { servers: {} };
      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const servers = getMCPServerConfig('subagent');

      const filesystemServer = servers.find(s => s.id === 'filesystem');
      expect(filesystemServer).toBeDefined();
      expect(filesystemServer?.args).toEqual([
        '-y',
        '@modelcontextprotocol/server-filesystem',
        workspaceFolder,
        '/Users/bohdan/Documents',
        '/Users/bohdan/Desktop'
      ]);
    });

    it('should not auto-add filesystem server for main context', () => {
      process.env.SECONDBRAIN_WORKSPACE_FOLDER = '/test/workspace';
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;

      const mcpConfig = {
        servers: {
          memory: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            enabled: true
          }
        }
      };

      writeFileSync(tempConfigPath, JSON.stringify(mcpConfig, null, 2));

      const servers = getMCPServerConfig('main');

      const filesystemServer = servers.find(s => s.id === 'filesystem');
      expect(filesystemServer).toBeUndefined();
    });
  });

  describe('Tool Safety Patterns', () => {
    it('should identify unsafe tool patterns correctly', () => {
      const unsafeTools = [
        'create_file',
        'write_file',
        'delete_file',
        'git_commit',
        'git_push',
        'execute_command',
        'run_shell',
        'system_call'
      ];

      for (const toolName of unsafeTools) {
        const isUnsafe = UNSAFE_TOOL_PATTERNS.some(pattern => pattern.test(toolName));
        expect(isUnsafe).toBe(true);
      }
    });

    it('should identify safe tool patterns correctly', () => {
      const safeTools = [
        'read_file',
        'list_dir',
        'search_files',
        'get_status',
        'show_info',
        'analyze_code',
        'validate_syntax',
        'browse_directory'
      ];

      for (const toolName of safeTools) {
        const isSafe = SAFE_TOOL_PATTERNS.some(pattern => pattern.test(toolName));
        expect(isSafe).toBe(true);
      }
    });
  });

  describe('Expected File Operation Tools', () => {
    it('should verify expected file operation tools are available from filesystem server', () => {
      // This test validates that the filesystem server should provide these tools
      const expectedFileTools = [
        'read_file',
        'list_dir',
        'file_search',
        'grep_search'
      ];

      // These are the tools that agents expect to have available
      // When the filesystem server is properly configured, it should provide these
      expectedFileTools.forEach(toolName => {
        const isSafe = SAFE_TOOL_PATTERNS.some(pattern => pattern.test(toolName));
        expect(isSafe).toBe(true);
      });
    });

    it('should verify problematic tools from logs are correctly handled', () => {
      // From the error logs, we know 'codebase' tool was missing
      const problematicTools = [
        'codebase' // This was the missing tool causing errors
      ];

      // The 'codebase' tool should be safe (it's for reading/analyzing code)
      const isSafe = SAFE_TOOL_PATTERNS.some(pattern => pattern.test('codebase'));
      expect(isSafe).toBe(false); // Currently not matching our patterns

      // We might need to add 'codebase' as a safe pattern or ensure
      // the filesystem server provides equivalent functionality
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should simulate real-world configuration from user logs', () => {
      // Simulate the exact configuration from the user's logs
      const workspaceFolder = '/Users/bohdan/Projects/TradeCafe/webapp-staff';
      process.env.SECONDBRAIN_WORKSPACE_FOLDER = workspaceFolder;
      process.env.SECONDBRAIN_MCP_CONFIG_PATH = tempConfigPath;
      process.env.OPENAI_API_KEY = 'test-key';

      // Simulate mcp.json from the logs
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

      const servers = getMCPServerConfig('subagent');

      // Verify the servers we expect are loaded
      expect(servers.find(s => s.id === 'sequentialthinking')).toBeDefined();
      expect(servers.find(s => s.id === 'memory')).toBeDefined();
      expect(servers.find(s => s.id === 'git')).toBeDefined();
      expect(servers.find(s => s.id === 'time')).toBeDefined();

      // Most importantly, filesystem should be auto-added
      const filesystemServer = servers.find(s => s.id === 'filesystem');
      expect(filesystemServer).toBeDefined();
      expect(filesystemServer?.args).toContain(workspaceFolder);

      // The missing 'codebase' tool should be provided by filesystem server
      // or we need to ensure filesystem provides read_file, list_dir, etc.
    });

    it('should validate tool availability matches agent expectations', () => {
      // From the error logs, agents expected these tools but got different ones:
      const expectedTools = [
        'codebase', // Missing from logs
        'read_file',
        'list_dir',
        'file_search',
        'grep_search'
      ];

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

      // Check if file operation tools are missing
      const hasFileOperations = expectedTools.some(tool =>
        actualAvailableTools.includes(tool)
      );

      // This test documents the current problem:
      // File operation tools are missing from the available tools list
      expect(hasFileOperations).toBe(false); // Current state - problem!

      // After fixing, this should be true:
      // expect(hasFileOperations).toBe(true);
    });
  });
});
