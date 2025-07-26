import { z } from 'zod';

// =============================================================================
// Session Management Types
// =============================================================================

export interface SessionState {
  sessionId: string;
  totalCalls: number;
  agentTypeCalls: Record<string, number>;
  refinementCount: Record<string, number>;
  isSubAgent: boolean;
  currentDepth: number;
  parentSessionId?: string;
  createdAt: string;
  lastActivity: string;
}

// =============================================================================
// Sub-Agent Response Format (as defined in architecture)
// =============================================================================

export const MemoryOperationSchema = z.object({
  operation: z.enum([
    'create_entities',
    'add_observations',
    'create_relations',
    'delete_entities',
    'delete_observations',
    'delete_relations'
  ]),
  data: z.record(z.any())
});

export const DeliverableSchema = z.object({
  documents: z.array(z.string()).optional(),
  analysis: z.string().optional(),
  recommendations: z.array(z.string()).optional()
});

export const SubAgentMetadataSchema = z.object({
  chatmode: z.string(),
  task_completion_status: z.enum(['complete', 'partial', 'failed']),
  processing_time: z.string(),
  confidence_level: z.enum(['high', 'medium', 'low'])
});

export const SubAgentResponseSchema = z.object({
  deliverables: DeliverableSchema,
  memory_operations: z.array(MemoryOperationSchema).optional(),
  metadata: SubAgentMetadataSchema,
  // Tool execution fields (optional - for when agent wants to execute tools)
  tool: z.string().optional(),
  arguments: z.record(z.any()).optional()
});

// =============================================================================
// Parallel Agent Spawning Types
// =============================================================================

export const ParallelAgentSpecSchema = z.object({
  agent_id: z.string(),
  chatmode: z.string(),
  task: z.string(),
  context: z.string(),
  expected_deliverables: z.string()
});

export const SpawnAgentsParallelArgsSchema = z.object({
  agents: z.array(ParallelAgentSpecSchema).min(1),
  coordination_context: z.string().optional()
});

export interface ParallelAgentResult {
  agent_id: string;
  chatmode: string;
  status: 'success' | 'failed';
  execution_time_ms: number;
  session_id: string | null;
  response?: SubAgentResponse;
  error?: string;
}

export type MemoryOperation = z.infer<typeof MemoryOperationSchema>;
export type Deliverable = z.infer<typeof DeliverableSchema>;
export type SubAgentMetadata = z.infer<typeof SubAgentMetadataSchema>;
export type SubAgentResponse = z.infer<typeof SubAgentResponseSchema>;

// =============================================================================
// MCP Tool Arguments
// =============================================================================

export const SpawnAgentArgsSchema = z.object({
  chatmode: z.string().describe('The chatmode to use for the sub-agent (e.g., "Security Engineer")'),
  task: z.string().describe('Detailed task description for the sub-agent'),
  context: z.string().describe('Relevant context and background information'),
  expected_deliverables: z.string().describe('What the sub-agent should produce')
});

export const ValidateOutputArgsSchema = z.object({
  sub_agent_response: z.string().describe('JSON response from sub-agent to validate'),
  requirements: z.string().describe('Original task requirements'),
  quality_criteria: z.string().describe('Quality criteria for validation'),
  chatmode: z.string().optional().describe('Chatmode used for the sub-agent (for chatmode-specific validation)'),
  session_id: z.string().optional().describe('Session ID for refinement tracking'),
  enable_refinement: z.boolean().optional().describe('Whether to generate refinement recommendations (default: true)')
});

export type SpawnAgentArgs = z.infer<typeof SpawnAgentArgsSchema>;
export type ValidateOutputArgs = z.infer<typeof ValidateOutputArgsSchema>;

// =============================================================================
// Chatmode Management
// =============================================================================

export interface ChatmodeDefinition {
  name: string;
  description: string;
  tools: string[];
  content: string;
  filePath: string;
}

// =============================================================================
// Quality Control
// =============================================================================

// Legacy interface for backward compatibility
export interface QualityAssessment {
  score: number; // 0-100
  passed: boolean;
  issues: string[];
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Enhanced Quality Control Types for Phase 3
export interface QualityRuleResult {
  passed: boolean;
  score: number; // 0-100
  feedback: string;
  severity: 'critical' | 'important' | 'minor';
  category: string;
}

export interface ValidationContext {
  chatmode: string;
  requirements: string;
  qualityCriteria: string;
  sessionHistory?: SessionState;
  taskType?: string;
  expectedDeliverables?: string[];
}

export interface QualityRule {
  name: string;
  category: string;
  weight: number; // 0-1, importance of this rule
  applicableToAll: boolean; // true for universal rules, false for chatmode-specific
  evaluator: (response: SubAgentResponse, context: ValidationContext) => QualityRuleResult;
}

export interface EnhancedQualityAssessment {
  overallScore: number; // 0-100, weighted average
  passed: boolean; // true if score >= threshold
  qualityThreshold: number;
  ruleResults: QualityRuleResult[];
  categories: Record<string, number>; // category -> score
  recommendations: string[];
  criticalIssues: string[];
  confidence: 'high' | 'medium' | 'low';
  processingTime: number; // ms
  canRefine: boolean; // true if refinement would likely help
  refinementSuggestions: string[];
}

export interface RefinementState {
  sessionId: string;
  originalTaskId: string;
  attemptNumber: number;
  previousScores: number[];
  improvementAreas: string[];
  lastRefinementTime: string;
  refinementReason: string;
  qualityTrend: 'improving' | 'declining' | 'stable';
}

export interface QualityMetrics {
  totalValidations: number;
  averageScore: number;
  successRate: number; // percentage passing quality threshold
  refinementRate: number; // percentage requiring refinement
  categoryBreakdown: Record<string, number>;
  chatmodePerformance: Record<string, number>;
  qualityTrends: Array<{
    timestamp: string;
    averageScore: number;
    validationCount: number;
  }>;
}

export interface ChatmodeQualityConfig {
  chatmode: string;
  qualityThreshold: number; // minimum score to pass
  maxRefinementAttempts: number;
  specificRules: string[]; // names of chatmode-specific rules to apply
  ruleWeights: Record<string, number>; // rule name -> weight override
  requiredCategories: string[]; // categories that must pass
  refinementPromptTemplate?: string;
}

// =============================================================================
// Error Types
// =============================================================================

export class SecondBrainError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'SecondBrainError';
  }
}

export class SessionLimitError extends SecondBrainError {
  constructor(message: string, details?: any) {
    super(message, 'SESSION_LIMIT_EXCEEDED', details);
  }
}

export class ChatmodeNotFoundError extends SecondBrainError {
  constructor(chatmode: string) {
    super(`Chatmode not found: ${chatmode}`, 'CHATMODE_NOT_FOUND', { chatmode });
  }
}

export class InvalidResponseError extends SecondBrainError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_RESPONSE_FORMAT', details);
  }
}

// =============================================================================
// Analytics & Intelligence Types (Phase 4)
// =============================================================================

export interface QualityMetric {
  timestamp: string;
  chatmode: string;
  sessionId?: string;
  qualityScore: number; // 0-100
  passed: boolean;
  processingTime: number; // ms
  refinementAttempts: number;
  ruleBreakdown: Record<string, number>; // rule name -> score
  categories: Record<string, number>; // category -> score
  criticalIssues: string[];
  improvementAreas: string[];
}

export interface PerformanceMetric {
  timestamp: string;
  operation: string; // 'validation', 'refinement', 'spawn_agent', etc.
  duration: number; // ms
  success: boolean;
  errorType?: string;
  resourceUsage?: {
    memory: number;
    cpu?: number;
  };
  requestSize?: number; // bytes
  responseSize?: number; // bytes
}

export interface UsageMetric {
  timestamp: string;
  chatmode: string;
  sessionId: string;
  operation: string;
  success: boolean;
  userContext?: {
    taskType?: string;
    urgency?: string;
    complexity?: 'low' | 'medium' | 'high';
  };
}

export interface AnalyticsData {
  qualityMetrics: Record<string, QualityMetric[]>; // chatmode -> metrics
  performanceMetrics: PerformanceMetric[];
  usageMetrics: UsageMetric[];
  lastUpdated: string;
  totalRecords: number;
}

export interface QualityTrend {
  chatmode: string;
  timeRange: string;
  scoreAverage: number;
  scoreTrend: 'improving' | 'declining' | 'stable';
  successRate: number;
  refinementRate: number;
  totalValidations: number;
  insights: string[];
  recommendations: string[];
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  totalRecords: number;
  memoryUsage: number; // bytes
  lastCleanup: string;
  storageLocation: string;
  uptime?: number; // ms
  errorRate?: number; // 0-1
  avgResponseTime?: number; // ms
}

export interface QualityInsight {
  type: 'trend' | 'pattern' | 'anomaly' | 'recommendation';
  chatmode?: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metrics: Record<string, number>;
  actionable: boolean;
  recommendation?: string;
  confidence: number; // 0-1
  timestamp: string;
}

export interface PerformanceInsight {
  operation: string;
  avgDuration: number;
  p95Duration: number;
  successRate: number;
  errorPatterns: string[];
  optimizationSuggestions: string[];
  trend: 'improving' | 'declining' | 'stable';
  timestamp: string;
}

export interface UsagePattern {
  chatmode: string;
  peakHours: number[];
  avgSessionDuration: number;
  successRate: number;
  commonTasks: string[];
  userBehaviors: {
    refinementFrequency: number;
    taskComplexity: 'low' | 'medium' | 'high';
    preferredFeatures: string[];
  };
}

// Analytics Configuration
export interface AnalyticsConfig {
  retention: {
    qualityMetrics: number; // days
    performanceMetrics: number; // days
    usageMetrics: number; // days
  };
  aggregation: {
    windowSize: number; // minutes for real-time aggregation
    batchSize: number; // records per batch
  };
  alerts: {
    qualityThreshold: number; // score below which to alert
    errorRateThreshold: number; // error rate above which to alert
    performanceThreshold: number; // response time above which to alert
  };
  intelligence: {
    enablePredictiveScoring: boolean;
    enableAdaptiveThresholds: boolean;
    enableAutoOptimization: boolean;
    learningWindowDays: number;
  };
}

// =============================================================================
// Machine Learning Types
// =============================================================================

export interface MLPrediction {
  prediction: number;
  confidence: number;
  reasoning: string;
  features: Map<string, number>;
}

export interface MLTrainingData {
  timestamp: number;
  features: Map<string, number>;
  actualScore: number;
  actualPassed: boolean;
  processingTime: number;
  chatmode: string;
  prediction?: number;
}

export interface MLModel {
  name: string;
  type: 'regression' | 'classification';
  version: string;
  features: string[];
  weights: Map<string, number>;
  accuracy: number;
  lastTrained: number;
  trainingCount: number;
}

export interface MLInsight {
  type: 'model_performance' | 'learning_pattern' | 'training_data' | 'prediction_accuracy' | 'data_distribution' | 'system_error' | 'anomaly_detection' | 'quality_forecast' | 'cross_chatmode_analysis' | 'proactive_alert';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionRequired: boolean;
  recommendation?: string;
  forecastData?: {
    prediction: number;
    confidenceInterval: [number, number];
    timeHorizon: string;
    methodology: string;
  };
  anomalyDetails?: {
    detectionMethod: string;
    severity: number;
    expectedValue: number;
    actualValue: number;
    deviation: number;
  };
}

export interface MLOptimization {
  timestamp: number;
  type: string;
  component: string;
  oldValue: number;
  newValue: number;
  expectedImprovement: number;
  actualImprovement?: number;
  applied: boolean;
}

export interface PredictiveAnalytics {
  qualityForecast: {
    chatmode: string;
    currentScore: number;
    predictedScore: number;
    confidenceInterval: [number, number];
    forecastHorizon: string;
    trendDirection: 'improving' | 'declining' | 'stable';
    confidence: number;
  };
  anomalies: {
    chatmode: string;
    metric: string;
    severity: 'low' | 'medium' | 'high';
    detectedAt: string;
    description: string;
    expectedValue: number;
    actualValue: number;
    deviationScore: number;
  }[];
  crossChatmodePatterns: {
    pattern: string;
    affectedChatmodes: string[];
    correlation: number;
    significance: 'low' | 'medium' | 'high';
    description: string;
    actionable: boolean;
  }[];
  proactiveAlerts: {
    alertType: 'performance_degradation' | 'quality_decline' | 'anomaly_cluster' | 'trend_reversal';
    severity: 'info' | 'warning' | 'critical';
    description: string;
    affectedComponents: string[];
    recommendedActions: string[];
    confidence: number;
    estimatedImpact: string;
  }[];
}

// =============================================================================
// Phase 8: Ensemble Methods & Auto-Optimization Types
// =============================================================================

export interface BaseModel {
  id: string;
  name: string;
  type: 'statistical' | 'pattern_recognition' | 'domain_specific' | 'meta_learning';
  version: string;
  accuracy: number;
  lastUpdated: number;
  trainingCount: number;
  specialization?: string; // e.g., 'Security Engineer', 'high_complexity_tasks'
}

export interface ModelPrediction {
  modelId: string;
  prediction: number;
  confidence: number;
  reasoning: string;
  contributingFactors: Record<string, number>;
  processingTime: number;
}

export interface EnsemblePrediction {
  finalPrediction: number;
  confidence: number;
  modelContributions: ModelPrediction[];
  votingMethod: 'weighted_average' | 'confidence_weighted' | 'majority_vote' | 'expert_selection';
  consensusLevel: number; // 0-1, how much models agree
  metadata: {
    totalModels: number;
    participatingModels: number;
    conflictResolution?: string;
    qualityAssurance: boolean;
  };
}

export interface ABTestConfig {
  experimentId: string;
  name: string;
  description: string;
  hypothesis: string;
  startDate: string;
  estimatedDuration: number; // days
  targetSampleSize: number;
  confidenceLevel: number; // 0.95 for 95%
  minimumEffectSize: number;
  successMetrics: string[];
  variants: {
    id: string;
    name: string;
    description: string;
    trafficAllocation: number; // 0-1
    configuration: Record<string, any>;
  }[];
  safetyConstraints: {
    maxAllowedDegradation: number;
    earlyStoppingRules: string[];
    fallbackVariant: string;
  };
}

export interface ABTestResult {
  experimentId: string;
  status: 'running' | 'completed' | 'stopped_early' | 'failed';
  duration: number; // actual days run
  samplesCollected: number;
  statisticalPower: number;
  pValue: number;
  effectSize: number;
  confidenceInterval: [number, number];
  winningVariant?: string;
  results: {
    variantId: string;
    sampleSize: number;
    successRate: number;
    averageMetric: number;
    confidenceInterval: [number, number];
  }[];
  recommendation: 'deploy_winner' | 'run_longer' | 'redesign_experiment' | 'no_significant_difference';
  insights: string[];
}

export interface AutoOptimizationConfig {
  optimizationId: string;
  name: string;
  description: string;
  objectives: {
    metric: string;
    target: 'maximize' | 'minimize';
    weight: number; // for multi-objective optimization
    constraint?: {
      min?: number;
      max?: number;
    };
  }[];
  parameters: {
    name: string;
    type: 'continuous' | 'discrete' | 'categorical';
    range: any; // numbers for continuous, array for discrete/categorical
    currentValue: any;
  }[];
  algorithm: 'bayesian_optimization' | 'genetic_algorithm' | 'random_search' | 'grid_search';
  constraints: {
    maxIterations: number;
    maxDuration: number; // minutes
    convergenceThreshold: number;
    safetyChecks: string[];
  };
}

export interface OptimizationResult {
  optimizationId: string;
  status: 'running' | 'converged' | 'max_iterations' | 'failed' | 'safety_stopped';
  iterations: number;
  bestScore: number;
  bestParameters: Record<string, any>;
  improvement: number; // percentage improvement from baseline
  convergenceHistory: {
    iteration: number;
    score: number;
    parameters: Record<string, any>;
    timestamp: string;
  }[];
  deploymentStatus: 'not_deployed' | 'staged' | 'production' | 'rolled_back';
  safetyMetrics: {
    metric: string;
    baseline: number;
    current: number;
    threshold: number;
    status: 'safe' | 'warning' | 'critical';
  }[];
}

export interface MetaLearningInsight {
  insightType: 'learning_efficiency' | 'transfer_opportunity' | 'curriculum_optimization' | 'feature_importance' | 'model_combination';
  description: string;
  evidenceStrength: number; // 0-1
  applicableScenarios: string[];
  recommendations: string[];
  transferPotential?: {
    sourceChatmode: string;
    targetChatmode: string;
    similarity: number;
    expectedBenefit: number;
  };
  learningPatterns?: {
    optimalDataAmount: number;
    learningCurveShape: 'linear' | 'logarithmic' | 'exponential' | 'plateau';
    criticalFeatures: string[];
    diminishingReturns: boolean;
  };
}

export interface AdaptiveIntelligence {
  ensemblePredictions: EnsemblePrediction[];
  activeExperiments: ABTestConfig[];
  experimentResults: ABTestResult[];
  optimizationResults: OptimizationResult[];
  metaLearningInsights: MetaLearningInsight[];
  systemAdaptations: {
    timestamp: string;
    adaptationType: 'parameter_tuning' | 'model_reweighting' | 'feature_selection' | 'threshold_adjustment';
    description: string;
    performance_impact: number;
    confidence: number;
  }[];
}
