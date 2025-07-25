import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';

export interface VSCodeToolResult {
  content: string;
  isError: boolean;
}

/**
 * VS Code Tool Proxy - Provides sub-agents with REAL file system tool access
 *
 * Instead of trying to proxy back to VS Code, this implements the essential
 * VS Code tools directly using Node.js APIs. This gives sub-agents actual
 * tool capabilities and solves the "hallucination" problem.
 */
export class VSCodeToolProxy {
  private static instance: VSCodeToolProxy;

  // VS Code tools we can implement directly with Node.js
  private readonly VSCODE_TOOLS = [
    'read_file',
    'list_dir',
    'grep_search',
    'file_search',
    'create_file',
    'replace_string_in_file'
  ];

  private constructor() {}

  static getInstance(): VSCodeToolProxy {
    if (!VSCodeToolProxy.instance) {
      VSCodeToolProxy.instance = new VSCodeToolProxy();
    }
    return VSCodeToolProxy.instance;
  }

  /**
   * Check if a tool is a VS Code tool we can implement
   */
  isVSCodeTool(toolName: string): boolean {
    return this.VSCODE_TOOLS.includes(toolName);
  }

  /**
   * Execute a VS Code tool using Node.js APIs - REAL IMPLEMENTATION!
   */
  async executeVSCodeTool(toolName: string, args: Record<string, any>): Promise<VSCodeToolResult> {
    if (!this.isVSCodeTool(toolName)) {
      return {
        content: `ERROR: ${toolName} is not a supported tool`,
        isError: true
      };
    }

    try {
      logger.info('Executing VS Code tool', { toolName, args });

      switch (toolName) {
        case 'read_file':
          return await this.readFile(args);
        case 'list_dir':
          return await this.listDir(args);
        case 'grep_search':
          return await this.grepSearch(args);
        case 'file_search':
          return await this.fileSearch(args);
        case 'create_file':
          return await this.createFile(args);
        case 'replace_string_in_file':
          return await this.replaceStringInFile(args);
        default:
          return {
            content: `ERROR: Tool ${toolName} not yet implemented`,
            isError: true
          };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('VS Code tool execution failed', { toolName, args, error: errorMessage });

      return {
        content: `ERROR: ${toolName} failed: ${errorMessage}`,
        isError: true
      };
    }
  }

  /**
   * Read file content with line range support
   */
  private async readFile(args: Record<string, any>): Promise<VSCodeToolResult> {
    const { filePath, startLine, endLine } = args;

    if (!filePath) {
      return { content: 'ERROR: filePath is required', isError: true };
    }

    // Security: Resolve and validate path
    const resolvedPath = path.resolve(filePath);

    try {
      const content = await fs.readFile(resolvedPath, 'utf-8');

      // Handle line range if specified
      if (startLine !== undefined || endLine !== undefined) {
        const lines = content.split('\n');
        const start = Math.max(0, (startLine || 1) - 1); // Convert to 0-based
        const end = endLine ? Math.min(lines.length, endLine) : lines.length;

        const selectedLines = lines.slice(start, end);
        const result = selectedLines.join('\n');

        return {
          content: `File: \`${filePath}\`. Lines ${start + 1} to ${end} (${lines.length} lines total): \n\`\`\`\n${result}\n\`\`\``,
          isError: false
        };
      }

      return {
        content: `File: \`${filePath}\`. Full content:\n\`\`\`\n${content}\n\`\`\``,
        isError: false
      };

    } catch (error) {
      return {
        content: `ERROR: Could not read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      };
    }
  }

  /**
   * List directory contents
   */
  private async listDir(args: Record<string, any>): Promise<VSCodeToolResult> {
    const { path: dirPath } = args;

    if (!dirPath) {
      return { content: 'ERROR: path is required', isError: true };
    }

    try {
      const resolvedPath = path.resolve(dirPath);
      const items = await fs.readdir(resolvedPath, { withFileTypes: true });

      const result = items.map(item => {
        const name = item.isDirectory() ? `${item.name}/` : item.name;
        return name;
      }).join('\n');

      return {
        content: `Directory contents of ${dirPath}:\n${result}`,
        isError: false
      };

    } catch (error) {
      return {
        content: `ERROR: Could not list directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      };
    }
  }

  /**
   * Search for text in files using grep-like functionality
   */
  private async grepSearch(args: Record<string, any>): Promise<VSCodeToolResult> {
    const { query, includePattern, isRegexp } = args;

    if (!query) {
      return { content: 'ERROR: query is required', isError: true };
    }

    try {
      // For now, implement a simple file search in current directory
      const searchDir = includePattern ? path.dirname(includePattern) : process.cwd();
      const files = await this.findMatchingFiles(searchDir, includePattern || '**/*');

      const matches: string[] = [];
      const searchRegex = isRegexp ? new RegExp(query, 'i') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      for (const file of files.slice(0, 10)) { // Limit to 10 files for performance
        try {
          const content = await fs.readFile(file, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            if (searchRegex.test(line)) {
              matches.push(`${file}:${index + 1}:${line.trim()}`);
            }
          });
        } catch (e) {
          // Skip files that can't be read
        }
      }

      return {
        content: matches.length > 0 ? matches.join('\n') : 'No matches found',
        isError: false
      };

    } catch (error) {
      return {
        content: `ERROR: Search failed: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      };
    }
  }

  /**
   * Search for files by name pattern
   */
  private async fileSearch(args: Record<string, any>): Promise<VSCodeToolResult> {
    const { query } = args;

    if (!query) {
      return { content: 'ERROR: query is required', isError: true };
    }

    try {
      const files = await this.findMatchingFiles(process.cwd(), query);

      return {
        content: files.length > 0 ? files.join('\n') : 'No files found matching pattern',
        isError: false
      };

    } catch (error) {
      return {
        content: `ERROR: File search failed: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      };
    }
  }

  /**
   * Create a new file with content
   */
  private async createFile(args: Record<string, any>): Promise<VSCodeToolResult> {
    const { filePath, content } = args;

    if (!filePath) {
      return { content: 'ERROR: filePath is required', isError: true };
    }

    try {
      const resolvedPath = path.resolve(filePath);

      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

      await fs.writeFile(resolvedPath, content || '', 'utf-8');

      return {
        content: `File created successfully: ${filePath}`,
        isError: false
      };

    } catch (error) {
      return {
        content: `ERROR: Could not create file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      };
    }
  }

  /**
   * Replace string in file
   */
  private async replaceStringInFile(args: Record<string, any>): Promise<VSCodeToolResult> {
    const { filePath, oldString, newString } = args;

    if (!filePath || !oldString) {
      return { content: 'ERROR: filePath and oldString are required', isError: true };
    }

    try {
      const resolvedPath = path.resolve(filePath);
      const content = await fs.readFile(resolvedPath, 'utf-8');

      const newContent = content.replace(oldString, newString || '');

      await fs.writeFile(resolvedPath, newContent, 'utf-8');

      return {
        content: `String replaced successfully in ${filePath}`,
        isError: false
      };

    } catch (error) {
      return {
        content: `ERROR: Could not replace string in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        isError: true
      };
    }
  }

  /**
   * Helper: Find files matching a pattern
   */
  private async findMatchingFiles(dir: string, pattern: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory() && !item.name.startsWith('.')) {
          // Recursively search subdirectories (limit depth)
          if (fullPath.split(path.sep).length - process.cwd().split(path.sep).length < 5) {
            const subFiles = await this.findMatchingFiles(fullPath, pattern);
            files.push(...subFiles);
          }
        } else if (item.isFile()) {
          // Simple pattern matching
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
            if (regex.test(item.name)) {
              files.push(fullPath);
            }
          } else if (item.name.includes(pattern)) {
            files.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }

    return files;
  }

  /**
   * Get list of available VS Code tools
   */
  getAvailableVSCodeTools(): string[] {
    return [...this.VSCODE_TOOLS];
  }
}
