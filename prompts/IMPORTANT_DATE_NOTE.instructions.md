---
title: "Important Note About Dates"
date: "2025-01-23"
last_updated: "2025-01-23 15:01:06 UTC"
author: "@bohdan-shulha"
---

# IMPORTANT: Date Handling

**Always use the datetime MCP tool to get current timestamps. Do not hardcode dates.**

The datetime tool will return the current date and time in the requested timezone.

Example:
```
Use datetime tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}
```

This will return something like: "2025-01-23 16:01:06"

**Parse this response to get:**
- Date: 2025-01-23
- Time: 16:01:06
- Full timestamp: 2025-01-23 16:01:06 (Europe/Warsaw)

**Never assume or hardcode future dates like "2025-07-23" - always use the actual current date from the datetime tool.**