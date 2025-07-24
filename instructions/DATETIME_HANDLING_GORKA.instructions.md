---
applyTo: '**'
description: 'Comprehensive DateTime Handling Guidelines.'
---

---
title: "Comprehensive DateTime Handling Guidelines"
date: "2025-07-24"
last_updated: "2025-07-24T14:36:23+02:00"
author: "@bohdan-shulha"
---

# DateTime Handling Guidelines for All Agents

## Core Principles

### 1. **CRITICAL: Always Use DateTime MCP Tool**
- **Tool name**: `mcp_time_get_current_time`
- **Required argument**: `timezone: "Europe/Warsaw"`
- **NEVER hardcode timestamps - always get fresh from datetime tool**

### 2. **User Configuration**
- User Timezone: Europe/Warsaw
- Current User: bohdan-shulha

### 3. **DateTime Tool Usage**
```
Use datetime tool: get_current_time
Arguments: {
  "timezone": "Europe/Warsaw"
}
```
Returns: ISO format like "2025-07-24T14:36:23+02:00"

**Parse this response to get:**
- Date: 2025-07-24
- Time: 14:36:23
- Full timestamp: 2025-07-24T14:36:23+02:00 (Europe/Warsaw)

## Timestamp Formats

### 4. **Standard Formats**
- **In documents**: "2025-07-24T14:36:23+02:00"
- **In filenames**: "2025-07-24-feature-name.md"
- **In memory observations**: "Knowledge captured: 2025-07-24T14:36:23+02:00"
- **Human readable**: "2025-07-24 14:36:23 (Europe/Warsaw)"

### 5. **Duration Tracking**
```
// Track start
Use datetime tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}
// Store result: startTime

// ... perform work ...

// Track end  
Use datetime tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}
// Store result: endTime

// Store both, never hardcode duration
observations: [
  "Started: [startTime from tool]",
  "Completed: [endTime from tool]"
]
```

## What NOT to Do

❌ **DON'T** hardcode any dates, times, or durations
❌ **DON'T** copy timestamps from examples 
❌ **DON'T** write "Time spent: 45 minutes"
❌ **DON'T** assume current date
❌ **DON'T** reuse timestamps
❌ **DON'T** use hardcoded future dates like "2025-07-23"

## What TO Do

✅ **DO** call datetime tool for every timestamp
✅ **DO** track start/end times for durations
✅ **DO** preserve historical timestamps
✅ **DO** include timezone identifier
✅ **DO** update timestamps on every modification
✅ **DO** use the actual current date from the datetime tool

## Examples

### Document Headers
```markdown
---
title: "Feature Design"
date: "2025-07-24"
last_updated: "2025-07-24T14:36:23+02:00"
author: "@bohdan-shulha"
---
```

### Memory Observations
```json
{
  "observations": [
    "Domain entity: Represents system users",
    "Knowledge captured: 2025-07-24T14:36:23+02:00",
    "Author: @bohdan-shulha"
  ]
}
```

### Filename Patterns
- Architecture docs: `docs/architecture/2025-07-24-user-auth-system.md`
- Reviews: `reviews/2025-07-24-security-review.md`
- Test reports: `tests/reports/2025-07-24-performance-baseline.md`

## Implementation Notes

### Error Handling Patterns
```
// Always check tool call results
Use datetime tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}

// If tool fails, retry once
Use datetime tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}

// Store result immediately
// Use the timestamp returned by the tool
```

### Bulk Operations
```
// For multiple timestamps in same operation, call once and reuse
Use datetime tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}
// Returns: "2025-07-24T14:36:23+02:00"

// Use same timestamp for related operations
entity1.observations: ["Created: 2025-07-24T14:36:23+02:00"]
entity2.observations: ["Created: 2025-07-24T14:36:23+02:00"]  
relationship.observations: ["Established: 2025-07-24T14:36:23+02:00"]
```

## Best Practices

1. **Get timestamp early** in any operation that needs it
2. **Reuse within same logical operation** to maintain consistency
3. **Always include timezone** for clarity
4. **Use ISO format** for machine processing
5. **Use human format** for display when needed
6. **Track both start and end** for duration calculations
7. **Never assume or interpolate** future dates

## Common Scenarios

### Creating Documents
```
1. Get current timestamp
2. Use in frontmatter
3. Use same timestamp for initial "last_updated"
4. Get fresh timestamp only when actually updating
```

### Memory Operations
```
1. Get timestamp once per session
2. Use for all entities created in that session
3. Get fresh timestamp for separate sessions
4. Include in all observation entries
```

### File Operations
```
1. Get timestamp for filename
2. Use same timestamp in file content
3. Update timestamp only when file changes
4. Preserve original creation timestamp
```

Remember: **The datetime MCP tool is your single source of truth for all time-related data. Never hardcode or assume dates.**
