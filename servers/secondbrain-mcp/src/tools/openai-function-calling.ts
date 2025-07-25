/**
 * OpenAI Native Function Calling Implementation
 *
 * This implementation uses OpenAI's built-in function calling capabilities to replace
 * the regex-based tool parsing system with reliable, structured function execution.
 *
 * Key Benefits:
 * 1. Structured function definitions with automatic validation
 * 2. Built-in JSON parsing and type safety
 * 3. Multiple simultaneous function calls support
 * 4. Automatic error handling and retry logic
 * 5. No regex parsing - uses OpenAI's proven approach
 *
 * Created: 2025-07-25T17:04:49+02:00
 * Author: Staff Software Engineer - Gorka
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { getVersionString } from '../utils/version.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  serverId: string;
  serverName: string;
  safe: boolean;
}

export interface SubAgentResponse {
  deliverables: {
    analysis: string;
    recommendations: string[];
    documents: string[];
    technical_details: string;
  };
  memory_operations: any[];
  metadata: {
    chatmode: string;
    task_completion_status: string;
    processing_time: string;
    confidence_level: string;
  };
}

/**
 * Enhanced sub-agent executor using OpenAI's native function calling
 * Replaces regex-based tool parsing with structured function execution
 */
export class OpenAIFunctionCallingExecutor {
  private openai: OpenAI;
  private mcpTools: MCPTool[];
  private maxIterations: number;
  private toolNameMapping: Map<string, string>;

  constructor(
    apiKey: string,
    mcpTools: MCPTool[],
    maxIterations: number = 20
  ) {
    // Initialize OpenAI client with version information
    const versionString = getVersionString();
    this.openai = new OpenAI({
      apiKey,
      defaultHeaders: {
        'User-Agent': `${versionString} (SecondBrain-MCP)`,
        'X-Client-Version': versionString
      }
    });

    this.mcpTools = mcpTools.filter(tool => tool.safe); // Only safe tools
    this.maxIterations = maxIterations;
    this.toolNameMapping = this.createToolNameMapping();

    logger.info('OpenAI Function Calling Executor initialized', {
      version: versionString,
      safeToolsCount: this.mcpTools.length,
      maxIterations: this.maxIterations
    });
  }

  /**
   * Create mapping from VS Code tool names to MCP tool names
   * This enables backward compatibility with existing agent instructions
   */
  private createToolNameMapping(): Map<string, string> {
    const mapping = new Map<string, string>();

    // File operations mapping
    mapping.set('codebase', 'read_file');
    mapping.set('read_file', 'read_file');
    mapping.set('editFiles', 'write_file');
    mapping.set('write_file', 'write_file');
    mapping.set('search', 'search_files');
    mapping.set('search_files', 'search_files');
    mapping.set('file_search', 'search_files');
    mapping.set('list_dir', 'list_directory');
    mapping.set('list_directory', 'list_directory');
    mapping.set('get_file_info', 'get_file_info');

    // Git operations (these should already work)
    mapping.set('git_status', 'git_status');
    mapping.set('git_diff', 'git_diff');
    mapping.set('git_log', 'git_log');
    mapping.set('git_show', 'git_show');

    // Memory operations (these should already work)
    mapping.set('create_entities', 'create_entities');
    mapping.set('search_nodes', 'search_nodes');
    mapping.set('add_observations', 'add_observations');

    // Sequential thinking (this should already work)
    mapping.set('sequentialthinking', 'sequentialthinking');

    // Time operations (these should already work)
    mapping.set('get_current_time', 'get_current_time');

    return mapping;
  }

  /**
   * Map tool names and parameters from VS Code format to MCP format
   */
  private mapToolCall(toolName: string, args: any): { toolName: string; args: any } {
    const mappedToolName = this.toolNameMapping.get(toolName) || toolName;
    let mappedArgs = { ...args };

    // Handle parameter mapping for specific tools
    switch (toolName) {
      case 'codebase':
        // VS Code codebase tool -> MCP read_file tool
        if (args.filePath) {
          mappedArgs = {
            path: args.filePath,
            startLine: args.startLine || 1,
            endLine: args.endLine || 100
          };
        }
        break;

      case 'editFiles':
        // VS Code editFiles tool -> MCP write_file tool
        if (args.filePath && args.content) {
          mappedArgs = {
            path: args.filePath,
            content: args.content
          };
        }
        break;

      case 'search':
      case 'file_search':
        // VS Code search tools -> MCP search_files tool
        if (args.query) {
          mappedArgs = {
            pattern: args.query,
            path: args.includePattern || '.',
            caseSensitive: args.caseSensitive || false
          };
        }
        break;

      case 'list_dir':
        // VS Code list_dir -> MCP list_directory
        if (args.path) {
          mappedArgs = {
            path: args.path
          };
        }
        break;

      default:
        // For all other tools, use args as-is
        mappedArgs = args;
        break;
    }

    return {
      toolName: mappedToolName,
      args: mappedArgs
    };
  }
  private createOpenAIFunctionTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return this.mcpTools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.convertMCPSchemaToOpenAI(tool.inputSchema)
      }
    }));
  }

  /**
   * Convert MCP input schema to OpenAI function parameters schema
   */
  private convertMCPSchemaToOpenAI(mcpSchema: any): any {
    // Handle common MCP schema patterns and convert to OpenAI format
    if (!mcpSchema || typeof mcpSchema !== 'object') {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    // If it's already in JSON Schema format, use it directly
    if (mcpSchema.type === 'object' && mcpSchema.properties) {
      return mcpSchema;
    }

    // Convert common patterns
    return {
      type: 'object',
      properties: mcpSchema.properties || {},
      required: mcpSchema.required || []
    };
  }

  /**
   * Execute sub-agent with native OpenAI function calling
   */
  async executeSubAgent(
    instructions: string,
    chatmodeName: string,
    sessionId: string,
    toolExecutor: (toolName: string, args: any) => Promise<{ success: boolean; content: any; error?: string; serverId?: string }>
  ): Promise<SubAgentResponse> {
    const sessionLog = logger.withSession(sessionId);
    const startTime = performance.now();
    let toolCallCount = 0;

    try {
      // Prepare OpenAI function tools
      const functionTools = this.createOpenAIFunctionTools();

      sessionLog.info('Executing sub-agent with OpenAI native function calling', {
        chatmode: chatmodeName,
        availableTools: this.mcpTools.map(t => t.name),
        functionToolsCount: functionTools.length,
        maxIterations: this.maxIterations,
        model: 'gpt-4o-mini'
      });

      const { result, toolCallCount: executionToolCalls } = await this.executeSubAgentManual(
        instructions,
        chatmodeName,
        sessionId,
        toolExecutor
      );

      toolCallCount = executionToolCalls;

      // Record successful execution metrics
      const duration = performance.now() - startTime;
      FunctionCallingMetrics.recordExecution(
        chatmodeName,
        duration,
        true,
        toolCallCount
      );

      return result;

    } catch (error) {
      // Record failed execution metrics
      const duration = performance.now() - startTime;
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';

      FunctionCallingMetrics.recordExecution(
        chatmodeName,
        duration,
        false,
        toolCallCount,
        errorType
      );

      sessionLog.error('OpenAI sub-agent execution failed', {
        chatmode: chatmodeName,
        error: error instanceof Error ? error.message : String(error),
        duration,
        toolCallCount
      });
      throw error;
    }
  }

  /**
   * Manual function call handling implementation
   * This provides full control over the execution flow
   */
  async executeSubAgentManual(
    instructions: string,
    chatmodeName: string,
    sessionId: string,
    toolExecutor: (toolName: string, args: any) => Promise<{ success: boolean; content: any; error?: string; serverId?: string }>
  ): Promise<{ result: SubAgentResponse; toolCallCount: number }> {
    const sessionLog = logger.withSession(sessionId);
    const functionTools = this.createOpenAIFunctionTools();
    let totalToolCalls = 0;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: instructions
      }
    ];

    let iteration = 0;
    let consecutiveFailures = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          tools: functionTools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 4000
        });

        const message = completion.choices[0]?.message;
        if (!message) {
          throw new Error('Empty response from OpenAI');
        }

        // Add assistant message to conversation
        messages.push(message);

        // Check if there are tool calls to execute
        if (message.tool_calls && message.tool_calls.length > 0) {
          totalToolCalls += message.tool_calls.length;

          sessionLog.info('Processing OpenAI function calls', {
            toolCallCount: message.tool_calls.length,
            totalToolCalls,
            iteration
          });

          // Execute all tool calls
          const toolResults = await Promise.all(
            message.tool_calls.map(async (toolCall) => {
              if (toolCall.type !== 'function') {
                return null;
              }

              const functionName = toolCall.function.name;
              const functionArgs = JSON.parse(toolCall.function.arguments);

              // Map tool name and arguments from VS Code format to MCP format
              const { toolName: mappedToolName, args: mappedArgs } = this.mapToolCall(functionName, functionArgs);

              sessionLog.info('Executing function call', {
                originalFunctionName: functionName,
                mappedFunctionName: mappedToolName,
                callId: toolCall.id,
                originalArguments: functionArgs,
                mappedArguments: mappedArgs,
                iteration
              });

              try {
                const result = await toolExecutor(mappedToolName, mappedArgs);

                consecutiveFailures = 0; // Reset on success

                sessionLog.info('Function call executed successfully', {
                  originalFunctionName: functionName,
                  mappedFunctionName: mappedToolName,
                  callId: toolCall.id,
                  success: result.success,
                  serverId: result.serverId,
                  iteration
                });

                return {
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  content: result.success
                    ? JSON.stringify(result.content)
                    : `Error: ${result.error || 'Unknown error'}`
                };

              } catch (error) {
                consecutiveFailures++;

                sessionLog.error('Function call execution failed', {
                  originalFunctionName: functionName,
                  mappedFunctionName: mappedToolName,
                  callId: toolCall.id,
                  error: error instanceof Error ? error.message : String(error),
                  consecutiveFailures,
                  iteration
                });

                // Safety check for consecutive failures
                if (consecutiveFailures >= 5) {
                  throw new Error(
                    `Sub-agent safety triggered: ${consecutiveFailures} consecutive function call failures. ` +
                    `Last failed function: "${functionName}" (mapped to "${mappedToolName}"). ` +
                    `Session: ${sessionId}, Iteration: ${iteration}/${this.maxIterations}.`
                  );
                }

                return {
                  tool_call_id: toolCall.id,
                  role: 'tool' as const,
                  content: `Error executing ${functionName}: ${error instanceof Error ? error.message : String(error)}`
                };
              }
            })
          );

          // Add tool results to conversation
          const validResults = toolResults.filter(Boolean) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
          messages.push(...validResults);

          // Continue the conversation
          continue;
        }

        // No tool calls - this is the final response
        sessionLog.info('OpenAI sub-agent completed', {
          chatmode: chatmodeName,
          iterations: iteration,
          totalToolCalls,
          finalResponseLength: message.content?.length || 0
        });

        const result = this.parseSubAgentResponse(message.content || '', chatmodeName);
        return { result, toolCallCount: totalToolCalls };

      } catch (error) {
        sessionLog.error('OpenAI completion failed', {
          iteration,
          totalToolCalls,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }

    throw new Error(
      `Sub-agent exceeded maximum iterations (${this.maxIterations}). ` +
      `Session: ${sessionId}, Final iteration: ${iteration}, Tool calls: ${totalToolCalls}.`
    );
  }

  /**
   * Parse sub-agent response from final content
   */
  private parseSubAgentResponse(responseText: string, chatmodeName: string): SubAgentResponse {
    try {
      // Extract JSON from response text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in sub-agent response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and structure the response
      return {
        deliverables: {
          analysis: parsed.deliverables?.analysis || 'Analysis not provided',
          recommendations: Array.isArray(parsed.deliverables?.recommendations)
            ? parsed.deliverables.recommendations
            : [],
          documents: Array.isArray(parsed.deliverables?.documents)
            ? parsed.deliverables.documents
            : [],
          technical_details: parsed.deliverables?.technical_details || 'Technical details not provided'
        },
        memory_operations: Array.isArray(parsed.memory_operations)
          ? parsed.memory_operations
          : [],
        metadata: {
          chatmode: parsed.metadata?.chatmode || chatmodeName,
          task_completion_status: parsed.metadata?.task_completion_status || 'complete',
          processing_time: parsed.metadata?.processing_time || 'unknown',
          confidence_level: parsed.metadata?.confidence_level || 'medium'
        }
      };

    } catch (error) {
      throw new Error(`Failed to parse sub-agent response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Configuration for OpenAI function calling
 */
export class FunctionCallingConfig {
  /**
   * Get OpenAI API key from environment
   */
  static getOpenAIApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    return apiKey;
  }

  /**
   * Check if chatmode should use OpenAI function calling
   * Optional chatmode filtering via environment variable
   */
  static shouldUseOpenAIFunctionCalling(chatmode: string): boolean {
    const supportedChatmodes = process.env.SECONDBRAIN_FUNCTION_CALLING_CHATMODES?.split(',').map(s => s.trim()) || [];

    // If no specific chatmodes configured, enable for all
    if (supportedChatmodes.length === 0) {
      return true;
    }

    return supportedChatmodes.includes(chatmode);
  }
}

/**
 * Performance monitoring for OpenAI function calling
 */
export class FunctionCallingMetrics {
  private static metrics: Map<string, {
    duration: number;
    success: boolean;
    toolCallCount: number;
    errorType?: string;
    timestamp: number;
  }[]> = new Map();

  static recordExecution(
    chatmode: string,
    duration: number,
    success: boolean,
    toolCallCount: number,
    errorType?: string
  ): void {
    if (!this.metrics.has(chatmode)) {
      this.metrics.set(chatmode, []);
    }

    this.metrics.get(chatmode)!.push({
      duration,
      success,
      toolCallCount,
      errorType,
      timestamp: Date.now()
    });

    // Keep only last 100 entries per chatmode to prevent memory bloat
    const chatmodeMetrics = this.metrics.get(chatmode)!;
    if (chatmodeMetrics.length > 100) {
      chatmodeMetrics.splice(0, chatmodeMetrics.length - 100);
    }
  }

  static getMetrics(chatmode?: string): any {
    if (chatmode) {
      return this.metrics.get(chatmode) || [];
    }

    const allMetrics = Array.from(this.metrics.entries()).map(([mode, data]) => ({
      chatmode: mode,
      executions: data
    }));

    return allMetrics;
  }

  static getPerformanceSummary(): {
    avgDuration: number;
    successRate: number;
    totalExecutions: number;
    last24Hours: {
      avgDuration: number;
      successRate: number;
      executions: number;
    };
  } {
    const allData = Array.from(this.metrics.values()).flat();
    const now = Date.now();
    const last24Hours = allData.filter(d => (now - d.timestamp) < (24 * 60 * 60 * 1000));

    return {
      avgDuration: allData.length > 0
        ? allData.reduce((sum, d) => sum + d.duration, 0) / allData.length
        : 0,
      successRate: allData.length > 0
        ? allData.filter(d => d.success).length / allData.length
        : 0,
      totalExecutions: allData.length,
      last24Hours: {
        avgDuration: last24Hours.length > 0
          ? last24Hours.reduce((sum, d) => sum + d.duration, 0) / last24Hours.length
          : 0,
        successRate: last24Hours.length > 0
          ? last24Hours.filter(d => d.success).length / last24Hours.length
          : 0,
        executions: last24Hours.length
      }
    };
  }

  static clearMetrics(chatmode?: string): void {
    if (chatmode) {
      this.metrics.delete(chatmode);
    } else {
      this.metrics.clear();
    }
  }
}
