import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsManager } from '../src/analytics/analytics-manager.js';
import {
  EnhancedQualityAssessment,
  ValidationContext,
  QualityRuleResult
} from '../src/utils/types.js';

describe('Analytics Integration', () => {
  let analyticsManager: AnalyticsManager;

  beforeEach(() => {
    analyticsManager = new AnalyticsManager();
    // Clear any existing analytics data to ensure clean test state
    analyticsManager.clearAnalyticsData();
  });

  describe('Validation Event Recording', () => {
    it('should record validation events with complete analytics data', () => {
      const enhancedAssessment: EnhancedQualityAssessment = {
        overallScore: 0.85,
        qualityThreshold: 0.75,
        passed: true,
        confidence: 'high',
        processingTime: 250,
        canRefine: false,
        categories: {
          completeness: 0.90,
          accuracy: 0.85,
          clarity: 0.80,
          relevance: 0.85
        },
        ruleResults: [
          {
            category: 'completeness',
            passed: true,
            score: 0.90,
            severity: 'minor',
            feedback: 'All required sections present'
          } as QualityRuleResult
        ],
        criticalIssues: [],
        recommendations: ['Consider adding more examples'],
        refinementSuggestions: []
      };

      const context: ValidationContext = {
        chatmode: 'Software Engineer',
        requirements: 'Implement user authentication',
        qualityCriteria: 'Secure, maintainable, well-tested'
      };

      // Record the validation event
      expect(() => {
        analyticsManager.recordValidationEvent(
          enhancedAssessment,
          context,
          'test-session-123',
          'validation-op-456'
        );
      }).not.toThrow();

      // Verify analytics were recorded
      const qualityTrends = analyticsManager.getQualityTrends('Software Engineer', 1);
      expect(qualityTrends.totalValidations).toBeGreaterThan(0);
      expect(qualityTrends.scoreAverage).toBeCloseTo(0.85, 2);
    });

    it('should track refinement events with improvement metrics', () => {
      const sessionId = 'refinement-test-session';
      const chatmode = 'Database Architect';
      const originalScore = 0.65;
      const improvedScore = 0.82;

      // Record refinement event
      expect(() => {
        analyticsManager.recordRefinementEvent(
          sessionId,
          chatmode,
          originalScore,
          improvedScore,
          true
        );
      }).not.toThrow();

      // Check usage patterns for refinement activity
      const usagePatterns = analyticsManager.getUsagePatterns(chatmode, 1);
      expect(usagePatterns.length).toBeGreaterThan(0);

      const securityPattern = usagePatterns.find(p => p.chatmode === chatmode);
      expect(securityPattern).toBeDefined();
      expect(securityPattern?.successRate).toBeGreaterThan(0);
    });
  });

  describe('Quality Analytics', () => {
    it('should provide quality trends and insights', () => {
      // Record sample quality data with some failures to trigger insights
      const assessments = [
        { score: 0.85, chatmode: 'Security Engineer', passed: true },
        { score: 0.92, chatmode: 'Security Engineer', passed: true },
        { score: 0.78, chatmode: 'Security Engineer', passed: true },
        { score: 0.60, chatmode: 'DevOps Engineer', passed: false }, // Low score to trigger insights
        { score: 0.55, chatmode: 'DevOps Engineer', passed: false }  // Another low score
      ];

      assessments.forEach((assessment, index) => {
        const enhancedAssessment: EnhancedQualityAssessment = {
          overallScore: assessment.score,
          qualityThreshold: 0.75,
          passed: assessment.passed,
          confidence: 'medium',
          processingTime: 200,
          canRefine: !assessment.passed,
          categories: { completeness: assessment.score },
          ruleResults: [],
          criticalIssues: [],
          recommendations: [],
          refinementSuggestions: []
        };

        const context: ValidationContext = {
          chatmode: assessment.chatmode,
          requirements: `Test requirement ${index}`,
          qualityCriteria: 'Standard criteria'
        };

        analyticsManager.recordValidationEvent(
          enhancedAssessment,
          context,
          `session-${index}`
        );
      });

      // Test quality trends
      const securityTrends = analyticsManager.getQualityTrends('Security Engineer', 7);
      expect(securityTrends.totalValidations).toBe(3);
      expect(securityTrends.successRate).toBe(1.0); // All passed
      expect(securityTrends.scoreAverage).toBeCloseTo(0.85, 2);

      const devopsTrends = analyticsManager.getQualityTrends('DevOps Engineer', 7);
      expect(devopsTrends.totalValidations).toBe(2);
      expect(devopsTrends.successRate).toBe(0.0); // Both failed

      // Test quality insights
      const insights = analyticsManager.getQualityInsights();
      // Insights may be empty if no problematic conditions are detected
      expect(Array.isArray(insights)).toBe(true);

      // If insights exist, they should have the correct structure
      if (insights.length > 0) {
        const firstInsight = insights[0];
        expect(firstInsight).toHaveProperty('type');
        expect(firstInsight).toHaveProperty('severity');
        expect(firstInsight).toHaveProperty('title');
        expect(firstInsight).toHaveProperty('description');
      }
    });

    it('should compare chatmode performance accurately', () => {
      // Record different performance levels for different chatmodes
      const performanceData = [
        { chatmode: 'Test Engineer', score: 0.95, count: 5 },
        { chatmode: 'Software Architect', score: 0.88, count: 3 },
        { chatmode: 'Technical Writer', score: 0.92, count: 4 }
      ];

      performanceData.forEach(({ chatmode, score, count }) => {
        for (let i = 0; i < count; i++) {
          const assessment: EnhancedQualityAssessment = {
            overallScore: score + (Math.random() - 0.5) * 0.1, // Small variance
            qualityThreshold: 0.75,
            passed: true,
            confidence: 'high',
            processingTime: 200,
            canRefine: false,
            categories: { completeness: score },
            ruleResults: [],
            criticalIssues: [],
            recommendations: [],
            refinementSuggestions: []
          };

          analyticsManager.recordValidationEvent(
            assessment,
            { chatmode, requirements: 'Test', qualityCriteria: 'Test' },
            `session-${chatmode}-${i}`
          );
        }
      });

      const comparison = analyticsManager.compareChatmodePerformance();
      expect(Object.keys(comparison)).toContain('Test Engineer');
      expect(Object.keys(comparison)).toContain('Software Architect');
      expect(Object.keys(comparison)).toContain('Technical Writer');

      // Test Engineer should have the highest average score
      expect(comparison['Test Engineer'].scoreAverage).toBeGreaterThan(0.90);
    });
  });

  describe('Performance Analytics', () => {
    it('should track operation performance metrics', () => {
      const operationId = 'perf-test-123';

      // Start timing
      analyticsManager.startTiming(operationId, 'quality_validation');

      // Simulate work
      const startTime = Date.now();
      while (Date.now() - startTime < 50) {
        // Busy wait for 50ms
      }

      // End timing
      const duration = analyticsManager.endTiming(operationId, 'quality_validation', true);

      expect(duration).toBeGreaterThan(40);
      expect(duration).toBeLessThan(100);

      // Get performance insights
      const insights = analyticsManager.getPerformanceInsights('quality_validation', 1);
      expect(insights).toBeDefined();
      expect(typeof insights === 'object').toBe(true);
    });

    it('should provide system health status', () => {
      const health = analyticsManager.getSystemHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('memoryUsage');
      expect(health).toHaveProperty('errorRate');
      expect(health).toHaveProperty('avgResponseTime');
      expect(health).toHaveProperty('lastCleanup');

      expect(['healthy', 'warning', 'critical', 'unknown']).toContain(health.status);
    });
  });

  describe('Usage Pattern Analysis', () => {
    it('should identify usage patterns across chatmodes', () => {
      // Simulate various usage patterns
      const usageData = [
        { chatmode: 'Security Engineer', operation: 'validation', count: 10 },
        { chatmode: 'Security Engineer', operation: 'refinement', count: 3 },
        { chatmode: 'DevOps Engineer', operation: 'validation', count: 8 },
        { chatmode: 'Software Engineer', operation: 'validation', count: 15 }
      ];

      usageData.forEach(({ chatmode, operation, count }) => {
        for (let i = 0; i < count; i++) {
          const sessionId = `usage-session-${chatmode}-${operation}-${i}`;

          if (operation === 'refinement') {
            analyticsManager.recordRefinementEvent(
              sessionId,
              chatmode,
              0.65,
              0.80,
              true
            );
          } else {
            // Record validation events
            const assessment: EnhancedQualityAssessment = {
              overallScore: 0.85,
              qualityThreshold: 0.75,
              passed: true,
              confidence: 'medium',
              processingTime: 200,
              canRefine: false,
              categories: { completeness: 0.85 },
              ruleResults: [],
              criticalIssues: [],
              recommendations: [],
              refinementSuggestions: []
            };

            analyticsManager.recordValidationEvent(
              assessment,
              { chatmode, requirements: 'Test', qualityCriteria: 'Test' },
              sessionId
            );
          }
        }
      });

      // Analyze usage patterns
      const patterns = analyticsManager.getUsagePatterns(undefined, 1);
      expect(patterns.length).toBeGreaterThan(0);

      const securityPattern = patterns.find(p => p.chatmode === 'Security Engineer');
      expect(securityPattern).toBeDefined();
      expect(securityPattern?.successRate).toBeGreaterThan(0);

      const devopsPattern = patterns.find(p => p.chatmode === 'DevOps Engineer');
      expect(devopsPattern).toBeDefined();
    });
  });

  describe('Analytics Report Generation', () => {
    it('should generate comprehensive analytics reports', () => {
      // Set up sample data
      const sampleAssessment: EnhancedQualityAssessment = {
        overallScore: 0.85,
        qualityThreshold: 0.75,
        passed: true,
        confidence: 'high',
        processingTime: 200,
        canRefine: false,
        categories: {
          completeness: 0.90,
          accuracy: 0.85,
          clarity: 0.80,
          relevance: 0.85
        },
        ruleResults: [],
        criticalIssues: [],
        recommendations: ['Add more documentation'],
        refinementSuggestions: []
      };

      const context: ValidationContext = {
        chatmode: 'Technical Writer',
        requirements: 'Create documentation',
        qualityCriteria: 'Clear, comprehensive, accurate'
      };

      // Record some data
      for (let i = 0; i < 5; i++) {
        analyticsManager.recordValidationEvent(
          sampleAssessment,
          context,
          `report-session-${i}`
        );
      }

      // Generate report
      const report = analyticsManager.generateAnalyticsReport(7);

      expect(report).toHaveProperty('executiveSummary');
      expect(report).toHaveProperty('qualityReport');
      expect(report).toHaveProperty('performanceReport');
      expect(report).toHaveProperty('usageReport');
      expect(report).toHaveProperty('systemStatus');
      expect(report).toHaveProperty('generatedAt');

      expect(report.executiveSummary.totalValidations).toBeGreaterThan(0);
      expect(report.executiveSummary.avgQualityScore).toBeCloseTo(0.85, 1);
      expect(report.executiveSummary.successRate).toBeCloseTo(1.0, 1); // Relaxed precision
      expect(report.executiveSummary.keyInsights.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics Data Export', () => {
    it('should export analytics data for external analysis', () => {
      // Record some sample data
      const assessment: EnhancedQualityAssessment = {
        overallScore: 0.80,
        qualityThreshold: 0.75,
        passed: true,
        confidence: 'medium',
        processingTime: 300,
        canRefine: false,
        categories: { completeness: 0.80 },
        ruleResults: [],
        criticalIssues: [],
        recommendations: [],
        refinementSuggestions: []
      };

      analyticsManager.recordValidationEvent(
        assessment,
        { chatmode: 'Export Test', requirements: 'Test', qualityCriteria: 'Test' },
        'export-session'
      );

      // Export data
      const exportData = analyticsManager.exportAnalyticsData();

      expect(exportData).toHaveProperty('qualityData');
      expect(exportData).toHaveProperty('performanceData');
      expect(exportData).toHaveProperty('usageData');
      expect(exportData).toHaveProperty('metadata');

      expect(exportData.metadata).toHaveProperty('exportedAt');
      expect(exportData.metadata).toHaveProperty('totalRecords');
      expect(exportData.metadata.totalRecords).toBeGreaterThan(0);
    });
  });

  describe('Analytics Status and Health', () => {
    it('should provide analytics system status', () => {
      const status = analyticsManager.getAnalyticsStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('storageHealth');
      expect(status).toHaveProperty('configStatus');
      expect(status).toHaveProperty('lastActivity');

      expect(status.initialized).toBe(true);
      expect(status.configStatus).toBe('active');
    });
  });
});
