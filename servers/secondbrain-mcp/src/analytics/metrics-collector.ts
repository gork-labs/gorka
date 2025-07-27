import {
  PerformanceMetric,
  UsageMetric,
  PerformanceInsight,
  UsagePattern,
  SystemHealth
} from '../utils/types.js';
import { AnalyticsStorage } from './storage.js';
import { logger } from '../utils/logger.js';

/**
 * Metrics Collector
 * Collects and analyzes system performance and usage metrics
 */
export class MetricsCollector {
  private storage: AnalyticsStorage;
  private operationStartTimes: Map<string, number> = new Map();
  private systemStartTime: number;

  constructor(storage: AnalyticsStorage) {
    this.storage = storage;
    this.systemStartTime = Date.now();
  }

  /**
   * Start timing an operation
   */
  startOperation(operationId: string, operation: string): void {
    this.operationStartTimes.set(operationId, Date.now());

    logger.debug('Started timing operation', {
      operationId,
      operation,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * End timing an operation and record performance metric
   */
  endOperation(
    operationId: string,
    operation: string,
    success: boolean,
    errorType?: string,
    metadata?: Record<string, any>
  ): number {
    const startTime = this.operationStartTimes.get(operationId);
    if (!startTime) {
      logger.warn('Operation end called without start', { operationId, operation });
      return 0;
    }

    const duration = Date.now() - startTime;
    this.operationStartTimes.delete(operationId);

    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      operation,
      duration,
      success,
      errorType,
      resourceUsage: {
        memory: process.memoryUsage().heapUsed
      },
      requestSize: metadata?.requestSize,
      responseSize: metadata?.responseSize
    };

    this.storage.recordPerformanceMetric(metric);

    logger.debug('Completed operation timing', {
      operationId,
      operation,
      duration,
      success,
      errorType
    });

    return duration;
  }

  /**
   * Record a usage event
   */
  recordUsage(
    subagent: string,
    sessionId: string,
    operation: string,
    success: boolean,
    userContext?: {
      taskType?: string;
      urgency?: string;
      complexity?: 'low' | 'medium' | 'high';
    }
  ): void {
    const metric: UsageMetric = {
      timestamp: new Date().toISOString(),
      subagent,
      sessionId,
      operation,
      success,
      userContext
    };

    this.storage.recordUsageMetric(metric);

    logger.debug('Recorded usage metric', {
      subagent,
      sessionId,
      operation,
      success,
      complexity: userContext?.complexity
    });
  }

  /**
   * Analyze performance trends for specific operations
   */
  analyzeOperationPerformance(operation: string, days = 7): PerformanceInsight {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const metrics = this.storage.getPerformanceMetrics(operation)
      .filter(m => new Date(m.timestamp) >= startDate);

    if (metrics.length === 0) {
      return this.createEmptyPerformanceInsight(operation);
    }

    const durations = metrics.map(m => m.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // Calculate 95th percentile
    const sortedDurations = durations.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedDurations.length * 0.95);
    const p95Duration = sortedDurations[p95Index] || avgDuration;

    const successRate = metrics.filter(m => m.success).length / metrics.length;

    // Analyze error patterns
    const errorPatterns = this.analyzeErrorPatterns(metrics);

    // Generate optimization suggestions
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      avgDuration,
      p95Duration,
      successRate,
      errorPatterns
    );

    // Calculate trend
    const trend = this.calculatePerformanceTrend(metrics);

    return {
      operation,
      avgDuration,
      p95Duration,
      successRate,
      errorPatterns,
      optimizationSuggestions,
      trend,
      timestamp: new Date().toISOString()
    };
  }

  private createEmptyPerformanceInsight(operation: string): PerformanceInsight {
    return {
      operation,
      avgDuration: 0,
      p95Duration: 0,
      successRate: 0,
      errorPatterns: [],
      optimizationSuggestions: ['No data available for analysis'],
      trend: 'stable',
      timestamp: new Date().toISOString()
    };
  }

  private analyzeErrorPatterns(metrics: PerformanceMetric[]): string[] {
    const errorTypes: Record<string, number> = {};

    for (const metric of metrics) {
      if (!metric.success && metric.errorType) {
        errorTypes[metric.errorType] = (errorTypes[metric.errorType] || 0) + 1;
      }
    }

    // Return most common error patterns
    return Object.entries(errorTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([errorType, count]) => `${errorType} (${count} occurrences)`);
  }

  private generateOptimizationSuggestions(
    avgDuration: number,
    p95Duration: number,
    successRate: number,
    errorPatterns: string[]
  ): string[] {
    const suggestions: string[] = [];

    // Performance suggestions
    if (avgDuration > 2000) {
      suggestions.push('Average response time is high - consider caching or optimization');
    }

    if (p95Duration > avgDuration * 3) {
      suggestions.push('High variability in response times - investigate outliers');
    }

    // Reliability suggestions
    if (successRate < 0.95) {
      suggestions.push('Success rate below 95% - review error handling and validation');
    }

    // Error-specific suggestions
    if (errorPatterns.length > 0) {
      suggestions.push(`Common errors detected: ${errorPatterns[0]}`);
      suggestions.push('Consider implementing specific error prevention measures');
    }

    // Memory usage suggestions
    const currentMemory = process.memoryUsage().heapUsed;
    if (currentMemory > 500 * 1024 * 1024) { // 500MB
      suggestions.push('High memory usage detected - consider memory optimization');
    }

    return suggestions.length > 0 ? suggestions : ['Performance appears optimal'];
  }

  private calculatePerformanceTrend(metrics: PerformanceMetric[]): 'improving' | 'declining' | 'stable' {
    if (metrics.length < 10) return 'stable';

    // Compare first half with second half
    const midpoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, midpoint);
    const secondHalf = metrics.slice(midpoint);

    const firstAvgDuration = firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length;
    const secondAvgDuration = secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length;

    const improvement = (firstAvgDuration - secondAvgDuration) / firstAvgDuration;

    if (improvement > 0.1) return 'improving'; // 10% improvement
    if (improvement < -0.1) return 'declining'; // 10% degradation
    return 'stable';
  }

  /**
   * Analyze usage patterns for chatmodes
   */
  analyzeUsagePatterns(subagent?: string, days = 7): UsagePattern[] {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const metrics = this.storage.getUsageMetrics(subagent)
      .filter(m => new Date(m.timestamp) >= startDate);

    if (subagent) {
      return [this.analyzeSpecificSubagentUsage(subagent, metrics)];
    }

    // Analyze all subagents
    const subagentGroups: Record<string, UsageMetric[]> = {};
    for (const metric of metrics) {
      if (!subagentGroups[metric.subagent]) {
        subagentGroups[metric.subagent] = [];
      }
      subagentGroups[metric.subagent].push(metric);
    }

    return Object.entries(subagentGroups).map(([cm, cms]) =>
      this.analyzeSpecificSubagentUsage(cm, cms)
    );
  }

  private analyzeSpecificSubagentUsage(subagent: string, metrics: UsageMetric[]): UsagePattern {
    if (metrics.length === 0) {
      return this.createEmptyUsagePattern(subagent);
    }

    // Calculate peak hours
    const hourCounts: Record<number, number> = {};
    for (const metric of metrics) {
      const hour = new Date(metric.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Calculate session duration (simplified)
    const sessionDurations: Record<string, number> = {};
    for (const metric of metrics) {
      if (!sessionDurations[metric.sessionId]) {
        sessionDurations[metric.sessionId] = 0;
      }
      sessionDurations[metric.sessionId]++;
    }

    const avgSessionDuration = Object.values(sessionDurations)
      .reduce((sum, duration) => sum + duration, 0) / Object.values(sessionDurations).length;

    // Calculate success rate
    const successRate = metrics.filter(m => m.success).length / metrics.length;

    // Analyze common tasks
    const taskTypes = metrics
      .map(m => m.userContext?.taskType)
      .filter(Boolean) as string[];

    const taskCounts: Record<string, number> = {};
    for (const task of taskTypes) {
      taskCounts[task] = (taskCounts[task] || 0) + 1;
    }

    const commonTasks = Object.entries(taskCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([task]) => task);

    // Analyze user behaviors
    const complexities = metrics
      .map(m => m.userContext?.complexity)
      .filter(Boolean) as string[];

    const complexityMode = this.findMode(complexities) || 'medium';

    return {
      subagent,
      peakHours,
      avgSessionDuration,
      successRate,
      commonTasks,
      userBehaviors: {
        refinementFrequency: 0, // Will be populated by quality analyzer
        taskComplexity: complexityMode as 'low' | 'medium' | 'high',
        preferredFeatures: commonTasks
      }
    };
  }

  private createEmptyUsagePattern(subagent: string): UsagePattern {
    return {
      subagent,
      peakHours: [],
      avgSessionDuration: 0,
      successRate: 0,
      commonTasks: [],
      userBehaviors: {
        refinementFrequency: 0,
        taskComplexity: 'medium',
        preferredFeatures: []
      }
    };
  }

  private findMode(array: string[]): string | null {
    const counts: Record<string, number> = {};
    for (const item of array) {
      counts[item] = (counts[item] || 0) + 1;
    }

    let maxCount = 0;
    let mode: string | null = null;

    for (const [item, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mode = item;
      }
    }

    return mode;
  }

  /**
   * Get current system health metrics
   */
  getSystemHealth(): SystemHealth {
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.systemStartTime;

    // Calculate error rate from recent performance metrics
    const recentMetrics = this.storage.getPerformanceMetrics(undefined, 100);
    const errorRate = recentMetrics.length > 0
      ? recentMetrics.filter(m => !m.success).length / recentMetrics.length
      : 0;

    // Calculate average response time
    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    const storageHealth = this.storage.getStorageHealth();

    return {
      status: this.determineHealthStatus(errorRate, avgResponseTime, memoryUsage.heapUsed),
      totalRecords: storageHealth.totalRecords,
      memoryUsage: memoryUsage.heapUsed,
      lastCleanup: storageHealth.lastCleanup,
      storageLocation: storageHealth.storageLocation,
      uptime,
      errorRate,
      avgResponseTime
    };
  }

  private determineHealthStatus(
    errorRate: number,
    avgResponseTime: number,
    memoryUsage: number
  ): 'healthy' | 'warning' | 'critical' {
    if (errorRate > 0.1 || avgResponseTime > 5000 || memoryUsage > 1024 * 1024 * 1024) {
      return 'critical';
    }

    if (errorRate > 0.05 || avgResponseTime > 2000 || memoryUsage > 512 * 1024 * 1024) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Get performance summary for all operations
   */
  getPerformanceSummary(days = 7): Record<string, PerformanceInsight> {
    const metrics = this.storage.getPerformanceMetrics();
    const operations = [...new Set(metrics.map(m => m.operation))];

    const summary: Record<string, PerformanceInsight> = {};

    for (const operation of operations) {
      summary[operation] = this.analyzeOperationPerformance(operation, days);
    }

    return summary;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(operation?: string, days = 30): {
    performance: PerformanceMetric[];
    usage: UsageMetric[];
    summary: any;
  } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const performance = this.storage.getPerformanceMetrics(operation)
      .filter(m => new Date(m.timestamp) >= startDate);

    const usage = this.storage.getUsageMetrics()
      .filter(m => new Date(m.timestamp) >= startDate);

    const summary = {
      timeRange: `${days} days`,
      totalOperations: performance.length,
      uniqueSessions: new Set(usage.map(u => u.sessionId)).size,
      avgResponseTime: performance.reduce((sum, p) => sum + p.duration, 0) / performance.length,
      successRate: performance.filter(p => p.success).length / performance.length,
      exportedAt: new Date().toISOString()
    };

    logger.info('Exported metrics for analysis', {
      operation,
      days,
      performanceRecords: performance.length,
      usageRecords: usage.length
    });

    return { performance, usage, summary };
  }
}
