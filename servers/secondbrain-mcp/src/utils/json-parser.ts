/**
 * Forgiving JSON Parser for AI-generated content
 * Handles common JSON syntax errors from AI model responses
 */

import { logger } from './logger.js';

export interface JsonParseResult {
  success: boolean;
  data?: any;
  error?: string;
  fixesApplied?: string[];
}

/**
 * Attempts to parse JSON with various fallback strategies for common AI errors
 */
export function parseJsonForgiving(jsonString: string): JsonParseResult {
  const fixesApplied: string[] = [];
  let initialError: Error | string | null = null;

  try {
    // First, try standard JSON.parse
    const data = JSON.parse(jsonString);
    return { success: true, data };
  } catch (error) {
    initialError = error instanceof Error ? error : new Error(String(error));
    logger.debug('Standard JSON parse failed, attempting forgiving parse', {
      error: error instanceof Error ? error.message : String(error),
      contentPreview: jsonString.substring(0, 200) + '...'
    });
  }

  // Apply various fixes progressively
  let cleanedJson = jsonString;

  try {
    // Strategy 1: Extract JSON from code blocks or surrounding text
    const jsonMatch = cleanedJson.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0] !== cleanedJson) {
      cleanedJson = jsonMatch[0];
      fixesApplied.push('Extracted JSON from surrounding text');
    }

    // Strategy 2: Remove trailing commas
    cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');
    if (cleanedJson !== jsonString) {
      fixesApplied.push('Removed trailing commas');
    }

    // Strategy 3: Fix unquoted property names
    cleanedJson = cleanedJson.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    if (fixesApplied.length === 0 || cleanedJson !== jsonString) {
      fixesApplied.push('Added quotes to property names');
    }

    // Strategy 4: Fix single quotes to double quotes
    const beforeQuoteFix = cleanedJson;
    cleanedJson = cleanedJson.replace(/'/g, '"');
    if (cleanedJson !== beforeQuoteFix) {
      fixesApplied.push('Converted single quotes to double quotes');
    }

    // Strategy 5: Try to fix incomplete JSON objects
    if (!cleanedJson.trim().endsWith('}') && !cleanedJson.trim().endsWith(']')) {
      const openBraces = (cleanedJson.match(/\{/g) || []).length;
      const closeBraces = (cleanedJson.match(/\}/g) || []).length;

      if (openBraces > closeBraces) {
        cleanedJson += '}'.repeat(openBraces - closeBraces);
        fixesApplied.push('Added missing closing braces');
      }

      const openBrackets = (cleanedJson.match(/\[/g) || []).length;
      const closeBrackets = (cleanedJson.match(/\]/g) || []).length;

      if (openBrackets > closeBrackets) {
        cleanedJson += ']'.repeat(openBrackets - closeBrackets);
        fixesApplied.push('Added missing closing brackets');
      }
    }

    // Strategy 6: Handle multiline strings that break JSON
    cleanedJson = cleanedJson.replace(/:\s*"([^"]*)\n([^"]*)"/, (match, p1, p2) => {
      return `: "${p1}\\n${p2}"`;
    });

    // Try parsing the cleaned JSON
    const data = JSON.parse(cleanedJson);

    logger.info('Successfully parsed JSON with fixes', {
      fixesApplied,
      originalLength: jsonString.length,
      cleanedLength: cleanedJson.length
    });

    return { success: true, data, fixesApplied };

  } catch (finalError) {
    // Strategy 7: Try to parse as individual properties if it's an object
    try {
      const partialData = attemptPartialParse(cleanedJson);
      if (partialData) {
        fixesApplied.push('Partial property extraction');
        return { success: true, data: partialData, fixesApplied };
      }
    } catch (partialError) {
      // Ignore partial parse errors
    }

    // Strategy 8: Return a fallback object with extracted content
    const fallbackData = createFallbackObject(jsonString);
    if (fallbackData) {
      fixesApplied.push('Created fallback object from content');
      return { success: true, data: fallbackData, fixesApplied };
    }

    logger.error('All JSON parsing strategies failed', {
      originalError: initialError instanceof Error ? initialError.message : String(initialError),
      finalError: finalError instanceof Error ? finalError.message : String(finalError),
      fixesAttempted: fixesApplied,
      contentPreview: jsonString.substring(0, 300) + '...'
    });

    return {
      success: false,
      error: finalError instanceof Error ? finalError.message : String(finalError),
      fixesApplied
    };
  }
}

/**
 * Attempts to parse individual properties from malformed JSON
 */
function attemptPartialParse(jsonString: string): any {
  const result: any = {};

  // Try to extract key-value pairs using regex
  const propertyRegex = /"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|[^,}\]]+)/g;
  let match;

  while ((match = propertyRegex.exec(jsonString)) !== null) {
    const [, key, value] = match;
    try {
      // Try to parse the value
      if (value.startsWith('"') && value.endsWith('"')) {
        result[key] = value.slice(1, -1); // Remove quotes
      } else if (value === 'true' || value === 'false') {
        result[key] = value === 'true';
      } else if (value === 'null') {
        result[key] = null;
      } else if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else if (value.startsWith('[') || value.startsWith('{')) {
        result[key] = JSON.parse(value);
      } else {
        result[key] = value.trim();
      }
    } catch (parseError) {
      // If value parsing fails, store as string
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Creates a fallback object with basic structure for validation
 */
function createFallbackObject(content: string): any {
  const fallback: any = {
    deliverables: {},
    memory_operations: [],
    metadata: {
      chatmode: 'unknown',
      task_completion_status: 'partial',
      processing_time: 'parsing_error',
      confidence_level: 'low'
    }
  };

  // Try to extract some basic information
  try {
    // Look for analysis content
    const analysisMatch = content.match(/"analysis"\s*:\s*"([^"]+)"/);
    if (analysisMatch) {
      fallback.deliverables.analysis = analysisMatch[1];
    }

    // Look for recommendations
    const recommendationsMatch = content.match(/"recommendations"\s*:\s*\[([^\]]+)\]/);
    if (recommendationsMatch) {
      try {
        fallback.deliverables.recommendations = JSON.parse(`[${recommendationsMatch[1]}]`);
      } catch {
        fallback.deliverables.recommendations = [recommendationsMatch[1]];
      }
    }

    // Look for chatmode
    const chatmodeMatch = content.match(/"chatmode"\s*:\s*"([^"]+)"/);
    if (chatmodeMatch) {
      fallback.metadata.chatmode = chatmodeMatch[1];
    }

  } catch (extractError) {
    logger.warn('Content extraction failed for fallback object', {
      error: extractError instanceof Error ? extractError.message : String(extractError)
    });
  }

  return fallback;
}

/**
 * Validates that the parsed JSON has the basic structure expected for sub-agent responses
 */
export function validateSubAgentStructure(data: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!data || typeof data !== 'object') {
    issues.push('Data is not an object');
    return { valid: false, issues };
  }

  // Check for required top-level properties
  if (!data.deliverables) {
    issues.push('Missing deliverables property');
  }

  if (!data.metadata) {
    issues.push('Missing metadata property');
  }

  if (!Array.isArray(data.memory_operations)) {
    issues.push('memory_operations is not an array');
  }

  // Check metadata structure
  if (data.metadata) {
    if (!data.metadata.chatmode) {
      issues.push('Missing chatmode in metadata');
    }
    if (!data.metadata.task_completion_status) {
      issues.push('Missing task_completion_status in metadata');
    }
  }

  return { valid: issues.length === 0, issues };
}
