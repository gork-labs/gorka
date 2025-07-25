/**
 * Integration test to demonstrate the tool mapping fix works end-to-end
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIFunctionCallingExecutor } from '../../src/tools/openai-function-calling.js';

describe('Tool Mapping Integration Demo', () => {
  let executor: OpenAIFunctionCallingExecutor;
  const mockApiKey = 'test-api-key';
  const mockMcpTools = [
    {
      name: 'read_file',
      description: 'Read file contents',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          startLine: { type: 'number' },
          endLine: { type: 'number' }
        }
      },
      serverId: 'filesystem',
      serverName: 'filesystem',
      safe: true
    },
    {
      name: 'search_files',
      description: 'Search files',
      inputSchema: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          path: { type: 'string' },
          caseSensitive: { type: 'boolean' }
        }
      },
      serverId: 'filesystem',
      serverName: 'filesystem',
      safe: true
    }
  ];

  beforeEach(() => {
    executor = new OpenAIFunctionCallingExecutor(mockApiKey, mockMcpTools);
  });

  it('should demonstrate the fix for SecondBrain MCP tool access issue', () => {
    // Test the exact scenario from the user's bug report

    // Before fix: Agent calls "codebase" tool and gets "Tool not found" error
    // After fix: "codebase" is mapped to "read_file" with correct parameters

    const codebaseCall = (executor as any).mapToolCall('codebase', {
      filePath: '/Users/bohdan/Projects/TradeCafe/webapp-staff/src/api/auth.ts',
      startLine: 1,
      endLine: 50
    });

    expect(codebaseCall.toolName).toBe('read_file');
    expect(codebaseCall.args).toEqual({
      path: '/Users/bohdan/Projects/TradeCafe/webapp-staff/src/api/auth.ts',
      startLine: 1,
      endLine: 50
    });

    // Test search functionality that was also failing
    const searchCall = (executor as any).mapToolCall('search', {
      query: 'checkToken',
      includePattern: 'src/api/*.ts'
    });

    expect(searchCall.toolName).toBe('search_files');
    expect(searchCall.args).toEqual({
      pattern: 'checkToken',
      path: 'src/api/*.ts',
      caseSensitive: false
    });
  });

  it('should demonstrate real-world TradeCafe analysis scenario', () => {
    // Simulate the exact calls that would be made by Security Engineer agent
    // analyzing the TradeCafe codebase as described in the issue

    const authFileAnalysis = (executor as any).mapToolCall('codebase', {
      filePath: '/Users/bohdan/Projects/TradeCafe/webapp-staff/src/api/auth.ts',
      startLine: 44,
      endLine: 45
    });

    expect(authFileAnalysis.toolName).toBe('read_file');
    expect(authFileAnalysis.args.path).toContain('auth.ts');
    expect(authFileAnalysis.args.startLine).toBe(44);
    expect(authFileAnalysis.args.endLine).toBe(45);

    // Test search for the specific vulnerability mentioned
    const vulnerabilitySearch = (executor as any).mapToolCall('search', {
      query: 'checkToken.*token\\?',
      includePattern: 'src/api/*.ts'
    });

    expect(vulnerabilitySearch.toolName).toBe('search_files');
    expect(vulnerabilitySearch.args.pattern).toBe('checkToken.*token\\?');
  });

  it('should prove backward compatibility with existing agent instructions', () => {
    // Test that all the tool names mentioned in the bug report work correctly
    const toolMappings = [
      ['codebase', 'read_file'],
      ['editFiles', 'write_file'],
      ['search', 'search_files'],
      ['list_dir', 'list_directory']
    ];

    for (const [vsCodeTool, mcpTool] of toolMappings) {
      const mapped = (executor as any).mapToolCall(vsCodeTool, { test: 'value' });
      expect(mapped.toolName).toBe(mcpTool);
    }
  });
});

describe('Bug Report Validation', () => {
  it('should validate that the specific errors from the bug report are fixed', () => {
    // The bug report showed these specific errors in the logs:
    // "Tool not found: codebase"
    // availableTools: ["sequentialthinking","create_entities", ...] (no filesystem tools)

    const executor = new OpenAIFunctionCallingExecutor('test-key', [
      {
        name: 'read_file',
        description: 'Read file contents',
        inputSchema: {},
        serverId: 'filesystem',
        serverName: 'filesystem',
        safe: true
      }
    ]);

    // The mapping should now handle the "codebase" tool that was failing
    const mapping = (executor as any).toolNameMapping;
    expect(mapping.has('codebase')).toBe(true);
    expect(mapping.get('codebase')).toBe('read_file');

    // Simulate the exact call that was failing
    const result = (executor as any).mapToolCall('codebase', {
      filePath: '/Users/bohdan/Projects/TradeCafe/webapp-staff/src/api/auth.ts'
    });

    expect(result.toolName).toBe('read_file');
    expect(result.args.path).toBe('/Users/bohdan/Projects/TradeCafe/webapp-staff/src/api/auth.ts');
  });
});
