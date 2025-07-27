import OpenAI from 'openai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIClientOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export abstract class AIClient {
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;
  protected timeout: number;

  constructor(options: AIClientOptions) {
    this.model = options.model;
    this.maxTokens = options.maxTokens || 4000;
    this.temperature = options.temperature || 0.1;
    this.timeout = options.timeout || 60000;
  }

  abstract generateResponse(messages: AIMessage[]): Promise<AIResponse>;
  abstract isAvailable(): boolean;
}

export class OpenRouterClient extends AIClient {
  private client: OpenAI;

  constructor(options: AIClientOptions) {
    super(options);

    if (!config.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    this.client = new OpenAI({
      apiKey: config.openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      timeout: this.timeout,
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/gork-labs/gorka',
        'X-Title': 'Gorka SecondBrain MCP'
      }
    });
  }

  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      logger.debug('Calling OpenRouter API', {
        model: this.model,
        messageCount: messages.length,
        maxTokens: this.maxTokens
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: this.maxTokens,
        temperature: this.temperature
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenRouter response');
      }

      return {
        content,
        model: this.model,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined
      };

    } catch (error) {
      logger.error('OpenRouter API call failed', {
        model: this.model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!config.openrouterApiKey;
  }
}

export class AIClientFactory {
  static createClient(model: string, options?: Partial<AIClientOptions>): AIClient {
    const clientOptions: AIClientOptions = {
      model,
      maxTokens: options?.maxTokens,
      temperature: options?.temperature,
      timeout: options?.timeout
    };

    // All models go through OpenRouter
    return new OpenRouterClient(clientOptions);
  }

  static getAvailableClients(): { openrouter: boolean } {
    return {
      openrouter: !!config.openrouterApiKey
    };
  }

  static getDefaultModel(isSubAgent: boolean = false): string {
    if (isSubAgent) {
      return config.subAgentModel;
    }
    return config.defaultModel;
  }
}
