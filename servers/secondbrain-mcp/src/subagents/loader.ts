import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ChatmodeDefinition, SubagentNotFoundError } from '../utils/types.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { templateManager } from '../utils/template-manager.js';

export class SubagentLoader {
  private subagents: Map<string, ChatmodeDefinition> = new Map();
  private instructions: string = '';
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadInstructions();
      await this.ensureSubagentsDirectory();
      await templateManager.initialize();
      await this.loadSubagents();
      this.initialized = true;
      logger.info('Subagent loader initialized', {
        subagentsPath: config.subagentsPath,
        loadedCount: this.subagents.size,
        instructionsLength: this.instructions.length
      });
    } catch (error) {
      logger.error('Failed to initialize subagent loader', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async loadInstructions(): Promise<void> {
    // Get the directory of this module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Look for instructions in the package (copied during build)
    const packageRoot = path.resolve(__dirname, '../..');
    const instructionsPath = path.join(packageRoot, 'instructions');

    logger.info('Loading global instructions', { path: instructionsPath });

    if (!fs.existsSync(instructionsPath)) {
      logger.warn('Instructions directory not found', { path: instructionsPath });
      this.instructions = '';
      return;
    }

    const instructionFiles = fs.readdirSync(instructionsPath)
      .filter(file => file.endsWith('.instructions.md'))
      .sort(); // Consistent ordering

    let combinedInstructions = '';

    for (const file of instructionFiles) {
      try {
        const filePath = path.join(instructionsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Remove frontmatter from instructions if present
        const cleanContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');

        combinedInstructions += `\n\n<!-- ${file} -->\n${cleanContent}`;

        logger.debug('Loaded instruction file', { file, length: cleanContent.length });
      } catch (error) {
        logger.warn('Failed to load instruction file', {
          file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.instructions = combinedInstructions.trim();

    logger.info('Global instructions loaded', {
      filesCount: instructionFiles.length,
      totalLength: this.instructions.length,
      files: instructionFiles
    });
  }

  private async ensureSubagentsDirectory(): Promise<void> {
    const subagentsPath = config.subagentsPath;

    // Create subagents directory if it doesn't exist
    if (!fs.existsSync(subagentsPath)) {
      logger.info('Creating subagents directory', { path: subagentsPath });
      fs.mkdirSync(subagentsPath, { recursive: true });
    }

    // Check if directory is empty or has no .subagent.md files
    const files = fs.readdirSync(subagentsPath);
    const subagentFiles = files.filter(file => file.endsWith('.subagent.md') || file.endsWith('.chatmode.md'));

    if (subagentFiles.length === 0) {
      logger.info('No subagent files found, copying defaults');
      await this.copyDefaultSubagents(subagentsPath);
    }
  }

  private async copyDefaultSubagents(targetPath: string): Promise<void> {
    try {
      // Get the directory of this module
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // Look for subagents in the package
      const packageRoot = path.resolve(__dirname, '../..');
      const defaultSubagentsPath = path.join(packageRoot, 'subagents');

      if (fs.existsSync(defaultSubagentsPath)) {
        const defaultFiles = fs.readdirSync(defaultSubagentsPath);
        const subagentFiles = defaultFiles.filter(file => file.endsWith('.subagent.md') || file.endsWith('.chatmode.md'));

        for (const file of subagentFiles) {
          const sourcePath = path.join(defaultSubagentsPath, file);
          const targetFilePath = path.join(targetPath, file);

          if (!fs.existsSync(targetFilePath)) {
            fs.copyFileSync(sourcePath, targetFilePath);
            logger.debug('Copied default subagent', { file, from: sourcePath, to: targetFilePath });
          }
        }

        logger.info('Copied default subagents', {
          count: subagentFiles.length,
          from: defaultSubagentsPath,
          to: targetPath
        });
      } else {
        logger.warn('Default subagents directory not found in package', {
          expectedPath: defaultSubagentsPath
        });
      }
    } catch (error) {
      logger.error('Failed to copy default subagents', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - server can still work without defaults
    }
  }

  private async loadSubagents(): Promise<void> {
    const subagentsPath = config.subagentsPath;

    // Directory should exist now due to ensureSubagentsDirectory
    if (!fs.existsSync(subagentsPath)) {
      throw new Error(`Subagents directory not found: ${subagentsPath}`);
    }

    const files = fs.readdirSync(subagentsPath);
    const subagentFiles = files.filter(file => file.endsWith('.subagent.md') || file.endsWith('.chatmode.md'));

    if (subagentFiles.length === 0) {
      logger.warn('No subagent files found', { path: subagentsPath });
      return;
    }

    for (const file of subagentFiles) {
      try {
        const filePath = path.join(subagentsPath, file);
        const subagent = await this.parseSubagentFile(filePath);
        this.subagents.set(subagent.name, subagent);
        logger.debug('Loaded subagent', { name: subagent.name, file });
      } catch (error) {
        logger.warn('Failed to load subagent file', {
          file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (this.subagents.size === 0) {
      throw new Error('No valid subagents found');
    }
  }

  private async parseSubagentFile(filePath: string): Promise<ChatmodeDefinition> {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse frontmatter and content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      throw new Error('Invalid subagent file format - missing frontmatter');
    }

    const [, frontmatterStr, chatmodeContent] = frontmatterMatch;

    // Parse YAML frontmatter (simple key-value parsing)
    const frontmatter = this.parseSimpleYaml(frontmatterStr);

    if (!frontmatter.description) {
      throw new Error('Subagent file missing required description field');
    }

    // Extract subagent name from filename
    const filename = path.basename(filePath, filePath.endsWith('.subagent.md') ? '.subagent.md' : '.chatmode.md');
    const name = filename.replace(' - Gorka', '');

    // Combine subagent content with global instructions
    const combinedContent = this.combineContentWithInstructions(chatmodeContent.trim(), name);

    return {
      name,
      description: frontmatter.description,
      tools: frontmatter.tools || [],
      content: combinedContent,
      filePath
    };
  }

  private combineContentWithInstructions(chatmodeContent: string, chatmodeName: string): string {
    // For sub-agents, we only include essential instructions to avoid context overflow
    // The full global instructions are meant for the main orchestrator agent
    const essentialInstructions = this.getEssentialInstructionsForSubAgent();

    if (!essentialInstructions) {
      return chatmodeContent;
    }

    try {
      return templateManager.render('sub-agent-wrapper', {
        chatmodeName,
        essentialInstructions,
        chatmodeContent: chatmodeContent
      });
    } catch (error) {
      logger.error('Failed to render sub-agent wrapper template', {
        chatmodeName,
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to minimal template for sub-agents
      return `# ${chatmodeName} - Sub-Agent Specialist

## Essential Guidelines
${essentialInstructions}

## Domain-Specific Expertise
${chatmodeContent}

---

You are a specialized sub-agent focused on your domain expertise. Follow the essential guidelines while applying your specialized knowledge.`;
    }
  }

  private getEssentialInstructionsForSubAgent(): string {
    // Extract only the most critical instructions for sub-agents to avoid context overflow
    return `## Core Principles

**Tools First**: Always prefer specialized tools over CLI commands when available.

**Evidence-Based Analysis**: All recommendations must include:
- Specific file paths and line numbers
- Actual code snippets from the codebase
- Concrete implementation examples
- Confidence levels (High/Medium/Low) for findings

**Honesty Requirements**:
- Explicitly state what you can and cannot verify
- Distinguish between static analysis and runtime assessment
- Acknowledge limitations in your analysis

**Response Format**: Always respond in the required JSON format with deliverables, memory_operations, and metadata sections.`;
  }

  private parseSimpleYaml(yamlStr: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yamlStr.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      const valueStr = trimmed.substring(colonIndex + 1).trim();

      // Handle simple array format: [item1, item2, item3]
      if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        const arrayContent = valueStr.slice(1, -1);
        result[key] = arrayContent.split(',').map(item =>
          item.trim().replace(/^['"]|['"]$/g, '')
        ).filter(item => item.length > 0);
      }
      // Handle quoted strings
      else if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
               (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
        result[key] = valueStr.slice(1, -1);
      }
      // Handle plain strings
      else {
        result[key] = valueStr;
      }
    }

    return result;
  }

  getSubagent(name: string): ChatmodeDefinition {
    if (!this.initialized) {
      throw new Error('SubagentLoader not initialized');
    }

    const subagent = this.subagents.get(name);
    if (!subagent) {
      throw new SubagentNotFoundError(name);
    }

    return subagent;
  }

  listSubagents(): string[] {
    if (!this.initialized) {
      throw new Error('SubagentLoader not initialized');
    }

    return Array.from(this.subagents.keys()).sort();
  }

  getSubagentInfo(name: string): Pick<ChatmodeDefinition, 'name' | 'description' | 'tools'> {
    const subagent = this.getSubagent(name);
    return {
      name: subagent.name,
      description: subagent.description,
      tools: subagent.tools
    };
  }

  // Get all subagents info for listing
  getAllSubagentsInfo(): Array<Pick<ChatmodeDefinition, 'name' | 'description' | 'tools'>> {
    if (!this.initialized) {
      throw new Error('SubagentLoader not initialized');
    }

    return Array.from(this.subagents.values())
      .map(subagent => ({
        name: subagent.name,
        description: subagent.description,
        tools: subagent.tools
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Refresh subagents and instructions from disk
  async refresh(): Promise<void> {
    this.subagents.clear();
    this.instructions = '';
    this.initialized = false;
    await templateManager.reload();
    await this.initialize();
  }

  // Check if a subagent exists
  hasSubagent(name: string): boolean {
    return this.subagents.has(name);
  }

  // Get the current instructions content (for debugging/inspection)
  getInstructions(): string {
    return this.instructions;
  }

  // Get combined content for a specific subagent (for debugging/inspection)
  getCombinedContent(name: string): string {
    const subagent = this.getSubagent(name);
    return subagent.content;
  }

  // Get subagent with full instruction wrapper for sub-agents
  getSubagentWithWrapper(name: string, isSubAgent: boolean = false): string {
    const subagent = this.getSubagent(name);

    if (!isSubAgent) {
      return subagent.content;
    }

    try {
      return templateManager.render('sub-agent-wrapper', {
        subagentContent: subagent.content,
        subagentName: name
      });
    } catch (error) {
      logger.error('Failed to render sub-agent wrapper template', {
        subagentName: name,
        error: error instanceof Error ? error.message : String(error)
      });

      // Minimal fallback when template system fails
      return `${subagent.content}

Respond in JSON format with: deliverables, memory_operations, metadata sections.`;
    }
  }
}
