import { AnalyticsStorage } from './storage.js';
import { QualityAnalyzer } from './quality-analyzer.js';
import { MetricsCollector } from './metrics-collector.js';
import {
  EnhancedQualityAssessment,
  ValidationContext,
  QualityTrend,
  QualityInsight,
  PerformanceInsight,
  UsagePattern,
  SystemHealth,
  AnalyticsConfig
} from '../utils/types.js';
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';

/**
 * Analytics Manager
 * Central coordinator for all analytics and intelligence features
 */
export class AnalyticsManager {
  private storage: AnalyticsStorage;
  private qualityAnalyzer: QualityAnalyzer;
  private metricsCollector: MetricsCollector;
  private initialized: boolean = false;

  constructor(analyticsConfig?: Partial<AnalyticsConfig>) {
    this.storage = new AnalyticsStorage();
    this.qualityAnalyzer = new QualityAnalyzer(this.storage, analyticsConfig);
    this.metricsCollector = new MetricsCollector(this.storage);
    this.initialized = true;

    logger.info('Analytics Manager initialized', {
      storageLocation: this.storage.getStorageHealth().storageLocation,
      intelligenceEnabled: analyticsConfig?.intelligence?.enablePredictiveScoring ?? true
    });
  }

  /**
   * Record a complete validation event for analytics
   */
  recordValidationEvent(
    assessment: EnhancedQualityAssessment,
    context: ValidationContext,
    sessionId?: string,
    operationId?: string
  ): void {
    if (!this.initialized) {
      logger.warn('Analytics Manager not initialized - skipping event recording');
      return;
    }

    try {
      // Record quality assessment
      this.qualityAnalyzer.recordQualityAssessment(assessment, context, sessionId);

      // Record usage metric
      this.metricsCollector.recordUsage(
        context.subagent,
        sessionId || 'unknown',
        'validation',
        assessment.passed,
        {
          taskType: context.taskType,
          complexity: this.determineTaskComplexity(context)
        }
      );

      // End performance timing if operation ID provided
      if (operationId) {
        this.metricsCollector.endOperation(
          operationId,
          'quality_validation',
          true,
          undefined,
          {
            requestSize: JSON.stringify(context).length,
            responseSize: JSON.stringify(assessment).length
          }
        );
      }

      logger.debug('Recorded validation event for analytics', {
        subagent: context.subagent,
        score: assessment.overallScore,
        passed: assessment.passed,
        sessionId,
        operationId
      });

    } catch (error) {
      logger.error('Failed to record validation event', {
        error: error instanceof Error ? error.message : String(error),
        subagent: context.subagent,
        sessionId
      });
    }
  }

  private determineTaskComplexity(context: ValidationContext): 'low' | 'medium' | 'high' {
    const requirements = context.requirements || '';
    const criteria = context.qualityCriteria || '';

    const totalLength = requirements.length + criteria.length;
    const complexityWords = ['comprehensive', 'detailed', 'complex', 'multiple', 'advanced', 'sophisticated'];
    const hasComplexityWords = complexityWords.some(word =>
      requirements.toLowerCase().includes(word) || criteria.toLowerCase().includes(word)
    );

    if (totalLength > 500 || hasComplexityWords) {
      return 'high';
    } else if (totalLength > 200) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Start timing an operation for performance analytics
   */
  startTiming(operationId: string, operation: string): void {
    this.metricsCollector.startOperation(operationId, operation);
  }

  /**
   * End timing an operation and record results
   */
  endTiming(
    operationId: string,
    operation: string,
    success: boolean,
    errorType?: string
  ): number {
    return this.metricsCollector.endOperation(operationId, operation, success, errorType);
  }

  /**
   * Record a refinement event
   */
  recordRefinementEvent(
    sessionId: string,
    chatmode: string,
    originalScore: number,
    improvedScore: number,
    successful: boolean
  ): void {
    try {
      // Record usage for refinement
      this.metricsCollector.recordUsage(
        chatmode,
        sessionId,
        'refinement',
        successful,
        {
          taskType: 'quality_improvement'
        }
      );

      logger.debug('Recorded refinement event', {
        sessionId,
        chatmode,
        originalScore,
        improvedScore,
        improvement: improvedScore - originalScore,
        successful
      });

    } catch (error) {
      logger.error('Failed to record refinement event', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        chatmode
      });
    }
  }

  /**
   * Get quality trends for dashboard/reporting
   */
  getQualityTrends(chatmode?: string, days = 7): QualityTrend {
    return this.qualityAnalyzer.analyzeQualityTrends(chatmode, days);
  }

  /**
   * Get quality insights for proactive management
   */
  getQualityInsights(chatmode?: string): QualityInsight[] {
    return this.qualityAnalyzer.generateQualityInsights(chatmode);
  }

  /**
   * Get performance insights for optimization
   */
  getPerformanceInsights(operation?: string, days = 7): PerformanceInsight | Record<string, PerformanceInsight> {
    if (operation) {
      return this.metricsCollector.analyzeOperationPerformance(operation, days);
    } else {
      return this.metricsCollector.getPerformanceSummary(days);
    }
  }

  /**
   * Get usage patterns for understanding user behavior
   */
  getUsagePatterns(chatmode?: string, days = 7): UsagePattern[] {
    return this.metricsCollector.analyzeUsagePatterns(chatmode, days);
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealth {
    return this.metricsCollector.getSystemHealth();
  }

  /**
   * Compare performance across chatmodes
   */
  compareSubagentPerformance(): Record<string, QualityTrend> {
    return this.qualityAnalyzer.compareSubagentPerformance();
  }

  /**
   * Predict quality score for context (if intelligence enabled)
   */
  predictQualityScore(context: ValidationContext): number {
    return this.qualityAnalyzer.predictQualityScore(context);
  }

  /**
   * Get adaptive quality threshold (if intelligence enabled)
   */
  getAdaptiveQualityThreshold(subagent: string): number {
    return this.qualityAnalyzer.getAdaptiveQualityThreshold(subagent);
  }

  /**
   * Generate comprehensive analytics report
   */
  generateAnalyticsReport(days = 30): {
    executiveSummary: {
      totalValidations: number;
      avgQualityScore: number;
      successRate: number;
      systemHealth: string;
      keyInsights: string[];
    };
    qualityReport: {
      overview: QualityTrend;
      subagentBreakdown: Record<string, QualityTrend>;
      insights: QualityInsight[];
      recommendations: string[];
    };
    performanceReport: Record<string, PerformanceInsight>;
    usageReport: UsagePattern[];
    systemStatus: SystemHealth;
    generatedAt: string;
  } {
    try {
      const qualityReport = this.qualityAnalyzer.generateQualityReport(days);
      const performanceReport = this.metricsCollector.getPerformanceSummary(days);
      const usageReport = this.metricsCollector.analyzeUsagePatterns(undefined, days);
      const systemStatus = this.metricsCollector.getSystemHealth();

      // Generate executive summary
      const totalValidations = qualityReport.overview.totalValidations;
      const avgQualityScore = qualityReport.overview.scoreAverage;
      const successRate = qualityReport.overview.successRate;

      const keyInsights = [
        `Processed ${totalValidations} validations with ${(avgQualityScore || 0).toFixed(1)} average quality score`,
        `${(successRate * 100).toFixed(1)}% validation success rate`,
        `System health: ${systemStatus.status}`,
        ...qualityReport.insights.slice(0, 2).map(insight => insight.title)
      ];

      return {
        executiveSummary: {
          totalValidations,
          avgQualityScore: avgQualityScore || 0,
          successRate,
          systemHealth: systemStatus.status,
          keyInsights
        },
        qualityReport,
        performanceReport,
        usageReport,
        systemStatus,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to generate analytics report', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return minimal report on error
      return {
        executiveSummary: {
          totalValidations: 0,
          avgQualityScore: 0,
          successRate: 0,
          systemHealth: 'unknown',
          keyInsights: ['Error generating report - check logs for details']
        },
        qualityReport: {
          overview: {
            subagent: 'overall',
            timeRange: `${days} days`,
            scoreAverage: 0,
            scoreTrend: 'stable',
            successRate: 0,
            refinementRate: 0,
            totalValidations: 0,
            insights: ['Error loading data'],
            recommendations: ['Check system health']
          },
          subagentBreakdown: {},
          insights: [],
          recommendations: ['Error generating report - check system status']
        },
        performanceReport: {},
        usageReport: [],
        systemStatus: this.metricsCollector.getSystemHealth(),
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Export all analytics data for external analysis
   */
  exportAnalyticsData(): {
    qualityData: any;
    performanceData: any;
    usageData: any;
    metadata: {
      exportedAt: string;
      dataRange: string;
      totalRecords: number;
    };
  } {
    const analyticsData = this.storage.getAnalyticsData();
    const metricsExport = this.metricsCollector.exportMetrics();

    return {
      qualityData: analyticsData.qualityMetrics,
      performanceData: metricsExport.performance,
      usageData: metricsExport.usage,
      metadata: {
        exportedAt: new Date().toISOString(),
        dataRange: analyticsData.lastUpdated,
        totalRecords: analyticsData.totalRecords
      }
    };
  }

  /**
   * Clear all analytics data (for testing or reset)
   */
  clearAnalyticsData(): void {
    this.storage.clearAnalytics();
    logger.info('Cleared all analytics data');
  }

  /**
   * Get analytics configuration and status
   */
  getAnalyticsStatus(): {
    initialized: boolean;
    storageHealth: SystemHealth;
    configStatus: string;
    lastActivity: string;
  } {
    return {
      initialized: this.initialized,
      storageHealth: this.storage.getStorageHealth(),
      configStatus: 'active',
      lastActivity: new Date().toISOString()
    };
  }
}
