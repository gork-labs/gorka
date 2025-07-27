import { logger } from './logger.js';
/**
 * Optimizes chatmode content for sub-agent prompts by extracting only essential information
 * to prevent enormous prompts that overwhelm LLM context windows
 */
export class ChatmodeOptimizer {
    /**
     * Create a lean, essential-only version of chatmode instructions for sub-agents
     * Reduces ~7K token chatmodes to ~300-500 tokens while preserving core functionality
     */
    static createSubAgentPrompt(chatmode) {
        const content = chatmode.content || '';
        logger.debug('Optimizing chatmode for sub-agent', {
            chatmode: chatmode.name,
            originalLength: content.length,
            estimatedTokens: Math.ceil(content.length / 4)
        });
        // Extract essential sections from the full chatmode content
        const essentials = this.extractEssentialSections(content, chatmode.name);
        // Build lean sub-agent prompt
        const leanPrompt = this.buildLeanPrompt(chatmode, essentials);
        logger.debug('Created lean sub-agent prompt', {
            chatmode: chatmode.name,
            originalLength: content.length,
            optimizedLength: leanPrompt.length,
            reductionRatio: (leanPrompt.length / content.length * 100).toFixed(1) + '%',
            estimatedTokenSavings: Math.ceil((content.length - leanPrompt.length) / 4)
        });
        return leanPrompt;
    }
    /**
     * Extract only the essential sections needed for sub-agent operation
     */
    static extractEssentialSections(content, chatmodeName) {
        const lines = content.split('\n');
        return {
            roleDescription: this.extractRoleDescription(lines),
            coreCapabilities: this.extractCoreCapabilities(lines),
            criticalConstraints: this.extractCriticalConstraints(lines),
            outputRequirements: this.extractOutputRequirements(lines),
            analysisWorkflow: this.extractAnalysisWorkflow(lines, chatmodeName)
        };
    }
    /**
     * Extract concise role description (1-2 sentences)
     */
    static extractRoleDescription(lines) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Look for role definition patterns
            if (line.includes('**Role**:') || line.includes('**Primary Function**:')) {
                const nextLine = lines[i + 1]?.trim() || '';
                return nextLine.replace(/^\*\*.*?\*\*:?\s*/, '').substring(0, 200);
            }
            // Alternative patterns
            if (line.includes('domain expert') || line.includes('specialized') || line.includes('expertise')) {
                return line.replace(/^\*\*.*?\*\*:?\s*/, '').substring(0, 200);
            }
        }
        return `Specialized domain expert providing focused technical analysis.`;
    }
    /**
     * Extract core capabilities (3-5 bullet points max)
     */
    static extractCoreCapabilities(lines) {
        const capabilities = [];
        let inCapabilitiesSection = false;
        for (const line of lines) {
            const trimmed = line.trim();
            // Start of capabilities section
            if (trimmed.includes('Core') && (trimmed.includes('Competencies') || trimmed.includes('Capabilities'))) {
                inCapabilitiesSection = true;
                continue;
            }
            // End of section
            if (inCapabilitiesSection && trimmed.startsWith('##') && !trimmed.includes('Core')) {
                break;
            }
            // Extract capability items
            if (inCapabilitiesSection && trimmed.startsWith('-')) {
                const capability = trimmed.replace(/^-\s*/, '').replace(/\*\*/g, '');
                if (capability.length > 10) {
                    capabilities.push(capability.substring(0, 100));
                }
            }
        }
        // Limit to top 5 most essential capabilities
        return capabilities.slice(0, 5);
    }
    /**
     * Extract critical constraints and requirements
     */
    static extractCriticalConstraints(lines) {
        const constraints = [];
        for (const line of lines) {
            const trimmed = line.trim();
            // Look for constraint patterns
            if (trimmed.includes('MANDATORY') || trimmed.includes('CRITICAL') ||
                trimmed.includes('REQUIRED') || trimmed.includes('MUST')) {
                // Clean up the constraint
                const constraint = trimmed
                    .replace(/^\*\*.*?\*\*:?\s*/, '')
                    .replace(/🚨|❌|✅/g, '')
                    .trim();
                if (constraint.length > 10 && constraint.length < 150) {
                    constraints.push(constraint);
                }
            }
        }
        // Limit to top 3 most critical constraints
        return constraints.slice(0, 3);
    }
    /**
     * Extract output format requirements
     */
    static extractOutputRequirements(lines) {
        // Look for JSON format or response format sections
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('JSON format') || line.includes('Response Format')) {
                // Extract the next few lines for format requirements
                const formatLines = [];
                for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
                    const formatLine = lines[j].trim();
                    if (formatLine.startsWith('##') || formatLine.length === 0)
                        break;
                    formatLines.push(formatLine);
                }
                if (formatLines.length > 0) {
                    return formatLines.join(' ').substring(0, 200);
                }
            }
        }
        return 'Respond in structured JSON format with deliverables, memory_operations, and metadata.';
    }
    /**
     * Extract streamlined analysis workflow (domain-specific)
     */
    static extractAnalysisWorkflow(lines, chatmodeName) {
        const workflow = [];
        // Domain-specific workflows
        switch (chatmodeName) {
            case 'Security Engineer':
                workflow.push('Analyze authentication and authorization mechanisms');
                workflow.push('Identify OWASP Top 10 vulnerabilities');
                workflow.push('Assess security architecture and threat vectors');
                break;
            case 'DevOps Engineer':
                workflow.push('Evaluate infrastructure configuration and scaling');
                workflow.push('Analyze CI/CD pipeline and deployment processes');
                workflow.push('Assess monitoring and operational requirements');
                break;
            case 'Database Architect':
                workflow.push('Review data models and schema design');
                workflow.push('Analyze query performance and indexing strategy');
                workflow.push('Evaluate scalability and consistency requirements');
                break;
            case 'Software Engineer':
                workflow.push('Review code architecture and design patterns');
                workflow.push('Analyze technical debt and maintainability');
                workflow.push('Assess performance and integration requirements');
                break;
            case 'Test Engineer':
                workflow.push('Evaluate test coverage and quality metrics');
                workflow.push('Analyze risk areas and edge cases');
                workflow.push('Design test strategy and automation approach');
                break;
            default:
                workflow.push('Analyze domain-specific requirements and constraints');
                workflow.push('Evaluate technical solutions and trade-offs');
                workflow.push('Provide evidence-based recommendations');
        }
        return workflow;
    }
    /**
     * Build the final lean prompt for sub-agents
     */
    static buildLeanPrompt(chatmode, essentials) {
        return `# ${chatmode.name} - Sub-Agent Specialist

**Role**: ${essentials.roleDescription}

## Core Capabilities
${essentials.coreCapabilities.map(cap => `- ${cap}`).join('\n')}

## Analysis Approach
${essentials.analysisWorkflow.map(step => `- ${step}`).join('\n')}

## Critical Requirements
${essentials.criticalConstraints.map(constraint => `- ${constraint}`).join('\n')}

## Evidence Standards
- Provide specific file paths and line numbers for all findings
- Include actual code snippets as evidence
- State confidence levels (High/Medium/Low) for recommendations
- Acknowledge analysis limitations explicitly

## Response Format
${essentials.outputRequirements}

Focus on your domain expertise while providing concrete, actionable analysis with evidence.`;
    }
}
