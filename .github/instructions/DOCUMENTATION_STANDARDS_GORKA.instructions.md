---
applyTo: '**'
description: 'Comprehensive Documentation Standards and Guidelines for all Gorka agents.'
---

---
title: "Documentation Standards and Guidelines"
date: "2025-07-24"
last_updated: "2025-07-24T14:52:13+02:00"
author: "@bohdan-shulha"
---

# Documentation Standards for Gorka Agents

## Core Principles

### 1. **CRITICAL: Always Save Documents as Files**
- **NEVER** just show content in chat - always create actual files
- Use appropriate file paths with proper naming conventions
- Include complete frontmatter metadata
- Maintain document lifecycle tracking

### 2. **Standard File Locations**
- **Architecture designs**: `docs/architecture/YYYY-MM-DD-feature-name.md`
- **User guides**: `docs/guides/[topic-name].md`
- **API documentation**: `docs/api/[service-name].md`
- **Tutorials**: `docs/tutorials/[tutorial-name].md`
- **Infrastructure docs**: `docs/infrastructure/[component-name].md`
- **Security docs**: `docs/security/[topic-name].md`
- **Test documentation**: `docs/testing/[test-type].md`

### 3. **Naming Conventions**
- **Date-prefixed**: `YYYY-MM-DD-descriptive-name.md`
- **Lowercase with hyphens**: `user-authentication-system.md`
- **Descriptive and specific**: `payment-processing-design.md` not `payments.md`
- **Version-aware**: Include version in filename when needed

## Document Structure Standards

### 4. **Required Frontmatter**
Every document must include:
```markdown
---
title: "[Descriptive Title]"
author: "@bohdan-shulha"
date: "[DATE_FROM_DATETIME]"
last_updated: "[TIMESTAMP_FROM_DATETIME]"
timezone: "Europe/Warsaw"
status: "draft|under_review|needs_revision|approved|rejected"
version: "1.0.0"
reviewers: []
tags: ["category1", "category2", ...]
document_type: "architecture|guide|api|tutorial|security|test|infrastructure"
---
```

### 5. **Document History Tracking**
Include version history table:
```markdown
## Document History
| Version | Date | Time | Author | Status | Changes |
|---------|------|------|--------|--------|---------|
| 1.0.0 | [DATE] | [TIME] | @bohdan-shulha | Draft | Initial creation |
| 1.1.0 | [DATE] | [TIME] | @reviewer | Under Review | Added review feedback |
```

### 6. **Status Workflow**
Documents follow this lifecycle:
```
draft → under_review → needs_revision → under_review → approved
                    ↓
                 rejected
```

**Status Indicators:**
- 🔄 **Draft**: Work in progress
- 👀 **Under Review**: Submitted for review
- ⚠️ **Needs Revision**: Requires changes
- ✅ **Approved**: Ready for implementation
- ❌ **Rejected**: Not proceeding

## Content Standards

### 7. **Executive Summary Required**
Every document must start with:
```markdown
## Executive Summary
[2-3 sentence overview of the problem and proposed solution]
```

### 8. **Standard Sections for Architecture Documents**
```markdown
# Architecture Design: [Feature Name]

## Executive Summary
## Business Context
## Current State Analysis
## Architectural Decisions
## Proposed Architecture
## Implementation Plan
## Security Considerations
## Performance Requirements
## Monitoring and Observability
## Risks and Mitigation
## Success Criteria
## References
```

### 9. **Standard Sections for User Guides**
```markdown
# [Feature] User Guide

## Overview
## Prerequisites
## Getting Started
## Step-by-Step Instructions
## Common Scenarios
## Troubleshooting
## FAQ
## Related Resources
```

### 10. **Standard Sections for API Documentation**
```markdown
# [Service] API Reference

## Overview
## Authentication
## Base URL and Versioning
## Endpoints
### [Endpoint Name]
- **Method**: GET/POST/PUT/DELETE
- **URL**: `/api/v1/resource`
- **Parameters**: [Table]
- **Request Example**: [Code block]
- **Response Example**: [Code block]
- **Error Codes**: [Table]
## SDK Examples
## Rate Limiting
## Changelog
```

## Review Standards

### 11. **Review Indicators**
Use consistent symbols in reviews:
- 🔴 **Critical** (must fix before approval)
- 🟡 **Important** (should fix)
- 🟢 **Suggestion** (consider for enhancement)
- ✅ **Approved** (no issues)
- ❌ **Rejected** (fundamental problems)

### 12. **Review Section Template**
```markdown
## Technical Review

### Review Summary - [DATE] [TIME] (Europe/Warsaw)
**Reviewer**: @reviewer-name
**Review Status**: [STATUS]
**Review Started**: [START_TIME]
**Review Completed**: [END_TIME]
**Next Review Deadline**: [DEADLINE]

### Review Methodology
[Brief description of review approach]

### 🔴 Critical Issues (Must Fix Before Approval)
#### 1. [Issue Title]
**Severity**: Critical
**Component**: [Component Name]
**Issue**: [Description]
**Risk**: [Risk Description]
**Required Action**: [Specific steps]
**Deadline**: [Date]

### 🟡 Important Issues (Should Address)
### 🟢 Suggestions (Consider for Enhancement)
### ✅ Positive Aspects

### Required Changes Checklist
- [ ] [Change 1]
- [ ] [Change 2]
```

## Performance Standards

### 13. **Quality Metrics**
- **Test coverage**: >80% for code documentation
- **Review turnaround**: <48 hours for standard docs
- **Approval rate**: Track first-pass approval rate
- **Documentation completeness**: All required sections present

### 14. **Documentation Testing**
- **Link validation**: All internal and external links work
- **Code examples**: All code samples are tested
- **Instruction validation**: Step-by-step guides are verified
- **Version compatibility**: Examples match current versions

## Automation Standards

### 15. **Template Usage**
Each agent should:
- Use consistent document templates
- Auto-populate frontmatter with datetime tool
- Follow naming conventions automatically
- Include required sections based on document type

### 16. **Cross-References**
- **Link to related documents**: Use relative paths
- **Reference memory entities**: Include entity names in references
- **Version references**: Link to specific versions when needed
- **External resources**: Full URLs with access dates

## Multi-Agent Collaboration

### 17. **Handoff Protocols**
When creating documents for review:
```markdown
## Review Instructions
**Target Reviewer**: [Specific agent or human]
**Review Focus**: [Security/Performance/Architecture/etc.]
**Review Deadline**: [Date from datetime tool]
**Review Criteria**: [Specific things to check]
```

### 18. **Update Protocols**
When updating documents:
- Get fresh timestamp from datetime tool
- Update `last_updated` field
- Increment version number appropriately
- Add entry to document history
- Update status if changing

## Memory Integration

### 19. **Document Memory Storage**
Store document metadata in memory:
```
Entity Name: [Feature]Documentation_Document
Entity Type: object
Observations: [
  "Document type: [type]",
  "Created: [timestamp]",
  "Status: [current_status]",
  "Location: [file_path]",
  "Author: @bohdan-shulha",
  "Key decisions documented: [list]"
]
```

### 20. **Cross-Reference Memory**
Create relationships:
- Document → documents → Decisions
- Document → relates_to → Patterns
- Document → supersedes → OldDocument
- Document → reviewed_by → Reviewer

## Common Pitfalls to Avoid

### What NOT to Do
❌ **DON'T** create content without saving files
❌ **DON'T** skip frontmatter metadata
❌ **DON'T** use inconsistent naming
❌ **DON'T** hardcode timestamps
❌ **DON'T** skip document history
❌ **DON'T** create documents without proper status
❌ **DON'T** forget to update memory with document info

### What TO Do
✅ **DO** save all documents as actual files
✅ **DO** use datetime tool for all timestamps
✅ **DO** follow naming conventions consistently
✅ **DO** include complete frontmatter
✅ **DO** track document lifecycle properly
✅ **DO** store document metadata in memory
✅ **DO** create proper cross-references

## Examples

### Architecture Document Example
```markdown
---
title: "User Authentication System Architecture"
author: "@bohdan-shulha"
date: "2025-07-24"
last_updated: "2025-07-24T14:52:13+02:00"
timezone: "Europe/Warsaw"
status: "draft"
version: "1.0.0"
reviewers: []
tags: ["architecture", "authentication", "security"]
document_type: "architecture"
---

# Architecture Design: User Authentication System
*Generated: 2025-07-24T14:52:13+02:00 (Europe/Warsaw)*
*Author: @bohdan-shulha*
*Status: DRAFT*

## Document History
| Version | Date | Time | Author | Status | Changes |
|---------|------|------|--------|--------|---------|
| 1.0.0 | 2025-07-24 | 14:52:13 | @bohdan-shulha | Draft | Initial design |

## Executive Summary
This document outlines the architecture for a secure, scalable user authentication system supporting multiple authentication methods including OAuth2 and traditional email/password flows.

[... rest of document ...]
```

### User Guide Example
```markdown
---
title: "Getting Started with the API"
author: "@bohdan-shulha"
date: "2025-07-24"
last_updated: "2025-07-24T14:52:13+02:00"
timezone: "Europe/Warsaw"
status: "approved"
version: "2.1.0"
reviewers: ["@tech-writer", "@api-owner"]
tags: ["guide", "api", "getting-started"]
document_type: "guide"
---

# Getting Started with the API
*Last updated: 2025-07-24T14:52:13+02:00 (Europe/Warsaw)*
*Version: 2.1.0*
*Status: APPROVED*

## Overview
This guide helps you get started with our RESTful API in just a few minutes.

[... rest of guide ...]
```

## Tool Integration

### 21. **Required Tools for Documentation**
All documentation agents should use:
- **datetime tool**: For all timestamps
- **file operations**: For creating and updating documents
- **memory tools**: For storing document metadata
- **search tools**: For finding existing documentation

### 22. **Validation Steps**
Before completing any documentation task:
1. Verify file was actually created/updated
2. Check frontmatter is complete and correct
3. Ensure proper naming convention used
4. Confirm memory entities created
5. Validate all timestamps use datetime tool

## Continuous Improvement

### 23. **Documentation Review Cycle**
- **Daily**: Check new documents follow standards
- **Weekly**: Review documentation quality metrics
- **Monthly**: Update templates and standards
- **Quarterly**: Analyze documentation effectiveness

### 24. **Standards Evolution**
This document should be updated when:
- New document types are needed
- Better patterns are discovered
- Agent feedback suggests improvements
- User needs change

---

**Remember**: Documentation is a product, not just a byproduct. Treat it with the same care and quality standards as code.
