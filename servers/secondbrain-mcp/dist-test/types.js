import { z } from 'zod';
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
    subagent: z.string(),
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
    subagent: z.string(),
    task: z.string(),
    context: z.string(),
    expected_deliverables: z.string()
});
export const SpawnAgentsParallelArgsSchema = z.object({
    agents: z.array(ParallelAgentSpecSchema).min(1),
    coordination_context: z.string().optional()
});
// =============================================================================
// MCP Tool Arguments
// =============================================================================
export const SpawnAgentArgsSchema = z.object({
    subagent: z.string().describe('The subagent type to use for the sub-agent (e.g., "Security Engineer")'),
    task: z.string().describe('Detailed task description for the sub-agent'),
    context: z.string().describe('Relevant context and background information'),
    expected_deliverables: z.string().describe('What the sub-agent should produce')
});
export const ValidateOutputArgsSchema = z.object({
    sub_agent_response: z.string().describe('JSON response from sub-agent to validate'),
    requirements: z.string().describe('Original task requirements'),
    quality_criteria: z.string().describe('Quality criteria for validation'),
    subagent: z.string().optional().describe('Subagent type used for the sub-agent (for subagent-specific validation)'),
    session_id: z.string().optional().describe('Session ID for refinement tracking'),
    enable_refinement: z.boolean().optional().describe('Whether to generate refinement recommendations (default: true)')
});
// =============================================================================
// Error Types
// =============================================================================
export class SecondBrainError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'SecondBrainError';
    }
}
export class SessionLimitError extends SecondBrainError {
    constructor(message, details) {
        super(message, 'SESSION_LIMIT_EXCEEDED', details);
    }
}
export class SubagentNotFoundError extends SecondBrainError {
    constructor(subagent) {
        super(`Subagent not found: ${subagent}`, 'SUBAGENT_NOT_FOUND', { subagent });
    }
}
export class InvalidResponseError extends SecondBrainError {
    constructor(message, details) {
        super(message, 'INVALID_RESPONSE_FORMAT', details);
    }
}
