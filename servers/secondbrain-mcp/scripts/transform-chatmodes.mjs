#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Transform autonomous chatmodes into specialized sub-agent versions
 * for SecondBrain MCP delegation system
 */

// Domain extraction patterns for different chatmode types
const DOMAIN_PATTERNS = {
  'Security Engineer': {
    domain: 'security',
    description: 'cybersecurity analysis, vulnerability assessment, and security architecture',
    capabilities: [
      'OWASP Top 10 vulnerability assessment',
      'Authentication and authorization security',
      'Threat modeling and risk assessment',
      'Security code review and static analysis',
      'Compliance and regulatory requirements'
    ]
  },
  'Software Engineer': {
    domain: 'software_development',
    description: 'software architecture, code quality, and implementation best practices',
    capabilities: [
      'Code architecture and design patterns',
      'Code quality assessment and refactoring',
      'Testing strategies and implementation',
      'Performance optimization and debugging',
      'Technical debt analysis and remediation'
    ]
  },
  'Database Architect': {
    domain: 'database_architecture',
    description: 'database design, optimization, and data architecture',
    capabilities: [
      'Database schema design and optimization',
      'Query performance analysis and tuning',
      'Data modeling and relationship design',
      'Database scaling and partitioning strategies',
      'Migration planning and execution'
    ]
  },
  'DevOps Engineer': {
    domain: 'infrastructure_operations',
    description: 'infrastructure automation, deployment, and operational excellence',
    capabilities: [
      'Infrastructure as Code and automation',
      'CI/CD pipeline design and optimization',
      'Container orchestration and scaling',
      'Monitoring and observability implementation',
      'Performance optimization and capacity planning'
    ]
  },
  'Test Engineer': {
    domain: 'quality_assurance',
    description: 'testing strategy, automation, and quality assurance',
    capabilities: [
      'Test strategy development and implementation',
      'Test automation framework design',
      'Quality metrics and coverage analysis',
      'Performance and load testing',
      'Bug analysis and regression prevention'
    ]
  },
  'Software Architect': {
    domain: 'system_architecture',
    description: 'system design, architectural patterns, and technical strategy',
    capabilities: [
      'System architecture design and evaluation',
      'Technology stack selection and integration',
      'Scalability and performance architecture',
      'Microservices and distributed systems design',
      'Architecture documentation and decision records'
    ]
  },
  'Technical Writer': {
    domain: 'technical_documentation',
    description: 'technical documentation, knowledge management, and communication',
    capabilities: [
      'Technical documentation architecture and strategy',
      'API documentation and developer guides',
      'Knowledge management and information architecture',
      'Documentation quality assurance and standards',
      'User experience design for technical content'
    ]
  },
  'Design Reviewer': {
    domain: 'design_quality_assurance',
    description: 'design review, quality assessment, and improvement recommendations',
    capabilities: [
      'Design pattern analysis and evaluation',
      'Code review and quality assessment',
      'Architecture review and validation',
      'Best practice compliance verification',
      'Improvement recommendation and prioritization'
    ]
  },
  'Memory Curator': {
    domain: 'knowledge_management',
    description: 'knowledge curation, memory management, and information architecture',
    capabilities: [
      'Knowledge graph construction and maintenance',
      'Domain knowledge extraction and categorization',
      'Memory pattern optimization and validation',
      'Cross-domain knowledge integration',
      'Knowledge quality assurance and verification'
    ]
  },
  'Prompt Writer': {
    domain: 'prompt_engineering',
    description: 'prompt design, conversation optimization, and AI interaction patterns',
    capabilities: [
      'Prompt engineering and optimization',
      'Conversation flow design and validation',
      'AI behavior pattern analysis',
      'Instruction clarity and effectiveness assessment',
      'Response quality improvement strategies'
    ]
  }
};

/**
 * Extract domain expertise from autonomous chatmode content
 */
function extractDomainExpertise(content, roleName) {
  const lines = content.split('\n');
  const expertise = [];
  let inSkillsSection = false;
  let inCapabilitiesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for domain expertise sections
    if (line.includes('Core Competencies') || line.includes('Primary Skills') || line.includes('Domain Expertise')) {
      inSkillsSection = true;
      continue;
    }

    if (line.includes('Technical Capabilities') || line.includes('Specialized Skills')) {
      inCapabilitiesSection = true;
      continue;
    }

    // Extract expertise content
    if ((inSkillsSection || inCapabilitiesSection) && line.trim().startsWith('-')) {
      expertise.push(line.trim());
    }

    // Stop at major section breaks
    if (line.startsWith('## ') && (inSkillsSection || inCapabilitiesSection)) {
      if (!line.includes('Skills') && !line.includes('Capabilities') && !line.includes('Expertise')) {
        inSkillsSection = false;
        inCapabilitiesSection = false;
      }
    }
  }

  return expertise;
}

/**
 * Extract technical capabilities and tool preferences
 */
function extractTechnicalCapabilities(content) {
  const lines = content.split('\n');
  const capabilities = [];
  let inToolsSection = false;
  let inTechSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('Tools First') || line.includes('Primary Tools') || line.includes('Available Tools')) {
      inToolsSection = true;
      continue;
    }

    if (line.includes('Technical Implementation') || line.includes('Technical Approach')) {
      inTechSection = true;
      continue;
    }

    if ((inToolsSection || inTechSection) && line.trim().startsWith('-')) {
      capabilities.push(line.trim());
    }

    // Stop at major section breaks
    if (line.startsWith('## ') && (inToolsSection || inTechSection)) {
      inToolsSection = false;
      inTechSection = false;
    }
  }

  return capabilities;
}

/**
 * Transform autonomous chatmode to sub-agent version
 */
function transformChatmode(chatmodePath, templatePath, outputPath) {
  try {
    console.log(`Transforming ${chatmodePath}...`);

    // Read autonomous chatmode and template
    const chatmodeContent = fs.readFileSync(chatmodePath, 'utf8');
    const template = fs.readFileSync(templatePath, 'utf8');

    // Extract role name from filename
    const filename = path.basename(chatmodePath);
    const roleName = filename.replace(' - Gorka.chatmode.md', '');

    // Get domain configuration
    const domainConfig = DOMAIN_PATTERNS[roleName];
    if (!domainConfig) {
      console.warn(`No domain configuration found for ${roleName}, skipping...`);
      return;
    }

    // Extract content from autonomous chatmode
    const domainExpertise = extractDomainExpertise(chatmodeContent, roleName);
    const technicalCapabilities = extractTechnicalCapabilities(chatmodeContent);

    // Create domain expertise text
    const expertiseText = domainConfig.capabilities
      .map(cap => `- ${cap}`)
      .join('\n');

    // Create technical capabilities text
    const capabilitiesText = technicalCapabilities.length > 0
      ? technicalCapabilities.join('\n')
      : domainConfig.capabilities.map(cap => `- ${cap} analysis and implementation`).join('\n');

    // Get current timestamp
    const timestamp = new Date().toISOString();

    // Apply template transformations
    let subAgentContent = template
      .replace(/{{ROLE_NAME}}/g, roleName)
      .replace(/{{DOMAIN_DESCRIPTION}}/g, domainConfig.description)
      .replace(/{{TIMESTAMP}}/g, timestamp)
      .replace(/{{DOMAIN}}/g, domainConfig.domain)
      .replace(/{{PARENT_CHATMODE}}/g, filename)
      .replace(/{{DOMAIN_EXPERTISE}}/g, expertiseText)
      .replace(/{{TECHNICAL_CAPABILITIES}}/g, capabilitiesText)
      .replace(/{{ADDITIONAL_INSTRUCTIONS}}/g, ''); // Can be extended with role-specific instructions

    // Write sub-agent chatmode
    fs.writeFileSync(outputPath, subAgentContent);
    console.log(`✅ Generated sub-agent: ${outputPath}`);

  } catch (error) {
    console.error(`❌ Error transforming ${chatmodePath}:`, error.message);
  }
}

/**
 * Main transformation process
 */
function main() {
  const sourcePath = path.join(__dirname, '../../../chatmodes');
  const templatePath = path.join(__dirname, '../templates/subagent-template.md');
  const outputPath = path.join(__dirname, '../chatmodes');

  console.log('🔄 Starting chatmode transformation...');
  console.log(`Source: ${sourcePath}`);
  console.log(`Template: ${templatePath}`);
  console.log(`Output: ${outputPath}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Read all autonomous chatmodes
  const chatmodeFiles = fs.readdirSync(sourcePath)
    .filter(file => file.endsWith('.chatmode.md'))
    .filter(file => !file.includes('Project Orchestrator')); // Skip orchestrator for sub-agents

  console.log(`Found ${chatmodeFiles.length} chatmodes to transform`);

  // Transform each chatmode
  for (const file of chatmodeFiles) {
    const sourceChatmode = path.join(sourcePath, file);
    const outputChatmode = path.join(outputPath, file);

    transformChatmode(sourceChatmode, templatePath, outputChatmode);
  }

  console.log('✅ Chatmode transformation complete!');
}

// Run transformation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { transformChatmode, DOMAIN_PATTERNS };
