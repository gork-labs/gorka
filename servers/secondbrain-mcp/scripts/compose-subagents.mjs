#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Compose sub-agent chatmodes from templates, instructions, and domain-specific content
 */

// Sub-agent configurations with domain-specific variables
const SUB_AGENTS = {
  'Security Engineer': {
    domain: 'security',
    specialization: 'cybersecurity_analysis',
    description: 'cybersecurity analysis, vulnerability assessment, and security architecture',
    workflow_vars: {
      DOMAIN_UPPER: 'SECURITY',
      DOMAIN_CONTEXT: 'security configurations and authentication implementations',
      DOMAIN_NAME: 'security',
      DOMAIN_TITLE: 'Security',
      DOMAIN_FILES: 'authentication logic, authorization middleware, and security configurations',
      DOMAIN_ARTIFACTS: 'security policies and access control implementations',
      DOMAIN_CHARACTERISTICS: 'security patterns and vulnerability landscapes',
      DOMAIN_FILE_TYPES: 'security configuration files',
      DOMAIN_DEPENDENCIES: 'authentication libraries and security middleware',
      DOMAIN_RELATIONSHIPS: 'security layer dependencies',
      DOMAIN_PATTERNS: 'security implementation patterns',
      DOMAIN_CONFIGURATIONS: 'security configuration and policy settings',
      DOMAIN_METRICS: 'security metrics and vulnerability assessments',
      DOMAIN_PROCEDURES: 'security validation and penetration testing procedures',
      DOMAIN_FILE_SINGULAR: 'Security Configuration File',
      DOMAIN_EXAMPLE_PATH: 'src/auth/jwt-validator.ts',
      DOMAIN_IMPLEMENTATION: 'Security Configuration',
      DOMAIN_CONTENT: 'security configuration content',
      DOMAIN_MODIFICATIONS: 'security configuration modifications',
      DOMAIN_RATIONALE: 'security improvement',
      DOMAIN_COMMANDS: 'security validation commands',
      DOMAIN_IMPACT_TYPE: 'security impact',
      DOMAIN_BENEFITS: 'system security and threat mitigation',
      DOMAIN_CHANGES: 'security configuration changes',
      DOMAIN_ARCHITECTURE: 'security architecture and threat model',
      DOMAIN_MONITORING: 'security monitoring and alerting',
      DOMAIN_PRACTICES: 'security best practices',
      DOMAIN_ADVICE: 'security advice',
      DOMAIN_COMPONENTS: 'security components',
      DOMAIN_ENTITIES: 'security components, policies, and implementations',
      DOMAIN_PERFORMANCE: 'Security',
      DOMAIN_RISKS: 'Security, operational, and compliance risks',
      DOMAIN_EVIDENCE: 'Security Configuration',
      DOMAIN_AFFECTED_COMPONENTS: 'Security Components Affected',
      DOMAIN_FILE_TYPE: 'security configuration',
      DOMAIN_CODE_LANGUAGE: 'typescript',
      DOMAIN_EXAMPLE_CURRENT: '// Current vulnerable configuration\nconst decoded = jwt.verify(token, secretKey);',
      DOMAIN_EXAMPLE_IMPROVED: '// Secure configuration with algorithm enforcement\nconst decoded = jwt.verify(token, secretKey, { algorithms: [\'RS256\'] });',
      DOMAIN_SCRIPT_TYPE: 'Security Validation Script',
      DOMAIN_SCRIPT_LANGUAGE: 'bash',
      DOMAIN_EXAMPLE_COMMANDS: '# Test security configuration\nnpm run security:test',
      DOMAIN_EXAMPLE_VALIDATION: '# Validate security improvements\nnpm run security:audit',
      DOMAIN_FIX_TYPE: 'Security Fix',
      DOMAIN_UPDATE_TYPE: 'Security Update',
      DOMAIN_OPTIMIZATION: 'Security Optimization',
      DOMAIN_ENHANCEMENT_TYPE: 'Security Enhancement',
      DOMAIN_GAIN: 'security improvement',
      DOMAIN_SCALING_TYPE: 'Security Scaling',
      DOMAIN_TARGET: 'Security Target',
      DOMAIN_CAPACITY_METRICS: 'security capacity metrics',
      DOMAIN_MONITORING_TYPE: 'Security Monitoring Enhancement',
      DOMAIN_MONITORING_IMPROVEMENTS: 'security monitoring improvements',
      DOMAIN_AUTOMATION_TYPE: 'Security Automation',
      DOMAIN_OPERATIONS: 'Security Operations',
      DOMAIN_MONITORING_CONFIG: 'security monitoring configuration',
      DOMAIN_ALERTING: 'Security Alerting',
      DOMAIN_ALERTING_RULES: 'security alerting rules',
      DOMAIN_BACKUP: 'Security Backup',
      DOMAIN_BACKUP_PROCEDURES: 'security backup procedures',
      DOMAIN_CONFIGURATIONS: 'security configurations',
      DOMAIN_JUSTIFICATION: 'security justification',
      DOMAIN_IMPROVEMENT: 'security improvement',
      DOMAIN_STRUCTURES: 'security structures'
    }
  },
  'Software Engineer': {
    domain: 'software_development',
    specialization: 'code_quality_analysis',
    description: 'software architecture, code quality, and implementation best practices',
    workflow_vars: {
      DOMAIN_UPPER: 'CODE',
      DOMAIN_CONTEXT: 'source code and implementation files',
      DOMAIN_NAME: 'code',
      DOMAIN_TITLE: 'Code',
      DOMAIN_FILES: 'source code, modules, and component implementations',
      DOMAIN_ARTIFACTS: 'classes, functions, and code modules',
      DOMAIN_CHARACTERISTICS: 'code patterns and architectural structures',
      DOMAIN_FILE_TYPES: 'source code files',
      DOMAIN_DEPENDENCIES: 'imported modules and external libraries',
      DOMAIN_RELATIONSHIPS: 'code dependency relationships',
      DOMAIN_PATTERNS: 'coding patterns and architectural designs',
      DOMAIN_CONFIGURATIONS: 'code configuration and build settings',
      DOMAIN_METRICS: 'code quality metrics and performance characteristics',
      DOMAIN_PROCEDURES: 'code review and testing procedures',
      DOMAIN_FILE_SINGULAR: 'Source Code File',
      DOMAIN_EXAMPLE_PATH: 'src/components/UserProfile.tsx',
      DOMAIN_IMPLEMENTATION: 'Code Implementation',
      DOMAIN_CONTENT: 'source code content',
      DOMAIN_MODIFICATIONS: 'code modifications',
      DOMAIN_RATIONALE: 'code quality improvement',
      DOMAIN_COMMANDS: 'build and test commands',
      DOMAIN_IMPACT_TYPE: 'code quality impact',
      DOMAIN_BENEFITS: 'code maintainability and performance',
      DOMAIN_CHANGES: 'code changes',
      DOMAIN_ARCHITECTURE: 'code architecture and design patterns',
      DOMAIN_MONITORING: 'code quality monitoring',
      DOMAIN_PRACTICES: 'coding best practices',
      DOMAIN_ADVICE: 'coding advice',
      DOMAIN_COMPONENTS: 'code components',
      DOMAIN_ENTITIES: 'classes, functions, and modules',
      DOMAIN_PERFORMANCE: 'Code Quality',
      DOMAIN_RISKS: 'Code quality, maintainability, and performance risks',
      DOMAIN_EVIDENCE: 'Code',
      DOMAIN_AFFECTED_COMPONENTS: 'Code Components Affected',
      DOMAIN_FILE_TYPE: 'source code',
      DOMAIN_CODE_LANGUAGE: 'typescript',
      DOMAIN_EXAMPLE_CURRENT: '// Current problematic code\nfunction fetchUser(id) {\n  return fetch(\`/api/users/\${id}\`);\n}',
      DOMAIN_EXAMPLE_IMPROVED: '// Improved code with error handling\nasync function fetchUser(id: string): Promise<User> {\n  const response = await fetch(\`/api/users/\${id}\`);\n  if (!response.ok) throw new Error(\`Failed to fetch user: \${response.status}\`);\n  return response.json();\n}',
      DOMAIN_SCRIPT_TYPE: 'Build Script',
      DOMAIN_SCRIPT_LANGUAGE: 'bash',
      DOMAIN_EXAMPLE_COMMANDS: '# Build and test code changes\nnpm run build && npm test',
      DOMAIN_EXAMPLE_VALIDATION: '# Validate code quality improvements\nnpm run lint && npm run type-check',
      DOMAIN_FIX_TYPE: 'Code Fix',
      DOMAIN_UPDATE_TYPE: 'Code Update',
      DOMAIN_OPTIMIZATION: 'Code Optimization',
      DOMAIN_ENHANCEMENT_TYPE: 'Code Enhancement',
      DOMAIN_GAIN: 'code quality improvement',
      DOMAIN_SCALING_TYPE: 'Code Scaling',
      DOMAIN_TARGET: 'Code Quality Target',
      DOMAIN_CAPACITY_METRICS: 'code quality metrics',
      DOMAIN_MONITORING_TYPE: 'Code Quality Monitoring',
      DOMAIN_MONITORING_IMPROVEMENTS: 'code quality monitoring improvements',
      DOMAIN_AUTOMATION_TYPE: 'Code Automation',
      DOMAIN_OPERATIONS: 'Code Operations',
      DOMAIN_MONITORING_CONFIG: 'code monitoring configuration',
      DOMAIN_ALERTING: 'Code Quality Alerting',
      DOMAIN_ALERTING_RULES: 'code quality alerting rules',
      DOMAIN_BACKUP: 'Code Backup',
      DOMAIN_BACKUP_PROCEDURES: 'code backup procedures',
      DOMAIN_CONFIGURATIONS: 'code configurations',
      DOMAIN_JUSTIFICATION: 'code improvement justification',
      DOMAIN_IMPROVEMENT: 'code quality improvement',
      DOMAIN_STRUCTURES: 'code structures'
    }
  },
  'Database Architect': {
    domain: 'database_architecture',
    specialization: 'data_architecture_design',
    description: 'database design, optimization, and data architecture',
    workflow_vars: {
      DOMAIN_UPPER: 'DATABASE',
      DOMAIN_CONTEXT: 'database schema and query files',
      DOMAIN_NAME: 'database',
      DOMAIN_TITLE: 'Database',
      DOMAIN_FILES: 'schema files, migration scripts, and database configuration files',
      DOMAIN_ARTIFACTS: 'tables, indexes, and stored procedures',
      DOMAIN_CHARACTERISTICS: 'data patterns and query performance characteristics',
      DOMAIN_FILE_TYPES: 'schema and migration files',
      DOMAIN_DEPENDENCIES: 'database drivers and ORM configurations',
      DOMAIN_RELATIONSHIPS: 'table relationships and foreign key constraints',
      DOMAIN_PATTERNS: 'database design patterns and query optimization strategies',
      DOMAIN_CONFIGURATIONS: 'database configuration and connection settings',
      DOMAIN_METRICS: 'query performance and database efficiency metrics',
      DOMAIN_PROCEDURES: 'migration and backup procedures',
      DOMAIN_FILE_SINGULAR: 'Schema File',
      DOMAIN_EXAMPLE_PATH: 'migrations/001_create_users.sql',
      DOMAIN_IMPLEMENTATION: 'Schema Definition',
      DOMAIN_CONTENT: 'database schema content',
      DOMAIN_MODIFICATIONS: 'schema modifications',
      DOMAIN_RATIONALE: 'performance/scalability',
      DOMAIN_COMMANDS: 'migration commands',
      DOMAIN_IMPACT_TYPE: 'query performance',
      DOMAIN_BENEFITS: 'database efficiency',
      DOMAIN_CHANGES: 'schema changes',
      DOMAIN_ARCHITECTURE: 'data architecture',
      DOMAIN_MONITORING: 'database monitoring',
      DOMAIN_PRACTICES: 'database best practices',
      DOMAIN_ADVICE: 'database optimization advice',
      DOMAIN_COMPONENTS: 'database components',
      DOMAIN_ENTITIES: 'tables, indexes, relationships',
      DOMAIN_PERFORMANCE: 'Database Performance',
      DOMAIN_RISKS: 'Data consistency, performance, and scalability risks',
      DOMAIN_EVIDENCE: 'SQL',
      DOMAIN_AFFECTED_COMPONENTS: 'Tables Affected',
      DOMAIN_FILE_TYPE: 'migration or schema',
      DOMAIN_CODE_LANGUAGE: 'sql',
      DOMAIN_EXAMPLE_CURRENT: '-- Current schema causing issue\nCREATE TABLE users (\n    id SERIAL PRIMARY KEY,\n    email VARCHAR(255),\n    created_at TIMESTAMP\n);',
      DOMAIN_EXAMPLE_IMPROVED: '-- Improved schema with constraints\nCREATE INDEX CONCURRENTLY idx_users_email ON users(email);\nALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE(email);',
      DOMAIN_SCRIPT_TYPE: 'Migration Script',
      DOMAIN_SCRIPT_LANGUAGE: 'sql',
      DOMAIN_EXAMPLE_COMMANDS: '-- Complete migration with rollback capability\nBEGIN;\nCREATE INDEX CONCURRENTLY idx_users_email ON users(email);\nCOMMIT;',
      DOMAIN_EXAMPLE_VALIDATION: '-- Queries to verify improvement\nEXPLAIN ANALYZE SELECT * FROM users WHERE email = \'user@example.com\';',
      DOMAIN_FIX_TYPE: 'Index Creation',
      DOMAIN_UPDATE_TYPE: 'Constraint Addition',
      DOMAIN_OPTIMIZATION: 'Performance Optimization',
      DOMAIN_ENHANCEMENT_TYPE: 'Query Optimization',
      DOMAIN_GAIN: 'performance gain',
      DOMAIN_SCALING_TYPE: 'Partitioning Strategy',
      DOMAIN_TARGET: 'Capacity Target',
      DOMAIN_CAPACITY_METRICS: 'capacity metrics',
      DOMAIN_MONITORING_TYPE: 'Monitoring Enhancement',
      DOMAIN_MONITORING_IMPROVEMENTS: 'database monitoring improvements',
      DOMAIN_AUTOMATION_TYPE: 'Automation Implementation',
      DOMAIN_OPERATIONS: 'Query Performance',
      DOMAIN_MONITORING_CONFIG: 'SQL queries for monitoring database health',
      DOMAIN_ALERTING: 'Index Usage Analysis',
      DOMAIN_ALERTING_RULES: 'queries to monitor index effectiveness',
      DOMAIN_BACKUP: 'Backup and Recovery',
      DOMAIN_BACKUP_PROCEDURES: 'backup procedures for schema changes',
      DOMAIN_CONFIGURATIONS: 'configurations',
      DOMAIN_JUSTIFICATION: 'performance justification',
      DOMAIN_IMPROVEMENT: 'performance improvement',
      DOMAIN_STRUCTURES: 'table structures'
    }
  },
  'DevOps Engineer': {
    domain: 'infrastructure_operations',
    specialization: 'infrastructure_automation',
    description: 'infrastructure automation, deployment, and operational excellence',
    workflow_vars: {
      DOMAIN_UPPER: 'INFRASTRUCTURE',
      DOMAIN_CONTEXT: 'infrastructure configurations and deployment setup',
      DOMAIN_NAME: 'infrastructure',
      DOMAIN_TITLE: 'Infrastructure',
      DOMAIN_FILES: 'deployment scripts, Docker configurations, CI/CD pipelines',
      DOMAIN_ARTIFACTS: 'infrastructure-as-code files and environment configurations',
      DOMAIN_CHARACTERISTICS: 'operational patterns and performance characteristics',
      DOMAIN_FILE_TYPES: 'infrastructure configuration files',
      DOMAIN_DEPENDENCIES: 'deployment scripts, environment files, and CI/CD configurations',
      DOMAIN_RELATIONSHIPS: 'infrastructure dependencies and service relationships',
      DOMAIN_PATTERNS: 'operational patterns',
      DOMAIN_CONFIGURATIONS: 'monitoring and alerting configurations',
      DOMAIN_METRICS: 'performance characteristics',
      DOMAIN_PROCEDURES: 'backup, security, and disaster recovery implementations',
      DOMAIN_FILE_SINGULAR: 'Configuration File',
      DOMAIN_EXAMPLE_PATH: 'docker-compose.yml',
      DOMAIN_IMPLEMENTATION: 'Configuration',
      DOMAIN_CONTENT: 'configuration content',
      DOMAIN_MODIFICATIONS: 'configuration modifications',
      DOMAIN_RATIONALE: 'performance/security',
      DOMAIN_COMMANDS: 'deployment and validation commands',
      DOMAIN_IMPACT_TYPE: 'performance impact',
      DOMAIN_BENEFITS: 'system reliability',
      DOMAIN_CHANGES: 'configuration changes',
      DOMAIN_ARCHITECTURE: 'infrastructure architecture',
      DOMAIN_MONITORING: 'monitoring and alerting modifications',
      DOMAIN_PRACTICES: 'DevOps practices',
      DOMAIN_ADVICE: 'operational advice',
      DOMAIN_COMPONENTS: 'infrastructure components',
      DOMAIN_ENTITIES: 'services, configurations, deployments',
      DOMAIN_PERFORMANCE: 'Infrastructure Performance',
      DOMAIN_RISKS: 'Operational, security, and business continuity risks',
      DOMAIN_EVIDENCE: 'Infrastructure Configuration',
      DOMAIN_AFFECTED_COMPONENTS: 'Components Affected',
      DOMAIN_FILE_TYPE: 'configuration',
      DOMAIN_CODE_LANGUAGE: 'yaml',
      DOMAIN_EXAMPLE_CURRENT: '# Show actual current configuration causing issue\nservice:\n  image: nginx:latest\n  resources:\n    requests:\n      memory: "64Mi"',
      DOMAIN_EXAMPLE_IMPROVED: '# Show exact replacement configuration\nservice:\n  image: nginx:1.24-alpine\n  resources:\n    requests:\n      memory: "128Mi"\n    limits:\n      memory: "256Mi"',
      DOMAIN_SCRIPT_TYPE: 'Implementation Commands',
      DOMAIN_SCRIPT_LANGUAGE: 'bash',
      DOMAIN_EXAMPLE_COMMANDS: '# Exact commands needed to implement fix\nkubectl patch deployment nginx-service -p \'{"spec":{"template":{"spec":{"containers":[{"name":"nginx","resources":{"requests":{"memory":"128Mi"}}}]}}}}\'',
      DOMAIN_EXAMPLE_VALIDATION: '# Commands to verify fix was successful\nkubectl get deployment nginx-service -o yaml | grep -A 5 resources:',
      DOMAIN_FIX_TYPE: 'Configuration Fix',
      DOMAIN_UPDATE_TYPE: 'Security Update',
      DOMAIN_OPTIMIZATION: 'Performance Optimization',
      DOMAIN_ENHANCEMENT_TYPE: 'Resource Optimization',
      DOMAIN_GAIN: 'performance improvement',
      DOMAIN_SCALING_TYPE: 'Scaling Configuration',
      DOMAIN_TARGET: 'Capacity Target',
      DOMAIN_CAPACITY_METRICS: 'capacity metrics',
      DOMAIN_MONITORING_TYPE: 'Monitoring Enhancement',
      DOMAIN_MONITORING_IMPROVEMENTS: 'monitoring improvements',
      DOMAIN_AUTOMATION_TYPE: 'Automation Implementation',
      DOMAIN_OPERATIONS: 'Operations and Monitoring',
      DOMAIN_MONITORING_CONFIG: 'monitoring configuration',
      DOMAIN_ALERTING: 'Alerting Rules',
      DOMAIN_ALERTING_RULES: 'alerting rules',
      DOMAIN_BACKUP: 'Backup and Recovery',
      DOMAIN_BACKUP_PROCEDURES: 'backup procedures',
      DOMAIN_CONFIGURATIONS: 'configurations',
      DOMAIN_JUSTIFICATION: 'performance justification',
      DOMAIN_IMPROVEMENT: 'performance improvement',
      DOMAIN_STRUCTURES: 'configuration structures'
    }
  },
  'Test Engineer': {
    domain: 'quality_assurance',
    specialization: 'testing_strategy',
    description: 'testing strategy, automation, and quality assurance',
    workflow_vars: {
      DOMAIN_UPPER: 'TESTING',
      DOMAIN_CONTEXT: 'test files and testing configurations',
      DOMAIN_NAME: 'testing',
      DOMAIN_TITLE: 'Testing',
      DOMAIN_FILES: 'test files, test configurations, and quality assurance setup',
      DOMAIN_ARTIFACTS: 'test suites and testing frameworks',
      DOMAIN_CHARACTERISTICS: 'testing patterns and coverage characteristics',
      DOMAIN_FILE_TYPES: 'test files',
      DOMAIN_DEPENDENCIES: 'testing frameworks and configuration files',
      DOMAIN_RELATIONSHIPS: 'test dependency relationships',
      DOMAIN_PATTERNS: 'testing patterns',
      DOMAIN_CONFIGURATIONS: 'testing configuration and framework settings',
      DOMAIN_METRICS: 'test coverage and quality metrics',
      DOMAIN_PROCEDURES: 'test execution and validation procedures',
      DOMAIN_FILE_SINGULAR: 'Test File',
      DOMAIN_EXAMPLE_PATH: 'tests/unit/UserService.test.ts',
      DOMAIN_IMPLEMENTATION: 'Test Implementation',
      DOMAIN_CONTENT: 'test code content',
      DOMAIN_MODIFICATIONS: 'test modifications',
      DOMAIN_RATIONALE: 'coverage/quality',
      DOMAIN_COMMANDS: 'test execution commands',
      DOMAIN_IMPACT_TYPE: 'test coverage impact',
      DOMAIN_BENEFITS: 'code quality and reliability',
      DOMAIN_CHANGES: 'test changes',
      DOMAIN_ARCHITECTURE: 'test architecture',
      DOMAIN_MONITORING: 'test monitoring',
      DOMAIN_PRACTICES: 'testing best practices',
      DOMAIN_ADVICE: 'testing advice',
      DOMAIN_COMPONENTS: 'test components',
      DOMAIN_ENTITIES: 'test suites, test cases, and testing configurations',
      DOMAIN_PERFORMANCE: 'Test Coverage',
      DOMAIN_RISKS: 'Quality, reliability, and coverage risks',
      DOMAIN_EVIDENCE: 'Test Code',
      DOMAIN_AFFECTED_COMPONENTS: 'Test Components Affected',
      DOMAIN_FILE_TYPE: 'test',
      DOMAIN_CODE_LANGUAGE: 'typescript',
      DOMAIN_EXAMPLE_CURRENT: '// Current insufficient test\ntest(\'should fetch user\', () => {\n  expect(fetchUser).toBeDefined();\n});',
      DOMAIN_EXAMPLE_IMPROVED: '// Comprehensive test with edge cases\ntest(\'should fetch user successfully\', async () => {\n  const mockUser = { id: \'1\', name: \'John\' };\n  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockUser) });\n  const result = await fetchUser(\'1\');\n  expect(result).toEqual(mockUser);\n});',
      DOMAIN_SCRIPT_TYPE: 'Test Execution Script',
      DOMAIN_SCRIPT_LANGUAGE: 'bash',
      DOMAIN_EXAMPLE_COMMANDS: '# Execute comprehensive test suite\nnpm test -- --coverage',
      DOMAIN_EXAMPLE_VALIDATION: '# Validate test coverage improvements\nnpm run test:coverage -- --threshold 80',
      DOMAIN_FIX_TYPE: 'Test Enhancement',
      DOMAIN_UPDATE_TYPE: 'Coverage Update',
      DOMAIN_OPTIMIZATION: 'Test Optimization',
      DOMAIN_ENHANCEMENT_TYPE: 'Test Enhancement',
      DOMAIN_GAIN: 'coverage improvement',
      DOMAIN_SCALING_TYPE: 'Test Scaling',
      DOMAIN_TARGET: 'Coverage Target',
      DOMAIN_CAPACITY_METRICS: 'coverage metrics',
      DOMAIN_MONITORING_TYPE: 'Test Monitoring Enhancement',
      DOMAIN_MONITORING_IMPROVEMENTS: 'test monitoring improvements',
      DOMAIN_AUTOMATION_TYPE: 'Test Automation',
      DOMAIN_OPERATIONS: 'Test Execution and Monitoring',
      DOMAIN_MONITORING_CONFIG: 'test monitoring configuration',
      DOMAIN_ALERTING: 'Test Alerting',
      DOMAIN_ALERTING_RULES: 'test alerting rules',
      DOMAIN_BACKUP: 'Test Backup',
      DOMAIN_BACKUP_PROCEDURES: 'test backup procedures',
      DOMAIN_CONFIGURATIONS: 'test configurations',
      DOMAIN_JUSTIFICATION: 'test improvement justification',
      DOMAIN_IMPROVEMENT: 'test coverage improvement',
      DOMAIN_STRUCTURES: 'test structures'
    }
  },
  'Technical Writer': {
    domain: 'technical_communication',
    specialization: 'documentation_strategy',
    description: 'technical documentation, user guides, and knowledge transfer',
    workflow_vars: {
      DOMAIN_UPPER: 'DOCUMENTATION',
      DOMAIN_CONTEXT: 'documentation files and content structure',
      DOMAIN_NAME: 'documentation',
      DOMAIN_TITLE: 'Documentation',
      DOMAIN_FILES: 'documentation files, README files, and content assets',
      DOMAIN_ARTIFACTS: 'documentation sections and content modules',
      DOMAIN_CHARACTERISTICS: 'content patterns and information architecture',
      DOMAIN_FILE_TYPES: 'documentation files',
      DOMAIN_DEPENDENCIES: 'documentation tools and publishing configurations',
      DOMAIN_RELATIONSHIPS: 'content dependency relationships',
      DOMAIN_PATTERNS: 'documentation patterns',
      DOMAIN_CONFIGURATIONS: 'documentation configuration and publishing settings',
      DOMAIN_METRICS: 'content quality and accessibility metrics',
      DOMAIN_PROCEDURES: 'content creation and review procedures',
      DOMAIN_FILE_SINGULAR: 'Documentation File',
      DOMAIN_EXAMPLE_PATH: 'docs/api/authentication.md',
      DOMAIN_IMPLEMENTATION: 'Content Implementation',
      DOMAIN_CONTENT: 'documentation content',
      DOMAIN_MODIFICATIONS: 'content modifications',
      DOMAIN_RATIONALE: 'clarity/completeness',
      DOMAIN_COMMANDS: 'publication and validation commands',
      DOMAIN_IMPACT_TYPE: 'content quality impact',
      DOMAIN_BENEFITS: 'user understanding and system usability',
      DOMAIN_CHANGES: 'content changes',
      DOMAIN_ARCHITECTURE: 'content architecture',
      DOMAIN_MONITORING: 'content monitoring',
      DOMAIN_PRACTICES: 'documentation best practices',
      DOMAIN_ADVICE: 'documentation advice',
      DOMAIN_COMPONENTS: 'documentation components',
      DOMAIN_ENTITIES: 'documentation sections, guides, and content modules',
      DOMAIN_PERFORMANCE: 'Documentation Quality',
      DOMAIN_RISKS: 'Usability, clarity, and completeness risks',
      DOMAIN_EVIDENCE: 'Documentation Content',
      DOMAIN_AFFECTED_COMPONENTS: 'Documentation Sections Affected',
      DOMAIN_FILE_TYPE: 'documentation',
      DOMAIN_CODE_LANGUAGE: 'markdown',
      DOMAIN_EXAMPLE_CURRENT: '<!-- Current insufficient documentation -->\n# API\nThis API does things.',
      DOMAIN_EXAMPLE_IMPROVED: '<!-- Improved comprehensive documentation -->\n# Authentication API\n## Overview\nThe authentication API provides secure user login and token management.\n## Endpoints\n### POST /api/auth/login\n**Purpose**: Authenticate user credentials\n**Parameters**: email, password\n**Response**: JWT token and user profile',
      DOMAIN_SCRIPT_TYPE: 'Documentation Build Script',
      DOMAIN_SCRIPT_LANGUAGE: 'bash',
      DOMAIN_EXAMPLE_COMMANDS: '# Build and validate documentation\nnpm run docs:build && npm run docs:validate',
      DOMAIN_EXAMPLE_VALIDATION: '# Validate documentation improvements\nnpm run docs:link-check && npm run docs:spell-check',
      DOMAIN_FIX_TYPE: 'Content Enhancement',
      DOMAIN_UPDATE_TYPE: 'Documentation Update',
      DOMAIN_OPTIMIZATION: 'Content Optimization',
      DOMAIN_ENHANCEMENT_TYPE: 'Documentation Enhancement',
      DOMAIN_GAIN: 'clarity improvement',
      DOMAIN_SCALING_TYPE: 'Content Scaling',
      DOMAIN_TARGET: 'Quality Target',
      DOMAIN_CAPACITY_METRICS: 'quality metrics',
      DOMAIN_MONITORING_TYPE: 'Documentation Monitoring Enhancement',
      DOMAIN_MONITORING_IMPROVEMENTS: 'documentation monitoring improvements',
      DOMAIN_AUTOMATION_TYPE: 'Documentation Automation',
      DOMAIN_OPERATIONS: 'Content Operations and Monitoring',
      DOMAIN_MONITORING_CONFIG: 'documentation monitoring configuration',
      DOMAIN_ALERTING: 'Content Alerting',
      DOMAIN_ALERTING_RULES: 'content alerting rules',
      DOMAIN_BACKUP: 'Content Backup',
      DOMAIN_BACKUP_PROCEDURES: 'content backup procedures',
      DOMAIN_CONFIGURATIONS: 'content configurations',
      DOMAIN_JUSTIFICATION: 'content improvement justification',
      DOMAIN_IMPROVEMENT: 'documentation improvement',
      DOMAIN_STRUCTURES: 'content structures'
    }
  },
  'Prompt Writer': {
    domain: 'ai_interaction_design',
    specialization: 'prompt_engineering',
    description: 'AI prompt optimization, conversation design, and chatmode development',
    workflow_vars: {
      DOMAIN_UPPER: 'CHATMODE',
      DOMAIN_CONTEXT: 'chatmode files and prompt configurations',
      DOMAIN_NAME: 'chatmode',
      DOMAIN_TITLE: 'Chatmode',
      DOMAIN_FILES: 'chatmode definition files, prompt templates, and behavioral configurations',
      DOMAIN_ARTIFACTS: 'prompt sections and behavioral directives',
      DOMAIN_CHARACTERISTICS: 'conversational patterns and response behaviors',
      DOMAIN_FILE_TYPES: 'chatmode files',
      DOMAIN_DEPENDENCIES: 'prompt libraries and template configurations',
      DOMAIN_RELATIONSHIPS: 'chatmode dependency relationships',
      DOMAIN_PATTERNS: 'prompt engineering patterns',
      DOMAIN_CONFIGURATIONS: 'chatmode configuration and behavioral settings',
      DOMAIN_METRICS: 'response quality and behavioral effectiveness metrics',
      DOMAIN_PROCEDURES: 'chatmode testing and validation procedures',
      DOMAIN_FILE_SINGULAR: 'Chatmode File',
      DOMAIN_EXAMPLE_PATH: 'chatmodes/Security Engineer - Gorka.chatmode.md',
      DOMAIN_IMPLEMENTATION: 'Prompt Implementation',
      DOMAIN_CONTENT: 'chatmode prompt content',
      DOMAIN_MODIFICATIONS: 'prompt modifications',
      DOMAIN_RATIONALE: 'behavioral improvement',
      DOMAIN_COMMANDS: 'chatmode testing commands',
      DOMAIN_IMPACT_TYPE: 'behavioral impact',
      DOMAIN_BENEFITS: 'agent effectiveness and response quality',
      DOMAIN_CHANGES: 'prompt changes',
      DOMAIN_ARCHITECTURE: 'chatmode architecture',
      DOMAIN_MONITORING: 'behavioral monitoring',
      DOMAIN_PRACTICES: 'prompt engineering best practices',
      DOMAIN_ADVICE: 'prompt engineering advice',
      DOMAIN_COMPONENTS: 'chatmode components',
      DOMAIN_ENTITIES: 'prompt sections, behavioral directives, and response patterns',
      DOMAIN_PERFORMANCE: 'Chatmode Effectiveness',
      DOMAIN_RISKS: 'Behavioral, quality, and effectiveness risks',
      DOMAIN_EVIDENCE: 'Chatmode Configuration',
      DOMAIN_AFFECTED_COMPONENTS: 'Chatmode Components Affected',
      DOMAIN_FILE_TYPE: 'chatmode',
      DOMAIN_CODE_LANGUAGE: 'markdown',
      DOMAIN_EXAMPLE_CURRENT: '<!-- Current insufficient prompt -->\n## Analysis\nProvide analysis of the system.',
      DOMAIN_EXAMPLE_IMPROVED: '<!-- Improved specific prompt -->\n## 🚨 MANDATORY ANALYSIS WORKFLOW\n**CRITICAL: You MUST examine actual project files before providing any recommendations**\n### Phase 1: Current State Discovery (NEVER SKIP)\n- EXAMINE existing implementations and configurations\n- LOCATE all relevant files with exact paths',
      DOMAIN_SCRIPT_TYPE: 'Chatmode Test Script',
      DOMAIN_SCRIPT_LANGUAGE: 'bash',
      DOMAIN_EXAMPLE_COMMANDS: '# Test chatmode behavioral improvements\nnpm run chatmode:test',
      DOMAIN_EXAMPLE_VALIDATION: '# Validate chatmode effectiveness improvements\nnpm run chatmode:validate',
      DOMAIN_FIX_TYPE: 'Prompt Enhancement',
      DOMAIN_UPDATE_TYPE: 'Behavioral Update',
      DOMAIN_OPTIMIZATION: 'Prompt Optimization',
      DOMAIN_ENHANCEMENT_TYPE: 'Chatmode Enhancement',
      DOMAIN_GAIN: 'effectiveness improvement',
      DOMAIN_SCALING_TYPE: 'Prompt Scaling',
      DOMAIN_TARGET: 'Effectiveness Target',
      DOMAIN_CAPACITY_METRICS: 'effectiveness metrics',
      DOMAIN_MONITORING_TYPE: 'Behavioral Monitoring Enhancement',
      DOMAIN_MONITORING_IMPROVEMENTS: 'behavioral monitoring improvements',
      DOMAIN_AUTOMATION_TYPE: 'Prompt Automation',
      DOMAIN_OPERATIONS: 'Behavioral Operations and Monitoring',
      DOMAIN_MONITORING_CONFIG: 'behavioral monitoring configuration',
      DOMAIN_ALERTING: 'Behavioral Alerting',
      DOMAIN_ALERTING_RULES: 'behavioral alerting rules',
      DOMAIN_BACKUP: 'Chatmode Backup',
      DOMAIN_BACKUP_PROCEDURES: 'chatmode backup procedures',
      DOMAIN_CONFIGURATIONS: 'chatmode configurations',
      DOMAIN_JUSTIFICATION: 'behavioral improvement justification',
      DOMAIN_IMPROVEMENT: 'chatmode effectiveness improvement',
      DOMAIN_STRUCTURES: 'prompt structures'
    }
  }
};

/**
 * Load and process file content
 */
function loadContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath} - ${error.message}`);
    return '';
  }
}

/**
 * Load instruction module
 */
function loadInstruction(instructionName) {
  const instructionPath = path.join(__dirname, '../src/instructions', `${instructionName}.md`);
  return loadContent(instructionPath);
}

/**
 * Load domain-specific content
 */
function loadDomainContent(roleName, contentType) {
  const domainSlug = roleName.toLowerCase().replace(/\s+/g, '-');
  const contentPath = path.join(__dirname, '../src/chatmodes', `${domainSlug}-${contentType}.md`);
  return loadContent(contentPath);
}

/**
 * Compose sub-agent chatmode from template and content
 */
function composeSubAgent(roleName, config) {
  console.log(`Composing ${roleName}...`);

  // Load base template
  const templatePath = path.join(__dirname, '../src/templates/sub-agent-base.template.md');
  let template = loadContent(templatePath);

  if (!template) {
    console.error(`❌ Failed to load base template from ${templatePath}`);
    return null;
  }

  // Load instruction modules
  const evidenceRequirements = loadInstruction('evidence-requirements');
  const honestyMandates = loadInstruction('honesty-mandates');
  const projectOrchestratorIntegration = loadInstruction('project-orchestrator-integration');
  const toolsFirstPrinciple = loadInstruction('tools-first-principle');
  const responseFormatStandards = loadInstruction('response-format-standards');

  // Load our enhanced mandatory instruction modules
  const mandatoryAnalysisWorkflows = loadInstruction('mandatory-analysis-workflows');
  const mandatoryResponseFormat = loadInstruction('mandatory-response-format');

  // Load domain-specific content
  const domainExpertise = loadDomainContent(roleName, 'domain');
  const technicalCapabilities = loadDomainContent(roleName, 'capabilities');
  const focusAreas = loadDomainContent(roleName, 'focus');

  // Get current timestamp
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Apply domain-specific variable substitutions to mandatory workflows
  let processedMandatoryWorkflows = mandatoryAnalysisWorkflows;
  let processedMandatoryResponseFormat = mandatoryResponseFormat;

  if (config.workflow_vars) {
    for (const [key, value] of Object.entries(config.workflow_vars)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedMandatoryWorkflows = processedMandatoryWorkflows.replace(regex, value);
      processedMandatoryResponseFormat = processedMandatoryResponseFormat.replace(regex, value);
    }
  }

  // Apply template substitutions
  let composed = template
    .replace(/{{ROLE_NAME}}/g, roleName)
    .replace(/{{DOMAIN}}/g, config.domain)
    .replace(/{{SPECIALIZATION}}/g, config.specialization)
    .replace(/{{DOMAIN_DESCRIPTION}}/g, config.description)
    .replace(/{{TIMESTAMP}}/g, timestamp)
    .replace(/{{DOMAIN_EXPERTISE}}/g, domainExpertise)
    .replace(/{{TECHNICAL_CAPABILITIES}}/g, technicalCapabilities)
    .replace(/{{FOCUS_AREAS}}/g, focusAreas)
    .replace(/{{EVIDENCE_REQUIREMENTS}}/g, processedMandatoryWorkflows)
    .replace(/{{HONESTY_MANDATES}}/g, honestyMandates)
    .replace(/{{PROJECT_ORCHESTRATOR_INTEGRATION}}/g, projectOrchestratorIntegration)
    .replace(/{{TOOLS_FIRST_PRINCIPLE}}/g, toolsFirstPrinciple)
    .replace(/{{RESPONSE_FORMAT_STANDARDS}}/g, processedMandatoryResponseFormat);

  return composed;
}

/**
 * Main composition process
 */
function main() {
  const outputPath = path.join(__dirname, '../chatmodes');

  console.log('🔄 Starting sub-agent composition...');
  console.log(`Output directory: ${outputPath}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  let successCount = 0;
  let totalCount = Object.keys(SUB_AGENTS).length;

  // Compose each sub-agent
  for (const [roleName, config] of Object.entries(SUB_AGENTS)) {
    const composed = composeSubAgent(roleName, config);

    if (composed) {
      // Write composed chatmode
      const outputFile = path.join(outputPath, `${roleName} - Gorka.chatmode.md`);
      fs.writeFileSync(outputFile, composed);
      console.log(`✅ Generated: ${outputFile}`);
      successCount++;
    } else {
      console.error(`❌ Failed to compose: ${roleName}`);
    }
  }

  console.log(`✅ Sub-agent composition complete! (${successCount}/${totalCount} successful)`);
}

// Run composition if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { composeSubAgent, SUB_AGENTS };
