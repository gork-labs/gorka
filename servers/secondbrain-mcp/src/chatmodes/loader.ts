import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ChatmodeDefinition, ChatmodeNotFoundError } from '../utils/types.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { templateManager } from '../utils/template-manager.js';

export class ChatmodeLoader {
  private chatmodes: Map<string, ChatmodeDefinition> = new Map();
  private instructions: string = '';
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadInstructions();
      await this.ensureChatmodesDirectory();
      await templateManager.initialize();
      await this.loadChatmodes();
      this.initialized = true;
      logger.info('Chatmode loader initialized', {
        chatmodesPath: config.chatmodesPath,
        loadedCount: this.chatmodes.size,
        instructionsLength: this.instructions.length
      });
    } catch (error) {
      logger.error('Failed to initialize chatmode loader', {
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

  private async ensureChatmodesDirectory(): Promise<void> {
    const chatmodesPath = config.chatmodesPath;

    // Create chatmodes directory if it doesn't exist
    if (!fs.existsSync(chatmodesPath)) {
      logger.info('Creating chatmodes directory', { path: chatmodesPath });
      fs.mkdirSync(chatmodesPath, { recursive: true });
    }

    // Check if directory is empty or has no .chatmode.md files
    const files = fs.readdirSync(chatmodesPath);
    const chatmodeFiles = files.filter(file => file.endsWith('.chatmode.md'));

    if (chatmodeFiles.length === 0) {
      logger.info('No chatmode files found, copying defaults');
      await this.copyDefaultChatmodes(chatmodesPath);
    }
  }

  private async copyDefaultChatmodes(targetPath: string): Promise<void> {
    try {
      // Get the directory of this module
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // Look for chatmodes in the package
      const packageRoot = path.resolve(__dirname, '../..');
      const defaultChatmodesPath = path.join(packageRoot, 'chatmodes');

      if (fs.existsSync(defaultChatmodesPath)) {
        const defaultFiles = fs.readdirSync(defaultChatmodesPath);
        const chatmodeFiles = defaultFiles.filter(file => file.endsWith('.chatmode.md'));

        for (const file of chatmodeFiles) {
          const sourcePath = path.join(defaultChatmodesPath, file);
          const targetFilePath = path.join(targetPath, file);

          if (!fs.existsSync(targetFilePath)) {
            fs.copyFileSync(sourcePath, targetFilePath);
            logger.debug('Copied default chatmode', { file, from: sourcePath, to: targetFilePath });
          }
        }

        logger.info('Copied default chatmodes', {
          count: chatmodeFiles.length,
          from: defaultChatmodesPath,
          to: targetPath
        });
      } else {
        logger.warn('Default chatmodes directory not found in package', {
          expectedPath: defaultChatmodesPath
        });
      }
    } catch (error) {
      logger.error('Failed to copy default chatmodes', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw - server can still work without defaults
    }
  }

  private async loadChatmodes(): Promise<void> {
    const chatmodesPath = config.chatmodesPath;

    // Directory should exist now due to ensureChatmodesDirectory
    if (!fs.existsSync(chatmodesPath)) {
      throw new Error(`Chatmodes directory not found: ${chatmodesPath}`);
    }

    const files = fs.readdirSync(chatmodesPath);
    const chatmodeFiles = files.filter(file => file.endsWith('.chatmode.md'));

    if (chatmodeFiles.length === 0) {
      logger.warn('No chatmode files found', { path: chatmodesPath });
      return;
    }

    for (const file of chatmodeFiles) {
      try {
        const filePath = path.join(chatmodesPath, file);
        const chatmode = await this.parseChatmodeFile(filePath);
        this.chatmodes.set(chatmode.name, chatmode);
        logger.debug('Loaded chatmode', { name: chatmode.name, file });
      } catch (error) {
        logger.warn('Failed to load chatmode file', {
          file,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (this.chatmodes.size === 0) {
      throw new Error('No valid chatmodes found');
    }
  }

  private async parseChatmodeFile(filePath: string): Promise<ChatmodeDefinition> {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Parse frontmatter and content
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      throw new Error('Invalid chatmode file format - missing frontmatter');
    }

    const [, frontmatterStr, chatmodeContent] = frontmatterMatch;

    // Parse YAML frontmatter (simple key-value parsing)
    const frontmatter = this.parseSimpleYaml(frontmatterStr);

    if (!frontmatter.description) {
      throw new Error('Chatmode file missing required description field');
    }

    // Extract chatmode name from filename
    const filename = path.basename(filePath, '.chatmode.md');
    const name = filename.replace(' - Gorka', '');

    // Combine chatmode content with global instructions
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
    if (!this.instructions) {
      return chatmodeContent;
    }

    try {
      return templateManager.render('main-agent-wrapper', {
        chatmodeName,
        globalInstructions: this.instructions,
        chatmodeContent: chatmodeContent
      });
    } catch (error) {
      logger.error('Failed to render main agent wrapper template', {
        chatmodeName,
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to original hardcoded template
      return `# ${chatmodeName} - Enhanced with Global Instructions

## Global Agent Instructions
${this.instructions}

## Domain-Specific Expertise
${chatmodeContent}

---

You MUST follow ALL the global instructions above while applying your domain expertise. These instructions are mandatory for all agents and override any conflicting guidance in your domain-specific content.`;
    }
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

  getChatmode(name: string): ChatmodeDefinition {
    if (!this.initialized) {
      throw new Error('ChatmodeLoader not initialized');
    }

    const chatmode = this.chatmodes.get(name);
    if (!chatmode) {
      throw new ChatmodeNotFoundError(name);
    }

    return chatmode;
  }

  listChatmodes(): string[] {
    if (!this.initialized) {
      throw new Error('ChatmodeLoader not initialized');
    }

    return Array.from(this.chatmodes.keys()).sort();
  }

  getChatmodeInfo(name: string): Pick<ChatmodeDefinition, 'name' | 'description' | 'tools'> {
    const chatmode = this.getChatmode(name);
    return {
      name: chatmode.name,
      description: chatmode.description,
      tools: chatmode.tools
    };
  }

  // Get all chatmodes info for listing
  getAllChatmodesInfo(): Array<Pick<ChatmodeDefinition, 'name' | 'description' | 'tools'>> {
    if (!this.initialized) {
      throw new Error('ChatmodeLoader not initialized');
    }

    return Array.from(this.chatmodes.values())
      .map(chatmode => ({
        name: chatmode.name,
        description: chatmode.description,
        tools: chatmode.tools
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Refresh chatmodes and instructions from disk
  async refresh(): Promise<void> {
    this.chatmodes.clear();
    this.instructions = '';
    this.initialized = false;
    await templateManager.reload();
    await this.initialize();
  }

  // Check if a chatmode exists
  hasChatmode(name: string): boolean {
    return this.chatmodes.has(name);
  }

  // Get the current instructions content (for debugging/inspection)
  getInstructions(): string {
    return this.instructions;
  }

  // Get combined content for a specific chatmode (for debugging/inspection)
  getCombinedContent(name: string): string {
    const chatmode = this.getChatmode(name);
    return chatmode.content;
  }

  // Get chatmode with full instruction wrapper for sub-agents
  getChatmodeWithWrapper(name: string, isSubAgent: boolean = false): string {
    const chatmode = this.getChatmode(name);

    if (!isSubAgent) {
      return chatmode.content;
    }

    try {
      return templateManager.render('sub-agent-wrapper', {
        chatmodeContent: chatmode.content,
        chatmodeName: name
      });
    } catch (error) {
      logger.error('Failed to render sub-agent wrapper template', {
        chatmodeName: name,
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to original hardcoded template
      return `
${chatmode.content}

## CRITICAL: Sub-Agent Response Format

You are operating as a sub-agent. You MUST return your response in the following JSON format:

\`\`\`json
{
  "deliverables": {
    "documents": ["list of created/updated document paths"],
    "analysis": "your primary analysis result",
    "recommendations": ["list of actionable recommendations"]
  },
  "memory_operations": [
    {
      "operation": "create_entities|add_observations|create_relations|etc",
      "data": {...}
    }
  ],
  "metadata": {
    "chatmode": "${name}",
    "task_completion_status": "complete|partial|failed",
    "processing_time": "duration estimate",
    "confidence_level": "high|medium|low"
  }
}
\`\`\`

**IMPORTANT CONSTRAINTS for Sub-Agents:**
- You can spawn other agents up to a reasonable limit (limited access to secondbrain MCP tools)
- Focus ONLY on the specific task assigned to you
- Provide structured, actionable deliverables
- Include confidence level assessment

**Memory Operations Guidelines:**
- Capture domain knowledge, business rules, and patterns discovered
- Store WHY decisions were made, not just implementation details
- Focus on lasting business value and domain concepts
- Follow memory usage guidelines for your domain expertise

Complete your assigned task and return the structured JSON response.
`;
    }
  }
}
