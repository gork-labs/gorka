#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Compose sub-agent chatmodes from templates, instructions, and domain-specific content
 */

// Sub-agent configurations
const SUB_AGENTS = {
  'Security Engineer': {
    domain: 'security',
    specialization: 'cybersecurity_analysis',
    description: 'cybersecurity analysis, vulnerability assessment, and security architecture'
  },
  'Software Engineer': {
    domain: 'software_development',
    specialization: 'code_quality_analysis',
    description: 'software architecture, code quality, and implementation best practices'
  },
  'Database Architect': {
    domain: 'database_architecture',
    specialization: 'data_architecture_design',
    description: 'database design, optimization, and data architecture'
  },
  'DevOps Engineer': {
    domain: 'infrastructure_operations',
    specialization: 'infrastructure_automation',
    description: 'infrastructure automation, deployment, and operational excellence'
  },
  'Test Engineer': {
    domain: 'quality_assurance',
    specialization: 'testing_strategy',
    description: 'testing strategy, automation, and quality assurance'
  },
  'Technical Writer': {
    domain: 'technical_communication',
    specialization: 'documentation_strategy',
    description: 'technical documentation, user guides, and knowledge transfer'
  },
  'Prompt Writer': {
    domain: 'ai_interaction_design',
    specialization: 'prompt_engineering',
    description: 'AI prompt optimization, conversation design, and chatmode development'
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

  // Load domain-specific content
  const domainExpertise = loadDomainContent(roleName, 'domain');
  const technicalCapabilities = loadDomainContent(roleName, 'capabilities');
  const focusAreas = loadDomainContent(roleName, 'focus');

  // Get current timestamp
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

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
    .replace(/{{EVIDENCE_REQUIREMENTS}}/g, evidenceRequirements)
    .replace(/{{HONESTY_MANDATES}}/g, honestyMandates)
    .replace(/{{PROJECT_ORCHESTRATOR_INTEGRATION}}/g, projectOrchestratorIntegration)
    .replace(/{{TOOLS_FIRST_PRINCIPLE}}/g, toolsFirstPrinciple)
    .replace(/{{RESPONSE_FORMAT_STANDARDS}}/g, responseFormatStandards);

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
