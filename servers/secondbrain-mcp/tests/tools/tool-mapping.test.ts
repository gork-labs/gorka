/**
 * Test suite for tool name mapping functionality
 * Ensures that VS Code tool names are properly mapped to MCP tool names
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIFunctionCallingExecutor } from '../../src/tools/openai-function-calling.js';

describe('OpenAI Function Calling Tool Mapping', () => {
  let executor: OpenAIFunctionCallingExecutor;
  const mockApiKey = 'test-api-key';
  const mockMcpTools = [
    {
      name: 'read_file',
      description: 'Read file contents',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
      serverId: 'filesystem',
      serverName: 'filesystem',
      safe: true
    },
    {
      name: 'search_files',
      description: 'Search files',
      inputSchema: { type: 'object', properties: { pattern: { type: 'string' } } },
      serverId: 'filesystem',
      serverName: 'filesystem',
      safe: true
    },
    {
      name: 'list_directory',
      description: 'List directory contents',
      inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
      serverId: 'filesystem',
      serverName: 'filesystem',
      safe: true
    }
  ];

  beforeEach(() => {
    executor = new OpenAIFunctionCallingExecutor(mockApiKey, mockMcpTools);
  });

  it('should map codebase to read_file with correct parameters', () => {
    const mapped = (executor as any).mapToolCall('codebase', {
      filePath: '/test/file.ts',
      startLine: 10,
      endLine: 50
    });

    expect(mapped.toolName).toBe('read_file');
    expect(mapped.args).toEqual({
      path: '/test/file.ts',
      startLine: 10,
      endLine: 50
    });
  });

  it('should map codebase with default line numbers', () => {
    const mapped = (executor as any).mapToolCall('codebase', {
      filePath: '/test/file.ts'
    });

    expect(mapped.toolName).toBe('read_file');
    expect(mapped.args).toEqual({
      path: '/test/file.ts',
      startLine: 1,
      endLine: 100
    });
  });

  it('should map search to search_files with correct parameters', () => {
    const mapped = (executor as any).mapToolCall('search', {
      query: 'function.*test',
      includePattern: 'src/**',
      caseSensitive: true
    });

    expect(mapped.toolName).toBe('search_files');
    expect(mapped.args).toEqual({
      pattern: 'function.*test',
      path: 'src/**',
      caseSensitive: true
    });
  });

  it('should map search with default parameters', () => {
    const mapped = (executor as any).mapToolCall('search', {
      query: 'test'
    });

    expect(mapped.toolName).toBe('search_files');
    expect(mapped.args).toEqual({
      pattern: 'test',
      path: '.',
      caseSensitive: false
    });
  });

  it('should map list_dir to list_directory', () => {
    const mapped = (executor as any).mapToolCall('list_dir', {
      path: '/test/directory'
    });

    expect(mapped.toolName).toBe('list_directory');
    expect(mapped.args).toEqual({
      path: '/test/directory'
    });
  });

  it('should pass through unknown tools unchanged', () => {
    const mapped = (executor as any).mapToolCall('unknown_tool', {
      someParam: 'value'
    });

    expect(mapped.toolName).toBe('unknown_tool');
    expect(mapped.args).toEqual({
      someParam: 'value'
    });
  });

  it('should create tool name mapping correctly', () => {
    const mapping = (executor as any).toolNameMapping;

    expect(mapping.get('codebase')).toBe('read_file');
    expect(mapping.get('search')).toBe('search_files');
    expect(mapping.get('list_dir')).toBe('list_directory');
    expect(mapping.get('git_status')).toBe('git_status');
    expect(mapping.get('sequentialthinking')).toBe('sequentialthinking');
  });
});
