import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Mustache from 'mustache';
import { logger } from '../utils/logger.js';

/**
 * Template variable substitution data
 */
export interface TemplateVariables {
  [key: string]: string | string[] | number | boolean | undefined;
}

/**
 * Template manager for loading and rendering instruction templates
 */
export class TemplateManager {
  private templates: Map<string, string> = new Map();
  private templatesPath: string;
  private initialized: boolean = false;

  constructor() {
    // Get the directory of this module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // In development, templates are in src/templates (one level up from utils)
    // In production build, templates are copied to the package root
    const devTemplatesPath = path.join(__dirname, '../templates');
    const prodTemplatesPath = path.resolve(__dirname, '../..', 'templates');    // Check which path exists
    if (fs.existsSync(devTemplatesPath)) {
      this.templatesPath = devTemplatesPath;
    } else if (fs.existsSync(prodTemplatesPath)) {
      this.templatesPath = prodTemplatesPath;
    } else {
      // Fallback to dev path for error reporting
      this.templatesPath = devTemplatesPath;
    }
  }

  /**
   * Initialize the template manager by loading all templates
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      if (!fs.existsSync(this.templatesPath)) {
        throw new Error(`Templates directory not found: ${this.templatesPath}`);
      }

      const files = fs.readdirSync(this.templatesPath);
      const templateFiles = files.filter(file => file.endsWith('.template'));

      if (templateFiles.length === 0) {
        logger.warn('No template files found', { path: this.templatesPath });
        this.initialized = true;
        return;
      }

      for (const file of templateFiles) {
        try {
          const filePath = path.join(this.templatesPath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const templateName = file.replace('.template', '');

          this.templates.set(templateName, content);
          logger.debug('Loaded template', { name: templateName, file });
        } catch (error) {
          logger.warn('Failed to load template file', {
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      this.initialized = true;
      logger.info('Template manager initialized', {
        templatesPath: this.templatesPath,
        loadedCount: this.templates.size
      });
    } catch (error) {
      logger.error('Failed to initialize template manager', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Render a template with the provided variables
   */
  render(templateName: string, variables: TemplateVariables = {}): string {
    if (!this.initialized) {
      throw new Error('TemplateManager not initialized');
    }

    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    try {
      return Mustache.render(template, variables);
    } catch (error) {
      logger.error('Template rendering failed', {
        templateName,
        error: error instanceof Error ? error.message : String(error),
        variables: Object.keys(variables)
      });
      throw new Error(`Failed to render template ${templateName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a template exists
   */
  hasTemplate(templateName: string): boolean {
    return this.templates.has(templateName);
  }

  /**
   * Get list of available template names
   */
  getTemplateNames(): string[] {
    return Array.from(this.templates.keys()).sort();
  }

  /**
   * Reload templates from disk
   */
  async reload(): Promise<void> {
    this.templates.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Get raw template content (for debugging)
   */
  getRawTemplate(templateName: string): string | undefined {
    return this.templates.get(templateName);
  }

  /**
   * Create a template renderer with pre-bound variables
   */
  createRenderer(baseVariables: TemplateVariables = {}) {
    return {
      render: (templateName: string, additionalVariables: TemplateVariables = {}) => {
        const mergedVariables = { ...baseVariables, ...additionalVariables };
        return this.render(templateName, mergedVariables);
      }
    };
  }
}

// Export singleton instance
export const templateManager = new TemplateManager();
