import { ChatmodeDefinition } from '../utils/types.js';
import { logger } from '../utils/logger.js';

export interface ContextExtraction {
  entities: string[];
  relationships: string[];
  constraints: string[];
  decisions: string[];
}

export interface ContextSummary {
  critical: string[];
  important: string[];
  optional: string[];
  tokenCount: number;
}

export interface ContextRequirements {
  reserveForTask: number; // Percentage of context for task-specific info
  reserveForDomain: number; // Percentage for domain background
  reserveForGeneral: number; // Percentage for general project context
  maxTokens: number;
}

export class ContextManager {
  private readonly defaultRequirements: ContextRequirements = {
    reserveForTask: 30,
    reserveForDomain: 40,
    reserveForGeneral: 30,
    maxTokens: 8000 // Conservative estimate for context window
  };

  /**
   * Extract key entities and information from context
   */
  extractEntities(context: string): ContextExtraction {
    const lines = context.split('\n').filter(line => line.trim());

    const entities: string[] = [];
    const relationships: string[] = [];
    const constraints: string[] = [];
    const decisions: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract entities (camelCase or PascalCase words that look like services/components)
      const entityMatches = trimmed.match(/\b[A-Z][a-zA-Z]*(?:Service|Provider|Manager|System|Processor|Engine|Handler|Controller|Repository|Factory|Builder|Validator|Analyzer|Component|Module|Gateway|Client|Server)\b/g);
      if (entityMatches) {
        entities.push(...entityMatches);
      }

      // Also extract simple PascalCase words that appear to be important
      const simpleEntityMatches = trimmed.match(/\b[A-Z][a-zA-Z]+(?=[^a-z]|$)/g);
      if (simpleEntityMatches) {
        entities.push(...simpleEntityMatches.filter(entity =>
          entity.length > 2 && !['The', 'This', 'That', 'And', 'But', 'For', 'With', 'When', 'Where', 'How', 'Why', 'What'].includes(entity)
        ));
      }

      // Extract relationships (lines with connecting words)
      if (trimmed.includes('relates to') || trimmed.includes('depends on') ||
          trimmed.includes('requires') || trimmed.includes('implements') ||
          trimmed.includes('uses') || trimmed.includes('connects to') ||
          trimmed.includes('integrates with')) {
        relationships.push(trimmed);
      }

      // Extract constraints (lines with limiting words)
      if (trimmed.includes('must') || trimmed.includes('cannot') ||
          trimmed.includes('limited') || trimmed.includes('required') ||
          trimmed.includes('restricted') || trimmed.includes('forbidden')) {
        constraints.push(trimmed);
      }

      // Extract decisions (lines with decision indicators)
      if (trimmed.includes('decided') || trimmed.includes('chosen') ||
          trimmed.includes('selected') || trimmed.includes('approach') ||
          trimmed.includes('strategy') || trimmed.includes('option') ||
          trimmed.includes('solution') || /\b(Selected|Decided|Chosen)\b/.test(trimmed)) {
        decisions.push(trimmed);
      }
    }

    return {
      entities: [...new Set(entities)],
      relationships: [...new Set(relationships)],
      constraints: [...new Set(constraints)],
      decisions: [...new Set(decisions)]
    };
  }

  /**
   * Get domain-specific context requirements based on chatmode
   */
  getDomainRequirements(chatmode: ChatmodeDefinition): string[] {
    const requirements: string[] = [];

    switch (chatmode.name) {
      case 'Security Engineer':
        requirements.push(
          'Authentication patterns and security requirements',
          'Threat models and vulnerability assessments',
          'Security compliance requirements',
          'Encryption and data protection standards'
        );
        break;

      case 'DevOps Engineer':
        requirements.push(
          'Deployment context and infrastructure constraints',
          'Operational requirements and monitoring needs',
          'CI/CD pipeline configuration',
          'Resource limitations and scaling requirements'
        );
        break;

      case 'Database Architect':
        requirements.push(
          'Data models and schema requirements',
          'Performance requirements and query patterns',
          'Consistency patterns and transaction requirements',
          'Data volume and scaling considerations'
        );
        break;

      case 'Software Engineer':
        requirements.push(
          'Code architecture and design patterns',
          'Technical constraints and requirements',
          'Performance and scalability considerations',
          'Integration requirements and dependencies'
        );
        break;

      case 'Test Engineer':
        requirements.push(
          'Quality requirements and acceptance criteria',
          'Coverage expectations and testing strategies',
          'Test environments and data requirements',
          'Risk assessment and edge cases'
        );
        break;

      default:
        requirements.push(
          'Domain-specific constraints and requirements',
          'Quality standards and best practices',
          'Integration requirements',
          'Performance considerations'
        );
    }

    return requirements;
  }

  /**
   * Categorize context by importance for the specific domain
   */
  categorizeByImportance(
    extraction: ContextExtraction,
    task: string,
    chatmode: ChatmodeDefinition
  ): ContextSummary {
    const critical: string[] = [];
    const important: string[] = [];
    const optional: string[] = [];

    // Task requirements are always critical
    const taskLines = task.split('\n').filter(line => line.trim());
    critical.push(...taskLines);

    // Domain-specific constraints are critical
    const domainRequirements = this.getDomainRequirements(chatmode);
    const relevantConstraints = extraction.constraints.filter(constraint =>
      domainRequirements.some(req =>
        constraint.toLowerCase().includes(req.toLowerCase().split(' ')[0])
      )
    );
    critical.push(...relevantConstraints);

    // Recent decisions are important
    important.push(...extraction.decisions.slice(-5)); // Last 5 decisions

    // Related entities are important
    important.push(...extraction.relationships.slice(0, 10)); // Top 10 relationships

    // Everything else is optional
    optional.push(...extraction.entities.slice(0, 20)); // Top 20 entities

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const allContent = [...critical, ...important, ...optional].join(' ');
    const tokenCount = Math.ceil(allContent.length / 4);

    return {
      critical,
      important,
      optional,
      tokenCount
    };
  }

  /**
   * Summarize context within token limits
   */
  summarizeContext(
    task: string,
    context: string,
    expectedDeliverables: string,
    chatmode: ChatmodeDefinition,
    requirements: Partial<ContextRequirements> = {}
  ): string {
    const req = { ...this.defaultRequirements, ...requirements };

    logger.debug('Starting context summarization', {
      chatmode: chatmode.name,
      taskLength: task.length,
      contextLength: context.length,
      maxTokens: req.maxTokens
    });

    // Extract and categorize information
    const extraction = this.extractEntities(context);
    const summary = this.categorizeByImportance(extraction, task, chatmode);

    // Calculate token allocations
    const taskTokens = Math.floor(req.maxTokens * req.reserveForTask / 100);
    const domainTokens = Math.floor(req.maxTokens * req.reserveForDomain / 100);
    const generalTokens = Math.floor(req.maxTokens * req.reserveForGeneral / 100);

    let summarizedContext = '';

    // Add task information (highest priority)
    summarizedContext += `## Task Requirements\n`;
    summarizedContext += `${task}\n\n`;
    summarizedContext += `## Expected Deliverables\n`;
    summarizedContext += `${expectedDeliverables}\n\n`;

    // Add critical domain information
    if (summary.critical.length > 0) {
      summarizedContext += `## Critical Information\n`;
      let domainContent = '';
      for (const item of summary.critical) {
        const potentialAdd = domainContent + item + '\n';
        if (this.estimateTokens(potentialAdd) <= domainTokens) {
          domainContent = potentialAdd;
        } else {
          break;
        }
      }
      summarizedContext += domainContent + '\n';
    }

    // Add important background information
    if (summary.important.length > 0) {
      summarizedContext += `## Important Context\n`;
      let generalContent = '';
      for (const item of summary.important) {
        const potentialAdd = generalContent + item + '\n';
        if (this.estimateTokens(potentialAdd) <= generalTokens) {
          generalContent = potentialAdd;
        } else {
          break;
        }
      }
      summarizedContext += generalContent + '\n';
    }

    // Add domain-specific requirements
    const domainRequirements = this.getDomainRequirements(chatmode);
    summarizedContext += `## Domain Requirements\n`;
    summarizedContext += domainRequirements.map(req => `- ${req}`).join('\n') + '\n\n';

    // Add validation checksum
    const finalTokenCount = this.estimateTokens(summarizedContext);
    summarizedContext += `## Context Summary\n`;
    summarizedContext += `- Original context: ${this.estimateTokens(context)} tokens\n`;
    summarizedContext += `- Summarized context: ${finalTokenCount} tokens\n`;
    summarizedContext += `- Compression ratio: ${(finalTokenCount / this.estimateTokens(context) * 100).toFixed(1)}%\n`;

    logger.debug('Context summarization completed', {
      chatmode: chatmode.name,
      originalTokens: this.estimateTokens(context),
      summarizedTokens: finalTokenCount,
      compressionRatio: finalTokenCount / this.estimateTokens(context)
    });

    return summarizedContext;
  }

  /**
   * Validate that summarized context maintains semantic integrity
   */
  validateContextIntegrity(
    originalContext: string,
    summarizedContext: string,
    task: string
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check that task requirements are preserved
    const taskLines = task.split('\n').filter(line => line.trim());
    for (const line of taskLines) {
      if (!summarizedContext.includes(line)) {
        issues.push(`Task requirement missing: ${line.substring(0, 50)}...`);
      }
    }

    // Check token limits
    const tokenCount = this.estimateTokens(summarizedContext);
    if (tokenCount > this.defaultRequirements.maxTokens) {
      issues.push(`Context exceeds token limit: ${tokenCount} > ${this.defaultRequirements.maxTokens}`);
    }

    // Check minimum content preservation
    const originalTokens = this.estimateTokens(originalContext);
    const compressionRatio = tokenCount / originalTokens;
    if (compressionRatio < 0.1) {
      issues.push(`Excessive compression may lose important information: ${(compressionRatio * 100).toFixed(1)}%`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }
}
