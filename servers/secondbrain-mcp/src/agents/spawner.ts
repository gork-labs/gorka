import { ChatmodeDefinition, SubAgentResponse, SubAgentMetadata } from '../utils/types.js';
import { AIClient, AIMessage, AIResponse } from '../ai/client.js';
import { ContextManager } from './context-manager.js';
import { logger } from '../utils/logger.js';
import { templateManager } from '../utils/template-manager.js';
import { ResponseParser } from '../utils/response-parser.js';

export interface SpawnAgentRequest {
  subagentName: string;
  task: string;
  context: string;
  expectedDeliverables: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  budget?: number; // Maximum tokens/cost budget
  timeout?: number; // Maximum execution time in seconds
}

export interface SpawnAgentResult {
  response: SubAgentResponse;
  metadata: {
    tokensUsed: number;
    timeElapsed: number;
    cost: number;
    model: string;
    quality: number; // 0-100 quality score
  };
}

export class AgentSpawner {
  constructor(
    private readonly aiClient: AIClient,
    private readonly contextManager: ContextManager,
    private readonly chatmodes: Map<string, ChatmodeDefinition>
  ) {}

  /**
   * Spawn a sub-agent to complete a specific task
   */
  async spawnAgent(request: SpawnAgentRequest): Promise<SpawnAgentResult> {
    const startTime = Date.now();

    logger.info('Spawning sub-agent', {
      chatmode: request.subagentName,
      urgency: request.urgency,
      taskLength: request.task.length,
      contextLength: request.context.length
    });

    try {
      // Validate chatmode exists
      const chatmode = this.chatmodes.get(request.subagentName);
      if (!chatmode) {
        throw new Error(`Chatmode not found: ${request.subagentName}`);
      }

      // Summarize context for the specific domain
      const summarizedContext = this.contextManager.summarizeContext(
        request.task,
        request.context,
        request.expectedDeliverables,
        chatmode,
        this.getContextRequirements(request.urgency, request.budget)
      );

      // Validate context integrity
      const validation = this.contextManager.validateContextIntegrity(
        request.context,
        summarizedContext,
        request.task
      );

      if (!validation.valid) {
        logger.warn('Context validation issues detected', {
          chatmode: request.subagentName,
          issues: validation.issues
        });
      }

      // Build messages for the AI
      const messages = this.buildAgentMessages(
        chatmode,
        request.task,
        summarizedContext,
        request.expectedDeliverables,
        request.urgency
      );

      // Execute AI request with timeout
      const aiResponse = await this.executeWithTimeout(
        () => this.aiClient.generateResponse(messages),
        request.timeout || this.getDefaultTimeout(request.urgency)
      );

      // Parse and validate response with retry mechanism
      const parsedResponse = await ResponseParser.parseWithRetry(
        aiResponse.content,
        chatmode.name,
        {
          maxRetries: 2,
          retryCallback: async (failedContent: string, attempt: number) => {
            return this.requestFormatCorrection(failedContent, chatmode, request, attempt);
          }
        }
      );

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(
        aiResponse.content,
        request.task,
        request.expectedDeliverables
      );

      const timeElapsed = Date.now() - startTime;

      const result: SpawnAgentResult = {
        response: parsedResponse,
        metadata: {
          tokensUsed: aiResponse.usage?.total_tokens || 0,
          timeElapsed,
          cost: this.calculateCost(aiResponse.usage?.total_tokens || 0, aiResponse.model),
          model: aiResponse.model,
          quality: qualityScore
        }
      };

      logger.info('Sub-agent spawning completed', {
        chatmode: request.subagentName,
        status: parsedResponse.metadata.task_completion_status,
        tokensUsed: aiResponse.usage?.total_tokens || 0,
        timeElapsed,
        qualityScore
      });

      return result;

    } catch (error) {
      const timeElapsed = Date.now() - startTime;

      logger.error('Sub-agent spawning failed', {
        chatmode: request.subagentName,
        error: error instanceof Error ? error.message : String(error),
        timeElapsed
      });

      // Return error response in correct format
      return {
        response: {
          deliverables: {
            analysis: `Error: ${error instanceof Error ? error.message : String(error)}`
          },
          memory_operations: [],
          metadata: {
            subagent: request.subagentName,
            task_completion_status: 'failed',
            processing_time: `${timeElapsed}ms`,
            confidence_level: 'low'
          }
        },
        metadata: {
          tokensUsed: 0,
          timeElapsed,
          cost: 0,
          model: 'none',
          quality: 0
        }
      };
    }
  }

  /**
   * Build messages for the specific agent type
   */
  private buildAgentMessages(
    chatmode: ChatmodeDefinition,
    task: string,
    context: string,
    expectedDeliverables: string,
    urgency: string
  ): AIMessage[] {
    try {
      const systemPrompt = templateManager.render('agent-system-prompt', {
        chatmodeName: chatmode.name,
        chatmodeDescription: chatmode.description
      });

      const userPrompt = templateManager.render('agent-user-prompt', {
        task,
        context,
        expectedDeliverables,
        urgency
      });

      return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
    } catch (error) {
      logger.error('Failed to render agent prompt templates', {
        chatmodeName: chatmode.name,
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to template-based fallback prompts
      try {
        const systemPrompt = templateManager.render('fallback-system-prompt', {
          agentType: chatmode.name,
          description: chatmode.description
        });

        const userPrompt = templateManager.render('fallback-user-prompt', {
          agentType: chatmode.name,
          task,
          context,
          expectedDeliverables,
          urgency
        });

        return [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ];
      } catch (fallbackError) {
        logger.error('Failed to render fallback templates', {
          chatmodeName: chatmode.name,
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });

        // Final fallback to minimal prompts
        return [
          { role: 'system', content: `You are a ${chatmode.name}. Respond in JSON format with deliverables, memory_operations, and metadata fields.` },
          { role: 'user', content: `Task: ${task}\n\nContext: ${context}\n\nPlease provide your response in JSON format.` }
        ];
      }
    }
  }

  /**
   * Request format correction from AI when JSON parsing fails
   */
  private async requestFormatCorrection(
    failedContent: string,
    chatmode: ChatmodeDefinition,
    originalRequest: SpawnAgentRequest,
    attempt: number
  ): Promise<string> {
    logger.info('Requesting format correction from AI', {
      chatmode: chatmode.name,
      attempt,
      contentLength: failedContent.length
    });

    const formatCorrectionPrompt = `
CRITICAL FORMAT ERROR: Your previous response could not be parsed as JSON.

Original task: ${originalRequest.task}

Your response started with: "${failedContent.substring(0, 200)}..."

You MUST respond with ONLY valid JSON in this exact format:
{
  "deliverables": {
    "analysis": "Your detailed analysis here",
    "recommendations": ["Rec 1", "Rec 2"],
    "documents": ["Doc 1", "Doc 2"]
  },
  "memory_operations": [],
  "metadata": {
    "subagent": "${chatmode.name}",
    "task_completion_status": "complete",
    "processing_time": "format_correction",
    "confidence_level": "medium"
  }
}

REQUIREMENTS:
- Start response with { and end with }
- No text before or after the JSON
- Ensure all strings are properly quoted
- No trailing commas
- Include all required fields
`;

    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a ${chatmode.name}. CRITICAL: Respond with ONLY valid JSON. No explanatory text.`
      },
      {
        role: 'user',
        content: formatCorrectionPrompt
      }
    ];

    try {
      const correctionResponse = await this.executeWithTimeout(
        () => this.aiClient.generateResponse(messages),
        15000 // Shorter timeout for format correction
      );

      return correctionResponse.content;
    } catch (error) {
      logger.error('Format correction request failed', {
        chatmode: chatmode.name,
        attempt,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return original content if correction fails
      return failedContent;
    }
  }

  /**
   * Calculate quality score based on response characteristics
   */
  private calculateQualityScore(
    content: string,
    task: string,
    expectedDeliverables: string
  ): number {
    let score = 0;

    // Check if response contains JSON structure
    if (content.includes('"deliverables"') && content.includes('"metadata"')) {
      score += 30;
    }

    // Check content length and detail
    const contentLength = content.length;
    if (contentLength > 200) score += 20; // Substantial response
    if (contentLength > 1000) score += 15; // Detailed response

    // Check for structured content
    if (content.includes('"analysis"') || content.includes('"recommendations"')) {
      score += 15; // Well-structured
    }

    // Check for memory operations
    if (content.includes('"memory_operations"') && content.includes('"create_entities"')) {
      score += 10; // Knowledge capture
    }

    // Check for domain-specific terms
    const technicalTerms = [
      'architecture', 'design', 'security', 'performance',
      'scalability', 'implementation', 'testing', 'deployment'
    ];
    const foundTerms = technicalTerms.filter(term =>
      content.toLowerCase().includes(term)
    ).length;
    score += Math.min(10, foundTerms * 2); // Up to 10 points for domain relevance

    // Base score for any non-empty response
    if (contentLength > 0) {
      score += 5;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  /**
   * Get default timeout based on urgency
   */
  private getDefaultTimeout(urgency: string): number {
    switch (urgency) {
      case 'critical':
        return 30000; // 30 seconds
      case 'high':
        return 60000; // 1 minute
      case 'medium':
        return 120000; // 2 minutes
      case 'low':
        return 300000; // 5 minutes
      default:
        return 120000;
    }
  }

  /**
   * Get context requirements based on urgency and budget
   */
  private getContextRequirements(urgency: string, budget?: number) {
    const base = {
      reserveForTask: 30,
      reserveForDomain: 40,
      reserveForGeneral: 30,
      maxTokens: 8000
    };

    if (budget && budget < 0.05) {
      base.maxTokens = 4000; // Reduce context for low budget
    }

    if (urgency === 'critical') {
      base.maxTokens = 12000; // Allow more context for critical tasks
    }

    return base;
  }

  /**
   * Calculate cost based on tokens and model
   */
  private calculateCost(tokens: number, model: string): number {
    // Rough cost estimates (as of 2024)
    const costPer1kTokens: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003
    };

    const rate = costPer1kTokens[model] || 0.002;
    return (tokens / 1000) * rate;
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }
}
