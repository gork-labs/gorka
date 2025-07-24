---
applyTo: '**'
description: 'Tools First - Guidelines for preferring specialized tools over CLI commands across all Gorka agents.'
---

---
title: "Tools First - Preference Guidelines"
date: "2025-07-24"
last_updated: "2025-07-24T19:21:26+02:00"
author: "@bohdan-shulha"
timezone: "Europe/Warsaw"
status: "approved"
version: "1.0.0"
document_type: "instructions"
---

# Tools First - Preference Guidelines for Gorka Agents

## Core Principle

### 1. **CRITICAL: Always Prefer Tools Over CLI Commands**
- **Primary Rule**: When both a specialized tool and CLI command can accomplish the same task, ALWAYS choose the tool
- **Tools are Superior**: They provide better error handling, structured output, and integration
- **CLI as Fallback**: Use CLI commands ONLY when no suitable tool exists
- **Consistency**: All agents must follow this principle uniformly

### 2. **Tool-First Decision Matrix**

| Task Type | Preferred Approach | Fallback |
|-----------|-------------------|----------|
| **Git Operations** | `git_diff`, `git_status`, `git_log` tools | `runCommands` for unsupported git operations |
| **File Operations** | `editFiles`, `codebase`, `search` tools | `runCommands` for complex file system operations |
| **Code Analysis** | `problems`, `usages`, `findTestFiles` tools | `runCommands` for specialized analysis scripts |
| **Project Management** | `runTasks`, `runTests` tools | `runCommands` for custom build scripts |
| **Time Operations** | `get_current_time` tool | Never use CLI date commands |
| **Memory Operations** | Memory MCP tools | Never use CLI for data persistence |
| **Documentation** | `fetch`, specialized research tools | `runCommands` for file system navigation only |

## Tool Categories and Preferences

### 3. **Version Control Operations**
```
✅ PREFERRED - Use Git Tools:
- git_diff: For viewing changes
- git_status: For repository status
- git_log: For commit history
- git_show: For specific commits
- git_diff_staged: For staged changes
- git_diff_unstaged: For working directory changes

❌ AVOID - CLI Commands:
- runCommands with "git diff"
- runCommands with "git status"
- runCommands with "git log"

🟡 ACCEPTABLE - CLI for Advanced Operations:
- Complex git operations not covered by tools
- Interactive git operations (rebase, merge)
- Git configuration changes
```

### 4. **File and Code Operations**
```
✅ PREFERRED - Use Specialized Tools:
- editFiles: For file creation and modification
- codebase: For reading file contents
- search: For finding files and content
- problems: For identifying errors
- usages: For finding code references
- findTestFiles: For test-related file operations

❌ AVOID - CLI File Operations:
- runCommands with "cat", "less", "grep"
- runCommands with "find", "locate"
- runCommands with text editors (vim, nano)
- runCommands with file system navigation

🟡 ACCEPTABLE - CLI for System Operations:
- Complex file permissions (chmod, chown)
- System-level file operations
- Bulk file operations not supported by tools
- Archive operations (tar, zip)
```

### 5. **Build and Test Operations**
```
✅ PREFERRED - Use Project Tools:
- runTasks: For executing VS Code tasks
- runTests: For running test suites
- runNotebooks: For Jupyter operations
- problems: For build error detection

❌ AVOID - Direct CLI Build Commands:
- runCommands with "npm run", "yarn"
- runCommands with "mvn", "gradle"
- runCommands with "pytest", "jest"
- runCommands with "make"

🟡 ACCEPTABLE - CLI for Custom Scripts:
- Custom build scripts not supported by tools
- Legacy build systems
- Complex deployment scripts
- Environment setup scripts
```

### 6. **Data and Time Operations**
```
✅ MANDATORY - Use Specialized Tools:
- get_current_time: For ALL timestamp needs
- Memory MCP tools: For ALL data persistence
- context7: For library documentation
- deepwiki: For GitHub repository research

❌ NEVER USE - CLI for Data Operations:
- runCommands with "date"
- runCommands for data storage/retrieval
- Manual file-based data management
- CLI-based timestamp generation
```

## Decision-Making Guidelines

### 7. **Tool Selection Process**
```
Step 1: Identify the Task
- What exactly needs to be accomplished?
- What data or changes are required?

Step 2: Check Available Tools
- Review tool list for the agent
- Identify tools that match the task

Step 3: Apply Preference Order
1. Specialized tools (git_*, memory_*, etc.)
2. General-purpose tools (editFiles, search)
3. VS Code integration tools (runTasks, problems)
4. CLI commands (runCommands) - LAST RESORT

Step 4: Validate Choice
- Can the tool accomplish the full task?
- Is the output format suitable?
- Are there any limitations?
```

### 8. **Common Scenarios and Solutions**

#### **Scenario: Checking Git Status**
```
✅ CORRECT:
Use tool: git_status
Arguments: {"repo_path": "/path/to/repo"}

❌ INCORRECT:
Use tool: runCommands
Arguments: {"command": "git status"}
```

#### **Scenario: Reading File Contents**
```
✅ CORRECT:
Use tool: codebase
Arguments: {"filePath": "/path/to/file", "startLine": 1, "endLine": 100}

❌ INCORRECT:
Use tool: runCommands
Arguments: {"command": "cat /path/to/file"}
```

#### **Scenario: Getting Current Time**
```
✅ CORRECT:
Use tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}

❌ INCORRECT:
Use tool: runCommands
Arguments: {"command": "date"}
```

#### **Scenario: Finding Code References**
```
✅ CORRECT:
Use tool: usages
Arguments: {"symbolName": "functionName"}

❌ INCORRECT:
Use tool: runCommands
Arguments: {"command": "grep -r 'functionName' ."}
```

#### **Scenario: Running Tests**
```
✅ CORRECT:
Use tool: runTests
Arguments: {"testFiles": ["test/unit/test-file.js"]}

❌ INCORRECT:
Use tool: runCommands
Arguments: {"command": "npm test"}
```

### 9. **Integration Patterns**

#### **Tool Chaining**
```
// Good practice: Chain related tools
1. Use tool: git_status (to check repository state)
2. Use tool: git_diff_unstaged (to see changes)
3. Use tool: editFiles (to make corrections)
4. Use tool: runTests (to validate changes)

// Avoid: Mixing tools and CLI unnecessarily
```

#### **Error Handling with Tools**
```
// When a tool fails, try:
1. Check tool parameters and retry
2. Use alternative tool if available
3. Only then consider CLI fallback

// Example:
Use tool: git_diff
If fails -> Use tool: git_status (to check repo state)
If still needed -> Use tool: runCommands with "git diff" (last resort)
```

## Edge Cases and Exceptions

### 10. **When CLI is Acceptable**
```
🟡 ACCEPTABLE CLI Usage:
- Installing system dependencies (apt, brew, etc.)
- Environment setup and configuration
- Complex operations not covered by available tools
- Interactive operations requiring user input
- System administration tasks
- Custom scripts specific to the project
- Operations requiring multiple CLI tools in sequence
```

### 11. **Tool Limitations to Consider**
```
Understand tool constraints:
- File size limits for reading tools
- Line range restrictions
- Output format limitations
- Error handling differences
- Performance considerations

When tools have limitations:
1. Try chunking or batching approach with tools
2. Use multiple tool calls for complex operations
3. Only use CLI if tools genuinely cannot handle the task
```

## Agent-Specific Implementations

### 12. **Software Engineer**
```
Primary Tools: editFiles, codebase, runTests, usages, problems
CLI Usage: Only for custom build scripts, package installation
Focus: Code quality tools over manual code inspection
```

### 13. **DevOps Engineer**
```
Primary Tools: git_*, runTasks, problems
CLI Usage: Infrastructure scripts, deployment automation, system config
Focus: Structured operations over ad-hoc commands
```

### 14. **Security Engineer**
```
Primary Tools: codebase, search, problems, usages
CLI Usage: Security scanning tools, specialized security commands
Focus: Systematic analysis over manual inspection
```

### 15. **Database Architect**
```
Primary Tools: codebase, search, usages for schema analysis
CLI Usage: Database-specific CLI tools when no alternatives exist
Focus: Schema analysis tools over direct database commands
```

### 16. **Test Engineer**
```
Primary Tools: runTests, findTestFiles, usages, problems
CLI Usage: Custom test frameworks not supported by tools
Focus: Test execution tools over manual test running
```

## Quality Assurance

### 17. **Tool Usage Validation Checklist**
Before using runCommands, verify:
- [ ] No specialized tool exists for this task
- [ ] Combination of existing tools cannot accomplish the goal
- [ ] The CLI operation is genuinely necessary
- [ ] The operation fits acceptable CLI usage patterns
- [ ] Alternative tool-based approaches have been considered

### 18. **Common Anti-Patterns to Avoid**
```
❌ Anti-Pattern: CLI by habit
- Using familiar CLI commands instead of learning tools
- Not checking available tools before defaulting to CLI

❌ Anti-Pattern: Mixed approaches
- Using both tools and CLI for the same type of task
- Inconsistent patterns across similar operations

❌ Anti-Pattern: Ignoring tool capabilities
- Using CLI for operations that tools handle better
- Not utilizing tool error handling and structured output

❌ Anti-Pattern: Over-engineering
- Using CLI for simple operations that tools handle elegantly
- Creating complex CLI scripts when tools provide direct solutions
```

## Integration with Existing Guidelines

### 19. **Coordination with Other Instructions**
This guideline works with:
- **File Editing Best Practices**: Use editFiles tools, not CLI editors
- **Memory Usage Guidelines**: Use memory tools, never CLI data management
- **DateTime Handling**: Use get_current_time tool, never CLI date commands
- **Documentation Standards**: Use specialized tools for content creation

### 20. **Sequential Thinking Integration**
When using sequential thinking to plan tasks:
```
Include tool selection in thinking process:
- Thought N: "What tools are available for this task?"
- Thought N+1: "How can I combine tools to achieve the goal?"
- Thought N+2: "Is CLI truly necessary, or can tools handle this?"
```

## Implementation Examples

### 21. **Complete Workflow Example**
```
Task: Review code changes and fix issues

✅ CORRECT Tool-First Approach:
1. Use tool: git_status (check repository state)
2. Use tool: git_diff_unstaged (see what changed)
3. Use tool: problems (identify errors)
4. Use tool: codebase (read relevant files)
5. Use tool: editFiles (make corrections)
6. Use tool: runTests (validate fixes)
7. Use tool: git_status (confirm changes)

❌ INCORRECT CLI-Heavy Approach:
1. Use tool: runCommands ("git status")
2. Use tool: runCommands ("git diff")
3. Use tool: runCommands ("grep -r 'error' .")
4. Use tool: runCommands ("cat file.js")
5. Use tool: runCommands ("vim file.js")
6. Use tool: runCommands ("npm test")
```

### 22. **Emergency CLI Usage**
```
When CLI is truly needed:
- Document the reason in comments
- Explain why tools weren't sufficient
- Include the specific limitation encountered

Example:
// Using CLI because git_rebase tool doesn't exist
// and this requires interactive conflict resolution
Use tool: runCommands
Arguments: {
  "command": "git rebase -i HEAD~3",
  "explanation": "Interactive rebase not supported by available git tools"
}
```

## Continuous Improvement

### 23. **Tool Coverage Expansion**
When encountering CLI usage:
- Identify patterns that could benefit from new tools
- Document tool gaps and limitations
- Provide feedback for tool development priorities
- Share successful tool-based solutions

### 24. **Best Practice Evolution**
- Track tool effectiveness vs CLI alternatives
- Document successful tool combinations
- Share complex tool-based solutions
- Update guidelines based on new tool capabilities

---

**Remember**: Tools provide better integration, error handling, and maintainability than CLI commands. They are designed specifically for agent workflows and should always be the first choice. CLI commands are a fallback option, not a primary approach.

**Key Principle**: If a tool exists for a task, use it. If multiple tools can accomplish parts of a task, combine them. Only use CLI when tools genuinely cannot handle the requirements.
