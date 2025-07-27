import {
  RefinementState,
  EnhancedQualityAssessment,
  ValidationContext,
  SubagentQualityConfig,
  SubAgentResponse
} from '../utils/types.js';
import { SessionManager } from '../core/session-manager.js';
import { QualityValidator } from './validator.js';
import { logger } from '../utils/logger.js';
import { templateManager } from '../utils/template-manager.js';

/**
 * Manages iterative refinement of sub-agent responses
 * Tracks refinement attempts and provides targeted feedback
 */
export class RefinementManager {
  private refinementStates: Map<string, RefinementState> = new Map();
  private sessionManager: SessionManager;
  private qualityValidator: QualityValidator;

  constructor(sessionManager: SessionManager, qualityValidator: QualityValidator) {
    this.sessionManager = sessionManager;
    this.qualityValidator = qualityValidator;
  }

  /**
   * Determine if a response needs refinement based on quality assessment
   */
  needsRefinement(
    assessment: EnhancedQualityAssessment,
    context: ValidationContext,
    sessionId: string
  ): boolean {
    // Check if quality threshold is met
    if (assessment.passed) {
      return false;
    }

    // Check if critical issues exist that can't be refined
    if (assessment.criticalIssues.length > 0) {
      logger.warn('Critical issues detected - refinement may not help', {
        sessionId,
        subagent: context.subagent,
        criticalIssues: assessment.criticalIssues
      });
      return false;
    }

    // Check refinement attempt limits using SessionManager
    const currentCount = this.sessionManager.getRefinementCount(sessionId, context.subagent);
    const maxAttempts = this.getMaxRefinementAttempts(context.subagent);

    if (currentCount >= maxAttempts) {
      logger.info('Maximum refinement attempts reached', {
        sessionId,
        subagent: context.subagent,
        attempts: currentCount,
        maxAttempts
      });
      return false;
    }

    // Check if refinement would likely help
    return assessment.canRefine;
  }

  /**
   * Generate refinement prompt based on quality assessment
   */
  generateRefinementPrompt(
    assessment: EnhancedQualityAssessment,
    context: ValidationContext,
    originalTask: string,
    previousResponse: SubAgentResponse
  ): string {
    const refinementAreas = this.identifyRefinementAreas(assessment);
    const specificFeedback = this.generateSpecificFeedback(assessment, context);

    try {
      return templateManager.render('refinement-prompt', {
        overallScore: assessment.overallScore,
        qualityThreshold: assessment.qualityThreshold,
        refinementAreas,
        specificFeedback,
        refinementSuggestions: assessment.refinementSuggestions,
        originalTask,
        qualityCriteria: context.qualityCriteria
      });
    } catch (error) {
      logger.error('Failed to render refinement prompt template', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to hardcoded template
      const prompt = `
REFINEMENT REQUEST

Your previous response scored ${assessment.overallScore}/100 (threshold: ${assessment.qualityThreshold}). Please refine your response addressing the following areas:

AREAS NEEDING IMPROVEMENT:
${refinementAreas.map(area => `• ${area}`).join('\n')}

SPECIFIC FEEDBACK:
${specificFeedback.map(feedback => `• ${feedback}`).join('\n')}

REFINEMENT SUGGESTIONS:
${assessment.refinementSuggestions.map(suggestion => `• ${suggestion}`).join('\n')}

ORIGINAL TASK:
${originalTask}

QUALITY REQUIREMENTS:
${context.qualityCriteria}

Please provide a refined response that addresses these issues while maintaining the same JSON format structure.
    `.trim();

      return prompt;
    }
  }

  /**
   * Track a refinement attempt
   */
  trackRefinementAttempt(
    sessionId: string,
    subagent: string,
    previousScore: number,
    refinementReason: string
  ): RefinementState {
    const key = `${sessionId}-${subagent}`;
    let state = this.refinementStates.get(key);

    if (!state) {
      state = {
        sessionId,
        originalTaskId: this.generateTaskId(),
        attemptNumber: 0,
        previousScores: [],
        improvementAreas: [],
        lastRefinementTime: new Date().toISOString(),
        refinementReason: '',
        qualityTrend: 'stable'
      };
    }

    // Update state
    state.attemptNumber += 1;
    state.previousScores.push(previousScore);
    state.lastRefinementTime = new Date().toISOString();
    state.refinementReason = refinementReason;
    state.qualityTrend = this.assessQualityTrend(state.previousScores);

    this.refinementStates.set(key, state);

    // Update session manager with refinement tracking
    this.sessionManager.incrementRefinementCount(sessionId, subagent);

    logger.info('Refinement attempt tracked', {
      sessionId,
      subagent,
      attempt: state.attemptNumber,
      previousScore,
      qualityTrend: state.qualityTrend
    });

    return state;
  }

  /**
   * Assess if refinement was successful
   */
  assessRefinementSuccess(
    sessionId: string,
    subagent: string,
    newAssessment: EnhancedQualityAssessment
  ): {
    successful: boolean;
    improvement: number;
    trend: 'improving' | 'declining' | 'stable';
    shouldContinue: boolean;
  } {
    const key = `${sessionId}-${subagent}`;
    const state = this.refinementStates.get(key);

    if (!state || state.previousScores.length === 0) {
      return {
        successful: newAssessment.passed,
        improvement: 0,
        trend: 'stable',
        shouldContinue: !newAssessment.passed
      };
    }

    const previousScore = state.previousScores[state.previousScores.length - 1];
    const improvement = newAssessment.overallScore - previousScore;
    const successful = newAssessment.passed || improvement > 10; // 10+ point improvement considered successful

    // Update trend
    state.previousScores.push(newAssessment.overallScore);
    state.qualityTrend = this.assessQualityTrend(state.previousScores);

    const shouldContinue = !newAssessment.passed &&
                          state.attemptNumber < this.getMaxRefinementAttempts(subagent) &&
                          newAssessment.canRefine &&
                          state.qualityTrend !== 'declining';

    logger.info('Refinement success assessed', {
      sessionId,
      subagent,
      successful,
      improvement,
      newScore: newAssessment.overallScore,
      previousScore,
      trend: state.qualityTrend,
      shouldContinue
    });

    return {
      successful,
      improvement,
      trend: state.qualityTrend,
      shouldContinue
    };
  }

  /**
   * Get refinement statistics for a session
   */
  getRefinementStats(sessionId: string): {
    totalRefinements: number;
    chatmodeBreakdown: Record<string, number>;
    averageImprovement: number;
    successRate: number;
  } {
    const sessionStates = Array.from(this.refinementStates.values())
      .filter(state => state.sessionId === sessionId);

    if (sessionStates.length === 0) {
      return {
        totalRefinements: 0,
        chatmodeBreakdown: {},
        averageImprovement: 0,
        successRate: 0
      };
    }

    const totalRefinements = sessionStates.reduce((sum, state) => sum + state.attemptNumber, 0);
    const chatmodeBreakdown: Record<string, number> = {};
    let totalImprovement = 0;
    let successfulRefinements = 0;

    for (const state of sessionStates) {
      const chatmode = this.extractChatmodeFromState(state);
      chatmodeBreakdown[chatmode] = (chatmodeBreakdown[chatmode] || 0) + state.attemptNumber;

      // Calculate improvement for this state
      if (state.previousScores.length > 1) {
        const firstScore = state.previousScores[0];
        const lastScore = state.previousScores[state.previousScores.length - 1];
        const improvement = lastScore - firstScore;
        totalImprovement += improvement;

        if (improvement > 0) {
          successfulRefinements++;
        }
      }
    }

    return {
      totalRefinements,
      chatmodeBreakdown,
      averageImprovement: sessionStates.length > 0 ? totalImprovement / sessionStates.length : 0,
      successRate: sessionStates.length > 0 ? successfulRefinements / sessionStates.length : 0
    };
  }

  /**
   * Clean up old refinement states
   */
  cleanupOldStates(maxAge: number = 24 * 60 * 60 * 1000): void { // 24 hours default
    const cutoffTime = Date.now() - maxAge;
    const keysToDelete: string[] = [];

    for (const [key, state] of this.refinementStates.entries()) {
      const stateTime = new Date(state.lastRefinementTime).getTime();
      if (stateTime < cutoffTime) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.refinementStates.delete(key);
    }

    if (keysToDelete.length > 0) {
      logger.info('Cleaned up old refinement states', {
        deletedCount: keysToDelete.length,
        remainingCount: this.refinementStates.size
      });
    }
  }

  // Private helper methods

  private getRefinementState(sessionId: string, subagent: string): RefinementState {
    const key = `${sessionId}-${subagent}`;
    return this.refinementStates.get(key) || {
      sessionId,
      originalTaskId: this.generateTaskId(),
      attemptNumber: 0,
      previousScores: [],
      improvementAreas: [],
      lastRefinementTime: new Date().toISOString(),
      refinementReason: '',
      qualityTrend: 'stable'
    };
  }

  private getMaxRefinementAttempts(subagent: string): number {
    // Default max attempts - could be made configurable per chatmode
    const maxAttempts: Record<string, number> = {
      'Security Engineer': 3,
      'Software Architect': 3,
      'Database Architect': 2,
      'Test Engineer': 2,
      'default': 2
    };

    return maxAttempts[subagent] || maxAttempts['default'];
  }

  private identifyRefinementAreas(assessment: EnhancedQualityAssessment): string[] {
    const areas: string[] = [];

    // Identify categories with low scores
    for (const [category, score] of Object.entries(assessment.categories)) {
      if (score < 70) {
        areas.push(`${category} (score: ${score}/100)`);
      }
    }

    // Add specific failed rules
    const failedRules = assessment.ruleResults
      .filter(result => !result.passed && result.severity !== 'critical')
      .map(result => result.category);

    for (const category of [...new Set(failedRules)]) {
      if (!areas.some(area => area.includes(category))) {
        areas.push(category);
      }
    }

    return areas;
  }

  private generateSpecificFeedback(assessment: EnhancedQualityAssessment, context: ValidationContext): string[] {
    const feedback: string[] = [];

    // Extract feedback from failed rules
    for (const result of assessment.ruleResults) {
      if (!result.passed && result.feedback && result.severity !== 'critical') {
        feedback.push(result.feedback);
      }
    }

    // Add contextual feedback
    if (assessment.overallScore < 50) {
      feedback.push('Response needs significant improvement to meet quality standards');
    } else if (assessment.overallScore < assessment.qualityThreshold) {
      feedback.push('Response is close to quality threshold - minor improvements needed');
    }

    return feedback;
  }

  private assessQualityTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable';

    const recentScores = scores.slice(-3); // Look at last 3 scores
    if (recentScores.length < 2) return 'stable';

    const firstScore = recentScores[0];
    const lastScore = recentScores[recentScores.length - 1];
    const difference = lastScore - firstScore;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractChatmodeFromState(state: RefinementState): string {
    // Extract chatmode from stored states - this is a simplified implementation
    // In practice, you might want to store chatmode explicitly in RefinementState
    return 'unknown'; // This would need to be improved based on actual implementation needs
  }
}
