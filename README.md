---
title: "Production Coding Agent System Documentation"
date: "2025-01-23"
last_updated: "2025-01-23 15:45:42 UTC"
author: "@bohdan-shulha"
---

# Production Coding Agent System

## Quick Installation

**One-liner installation:**
```bash
curl -fsSL https://raw.githubusercontent.com/bohdan-gork/agents/main/setup.sh | bash
```

Then run:
```bash
gorka install
```

## Overview

This is a comprehensive agent system designed for software development teams, incorporating advanced Sonnet-4 capabilities including extended thinking modes (ultrathink), multi-perspective analysis, and iterative refinement patterns.

## System Architecture

```mermaid
graph TB
    subgraph "Core Development Agents"
        A[Software Architect]
        B[Software Engineer]
        C[Test Engineer]
        D[Design Reviewer]
    end

    subgraph "Operations & Support"
        E[DevOps Engineer]
        F[Technical Writer]
    end

    subgraph "System Maintenance"
        G[Memory Curator]
    end

    subgraph "Shared Resources"
        H[Memory Graph]
        I[Codebase]
        J[Documentation]
    end

    A --> H
    B --> H
    C --> H
    D --> H
    E --> H
    F --> H
    G --> H

    A --> J
    B --> I
    C --> I
    D --> J
    E --> I
    F --> J
```

## Available Agents

### 1. Software Architect (`Software Architect - Gorka.chatmode.md`)
- **Purpose**: Design comprehensive system architectures
- **Key Features**:
  - Multi-perspective analysis (ultrathink)
  - Iterative design refinement
  - Architectural decision documentation
  - Pattern recognition and reuse
- **Outputs**: Design documents in `docs/architecture/`

### 2. Software Engineer (`Software Engineer - Gorka.chatmode.md`)
- **Purpose**: Implement high-quality, maintainable code
- **Key Features**:
  - Pattern-based implementation
  - Comprehensive error handling
  - Performance optimization
  - Test-driven development
- **Outputs**: Production code with >80% test coverage

### 3. Design Reviewer (`Design Reviewer - Gorka.chatmode.md`)
- **Purpose**: Conduct thorough technical reviews
- **Key Features**:
  - Document modification authority
  - Multi-perspective review (security, performance, etc.)
  - Approval/rejection workflow
  - Human collaboration support
- **Outputs**: Updated documents with review sections

### 4. Test Engineer (`Test Engineer - Gorka.chatmode.md`)
- **Purpose**: Ensure quality through comprehensive testing
- **Key Features**:
  - Multi-level test strategies
  - Failure analysis and prevention
  - Performance baseline tracking
  - Test pattern documentation
- **Outputs**: Test suites, strategies, and quality reports

### 5. DevOps Engineer (`DevOps Engineer - Gorka.chatmode.md`)
- **Purpose**: Manage infrastructure and operations
- **Key Features**:
  - Infrastructure as Code
  - CI/CD pipeline design
  - Incident response
  - Monitoring and alerting
- **Outputs**: Infrastructure code, runbooks, monitoring

### 6. Technical Writer (`Technical Writer - Gorka.chatmode.md`)
- **Purpose**: Create clear, comprehensive documentation
- **Key Features**:
  - Multi-audience adaptation
  - API documentation
  - Tutorial creation
  - Documentation testing
- **Outputs**: User guides, API docs, tutorials

### 7. Memory Curator (`Memory Curator - Gorka.chatmode.md`)
- **Purpose**: Maintain knowledge graph quality
- **Key Features**:
  - Systematic entity review
  - Duplicate detection and merging
  - Relationship optimization
  - Domain insights
- **Outputs**: Review reports, cleaned knowledge graph

## Shared Guidelines

### Time Management (`TIME_MANAGEMENT_GORKA.instructions.md`)
- Always use datetime MCP tool
- Never hardcode timestamps
- Track durations with start/end times
- Use Europe/Warsaw timezone

### Memory Usage (`MEMORY_USAGE_GUIDELINES_GORKA.instructions.md`)
- Consistent naming conventions
- Proper entity types
- Query before create pattern
- Rich relationships

## Advanced Features

### 1. Extended Thinking Modes
- **think**: Basic extended reasoning
- **think hard**: Deeper analysis
- **think harder**: Complex problem solving
- **ultrathink**: Maximum reasoning allocation

### 2. Multi-Perspective Analysis
Agents can analyze from multiple viewpoints:
- Security perspective
- Performance perspective
- Maintainability perspective
- Business perspective
- User perspective

### 3. Iterative Refinement ("Revving")
1. Initial solution
2. Self-critique
3. Enhancement
4. Final optimization

### 4. Role-Based Prompting
Agents adopt specific expertise:
- "You are a security-focused reviewer"
- "You are a performance engineer"
- "You are a user experience expert"

## Usage Patterns

### Starting a New Feature
```
1. Architect: Create design document (ultrathink)
2. Reviewer: Review and approve design
3. Engineer: Implement with patterns
4. Test Engineer: Create comprehensive tests
5. DevOps: Prepare infrastructure
6. Writer: Document for users
7. Memory Curator: Capture learnings
```

### Handling Complex Problems
```
1. Activate ultrathink mode
2. Use multi-perspective analysis
3. Iterate with self-critique
4. Document decisions in memory
5. Create reusable patterns
```

### Knowledge Building
```
1. Query memory for existing patterns
2. Implement and discover new insights
3. Document patterns and decisions
4. Create relationships
5. Regular memory review and cleanup
```

## Configuration Requirements

### MCP Servers Required
1. **datetime**: Timestamp management
2. **memory**: Knowledge graph
3. **codebase**: Code analysis
4. **search**: Information retrieval
5. **editFiles**: File manipulation
6. **runTests**: Test execution
7. **git tools**: Version control
8. Standard tools per agent

### Environment Setup
```bash
# Set timezone
export TZ="Europe/Warsaw"

# Configure user
export CURRENT_USER="bohdan-shulha"

# Memory server settings
export MEMORY_ENDPOINT="http://localhost:8080"

# Enable extended thinking
export ENABLE_ULTRATHINK=true
```

## Best Practices

### 1. Always Start with Research
- Query memory for patterns
- Analyze existing code
- Review past decisions

### 2. Use Extended Thinking Strategically
- Complex architectures: ultrathink
- Bug analysis: think harder
- Simple tasks: standard mode

### 3. Document Everything
- Decisions with rationale
- Patterns discovered
- Failures and solutions
- Performance baselines

### 4. Collaborate Effectively
- Leave sections for human review
- Use clear status indicators
- Set explicit deadlines
- Track all changes

### 5. Maintain Knowledge Quality
- Regular memory reviews
- Merge duplicates promptly
- Archive obsolete information
- Build domain understanding

## Performance Optimization

### Agent Response Times
- Simple queries: <5 seconds
- Standard analysis: <30 seconds
- Ultrathink mode: <2 minutes
- Complex reviews: <5 minutes

### Memory Queries
- Use specific search terms
- Batch related queries
- Cache frequent lookups
- Limit result sets

## Troubleshooting

### Common Issues

1. **Timestamp Errors**
   - Always use datetime MCP
   - Check timezone setting
   - Never hardcode dates

2. **Memory Duplicates**
   - Run memory review weekly
   - Use consistent naming
   - Query before create

3. **Slow Responses**
   - Check if ultrathink needed
   - Optimize memory queries
   - Break complex tasks

## Metrics and Monitoring

### Key Metrics
- Design approval rate
- Code quality scores
- Test coverage percentages
- Memory health score
- Documentation completeness

### Review Schedule
- Daily: Code reviews
- Weekly: Memory review
- Monthly: System metrics
- Quarterly: Pattern analysis

## Installation

### Quick Installation (Recommended)

Install gorka CLI tool and the agent system with a single command:
```bash
curl -fsSL https://raw.githubusercontent.com/bohdan-gork/agents/main/setup.sh | bash
```

Then install the configurations:
```bash
# Install globally for all projects
gorka install global

# Or install for current workspace only
gorka install workspace

# Or install both (global + workspace if .vscode exists)
gorka install
```

### Manual Installation

If you prefer manual installation:

1. **Download the gorka CLI**:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/bohdan-gork/agents/main/bin/gorka -o ~/.local/bin/gorka
   chmod +x ~/.local/bin/gorka
   ```

2. **Clone the repository**:
   ```bash
   git clone https://github.com/bohdan-gork/agents.git
   cd agents
   ```

3. **Install configurations**:
   ```bash
   ./bin/gorka install
   ```

### What Gets Installed

- **Global installation** (`gorka install global`):
  - MCP server configurations to VS Code user settings
  - Prompt templates to VS Code user folder
  - Available across all your projects

- **Workspace installation** (`gorka install workspace`):
  - Workspace-specific MCP configurations
  - Memory server for project context
  - Created in `.vscode/mcp.json`

## Getting Started

1. **Test the Installation**
   - Open VS Code in any project
   - Check that MCP servers are connected
   - Try using an agent prompt

2. **Configure Your Environment**
   ```bash
   export TZ="Europe/Warsaw"
   export CURRENT_USER="your-username"
   ```

3. **Test Basic Workflow**
   - Ask software architect to design a simple feature
   - Have software engineer implement it
   - Run tests with test engineer
   - Review with design reviewer

4. **Build Knowledge**
   - Start documenting patterns
   - Create relationships
   - Run regular memory reviews

## Future Enhancements

1. **Automated Workflows**
   - Chain agents automatically
   - Trigger on events
   - Parallel processing

2. **Enhanced Analytics**
   - Pattern effectiveness
   - Team productivity
   - Quality trends

3. **AI Improvements**
   - Smarter deduplication
   - Predictive patterns
   - Automated optimization

---

*System designed by @bohdan-shulha*
*Incorporating Sonnet-4 advanced capabilities*
*Last updated: 2025-01-23 15:45:42 UTC*
