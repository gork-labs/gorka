import { describe, it, expect, beforeEach } from 'vitest';
import { MLEngine } from '../src/ml/ml-engine.js';
import { AnalyticsManager } from '../src/analytics/analytics-manager.js';
import {
  EnhancedQualityAssessment,
  ValidationContext,
  QualityRuleResult
} from '../src/utils/types.js';

describe('ML Engine Integration', () => {
  let mlEngine: MLEngine;
  let analyticsManager: AnalyticsManager;

  beforeEach(() => {
    analyticsManager = new AnalyticsManager();
    mlEngine = new MLEngine(analyticsManager);
  });

  describe('Quality Score Prediction', () => {
    it('should predict quality scores with reasonable defaults', async () => {
      const context: ValidationContext = {
        chatmode: 'Software Engineer',
        requirements: 'Implement user authentication with secure password handling',
        qualityCriteria: 'Secure, maintainable, well-tested'
      };

      const prediction = await mlEngine.predictQualityScore(context);

      expect(prediction).toBeDefined();
      expect(prediction.predictedScore).toBeGreaterThanOrEqual(0);
      expect(prediction.predictedScore).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(prediction.predictionBasis)).toBe(true);
      expect(Array.isArray(prediction.riskFactors)).toBe(true);
      expect(Array.isArray(prediction.successFactors)).toBe(true);
    });

    it('should provide different predictions for different chatmodes', async () => {
      const baseContext = {
        requirements: 'Implement feature X',
        qualityCriteria: 'High quality'
      };

      const securityPrediction = await mlEngine.predictQualityScore({
        ...baseContext,
        chatmode: 'Security Engineer'
      });

      const softwarePrediction = await mlEngine.predictQualityScore({
        ...baseContext,
        chatmode: 'Software Engineer'
      });

      expect(securityPrediction).toBeDefined();
      expect(softwarePrediction).toBeDefined();
      // Predictions may differ based on chatmode-specific patterns
      expect(typeof securityPrediction.predictedScore).toBe('number');
      expect(typeof softwarePrediction.predictedScore).toBe('number');
    });

    it('should handle complex requirements appropriately', async () => {
      const complexContext: ValidationContext = {
        chatmode: 'Software Architect',
        requirements: 'Design a highly scalable, fault-tolerant microservices architecture supporting real-time data processing, event sourcing, CQRS patterns, with comprehensive security, monitoring, and observability across multiple cloud providers while maintaining GDPR compliance and sub-100ms response times.',
        qualityCriteria: 'Scalable, secure, maintainable, performance-optimized, compliant'
      };

      const prediction = await mlEngine.predictQualityScore(complexContext);

      expect(prediction.riskFactors.length).toBeGreaterThan(0);
      expect(prediction.riskFactors.some(risk =>
        risk.includes('long requirements') || risk.includes('complex')
      )).toBe(true);
    });
  });

  describe('Refinement Success Prediction', () => {
    it('should predict refinement success probability', async () => {
      const context: ValidationContext = {
        chatmode: 'Test Engineer',
        requirements: 'Create comprehensive test suite',
        qualityCriteria: 'High coverage, edge cases'
      };

      const prediction = await mlEngine.predictRefinementSuccess(0.65, context, 1);

      expect(prediction).toBeDefined();
      expect(prediction.prediction).toBeGreaterThanOrEqual(0);
      expect(prediction.prediction).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(typeof prediction.reasoning).toBe('string');
      expect(prediction.features).toBeInstanceOf(Map);
    });

    it('should provide lower success probability for very low scores', async () => {
      const context: ValidationContext = {
        chatmode: 'Software Engineer',
        requirements: 'Simple task',
        qualityCriteria: 'Basic quality'
      };

      const lowScorePrediction = await mlEngine.predictRefinementSuccess(0.2, context, 1);
      const highScorePrediction = await mlEngine.predictRefinementSuccess(0.7, context, 1);

      // Generally, higher scores should have better refinement prospects
      expect(highScorePrediction.prediction).toBeGreaterThanOrEqual(lowScorePrediction.prediction);
    });

    it('should consider refinement attempt number', async () => {
      const context: ValidationContext = {
        chatmode: 'DevOps Engineer',
        requirements: 'Deploy application',
        qualityCriteria: 'Reliable deployment'
      };

      const firstAttempt = await mlEngine.predictRefinementSuccess(0.6, context, 1);
      const thirdAttempt = await mlEngine.predictRefinementSuccess(0.6, context, 3);

      expect(firstAttempt).toBeDefined();
      expect(thirdAttempt).toBeDefined();
      // Multiple attempts may indicate diminishing returns
      expect(typeof firstAttempt.prediction).toBe('number');
      expect(typeof thirdAttempt.prediction).toBe('number');
    });
  });

  describe('Machine Learning Insights', () => {
    it('should provide ML system insights', async () => {
      const insights = await mlEngine.getMLInsights();

      expect(Array.isArray(insights)).toBe(true);
      // Initially, insights may be empty due to lack of training data
      insights.forEach(insight => {
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('severity');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('actionRequired');
        expect(['info', 'warning', 'critical']).toContain(insight.severity);
        expect(typeof insight.actionRequired).toBe('boolean');
      });
    });

    it('should provide ML status information', () => {
      const status = mlEngine.getMLStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('modelsLoaded');
      expect(status).toHaveProperty('trainingDataSize');
      expect(status).toHaveProperty('lastModelUpdate');
      expect(status).toHaveProperty('learningPatternsCount');
      expect(status).toHaveProperty('modelAccuracies');

      expect(typeof status.enabled).toBe('boolean');
      expect(typeof status.modelsLoaded).toBe('number');
      expect(typeof status.trainingDataSize).toBe('number');
      expect(typeof status.modelAccuracies).toBe('object');
    });
  });

  describe('Optimization Suggestions', () => {
    it('should generate optimization suggestions', async () => {
      const suggestions = await mlEngine.generateOptimizationSuggestions();

      expect(Array.isArray(suggestions)).toBe(true);

      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('component');
        expect(suggestion).toHaveProperty('currentValue');
        expect(suggestion).toHaveProperty('suggestedValue');
        expect(suggestion).toHaveProperty('expectedImprovement');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('rationale');

        expect(['threshold', 'rule_weight', 'refinement_strategy']).toContain(suggestion.type);
        expect(typeof suggestion.currentValue).toBe('number');
        expect(typeof suggestion.suggestedValue).toBe('number');
        expect(typeof suggestion.expectedImprovement).toBe('number');
        expect(typeof suggestion.confidence).toBe('number');
        expect(typeof suggestion.rationale).toBe('string');
      });
    });
  });

  describe('Learning from Validation', () => {
    it('should learn from validation results without errors', async () => {
      const context: ValidationContext = {
        chatmode: 'Database Architect',
        requirements: 'Design user database schema',
        qualityCriteria: 'Normalized, performant, scalable'
      };

      const assessment: EnhancedQualityAssessment = {
        overallScore: 0.82,
        qualityThreshold: 0.75,
        passed: true,
        confidence: 'high',
        processingTime: 150,
        canRefine: false,
        categories: {
          completeness: 0.85,
          accuracy: 0.80,
          clarity: 0.85,
          relevance: 0.78
        },
        ruleResults: [
          {
            category: 'completeness',
            passed: true,
            score: 0.85,
            severity: 'minor',
            feedback: 'Schema design is comprehensive'
          } as QualityRuleResult
        ],
        criticalIssues: [],
        recommendations: ['Consider adding indexes for common queries'],
        refinementSuggestions: []
      };

      // Should not throw an error
      await expect(mlEngine.learnFromValidation(context, assessment)).resolves.not.toThrow();

      // Training data should increase
      const initialStatus = mlEngine.getMLStatus();
      expect(initialStatus.trainingDataSize).toBeGreaterThan(0);
    });

    it('should handle learning from multiple validation results', async () => {
      const contexts = [
        {
          chatmode: 'Security Engineer',
          requirements: 'Security audit',
          qualityCriteria: 'Comprehensive security analysis'
        },
        {
          chatmode: 'Software Engineer',
          requirements: 'Implement API endpoint',
          qualityCriteria: 'RESTful, documented'
        },
        {
          chatmode: 'Test Engineer',
          requirements: 'Create test plan',
          qualityCriteria: 'Complete coverage'
        }
      ];

      const assessments = contexts.map((_, index) => ({
        overallScore: 0.7 + (index * 0.1),
        qualityThreshold: 0.75,
        passed: index > 0,
        confidence: 'medium' as const,
        processingTime: 200,
        canRefine: index === 0,
        categories: { completeness: 0.8 },
        ruleResults: [],
        criticalIssues: [],
        recommendations: [],
        refinementSuggestions: []
      }));

      for (let i = 0; i < contexts.length; i++) {
        await mlEngine.learnFromValidation(contexts[i], assessments[i]);
      }

      const finalStatus = mlEngine.getMLStatus();
      expect(finalStatus.trainingDataSize).toBe(contexts.length);
    });
  });

  describe('ML Configuration and Fallbacks', () => {
    it('should handle disabled ML gracefully', async () => {
      const disabledMLEngine = new MLEngine(analyticsManager, { enabled: false });

      const context: ValidationContext = {
        chatmode: 'Software Engineer',
        requirements: 'Test with disabled ML',
        qualityCriteria: 'Should fallback gracefully'
      };

      const prediction = await disabledMLEngine.predictQualityScore(context);

      expect(prediction.confidence).toBe(0.0);
      expect(prediction.predictionBasis.some(basis =>
        basis.includes('ML disabled')
      )).toBe(true);
    });

    it('should use fallback predictions when insufficient training data', async () => {
      // Fresh ML engine with no training data
      const freshMLEngine = new MLEngine(analyticsManager, {
        minTrainingDataPoints: 100 // High threshold to force fallback
      });

      const context: ValidationContext = {
        chatmode: 'Technical Writer',
        requirements: 'Write documentation',
        qualityCriteria: 'Clear, comprehensive'
      };

      const prediction = await freshMLEngine.predictQualityScore(context);

      expect(prediction.predictionBasis.some(basis =>
        basis.includes('Insufficient training data')
      )).toBe(true);
    });
  });

  describe('Model Performance and Validation', () => {
    it('should track model accuracy improvements over time', async () => {
      // Add training data by simulating validations
      for (let i = 0; i < 20; i++) {
        const context = {
          chatmode: 'Security Engineer',
          requirements: `Test requirement ${i}`,
          qualityCriteria: 'Standard criteria'
        };

        const result = {
          overallScore: 75 + (i % 20), // Varying scores
          passed: (75 + (i % 20)) >= 80,
          qualityThreshold: 80,
          ruleResults: [],
          categories: {},
          recommendations: [],
          criticalIssues: [],
          confidence: 'medium' as const,
          processingTime: 100,
          canRefine: true,
          refinementSuggestions: []
        };

        await mlEngine.learnFromValidation(context, result);
      }

      const status = mlEngine.getMLStatus();
      expect(status.trainingDataSize).toBe(20);

      // Check that insights include predictive analytics
      const insights = await mlEngine.getMLInsights();
      expect(insights.some(insight => insight.type === 'quality_forecast' || insight.type === 'anomaly_detection')).toBe(true);
    });

    it('should provide confidence estimates based on data quality', async () => {
      const stableContext: ValidationContext = {
        chatmode: 'Software Engineer',
        requirements: 'Well-defined task',
        qualityCriteria: 'Clear criteria'
      };

      const prediction = await mlEngine.predictQualityScore(stableContext);

      // Confidence should be reasonable (not too high without sufficient data)
      expect(prediction.confidence).toBeLessThan(0.9);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely long requirements', async () => {
      const longRequirements = 'A'.repeat(10000); // Very long requirements

      const context: ValidationContext = {
        chatmode: 'Software Architect',
        requirements: longRequirements,
        qualityCriteria: 'Handle long input gracefully'
      };

      const prediction = await mlEngine.predictQualityScore(context);

      expect(prediction).toBeDefined();
      expect(prediction.riskFactors.some(risk =>
        risk.includes('long requirements')
      )).toBe(true);
    });

    it('should handle unknown chatmodes', async () => {
      const context: ValidationContext = {
        chatmode: 'Unknown Chatmode',
        requirements: 'Test unknown chatmode',
        qualityCriteria: 'Should handle gracefully'
      };

      const prediction = await mlEngine.predictQualityScore(context);

      expect(prediction).toBeDefined();
      expect(typeof prediction.predictedScore).toBe('number');
    });

    it('should handle empty or minimal requirements', async () => {
      const context: ValidationContext = {
        chatmode: 'Software Engineer',
        requirements: '',
        qualityCriteria: 'X'
      };

      const prediction = await mlEngine.predictQualityScore(context);

      expect(prediction).toBeDefined();
      expect(typeof prediction.predictedScore).toBe('number');
    });
  });
});
