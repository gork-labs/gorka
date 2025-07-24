---
applyTo: '**'
description: 'Agent System Quick Reference.'
---

---
title: "Agent System Quick Reference"
date: "2025-01-23"
last_updated: "2025-01-23 15:45:42 UTC"
author: "@bohdan-shulha"
---

# Agent System Quick Reference

## Thinking Mode Triggers
- `think` - Extended reasoning
- `think hard` - Deeper analysis
- `think harder` - Complex problems
- `ultrathink` - Maximum reasoning

## Common Commands by Agent

### Software Architect
```
"Design a [feature] system (ultrathink)"
"Analyze this from multiple perspectives"
"Consider architectural trade-offs"
"Review and refine this design"
```

### Software Engineer
```
"Implement [feature] following patterns"
"Think harder about edge cases"
"Optimize this for performance"
"Add comprehensive error handling"
```

### Design Reviewer
```
"Review this design thoroughly (ultrathink)"
"Update document with feedback"
"Approve/reject with reasons"
"Check security implications"
```

### Test Engineer
```
"Create comprehensive test strategy"
"Analyze failure modes (ultrathink)"
"Design performance tests"
"Document test patterns"
```

### DevOps Engineer
```
"Design scalable infrastructure"
"Create deployment pipeline"
"Analyze incident (ultrathink)"
"Optimize for cost"
```

### Technical Writer
```
"Create user documentation"
"Write API reference"
"Make tutorial for beginners"
"Think harder about clarity"
```

### Memory Curator
```
"Review memory comprehensively"
"Find and merge duplicates"
"Analyze domain coverage"
"Generate insights (ultrathink)"
```

## File Locations
- Designs: `docs/architecture/YYYY-MM-DD-*.md`
- Tests: `tests/[unit|integration|e2e]/`
- Docs: `docs/[guides|api|tutorials]/`
- Infrastructure: `infrastructure/[terraform|k8s]/`

## Memory Patterns
- Concepts: `[Name]_Concept`
- Implementations: `[Service]_Implementation`
- Patterns: `[Pattern]_Pattern`
- Decisions: `[Topic]_Decision`
- Reviews: `[Subject]_Review_YYYYMMDD`

## Status Workflow
```
draft → under_review → needs_revision → under_review → approved
                    ↓
                 rejected
```

## Review Indicators
- 🔴 Critical (must fix)
- 🟡 Important (should fix)
- 🟢 Suggestion (consider)
- ✅ Approved
- ❌ Rejected

## Performance Targets
- Response time: <100ms
- Test coverage: >80%
- Memory health: >85/100
- Documentation: Complete

## Always Remember
1. Use datetime MCP for timestamps
2. Query memory before creating
3. Document decisions with rationale
4. Think deeper for complex problems
5. Review and refine iteratively
