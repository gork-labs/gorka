---
applyTo: '**'
description: 'Shared Time Management Instructions.'
---

---
title: "Shared Time Management Instructions"
date: "2025-01-23"
last_updated: "2025-01-23 16:02:04 UTC"
author: "@bohdan-shulha"
---

# Time Management Guidelines for All Agents

## Core Principles

1. **Always Use DateTime MCP Tool**
   - Tool name: `datetime`
   - Method: `get_current_time`
   - Required argument: `timezone: "Europe/Warsaw"`
   - **Never hardcode timestamps - always get fresh from datetime tool**

2. **User Configuration**
   - User Timezone: Europe/Warsaw
   - Current User: bohdan-shulha

3. **DateTime Tool Usage**
   ```
   Use datetime tool: get_current_time
   Arguments: {
     "timezone": "Europe/Warsaw"
   }
   ```
   Returns: String in format "YYYY-MM-DD HH:MM:SS"

4. **Timestamp Formats**
   - In documents: "YYYY-MM-DD HH:MM:SS (Europe/Warsaw)"
   - In filenames: "YYYY-MM-DD-feature-name.md"
   - In memory observations: "Date: YYYY-MM-DD, Time: HH:MM:SS (Europe/Warsaw)"

5. **Duration Tracking**
   ```javascript
   // Track start
   const startTime = await datetime.get_current_time({ timezone: "Europe/Warsaw" });

   // ... perform work ...

   // Track end
   const endTime = await datetime.get_current_time({ timezone: "Europe/Warsaw" });

   // Store both, never hardcode duration
   observations: [
     `Started: ${startTime}`,
     `Completed: ${endTime}`
   ]
   ```

## Common Mistakes to Avoid

❌ **DON'T** hardcode any dates, times, or durations
❌ **DON'T** copy timestamps from examples
❌ **DON'T** write "Time spent: 45 minutes"
❌ **DON'T** assume current date
❌ **DON'T** reuse timestamps

✅ **DO** call datetime tool for every timestamp
✅ **DO** track start/end times for durations
✅ **DO** preserve historical timestamps
✅ **DO** include timezone identifier
✅ **DO** update timestamps on every modification
