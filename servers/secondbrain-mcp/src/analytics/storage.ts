import * as fs from 'fs';
import * as path from 'path';
import {
  QualityMetric,
  PerformanceMetric,
  UsageMetric,
  AnalyticsData,
  QualityTrend,
  SystemHealth
} from '../utils/types.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

/**
 * Analytics Storage Manager
 * Handles persistence and retrieval of analytics data for the SecondBrain MCP server
 */
export class AnalyticsStorage {
  private storePath: string;
  private qualityMetrics: Map<string, QualityMetric[]> = new Map();
  private performanceMetrics: PerformanceMetric[] = [];
  private usageMetrics: UsageMetric[] = [];
  private readonly maxMetricsPerType = 10000; // Prevent unbounded growth

  constructor() {
    this.storePath = config.sessionStorePath; // Reuse existing storage path
    this.ensureAnalyticsDirectory();
    this.loadExistingAnalytics();
    this.startCleanupTimer();
  }

  private ensureAnalyticsDirectory(): void {
    try {
      const analyticsPath = path.join(this.storePath, 'analytics');
      if (!fs.existsSync(analyticsPath)) {
        fs.mkdirSync(analyticsPath, { recursive: true });
        logger.info('Created analytics storage directory', { path: analyticsPath });
      }
    } catch (error) {
      logger.error('Failed to create analytics storage directory', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private loadExistingAnalytics(): void {
    try {
      this.loadQualityMetrics();
      this.loadPerformanceMetrics();
      this.loadUsageMetrics();

      logger.info('Loaded analytics data from storage', {
        qualityMetricTypes: this.qualityMetrics.size,
        performanceMetrics: this.performanceMetrics.length,
        usageMetrics: this.usageMetrics.length
      });
    } catch (error) {
      logger.warn('Failed to load existing analytics data', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private loadQualityMetrics(): void {
    const qualityFile = path.join(this.storePath, 'analytics', 'quality-metrics.json');
    if (fs.existsSync(qualityFile)) {
      const data = fs.readFileSync(qualityFile, 'utf-8');
      const qualityData = JSON.parse(data);
      this.qualityMetrics = new Map(Object.entries(qualityData));
    }
  }

  private loadPerformanceMetrics(): void {
    const performanceFile = path.join(this.storePath, 'analytics', 'performance-metrics.json');
    if (fs.existsSync(performanceFile)) {
      const data = fs.readFileSync(performanceFile, 'utf-8');
      this.performanceMetrics = JSON.parse(data);
    }
  }

  private loadUsageMetrics(): void {
    const usageFile = path.join(this.storePath, 'analytics', 'usage-metrics.json');
    if (fs.existsSync(usageFile)) {
      const data = fs.readFileSync(usageFile, 'utf-8');
      this.usageMetrics = JSON.parse(data);
    }
  }

  private persistAnalytics(): void {
    try {
      this.persistQualityMetrics();
      this.persistPerformanceMetrics();
      this.persistUsageMetrics();
    } catch (error) {
      logger.error('Failed to persist analytics data', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private persistQualityMetrics(): void {
    const qualityFile = path.join(this.storePath, 'analytics', 'quality-metrics.json');
    const qualityData = Object.fromEntries(this.qualityMetrics);
    fs.writeFileSync(qualityFile, JSON.stringify(qualityData, null, 2));
  }

  private persistPerformanceMetrics(): void {
    const performanceFile = path.join(this.storePath, 'analytics', 'performance-metrics.json');
    fs.writeFileSync(performanceFile, JSON.stringify(this.performanceMetrics, null, 2));
  }

  private persistUsageMetrics(): void {
    const usageFile = path.join(this.storePath, 'analytics', 'usage-metrics.json');
    fs.writeFileSync(usageFile, JSON.stringify(this.usageMetrics, null, 2));
  }

  private startCleanupTimer(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);
  }

  private cleanupOldMetrics(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days of data
    let cleaned = 0;

    // Clean up performance metrics
    const originalPerformanceCount = this.performanceMetrics.length;
    this.performanceMetrics = this.performanceMetrics.filter(
      metric => new Date(metric.timestamp) > cutoffDate
    );
    cleaned += originalPerformanceCount - this.performanceMetrics.length;

    // Clean up usage metrics
    const originalUsageCount = this.usageMetrics.length;
    this.usageMetrics = this.usageMetrics.filter(
      metric => new Date(metric.timestamp) > cutoffDate
    );
    cleaned += originalUsageCount - this.usageMetrics.length;

    // Clean up quality metrics
    for (const [chatmode, metrics] of this.qualityMetrics) {
      const originalCount = metrics.length;
      const filtered = metrics.filter(metric => new Date(metric.timestamp) > cutoffDate);
      this.qualityMetrics.set(chatmode, filtered);
      cleaned += originalCount - filtered.length;
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old analytics metrics', { count: cleaned });
      this.persistAnalytics();
    }
  }

  // Quality Metrics Operations
  recordQualityMetric(subagent: string, metric: QualityMetric): void {
    if (!this.qualityMetrics.has(subagent)) {
      this.qualityMetrics.set(subagent, []);
    }

    const metrics = this.qualityMetrics.get(subagent)!;
    metrics.push(metric);

    // Prevent unbounded growth
    if (metrics.length > this.maxMetricsPerType) {
      metrics.splice(0, metrics.length - this.maxMetricsPerType);
    }

    this.qualityMetrics.set(subagent, metrics);
    this.persistQualityMetrics();

    logger.debug('Recorded quality metric', {
      subagent,
      score: metric.qualityScore,
      passed: metric.passed,
      timestamp: metric.timestamp
    });
  }

  getQualityMetrics(subagent?: string, limit?: number): QualityMetric[] {
    if (subagent) {
      const metrics = this.qualityMetrics.get(subagent) || [];
      return limit ? metrics.slice(-limit) : metrics;
    }

    // Return all metrics across all subagents
    const allMetrics: QualityMetric[] = [];
    for (const metrics of this.qualityMetrics.values()) {
      allMetrics.push(...metrics);
    }

    // Sort by timestamp and apply limit
    const sorted = allMetrics.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return limit ? sorted.slice(-limit) : sorted;
  }

  // Performance Metrics Operations
  recordPerformanceMetric(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);

    // Prevent unbounded growth
    if (this.performanceMetrics.length > this.maxMetricsPerType) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - this.maxMetricsPerType);
    }

    this.persistPerformanceMetrics();

    logger.debug('Recorded performance metric', {
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      timestamp: metric.timestamp
    });
  }

  getPerformanceMetrics(operation?: string, limit?: number): PerformanceMetric[] {
    let metrics = this.performanceMetrics;

    if (operation) {
      metrics = metrics.filter(m => m.operation === operation);
    }

    return limit ? metrics.slice(-limit) : metrics;
  }

  // Usage Metrics Operations
  recordUsageMetric(metric: UsageMetric): void {
    this.usageMetrics.push(metric);

    // Prevent unbounded growth
    if (this.usageMetrics.length > this.maxMetricsPerType) {
      this.usageMetrics.splice(0, this.usageMetrics.length - this.maxMetricsPerType);
    }

    this.persistUsageMetrics();

    logger.debug('Recorded usage metric', {
      subagent: metric.subagent,
      sessionId: metric.sessionId,
      timestamp: metric.timestamp
    });
  }

  getUsageMetrics(subagent?: string, limit?: number): UsageMetric[] {
    let metrics = this.usageMetrics;

    if (subagent) {
      metrics = metrics.filter(m => m.subagent === subagent);
    }

    return limit ? metrics.slice(-limit) : metrics;
  }

  // Analytics Data Aggregation
  getAnalyticsData(): AnalyticsData {
    const now = new Date().toISOString();

    return {
      qualityMetrics: Object.fromEntries(this.qualityMetrics),
      performanceMetrics: this.performanceMetrics,
      usageMetrics: this.usageMetrics,
      lastUpdated: now,
      totalRecords: this.getTotalRecordCount()
    };
  }

  private getTotalRecordCount(): number {
    let total = this.performanceMetrics.length + this.usageMetrics.length;
    for (const metrics of this.qualityMetrics.values()) {
      total += metrics.length;
    }
    return total;
  }

  // Health and Status
  getStorageHealth(): SystemHealth {
    const totalRecords = this.getTotalRecordCount();
    const memoryUsage = process.memoryUsage();

    return {
      status: totalRecords < this.maxMetricsPerType * 3 ? 'healthy' : 'warning',
      totalRecords,
      memoryUsage: memoryUsage.heapUsed,
      lastCleanup: new Date().toISOString(),
      storageLocation: path.join(this.storePath, 'analytics')
    };
  }

  // Cleanup and Maintenance
  clearAnalytics(): void {
    this.qualityMetrics.clear();
    this.performanceMetrics = [];
    this.usageMetrics = [];
    this.persistAnalytics();

    logger.info('Cleared all analytics data');
  }

  exportAnalytics(): AnalyticsData {
    logger.info('Exporting analytics data', {
      totalRecords: this.getTotalRecordCount()
    });

    return this.getAnalyticsData();
  }
}
