import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentSpawner } from '../../src/agents/spawner.js';
import { ContextManager } from '../../src/agents/context-manager.js';
import { AIClient, AIResponse, AIMessage } from '../../src/ai/client.js';
import { ChatmodeDefinition } from '../../src/utils/types.js';

// Mock AI client for testing
class MockAIClient extends AIClient {
  private responses: Record<string, string> = {
    'success': `{
  "deliverables": {
    "analysis": "Successfully completed the security analysis task",
    "recommendations": ["Implement MFA", "Add rate limiting", "Review access controls"]
  },
  "memory_operations": [
    {
      "operation": "create_entities",
      "data": {
        "entities": [{
          "name": "SecurityAnalysis_Process",
          "entityType": "concept",
          "observations": ["Process for analyzing security vulnerabilities", "Involves threat modeling and risk assessment"]
        }]
      }
    }
  ],
  "metadata": {
    "chatmode": "Security Engineer",
    "task_completion_status": "complete",
    "processing_time": "2500ms",
    "confidence_level": "high"
  }
}`,
    'partial': `{
  "deliverables": {
    "analysis": "Partially completed the analysis due to time constraints"
  },
  "memory_operations": [],
  "metadata": {
    "chatmode": "Security Engineer",
    "task_completion_status": "partial",
    "processing_time": "1000ms",
    "confidence_level": "medium"
  }
}`,
    'invalid': 'This is not valid JSON response'
  };

  constructor(responseType: 'success' | 'partial' | 'invalid' = 'success') {
    super({ model: 'gpt-3.5-turbo' });
    this.responseType = responseType;
  }

  private responseType: string;

  async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
    return {
      content: this.responses[this.responseType] || this.responses['success'],
      model: 'gpt-3.5-turbo',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      }
    };
  }

  isAvailable(): boolean {
    return true;
  }
}

describe('AgentSpawner', () => {
  let spawner: AgentSpawner;
  let contextManager: ContextManager;
  let aiClient: MockAIClient;
  let chatmodes: Map<string, ChatmodeDefinition>;

  beforeEach(() => {
    contextManager = new ContextManager();
    aiClient = new MockAIClient('success');

    chatmodes = new Map([
      ['Security Engineer', {
        name: 'Security Engineer',
        description: 'Specialized in security analysis and threat modeling',
        tools: ['security-scan', 'threat-model'],
        content: 'Security engineer chatmode content',
        filePath: '/path/to/security.chatmode.md'
      }]
    ]);

    spawner = new AgentSpawner(aiClient, contextManager, chatmodes);
  });

  describe('spawnAgent', () => {
    it('should successfully spawn agent and parse JSON response', async () => {
      const request = {
        chatmodeName: 'Security Engineer',
        task: 'Analyze the authentication system for security vulnerabilities',
        context: 'We have a web application with user login functionality using JWT tokens',
        expectedDeliverables: 'Security analysis report with recommendations',
        urgency: 'high' as const
      };

      const result = await spawner.spawnAgent(request);

      expect(result.response.deliverables.analysis).toBe('Successfully completed the security analysis task');
      expect(result.response.deliverables.recommendations).toEqual([
        'Implement MFA',
        'Add rate limiting',
        'Review access controls'
      ]);
      expect(result.response.metadata.chatmode).toBe('Security Engineer');
      expect(result.response.metadata.task_completion_status).toBe('complete');
      expect(result.response.metadata.confidence_level).toBe('high');
      expect(result.response.memory_operations).toHaveLength(1);
      expect(result.metadata.tokensUsed).toBe(300);
      expect(result.metadata.quality).toBeGreaterThan(50);
    });

    it('should handle partial completion', async () => {
      aiClient = new MockAIClient('partial');
      spawner = new AgentSpawner(aiClient, contextManager, chatmodes);

      const request = {
        chatmodeName: 'Security Engineer',
        task: 'Quick security check',
        context: 'Limited context',
        expectedDeliverables: 'Brief security assessment',
        urgency: 'low' as const
      };

      const result = await spawner.spawnAgent(request);

      expect(result.response.metadata.task_completion_status).toBe('partial');
      expect(result.response.metadata.confidence_level).toBe('medium');
      expect(result.response.deliverables.analysis).toBe('Partially completed the analysis due to time constraints');
    });

    it('should handle invalid JSON response gracefully', async () => {
      aiClient = new MockAIClient('invalid');
      spawner = new AgentSpawner(aiClient, contextManager, chatmodes);

      const request = {
        chatmodeName: 'Security Engineer',
        task: 'Test task',
        context: 'Test context',
        expectedDeliverables: 'Test deliverables',
        urgency: 'medium' as const
      };

      const result = await spawner.spawnAgent(request);

      expect(result.response.deliverables.analysis).toBe('This is not valid JSON response');
      expect(result.response.metadata.task_completion_status).toBe('partial');
      expect(result.response.metadata.confidence_level).toBe('low');
      expect(result.metadata.quality).toBeGreaterThan(0);
    });

    it('should handle non-existent chatmode', async () => {
      const request = {
        chatmodeName: 'Non Existent Agent',
        task: 'Test task',
        context: 'Test context',
        expectedDeliverables: 'Test deliverables',
        urgency: 'medium' as const
      };

      const result = await spawner.spawnAgent(request);

      expect(result.response.metadata.task_completion_status).toBe('failed');
      expect(result.response.deliverables.analysis).toContain('Chatmode not found');
      expect(result.metadata.quality).toBe(0);
    });

    it('should calculate quality scores correctly', async () => {
      const request = {
        chatmodeName: 'Security Engineer',
        task: 'Comprehensive security analysis',
        context: 'Complex web application with multiple components',
        expectedDeliverables: 'Detailed security report',
        urgency: 'critical' as const
      };

      const result = await spawner.spawnAgent(request);

      // Quality should be high due to JSON structure, analysis, recommendations, memory ops
      expect(result.metadata.quality).toBeGreaterThan(70);
    });

    it('should handle timeout scenarios', async () => {
      // Mock a slow AI client
      const slowClient = new (class extends MockAIClient {
        async generateResponse(messages: AIMessage[]): Promise<AIResponse> {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(super.generateResponse(messages));
            }, 2000);
          });
        }
      })();

      spawner = new AgentSpawner(slowClient, contextManager, chatmodes);

      const request = {
        chatmodeName: 'Security Engineer',
        task: 'Test task',
        context: 'Test context',
        expectedDeliverables: 'Test deliverables',
        urgency: 'critical' as const,
        timeout: 100 // Very short timeout
      };

      const result = await spawner.spawnAgent(request);

      expect(result.response.metadata.task_completion_status).toBe('failed');
      expect(result.response.deliverables.analysis).toContain('timed out');
    });
  });

  describe('context management integration', () => {
    it('should summarize context for different urgency levels', async () => {
      const longContext = 'This is a very long context that repeats itself. '.repeat(100);

      const request = {
        chatmodeName: 'Security Engineer',
        task: 'Security analysis',
        context: longContext,
        expectedDeliverables: 'Security report',
        urgency: 'critical' as const
      };

      const result = await spawner.spawnAgent(request);

      // Should succeed even with long context due to summarization
      expect(result.response.metadata.task_completion_status).toBe('complete');
    });
  });

  describe('cost and budget management', () => {
    it('should calculate costs correctly', async () => {
      const request = {
        chatmodeName: 'Security Engineer',
        task: 'Budget test',
        context: 'Test context',
        expectedDeliverables: 'Test deliverables',
        urgency: 'medium' as const,
        budget: 0.10
      };

      const result = await spawner.spawnAgent(request);

      expect(result.metadata.cost).toBeGreaterThan(0);
      expect(result.metadata.cost).toBeLessThan(0.10); // Should respect budget
      expect(result.metadata.model).toBe('gpt-3.5-turbo');
    });
  });
});
