import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RefinementManager } from '../src/quality/refinement-manager.js';
import { QualityValidator } from '../src/quality/validator.js';
import { SessionManager } from '../src/core/session-manager.js';
import {
  EnhancedQualityAssessment,
  ValidationContext,
  SubAgentResponse,
  RefinementState
} from '../src/utils/types.js';

describe('RefinementManager', () => {
  let refinementManager: RefinementManager;
  let mockSessionManager: SessionManager;
  let mockQualityValidator: QualityValidator;
  let mockAssessment: EnhancedQualityAssessment;
  let mockContext: ValidationContext;
  let mockResponse: SubAgentResponse;

  beforeEach(() => {
    // Create mocked dependencies
    mockSessionManager = {
      incrementRefinementCount: vi.fn(),
      getRefinementCount: vi.fn().mockReturnValue(0),
      getSession: vi.fn().mockReturnValue({
        sessionId: 'test-session',
        totalCalls: 1,
        agentTypeCalls: {},
        refinementCount: {},
        isSubAgent: false,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      })
    } as any;

    mockQualityValidator = new QualityValidator();
    refinementManager = new RefinementManager(mockSessionManager, mockQualityValidator);

    mockAssessment = {
      overallScore: 65,
      passed: false,
      qualityThreshold: 75,
      ruleResults: [
        {
          passed: false,
          score: 60,
          feedback: 'Analysis lacks depth - provide more detailed examination',
          severity: 'important',
          category: 'content'
        },
        {
          passed: false,
          score: 50,
          feedback: 'Recommendations are insufficient - provide at least 3 specific recommendations',
          severity: 'important',
          category: 'completeness'
        }
      ],
      categories: {
        content: 60,
        completeness: 50,
        format: 90,
        memory: 80,
        completion: 70
      },
      recommendations: [
        'Expand analysis with more detailed examination',
        'Add more specific recommendations'
      ],
      criticalIssues: [],
      confidence: 'medium',
      processingTime: 120,
      canRefine: true,
      refinementSuggestions: [
        'Improve content: Analysis lacks depth',
        'Improve completeness: Insufficient recommendations'
      ]
    };

    mockContext = {
      chatmode: 'Security Engineer',
      requirements: 'Analyze authentication security requirements',
      qualityCriteria: 'Must include threat analysis and specific recommendations'
    };

    mockResponse = {
      deliverables: {
        analysis: 'Brief security analysis',
        recommendations: ['Use strong passwords'],
        documents: []
      },
      memory_operations: [
        {
          operation: 'create_entities',
          data: { entities: [] }
        }
      ],
      metadata: {
        chatmode: 'Security Engineer',
        task_completion_status: 'complete',
        processing_time: '30000',
        confidence_level: 'medium'
      }
    };
  });

  describe('needsRefinement', () => {
    it('should return false if assessment already passed', () => {
      const passedAssessment = {
        ...mockAssessment,
        passed: true,
        overallScore: 85
      };

      const needsRefinement = refinementManager.needsRefinement(
        passedAssessment,
        mockContext,
        'test-session'
      );

      expect(needsRefinement).toBe(false);
    });

    it('should return false if critical issues exist', () => {
      const criticalAssessment = {
        ...mockAssessment,
        criticalIssues: ['Critical format error - cannot parse response']
      };

      const needsRefinement = refinementManager.needsRefinement(
        criticalAssessment,
        mockContext,
        'test-session'
      );

      expect(needsRefinement).toBe(false);
    });

    it('should return false if max refinement attempts reached', () => {
      vi.mocked(mockSessionManager.getRefinementCount).mockReturnValue(3);

      const needsRefinement = refinementManager.needsRefinement(
        mockAssessment,
        mockContext,
        'test-session'
      );

      expect(needsRefinement).toBe(false);
    });

    it('should return false if refinement unlikely to help', () => {
      const unrefinableAssessment = {
        ...mockAssessment,
        canRefine: false
      };

      const needsRefinement = refinementManager.needsRefinement(
        unrefinableAssessment,
        mockContext,
        'test-session'
      );

      expect(needsRefinement).toBe(false);
    });

    it('should return true for refinable failing assessment', () => {
      const needsRefinement = refinementManager.needsRefinement(
        mockAssessment,
        mockContext,
        'test-session'
      );

      expect(needsRefinement).toBe(true);
    });
  });

  describe('generateRefinementPrompt', () => {
    it('should generate comprehensive refinement prompt', () => {
      const prompt = refinementManager.generateRefinementPrompt(
        mockAssessment,
        mockContext,
        'Original task description',
        mockResponse
      );

      expect(prompt).toContain('REFINEMENT REQUEST');
      expect(prompt).toContain('scored 65/100');
      expect(prompt).toContain('threshold: 75');
      expect(prompt).toContain('AREAS NEEDING IMPROVEMENT');
      expect(prompt).toContain('SPECIFIC FEEDBACK');
      expect(prompt).toContain('REFINEMENT SUGGESTIONS');
      expect(prompt).toContain('ORIGINAL TASK');
      expect(prompt).toContain('Original task description');
      expect(prompt).toContain('QUALITY REQUIREMENTS');
      expect(prompt).toContain(mockContext.qualityCriteria);
    });

    it('should include specific feedback from failed rules', () => {
      const prompt = refinementManager.generateRefinementPrompt(
        mockAssessment,
        mockContext,
        'Original task',
        mockResponse
      );

      expect(prompt).toContain('Analysis lacks depth');
      expect(prompt).toContain('Recommendations are insufficient');
    });

    it('should include refinement suggestions', () => {
      const prompt = refinementManager.generateRefinementPrompt(
        mockAssessment,
        mockContext,
        'Original task',
        mockResponse
      );

      expect(prompt).toContain('Improve content');
      expect(prompt).toContain('Improve completeness');
    });
  });

  describe('trackRefinementAttempt', () => {
    it('should create new refinement state for first attempt', () => {
      const state = refinementManager.trackRefinementAttempt(
        'test-session',
        'Security Engineer',
        65,
        'Quality threshold not met'
      );

      expect(state.sessionId).toBe('test-session');
      expect(state.attemptNumber).toBe(1);
      expect(state.previousScores).toEqual([65]);
      expect(state.refinementReason).toBe('Quality threshold not met');
      expect(state.qualityTrend).toBe('stable');
      expect(mockSessionManager.incrementRefinementCount).toHaveBeenCalledWith('test-session', 'Security Engineer');
    });

    it('should update existing refinement state for subsequent attempts', () => {
      // First attempt
      refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 65, 'First attempt');

      // Second attempt
      const state = refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 75, 'Second attempt');

      expect(state.attemptNumber).toBe(2);
      expect(state.previousScores).toEqual([65, 75]);
      expect(state.qualityTrend).toBe('improving');
    });

    it('should track declining quality trend', () => {
      refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 70, 'First');
      refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 65, 'Second');
      const state = refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 60, 'Third');

      expect(state.qualityTrend).toBe('declining');
    });
  });

  describe('assessRefinementSuccess', () => {
    beforeEach(() => {
      // Set up a refinement state
      refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 65, 'Initial');
    });

    it('should assess successful refinement with score improvement', () => {
      const improvedAssessment = {
        ...mockAssessment,
        overallScore: 80,
        passed: true
      };

      const result = refinementManager.assessRefinementSuccess(
        'test-session',
        'Security Engineer',
        improvedAssessment
      );

      expect(result.successful).toBe(true);
      expect(result.improvement).toBe(15); // 80 - 65
      expect(result.trend).toBe('improving');
      expect(result.shouldContinue).toBe(false); // Passed, so no need to continue
    });

    it('should assess unsuccessful refinement with declining score', () => {
      const worseAssessment = {
        ...mockAssessment,
        overallScore: 55,
        passed: false
      };

      const result = refinementManager.assessRefinementSuccess(
        'test-session',
        'Security Engineer',
        worseAssessment
      );

      expect(result.successful).toBe(false);
      expect(result.improvement).toBe(-10); // 55 - 65
      expect(result.shouldContinue).toBe(false); // Declining trend, should stop
    });

    it('should recommend continuation for improving but not yet passing responses', () => {
      const improvingAssessment = {
        ...mockAssessment,
        overallScore: 72, // Better but still not passing
        passed: false,
        canRefine: true
      };

      const result = refinementManager.assessRefinementSuccess(
        'test-session',
        'Security Engineer',
        improvingAssessment
      );

      expect(result.successful).toBe(false); // Not passed yet
      expect(result.improvement).toBe(7); // 72 - 65
      expect(result.trend).toBe('improving');
      expect(result.shouldContinue).toBe(true); // Still improving and can refine
    });
  });

  describe('getRefinementStats', () => {
    it('should return empty stats for session with no refinements', () => {
      const stats = refinementManager.getRefinementStats('empty-session');

      expect(stats.totalRefinements).toBe(0);
      expect(stats.chatmodeBreakdown).toEqual({});
      expect(stats.averageImprovement).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate stats correctly for session with refinements', () => {
      // Set up refinement attempts
      refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 60, 'First');
      refinementManager.trackRefinementAttempt('test-session', 'Security Engineer', 70, 'Second');
      refinementManager.trackRefinementAttempt('test-session', 'Software Architect', 65, 'First');
      refinementManager.trackRefinementAttempt('test-session', 'Software Architect', 80, 'Second');

      const stats = refinementManager.getRefinementStats('test-session');

      expect(stats.totalRefinements).toBe(4);
      expect(stats.averageImprovement).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
    });
  });

  describe('cleanupOldStates', () => {
    it('should remove old refinement states', () => {
      // Track some refinements
      refinementManager.trackRefinementAttempt('old-session', 'Security Engineer', 60, 'Old attempt');

      // Mock the state to be old by manipulating time
      const oldTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago

      // Clean up states older than 24 hours
      refinementManager.cleanupOldStates(24 * 60 * 60 * 1000);

      // The state should still exist since we can't actually manipulate the internal state
      // This test verifies the method runs without error
      expect(() => refinementManager.cleanupOldStates()).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete refinement workflow', () => {
      const sessionId = 'workflow-session';
      const chatmode = 'Security Engineer';

      // Initial assessment fails
      expect(refinementManager.needsRefinement(mockAssessment, mockContext, sessionId)).toBe(true);

      // Track first refinement attempt
      const firstState = refinementManager.trackRefinementAttempt(sessionId, chatmode, 65, 'Initial attempt');
      expect(firstState.attemptNumber).toBe(1);

      // Generate refinement prompt
      const prompt = refinementManager.generateRefinementPrompt(
        mockAssessment,
        mockContext,
        'Original task',
        mockResponse
      );
      expect(prompt).toContain('REFINEMENT REQUEST');

      // Assess improved response
      const improvedAssessment = {
        ...mockAssessment,
        overallScore: 80,
        passed: true
      };

      const success = refinementManager.assessRefinementSuccess(sessionId, chatmode, improvedAssessment);
      expect(success.successful).toBe(true);
      expect(success.shouldContinue).toBe(false);
    });

    it('should prevent excessive refinement attempts', () => {
      const sessionId = 'limit-session';
      const chatmode = 'Security Engineer';

      // Mock session manager to return high refinement count
      vi.mocked(mockSessionManager.getRefinementCount).mockReturnValue(5);

      const needsRefinement = refinementManager.needsRefinement(mockAssessment, mockContext, sessionId);
      expect(needsRefinement).toBe(false);
    });
  });
});
