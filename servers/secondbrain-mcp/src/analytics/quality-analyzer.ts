import {
  QualityMetric,
  QualityTrend,
  QualityInsight,
  EnhancedQualityAssessment,
  ValidationContext,
  AnalyticsConfig
} from '../utils/types.js';
import { AnalyticsStorage } from './storage.js';
import { logger } from '../utils/logger.js';

/**
 * Quality Analyzer
 * Analyzes quality trends, patterns, and performance metrics to generate insights for continuous improvement
 */
export class QualityAnalyzer {
  private storage: AnalyticsStorage;
  private config: AnalyticsConfig;

  constructor(storage: AnalyticsStorage, config?: Partial<AnalyticsConfig>) {
    this.storage = storage;
    this.config = {
      retention: {
        qualityMetrics: 30,
        performanceMetrics: 30,
        usageMetrics: 30
      },
      aggregation: {
        windowSize: 15, // 15 minutes
        batchSize: 100
      },
      alerts: {
        qualityThreshold: 70,
        errorRateThreshold: 0.1,
        performanceThreshold: 2000 // 2 seconds
      },
      intelligence: {
        enablePredictiveScoring: true,
        enableAdaptiveThresholds: true,
        enableAutoOptimization: true,
        learningWindowDays: 7
      },
      ...config
    };
  }

  /**
   * Record a quality assessment for analysis
   */
  recordQualityAssessment(
    assessment: EnhancedQualityAssessment,
    context: ValidationContext,
    sessionId?: string
  ): void {
    const metric: QualityMetric = {
      timestamp: new Date().toISOString(),
      subagent: context.subagent,
      sessionId,
      qualityScore: assessment.overallScore,
      passed: assessment.passed,
      processingTime: assessment.processingTime,
      refinementAttempts: 0, // Will be updated by refinement tracking
      ruleBreakdown: this.extractRuleBreakdown(assessment),
      categories: assessment.categories,
      criticalIssues: assessment.criticalIssues,
      improvementAreas: assessment.refinementSuggestions
    };

    this.storage.recordQualityMetric(context.subagent, metric);

    logger.debug('Recorded quality assessment for analysis', {
      subagent: context.subagent,
      score: assessment.overallScore,
      passed: assessment.passed,
      sessionId
    });
  }

  private extractRuleBreakdown(assessment: EnhancedQualityAssessment): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const result of assessment.ruleResults) {
      breakdown[result.category] = result.score;
    }

    return breakdown;
  }

  /**
   * Analyze quality trends for a specific chatmode or overall
   */
  analyzeQualityTrends(subagent?: string, days = 7): QualityTrend {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const metrics = this.storage.getQualityMetrics(subagent)
      .filter(m => new Date(m.timestamp) >= startDate);

    if (metrics.length === 0) {
      return this.createEmptyTrend(subagent || 'overall', days);
    }

    const scoreAverage = metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;
    const successRate = metrics.filter(m => m.passed).length / metrics.length;
    const refinementRate = metrics.filter(m => m.refinementAttempts > 0).length / metrics.length;

    const scoreTrend = this.calculateScoreTrend(metrics);
    const insights = this.generateTrendInsights(metrics, scoreAverage, successRate);
    const recommendations = this.generateTrendRecommendations(metrics, scoreTrend, successRate);

    return {
      subagent: subagent || 'overall',
      timeRange: `${days} days`,
      scoreAverage,
      scoreTrend,
      successRate,
      refinementRate,
      totalValidations: metrics.length,
      insights,
      recommendations
    };
  }

  private createEmptyTrend(subagent: string, days: number): QualityTrend {
    return {
      subagent,
      timeRange: `${days} days`,
      scoreAverage: 0,
      scoreTrend: 'stable',
      successRate: 0,
      refinementRate: 0,
      totalValidations: 0,
      insights: ['No data available for analysis'],
      recommendations: ['Continue using the system to generate insights']
    };
  }

  private calculateScoreTrend(metrics: QualityMetric[]): 'improving' | 'declining' | 'stable' {
    if (metrics.length < 3) return 'stable';

    // Compare first third with last third
    const firstThird = metrics.slice(0, Math.floor(metrics.length / 3));
    const lastThird = metrics.slice(-Math.floor(metrics.length / 3));

    const firstAvg = firstThird.reduce((sum, m) => sum + m.qualityScore, 0) / firstThird.length;
    const lastAvg = lastThird.reduce((sum, m) => sum + m.qualityScore, 0) / lastThird.length;

    const difference = lastAvg - firstAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private generateTrendInsights(
    metrics: QualityMetric[],
    scoreAverage: number,
    successRate: number
  ): string[] {
    const insights: string[] = [];

    // Score insights
    if (scoreAverage >= 85) {
      insights.push('Excellent quality performance - consistently high scores');
    } else if (scoreAverage >= 70) {
      insights.push('Good quality performance with room for improvement');
    } else {
      insights.push('Quality performance needs attention - scores below target');
    }

    // Success rate insights
    if (successRate >= 0.9) {
      insights.push('High validation success rate indicates stable quality');
    } else if (successRate >= 0.7) {
      insights.push('Moderate success rate - some validations failing threshold');
    } else {
      insights.push('Low success rate indicates quality issues need addressing');
    }

    // Pattern analysis
    const categoryIssues = this.analyzeCategoryPatterns(metrics);
    if (categoryIssues.length > 0) {
      insights.push(`Common issues found in: ${categoryIssues.join(', ')}`);
    }

    return insights;
  }

  private analyzeCategoryPatterns(metrics: QualityMetric[]): string[] {
    const categoryScores: Record<string, number[]> = {};

    // Aggregate scores by category
    for (const metric of metrics) {
      for (const [category, score] of Object.entries(metric.categories)) {
        if (!categoryScores[category]) {
          categoryScores[category] = [];
        }
        categoryScores[category].push(score);
      }
    }

    // Find problematic categories (average score < 70)
    const problematicCategories: string[] = [];
    for (const [category, scores] of Object.entries(categoryScores)) {
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      if (avgScore < 70) {
        problematicCategories.push(category);
      }
    }

    return problematicCategories;
  }

  private generateTrendRecommendations(
    metrics: QualityMetric[],
    trend: 'improving' | 'declining' | 'stable',
    successRate: number
  ): string[] {
    const recommendations: string[] = [];

    // Trend-based recommendations
    if (trend === 'declining') {
      recommendations.push('Quality trend is declining - review recent changes and processes');
      recommendations.push('Consider additional quality checks or refinement workflows');
    } else if (trend === 'improving') {
      recommendations.push('Quality is improving - maintain current practices');
    }

    // Success rate recommendations
    if (successRate < 0.7) {
      recommendations.push('Low success rate - review quality thresholds and validation criteria');
      recommendations.push('Consider training or guidance improvements');
    }

    // Category-specific recommendations
    const categoryIssues = this.analyzeCategoryPatterns(metrics);
    for (const category of categoryIssues) {
      recommendations.push(`Focus improvement efforts on ${category} quality aspects`);
    }

    // Processing time recommendations
    const avgProcessingTime = metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length;
    if (avgProcessingTime > 1000) { // > 1 second
      recommendations.push('Validation processing time is high - consider optimization');
    }

    return recommendations.length > 0 ? recommendations : ['Continue current quality practices'];
  }

  /**
   * Generate quality insights for proactive management
   */
  generateQualityInsights(subagent?: string): QualityInsight[] {
    const insights: QualityInsight[] = [];
    const trends = this.analyzeQualityTrends(subagent, 7);

    // Trend insight
    if (trends.scoreTrend === 'declining') {
      insights.push({
        type: 'trend',
        subagent,
        severity: 'warning',
        title: 'Quality Score Declining',
        description: `Quality scores have been declining over the past 7 days. Average score: ${trends.scoreAverage.toFixed(1)}`,
        metrics: { averageScore: trends.scoreAverage, successRate: trends.successRate },
        actionable: true,
        recommendation: 'Review recent validation failures and consider process improvements',
        confidence: 0.8,
        timestamp: new Date().toISOString()
      });
    }

    // Success rate insight
    if (trends.successRate < 0.7) {
      insights.push({
        type: 'pattern',
        subagent,
        severity: trends.successRate < 0.5 ? 'critical' : 'warning',
        title: 'Low Validation Success Rate',
        description: `Only ${(trends.successRate * 100).toFixed(1)}% of validations are passing the quality threshold`,
        metrics: { successRate: trends.successRate, totalValidations: trends.totalValidations },
        actionable: true,
        recommendation: 'Consider adjusting quality thresholds or improving validation criteria',
        confidence: 0.9,
        timestamp: new Date().toISOString()
      });
    }

    // High performance insight
    if (trends.scoreAverage >= 90 && trends.successRate >= 0.95) {
      insights.push({
        type: 'recommendation',
        subagent,
        severity: 'info',
        title: 'Excellent Quality Performance',
        description: `Outstanding quality metrics with ${trends.scoreAverage.toFixed(1)} average score and ${(trends.successRate * 100).toFixed(1)}% success rate`,
        metrics: { averageScore: trends.scoreAverage, successRate: trends.successRate },
        actionable: false,
        confidence: 0.95,
        timestamp: new Date().toISOString()
      });
    }

    return insights;
  }

  /**
   * Compare subagent performance
   */
  compareSubagentPerformance(): Record<string, QualityTrend> {
    const analytics = this.storage.getAnalyticsData();
    const subagents = Object.keys(analytics.qualityMetrics);
    const comparison: Record<string, QualityTrend> = {};

    for (const subagent of subagents) {
      comparison[subagent] = this.analyzeQualityTrends(subagent, 7);
    }

    return comparison;
  }

  /**
   * Predict quality score for given context (simple heuristic-based)
   */
  predictQualityScore(context: ValidationContext): number {
    if (!this.config.intelligence.enablePredictiveScoring) {
      return 75; // Default prediction
    }

    const historicalMetrics = this.storage.getQualityMetrics(context.subagent, 50);

    if (historicalMetrics.length < 5) {
      return 75; // Not enough data for prediction
    }

    // Simple moving average with recency bias
    const recentMetrics = historicalMetrics.slice(-10);
    const weights = recentMetrics.map((_, index) => (index + 1) / recentMetrics.length);

    const weightedScore = recentMetrics.reduce((sum, metric, index) => {
      return sum + (metric.qualityScore * weights[index]);
    }, 0);

    const prediction = Math.round(weightedScore);

    logger.debug('Generated quality score prediction', {
      subagent: context.subagent,
      prediction,
      historicalSamples: historicalMetrics.length
    });

    return prediction;
  }

  /**
   * Get adaptive quality threshold based on historical performance
   */
  getAdaptiveQualityThreshold(subagent: string): number {
    if (!this.config.intelligence.enableAdaptiveThresholds) {
      return 80; // Default threshold
    }

    const metrics = this.storage.getQualityMetrics(subagent, 100);

    if (metrics.length < 10) {
      return 80; // Not enough data for adaptation
    }

    // Calculate threshold as 10th percentile of passing scores
    const passingScores = metrics
      .filter(m => m.passed)
      .map(m => m.qualityScore)
      .sort((a, b) => a - b);

    if (passingScores.length === 0) {
      return 80;
    }

    const percentile10Index = Math.floor(passingScores.length * 0.1);
    const adaptiveThreshold = Math.max(60, Math.min(90, passingScores[percentile10Index]));

    logger.debug('Calculated adaptive quality threshold', {
      subagent,
      threshold: adaptiveThreshold,
      sampleSize: passingScores.length
    });

    return adaptiveThreshold;
  }

  /**
   * Generate comprehensive quality report
   */
  generateQualityReport(days = 30): {
    overview: QualityTrend;
    subagentBreakdown: Record<string, QualityTrend>;
    insights: QualityInsight[];
    recommendations: string[];
  } {
    const overview = this.analyzeQualityTrends(undefined, days);
    const subagentBreakdown = this.compareSubagentPerformance();
    const insights = this.generateQualityInsights();

    // Generate global recommendations
    const recommendations: string[] = [];

    const allSubagents = Object.values(subagentBreakdown);
    const avgScore = allSubagents.reduce((sum, trend) => sum + trend.scoreAverage, 0) / allSubagents.length;
    const avgSuccessRate = allSubagents.reduce((sum, trend) => sum + trend.successRate, 0) / allSubagents.length;

    if (avgScore < 75) {
      recommendations.push('Overall quality scores are below target - consider comprehensive review');
    }

    if (avgSuccessRate < 0.8) {
      recommendations.push('Success rates indicate quality thresholds may need adjustment');
    }

    // Find best and worst performing subagents
    const sortedByScore = allSubagents.sort((a, b) => b.scoreAverage - a.scoreAverage);
    if (sortedByScore.length > 1) {
      recommendations.push(`Best performer: ${sortedByScore[0].subagent} (${sortedByScore[0].scoreAverage.toFixed(1)})`);
      recommendations.push(`Needs attention: ${sortedByScore[sortedByScore.length - 1].subagent} (${sortedByScore[sortedByScore.length - 1].scoreAverage.toFixed(1)})`);
    }

    return {
      overview,
      subagentBreakdown,
      insights,
      recommendations
    };
  }
}
