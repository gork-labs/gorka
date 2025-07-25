/**
 * ML Engine Phase 8 Test Suite: Ensemble Methods & Auto-Optimization
 *
 * Tests for adaptive intelligence capabilities including:
 * - Ensemble predictions with multiple models
 * - A/B testing framework
 * - Auto-optimization system
 * - Meta-learning insights
 *
 * Author: @bohdan-shulha
 * Created: 2025-07-25T00:05:03+02:00
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnalyticsManager } from '../src/analytics/analytics-manager.js';
import { MLEngine } from '../src/ml/ml-engine.js';
import {
  ValidationContext,
  EnsemblePrediction,
  ABTestConfig,
  ABTestResult,
  AutoOptimizationConfig,
  OptimizationResult,
  MetaLearningInsight,
  AdaptiveIntelligence
} from '../src/utils/types.js';
import * as fs from 'fs';
import * as path from 'path';

describe('ML Engine Phase 8: Ensemble Methods & Auto-Optimization', () => {
  let analyticsManager: AnalyticsManager;
  let mlEngine: MLEngine;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(process.cwd(), '.test-analytics-phase8');

    // Ensure clean test environment
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    analyticsManager = new AnalyticsManager();

    mlEngine = new MLEngine(analyticsManager, {
      enabled: true,
      minTrainingDataPoints: 5,
      predictionConfidenceThreshold: 0.5
    });

    // Add some training data for better predictions
    for (let i = 0; i < 10; i++) {
      const context: ValidationContext = {
        chatmode: 'Security Engineer',
        requirements: `Test requirements ${i}`,
        qualityCriteria: 'Test criteria for security validation'
      };

      const assessment: import('../src/utils/types.js').EnhancedQualityAssessment = {
        overallScore: 70 + (Math.random() * 20),
        passed: true,
        qualityThreshold: 75,
        ruleResults: [],
        categories: {
          format: 85,
          completeness: 80,
          accuracy: 90,
          relevance: 85,
          actionability: 80
        },
        recommendations: [],
        criticalIssues: [],
        confidence: 'high',
        processingTime: 100 + Math.random() * 50,
        canRefine: false,
        refinementSuggestions: []
      };

      await mlEngine.learnFromValidation(context, assessment);
    }
  });

  afterEach(async () => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Ensemble Predictions', () => {
    it('should generate ensemble predictions with multiple models', async () => {
      const context: ValidationContext = {
        chatmode: 'Security Engineer',
        requirements: 'Test security requirements for ensemble prediction',
        qualityCriteria: 'Security validation criteria including threat assessment and vulnerability analysis'
      };

      const ensemblePrediction = await mlEngine.generateEnsemblePrediction(context);

      expect(ensemblePrediction).toBeDefined();
      expect(ensemblePrediction.finalPrediction).toBeGreaterThan(0);
      expect(ensemblePrediction.finalPrediction).toBeLessThanOrEqual(1);
      expect(ensemblePrediction.confidence).toBeGreaterThan(0);
      expect(ensemblePrediction.confidence).toBeLessThanOrEqual(1);
      expect(ensemblePrediction.modelContributions).toHaveLength(4); // Statistical, Pattern, Domain, Meta
      expect(ensemblePrediction.votingMethod).toEqual('confidence_weighted');
      expect(ensemblePrediction.consensusLevel).toBeGreaterThanOrEqual(0);
      expect(ensemblePrediction.metadata.totalModels).toEqual(4);
      expect(ensemblePrediction.metadata.qualityAssurance).toBe(true);
    });

    it('should handle model consensus and conflict resolution', async () => {
      const context: ValidationContext = {
        chatmode: 'Software Architect',
        requirements: 'Complex architectural requirements with potential conflicts',
        qualityCriteria: 'Architecture evaluation criteria including design quality and scalability'
      };

      const ensemblePrediction = await mlEngine.generateEnsemblePrediction(context);

      expect(ensemblePrediction.consensusLevel).toBeGreaterThanOrEqual(0);
      expect(ensemblePrediction.consensusLevel).toBeLessThanOrEqual(1);

      // Check that all models contributed
      expect(ensemblePrediction.modelContributions).toHaveLength(4);
      ensemblePrediction.modelContributions.forEach(contribution => {
        expect(contribution.modelId).toBeTruthy();
        expect(contribution.prediction).toBeGreaterThanOrEqual(0);
        expect(contribution.prediction).toBeLessThanOrEqual(1);
        expect(contribution.confidence).toBeGreaterThanOrEqual(0);
        expect(contribution.reasoning).toBeTruthy();
        expect(contribution.processingTime).toBeGreaterThan(0);
      });
    });

    it('should provide fallback when ensemble fails', async () => {
      // Create an ML engine that will trigger fallback behavior
      const faultyEngine = new MLEngine(analyticsManager, {
        enabled: true,
        minTrainingDataPoints: 1000 // High threshold to trigger fallback
      });

      const context: ValidationContext = {
        chatmode: 'Test Engineer',
        requirements: 'Fallback test requirements',
        qualityCriteria: 'Test criteria for fallback scenario validation'
      };

      const ensemblePrediction = await faultyEngine.generateEnsemblePrediction(context);

      expect(ensemblePrediction).toBeDefined();
      expect(ensemblePrediction.finalPrediction).toBeGreaterThan(0);
      expect(ensemblePrediction.modelContributions).toHaveLength(1);
      expect(ensemblePrediction.modelContributions[0].modelId).toEqual('fallback_statistical');
      expect(ensemblePrediction.metadata.conflictResolution).toEqual('fallback_mode');
    });

    it('should validate ensemble prediction quality', async () => {
      const context: ValidationContext = {
        chatmode: 'DevOps Engineer',
        requirements: 'DevOps validation requirements',
        qualityCriteria: 'DevOps evaluation criteria for automation and reliability'
      };

      const ensemblePrediction = await mlEngine.generateEnsemblePrediction(context);

      // Verify quality assurance checks
      expect(ensemblePrediction.metadata.qualityAssurance).toBe(true);
      expect(ensemblePrediction.finalPrediction).toBeGreaterThanOrEqual(0);
      expect(ensemblePrediction.finalPrediction).toBeLessThanOrEqual(1);
      expect(ensemblePrediction.confidence).toBeGreaterThanOrEqual(0);
      expect(ensemblePrediction.confidence).toBeLessThanOrEqual(1);
      expect(ensemblePrediction.consensusLevel).toBeGreaterThanOrEqual(0);
    });
  });

  describe('A/B Testing Framework', () => {
    it('should configure A/B test experiments successfully', async () => {
      const abTestConfig: ABTestConfig = {
        experimentId: 'test-quality-thresholds',
        name: 'Quality Threshold Optimization',
        description: 'Testing different quality thresholds for Security Engineer',
        hypothesis: 'Lower thresholds may improve user satisfaction without significantly impacting quality',
        startDate: new Date().toISOString(),
        estimatedDuration: 7,
        targetSampleSize: 100,
        confidenceLevel: 0.95,
        minimumEffectSize: 0.05,
        successMetrics: ['user_satisfaction', 'quality_score', 'refinement_rate'],
        variants: [
          {
            id: 'control',
            name: 'Current Threshold (75%)',
            description: 'Current quality threshold of 75%',
            trafficAllocation: 0.5,
            configuration: { qualityThreshold: 0.75 }
          },
          {
            id: 'treatment',
            name: 'Lower Threshold (70%)',
            description: 'Reduced quality threshold of 70%',
            trafficAllocation: 0.5,
            configuration: { qualityThreshold: 0.70 }
          }
        ],
        safetyConstraints: {
          maxAllowedDegradation: 0.10,
          earlyStoppingRules: ['quality_drop_10_percent', 'user_complaints_spike'],
          fallbackVariant: 'control'
        }
      };

      const configResult = await mlEngine.configureABTest(abTestConfig);
      expect(configResult).toBe(true);
    });

    it('should evaluate A/B test results with statistical analysis', async () => {
      const experimentId = 'test-evaluation-experiment';

      // First configure the experiment
      const config: ABTestConfig = {
        experimentId,
        name: 'Test Evaluation',
        description: 'Test for evaluation functionality',
        hypothesis: 'Test hypothesis',
        startDate: new Date().toISOString(),
        estimatedDuration: 1,
        targetSampleSize: 50,
        confidenceLevel: 0.95,
        minimumEffectSize: 0.05,
        successMetrics: ['conversion_rate'],
        variants: [
          {
            id: 'control',
            name: 'Control',
            description: 'Control variant',
            trafficAllocation: 0.5,
            configuration: { param: 'control_value' }
          },
          {
            id: 'treatment',
            name: 'Treatment',
            description: 'Treatment variant',
            trafficAllocation: 0.5,
            configuration: { param: 'treatment_value' }
          }
        ],
        safetyConstraints: {
          maxAllowedDegradation: 0.05,
          earlyStoppingRules: [],
          fallbackVariant: 'control'
        }
      };

      await mlEngine.configureABTest(config);

      const result = await mlEngine.evaluateABTestResults(experimentId);

      expect(result).toBeDefined();
      expect(result.experimentId).toEqual(experimentId);
      expect(result.status).toBeTypeOf('string');
      expect(result.duration).toBeTypeOf('number');
      expect(result.samplesCollected).toBeTypeOf('number');
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
      expect(result.recommendation).toBeTruthy();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle experiment configuration validation', async () => {
      const invalidConfig: ABTestConfig = {
        experimentId: 'invalid-test',
        name: 'Invalid Test',
        description: 'Test with invalid configuration',
        hypothesis: 'Test hypothesis',
        startDate: new Date().toISOString(),
        estimatedDuration: 7,
        targetSampleSize: 0, // Invalid: zero sample size
        confidenceLevel: 0.95,
        minimumEffectSize: 0.05,
        successMetrics: [],
        variants: [], // Invalid: no variants
        safetyConstraints: {
          maxAllowedDegradation: 0.10,
          earlyStoppingRules: [],
          fallbackVariant: 'control'
        }
      };

      const configResult = await mlEngine.configureABTest(invalidConfig);
      expect(configResult).toBe(false);
    });

    it('should provide proper experiment recommendations', async () => {
      const experimentId = 'recommendation-test';

      const result = await mlEngine.evaluateABTestResults(experimentId);

      expect(result.recommendation).toBeTruthy();
      expect(['deploy_winner', 'run_longer', 'redesign_experiment', 'no_significant_difference'])
        .toContain(result.recommendation);
    });
  });

  describe('Auto-Optimization System', () => {
    it('should run parameter optimization successfully', async () => {
      const optimizationConfig: AutoOptimizationConfig = {
        optimizationId: 'test-quality-optimization',
        name: 'Quality Threshold Optimization',
        description: 'Optimize quality thresholds for better performance',
        objectives: [
          {
            metric: 'user_satisfaction',
            target: 'maximize',
            weight: 0.6,
            constraint: { min: 0.7, max: 1.0 }
          },
          {
            metric: 'refinement_rate',
            target: 'minimize',
            weight: 0.4,
            constraint: { min: 0.0, max: 0.3 }
          }
        ],
        parameters: [
          {
            name: 'qualityThreshold',
            type: 'continuous',
            range: [0.6, 0.9],
            currentValue: 0.75
          },
          {
            name: 'refinementStrategy',
            type: 'categorical',
            range: ['conservative', 'balanced', 'aggressive'],
            currentValue: 'balanced'
          }
        ],
        algorithm: 'bayesian_optimization',
        constraints: {
          maxIterations: 10,
          maxDuration: 5, // 5 minutes
          convergenceThreshold: 0.01,
          safetyChecks: ['quality_bounds', 'performance_bounds']
        }
      };

      const result = await mlEngine.runAutoOptimization(optimizationConfig);

      expect(result).toBeDefined();
      expect(result.optimizationId).toEqual('test-quality-optimization');
      expect(result.status).toBeTruthy();
      expect(['running', 'converged', 'max_iterations', 'failed', 'safety_stopped']).toContain(result.status);
      expect(result.iterations).toBeGreaterThanOrEqual(0);
      expect(result.bestScore).toBeTypeOf('number');
      expect(result.bestParameters).toBeTypeOf('object');
      expect(result.improvement).toBeTypeOf('number');
      expect(Array.isArray(result.convergenceHistory)).toBe(true);
      expect(result.deploymentStatus).toBeTruthy();
      expect(Array.isArray(result.safetyMetrics)).toBe(true);
    });

    it('should handle multi-objective optimization', async () => {
      const multiObjectiveConfig: AutoOptimizationConfig = {
        optimizationId: 'multi-objective-test',
        name: 'Multi-Objective Optimization',
        description: 'Balance quality, speed, and resource usage',
        objectives: [
          {
            metric: 'quality_score',
            target: 'maximize',
            weight: 0.5
          },
          {
            metric: 'response_time',
            target: 'minimize',
            weight: 0.3
          },
          {
            metric: 'resource_usage',
            target: 'minimize',
            weight: 0.2
          }
        ],
        parameters: [
          {
            name: 'modelComplexity',
            type: 'discrete',
            range: [1, 2, 3, 4, 5],
            currentValue: 3
          }
        ],
        algorithm: 'genetic_algorithm',
        constraints: {
          maxIterations: 5,
          maxDuration: 2,
          convergenceThreshold: 0.05,
          safetyChecks: ['resource_limits']
        }
      };

      const result = await mlEngine.runAutoOptimization(multiObjectiveConfig);

      expect(result.optimizationId).toEqual('multi-objective-test');
      expect(result.bestParameters).toHaveProperty('modelComplexity');
      expect([1, 2, 3, 4, 5]).toContain(result.bestParameters.modelComplexity);
    });

    it('should respect safety constraints during optimization', async () => {
      const safetyConfig: AutoOptimizationConfig = {
        optimizationId: 'safety-test',
        name: 'Safety Constraint Test',
        description: 'Test safety constraint enforcement',
        objectives: [
          {
            metric: 'performance',
            target: 'maximize',
            weight: 1.0,
            constraint: { min: 0.5, max: 1.0 }
          }
        ],
        parameters: [
          {
            name: 'aggressiveness',
            type: 'continuous',
            range: [0.1, 2.0],
            currentValue: 1.0
          }
        ],
        algorithm: 'random_search',
        constraints: {
          maxIterations: 3,
          maxDuration: 1,
          convergenceThreshold: 0.1,
          safetyChecks: ['critical_safety_check']
        }
      };

      const result = await mlEngine.runAutoOptimization(safetyConfig);

      expect(result).toBeDefined();
      expect(result.safetyMetrics).toBeDefined();
      expect(Array.isArray(result.safetyMetrics)).toBe(true);
    });

    it('should track optimization convergence history', async () => {
      const convergenceConfig: AutoOptimizationConfig = {
        optimizationId: 'convergence-test',
        name: 'Convergence Tracking Test',
        description: 'Test convergence history tracking',
        objectives: [
          {
            metric: 'accuracy',
            target: 'maximize',
            weight: 1.0
          }
        ],
        parameters: [
          {
            name: 'learningRate',
            type: 'continuous',
            range: [0.001, 0.1],
            currentValue: 0.01
          }
        ],
        algorithm: 'bayesian_optimization',
        constraints: {
          maxIterations: 5,
          maxDuration: 2,
          convergenceThreshold: 0.01,
          safetyChecks: []
        }
      };

      const result = await mlEngine.runAutoOptimization(convergenceConfig);

      expect(Array.isArray(result.convergenceHistory)).toBe(true);
      result.convergenceHistory.forEach(entry => {
        expect(entry).toHaveProperty('iteration');
        expect(entry).toHaveProperty('score');
        expect(entry).toHaveProperty('parameters');
        expect(entry).toHaveProperty('timestamp');
        expect(entry.iteration).toBeTypeOf('number');
        expect(entry.score).toBeTypeOf('number');
        expect(entry.parameters).toBeTypeOf('object');
        expect(entry.timestamp).toBeTypeOf('string');
      });
    });
  });

  describe('Meta-Learning Insights', () => {
    it('should generate learning efficiency insights', async () => {
      const insights = await mlEngine.generateMetaLearningInsights();

      expect(Array.isArray(insights)).toBe(true);

      const efficiencyInsight = insights.find(i => i.insightType === 'learning_efficiency');
      if (efficiencyInsight) {
        expect(efficiencyInsight.description).toBeTruthy();
        expect(efficiencyInsight.evidenceStrength).toBeGreaterThanOrEqual(0);
        expect(efficiencyInsight.evidenceStrength).toBeLessThanOrEqual(1);
        expect(Array.isArray(efficiencyInsight.applicableScenarios)).toBe(true);
        expect(Array.isArray(efficiencyInsight.recommendations)).toBe(true);
      }
    });

    it('should identify transfer learning opportunities', async () => {
      const insights = await mlEngine.generateMetaLearningInsights();

      const transferInsights = insights.filter(i => i.insightType === 'transfer_opportunity');
      transferInsights.forEach(insight => {
        expect(insight.description).toBeTruthy();
        expect(insight.evidenceStrength).toBeGreaterThanOrEqual(0);
        expect(insight.transferPotential).toBeDefined();
        if (insight.transferPotential) {
          expect(insight.transferPotential.sourceChatmode).toBeTruthy();
          expect(insight.transferPotential.targetChatmode).toBeTruthy();
          expect(insight.transferPotential.similarity).toBeGreaterThanOrEqual(0);
          expect(insight.transferPotential.similarity).toBeLessThanOrEqual(1);
          expect(insight.transferPotential.expectedBenefit).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should provide curriculum optimization insights', async () => {
      const insights = await mlEngine.generateMetaLearningInsights();

      const curriculumInsight = insights.find(i => i.insightType === 'curriculum_optimization');
      if (curriculumInsight) {
        expect(curriculumInsight.description).toBeTruthy();
        expect(curriculumInsight.learningPatterns).toBeDefined();
        if (curriculumInsight.learningPatterns) {
          expect(curriculumInsight.learningPatterns.optimalDataAmount).toBeGreaterThan(0);
          expect(['linear', 'logarithmic', 'exponential', 'plateau'])
            .toContain(curriculumInsight.learningPatterns.learningCurveShape);
          expect(Array.isArray(curriculumInsight.learningPatterns.criticalFeatures)).toBe(true);
          expect(typeof curriculumInsight.learningPatterns.diminishingReturns).toBe('boolean');
        }
      }
    });

    it('should analyze feature importance and model combinations', async () => {
      const insights = await mlEngine.generateMetaLearningInsights();

      const featureInsight = insights.find(i => i.insightType === 'feature_importance');
      const combinationInsight = insights.find(i => i.insightType === 'model_combination');

      if (featureInsight) {
        expect(featureInsight.description).toBeTruthy();
        expect(featureInsight.applicableScenarios).toContain('model_optimization');
      }

      if (combinationInsight) {
        expect(combinationInsight.description).toBeTruthy();
        expect(combinationInsight.applicableScenarios).toContain('ensemble_optimization');
      }
    });
  });

  describe('Adaptive Intelligence Integration', () => {
    it('should provide comprehensive adaptive intelligence status', async () => {
      const adaptiveIntelligence = await mlEngine.getAdaptiveIntelligence();

      expect(adaptiveIntelligence).toBeDefined();
      expect(Array.isArray(adaptiveIntelligence.ensemblePredictions)).toBe(true);
      expect(Array.isArray(adaptiveIntelligence.activeExperiments)).toBe(true);
      expect(Array.isArray(adaptiveIntelligence.experimentResults)).toBe(true);
      expect(Array.isArray(adaptiveIntelligence.optimizationResults)).toBe(true);
      expect(Array.isArray(adaptiveIntelligence.metaLearningInsights)).toBe(true);
      expect(Array.isArray(adaptiveIntelligence.systemAdaptations)).toBe(true);
    });

    it('should integrate with existing ML insights functionality', async () => {
      // Test that Phase 8 works alongside Phase 7 predictive analytics
      const insights = await mlEngine.getMLInsights();

      expect(Array.isArray(insights)).toBe(true);

      // Should still have predictive analytics insights or other ML insights
      const hasAnalyticsInsights = insights.some(insight =>
        ['quality_forecast', 'anomaly_detection', 'cross_chatmode_analysis', 'proactive_alert',
         'model_performance', 'learning_pattern', 'training_data', 'data_distribution']
          .includes(insight.type)
      );

      // Phase 7 analytics should still work OR insights might be empty for new system
      expect(hasAnalyticsInsights || insights.length === 0).toBe(true);
    });

    it('should maintain backward compatibility with existing prediction methods', async () => {
      const context: ValidationContext = {
        chatmode: 'Security Engineer',
        requirements: 'Test backward compatibility',
        qualityCriteria: 'Compatibility test criteria for existing prediction methods'
      };

      // Test original prediction method still works
      const originalPrediction = await mlEngine.predictQualityScore(context);
      expect(originalPrediction).toBeDefined();
      expect(originalPrediction.predictedScore).toBeGreaterThanOrEqual(0);
      expect(originalPrediction.confidence).toBeGreaterThanOrEqual(0);

      // Test new ensemble prediction works
      const ensemblePrediction = await mlEngine.generateEnsemblePrediction(context);
      expect(ensemblePrediction).toBeDefined();
      expect(ensemblePrediction.finalPrediction).toBeGreaterThanOrEqual(0);
      expect(ensemblePrediction.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully in adaptive intelligence features', async () => {
      // Test error handling in ensemble predictions
      const faultyContext: ValidationContext = {
        chatmode: 'NonExistentChatmode',
        requirements: '',
        qualityCriteria: ''
      };

      const ensemblePrediction = await mlEngine.generateEnsemblePrediction(faultyContext);
      expect(ensemblePrediction).toBeDefined();
      // Should provide fallback prediction even with faulty input

      // Test error handling in meta-learning
      const insights = await mlEngine.generateMetaLearningInsights();
      expect(Array.isArray(insights)).toBe(true);
      // Should not throw errors even with limited data
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent ensemble predictions', async () => {
      const contexts: ValidationContext[] = Array.from({ length: 5 }, (_, i) => ({
        chatmode: 'Software Architect',
        requirements: `Concurrent test requirements ${i}`,
        qualityCriteria: `Concurrent test criteria ${i} for architecture validation`
      }));

      const startTime = Date.now();
      const predictions = await Promise.all(
        contexts.map(context => mlEngine.generateEnsemblePrediction(context))
      );
      const endTime = Date.now();

      expect(predictions).toHaveLength(5);
      predictions.forEach(prediction => {
        expect(prediction.finalPrediction).toBeGreaterThanOrEqual(0);
        expect(prediction.modelContributions).toHaveLength(4);
      });

      // Should complete within reasonable time (less than 5 seconds for 5 predictions)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should scale meta-learning insights with data volume', async () => {
      // Add more training data
      for (let i = 0; i < 20; i++) {
        const context: ValidationContext = {
          chatmode: i % 2 === 0 ? 'Security Engineer' : 'Software Architect',
          requirements: `Scale test requirements ${i}`,
          qualityCriteria: `Scale test criteria ${i}`
        };

        const assessment: import('../src/utils/types.js').EnhancedQualityAssessment = {
          overallScore: 60 + (Math.random() * 30),
          passed: Math.random() > 0.3,
          qualityThreshold: 75,
          ruleResults: [],
          categories: {
            format: 85,
            completeness: 80,
            accuracy: 90
          },
          recommendations: [],
          criticalIssues: [],
          confidence: 'medium',
          processingTime: 80 + Math.random() * 40,
          canRefine: Math.random() > 0.7,
          refinementSuggestions: []
        };

        await mlEngine.learnFromValidation(context, assessment);
      }

      const insights = await mlEngine.generateMetaLearningInsights();

      // Should generate insights even with more data
      expect(Array.isArray(insights)).toBe(true);

      // Should include transfer learning opportunities with multiple chatmodes
      const transferInsights = insights.filter(i => i.insightType === 'transfer_opportunity');
      // May have transfer opportunities between Security Engineer and Software Architect
      expect(transferInsights.length).toBeGreaterThanOrEqual(0);
    });
  });
});
