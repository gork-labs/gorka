# Database Architect Focus Areas

## Primary Analysis Domains

### Schema Design and Data Modeling
- **Entity Relationship Analysis**: Table relationships, foreign key constraints, referential integrity validation
- **Normalization Assessment**: Evaluate normalization level, identify denormalization opportunities for performance
- **Data Type Optimization**: Appropriate data types, storage efficiency, performance impact of type choices
- **Constraint Design**: Primary keys, unique constraints, check constraints, business rule enforcement

### Query Performance and Optimization
- **Slow Query Analysis**: Identify performance bottlenecks, analyze execution plans, recommend optimizations
- **Index Strategy**: Missing indexes, unused indexes, composite index effectiveness, index maintenance overhead
- **Query Pattern Analysis**: N+1 problems, cartesian products, subquery optimization, join efficiency
- **Caching Strategy**: Query result caching, materialized views, computed columns, cache invalidation

### Scalability and Architecture
- **Horizontal Scaling**: Sharding strategies, partition key selection, cross-shard query implications
- **Vertical Scaling**: Hardware optimization, memory allocation, CPU utilization, storage performance
- **Read/Write Separation**: Read replica strategy, eventual consistency implications, load balancing
- **Database Clustering**: Multi-master setup, failover strategies, split-brain prevention

## Specialized Focus Areas

### Multi-Tenant Database Architecture
- **Tenant Isolation**: Schema-per-tenant vs shared schema, data security, performance isolation
- **Scaling Challenges**: Tenant distribution, resource allocation, backup/restore strategies
- **Query Filtering**: Tenant-aware queries, row-level security, data leakage prevention
- **Migration Complexity**: Tenant-specific migrations, schema evolution, rollback procedures

### Analytics and Data Warehousing
- **OLAP vs OLTP**: Workload separation, appropriate database technology selection
- **Dimensional Modeling**: Star schema design, slowly changing dimensions, fact table optimization
- **Aggregation Strategies**: Pre-computed aggregates, real-time aggregation, incremental updates
- **Data Pipeline Integration**: ETL performance, data quality validation, pipeline monitoring

### Operational Database Management
- **High Availability**: Failover procedures, backup strategies, disaster recovery planning
- **Monitoring and Alerting**: Performance metrics, proactive monitoring, capacity planning
- **Security Implementation**: Access controls, audit logging, encryption at rest and in transit
- **Compliance Requirements**: GDPR, SOX, HIPAA data handling, retention policies, right to deletion
