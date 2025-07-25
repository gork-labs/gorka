import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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

export class OpenAIClient extends AIClient {
  private client: OpenAI;

  constructor(options: AIClientOptions) {
    super(options);

    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      timeout: this.timeout
    });
  }

  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      logger.debug('Calling OpenAI API', {
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
        throw new Error('No content in OpenAI response');
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
      logger.error('OpenAI API call failed', {
        model: this.model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!config.openaiApiKey;
  }
}

export class AnthropicClient extends AIClient {
  private client: Anthropic;

  constructor(options: AIClientOptions) {
    super(options);

    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
      timeout: this.timeout
    });
  }

  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    try {
      logger.debug('Calling Anthropic API', {
        model: this.model,
        messageCount: messages.length,
        maxTokens: this.maxTokens
      });

      // Convert messages format for Anthropic
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemMessage,
        messages: conversationMessages
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Non-text response from Anthropic');
      }

      return {
        content: content.text,
        model: this.model,
        usage: response.usage ? {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        } : undefined
      };

    } catch (error) {
      logger.error('Anthropic API call failed', {
        model: this.model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  isAvailable(): boolean {
    return !!config.anthropicApiKey;
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

    // OpenAI models
    if (model.startsWith('gpt-')) {
      return new OpenAIClient(clientOptions);
    }

    // Anthropic models
    if (model.startsWith('claude-')) {
      return new AnthropicClient(clientOptions);
    }

    throw new Error(`Unsupported model: ${model}`);
  }

  static getAvailableClients(): { openai: boolean; anthropic: boolean } {
    return {
      openai: !!config.openaiApiKey,
      anthropic: !!config.anthropicApiKey
    };
  }

  static getDefaultModel(isSubAgent: boolean = false): string {
    if (isSubAgent) {
      return config.subAgentModel;
    }
    return config.defaultModel;
  }
}
