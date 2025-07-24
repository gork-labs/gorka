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

### Business Entities
- Format: `[EntityName]_Entity`
- Examples: `User_Entity`, `Listing_Entity`, `Order_Entity`, `Payment_Entity`

### Business Processes
- Format: `[ProcessName]_Process`
- Examples: `UserRegistration_Process`, `OrderFulfillment_Process`, `PaymentVerification_Process`

### Patterns & Strategies
- Format: `[PatternName]_Pattern`
- Examples: `CircuitBreaker_Pattern`, `TokenAuthentication_Pattern`, `EventSourcing_Pattern`

### Decisions
- Format: `[Topic]_Decision`
- Examples: `SearchStrategy_Decision`, `CachingStrategy_Decision`, `ScalingStrategy_Decision`

### Business Rules
- Format: `[RuleName]_Rule`
- Examples: `UserEligibility_Rule`, `PricingCalculation_Rule`, `AccessControl_Rule`

### System Capabilities
- Format: `[CapabilityName]_Capability`
- Examples: `SearchCapability_Capability`, `AuthenticationCapability_Capability`

## 3. Entity Type Selection

| Entity Type | Use For | Examples |
|-------------|---------|----------|
| concept | Domain concepts, business rules, strategies | User roles, authentication strategies, business constraints |
| system | Services, subsystems, external systems | Authentication system, Search system, Payment gateway |
| process | Business processes, workflows | User onboarding, order processing, payment flow |
| event | Business events, system events | User registered, order placed, payment completed |
| object | Business entities, value objects | User profile, product catalog, pricing model |
| attribute | Business metrics, quality attributes | Performance requirements, scalability targets, business KPIs |

## 4. Query Before Create Pattern

Always check for existing entities before creating new ones:

```
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

## 5. Domain-Focused Entity Patterns

### Business Entity
```
// Get timestamp first
Use datetime tool: get_current_time
Arguments: {"timezone": "Europe/Warsaw"}
// Returns: "2025-01-23 16:45:30"

Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "User_Entity",
    "entityType": "object",
    "observations": [
      "Domain entity: Represents system users",
      "Knowledge captured: 2025-01-23 16:45:30 (Europe/Warsaw)",
      "User types: Admin, DirectoryOwner, RegularUser, Guest",
      "Key attributes: email (unique), profile, preferences, roles",
      "Business invariants: Email must be verified before full access",
      "Lifecycle states: Pending, Active, Suspended, Deleted",
      "Relations: owns Listings, creates Reviews, has Subscriptions",
      "Access rules: Can only modify own profile unless admin",
      "Data retention: Soft delete with 30-day recovery period"
    ]
  }]
}
```

### Business Process
```
Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "SearchListing_Process",
    "entityType": "process",
    "observations": [
      "Business process: How users search for listings",
      "Knowledge captured: 2025-01-23 16:45:30 (Europe/Warsaw)",
      "Process triggers: User enters search query or applies filters",
      "Input requirements: Optional query text, optional filters, pagination params",
      "Process steps: Parse query, apply filters, rank results, apply permissions",
      "Business rules: Only show active listings, respect visibility settings",
      "Performance expectations: Results within 100ms for 95% of queries",
      "Ranking factors: Relevance score, recency, user preferences, popularity",
      "Filter categories: Location, price range, category, features, availability",
      "Output format: Paginated results with facets and total count"
    ]
  }]
}
```

### Architectural Decision
```
Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "ElasticsearchAdoption_Decision",
    "entityType": "concept",
    "observations": [
      "Decision: Use Elasticsearch for listing search functionality",
      "Decision date: 2025-01-23",
      "Captured: 16:45:30 (Europe/Warsaw)",
      "Author: @bohdan-shulha",
      "Status: Approved",
      "Problem context: Need faceted search, fuzzy matching, and geo queries",
      "Alternatives evaluated: PostgreSQL full-text, Algolia, Typesense",
      "Decision rationale: Best balance of features, performance, and control",
      "Trade-offs accepted: Operational complexity for advanced search features",
      "Success metrics: Sub-100ms search, 99.9% availability, faceted results",
      "Constraints: Must support existing query patterns during migration",
      "Review schedule: Quarterly performance and cost review"
    ]
  }]
}
```

### System Capability
```
Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "AuthenticationCapability_Capability",
    "entityType": "system",
    "observations": [
      "System capability: User authentication and session management",
      "Knowledge captured: 2025-01-23 16:45:30 (Europe/Warsaw)",
      "Authentication methods: Email/password, OAuth2 (Google, GitHub), API keys",
      "Token strategy: Short-lived access tokens with refresh tokens",
      "Session properties: 15-minute access tokens, 7-day refresh tokens",
      "Security features: Rate limiting, brute force protection, MFA support",
      "Password requirements: Minimum 8 chars, complexity rules, history check",
      "Account recovery: Email-based reset with time-limited tokens",
      "Audit requirements: Log all auth attempts with outcome and metadata",
      "Performance target: Authentication within 50ms average"
    ]
  }]
}
```

### Business Rule
```
Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "ListingVisibility_Rule",
    "entityType": "concept",
    "observations": [
      "Business rule: Determines who can view listings",
      "Rule captured: 2025-01-23 16:45:30 (Europe/Warsaw)",
      "Rule statement: Listing visibility depends on status and user role",
      "Public listings: Visible to all users including guests",
      "Private listings: Visible only to owner and invited users",
      "Draft listings: Visible only to owner and admins",
      "Deleted listings: Visible only to admins for audit purposes",
      "Directory context: Respects directory-level visibility settings",
      "Override capability: Admins can view all listings regardless of settings",
      "Compliance note: Must respect user privacy preferences",
      "Performance impact: Visibility check must not add >5ms to queries"
    ]
  }]
}
```

## 6. Relationship Patterns

Focus on domain relationships rather than implementation relationships:

```
Domain Model:
"User_Entity" --[owns]--> "Listing_Entity"
"User_Entity" --[belongs_to]--> "Organization_Entity"
"Listing_Entity" --[categorized_as]--> "Category_Concept"
"Order_Entity" --[contains]--> "OrderItem_Entity"

Business Processes:
"UserRegistration_Process" --[creates]--> "User_Entity"
"SearchListing_Process" --[queries]--> "Listing_Entity"
"OrderFulfillment_Process" --[updates]--> "Order_Entity"

Rules and Constraints:
"ListingVisibility_Rule" --[governs]--> "Listing_Entity"
"PricingCalculation_Rule" --[applies_to]--> "Order_Entity"

System Capabilities:
"AuthenticationCapability_Capability" --[authenticates]--> "User_Entity"
"SearchCapability_Capability" --[enables]--> "SearchListing_Process"
```

## 7. Best Practices

1. **Capture Domain Knowledge**: Focus on what the system does, not how it's implemented
2. **Business Language**: Use terms from the business domain, not technical jargon
3. **Behavior Over Structure**: Describe system behavior and rules rather than code structure
4. **Timeless Facts**: Record facts that remain true regardless of implementation changes
5. **Relationships Matter**: Emphasize how domain concepts relate to each other
6. **Context is Key**: Always provide business context for decisions and rules
7. **Avoid Implementation Details**: No file paths, class names, or code snippets
8. **Focus on Why**: Capture the reasoning behind decisions, not just the outcomes

## 8. Knowledge Capture Timing

### When to Store Knowledge

**MANDATORY: Capture knowledge as you discover it, not at the end of the session**

1. **Immediate Capture Triggers**:
   - When you discover a new domain concept → Create entity immediately
   - When you understand a business rule → Document it now
   - When you identify a system capability → Store it right away
   - When you learn about relationships → Create relations immediately

2. **During Analysis**:
   ```
   // As soon as you understand a concept:
   Use memory tool: create_entities
   Arguments: {
     "entities": [{
       "name": "DiscoveredConcept_Entity",
       "entityType": "object",
       "observations": [
         "What I just learned about this concept...",
         // Don't wait - capture it now!
       ]
     }]
   }
   ```

3. **During Implementation Review**:
   - Found a business rule in code? → Store it immediately
   - Discovered a domain relationship? → Create relation now
   - Identified a system behavior? → Document it right away

4. **Progressive Knowledge Building**:
   ```
   // Initial discovery
   Use memory tool: create_entities
   Arguments: {
     "entities": [{
       "name": "UserAuthentication_Process",
       "entityType": "process",
       "observations": ["Initial understanding of the process..."]
     }]
   }

   // Learn more details? Add observations:
   Use memory tool: add_observations
   Arguments: {
     "observations": [{
       "entityName": "UserAuthentication_Process",
       "contents": ["New fact I just discovered..."]
     }]
   }

   // Found a relationship? Create it now:
   Use memory tool: create_relations
   Arguments: {
     "relations": [{
       "from": "UserAuthentication_Process",
       "to": "User_Entity",
       "relationType": "authenticates"
     }]
   }
   ```

5. **Knowledge Capture Checklist**:
   - [ ] Did I learn something new? → Store it NOW
   - [ ] Did I discover a relationship? → Link it NOW
   - [ ] Did I understand a business rule? → Document it NOW
   - [ ] Did I identify a domain concept? → Create entity NOW

6. **Anti-Patterns to Avoid**:
   ❌ "I'll store all this knowledge at the end"
   ❌ "Let me finish the analysis first"
   ❌ "I'll batch create all entities later"
   ❌ Waiting until task completion to update memory

   ✅ Store each fact as you discover it
   ✅ Create entities during analysis, not after
   ✅ Build knowledge graph progressively
   ✅ Update existing entities when you learn more

### Example Workflow

```
// Step 1: Discover a domain entity while reading code
// IMMEDIATELY:
Use memory tool: create_entities
Arguments: {
  "entities": [{
    "name": "Order_Entity",
    "entityType": "object",
    "observations": [
      "Domain entity: Represents customer orders",
      "Knowledge captured: 2025-01-23 16:45:30 (Europe/Warsaw)",
      "Initial understanding: Contains items and pricing"
    ]
  }]
}

// Step 2: Find more details about the entity
// IMMEDIATELY:
Use memory tool: add_observations
Arguments: {
  "observations": [{
    "entityName": "Order_Entity",
    "contents": [
      "Order states: Draft, Submitted, Processing, Completed, Cancelled",
      "Key attributes: orderId, customerId, items, totalAmount, status"
    ]
  }]
}

// Step 3: Discover a relationship
// IMMEDIATELY:
Use memory tool: create_relations
Arguments: {
  "relations": [{
    "from": "Order_Entity",
    "to": "Customer_Entity",
    "relationType": "placed_by"
  }]
}
```

### Session End Protocol

At session end, only:
1. Review what was captured (don't wait until now to capture!)
2. Check for missed relationships
3. Ensure all discovered facts were stored
4. Add any final insights that connect multiple concepts

**Remember: The knowledge graph should grow throughout your session, not just at the end!**
