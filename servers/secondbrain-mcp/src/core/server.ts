import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';

import { SessionManager } from './session-manager.js';
import { SubagentLoader } from '../subagents/loader.js';
import { QualityValidator, RefinementManager } from '../quality/index.js';
import { AnalyticsManager } from '../analytics/analytics-manager.js';
import { MLEngine } from '../ml/ml-engine.js';
import {
  SpawnAgentArgsSchema,
  ValidateOutputArgsSchema,
  SubAgentResponseSchema,
  SubAgentResponse,
  ValidationContext,
  EnhancedQualityAssessment,
  QualityAssessment,
  SpawnAgentsParallelArgsSchema,
  ParallelAgentResult
} from '../utils/types.js';
import { parseJsonForgiving, validateSubAgentStructure } from '../utils/json-parser.js';
import { ResponseParser } from '../utils/response-parser.js';
import { config, validateConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { templateManager } from '../utils/template-manager.js';
import { getVersion, getPackageInfo } from '../utils/version.js';
import { MCPClientManager } from '../tools/mcp-client-manager.js';

export class SecondBrainServer {
  private server: Server;
  private sessionManager: SessionManager;
  private subagentLoader: SubagentLoader;
  private qualityValidator: QualityValidator;
  private refinementManager: RefinementManager;
  private analyticsManager: AnalyticsManager;
  private mlEngine: MLEngine;
  private mcpClientManager: MCPClientManager;

  constructor() {
    const packageInfo = getPackageInfo();

    this.server = new Server(
      {
        name: packageInfo.name,
        version: packageInfo.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.sessionManager = new SessionManager();
    this.subagentLoader = new SubagentLoader();
    this.qualityValidator = new QualityValidator();
    this.refinementManager = new RefinementManager(this.sessionManager, this.qualityValidator);
    this.analyticsManager = new AnalyticsManager();
    this.mlEngine = new MLEngine(this.analyticsManager);
    this.mcpClientManager = new MCPClientManager('subagent'); // Use subagent context to get filesystem tools

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Only return SecondBrain native tools - MCP tools are for internal sub-agent use only
      const nativeTools = [
          {
            name: 'spawn_agent',
            description: 'Spawn a specialized sub-agent with domain expertise',
            inputSchema: {
              type: 'object',
              properties: {
                subagent: {
                  type: 'string',
                  description: 'The subagent type to use for the sub-agent (e.g., "Security Engineer")',
                },
                task: {
                  type: 'string',
                  description: 'Detailed task description for the sub-agent',
                },
                context: {
                  type: 'string',
                  description: 'Relevant context and background information',
                },
                expected_deliverables: {
                  type: 'string',
                  description: 'What the sub-agent should produce',
                },
              },
              required: ['subagent', 'task', 'context', 'expected_deliverables'],
            },
          },
          {
            name: 'spawn_agents_parallel',
            description: 'Spawn multiple specialized sub-agents concurrently for parallel execution',
            inputSchema: {
              type: 'object',
              properties: {
                agents: {
                  type: 'array',
                  description: 'Array of agent specifications to spawn in parallel',
                  items: {
                    type: 'object',
                    properties: {
                      agent_id: {
                        type: 'string',
                        description: 'Unique identifier for this agent in the batch (for result correlation)',
                      },
                      subagent: {
                        type: 'string',
                        description: 'The subagent type to use for the sub-agent (e.g., "Security Engineer")',
                      },
                      task: {
                        type: 'string',
                        description: 'Detailed task description for the sub-agent',
                      },
                      context: {
                        type: 'string',
                        description: 'Relevant context and background information',
                      },
                      expected_deliverables: {
                        type: 'string',
                        description: 'What the sub-agent should produce',
                      },
                    },
                    required: ['agent_id', 'subagent', 'task', 'context', 'expected_deliverables'],
                  },
                  minItems: 1,
                  maxItems: 5,
                },
                coordination_context: {
                  type: 'string',
                  description: 'Overall project context for coordinating between agents (optional)',
                },
              },
              required: ['agents'],
            },
          },
          {
            name: 'list_subagents',
            description: 'List all available chatmodes for sub-agent spawning',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'validate_output',
            description: 'Validate and assess quality of sub-agent response with comprehensive quality control',
            inputSchema: {
              type: 'object',
              properties: {
                sub_agent_response: {
                  type: 'string',
                  description: 'JSON response from sub-agent to validate',
                },
                requirements: {
                  type: 'string',
                  description: 'Original task requirements',
                },
                quality_criteria: {
                  type: 'string',
                  description: 'Quality criteria for validation',
                },
                chatmode: {
                  type: 'string',
                  description: 'Chatmode used for the sub-agent (for chatmode-specific validation)',
                },
                session_id: {
                  type: 'string',
                  description: 'Session ID for refinement tracking (optional)',
                },
                enable_refinement: {
                  type: 'boolean',
                  description: 'Whether to generate refinement recommendations (default: true)',
                },
              },
              required: ['sub_agent_response', 'requirements', 'quality_criteria'],
            },
          },
          {
            name: 'get_session_stats',
            description: 'Get statistics for current session',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: {
                  type: 'string',
                  description: 'Session ID to get stats for (optional)',
                },
              },
            },
          },
          {
            name: 'get_quality_analytics',
            description: 'Get quality trends and insights for SecondBrain MCP system',
            inputSchema: {
              type: 'object',
              properties: {
                chatmode: {
                  type: 'string',
                  description: 'Filter by specific chatmode (optional)',
                },
                days: {
                  type: 'number',
                  description: 'Number of days to analyze (default: 7)',
                },
              },
            },
          },
          {
            name: 'get_performance_analytics',
            description: 'Get performance metrics and optimization insights',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Specific operation to analyze (optional)',
                },
                days: {
                  type: 'number',
                  description: 'Number of days to analyze (default: 7)',
                },
              },
            },
          },
          {
            name: 'get_system_health',
            description: 'Get current system health status and usage patterns',
            inputSchema: {
              type: 'object',
              properties: {
                include_patterns: {
                  type: 'boolean',
                  description: 'Include detailed usage patterns (default: true)',
                },
                days: {
                  type: 'number',
                  description: 'Number of days for pattern analysis (default: 7)',
                },
              },
            },
          },
          {
            name: 'generate_analytics_report',
            description: 'Generate comprehensive analytics report for SecondBrain system',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Number of days to include in report (default: 30)',
                },
                format: {
                  type: 'string',
                  enum: ['summary', 'detailed', 'executive'],
                  description: 'Report format level (default: detailed)',
                },
              },
            },
          },
          {
            name: 'predict_quality_score',
            description: 'Predict quality score for a given context using machine learning',
            inputSchema: {
              type: 'object',
              properties: {
                chatmode: {
                  type: 'string',
                  description: 'The chatmode for prediction',
                },
                requirements: {
                  type: 'string',
                  description: 'Task requirements',
                },
                quality_criteria: {
                  type: 'string',
                  description: 'Quality criteria',
                },
              },
              required: ['chatmode', 'requirements', 'quality_criteria'],
            },
          },
          {
            name: 'predict_refinement_success',
            description: 'Predict likelihood of successful refinement',
            inputSchema: {
              type: 'object',
              properties: {
                current_score: {
                  type: 'number',
                  description: 'Current quality score (0-1)',
                },
                chatmode: {
                  type: 'string',
                  description: 'The chatmode being used',
                },
                requirements: {
                  type: 'string',
                  description: 'Task requirements',
                },
                quality_criteria: {
                  type: 'string',
                  description: 'Quality criteria',
                },
                refinement_attempt: {
                  type: 'number',
                  description: 'Current refinement attempt number',
                },
              },
              required: ['current_score', 'chatmode', 'requirements', 'quality_criteria', 'refinement_attempt'],
            },
          },
          {
            name: 'get_ml_insights',
            description: 'Get machine learning insights about system performance and patterns',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_optimization_suggestions',
            description: 'Get ML-generated optimization suggestions for system improvement',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_mcp_server_stats',
            description: 'Get statistics and status information about MCP servers managed by SecondBrain',
            inputSchema: {
              type: 'object',
              properties: {
                include_tools: {
                  type: 'boolean',
                  description: 'Include detailed tool information for each server (default: true)',
                },
                server_filter: {
                  type: 'string',
                  description: 'Filter by specific server name (optional)',
                },
              },
            },
          },
        ];

        // Return only native SecondBrain tools - MCP tools are internal only
        return {
          tools: nativeTools,
        };
      });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'spawn_agent':
            return await this.handleSpawnAgent(args);

          case 'spawn_agents_parallel':
            return await this.handleSpawnAgentsParallel(args);

          case 'list_subagents':
            return await this.handleListSubagents();

          case 'validate_output':
            return await this.handleValidateOutput(args);

          case 'get_session_stats':
            return await this.handleGetSessionStats(args);

          case 'get_quality_analytics':
            return await this.handleGetQualityAnalytics(args);

          case 'get_performance_analytics':
            return await this.handleGetPerformanceAnalytics(args);

          case 'get_system_health':
            return await this.handleGetSystemHealth(args);

          case 'generate_analytics_report':
            return await this.handleGenerateAnalyticsReport(args);

          case 'predict_quality_score':
            return await this.handlePredictQualityScore(args);

          case 'predict_refinement_success':
            return await this.handlePredictRefinementSuccess(args);

          case 'get_ml_insights':
            return await this.handleGetMLInsights(args);

          case 'get_optimization_suggestions':
            return await this.handleGetOptimizationSuggestions(args);

          case 'get_mcp_server_stats':
            return await this.handleGetMCPServerStats(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error('Tool call failed', {
          tool: name,
          args,
          error: error instanceof Error ? error.message : String(error)
        });

        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async handleSpawnAgentsParallel(args: any) {
    const startTime = Date.now();

    // Validate input arguments using Zod schema
    const validatedArgs = SpawnAgentsParallelArgsSchema.parse(args);
    const { agents: validatedAgents, coordination_context } = validatedArgs;

    // Check parallel agent count limits
    if (!this.sessionManager.canSpawnParallelAgents(validatedAgents.length)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Too many parallel agents requested (${validatedAgents.length}). Maximum allowed: ${config.maxParallelAgents}. Adjust SECONDBRAIN_MAX_PARALLEL_AGENTS environment variable to increase limit.`
      );
    }

    // Create coordinator session for tracking all parallel agents
    const coordinatorSessionId = this.sessionManager.createSession(false);
    const coordinatorLog = logger.withSession(coordinatorSessionId);

    coordinatorLog.info('Starting parallel agent spawning', {
      agentCount: validatedAgents.length,
      agentIds: validatedAgents.map((a) => a.agent_id),
      coordinationContext: coordination_context?.substring(0, 100) + '...' || 'none'
    });

    try {
      // Check for duplicate agent IDs
      const agentIds = validatedAgents.map((a) => a.agent_id);
      const uniqueAgentIds = new Set(agentIds);
      if (uniqueAgentIds.size !== agentIds.length) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Duplicate agent_id values found. Each agent must have a unique agent_id'
        );
      }

      // Check coordinator session limits for total spawning capacity and depth
      if (!this.sessionManager.canSpawnAgent(coordinatorSessionId)) {
        const session = this.sessionManager.getSession(coordinatorSessionId);
        const currentDepth = session?.currentDepth || 0;

        throw new McpError(
          ErrorCode.InvalidRequest,
          `Cannot spawn parallel agents: Maximum depth exceeded (${currentDepth}/${config.maxDepth}). Adjust SECONDBRAIN_MAX_DEPTH environment variable to increase limit.`
        );
      }

      // Spawn all agents concurrently using Promise.all
      coordinatorLog.info('Spawning agents in parallel', { agentCount: validatedAgents.length });

      const spawnPromises = validatedAgents.map(async (agentSpec): Promise<ParallelAgentResult> => {
        const agentStartTime = Date.now();

        try {
          // Validate each agent's task doesn't contain tool call mentions
          const taskValidation = this.validateTaskForToolMentions(agentSpec.task, agentSpec.context || '');
          if (!taskValidation.valid) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Invalid task description for agent ${agentSpec.agent_id}: ${taskValidation.error}`
            );
          }

          // Create individual session for this agent as sub-agent
          const agentSessionId = this.sessionManager.createSession(true, coordinatorSessionId);
          const agentLog = logger.withSession(agentSessionId);

          agentLog.info('Spawning individual agent in parallel batch', {
            agentId: agentSpec.agent_id,
            subagent: agentSpec.subagent,
            coordinatorSession: coordinatorSessionId
          });

          // Get subagent definition
          const subagentDefinition = this.subagentLoader.getSubagent(agentSpec.subagent);
          const taskHash = this.sessionManager.generateTaskHash(agentSpec.task, agentSpec.context, agentSpec.subagent);

          // Track this agent call in both coordinator and individual sessions (NOT as refinements)
          this.sessionManager.trackAgentCall(coordinatorSessionId, agentSpec.subagent, taskHash, false);
          this.sessionManager.trackAgentCall(agentSessionId, agentSpec.subagent, taskHash, false);

          // Execute real sub-agent
          const response = await this.spawnRealAgent(
            subagentDefinition,
            agentSpec.task,
            agentSpec.context,
            agentSpec.expected_deliverables,
            agentSessionId
          );

          const executionTime = Date.now() - agentStartTime;

          agentLog.info('Parallel agent completed successfully', {
            agentId: agentSpec.agent_id,
            subagent: agentSpec.subagent,
            executionTime,
            status: response.metadata.task_completion_status
          });

          return {
            agent_id: agentSpec.agent_id,
            subagent: agentSpec.subagent,
            status: 'success',
            execution_time_ms: executionTime,
            session_id: agentSessionId,
            response: response
          };

        } catch (error) {
          const executionTime = Date.now() - agentStartTime;

          coordinatorLog.error('Parallel agent failed', {
            agentId: agentSpec.agent_id,
            subagent: agentSpec.subagent,
            executionTime,
            error: error instanceof Error ? error.message : String(error)
          });

          return {
            agent_id: agentSpec.agent_id,
            subagent: agentSpec.subagent,
            status: 'failed',
            execution_time_ms: executionTime,
            session_id: null,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      // Wait for all agents to complete (or fail)
      const results = await Promise.all(spawnPromises);
      const totalExecutionTime = Date.now() - startTime;

      // Analyze results
      const successfulAgents = results.filter(r => r.status === 'success');
      const failedAgents = results.filter(r => r.status === 'failed');

      coordinatorLog.info('Parallel agent spawning completed', {
        totalAgents: results.length,
        successful: successfulAgents.length,
        failed: failedAgents.length,
        totalExecutionTime,
        coordinatorSession: coordinatorSessionId
      });

      // Prepare response
      const parallelResponse = {
        parallel_execution: {
          coordinator_session_id: coordinatorSessionId,
          total_agents: results.length,
          successful_agents: successfulAgents.length,
          failed_agents: failedAgents.length,
          total_execution_time_ms: totalExecutionTime,
          coordination_context: coordination_context || null,
          completed_at: new Date().toISOString()
        },
        agent_results: results.map(result => ({
          agent_id: result.agent_id,
          subagent: result.subagent,
          status: result.status,
          execution_time_ms: result.execution_time_ms,
          session_id: result.session_id,
          ...(result.status === 'success' ? { response: result.response } : {}),
          ...(result.status === 'failed' ? { error: result.error } : {})
        })),
        summary: {
          all_successful: failedAgents.length === 0,
          partial_success: successfulAgents.length > 0 && failedAgents.length > 0,
          total_failure: successfulAgents.length === 0,
          fastest_agent: results.reduce((min, r) => r.execution_time_ms < min.execution_time_ms ? r : min, results[0]),
          slowest_agent: results.reduce((max, r) => r.execution_time_ms > max.execution_time_ms ? r : max, results[0]),
          average_execution_time_ms: Math.round(results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length)
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(parallelResponse, null, 2),
          },
        ],
      };

    } catch (error) {
      const totalExecutionTime = Date.now() - startTime;

      coordinatorLog.error('Parallel agent spawning failed completely', {
        error: error instanceof Error ? error.message : String(error),
        totalExecutionTime,
        agentCount: validatedAgents.length
      });

      throw error;
    }
  }

  /**
   * Validate task description to ensure it doesn't contain tool call mentions
   * Sub-agents have different tool capabilities, so tool names shouldn't be specified in tasks
   */
  private validateTaskForToolMentions(task: string, context: string): { valid: boolean; error?: string; detectedPatterns?: string[] } {
    const toolCallPatterns = [
      // Direct tool mentions
      /use\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+tool/gi,
      /call\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(tool|function)/gi,
      /execute\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(tool|function)/gi,
      /run\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+tool/gi,

      // Function-style mentions
      /call\s+([a-zA-Z_][a-zA-Z0-9_]*)\(/gi,
      /execute\s+([a-zA-Z_][a-zA-Z0-9_]*)\(/gi,
      /use\s+([a-zA-Z_][a-zA-Z0-9_]*)\(/gi,

      // Tool-specific language patterns
      /use\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+to\s+(read|write|search|find|analyze)/gi,
      /with\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+tool/gi,
      /via\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+tool/gi,

      // Common tool names that should never appear in tasks
      /\b(read_file|write_file|list_dir|file_search|grep_search|git_diff|git_status|memory_search|spawn_agent|validate_output)\b/gi
    ];

    const detectedPatterns: string[] = [];
    const fullText = `${task} ${context}`;

    for (const pattern of toolCallPatterns) {
      const matches = fullText.match(pattern);
      if (matches) {
        detectedPatterns.push(...matches);
      }
    }

    if (detectedPatterns.length > 0) {
      return {
        valid: false,
        error: `Task description contains tool call mentions: ${detectedPatterns.join(', ')}. ` +
               `Sub-agents have different tool capabilities. Instead of specifying tools, describe WHAT needs to be done, not HOW. ` +
               `Example: Instead of "Use the read_file tool to analyze code", say "Analyze the code structure and identify issues".`,
        detectedPatterns
      };
    }

    return { valid: true };
  }

  private async handleSpawnAgent(args: any) {
    const validatedArgs = SpawnAgentArgsSchema.parse(args);
    const { subagent, task, context, expected_deliverables } = validatedArgs;

    // Validate task doesn't contain tool call mentions
    const taskValidation = this.validateTaskForToolMentions(task, context || '');
    if (!taskValidation.valid) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid task description: ${taskValidation.error}`
      );
    }

    // Create session for this operation (assuming primary agent context)
    const sessionId = this.sessionManager.createSession(false);
    const sessionLog = logger.withSession(sessionId);

    try {
      sessionLog.info('Spawning sub-agent', { subagent, task: task.substring(0, 100) + '...' });

      // Check if we can spawn (loop protection and depth limits)
      if (!this.sessionManager.canSpawnAgent(sessionId)) {
        const session = this.sessionManager.getSession(sessionId);
        const currentDepth = session?.currentDepth || 0;

        throw new McpError(
          ErrorCode.InvalidRequest,
          `Cannot spawn agent: Maximum depth exceeded (${currentDepth}/${config.maxDepth}). Adjust SECONDBRAIN_MAX_DEPTH environment variable to increase limit.`
        );
      }

      // Get subagent definition
      const subagentDefinition = this.subagentLoader.getSubagent(subagent);
      const taskHash = this.sessionManager.generateTaskHash(task, context, subagent);

      // Track this agent call (NOT as refinement)
      this.sessionManager.trackAgentCall(sessionId, subagent, taskHash, false);

      // **REAL SUB-AGENT SPAWNING** - Implementing approved architecture v3.0.0
      // Replace simulation with actual specialist agent delegation
      const realResponse = await this.spawnRealAgent(
        subagentDefinition,
        task,
        context,
        expected_deliverables,
        sessionId
      );

      sessionLog.info('Sub-agent completed task', {
        subagent,
        status: realResponse.metadata.task_completion_status,
        confidence: realResponse.metadata.confidence_level
      });

      // Execute any tools the agent requested
      let finalResult = realResponse;
      if (realResponse.tool && realResponse.arguments) {
        try {
          sessionLog.info('Executing tool requested by agent', {
            tool: realResponse.tool,
            arguments: realResponse.arguments
          });

          const toolResult = await this.mcpClientManager.callTool(
            realResponse.tool,
            realResponse.arguments
          );

          if (toolResult.success) {
            // Return the actual tool execution results
            const content = Array.isArray(toolResult.content)
              ? toolResult.content.map(item => item.text || item.type === 'text' ? item.text : JSON.stringify(item)).join('\n')
              : String(toolResult.content);

            return {
              content: [
                {
                  type: 'text',
                  text: content,
                },
              ],
            };
          } else {
            sessionLog.error('Tool execution failed', {
              tool: realResponse.tool,
              error: toolResult.error
            });

            // FIXED: Return proper error instead of silencing it
            const errorResponse = {
              error: {
                type: 'tool_execution_failed',
                tool_name: realResponse.tool,
                message: toolResult.error || 'Tool execution failed',
                details: `The tool '${realResponse.tool}' failed to execute. Error: ${toolResult.error || 'Unknown error'}`
              },
              metadata: {
                session_id: sessionId,
                subagent: subagent,
                timestamp: new Date().toISOString()
              }
            };

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(errorResponse, null, 2),
                },
              ],
            };
          }
        } catch (error) {
          sessionLog.error('Failed to execute tool', {
            tool: realResponse.tool,
            error: error instanceof Error ? error.message : String(error)
          });

          // FIXED: Return proper error instead of silencing it
          const errorResponse = {
            error: {
              type: 'tool_execution_exception',
              tool_name: realResponse.tool,
              message: error instanceof Error ? error.message : String(error),
              details: `An exception occurred while executing tool '${realResponse.tool}': ${error instanceof Error ? error.message : String(error)}`
            },
            metadata: {
              session_id: sessionId,
              subagent: subagent,
              timestamp: new Date().toISOString()
            }
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(errorResponse, null, 2),
              },
            ],
          };
        }
      }

      // Default: return the agent's response (for non-tool responses or when tool execution fails)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(finalResult, null, 2),
          },
        ],
      };

    } catch (error) {
      sessionLog.error('Failed to spawn sub-agent', {
        subagent,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async handleListSubagents() {
    const subagents = this.subagentLoader.getAllSubagentsInfo();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            available_subagents: subagents,
            total_count: subagents.length
          }, null, 2),
        },
      ],
    };
  }

  private async handleValidateOutput(args: any) {
    const startTime = Date.now();
    const operationId = `validation_${startTime}`;

    // Start analytics operation tracking
    this.analyticsManager.startTiming(operationId, 'quality_validation');

    try {
      // Parse and validate arguments
      const validatedArgs = ValidateOutputArgsSchema.parse(args);
      const {
        sub_agent_response,
        requirements,
        quality_criteria,
        subagent = 'default',
        session_id,
        enable_refinement = true
      } = validatedArgs;

      // Use forgiving JSON parser for sub-agent response
      const parseResult = parseJsonForgiving(sub_agent_response);

      if (!parseResult.success) {
        logger.error('Failed to parse sub-agent response with forgiving parser', {
          error: parseResult.error,
          fixesAttempted: parseResult.fixesApplied,
          subagent,
          session_id,
          operationId
        });

        // End analytics operation as failed
        this.analyticsManager.endTiming(operationId, 'quality_validation', false, 'json_parse_failure');

        return this.createValidationErrorResponse(
          parseResult.error || 'JSON parsing failed',
          Date.now() - startTime,
          parseResult.fixesApplied || []
        );
      }

      logger.info('Successfully parsed sub-agent response', {
        fixesApplied: parseResult.fixesApplied || [],
        subagent,
        session_id,
        operationId
      });

      // Validate basic structure
      const structureValidation = validateSubAgentStructure(parseResult.data);
      if (!structureValidation.valid) {
        logger.warn('Sub-agent response has structural issues', {
          issues: structureValidation.issues,
          subagent,
          session_id,
          operationId
        });
      }

      // Try to validate with Zod schema, but be forgiving if it fails
      let validatedResponse: SubAgentResponse;
      try {
        validatedResponse = SubAgentResponseSchema.parse(parseResult.data);
      } catch (zodError) {
        logger.warn('Zod validation failed, using forgiving validation', {
          zodError: zodError instanceof Error ? zodError.message : String(zodError),
          subagent,
          session_id,
          operationId
        });

        // Create a valid response structure from the parsed data
        validatedResponse = this.createValidSubAgentResponse(parseResult.data, subagent);
      }

      // Create validation context
      const context: ValidationContext = {
        subagent,
        requirements,
        qualityCriteria: quality_criteria,
        sessionHistory: session_id ? this.sessionManager.getSession(session_id) || undefined : undefined
      };

      // Perform enhanced quality validation
      const enhancedAssessment = await this.qualityValidator.validateResponse(validatedResponse, context);

      // Record analytics event for this validation
      this.analyticsManager.recordValidationEvent(
        enhancedAssessment,
        context,
        session_id,
        operationId
      );

      // ML Learning: Let ML engine learn from this validation result
      try {
        await this.mlEngine.learnFromValidation(context, enhancedAssessment);
      } catch (mlError) {
        // Log but don't fail validation if ML learning fails
        logger.warn('ML learning failed for validation', {
          error: mlError instanceof Error ? mlError.message : String(mlError),
          subagent,
          session_id,
          operationId
        });
      }

      // Check if refinement is needed and enabled
      let refinementInfo = null;
      if (enable_refinement && session_id) {
        const needsRefinement = this.refinementManager.needsRefinement(enhancedAssessment, context, session_id);

        if (needsRefinement) {
          // Track refinement attempt
          const refinementState = this.refinementManager.trackRefinementAttempt(
            session_id,
            subagent,
            enhancedAssessment.overallScore,
            'Quality threshold not met'
          );

          // Record refinement event in analytics
          this.analyticsManager.recordRefinementEvent(
            session_id,
            subagent,
            enhancedAssessment.overallScore,
            enhancedAssessment.overallScore + 0.1, // Simulate potential improvement
            false // Not yet successful, just recording the attempt
          );

          // Generate refinement prompt
          const refinementPrompt = this.refinementManager.generateRefinementPrompt(
            enhancedAssessment,
            context,
            requirements,
            validatedResponse
          );

          refinementInfo = {
            needs_refinement: true,
            refinement_prompt: refinementPrompt,
            attempt_number: refinementState.attemptNumber,
            quality_trend: refinementState.qualityTrend,
            max_attempts: 3 // Could be made configurable
          };
        } else {
          refinementInfo = {
            needs_refinement: false,
            reason: enhancedAssessment.passed ? 'Quality threshold met' : 'Maximum refinement attempts reached or refinement unlikely to help'
          };
        }
      }      // Create comprehensive validation result
      const validationResult = {
        // Enhanced quality assessment
        enhanced_quality: {
          overall_score: enhancedAssessment.overallScore,
          quality_threshold: enhancedAssessment.qualityThreshold,
          passed: enhancedAssessment.passed,
          confidence: enhancedAssessment.confidence,
          processing_time_ms: enhancedAssessment.processingTime,
          can_refine: enhancedAssessment.canRefine
        },

        // Detailed quality breakdown
        quality_details: {
          category_scores: enhancedAssessment.categories,
          rule_results: enhancedAssessment.ruleResults.map(result => ({
            category: result.category,
            passed: result.passed,
            score: result.score,
            severity: result.severity,
            feedback: result.feedback
          })),
          critical_issues: enhancedAssessment.criticalIssues,
          recommendations: enhancedAssessment.recommendations,
          refinement_suggestions: enhancedAssessment.refinementSuggestions
        },

        // Legacy compatibility (simplified format)
        legacy_quality: this.createLegacyAssessment(enhancedAssessment),

        // Format validation details
        format_validation: {
          valid: true,
          deliverables_present: Object.keys(validatedResponse.deliverables).length > 0,
          memory_operations_count: validatedResponse.memory_operations?.length || 0,
          metadata_complete: validatedResponse.metadata &&
                            validatedResponse.metadata.task_completion_status &&
                            validatedResponse.metadata.confidence_level
        },

        // Refinement information (if enabled)
        ...(refinementInfo && { refinement: refinementInfo }),

        // Processing metadata
        validation_metadata: {
          validation_time_ms: Date.now() - startTime,
          chatmode_used: subagent,
          session_id: session_id || null,
          validator_version: '3.0',
          rules_applied: enhancedAssessment.ruleResults.length
        }
      };

      logger.info('Enhanced quality validation completed', {
        subagent,
        session_id,
        overall_score: enhancedAssessment.overallScore,
        passed: enhancedAssessment.passed,
        needs_refinement: refinementInfo?.needs_refinement || false,
        processing_time: Date.now() - startTime
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validationResult, null, 2),
          },
        ],
      };

    } catch (parseError) {
      logger.error('Quality validation failed during parsing', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        processing_time: Date.now() - startTime
      });

      // Return error result with legacy compatibility
      const errorResult = {
        enhanced_quality: {
          overall_score: 0,
          passed: false,
          confidence: 'low' as const,
          processing_time_ms: Date.now() - startTime,
          can_refine: false
        },
        quality_details: {
          category_scores: {},
          rule_results: [],
          critical_issues: [`Validation failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
          recommendations: ['Fix response format and try again'],
          refinement_suggestions: []
        },
        legacy_quality: {
          valid: false,
          quality_score: 0,
          validation_details: {
            format_valid: false,
            error: parseError instanceof Error ? parseError.message : String(parseError)
          },
          recommendations: ['Fix response format and retry validation']
        },
        format_validation: {
          valid: false,
          error: parseError instanceof Error ? parseError.message : String(parseError)
        },
        validation_metadata: {
          validation_time_ms: Date.now() - startTime,
          validator_version: '3.0',
          rules_applied: 0
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResult, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Create a validation error response when JSON parsing fails
   */
  private createValidationErrorResponse(error: string, processingTime: number, fixesAttempted: string[]) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            enhanced_quality: {
              overall_score: 0,
              passed: false,
              confidence: 'low' as const,
              processing_time_ms: processingTime,
              can_refine: false
            },
            quality_details: {
              category_scores: {},
              rule_results: [],
              critical_issues: [`JSON parsing failed: ${error}`],
              recommendations: ['Fix response format and try again'],
              refinement_suggestions: [],
              fixes_attempted: fixesAttempted
            },
            legacy_quality: {
              valid: false,
              quality_score: 0,
              validation_details: {
                format_valid: false,
                error: error
              },
              recommendations: ['Fix response format and retry validation']
            },
            format_validation: {
              valid: false,
              error: error,
              fixes_attempted: fixesAttempted
            },
            validation_metadata: {
              validation_time_ms: processingTime,
              validator_version: '3.0-forgiving',
              rules_applied: 0,
              parsing_strategy: 'forgiving_parser_failed'
            }
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Create a valid SubAgentResponse from partially parsed data
   */
  private createValidSubAgentResponse(data: any, subagent: string): SubAgentResponse {
    // Ensure all required fields exist with reasonable defaults
    const deliverables = data.deliverables || {};
    const memory_operations = Array.isArray(data.memory_operations) ? data.memory_operations : [];
    const metadata = data.metadata || {};

    return {
      deliverables: {
        analysis: deliverables.analysis || 'Analysis extracted from malformed response',
        recommendations: Array.isArray(deliverables.recommendations) ? deliverables.recommendations : [],
        documents: Array.isArray(deliverables.documents) ? deliverables.documents : [],
        technical_details: deliverables.technical_details || 'Technical details not properly formatted',
        ...deliverables // Include any other properties
      },
      memory_operations: memory_operations,
      metadata: {
        subagent: metadata.subagent || subagent,
        task_completion_status: metadata.task_completion_status || 'partial',
        processing_time: metadata.processing_time || 'parsing_recovery',
        confidence_level: metadata.confidence_level || 'low'
      }
    };
  }

  private async handleGetSessionStats(args: any) {
    const sessionId = args?.session_id;

    if (sessionId) {
      const stats = this.sessionManager.getSessionStats(sessionId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(stats || { error: 'Session not found' }, null, 2),
          },
        ],
      };
    } else {
      const globalStats = this.sessionManager.getGlobalStats();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(globalStats, null, 2),
          },
        ],
      };
    }
  }

  private async handleGetMCPServerStats(args: any) {
    try {
      const { include_tools = true, server_filter } = args || {};

      // Get server status information
      const serverStatus = this.mcpClientManager.getServerStatus();
      const discoveredTools = this.mcpClientManager.getDiscoveredTools();
      const safeTools = this.mcpClientManager.getSafeTools();

      // Filter servers if requested
      const filteredStatus = server_filter
        ? serverStatus.filter(server => server.name === server_filter)
        : serverStatus;

      // Group tools by server
      const toolsByServer = discoveredTools.reduce((acc, tool) => {
        if (!acc[tool.serverId]) {
          acc[tool.serverId] = [];
        }
        acc[tool.serverId].push(tool);
        return acc;
      }, {} as Record<string, any[]>);

      // Create comprehensive stats
      const mcpStats = {
        summary: {
          total_servers_configured: serverStatus.length,
          connected_servers: serverStatus.filter(s => s.connected).length,
          failed_servers: serverStatus.filter(s => !s.connected).length,
          total_tools_discovered: discoveredTools.length,
          safe_tools_available: safeTools.length,
          unsafe_tools_filtered: discoveredTools.length - safeTools.length,
        },

        servers: filteredStatus.map(server => ({
          name: server.name,
          id: server.id,
          connected: server.connected,
          last_connected: server.lastConnected,
          last_error: server.lastError,
          tools_count: server.toolCount,
          safe_tools_count: server.safeToolCount,
          ...(include_tools && {
            tools: toolsByServer[server.id]?.map(tool => ({
              name: tool.name,
              description: tool.description,
              safe: safeTools.some(safeTool => safeTool.name === tool.name && safeTool.serverId === tool.serverId)
            })) || []
          })
        })),

        tool_statistics: {
          tools_by_server: Object.keys(toolsByServer).map(serverId => {
            const server = serverStatus.find(s => s.id === serverId);
            return {
              server_name: server?.name || 'unknown',
              server_id: serverId,
              tool_count: toolsByServer[serverId].length,
              safe_tools: toolsByServer[serverId].filter(tool =>
                safeTools.some(safeTool => safeTool.name === tool.name && safeTool.serverId === tool.serverId)
              ).length
            };
          }),

          most_used_tools: [], // TODO: Add usage tracking
          error_rates: [], // TODO: Add error tracking
        },

        configuration: {
          context_type: 'main', // SecondBrain main server context
          unsafe_tools_blocked: true,
          discovery_completed: true,
        },

        metadata: {
          generated_at: new Date().toISOString(),
          include_tools: include_tools,
          server_filter: server_filter || null,
          stats_version: '1.0'
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(mcpStats, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to get MCP server stats', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to retrieve MCP server statistics',
              details: error instanceof Error ? error.message : String(error),
              summary: {
                total_servers_configured: 0,
                connected_servers: 0,
                failed_servers: 0,
                total_tools_discovered: 0,
                safe_tools_available: 0
              }
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * REAL SUB-AGENT SPAWNING - Implementing Approved Architecture v3.0.0
   * Replaces simulation with actual specialist agent delegation
   */
  private async spawnRealAgent(
    chatmodeDefinition: any,
    task: string,
    context: string,
    expectedDeliverables: string,
    sessionId: string
  ): Promise<SubAgentResponse> {
    const sessionLog = logger.withSession(sessionId);

    sessionLog.info('Starting real sub-agent execution', {
      chatmode: chatmodeDefinition.name,
      taskLength: task.length,
      contextLength: context.length
    });

    // Create sub-agent instruction wrapper as per approved architecture
    const wrappedInstructions = this.createSubAgentWrapper(
      chatmodeDefinition,
      task,
      context,
      expectedDeliverables,
      sessionId
    );

    // Execute real sub-agent using AI model with domain expertise
    const response = await this.executeRealSubAgent(
      wrappedInstructions,
      chatmodeDefinition,
      sessionId
    );

    sessionLog.info('Real sub-agent execution completed', {
      chatmode: chatmodeDefinition.name,
      memoryOperations: response.memory_operations?.length || 0,
      recommendationsCount: response.deliverables.recommendations?.length || 0,
      completionStatus: response.metadata.task_completion_status
    });

    return response;
  }

  /**
   * Create sub-agent wrapper as per approved architecture v3.0.0
   * Implements universal wrapper with selective tool access control
   * Uses well-optimized subagent content directly (no runtime optimization needed)
   */
  private createSubAgentWrapper(
    chatmodeDefinition: any,
    task: string,
    context: string,
    expectedDeliverables: string,
    sessionId: string
  ): string {
    // Use the already-optimized subagent content directly
    const subagentInstructions = chatmodeDefinition.content || '';
    const chatmodeName = chatmodeDefinition.name || 'Specialist';

    // Get actual available tools from MCP servers dynamically
    const safeTools = this.mcpClientManager.getSafeTools();
    const discoveredTools = this.mcpClientManager.getDiscoveredTools();

    // Filter out SecondBrain MCP tools as per approved architecture
    const availableTools = safeTools.filter(tool =>
      !this.isSecondBrainMCPTool(tool.name)
    );

    // Create comprehensive tool information with descriptions and schemas
    const toolDefinitions = availableTools.map(tool => {
      // Find the full tool definition with schema
      const fullTool = discoveredTools.find(dt => dt.name === tool.name && dt.serverId === tool.serverId);
      return {
        name: tool.name,
        description: tool.description || fullTool?.description || 'No description available',
        inputSchema: fullTool?.inputSchema || { type: 'object', properties: {} },
        serverId: tool.serverId
      };
    });

    // Extract original tools from chatmode and filter them too
    const originalTools = chatmodeDefinition.tools || [];
    const allowedChatmodeTools = originalTools.filter((tool: string) =>
      !this.isSecondBrainMCPTool(tool)
    );

    // Create tool names list for backwards compatibility
    const toolNames = [...new Set([...availableTools.map(t => t.name), ...allowedChatmodeTools])];

    // Create enhanced tool documentation with common patterns
    const enhancedToolDocs = this.createEnhancedToolDocumentation(toolDefinitions, toolNames);

    try {
      return templateManager.render('sub-agent-system-prompt', {
        chatmodeName,
        sessionId,
        maxTotalCalls: config.maxTotalCalls,
        enhancedToolDocs,
        baseInstructions: subagentInstructions,
        task,
        context,
        expectedDeliverables
      });
    } catch (error) {
      logger.error('Failed to render sub-agent system prompt template', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Template failure should cause task failure, not fallback
      throw new Error(`Sub-agent template rendering failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute real sub-agent using AI model with chatmode expertise
   * Implements actual AI delegation rather than simulation
   */
  private async executeRealSubAgent(
    instructions: string,
    chatmodeDefinition: any,
    sessionId: string
  ): Promise<SubAgentResponse> {
    const sessionLog = logger.withSession(sessionId);

    try {
      // Use OpenRouter API for all sub-agent execution
      if (config.openrouterApiKey) {
        return await this.executeWithOpenRouter(instructions, chatmodeDefinition, sessionId);
      }

      // Fallback to mock if no API key
      sessionLog.warn('No OpenRouter API key available, using mock response');
      return {
        deliverables: {
          analysis: 'Mock sub-agent response (no API configuration available)',
          recommendations: ['Configure OpenRouter API key'],
          documents: []
        },
        metadata: {
          subagent: chatmodeDefinition.name,
          task_completion_status: 'failed',
          processing_time: '100ms',
          confidence_level: 'low'
        }
      };
    } catch (error) {
      sessionLog.error('Sub-agent execution failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        deliverables: {
          analysis: `Sub-agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          recommendations: ['Check OpenRouter API configuration', 'Verify model compatibility'],
          documents: []
        },
        metadata: {
          subagent: chatmodeDefinition.name,
          task_completion_status: 'failed',
          processing_time: '0ms',
          confidence_level: 'low'
        }
      };
    }
  }

  /**
   * Execute sub-agent with OpenRouter using function calling for tool access
   */
  private async executeWithOpenRouter(
    instructions: string,
    chatmodeDefinition: any,
    sessionId: string
  ): Promise<SubAgentResponse> {
    const sessionLog = logger.withSession(sessionId);
    const openai = new OpenAI({
      apiKey: config.openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1'
    });

    // Get available MCP tools for sub-agents
    const mcpTools = this.mcpClientManager.getSafeTools();
    const discoveredTools = this.mcpClientManager.getDiscoveredTools();
    const availableTools = mcpTools.map(tool => tool.name);

    sessionLog.info('Executing sub-agent via OpenRouter with MCP tool access', {
      chatmode: chatmodeDefinition.name,
      availableTools: availableTools,
      totalMCPTools: mcpTools.length,
      maxIterations: config.maxTotalCalls,
      toolDetails: mcpTools.map(t => ({ name: t.name, server: t.serverName, safe: t.safe })),
      model: config.model
    });

    // Create OpenAI function tools from MCP tools
    const functionTools: OpenAI.Chat.Completions.ChatCompletionTool[] = mcpTools.map(tool => {
      const fullTool = discoveredTools.find(dt => dt.name === tool.name && dt.serverId === tool.serverId);
      const schema = fullTool?.inputSchema || { type: 'object', properties: {} };

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description || fullTool?.description || 'No description available',
          parameters: this.convertMCPSchemaToOpenAI(schema)
        }
      };
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: instructions
      }
    ];

    let maxIterations = config.maxTotalCalls; // Configurable iteration limit for agentic workflows
    let iteration = 0;
    let consecutiveFailures = 0; // Safety counter for consecutive tool call failures

    while (iteration < maxIterations) {
      iteration++;

      const completion = await openai.chat.completions.create({
        model: config.model,
        messages,
        tools: functionTools.length > 0 ? functionTools : undefined,
        tool_choice: functionTools.length > 0 ? 'auto' : undefined,
        temperature: 0.7,
        max_tokens: 4000
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error('Empty response from OpenRouter');
      }

      // Add assistant message to conversation
      messages.push(message);

      // Check if there are tool calls to execute
      if (message.tool_calls && message.tool_calls.length > 0) {
        sessionLog.info('Processing OpenAI function calls', {
          toolCallCount: message.tool_calls.length,
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

            sessionLog.info('Executing function call', {
              functionName,
              callId: toolCall.id,
              arguments: functionArgs,
              iteration
            });

            try {
              const result = await this.mcpClientManager.callTool(functionName, functionArgs);

              consecutiveFailures = 0; // Reset on success

              sessionLog.info('Function call executed successfully', {
                tool: functionName,
                callId: toolCall.id,
                success: result.success,
                serverId: result.serverId,
                iteration
              });

              return {
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: JSON.stringify(result.success ? result.content : { error: result.error })
              };
            } catch (error) {
              consecutiveFailures++;
              const errorMessage = error instanceof Error ? error.message : String(error);

              sessionLog.error('Function call failed', {
                tool: functionName,
                callId: toolCall.id,
                error: errorMessage,
                consecutiveFailures,
                iteration
              });

              return {
                tool_call_id: toolCall.id,
                role: 'tool' as const,
                content: JSON.stringify({ error: errorMessage })
              };
            }
          })
        );

        // Add tool results to conversation
        toolResults.forEach(result => {
          if (result) {
            messages.push(result);
          }
        });

        // Safety check for consecutive failures
        if (consecutiveFailures >= 3) {
          const errorMessage = `Sub-agent exceeded maximum consecutive tool call failures (${consecutiveFailures}). Terminating to prevent infinite loops.`;
          sessionLog.error(errorMessage, { iteration, consecutiveFailures });

          // Return proper SubAgentResponse structure
          return {
            deliverables: {
              analysis: `${chatmodeDefinition.name} execution failed due to consecutive tool failures: ${errorMessage}`,
              recommendations: ['Review tool usage patterns', 'Check tool argument formats', 'Verify tool availability'],
              documents: ['Error log available']
            },
            memory_operations: [],
            metadata: {
              subagent: chatmodeDefinition.name,
              task_completion_status: 'failed',
              processing_time: `${iteration} iterations`,
              confidence_level: 'low'
            }
          };
        }

        // Continue the conversation after tool execution
        continue;
      }

      // No tool calls - this should be the final response
      const content = message.content || '';
      sessionLog.info('Sub-agent completed task', {
        chatmode: chatmodeDefinition.name,
        iterations: iteration,
        finalResponseLength: content.length
      });

      return await this.parseSubAgentResponse(content, chatmodeDefinition.name);
    }

    // Enhanced error message with debugging information
    sessionLog.error('Sub-agent exceeded iteration limit', {
      chatmode: chatmodeDefinition.name,
      maxIterations,
      finalIteration: iteration,
      consecutiveFailures,
      instructionsPreview: instructions.substring(0, 200) + '...',
      lastMessagePreview: (() => {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage?.content) return 'No messages';
        if (typeof lastMessage.content === 'string') {
          return lastMessage.content.substring(0, 200) + '...';
        }
        return 'Non-string content';
      })()
    });

    throw new Error(
      `Sub-agent (${chatmodeDefinition.name}) exceeded maximum iterations (${maxIterations}/${maxIterations}). ` +
      `This typically indicates the agent is stuck in a tool-calling loop or complex analysis. ` +
      `Final state: ${consecutiveFailures} consecutive failures. ` +
      `Solutions: 1) Increase SECONDBRAIN_MAX_CALLS environment variable (current: ${maxIterations}), ` +
      `2) Simplify the task description, 3) Check if required tools are available. ` +
      `For complex analysis tasks, consider setting SECONDBRAIN_MAX_CALLS=100 or higher. ` +
      `Debug info: Session ${sessionId}, ${iteration} iterations completed.`
    );
  }

  /**
   * Parse sub-agent response from AI model output with retry support
   */
  private async parseSubAgentResponse(responseText: string, chatmodeName: string): Promise<SubAgentResponse> {
    try {
      // Use centralized parser with retry mechanism
      return await ResponseParser.parseWithRetry(responseText, chatmodeName, {
        maxRetries: 1 // Server-level parsing uses fewer retries since spawner handles most cases
      });
    } catch (error) {
      logger.error('Server-level response parsing failed completely', {
        chatmode: chatmodeName,
        error: error instanceof Error ? error.message : String(error),
        responseLength: responseText.length
      });

      // Final fallback - this should rarely happen with the new parser
      return {
        deliverables: {
          analysis: `${chatmodeName} response parsing failed completely`,
          recommendations: ['Check response format and retry'],
          documents: ['Raw response preserved in logs']
        },
        memory_operations: [],
        metadata: {
          subagent: chatmodeName,
          task_completion_status: 'failed',
          processing_time: 'parsing_error',
          confidence_level: 'low'
        }
      };
    }
  }

  /**
   * Create example arguments from JSON schema for tool documentation
   */
  private createExampleFromSchema(schema: any): Record<string, any> {
    const example: Record<string, any> = {};

    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties as Record<string, any>)) {
        switch (propSchema.type) {
          case 'string':
            example[propName] = propSchema.example || `example_${propName}`;
            break;
          case 'number':
            example[propName] = propSchema.example || 1;
            break;
          case 'boolean':
            example[propName] = propSchema.example || true;
            break;
          case 'array':
            example[propName] = propSchema.example || [];
            break;
          case 'object':
            example[propName] = propSchema.example || {};
            break;
          default:
            example[propName] = propSchema.example || `${propName}_value`;
        }
      }
    }

    return example;
  }

  /**
   * Check if tool is a SecondBrain MCP tool (blocked for sub-agents)
   */
  private isSecondBrainMCPTool(tool: string): boolean {
    const secondBrainTools = [
      'spawn_agent',
      'validate_output',
      'list_subagents',
      'get_session_stats',
      'get_quality_analytics',
      'get_performance_analytics',
      'get_system_health',
      'generate_analytics_report',
      'predict_quality_score',
      'predict_refinement_success',
      'get_ml_insights',
      'get_optimization_suggestions'
    ];

    return secondBrainTools.includes(tool);
  }

  /**
   * Create helpful error message for tool failures
   */
  private createToolErrorMessage(
    requestedTool: string,
    error: string,
    availableTools: string[]
  ): string {
    // Check if this is a "tool not found" error
    const isToolNotFound = error.includes('Tool not found') || error.includes('-32601');

    if (isToolNotFound) {
      // Find similar tool names using simple string matching
      const similarTools = availableTools.filter(tool =>
        tool.toLowerCase().includes(requestedTool.toLowerCase()) ||
        requestedTool.toLowerCase().includes(tool.toLowerCase()) ||
        this.calculateStringSimilarity(tool, requestedTool) > 0.5
      );

      let message = `Tool "${requestedTool}" is not available. `;

      if (similarTools.length > 0) {
        message += `Did you mean: ${similarTools.slice(0, 3).join(', ')}? `;
      }

      message += `Available tools: ${availableTools.join(', ')}.`;

      if (availableTools.includes('read_file')) {
        message += ` For reading files, use "read_file".`;
      }
      if (availableTools.includes('list_dir')) {
        message += ` For listing directories, use "list_dir".`;
      }
      if (availableTools.includes('file_search')) {
        message += ` For finding files, use "file_search".`;
      }

      return message;
    } else {
      // Other tool execution errors
      return `Tool "${requestedTool}" failed: ${error}. Available tools: ${availableTools.join(', ')}.`;
    }
  }

  /**
   * Create enhanced tool documentation with common patterns and examples
   */
  private createEnhancedToolDocumentation(
    toolDefinitions: any[],
    toolNames: string[]
  ): string {
    let documentation = `AVAILABLE TOOLS (${toolNames.length} tools available):\n\n`;

    // Categorize tools for better organization
    const fileTools = toolDefinitions.filter(t =>
      t.name.includes('file') || t.name.includes('read') || t.name.includes('write')
    );
    const searchTools = toolDefinitions.filter(t =>
      t.name.includes('search') || t.name.includes('grep') || t.name.includes('find')
    );
    const gitTools = toolDefinitions.filter(t =>
      t.name.includes('git')
    );
    const memoryTools = toolDefinitions.filter(t =>
      t.name.includes('memory')
    );
    const otherTools = toolDefinitions.filter(t =>
      !fileTools.includes(t) && !searchTools.includes(t) &&
      !gitTools.includes(t) && !memoryTools.includes(t)
    );

    // File Operations Section
    if (fileTools.length > 0) {
      documentation += `📁 FILE OPERATIONS:\n`;
      fileTools.forEach(tool => {
        documentation += `• ${tool.name}: ${tool.description}\n`;
        if (tool.inputSchema.properties) {
          const example = this.createExampleFromSchema(tool.inputSchema);
          documentation += `  Example: {"tool": "${tool.name}", "arguments": ${JSON.stringify(example)}}\n`;
        }
      });
      documentation += `\n`;
    }

    // Search Operations Section
    if (searchTools.length > 0) {
      documentation += `🔍 SEARCH OPERATIONS:\n`;
      searchTools.forEach(tool => {
        documentation += `• ${tool.name}: ${tool.description}\n`;
        if (tool.inputSchema.properties) {
          const example = this.createExampleFromSchema(tool.inputSchema);
          documentation += `  Example: {"tool": "${tool.name}", "arguments": ${JSON.stringify(example)}}\n`;
        }
      });
      documentation += `\n`;
    }

    // Git Operations Section
    if (gitTools.length > 0) {
      documentation += `📝 VERSION CONTROL:\n`;
      gitTools.forEach(tool => {
        documentation += `• ${tool.name}: ${tool.description}\n`;
        if (tool.inputSchema.properties) {
          const example = this.createExampleFromSchema(tool.inputSchema);
          documentation += `  Example: {"tool": "${tool.name}", "arguments": ${JSON.stringify(example)}}\n`;
        }
      });
      documentation += `\n`;
    }

    // Memory Operations Section
    if (memoryTools.length > 0) {
      documentation += `🧠 MEMORY OPERATIONS:\n`;
      memoryTools.forEach(tool => {
        documentation += `• ${tool.name}: ${tool.description}\n`;
        if (tool.inputSchema.properties) {
          const example = this.createExampleFromSchema(tool.inputSchema);
          documentation += `  Example: {"tool": "${tool.name}", "arguments": ${JSON.stringify(example)}}\n`;
        }
      });
      documentation += `\n`;
    }

    // Other Tools Section
    if (otherTools.length > 0) {
      documentation += `🛠️ OTHER TOOLS:\n`;
      otherTools.forEach(tool => {
        documentation += `• ${tool.name}: ${tool.description}\n`;
        if (tool.inputSchema.properties) {
          const example = this.createExampleFromSchema(tool.inputSchema);
          documentation += `  Example: {"tool": "${tool.name}", "arguments": ${JSON.stringify(example)}}\n`;
        }
      });
      documentation += `\n`;
    }

    documentation += `IMPORTANT: Use EXACT tool names from the list above. If you try to use a tool that doesn't exist, you will receive an error message with suggestions.\n\n`;

    return documentation;
  }

  /**
   * Calculate string similarity between two strings (0-1 scale)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create a legacy-compatible quality assessment for backward compatibility
   */
  private createLegacyAssessment(enhancedAssessment: EnhancedQualityAssessment): QualityAssessment {
    return {
      score: enhancedAssessment.overallScore,
      passed: enhancedAssessment.passed,
      issues: enhancedAssessment.criticalIssues,
      recommendations: enhancedAssessment.recommendations,
      confidence: enhancedAssessment.confidence
    };
  }

  /**
   * Handle quality analytics requests
   */
  private async handleGetQualityAnalytics(args: any) {
    try {
      const { subagent, days = 7 } = args;

      const qualityTrends = this.analyticsManager.getQualityTrends(subagent, days);
      const qualityInsights = this.analyticsManager.getQualityInsights(subagent);
      const subagentComparison = subagent ? {} : this.analyticsManager.compareSubagentPerformance();

      const result = {
        quality_trends: qualityTrends,
        insights: qualityInsights,
        ...(Object.keys(subagentComparison).length > 0 && { subagent_comparison: subagentComparison }),
        analytics_metadata: {
          analysis_period_days: days,
          subagent_filter: subagent || 'all',
          generated_at: new Date().toISOString(),
          analytics_version: '1.0'
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to get quality analytics', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to retrieve quality analytics',
              details: error instanceof Error ? error.message : String(error)
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Handle performance analytics requests
   */
  private async handleGetPerformanceAnalytics(args: any) {
    try {
      const { operation, days = 7 } = args;

      const performanceInsights = this.analyticsManager.getPerformanceInsights(operation, days);
      const systemHealth = this.analyticsManager.getSystemHealth();

      const result = {
        performance_insights: performanceInsights,
        system_health: systemHealth,
        analytics_metadata: {
          analysis_period_days: days,
          operation_filter: operation || 'all',
          generated_at: new Date().toISOString(),
          analytics_version: '1.0'
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to get performance analytics', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to retrieve performance analytics',
              details: error instanceof Error ? error.message : String(error)
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Handle system health requests
   */
  private async handleGetSystemHealth(args: any) {
    try {
      const { include_patterns = true, days = 7 } = args;

      const systemHealth = this.analyticsManager.getSystemHealth();
      const usagePatterns = include_patterns ? this.analyticsManager.getUsagePatterns(undefined, days) : [];

      const result = {
        system_health: systemHealth,
        ...(include_patterns && { usage_patterns: usagePatterns }),
        analytics_metadata: {
          includes_patterns: include_patterns,
          pattern_analysis_days: include_patterns ? days : null,
          generated_at: new Date().toISOString(),
          analytics_version: '1.0'
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to get system health', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to retrieve system health',
              details: error instanceof Error ? error.message : String(error)
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Handle analytics report generation requests
   */
  private async handleGenerateAnalyticsReport(args: any) {
    try {
      const { days = 30, format = 'detailed' } = args;

      // Generate comprehensive report
      const fullReport = this.analyticsManager.generateAnalyticsReport(days);

      // Adjust report based on format
      let result;
      switch (format) {
        case 'executive':
          result = {
            executive_summary: fullReport.executiveSummary,
            key_insights: fullReport.qualityReport.insights.slice(0, 5),
            system_status: fullReport.systemStatus,
            generated_at: fullReport.generatedAt,
            report_format: 'executive'
          };
          break;

        case 'summary':
          result = {
            executive_summary: fullReport.executiveSummary,
            quality_overview: fullReport.qualityReport.overview,
            system_status: fullReport.systemStatus,
            generated_at: fullReport.generatedAt,
            report_format: 'summary'
          };
          break;

        case 'detailed':
        default:
          result = {
            ...fullReport,
            report_format: 'detailed'
          };
          break;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to generate analytics report', {
        error: error instanceof Error ? error.message : String(error),
        format: args?.format,
        days: args?.days
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to generate analytics report',
              details: error instanceof Error ? error.message : String(error),
              requested_format: args?.format || 'detailed',
              requested_days: args?.days || 30
            }, null, 2),
          },
        ],
      };
    }
  }

  // =============================================================================
  // Machine Learning Tool Handlers
  // =============================================================================

  private async handlePredictQualityScore(args: any): Promise<any> {
    try {
      const context: ValidationContext = {
        subagent: args.subagent,
        requirements: args.requirements,
        qualityCriteria: args.quality_criteria
      };

      const prediction = await this.mlEngine.predictQualityScore(context);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              predicted_score: prediction.predictedScore,
              confidence: prediction.confidence,
              prediction_basis: prediction.predictionBasis,
              risk_factors: prediction.riskFactors,
              success_factors: prediction.successFactors,
              chatmode: context.subagent,
              threshold: context.subagent === 'Security Engineer' ? 0.80 : 0.75,
              likely_to_pass: prediction.predictedScore >= (context.subagent === 'Security Engineer' ? 0.80 : 0.75)
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to predict quality score', {
        error: error instanceof Error ? error.message : String(error),
        chatmode: args?.chatmode
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to predict quality score',
              details: error instanceof Error ? error.message : String(error),
              predicted_score: 0.75, // fallback
              confidence: 0.0
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handlePredictRefinementSuccess(args: any): Promise<any> {
    try {
      const context: ValidationContext = {
        subagent: args.subagent,
        requirements: args.requirements,
        qualityCriteria: args.quality_criteria
      };

      const prediction = await this.mlEngine.predictRefinementSuccess(
        args.current_score,
        context,
        args.refinement_attempt
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success_probability: prediction.prediction,
              confidence: prediction.confidence,
              reasoning: prediction.reasoning,
              recommendation: prediction.prediction > 0.6
                ? 'Refinement likely to succeed - proceed with refinement'
                : prediction.prediction > 0.3
                  ? 'Refinement may succeed - consider refinement'
                  : 'Refinement unlikely to succeed - consider alternative approach',
              current_score: args.current_score,
              refinement_attempt: args.refinement_attempt,
              subagent: context.subagent
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to predict refinement success', {
        error: error instanceof Error ? error.message : String(error),
        chatmode: args?.subagent,
        currentScore: args?.current_score
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to predict refinement success',
              details: error instanceof Error ? error.message : String(error),
              success_probability: 0.5, // fallback
              confidence: 0.0
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handleGetMLInsights(args: any): Promise<any> {
    try {
      const insights = await this.mlEngine.getMLInsights();
      const mlStatus = this.mlEngine.getMLStatus();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ml_status: mlStatus,
              insights: insights,
              total_insights: insights.length,
              critical_insights: insights.filter(i => i.severity === 'critical').length,
              actionable_insights: insights.filter(i => i.actionRequired).length,
              generated_at: new Date().toISOString()
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to get ML insights', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to get ML insights',
              details: error instanceof Error ? error.message : String(error),
              ml_status: { enabled: false, error: 'Insights unavailable' }
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handleGetOptimizationSuggestions(args: any): Promise<any> {
    try {
      const suggestions = await this.mlEngine.generateOptimizationSuggestions();

      const categorizedSuggestions = {
        threshold_optimizations: suggestions.filter(s => s.type === 'threshold'),
        rule_weight_optimizations: suggestions.filter(s => s.type === 'rule_weight'),
        refinement_strategy_optimizations: suggestions.filter(s => s.type === 'refinement_strategy')
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              optimization_suggestions: categorizedSuggestions,
              total_suggestions: suggestions.length,
              high_confidence_suggestions: suggestions.filter(s => s.confidence > 0.8).length,
              high_impact_suggestions: suggestions.filter(s => s.expectedImprovement > 0.1).length,
              recommendations: suggestions.length > 0
                ? 'Review and consider applying high-confidence, high-impact optimizations'
                : 'No optimization opportunities identified at this time',
              generated_at: new Date().toISOString()
            }, null, 2),
          },
        ],
      };

    } catch (error) {
      logger.error('Failed to get optimization suggestions', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to get optimization suggestions',
              details: error instanceof Error ? error.message : String(error),
              optimization_suggestions: {
                threshold_optimizations: [],
                rule_weight_optimizations: [],
                refinement_strategy_optimizations: []
              }
            }, null, 2),
          },
        ],
      };
    }
  }

  async initialize(): Promise<void> {
    try {
      // Log server version and startup information
      const packageInfo = getPackageInfo();
      logger.info('Starting SecondBrain MCP Server', {
        name: packageInfo.name,
        version: packageInfo.version,
        description: packageInfo.description,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        startTime: new Date().toISOString()
      });

      // Validate configuration
      validateConfig(config);

      // Initialize MCP client manager to discover tools
      await this.mcpClientManager.initialize();

      // Initialize components
      await this.subagentLoader.initialize();

      logger.info('SecondBrain MCP Server initialized successfully', {
        version: packageInfo.version,
        subagentsLoaded: this.subagentLoader.listSubagents().length,
        sessionStorePath: config.sessionStorePath,
        maxCalls: config.maxTotalCalls,
        mcpServersConnected: this.mcpClientManager.getServerStatus().filter(s => s.connected).length,
        mcpToolsDiscovered: this.mcpClientManager.getSafeTools().length,
        readyTime: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to initialize SecondBrain MCP Server', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Convert MCP input schema to OpenAI function parameters schema
   */
  private convertMCPSchemaToOpenAI(mcpSchema: any): any {
    if (!mcpSchema || typeof mcpSchema !== 'object') {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    // Handle typical MCP schema structure
    const result: any = {
      type: mcpSchema.type || 'object',
      properties: {},
      required: mcpSchema.required || []
    };

    if (mcpSchema.properties) {
      result.properties = { ...mcpSchema.properties };
    }

    return result;
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('SecondBrain MCP Server started');
  }
}
