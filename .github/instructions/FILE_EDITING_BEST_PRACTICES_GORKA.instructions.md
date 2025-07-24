---
applyTo: '**'
description: 'Critical file editing guidelines to prevent errors and ensure accurate code modifications across all Gorka agents.'
---

---
title: "File Editing Best Practices Guidelines"
date: "2025-07-24"
last_updated: "2025-07-24T19:14:45+02:00"
author: "@bohdan-shulha"
timezone: "Europe/Warsaw"
status: "approved"
version: "1.0.0"
document_type: "instructions"
---

# File Editing Best Practices for Gorka Agents

## Core Principles

### 1. **CRITICAL: Always Read Before Editing**
- **NEVER edit a file without reading it first**
- **ALWAYS read in meaningful chunks (50-200 lines minimum)**
- **MANDATORY: Read surrounding context around edit locations**
- **REQUIRED: Understand file structure before making changes**

### 2. **Context Reading Strategy**
- **Chunked Reading**: Read files in logical sections, not line-by-line
- **Contextual Scope**: Include at least 10-20 lines before and after target areas
- **Dependency Awareness**: Read imports, dependencies, and related functions
- **Full Understanding**: Comprehend the entire file structure and purpose

### 3. **Pre-Edit Validation Protocol**
- **File Structure Analysis**: Understand the file's organization and patterns
- **Dependency Mapping**: Identify all code sections that might be affected
- **Assumption Validation**: Verify your understanding of the current code
- **Change Impact Assessment**: Consider ripple effects of your modifications

## Mandatory File Editing Workflow

### 4. **Step-by-Step Process**
```
ALWAYS follow this sequence:

1. READ PHASE
   - Use read_file tool with large line ranges (50-200 lines)
   - Read the entire file or relevant sections
   - Understand imports, exports, and dependencies
   - Identify patterns and conventions used

2. ANALYSIS PHASE
   - Use sequential thinking to analyze the code structure
   - Map relationships between functions/classes/modules
   - Identify potential impact areas of your changes
   - Plan the edit sequence

3. VALIDATION PHASE
   - Verify your understanding of the code
   - Check for edge cases and special handling
   - Ensure changes align with existing patterns
   - Validate that assumptions are correct

4. EDITING PHASE
   - Make changes incrementally
   - Maintain code style and patterns
   - Include 3-5 lines of context in replace operations
   - Preserve existing formatting and conventions

5. VERIFICATION PHASE
   - Re-read edited sections to confirm changes
   - Check for syntax errors and consistency
   - Validate that related code still functions
   - Use error checking tools when available
```

### 5. **Reading Patterns**

#### **For Small Files (< 100 lines)**
```
- Read the entire file in one operation
- Understand the complete structure
- Make changes with full context
```

#### **For Medium Files (100-500 lines)**
```
- Read in 2-3 meaningful chunks
- Focus on the target area plus surrounding context
- Read imports/exports and related functions
```

#### **For Large Files (> 500 lines)**
```
- Read target section plus 50 lines before/after
- Read file header (imports, constants, types)
- Read related functions/classes that might be affected
- Use search tools to understand dependencies
```

### 6. **Context Requirements**

#### **Minimum Context for Edits**
- **3-5 lines before** the target change
- **3-5 lines after** the target change
- **Related functions** that call or are called by target code
- **Import statements** and dependencies
- **Type definitions** and interfaces used

#### **Extended Context for Complex Changes**
- **10-20 lines** of surrounding code
- **Entire function/class** containing the target
- **Related test files** and documentation
- **Configuration files** that might be affected

## Tool Usage Guidelines

### 7. **File Reading Tools**
```
✅ CORRECT Usage:
- read_file with line ranges: read_file(file, 1, 100)
- Multiple reads for large files: read sections progressively
- Search for related code: search for function names and dependencies

❌ INCORRECT Usage:
- Reading only 1-5 lines before editing
- Making edits without reading the file
- Assuming file structure without verification
```

### 8. **File Editing Tools**
```
✅ CORRECT Usage:
- replace_string_in_file with adequate context
- Include unchanged lines before and after target
- Make incremental changes with validation

❌ INCORRECT Usage:
- Large bulk replacements without context
- Editing without understanding surrounding code
- Making multiple unrelated changes simultaneously
```

### 9. **Error Prevention Patterns**

#### **Before Any Edit**
```
1. Search the codebase for similar patterns
2. Read the target file's structure
3. Understand naming conventions used
4. Check for existing error handling patterns
5. Validate assumptions about code behavior
```

#### **During Editing**
```
1. Maintain consistency with existing patterns
2. Preserve code style and formatting
3. Keep related changes together
4. Add comments when introducing complexity
5. Follow established conventions
```

#### **After Editing**
```
1. Re-read the modified sections
2. Check for syntax and logical errors
3. Verify that imports and dependencies are correct
4. Test critical functionality when possible
5. Use error detection tools if available
```

## Common Anti-Patterns to Avoid

### 10. **Critical Mistakes**
❌ **DON'T** edit files without reading them first
❌ **DON'T** make changes based on assumptions
❌ **DON'T** ignore existing code patterns and conventions
❌ **DON'T** make large changes without understanding impact
❌ **DON'T** edit multiple unrelated sections simultaneously
❌ **DON'T** skip validation steps to save time

### 11. **Context Failures**
❌ **DON'T** read only the exact lines you plan to change
❌ **DON'T** ignore imports and dependencies
❌ **DON'T** overlook related functions and classes
❌ **DON'T** miss configuration and setup code
❌ **DON'T** forget about error handling patterns

## Advanced Techniques

### 12. **Multi-File Changes**
When changes affect multiple files:
```
1. Map all affected files first
2. Read and understand each file's structure
3. Plan the change sequence (dependencies first)
4. Make changes incrementally across files
5. Validate each step before proceeding
```

### 13. **Refactoring Operations**
For large refactoring tasks:
```
1. Use semantic search to find all usages
2. Read and understand each usage context
3. Create a comprehensive change plan
4. Execute changes in dependency order
5. Validate each change thoroughly
```

### 14. **Legacy Code Handling**
When working with legacy code:
```
1. Read extensively to understand patterns
2. Identify and follow existing conventions
3. Make minimal changes that preserve behavior
4. Add comments to document your changes
5. Validate thoroughly due to potential brittleness
```

## Quality Assurance

### 15. **Self-Validation Checklist**
Before completing any file editing task:
- [ ] Did I read the file(s) in adequate chunks?
- [ ] Do I understand the code structure and patterns?
- [ ] Are my changes consistent with existing style?
- [ ] Did I include proper context in replace operations?
- [ ] Have I validated the changes for correctness?
- [ ] Are imports and dependencies still correct?
- [ ] Did I preserve existing functionality?

### 16. **Error Recovery**
If you make an editing mistake:
```
1. Acknowledge the error immediately
2. Re-read the file to understand the current state
3. Use git tools to see what changed
4. Plan a careful correction strategy
5. Make minimal corrective changes
6. Validate the fix thoroughly
```

## Integration with Other Guidelines

### 17. **Sequential Thinking Integration**
Use sequential thinking for:
- Planning complex edits (10+ thoughts)
- Understanding large codebases (12+ thoughts)
- Designing refactoring strategies (15+ thoughts)
- Analyzing edit impact (8+ thoughts)

### 18. **Memory Integration**
Store in memory:
- Code patterns and conventions discovered
- Successful editing strategies for specific file types
- Common pitfalls and how to avoid them
- File structure insights for the project

### 19. **Documentation Integration**
When making significant changes:
- Document the reasoning behind changes
- Update relevant documentation files
- Add comments explaining complex modifications
- Create or update architectural decision records

## Emergency Protocols

### 20. **When Things Go Wrong**
If file editing causes problems:
```
1. STOP immediately - don't make more changes
2. Use git status and git diff to assess damage
3. Read the instructions again carefully
4. Use sequential thinking to plan recovery
5. Make minimal, careful corrections
6. Ask for help if the situation is unclear
```

### 21. **Prevention Mindset**
Remember:
- **Measure twice, cut once** - understand before editing
- **Context is king** - never edit in isolation
- **Incremental wins** - small, validated steps are safer
- **Validation saves time** - catching errors early is cheaper
- **Consistency matters** - follow existing patterns religiously

---

**Remember**: File editing errors are preventable through careful reading, understanding, and validation. These guidelines exist because rushed editing causes far more problems than the time saved by skipping steps. Always prioritize accuracy over speed.
