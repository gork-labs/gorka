import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager } from '../../src/agents/context-manager.js';
import { ChatmodeDefinition } from '../../src/utils/types.js';

describe('ContextManager', () => {
  let contextManager: ContextManager;
  let securityChatmode: ChatmodeDefinition;
  let devopsChatmode: ChatmodeDefinition;

  beforeEach(() => {
    contextManager = new ContextManager();

    securityChatmode = {
      name: 'Security Engineer',
      description: 'Specialized in security analysis and threat modeling',
      tools: ['security-scan', 'threat-model'],
      content: 'Security engineer chatmode content',
      filePath: '/path/to/security.chatmode.md'
    };

    devopsChatmode = {
      name: 'DevOps Engineer',
      description: 'Specialized in deployment and infrastructure',
      tools: ['deploy', 'monitor'],
      content: 'DevOps engineer chatmode content',
      filePath: '/path/to/devops.chatmode.md'
    };
  });

  describe('extractEntities', () => {
    it('should extract entities from context', () => {
      const context = `
        The UserAuthentication service must validate credentials.
        PaymentProcessor requires encryption for sensitive data.
        OrderManagement system implements business rules.
      `;

      const extraction = contextManager.extractEntities(context);

      expect(extraction.entities).toContain('UserAuthentication');
      expect(extraction.entities).toContain('PaymentProcessor');
      expect(extraction.entities).toContain('OrderManagement');
    });

    it('should extract relationships', () => {
      const context = `
        UserService relates to AuthenticationProvider.
        PaymentService depends on EncryptionService.
        OrderService requires ValidationService.
      `;

      const extraction = contextManager.extractEntities(context);

      expect(extraction.relationships).toContain('UserService relates to AuthenticationProvider.');
      expect(extraction.relationships).toContain('PaymentService depends on EncryptionService.');
      expect(extraction.relationships).toContain('OrderService requires ValidationService.');
    });

    it('should extract constraints', () => {
      const context = `
        Users must provide valid email addresses.
        System cannot process orders without payment.
        Data is limited to 100MB per request.
      `;

      const extraction = contextManager.extractEntities(context);

      expect(extraction.constraints).toContain('Users must provide valid email addresses.');
      expect(extraction.constraints).toContain('System cannot process orders without payment.');
      expect(extraction.constraints).toContain('Data is limited to 100MB per request.');
    });

    it('should extract decisions', () => {
      const context = `
        Team decided to use PostgreSQL for data storage.
        Architecture chosen includes microservices approach.
        Selected Redis for caching layer.
      `;

      const extraction = contextManager.extractEntities(context);

      expect(extraction.decisions).toContain('Team decided to use PostgreSQL for data storage.');
      expect(extraction.decisions).toContain('Architecture chosen includes microservices approach.');
      expect(extraction.decisions).toContain('Selected Redis for caching layer.');
    });
  });

  describe('getDomainRequirements', () => {
    it('should provide security-specific requirements', () => {
      const requirements = contextManager.getDomainRequirements(securityChatmode);

      expect(requirements).toContain('Authentication patterns and security requirements');
      expect(requirements).toContain('Threat models and vulnerability assessments');
      expect(requirements).toContain('Security compliance requirements');
      expect(requirements).toContain('Encryption and data protection standards');
    });

    it('should provide devops-specific requirements', () => {
      const requirements = contextManager.getDomainRequirements(devopsChatmode);

      expect(requirements).toContain('Deployment context and infrastructure constraints');
      expect(requirements).toContain('Operational requirements and monitoring needs');
      expect(requirements).toContain('CI/CD pipeline configuration');
      expect(requirements).toContain('Resource limitations and scaling requirements');
    });

    it('should provide default requirements for unknown chatmode', () => {
      const unknownChatmode: ChatmodeDefinition = {
        name: 'Unknown Agent',
        description: 'Unknown agent type',
        tools: [],
        content: '',
        filePath: ''
      };

      const requirements = contextManager.getDomainRequirements(unknownChatmode);

      expect(requirements).toContain('Domain-specific constraints and requirements');
      expect(requirements).toContain('Quality standards and best practices');
      expect(requirements).toContain('Integration requirements');
      expect(requirements).toContain('Performance considerations');
    });
  });

  describe('categorizeByImportance', () => {
    it('should categorize extracted information by importance', () => {
      const task = 'Analyze authentication security\nImplement MFA requirements';
      const extraction = {
        entities: ['UserService', 'AuthProvider', 'TokenManager'],
        relationships: ['UserService uses AuthProvider', 'AuthProvider generates TokenManager'],
        constraints: ['Users must authenticate', 'Tokens expire after 1 hour'],
        decisions: ['Decided to use JWT tokens', 'Selected OAuth2 flow']
      };

      const summary = contextManager.categorizeByImportance(extraction, task, securityChatmode);

      // Task requirements should be in critical
      expect(summary.critical).toContain('Analyze authentication security');
      expect(summary.critical).toContain('Implement MFA requirements');

      // Should have important and optional content
      expect(summary.important.length).toBeGreaterThan(0);
      expect(summary.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('summarizeContext', () => {
    it('should create a comprehensive context summary', () => {
      const task = 'Perform security analysis of the authentication system';
      const context = `
        The application uses JWT tokens for authentication.
        UserService manages user credentials and profiles.
        AuthenticationProvider validates user login attempts.
        System must enforce rate limiting on login attempts.
        Architecture decided to implement OAuth2 for third-party integration.
        Security requirements include multi-factor authentication.
      `;
      const expectedDeliverables = 'Security analysis report with recommendations';

      const summary = contextManager.summarizeContext(
        task,
        context,
        expectedDeliverables,
        securityChatmode
      );

      expect(summary).toContain('## Task Requirements');
      expect(summary).toContain(task);
      expect(summary).toContain('## Expected Deliverables');
      expect(summary).toContain(expectedDeliverables);
      expect(summary).toContain('## Critical Information');
      expect(summary).toContain('## Domain Requirements');
      expect(summary).toContain('Authentication patterns and security requirements');
      expect(summary).toContain('## Context Summary');
    });

    it('should respect token limits', () => {
      const longContext = 'This is a very long context. '.repeat(1000);
      const task = 'Simple task';
      const expectedDeliverables = 'Simple deliverables';

      const summary = contextManager.summarizeContext(
        task,
        longContext,
        expectedDeliverables,
        securityChatmode,
        { maxTokens: 100 }
      );

      // Should be significantly shorter than original
      expect(summary.length).toBeLessThan(longContext.length / 2);
      expect(summary).toContain('## Context Summary');
    });
  });

  describe('validateContextIntegrity', () => {
    it('should validate that task requirements are preserved', () => {
      const originalContext = 'Original context with important information';
      const task = 'Critical task requirement\nAnother important requirement';
      const summarizedContext = `
        ## Task Requirements
        Critical task requirement
        Another important requirement

        ## Other sections...
      `;

      const validation = contextManager.validateContextIntegrity(
        originalContext,
        summarizedContext,
        task
      );

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect missing task requirements', () => {
      const originalContext = 'Original context';
      const task = 'Missing requirement\nAnother missing requirement';
      const summarizedContext = 'Summarized context without task requirements';

      const validation = contextManager.validateContextIntegrity(
        originalContext,
        summarizedContext,
        task
      );

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('Task requirement missing');
    });

    it('should detect token limit violations', () => {
      const originalContext = 'Short context';
      const task = 'Simple task';
      const summarizedContext = 'A'.repeat(50000); // Very long summarized context

      const validation = contextManager.validateContextIntegrity(
        originalContext,
        summarizedContext,
        task
      );

      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('exceeds token limit'))).toBe(true);
    });

    it('should detect excessive compression', () => {
      const originalContext = 'A'.repeat(10000); // Long original
      const task = 'Simple task';
      const summarizedContext = 'Short'; // Very short summary

      const validation = contextManager.validateContextIntegrity(
        originalContext,
        summarizedContext,
        task
      );

      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Excessive compression'))).toBe(true);
    });
  });

  describe('token estimation', () => {
    it('should provide reasonable token estimates', () => {
      const shortText = 'Hello world';
      const longText = 'This is a much longer text that should have more tokens than the short text.';

      // Access private method through any type casting for testing
      const contextManagerAny = contextManager as any;
      const shortTokens = contextManagerAny.estimateTokens(shortText);
      const longTokens = contextManagerAny.estimateTokens(longText);

      expect(longTokens).toBeGreaterThan(shortTokens);
      expect(shortTokens).toBeGreaterThan(0);
    });
  });
});
