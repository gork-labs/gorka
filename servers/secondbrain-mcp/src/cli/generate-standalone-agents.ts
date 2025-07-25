#!/usr/bin/env node

/**
 * Generate Standalone Agents CLI
 *
 * Command-line utility to generate standalone expert agents from chatmodes
 *
 * Usage:
 *   npm run generate-standalone-agents
 *   node dist/cli/generate-standalone-agents.js
 *
 * Created: 2025-07-25T20:46:49+02:00
 * Author: Staff Software Engineer - Gorka
 */

import { generateStandaloneAgents } from '../utils/standalone-agent-generator.js';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Ensure output directory exists
const outputDir = './standalone-agents';
try {
  mkdirSync(outputDir, { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Generate standalone agents
generateStandaloneAgents({
  chatmodesPath: './chatmodes',
  templatesPath: './src/templates',
  outputPath: outputDir,
  globalInstructionsPath: './instructions'
}).catch(console.error);
