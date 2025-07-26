---
applyTo: '**'
description: 'Common thinking process guidelines for structured analysis and problem-solving across all Gorka agents.'
---

---
title: "Enhanced Critical Thinking Process Guidelines"
date: "2025-07-24"
last_updated: "2025-07-26T01:32:15+02:00"
author: "@bohdan-shulha"
timezone: "Europe/Warsaw"
status: "approved"
version: "2.0.0"
document_type: "instructions"
enhancement: "Mandatory 15+ step critical thinking with comprehensive validation"
---

# Enhanced Critical Thinking Process Guidelines for Gorka Agents

## Core Principles

### 1. **CRITICAL: Always Use Sequential Thinking Tool**
- **Tool name**: `mcp_sequentialthi_sequentialthinking`
- **MINIMUM thoughts**: 15 thoughts MANDATORY
- **MAXIMUM thoughts**: No limit (expand as complexity demands)
- **NEVER skip structured thinking - required for ALL complex tasks**

### 2. **Enhanced Thinking Depth Requirements**
- **ALL complex tasks**: 15+ thoughts MANDATORY minimum
- **Standard analysis**: 15-20 thoughts minimum
- **Complex problems**: 20-25 thoughts minimum
- **Ultra-complex scenarios**: 25+ thoughts (always expand as needed)
- **Critical decisions**: 30+ thoughts with comprehensive validation

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

### 5. **Enhanced Critical Thinking Process Structure**
```
MANDATORY CRITICAL THINKING PHASES (15+ thoughts minimum):

Phase 1: Problem Understanding & Assumption Validation (Thoughts 1-3)
Thought 1: Problem Definition & Scope Analysis
- What exactly is being asked with full contextual understanding?
- What are the explicit and implicit requirements?
- What assumptions am I making that need validation?

Thought 2: Constraint & Context Deep Analysis
- What hard constraints exist (technical, business, regulatory)?
- What contextual factors might influence the solution?
- What dependencies and stakeholder considerations apply?

Thought 3: Assumption Challenge & Validation
- What assumptions have I made that could be wrong?
- What evidence supports or contradicts these assumptions?
- What alternative interpretations of the problem exist?

Phase 2: Evidence Gathering & Source Validation (Thoughts 4-6)
Thought 4: Information Requirements & Data Gathering
- What specific information/data do I need to make informed decisions?
- What tools, resources, or domain knowledge should I leverage?
- What gaps exist in my current understanding?

Thought 5: Source Credibility & Evidence Evaluation
- How reliable are my information sources?
- What potential biases exist in the available evidence?
- What conflicting evidence or viewpoints exist?

Thought 6: Knowledge Synthesis & Gap Identification
- How does available evidence connect and what patterns emerge?
- What critical information is still missing?
- What research or analysis is needed to fill gaps?

Phase 3: Multi-Perspective Analysis & Bias Recognition (Thoughts 7-9)
Thought 7: Stakeholder Perspective Analysis
- How would different stakeholders view this problem/solution?
- What competing interests or priorities exist?
- What unintended consequences might affect different groups?

Thought 8: Alternative Approach Exploration
- What completely different approaches could solve this problem?
- What solutions from other domains or contexts might apply?
- What innovative or unconventional options exist?

Thought 9: Bias Detection & Mitigation
- What cognitive biases might be affecting my analysis?
- What personal or organizational biases could influence decisions?
- How can I account for and mitigate these biases?

Phase 4: Solution Synthesis & Logical Validation (Thoughts 10-12)
Thought 10: Solution Architecture & Design
- How do the pieces fit together into a coherent solution?
- What trade-offs and compromises are necessary?
- What core principles or criteria guide the solution design?

Thought 11: Logical Consistency & Reasoning Validation
- Does my reasoning follow logically from premises to conclusions?
- Are there any logical fallacies or inconsistencies in my thinking?
- How robust is the logical foundation of my recommendations?

Thought 12: Integration & Implementation Feasibility
- How does this solution integrate with existing systems/processes?
- What implementation challenges and risks exist?
- What resources and timeline are realistically required?

Phase 5: Critical Validation & Risk Assessment (Thoughts 13-15)
Thought 13: Solution Stress Testing & Edge Cases
- How does the solution perform under stress or extreme conditions?
- What edge cases or failure modes need consideration?
- What happens if key assumptions prove incorrect?

Thought 14: Risk Analysis & Mitigation Strategies
- What are the highest-impact risks to success?
- What mitigation strategies address the most critical risks?
- What contingency plans exist if primary approach fails?

Thought 15: Quality Validation & Success Criteria
- Does this solution meet all stated and implied requirements?
- What metrics will indicate success or failure?
- How will we validate that the solution actually works?

Phase 6: Iterative Refinement & Optimization (Thoughts 16+)
Thought 16+: Continuous Critical Review & Enhancement
- How can this solution be improved based on deeper analysis?
- What new insights or considerations have emerged?
- What additional validation or testing is needed?
- How can implementation be optimized for maximum value?
```

### 6. **Enhanced Dynamic Thought Adjustment**
- **Start with Minimum**: Begin with thoughtNumber 1, totalThoughts 15 (NEVER less than 15)
- **Expand Aggressively**: If complexity emerges, increase to 20, 25, 30+ thoughts
- **Set needsMoreThoughts=true** when reaching planned end but analysis incomplete
- **Use isRevision=true** when critical new insights require thought revision
- **Branch extensively** when multiple valid approaches need parallel exploration
- **Self-validate continuously** - question your own reasoning throughout

## Enhanced Critical Thinking Quality Standards

### 7. **Mandatory Quality Requirements for Each Thought**
- **Substantial Depth**: Each thought must be 3+ sentences with comprehensive analysis
- **Progressive Building**: Each thought builds meaningfully on previous insights and analysis
- **Focused Execution**: Address current phase thoroughly without premature jumping ahead
- **Explicit Reasoning**: Clearly state assumptions, evidence, and logical connections
- **Concept Integration**: Show relationships between ideas and cross-domain connections
- **Critical Challenge**: Question your own reasoning and identify potential flaws
- **Evidence Support**: Base conclusions on verifiable facts and sound reasoning

### 8. **Critical Thinking Validation Requirements**
- **Assumption Testing**: Explicitly identify and challenge all assumptions made
- **Evidence Evaluation**: Assess source credibility and potential bias in information
- **Logic Verification**: Check for logical fallacies and reasoning consistency
- **Alternative Consideration**: Explore competing viewpoints and alternative solutions
- **Bias Recognition**: Identify and account for cognitive and organizational biases
- **Risk Assessment**: Consider potential failure modes and unintended consequences
- **Stakeholder Impact**: Analyze effects on different stakeholder groups

### 9. **Self-Validation Protocol (MANDATORY)**
**Every 5 thoughts, agents must include explicit self-validation:**
- **Reasoning Check**: "Is my logic sound and consistent?"
- **Assumption Review**: "What assumptions need validation?"
- **Bias Assessment**: "What biases might be affecting my analysis?"
- **Evidence Evaluation**: "How strong is my supporting evidence?"
- **Alternative Test**: "What alternative approaches should I consider?"
- **Quality Validation**: "Am I meeting the depth and rigor requirements?"

### 10. **Enhanced Thinking Patterns (Mandatory Application)**
- **Question-driven**: Each thought must answer specific critical questions
- **Evidence-based**: Support ALL reasoning with verifiable facts and analysis
- **Multi-perspective**: Actively seek and consider diverse viewpoints and approaches
- **Risk-aware**: Identify potential issues, failure modes, and mitigation strategies
- **Solution-oriented**: Work systematically toward actionable, validated outcomes
- **Critically-examined**: Challenge your own reasoning and identify weaknesses
- **Assumption-conscious**: Explicitly identify, state, and validate all assumptions
- **Bias-aware**: Recognize and account for cognitive and organizational biases

### 11. **Enhanced Thinking Flows (15+ Thoughts Minimum)**

#### Problem-Solving Flow (15-25 thoughts)
```
1-3. Problem Understanding & Assumption Validation
4-6. Evidence Gathering & Source Validation
7-9. Multi-Perspective Analysis & Bias Recognition
10-12. Solution Synthesis & Logical Validation
13-15. Critical Validation & Risk Assessment
16-20. Implementation Planning & Optimization (standard complexity)
21-25. Advanced Validation & Contingency Planning (high complexity)
```

#### Analysis Flow (15-20 thoughts)
```
1-3. Subject Understanding & Assumption Challenge
4-6. Evidence Collection & Source Credibility Assessment
7-9. Multi-Perspective Factor Analysis & Bias Check
10-12. Pattern Recognition & Relationship Mapping
13-15. Critical Validation & Implication Analysis
16-20. Synthesis Validation & Recommendation Refinement
```

#### Design Flow (20-30 thoughts)
```
1-3. Requirements Analysis & Assumption Validation
4-6. Constraint Identification & Context Analysis
7-9. Architecture Options & Alternative Exploration
10-12. Trade-off Evaluation & Decision Rationale
13-15. Risk Assessment & Mitigation Strategy Design
16-18. Quality Assurance & Performance Validation
19-21. Security & Compliance Implications
22-24. Integration & Implementation Planning
25-30. Optimization & Advanced Validation (complex designs)
```

#### Review Flow (15-22 thoughts)
```
1-3. Review Scope & Criteria Definition with Bias Check
4-6. Current State Analysis & Evidence Validation
7-9. Multi-Perspective Strength & Weakness Identification
10-12. Issue Categorization & Impact Assessment
13-15. Critical Validation & Alternative Assessment
16-18. Improvement Recommendation & Priority Ranking
19-22. Implementation Guidance & Risk Mitigation
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

### 17. **Enhanced Quality Assurance Protocol (MANDATORY)**
Before concluding any sequential thinking session, verify:
- [ ] Used MINIMUM 15 thoughts for all complex tasks (NEVER less)
- [ ] Applied all 6 critical thinking phases systematically
- [ ] Each thought meets substantial depth requirements (3+ sentences)
- [ ] Included self-validation checks every 5 thoughts
- [ ] Explicitly identified and challenged key assumptions
- [ ] Evaluated evidence sources and potential biases
- [ ] Considered multiple perspectives and alternative approaches
- [ ] Conducted logical consistency and reasoning validation
- [ ] Assessed risks, edge cases, and failure modes
- [ ] Validated solution quality and implementation feasibility
- [ ] Reasoning chain is coherent and well-supported
- [ ] Conclusions follow logically from rigorous analysis
- [ ] All requirements and constraints thoroughly addressed
- [ ] Alternative approaches systematically evaluated

### 18. **Critical Anti-Patterns to Avoid (NEVER DO THESE)**
❌ **NEVER** use fewer than 15 thoughts for any complex task
❌ **NEVER** make thoughts superficial or single-sentence
❌ **NEVER** jump to conclusions without systematic validation
❌ **NEVER** ignore assumption identification and challenge
❌ **NEVER** skip evidence evaluation and source credibility assessment
❌ **NEVER** fail to recognize and mitigate cognitive biases
❌ **NEVER** avoid self-validation and critical self-examination
❌ **NEVER** ignore alternative perspectives and competing solutions
❌ **NEVER** skip risk assessment and failure mode analysis
❌ **NEVER** accept first solution without systematic comparison

✅ **ALWAYS** use 15+ thoughts minimum with expansion as needed
✅ **ALWAYS** apply critical thinking frameworks systematically
✅ **ALWAYS** challenge assumptions and validate evidence
✅ **ALWAYS** consider multiple perspectives and alternatives
✅ **ALWAYS** include self-validation and bias recognition
✅ **ALWAYS** conduct comprehensive risk and quality assessment
✅ **ALWAYS** ensure logical consistency and reasoning validity
✅ **ALWAYS** optimize solutions through iterative refinement

## Examples

## Enhanced Thinking Examples

### 19. **Standard Analysis Example (15 thoughts minimum)**
```
Phase 1: Problem Understanding & Assumption Validation
Thought 1: Comprehensive problem definition with contextual analysis
Thought 2: Constraint identification and stakeholder impact assessment
Thought 3: Assumption challenge and alternative interpretation exploration

Phase 2: Evidence Gathering & Source Validation
Thought 4: Information requirement analysis and data gathering strategy
Thought 5: Source credibility assessment and bias evaluation
Thought 6: Evidence synthesis and knowledge gap identification

Phase 3: Multi-Perspective Analysis & Bias Recognition
Thought 7: Stakeholder perspective analysis and competing interests
Thought 8: Alternative approach exploration and innovative solutions
Thought 9: Cognitive bias detection and mitigation strategies

Phase 4: Solution Synthesis & Logical Validation
Thought 10: Solution architecture and trade-off analysis
Thought 11: Logical consistency verification and reasoning validation
Thought 12: Integration feasibility and implementation assessment

Phase 5: Critical Validation & Risk Assessment
Thought 13: Stress testing and edge case analysis
Thought 14: Risk analysis and mitigation strategy development
Thought 15: Quality validation and success criteria definition
```

### 20. **Complex Problem-Solving Example (20 thoughts)**
```
Phase 1: Problem Understanding & Assumption Validation (Thoughts 1-3)
Thought 1: Deep problem definition with business context and technical scope
Thought 2: Multi-dimensional constraint analysis including regulatory and resource limits
Thought 3: Assumption matrix development and systematic challenge protocol

Phase 2: Evidence Gathering & Source Validation (Thoughts 4-6)
Thought 4: Comprehensive data requirements and research methodology design
Thought 5: Source reliability framework and bias impact assessment
Thought 6: Evidence correlation analysis and validity confirmation

Phase 3: Multi-Perspective Analysis & Bias Recognition (Thoughts 7-9)
Thought 7: Cross-functional stakeholder analysis and conflict identification
Thought 8: Innovation framework application and paradigm challenging
Thought 9: Systematic bias audit and correction mechanism implementation

Phase 4: Solution Synthesis & Logical Validation (Thoughts 10-12)
Thought 10: Multi-criteria solution architecture with optimization analysis
Thought 11: Formal logic verification and fallacy detection protocol
Thought 12: Systems integration analysis and compatibility validation

Phase 5: Critical Validation & Risk Assessment (Thoughts 13-15)
Thought 13: Comprehensive stress testing and failure mode analysis
Thought 14: Enterprise risk assessment with quantified impact modeling
Thought 15: Quality gate definition and measurement framework design

Phase 6: Implementation Optimization (Thoughts 16-20)
Thought 16: Resource optimization and timeline feasibility analysis
Thought 17: Change management strategy and adoption framework
Thought 18: Performance monitoring and success metric calibration
Thought 19: Contingency planning and rollback strategy development
Thought 20: Final validation synthesis and go/no-go decision framework
```

### 21. **Ultra-Complex Design Example (25 thoughts)**
```
Phase 1: Requirements & Assumptions (Thoughts 1-3)
Phase 2: Evidence & Research (Thoughts 4-6)
Phase 3: Perspectives & Bias Check (Thoughts 7-9)
Phase 4: Solution Synthesis (Thoughts 10-12)
Phase 5: Critical Validation (Thoughts 13-15)
Phase 6: Architecture Optimization (Thoughts 16-18)
Phase 7: Security & Compliance (Thoughts 19-21)
Phase 8: Integration & Scaling (Thoughts 22-25)
[Each phase follows the critical thinking framework with comprehensive analysis]
```
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
