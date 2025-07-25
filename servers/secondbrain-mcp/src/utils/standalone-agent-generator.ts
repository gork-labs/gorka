/**
 * Standalone Agent Generator
 *
 * Utility to generate standalone expert agents from chatmode templates
 *
 * Created: 2025-07-25T20:46:49+02:00
 * Author: Staff Software Engineer - Gorka
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { logger } from '../utils/logger.js';

export interface StandaloneAgentOptions {
  chatmodesPath: string;
  templatesPath: string;
  outputPath: string;
  globalInstructionsPath: string;
}

export class StandaloneAgentGenerator {
  private options: StandaloneAgentOptions;

  constructor(options: StandaloneAgentOptions) {
    this.options = options;
  }

  /**
   * Generate all standalone agents from chatmodes
   */
  async generateAllStandaloneAgents(): Promise<string[]> {
    const generatedAgents: string[] = [];

    try {
      // Read all chatmode files
      const chatmodeFiles = readdirSync(this.options.chatmodesPath)
        .filter(file => file.endsWith('.chatmode.md'));

      // Load global instructions
      const globalInstructions = this.loadGlobalInstructions();

      // Load standalone template
      const standaloneTemplate = this.loadStandaloneTemplate();

      for (const chatmodeFile of chatmodeFiles) {
        try {
          const agentPath = await this.generateStandaloneAgent(
            chatmodeFile,
            standaloneTemplate,
            globalInstructions
          );
          generatedAgents.push(agentPath);

          logger.info('Generated standalone agent', {
            chatmode: chatmodeFile,
            output: agentPath
          });
        } catch (error) {
          logger.error('Failed to generate standalone agent', {
            chatmode: chatmodeFile,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('Standalone agent generation completed', {
        totalGenerated: generatedAgents.length,
        totalChatmodes: chatmodeFiles.length
      });

      return generatedAgents;

    } catch (error) {
      logger.error('Failed to generate standalone agents', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate a single standalone agent from a chatmode
   */
  private async generateStandaloneAgent(
    chatmodeFile: string,
    standaloneTemplate: string,
    globalInstructions: string
  ): Promise<string> {
    // Read chatmode content
    const chatmodePath = join(this.options.chatmodesPath, chatmodeFile);
    const chatmodeContent = readFileSync(chatmodePath, 'utf-8');

    // Extract chatmode name
    const chatmodeName = this.extractChatmodeName(chatmodeFile);

    // Generate standalone agent content
    const standaloneContent = this.applyTemplate(standaloneTemplate, {
      chatmodeName,
      chatmodeContent,
      globalInstructions
    });

    // Write standalone agent file
    const outputFileName = `${chatmodeName.toLowerCase().replace(/\s+/g, '-')}-standalone.md`;
    const outputPath = join(this.options.outputPath, outputFileName);

    writeFileSync(outputPath, standaloneContent, 'utf-8');

    return outputPath;
  }

  /**
   * Load global instructions from all instruction files
   */
  private loadGlobalInstructions(): string {
    try {
      const instructionFiles = readdirSync(this.options.globalInstructionsPath)
        .filter(file => file.endsWith('.instructions.md'));

      const allInstructions = instructionFiles.map(file => {
        const filePath = join(this.options.globalInstructionsPath, file);
        const content = readFileSync(filePath, 'utf-8');
        return `## ${file.replace('.instructions.md', '')}\n\n${content}`;
      }).join('\n\n---\n\n');

      return allInstructions;
    } catch (error) {
      logger.warn('Failed to load global instructions', {
        error: error instanceof Error ? error.message : String(error)
      });
      return '';
    }
  }

  /**
   * Load standalone agent template
   */
  private loadStandaloneTemplate(): string {
    const templatePath = join(this.options.templatesPath, 'standalone-agent.template');
    return readFileSync(templatePath, 'utf-8');
  }

  /**
   * Extract chatmode name from filename
   */
  private extractChatmodeName(filename: string): string {
    // Remove .chatmode.md extension and clean up name
    return basename(filename, '.chatmode.md')
      .replace(' - Gorka', '')
      .trim();
  }

  /**
   * Apply template variables to content
   */
  private applyTemplate(template: string, variables: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    return result;
  }

  /**
   * Generate a specific standalone agent by chatmode name
   */
  async generateSpecificAgent(chatmodeName: string): Promise<string> {
    const chatmodeFile = `${chatmodeName} - Gorka.chatmode.md`;
    const globalInstructions = this.loadGlobalInstructions();
    const standaloneTemplate = this.loadStandaloneTemplate();

    return this.generateStandaloneAgent(chatmodeFile, standaloneTemplate, globalInstructions);
  }

  /**
   * Get list of available chatmodes for standalone generation
   */
  getAvailableChatmodes(): string[] {
    try {
      return readdirSync(this.options.chatmodesPath)
        .filter(file => file.endsWith('.chatmode.md'))
        .map(file => this.extractChatmodeName(file));
    } catch (error) {
      logger.error('Failed to list available chatmodes', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }
}

/**
 * CLI utility for generating standalone agents
 */
export async function generateStandaloneAgents(options: Partial<StandaloneAgentOptions> = {}): Promise<void> {
  const defaultOptions: StandaloneAgentOptions = {
    chatmodesPath: './chatmodes',
    templatesPath: './src/templates',
    outputPath: './standalone-agents',
    globalInstructionsPath: './instructions'
  };

  const finalOptions = { ...defaultOptions, ...options };
  const generator = new StandaloneAgentGenerator(finalOptions);

  try {
    const generatedAgents = await generator.generateAllStandaloneAgents();

    console.log(`\n✅ Successfully generated ${generatedAgents.length} standalone agents:`);
    generatedAgents.forEach(path => console.log(`   - ${path}`));

    console.log(`\n📋 Available chatmodes:`);
    generator.getAvailableChatmodes().forEach(name => console.log(`   - ${name}`));

    console.log(`\n🚀 Standalone agents are ready for independent use!`);

  } catch (error) {
    console.error('❌ Failed to generate standalone agents:', error);
    process.exit(1);
  }
}

// CLI support when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateStandaloneAgents().catch(console.error);
}
