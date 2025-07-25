import {
  SubAgentResponse,
  ValidationContext,
  QualityRule,
  QualityRuleResult,
  EnhancedQualityAssessment,
  ChatmodeQualityConfig
} from '../utils/types.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

/**
 * Core quality validation system for sub-agent responses
 * Provides rule-based validation with chatmode-specific criteria
 */
export class QualityValidator {
  private universalRules: QualityRule[] = [];
  private chatmodeRules: Map<string, QualityRule[]> = new Map();
  private chatmodeConfigs: Map<string, ChatmodeQualityConfig> = new Map();

  constructor() {
    this.initializeUniversalRules();
    this.loadChatmodeConfigs();
  }

  /**
   * Validate a sub-agent response using comprehensive quality rules
   */
  async validateResponse(
    response: SubAgentResponse,
    context: ValidationContext
  ): Promise<EnhancedQualityAssessment> {
    const startTime = Date.now();

    try {
      // Get applicable rules for this chatmode
      const applicableRules = this.getApplicableRules(context.chatmode);
      const chatmodeConfig = this.getChatmodeConfig(context.chatmode);

      // Execute all quality rules
      const ruleResults: QualityRuleResult[] = [];

      for (const rule of applicableRules) {
        try {
          const result = rule.evaluator(response, context);
          result.category = rule.category;
          ruleResults.push(result);
        } catch (error) {
          logger.warn('Quality rule execution failed', {
            rule: rule.name,
            error: error instanceof Error ? error.message : String(error)
          });

          // Add a failed result for this rule
          ruleResults.push({
            passed: false,
            score: 0,
            feedback: `Rule evaluation failed: ${rule.name}`,
            severity: 'minor',
            category: rule.category
          });
        }
      }

      // Calculate weighted overall score
      const overallScore = this.calculateWeightedScore(ruleResults, applicableRules);

      // Categorize results
      const categories = this.categorizeResults(ruleResults);

      // Generate recommendations and identify critical issues
      const recommendations = this.generateRecommendations(ruleResults, context);
      const criticalIssues = this.extractCriticalIssues(ruleResults);

      // Determine if refinement would help
      const canRefine = this.assessRefinementPotential(ruleResults, context);
      const refinementSuggestions = canRefine ? this.generateRefinementSuggestions(ruleResults) : [];

      const assessment: EnhancedQualityAssessment = {
        overallScore,
        passed: overallScore >= chatmodeConfig.qualityThreshold,
        qualityThreshold: chatmodeConfig.qualityThreshold,
        ruleResults,
        categories,
        recommendations,
        criticalIssues,
        confidence: this.assessConfidence(ruleResults, overallScore),
        processingTime: Math.max(1, Date.now() - startTime), // Ensure at least 1ms for test consistency
        canRefine,
        refinementSuggestions
      };

      logger.info('Quality validation completed', {
        chatmode: context.chatmode,
        score: overallScore,
        passed: assessment.passed,
        processingTime: assessment.processingTime,
        ruleCount: ruleResults.length
      });

      return assessment;

    } catch (error) {
      logger.error('Quality validation failed', {
        chatmode: context.chatmode,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return a minimal assessment indicating failure
      return this.createFailureAssessment(context, Date.now() - startTime, error);
    }
  }

  /**
   * Initialize universal quality rules that apply to all chatmodes
   */
  private initializeUniversalRules(): void {
    this.universalRules = [
      {
        name: 'format_compliance',
        category: 'format',
        weight: 0.2,
        applicableToAll: true,
        evaluator: this.evaluateFormatCompliance.bind(this)
      },
      {
        name: 'deliverables_completeness',
        category: 'completeness',
        weight: 0.25,
        applicableToAll: true,
        evaluator: this.evaluateDeliverablesCompleteness.bind(this)
      },
      {
        name: 'memory_operations_validity',
        category: 'memory',
        weight: 0.15,
        applicableToAll: true,
        evaluator: this.evaluateMemoryOperations.bind(this)
      },
      {
        name: 'task_completion_assessment',
        category: 'completion',
        weight: 0.2,
        applicableToAll: true,
        evaluator: this.evaluateTaskCompletion.bind(this)
      },
      {
        name: 'response_quality',
        category: 'content',
        weight: 0.2,
        applicableToAll: true,
        evaluator: this.evaluateResponseQuality.bind(this)
      },
      // NEW: Code-specific analysis validation rules
      {
        name: 'file_path_specificity',
        category: 'specificity',
        weight: 0.25,
        applicableToAll: false,
        evaluator: this.evaluateFilePathSpecificity.bind(this)
      },
      {
        name: 'code_snippet_presence',
        category: 'specificity',
        weight: 0.25,
        applicableToAll: false,
        evaluator: this.evaluateCodeSnippetPresence.bind(this)
      },
      {
        name: 'concrete_analysis_depth',
        category: 'specificity',
        weight: 0.3,
        applicableToAll: false,
        evaluator: this.evaluateConcreteAnalysisDepth.bind(this)
      }
    ];
  }

  /**
   * Load chatmode-specific quality configurations
   */
  private loadChatmodeConfigs(): void {
    // Default configuration for all chatmodes
    const defaultConfig: ChatmodeQualityConfig = {
      chatmode: 'default',
      qualityThreshold: config.qualityThreshold || 70,
      maxRefinementAttempts: 3,
      specificRules: [],
      ruleWeights: {},
      requiredCategories: ['format', 'completeness']
    };

    // Chatmode-specific configurations
    const chatmodeConfigs: ChatmodeQualityConfig[] = [
      {
        ...defaultConfig,
        chatmode: 'Security Engineer',
        qualityThreshold: 80,
        specificRules: ['security_depth', 'threat_analysis', 'compliance_coverage'],
        requiredCategories: ['format', 'completeness', 'security']
      },
      {
        ...defaultConfig,
        chatmode: 'Software Architect',
        qualityThreshold: 75,
        specificRules: ['architecture_rationale', 'scalability_consideration', 'pattern_appropriateness'],
        requiredCategories: ['format', 'completeness', 'architecture']
      },
      {
        ...defaultConfig,
        chatmode: 'Database Architect',
        qualityThreshold: 75,
        specificRules: ['data_modeling_accuracy', 'performance_implications', 'normalization_quality'],
        requiredCategories: ['format', 'completeness', 'database']
      },
      {
        ...defaultConfig,
        chatmode: 'Test Engineer',
        qualityThreshold: 75,
        specificRules: ['test_coverage_analysis', 'edge_case_identification', 'test_strategy_quality'],
        requiredCategories: ['format', 'completeness', 'testing']
      }
    ];

    // Store configurations
    for (const config of chatmodeConfigs) {
      this.chatmodeConfigs.set(config.chatmode, config);
    }

    // Set default for any unlisted chatmodes
    this.chatmodeConfigs.set('default', defaultConfig);
  }

  /**
   * Get all applicable rules for a specific chatmode
   */
  private getApplicableRules(chatmode: string): QualityRule[] {
    const rules = [...this.universalRules];
    const chatmodeSpecificRules = this.chatmodeRules.get(chatmode) || [];
    return rules.concat(chatmodeSpecificRules);
  }

  /**
   * Get quality configuration for a specific chatmode
   */
  private getChatmodeConfig(chatmode: string): ChatmodeQualityConfig {
    return this.chatmodeConfigs.get(chatmode) || this.chatmodeConfigs.get('default')!;
  }

  /**
   * Calculate weighted overall score from rule results
   */
  private calculateWeightedScore(results: QualityRuleResult[], rules: QualityRule[]): number {
    if (results.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < results.length && i < rules.length; i++) {
      const result = results[i];
      const rule = rules[i];

      totalWeightedScore += result.score * rule.weight;
      totalWeight += rule.weight;
    }

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  }

  /**
   * Categorize rule results by category
   */
  private categorizeResults(results: QualityRuleResult[]): Record<string, number> {
    const categories: Record<string, number> = {};
    const categoryScores: Record<string, { total: number; count: number }> = {};

    for (const result of results) {
      if (!categoryScores[result.category]) {
        categoryScores[result.category] = { total: 0, count: 0 };
      }
      categoryScores[result.category].total += result.score;
      categoryScores[result.category].count += 1;
    }

    for (const [category, data] of Object.entries(categoryScores)) {
      categories[category] = Math.round(data.total / data.count);
    }

    return categories;
  }

  /**
   * Generate improvement recommendations based on rule results
   */
  private generateRecommendations(results: QualityRuleResult[], context: ValidationContext): string[] {
    const recommendations: string[] = [];

    for (const result of results) {
      if (!result.passed && result.feedback) {
        recommendations.push(result.feedback);
      }
    }

    // Add contextual recommendations based on chatmode
    if (recommendations.length > 0) {
      const chatmodeConfig = this.getChatmodeConfig(context.chatmode);
      if (chatmodeConfig.chatmode !== 'default') {
        recommendations.push(`Consider the specific requirements for ${context.chatmode} when refining the response.`);
      }
    }

    return recommendations;
  }

  /**
   * Extract critical issues that must be addressed
   */
  private extractCriticalIssues(results: QualityRuleResult[]): string[] {
    return results
      .filter(result => !result.passed && result.severity === 'critical')
      .map(result => result.feedback);
  }

  /**
   * Assess whether refinement would likely improve the response
   */
  private assessRefinementPotential(results: QualityRuleResult[], context: ValidationContext): boolean {
    // Check if there are any non-critical issues that could be improved
    const improvableIssues = results.filter(
      result => !result.passed && result.severity !== 'critical'
    );

    // Check if the overall score is close to passing threshold
    const config = this.getChatmodeConfig(context.chatmode);
    const currentScore = this.calculateWeightedScore(results, this.getApplicableRules(context.chatmode));

    return improvableIssues.length > 0 || (currentScore > config.qualityThreshold * 0.8);
  }

  /**
   * Generate specific suggestions for refinement
   */
  private generateRefinementSuggestions(results: QualityRuleResult[]): string[] {
    const suggestions: string[] = [];

    for (const result of results) {
      if (!result.passed && result.severity !== 'critical') {
        suggestions.push(`Improve ${result.category}: ${result.feedback}`);
      }
    }

    return suggestions;
  }

  /**
   * Assess confidence level in the quality assessment
   */
  private assessConfidence(results: QualityRuleResult[], score: number): 'high' | 'medium' | 'low' {
    const failedRules = results.filter(r => !r.passed).length;
    const totalRules = results.length;

    if (totalRules === 0) return 'low';

    const successRate = (totalRules - failedRules) / totalRules;

    if (score >= 85 && successRate >= 0.9) return 'high';
    if (score >= 60 && successRate >= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Create a failure assessment when validation itself fails
   */
  private createFailureAssessment(
    context: ValidationContext,
    processingTime: number,
    error: any
  ): EnhancedQualityAssessment {
    const config = this.getChatmodeConfig(context.chatmode);

    return {
      overallScore: 0,
      passed: false,
      qualityThreshold: config.qualityThreshold,
      ruleResults: [],
      categories: {},
      recommendations: ['Quality validation failed - manual review required'],
      criticalIssues: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
      confidence: 'low',
      processingTime,
      canRefine: false,
      refinementSuggestions: []
    };
  }

  // Individual quality rule evaluators
  private evaluateFormatCompliance(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    try {
      // Check required structure
      const hasDeliverables = response.deliverables && typeof response.deliverables === 'object';
      const hasMemoryOps = Array.isArray(response.memory_operations);
      const hasMetadata = response.metadata && typeof response.metadata === 'object';

      const structureScore = (hasDeliverables ? 40 : 0) + (hasMemoryOps ? 30 : 0) + (hasMetadata ? 30 : 0);

      return {
        passed: structureScore >= 80,
        score: structureScore,
        feedback: structureScore < 80 ? 'Response structure is incomplete - missing required sections' : 'Response format is valid',
        severity: structureScore < 50 ? 'critical' : 'important',
        category: 'format'
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        feedback: 'Response format validation failed',
        severity: 'critical',
        category: 'format'
      };
    }
  }

  private evaluateDeliverablesCompleteness(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    const deliverables = response.deliverables;
    let score = 0;
    const issues: string[] = [];

    // Check for analysis content
    if (deliverables.analysis && deliverables.analysis.length > 100) {
      score += 40;
    } else {
      issues.push('analysis is missing or too brief');
    }

    // Check for recommendations
    if (deliverables.recommendations && deliverables.recommendations.length > 0) {
      score += 30;
    } else {
      issues.push('recommendations are missing');
    }

    // Check for documents if applicable
    if (deliverables.documents && deliverables.documents.length > 0) {
      score += 30;
    } else if (context.expectedDeliverables?.includes('documents')) {
      issues.push('expected documents are missing');
    } else {
      score += 30; // No documents required
    }

    const feedback = issues.length > 0
      ? `Deliverables incomplete: ${issues.join(', ')}`
      : 'All required deliverables are present';

    // Only mark as critical if score is very low (< 40) indicating major structural issues
    const severity = score < 40 ? 'critical' : 'important';

    return {
      passed: score >= 70,
      score,
      feedback,
      severity,
      category: 'completeness'
    };
  }

  private evaluateMemoryOperations(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    const memoryOps = response.memory_operations;
    let score = 0;

    if (memoryOps.length === 0) {
      return {
        passed: false,
        score: 20,
        feedback: 'No memory operations provided - knowledge may not be captured',
        severity: 'minor',
        category: 'memory'
      };
    }

    // Check for valid memory operation types
    const validOps = ['create_entities', 'add_observations', 'create_relations', 'delete_entities', 'delete_observations', 'delete_relations'];
    const validOperations = memoryOps.filter(op => validOps.includes(op.operation));

    score = Math.min(100, (validOperations.length / memoryOps.length) * 100);

    return {
      passed: score >= 80,
      score,
      feedback: score >= 80 ? 'Memory operations are valid' : 'Some memory operations have invalid types',
      severity: score < 50 ? 'important' : 'minor',
      category: 'memory'
    };
  }

  private evaluateTaskCompletion(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    const metadata = response.metadata;
    let score = 0;

    // Task completion status
    if (metadata.task_completion_status === 'complete') {
      score += 50;
    } else if (metadata.task_completion_status === 'partial') {
      score += 30;
    } else {
      score += 0;
    }

    // Confidence level
    if (metadata.confidence_level === 'high') {
      score += 30;
    } else if (metadata.confidence_level === 'medium') {
      score += 20;
    } else {
      score += 10;
    }

    // Processing time reasonableness (assuming reasonable range)
    const processingTime = parseInt(metadata.processing_time) || 0;
    if (processingTime > 0 && processingTime < 300000) { // Less than 5 minutes
      score += 20;
    }

    const feedback = score >= 70
      ? 'Task completion indicators are satisfactory'
      : 'Task completion assessment indicates potential issues';

    return {
      passed: score >= 70,
      score,
      feedback,
      severity: score < 40 ? 'important' : 'minor',
      category: 'completion'
    };
  }

  private evaluateResponseQuality(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    let score = 0;
    const issues: string[] = [];

    // Content depth analysis
    const analysis = response.deliverables.analysis || '';
    if (analysis.length > 500) {
      score += 30;
    } else if (analysis.length > 200) {
      score += 20;
    } else {
      issues.push('analysis lacks depth');
    }

    // Recommendations quality
    const recommendations = response.deliverables.recommendations || [];
    if (recommendations.length >= 3) {
      score += 25;
    } else if (recommendations.length >= 1) {
      score += 15;
    } else {
      issues.push('insufficient recommendations');
    }

    // Task alignment
    const taskWords = context.requirements.toLowerCase().split(/\s+/);
    const responseText = (analysis + ' ' + recommendations.join(' ')).toLowerCase();
    const alignmentScore = taskWords.filter(word => responseText.includes(word)).length / taskWords.length;
    score += Math.round(alignmentScore * 45);

    const feedback = issues.length > 0
      ? `Content quality issues: ${issues.join(', ')}`
      : 'Response content meets quality standards';

    return {
      passed: score >= 70,
      score,
      feedback,
      severity: 'important',
      category: 'content'
    };
  }

  // NEW: Code-specific analysis validation methods
  private evaluateFilePathSpecificity(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    // Only apply to technical chatmodes
    const technicalChatmodes = ['Security Engineer', 'Software Engineer', 'DevOps Engineer', 'Database Architect', 'Test Engineer'];
    if (!technicalChatmodes.includes(context.chatmode)) {
      return { passed: true, score: 100, feedback: 'Not applicable for this chatmode', severity: 'minor', category: 'specificity' };
    }

    const analysis = response.deliverables.analysis || '';
    const recommendations = (response.deliverables.recommendations || []).join(' ');
    const fullText = `${analysis} ${recommendations}`;

    let score = 0;
    const issues: string[] = [];

    // Check for file paths with common patterns
    const filePathPatterns = [
      /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_\/-]+\.[a-zA-Z0-9]+/g, // path/to/file.ext
      /src\/[a-zA-Z0-9_\/-]+/g, // src/ paths
      /config\/[a-zA-Z0-9_\/-]+/g, // config/ paths
      /\.\/[a-zA-Z0-9_\/-]+/g, // relative paths
      /\/[a-zA-Z0-9_\/-]+\.[a-zA-Z0-9]+/g // absolute paths
    ];

    const foundPaths = new Set<string>();
    filePathPatterns.forEach(pattern => {
      const matches = fullText.match(pattern) || [];
      matches.forEach(match => foundPaths.add(match));
    });

    if (foundPaths.size >= 3) {
      score += 50;
    } else if (foundPaths.size >= 1) {
      score += 25;
    } else {
      issues.push('no specific file paths found');
    }

    // Check for line number references
    const lineNumberPatterns = [
      /line\s+\d+/gi,
      /lines?\s+\d+(-\d+)?/gi,
      /:\d+/g // file.js:123
    ];

    let hasLineNumbers = false;
    lineNumberPatterns.forEach(pattern => {
      if (pattern.test(fullText)) {
        hasLineNumbers = true;
      }
    });

    if (hasLineNumbers) {
      score += 30;
    } else {
      issues.push('no line number references found');
    }

    // Check for directory structure mentions
    const directoryPatterns = [
      /src\/[a-zA-Z0-9_-]+/g,
      /components?\/[a-zA-Z0-9_-]+/g,
      /utils?\/[a-zA-Z0-9_-]+/g,
      /services?\/[a-zA-Z0-9_-]+/g
    ];

    let hasDirectories = false;
    directoryPatterns.forEach(pattern => {
      if (pattern.test(fullText)) {
        hasDirectories = true;
      }
    });

    if (hasDirectories) {
      score += 20;
    }

    const feedback = issues.length > 0
      ? `File specificity issues: ${issues.join(', ')}. Found ${foundPaths.size} file references.`
      : `Good file specificity: Found ${foundPaths.size} specific file paths`;

    return {
      passed: score >= 50,
      score,
      feedback,
      severity: score < 25 ? 'critical' : 'important',
      category: 'specificity'
    };
  }

  private evaluateCodeSnippetPresence(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    // Only apply to technical chatmodes
    const technicalChatmodes = ['Security Engineer', 'Software Engineer', 'DevOps Engineer', 'Database Architect'];
    if (!technicalChatmodes.includes(context.chatmode)) {
      return { passed: true, score: 100, feedback: 'Not applicable for this chatmode', severity: 'minor', category: 'specificity' };
    }

    const analysis = response.deliverables.analysis || '';
    const recommendations = (response.deliverables.recommendations || []).join(' ');
    const fullText = `${analysis} ${recommendations}`;

    let score = 0;
    const issues: string[] = [];

    // Check for code blocks (markdown or other formats)
    const codeBlockPatterns = [
      /```[\s\S]*?```/g, // markdown code blocks
      /`[^`\n]+`/g, // inline code
      /{\s*[\s\S]*?\s*}/g, // code-like braces
      /function\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g, // function definitions
      /class\s+[a-zA-Z_][a-zA-Z0-9_]*/g, // class definitions
      /const\s+[a-zA-Z_][a-zA-Z0-9_]*\s*=/g, // const declarations
      /if\s*\([^)]+\)\s*{/g, // if statements
      /SELECT\s+[\s\S]*FROM/gi, // SQL queries
      /CREATE\s+TABLE/gi // SQL DDL
    ];

    let codeSnippetCount = 0;
    codeBlockPatterns.forEach(pattern => {
      const matches = fullText.match(pattern) || [];
      codeSnippetCount += matches.length;
    });

    if (codeSnippetCount >= 3) {
      score += 60;
    } else if (codeSnippetCount >= 1) {
      score += 30;
    } else {
      issues.push('no code snippets found');
    }

    // Check for actual vs generic code examples
    const genericTerms = ['example', 'pseudo', 'sample', 'template', 'placeholder'];
    const hasGenericTerms = genericTerms.some(term => fullText.toLowerCase().includes(term));

    if (codeSnippetCount > 0 && !hasGenericTerms) {
      score += 40; // Bonus for real code vs examples
    } else if (codeSnippetCount > 0 && hasGenericTerms) {
      score += 20; // Some credit for examples
      issues.push('appears to use generic examples rather than actual code');
    }

    const feedback = issues.length > 0
      ? `Code snippet issues: ${issues.join(', ')}. Found ${codeSnippetCount} code references.`
      : `Good code specificity: Found ${codeSnippetCount} actual code snippets`;

    return {
      passed: score >= 50,
      score,
      feedback,
      severity: score < 30 ? 'critical' : 'important',
      category: 'specificity'
    };
  }

  private evaluateConcreteAnalysisDepth(response: SubAgentResponse, context: ValidationContext): QualityRuleResult {
    // Only apply to technical chatmodes
    const technicalChatmodes = ['Security Engineer', 'Software Engineer', 'DevOps Engineer', 'Database Architect', 'Test Engineer'];
    if (!technicalChatmodes.includes(context.chatmode)) {
      return { passed: true, score: 100, feedback: 'Not applicable for this chatmode', severity: 'minor', category: 'specificity' };
    }

    const analysis = response.deliverables.analysis || '';
    const recommendations = (response.deliverables.recommendations || []).join(' ');
    const fullText = `${analysis} ${recommendations}`;

    let score = 0;
    const issues: string[] = [];

    // Check against generic/vague terms that indicate shallow analysis
    const vagueTerms = [
      'security vulnerabilities', 'performance issues', 'best practices',
      'code quality', 'optimization opportunities', 'potential problems',
      'may have', 'could be', 'might contain', 'generally', 'typically',
      'standard practices', 'common issues', 'usual problems'
    ];

    const vagueness = vagueTerms.filter(term =>
      fullText.toLowerCase().includes(term.toLowerCase())
    ).length;

    if (vagueness <= 2) {
      score += 40;
    } else if (vagueness <= 5) {
      score += 20;
    } else {
      issues.push(`too many vague terms used (${vagueness} found)`);
    }

    // Check for specific technical terms that indicate deep analysis
    const specificTerms = [
      'algorithm', 'function', 'method', 'variable', 'parameter',
      'injection', 'XSS', 'CSRF', 'JWT', 'SQL', 'NoSQL',
      'middleware', 'controller', 'service', 'repository',
      'index', 'query', 'schema', 'migration', 'constraint',
      'dependency', 'import', 'export', 'configuration'
    ];

    const specificity = specificTerms.filter(term =>
      fullText.toLowerCase().includes(term.toLowerCase())
    ).length;

    if (specificity >= 5) {
      score += 40;
    } else if (specificity >= 3) {
      score += 25;
    } else {
      issues.push(`insufficient technical specificity (${specificity} technical terms)`);
    }

    // Check for actionable recommendations vs generic advice
    const actionableIndicators = [
      'change line', 'modify function', 'update configuration',
      'add validation', 'remove code', 'refactor method',
      'fix query', 'update schema', 'install package'
    ];

    const actionableCount = actionableIndicators.filter(indicator =>
      fullText.toLowerCase().includes(indicator.toLowerCase())
    ).length;

    if (actionableCount >= 2) {
      score += 20;
    } else if (actionableCount >= 1) {
      score += 10;
    } else {
      issues.push('lacks actionable recommendations');
    }

    const feedback = issues.length > 0
      ? `Analysis depth issues: ${issues.join(', ')}. Specificity: ${specificity}/15 technical terms, Vagueness: ${vagueness} vague terms.`
      : `Good analysis depth: ${specificity} technical terms, ${actionableCount} actionable recommendations`;

    return {
      passed: score >= 60,
      score,
      feedback,
      severity: score < 40 ? 'critical' : 'important',
      category: 'specificity'
    };
  }
}
