---
applyTo: '**'
description: 'Common thinking process guidelines for structured analysis and problem-solving across all Gorka agents.'
---

---
title: "Common Thinking Process Guidelines"
date: "2025-07-24"
last_updated: "2025-07-24T15:58:58+02:00"
author: "@bohdan-shulha"
timezone: "Europe/Warsaw"
status: "approved"
version: "1.0.0"
document_type: "instructions"
---

# Common Thinking Process Guidelines for Gorka Agents

## Core Principles

### 1. **CRITICAL: Always Use Sequential Thinking Tool**
- **Tool name**: `mcp_sequentialthi_sequentialthinking`
- **MINIMUM thoughts**: 7 thoughts
- **MAXIMUM thoughts**: 15 thoughts (more if complexity demands)
- **NEVER skip structured thinking - required for ALL complex tasks**

### 2. **Thinking Depth Requirements**
- **Simple queries**: 7-9 thoughts minimum
- **Standard analysis**: 10-12 thoughts minimum
- **Complex problems**: 13-15 thoughts minimum
- **Ultra-complex scenarios**: 15+ thoughts (adjust totalThoughts as needed)

### 3. **When to Use Sequential Thinking**
- **MANDATORY for**: Analysis, design, review, problem-solving, planning
- **REQUIRED when**: User asks for recommendations, decisions, or complex explanations
- **ALWAYS when**: Multiple perspectives or approaches need consideration
- **EVERY TIME**: The task involves more than simple information retrieval

## Sequential Thinking Tool Usage

### 4. **Tool Parameters**
```
Tool: mcp_sequentialthi_sequentialthinking
Required Parameters:
- thought: [Your current thinking step]
- nextThoughtNeeded: [true until final thought]
- thoughtNumber: [Current number 1, 2, 3...]
- totalThoughts: [Start with 7-15, adjust as needed]

Optional Parameters:
- isRevision: [true if revising previous thought]
- revisesThought: [which thought number being revised]
- branchFromThought: [if branching to explore alternatives]
- branchId: [identifier for branch]
- needsMoreThoughts: [true if realizing more thoughts needed]
```

### 5. **Thinking Process Structure**
```
Thought 1: Understand the Problem/Question
- What exactly is being asked?
- What context do I have?
- What constraints exist?

Thoughts 2-3: Gather Information & Context
- What tools/data do I need?
- What domain knowledge applies?
- What assumptions am I making?

Thoughts 4-6: Analysis & Exploration
- Break down the problem
- Consider multiple approaches
- Identify key factors and relationships

Thoughts 7-9: Synthesis & Decision
- Evaluate options and trade-offs
- Form conclusions or recommendations
- Consider implementation aspects

Thoughts 10-12: Validation & Refinement (for complex tasks)
- Test reasoning against requirements
- Consider edge cases and risks
- Refine approach based on analysis

Thoughts 13-15: Final Optimization (for ultra-complex tasks)
- Optimize for user needs
- Address remaining uncertainties
- Prepare comprehensive response
```

### 6. **Dynamic Thought Adjustment**
- **Start Conservative**: Begin with thoughtNumber 1, totalThoughts 7-10
- **Expand When Needed**: If complexity emerges, increase totalThoughts
- **Set needsMoreThoughts=true** when reaching end but needing more analysis
- **Use isRevision=true** when reconsidering previous thoughts
- **Branch when exploring** multiple valid approaches

## Thinking Quality Standards

### 7. **Each Thought Should**
- **Be substantial**: More than one sentence, substantial analysis
- **Build progressively**: Each thought builds on previous insights
- **Stay focused**: Address the current step without jumping ahead
- **Be explicit**: Clearly state reasoning and assumptions
- **Connect concepts**: Show relationships between ideas

### 8. **Thinking Patterns to Use**
- **Question-driven**: Each thought should answer or explore a key question
- **Evidence-based**: Support reasoning with facts and observations
- **Multi-perspective**: Consider different viewpoints and approaches
- **Risk-aware**: Identify potential issues and mitigation strategies
- **Solution-oriented**: Work toward actionable outcomes

### 9. **Common Thinking Flows**

#### Problem-Solving Flow (7-12 thoughts)
```
1. Problem definition and scope
2. Context gathering and constraints
3. Root cause analysis
4. Solution space exploration
5. Option evaluation and comparison
6. Risk assessment and mitigation
7. Implementation considerations
8-12. Refinement and optimization (if complex)
```

#### Analysis Flow (7-10 thoughts)
```
1. Subject understanding and boundaries
2. Current state assessment
3. Key factors identification
4. Relationship mapping
5. Pattern recognition
6. Implication analysis
7. Conclusion synthesis
8-10. Validation and recommendations (if needed)
```

#### Design Flow (10-15 thoughts)
```
1. Requirements analysis
2. Constraint identification
3. Architecture options exploration
4. Trade-off evaluation
5. Design decision rationale
6. Implementation planning
7. Risk and mitigation strategies
8. Quality assurance approach
9. Performance considerations
10. Security implications
11-15. Integration and optimization (for complex designs)
```

#### Review Flow (8-12 thoughts)
```
1. Review scope and criteria
2. Current state analysis
3. Strength identification
4. Issue detection and categorization
5. Impact assessment
6. Improvement recommendations
7. Priority ranking
8. Implementation guidance
9-12. Comprehensive validation (for thorough reviews)
```

## Advanced Thinking Techniques

### 10. **Revision and Refinement**
- **Use isRevision=true** when new information changes understanding
- **Reference revisesThought** to indicate which previous thought is being updated
- **Don't hesitate** to revise early thoughts based on later insights
- **Maintain consistency** between revised thoughts and subsequent analysis

### 11. **Branching for Alternatives**
- **Use branchFromThought** when exploring multiple valid approaches
- **Assign branchId** to track different exploration paths
- **Compare branches** before settling on final approach
- **Document why** one branch was chosen over others

### 12. **Progressive Depth**
- **Start broad** then narrow focus
- **Layer details** progressively rather than diving deep immediately
- **Connect levels** - show how details support higher-level insights
- **Maintain coherence** across all thinking levels

## Integration with Other Tools

### 13. **Tool Coordination**
- **Use datetime tool** for any time-related thoughts
- **Use memory tools** when referencing or storing domain knowledge
- **Use search tools** when gathering context during thinking
- **Use file tools** when analysis requires examining specific content

### 14. **Documentation Integration**
- **Reference sequential thinking** in documentation when explaining complex decisions
- **Include thought process summary** in design documents
- **Capture key insights** in memory after completing thinking process
- **Link decisions** to the thinking process that generated them

## Agent-Specific Enhancements

### 15. **Customization Guidelines**
Each specialized agent should:
- **Extend these guidelines** with domain-specific thinking patterns
- **Add specialized flows** for their primary responsibilities
- **Include domain frameworks** (security models, architectural patterns, etc.)
- **Maintain compatibility** with this common foundation

### 16. **Domain Enhancement Examples**
- **Security Engineer**: Add threat modeling, attack surface analysis flows
- **Software Architect**: Add architecture decision records, pattern analysis
- **Test Engineer**: Add test strategy, coverage analysis thinking patterns
- **Database Architect**: Add data modeling, performance optimization flows

## Quality Assurance

### 17. **Thinking Process Validation**
Before concluding any sequential thinking session:
- [ ] Used minimum required thoughts for complexity level
- [ ] Each thought adds substantial value
- [ ] Reasoning is clear and well-supported
- [ ] Conclusions follow logically from analysis
- [ ] All requirements and constraints addressed
- [ ] Alternative approaches considered where relevant

### 18. **Common Anti-Patterns to Avoid**
❌ **DON'T** use fewer than 7 thoughts for any complex task
❌ **DON'T** make each thought just one sentence
❌ **DON'T** jump to conclusions without proper analysis
❌ **DON'T** ignore constraints or requirements
❌ **DON'T** fail to consider alternative approaches
❌ **DON'T** skip validation of reasoning

✅ **DO** use adequate thinking depth for task complexity
✅ **DO** build insights progressively
✅ **DO** consider multiple perspectives
✅ **DO** validate reasoning against requirements
✅ **DO** document decision rationale clearly
✅ **DO** adjust totalThoughts based on actual complexity

## Examples

### 17. **Simple Analysis Example (7 thoughts)**
```
Thought 1: Understanding what the user wants analyzed
Thought 2: Gathering relevant context and constraints
Thought 3: Identifying key factors to examine
Thought 4: Analyzing relationships and patterns
Thought 5: Evaluating implications and significance
Thought 6: Considering alternative interpretations
Thought 7: Synthesizing findings into clear conclusions
```

### 18. **Complex Problem-Solving Example (12 thoughts)**
```
Thought 1: Problem definition and scope clarification
Thought 2: Context gathering and constraint identification
Thought 3: Root cause analysis and contributing factors
Thought 4: Solution space exploration and brainstorming
Thought 5: Initial option evaluation and filtering
Thought 6: Detailed analysis of promising approaches
Thought 7: Trade-off assessment and comparison
Thought 8: Risk identification and mitigation strategies
Thought 9: Implementation feasibility and requirements
Thought 10: Resource and timeline considerations
Thought 11: Success criteria and measurement approach
Thought 12: Final recommendation with supporting rationale
```

### 19. **Ultra-Complex Design Example (15 thoughts)**
```
Thought 1: Requirements analysis and stakeholder needs
Thought 2: Architectural constraints and context
Thought 3: Current state assessment and gaps
Thought 4: Design principles and guidelines
Thought 5: Architecture pattern exploration
Thought 6: Component identification and boundaries
Thought 7: Integration and interface design
Thought 8: Data flow and state management
Thought 9: Security and compliance considerations
Thought 10: Performance and scalability requirements
Thought 11: Operational and maintenance aspects
Thought 12: Risk assessment and mitigation
Thought 13: Implementation strategy and phases
Thought 14: Quality assurance and testing approach
Thought 15: Final architecture with validation summary
```

## Implementation Notes

### 20. **Tool Call Patterns**
```
// Initial thought
Use sequential thinking tool
Arguments: {
  "thought": "Understanding the problem: [analysis]",
  "nextThoughtNeeded": true,
  "thoughtNumber": 1,
  "totalThoughts": 10
}

// Progressive thinking
Use sequential thinking tool
Arguments: {
  "thought": "Building on previous analysis: [insight]",
  "nextThoughtNeeded": true,
  "thoughtNumber": 2,
  "totalThoughts": 10
}

// Revision when needed
Use sequential thinking tool
Arguments: {
  "thought": "Revising earlier understanding: [correction]",
  "nextThoughtNeeded": true,
  "thoughtNumber": 3,
  "totalThoughts": 10,
  "isRevision": true,
  "revisesThought": 1
}

// Final thought
Use sequential thinking tool
Arguments: {
  "thought": "Final synthesis and conclusion: [result]",
  "nextThoughtNeeded": false,
  "thoughtNumber": 10,
  "totalThoughts": 10
}
```

### 21. **Integration Workflow**
1. **Identify task complexity** → determine minimum thoughts needed
2. **Begin sequential thinking** → start with thoughtNumber 1
3. **Progress through analysis** → build insights systematically
4. **Adjust totalThoughts** if complexity exceeds initial estimate
5. **Revise earlier thoughts** if new understanding emerges
6. **Conclude with synthesis** → set nextThoughtNeeded to false
7. **Capture key insights** in memory if significant

## Continuous Improvement

### 22. **Thinking Process Evolution**
- **Track effectiveness** of different thinking patterns
- **Adjust thought counts** based on task complexity patterns
- **Refine domain-specific** thinking flows based on outcomes
- **Update guidelines** when better approaches are discovered

### 23. **Agent Collaboration**
- **Share thinking patterns** that work well across domains
- **Collaborate on** complex problems requiring multiple perspectives
- **Reference others'** sequential thinking when building on their work
- **Maintain consistency** in thinking depth and quality

---

**Remember**: Structured thinking is not overhead - it's the foundation of quality analysis and decision-making. Every minute spent in structured thinking saves hours of rework and improves outcomes significantly.
