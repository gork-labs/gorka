---
applyTo: '**'
description: 'Comprehensive Memory Usage Guidelines.'
---

---
title: "Comprehensive Memory Usage Guidelines"
date: "2025-01-23"
last_updated: "2025-01-23 16:02:04 UTC"
author: "@bohdan-shulha"
---

# Memory MCP Usage Guide

## 1. Available Memory Tools

### create_entities
Creates new entities in the knowledge graph.
```json
{
  "entities": [
    {
      "name": "EntityName",
      "entityType": "concept",
      "observations": ["observation 1", "observation 2"]
    }
  ]
}
```

### create_relations
Creates relationships between entities.
```json
{
  "relations": [
    {
      "from": "Entity1",
      "to": "Entity2",
      "relationType": "implements"
    }
  ]
}
```

### search_entities
Searches for entities by query string.
```json
{
  "query": "search term"
}
```

### open_nodes
Gets detailed information about specific entities.
```json
{
  "names": ["EntityName1", "EntityName2"]
}
```

### add_observations
Adds new observations to existing entities.
```json
{
  "observations": [
    {
      "entityName": "ExistingEntity",
      "contents": ["new observation 1", "new observation 2"]
    }
  ]
}
```

### delete_entities
Removes entities from the knowledge graph.
```json
{
  "names": ["EntityToDelete1", "EntityToDelete2"]
}
```

### delete_observations
Removes specific observations from entities.
```json
{
  "deletions": [
    {
      "entityName": "EntityName",
      "observations": ["observation to remove"]
    }
  ]
}
```

### delete_relations
Removes relationships between entities.
```json
{
  "relations": [
    {
      "from": "Entity1",
      "to": "Entity2",
      "relationType": "implements"
    }
  ]
}
```

## 2. Entity Naming Conventions

### Domain Concepts
- Format: `[ConceptName]_Concept`
- Examples: `DirectoryUser_Concept`, `ListingSearch_Concept`, `PaymentProcessing_Concept`

### Implementations
- Format: `[ServiceName]_Implementation`
- Examples: `AuthService_Implementation`, `SearchAPI_Implementation`, `PaymentGateway_Implementation`

### Patterns
- Format: `[PatternName]_Pattern`
- Examples: `CircuitBreaker_Pattern`, `JWTAuth_Pattern`, `EventSourcing_Pattern`

### Decisions
- Format: `[Topic]_Decision`
- Examples: `DatabaseChoice_Decision`, `CachingStrategy_Decision`, `FrameworkSelection_Decision`

### Documents
- Format: `[DocumentName]_Document`
- Examples: `SearchRedesign_Document`, `APISpec_Document`, `ArchitectureOverview_Document`

### Reviews
- Format: `[Subject]_Review_YYYYMMDD`
- Examples: `SearchDesign_Review_20250123`, `CodeQuality_Review_20250123`

### Incidents
- Format: `[System]_Incident_YYYYMMDD`
- Examples: `Database_Incident_20250123`, `API_Incident_20250123`

## 3. Entity Type Selection

| Entity Type | Use For | Examples |
|-------------|---------|----------|
| concept | Domain concepts, patterns, decisions | User roles, auth patterns, business rules |
| system | Services, applications, infrastructure | AuthService, Redis, PostgreSQL, Kubernetes |
| process | Business processes, workflows | User registration, order checkout, deployment |
| event | Reviews, incidents, meetings | Design reviews, outages, retrospectives |
| object | Documents, files, artifacts | Design docs, configs, schemas |
| attribute | Metrics, properties, baselines | Performance metrics, SLAs, thresholds |

## 4. Query Before Create Pattern

Always check for existing entities before creating new ones:

```javascript
// 1. Search for exact name
Use memory tool: search_entities
Arguments: {"query": "ExactEntityName"}

// 2. Search for variations
Use memory tool: search_entities
Arguments: {"query": "entity OR variation OR synonym"}

// 3. Search for related concepts
Use memory tool: search_entities
Arguments: {"query": "domain terms"}

// 4. Get details if found
Use memory tool: open_nodes
Arguments: {"names": ["found_entities"]}

// 5. Only create if not found or significantly different
```

## 5. Common Entity Patterns

### Architecture Decision
```javascript
// Get timestamp first
const timestamp = await datetime.get_current_time({ timezone: "Europe/Warsaw" });
const [date, time] = timestamp.split(' ');

Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "ElasticsearchMigration_Decision",
    "entityType": "concept",
    "observations": [
      "Decision: Migrate search from SQL to Elasticsearch",
      `Date: ${date}`,
      `Time: ${time} (Europe/Warsaw)`,
      "Author: @bohdan-shulha",
      "Status: Approved",
      "Rationale: Need faceted search and better performance",
      "Alternatives considered: PostgreSQL full-text, Algolia",
      "Trade-offs: Higher operational complexity vs better features",
      "Expected outcome: 5x performance improvement",
      "Implementation timeline: 3 weeks",
      `Document: docs/architecture/${date}-search-redesign.md`
    ]
  }]
}
```

### Implementation Pattern
```javascript
Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "AuthService_Implementation",
    "entityType": "system",
    "observations": [
      "Location: src/services/auth.service.ts",
      "Pattern: JWT with refresh tokens",
      "Dependencies: jsonwebtoken, bcrypt, redis",
      "Access token TTL: 15 minutes",
      "Refresh token TTL: 7 days",
      "Rate limiting: 5 attempts/minute",
      "Supports: MFA via TOTP",
      `Last updated: ${date}`,
      "Test coverage: 87%",
      "Performance: 50ms avg response"
    ]
  }]
}
```

### Review Event
```javascript
Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": `SearchDesign_Review_${date.replace(/-/g, '')}`,
    "entityType": "event",
    "observations": [
      "Document: Search API Redesign v1.0",
      "Reviewer: @bohdan-shulha",
      `Review started: ${startTime}`,
      `Review completed: ${endTime}`,
      "Timezone: Europe/Warsaw",
      "Review outcome: Needs Revision",
      "Critical issues: 2 (auth, rate limiting)",
      "Important issues: 2 (error handling, privacy)",
      "Suggestions: 3",
      "Security score: 6/10",
      "Next review deadline: [calculated date]"
    ]
  }]
}
```

## 6. Relationship Patterns

```
Design Documents:
"DesignDocument" --[documents]--> "Decision"
"Implementation" --[implements]--> "DesignDocument"
"Review" --[reviews]--> "Document"

Patterns:
"Service" --[implements]--> "Pattern"
"Pattern" --[used_by]--> "Service"

Incidents:
"Incident" --[caused_by]--> "RootCause"
"Fix" --[resolves]--> "Incident"

Teams:
"Developer" --[owns]--> "Service"
"Team" --[responsible_for]--> "Domain"
```

## 7. Best Practices

1. **Rich Observations**: Include at least 5-7 meaningful observations
2. **Temporal Data**: Always include creation/update timestamps
3. **Cross-References**: Link to related documents, code, or systems
4. **Status Tracking**: Include current status and next actions
5. **Metrics**: Add quantifiable data when possible
6. **Context**: Provide enough context for future understanding
