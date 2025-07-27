import { SubAgentResponse } from './types.js';
import { logger } from './logger.js';

export interface ParseRetryOptions {
  maxRetries?: number;
  retryCallback?: (originalContent: string, attempt: number) => Promise<string>;
}

/**
 * Enhanced response parser with automatic retry and format correction
 */
export class ResponseParser {
  private static readonly DEFAULT_MAX_RETRIES = 2;

  /**
   * Parse sub-agent response with retry mechanism
   */
  static async parseWithRetry(
    responseText: string,
    chatmodeName: string,
    options: ParseRetryOptions = {}
  ): Promise<SubAgentResponse> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    let lastError: Error | null = null;

    // Try parsing with automatic format correction first
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let contentToParse = responseText;

        // Apply format corrections on retries
        if (attempt > 0) {
          contentToParse = this.attemptFormatCorrection(responseText);

          // If retry callback is provided, use it for intelligent retry
          if (options.retryCallback && attempt === 1) {
            try {
              contentToParse = await options.retryCallback(responseText, attempt);
            } catch (callbackError) {
              logger.warn('Retry callback failed, using format correction', {
                chatmode: chatmodeName,
                attempt,
                error: callbackError instanceof Error ? callbackError.message : String(callbackError)
              });
            }
          }
        }

        const result = this.parseContent(contentToParse, chatmodeName);

        if (attempt > 0) {
          logger.info('Successfully parsed after retry', {
            chatmode: chatmodeName,
            attempt,
            originalLength: responseText.length,
            correctedLength: contentToParse.length
          });
        }

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          logger.warn('Parse attempt failed, retrying', {
            chatmode: chatmodeName,
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
            contentPreview: responseText.substring(0, 150)
          });
        }
      }
    }

    // All retries failed, create fallback response
    logger.error('All parse attempts failed, using fallback', {
      chatmode: chatmodeName,
      attempts: maxRetries + 1,
      finalError: lastError?.message,
      contentLength: responseText.length
    });

    return this.createFallbackResponse(responseText, chatmodeName);
  }

  /**
   * Parse content without retry (original behavior)
   */
  static parseContent(responseText: string, chatmodeName: string): SubAgentResponse {
    // Extract JSON from response text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in sub-agent response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and ensure all required fields
    return {
      deliverables: {
        documents: Array.isArray(parsed.deliverables?.documents)
          ? parsed.deliverables.documents
          : undefined,
        analysis: parsed.deliverables?.analysis || undefined,
        recommendations: Array.isArray(parsed.deliverables?.recommendations)
          ? parsed.deliverables.recommendations
          : undefined
      },
      memory_operations: Array.isArray(parsed.memory_operations)
        ? parsed.memory_operations
        : [],
      metadata: {
        subagent: parsed.metadata?.subagent || chatmodeName,
        task_completion_status: parsed.metadata?.task_completion_status || 'complete',
        processing_time: parsed.metadata?.processing_time || 'unknown',
        confidence_level: parsed.metadata?.confidence_level || 'medium'
      }
    };
  }

  /**
   * Attempt automatic format correction on malformed responses
   */
  private static attemptFormatCorrection(content: string): string {
    let corrected = content;

    // Remove common formatting issues
    corrected = corrected.replace(/```json\s*/, '').replace(/```\s*$/, '');
    corrected = corrected.replace(/^[^{]*/, ''); // Remove text before first {

    // Find the last complete } to handle truncated responses
    const lastBraceIndex = corrected.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      corrected = corrected.substring(0, lastBraceIndex + 1);
    }

    // Try to fix common JSON issues
    corrected = corrected.replace(/,\s*}/g, '}'); // Remove trailing commas in objects
    corrected = corrected.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

    // Fix unescaped quotes in strings (basic attempt)
    corrected = corrected.replace(/: "([^"]*)"([^",}\]]*)"([^",}\]]*)"/, ': "$1\\"$2\\"$3"');

    // Ensure the JSON ends properly
    if (!corrected.endsWith('}')) {
      corrected += '}';
    }

    return corrected;
  }

  /**
   * Create fallback response when all parsing attempts fail
   */
  private static createFallbackResponse(content: string, chatmodeName: string): SubAgentResponse {
    return {
      deliverables: {
        analysis: this.extractAnalysisFromText(content),
        recommendations: this.extractRecommendationsFromText(content),
        documents: ['Parsing failed - raw content preserved']
      },
      memory_operations: [],
      metadata: {
        subagent: chatmodeName,
        task_completion_status: content.toLowerCase().includes('error') ? 'failed' : 'partial',
        processing_time: 'parsing_failed',
        confidence_level: 'low'
      }
    };
  }

  /**
   * Extract analysis-like content from plain text
   */
  private static extractAnalysisFromText(content: string): string {
    // Try to find analysis-like content
    const lines = content.split('\n').filter(line =>
      line.length > 30 &&
      !line.startsWith('#') &&
      !line.includes('```') &&
      line.trim().length > 0
    );

    if (lines.length === 0) {
      // Return first 500 chars if no structured content found
      return content.substring(0, 500) + (content.length > 500 ? '...' : '');
    }

    // Return first few substantial lines
    return lines.slice(0, 3).join('\n');
  }

  /**
   * Extract recommendations from plain text
   */
  private static extractRecommendationsFromText(content: string): string[] {
    const recommendations: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Look for bullet points or numbered lists
      if (trimmed.match(/^[-*]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const rec = trimmed.replace(/^[-*\d.\s]+/, '').trim();
        if (rec.length > 10) {
          recommendations.push(rec);
        }
      }
    }

    if (recommendations.length === 0) {
      return ['See analysis for details'];
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }
}
