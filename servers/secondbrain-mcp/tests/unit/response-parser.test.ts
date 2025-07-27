import { describe, it, expect, vi } from 'vitest';

// Mock logger to avoid config dependencies
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withSession: vi.fn().mockReturnThis(),
  }
}));

import { ResponseParser } from '../../src/utils/response-parser.js';

describe('ResponseParser Retry Mechanism', () => {
  it('should parse valid JSON response correctly', async () => {
    const validResponse = JSON.stringify({
      deliverables: {
        analysis: "Test analysis",
        recommendations: ["Rec 1", "Rec 2"],
        documents: ["Doc 1"]
      },
      memory_operations: [],
      metadata: {
        subagent: "Test Engineer",
        task_completion_status: "complete",
        processing_time: "100ms",
        confidence_level: "high"
      }
    });

    const result = await ResponseParser.parseWithRetry(validResponse, "Test Engineer");

    expect(result.deliverables.analysis).toBe("Test analysis");
    expect(result.metadata.subagent).toBe("Test Engineer");
    expect(result.metadata.task_completion_status).toBe("complete");
  });

  it('should handle malformed JSON with automatic correction', async () => {
    const malformedResponse = `Here's my analysis:
    {
      "deliverables": {
        "analysis": "This is a test analysis",
        "recommendations": ["Fix the bug", "Add tests"],
        "documents": ["analysis.md"],
      },
      "memory_operations": [],
      "metadata": {
        "subagent": "Software Engineer",
        "task_completion_status": "complete",
        "processing_time": "250ms",
        "confidence_level": "high",
      }
    }`;

    const result = await ResponseParser.parseWithRetry(malformedResponse, "Software Engineer");

    expect(result.deliverables.analysis).toBe("This is a test analysis");
    expect(result.deliverables.recommendations).toEqual(["Fix the bug", "Add tests"]);
    expect(result.metadata.subagent).toBe("Software Engineer");
  });

  it('should create fallback response for unparseable content', async () => {
    const plainTextResponse = `
    I analyzed the code and found several issues:

    1. The authentication system has security vulnerabilities
    2. The database queries are not optimized
    3. Error handling needs improvement

    I recommend implementing proper validation and adding more tests.
    `;

    const result = await ResponseParser.parseWithRetry(plainTextResponse, "Security Engineer");

    expect(result.deliverables.analysis).toContain("authentication system");
    expect(result.deliverables.recommendations).toEqual([
      "The authentication system has security vulnerabilities",
      "The database queries are not optimized",
      "Error handling needs improvement"
    ]);
    expect(result.metadata.subagent).toBe("Security Engineer");
    expect(result.metadata.task_completion_status).toBe("failed");
    expect(result.metadata.confidence_level).toBe("low");
  });

  it('should extract recommendations from bullet points', async () => {
    const bulletPointResponse = `
    Analysis complete. Here are my findings:

    - Implement proper input validation
    - Add comprehensive error handling
    - Update dependencies to latest versions
    - Configure proper logging
    - Set up monitoring and alerting

    The system needs significant improvements.
    `;

    const result = await ResponseParser.parseWithRetry(bulletPointResponse, "DevOps Engineer");

    expect(result.deliverables.recommendations).toHaveLength(5);
    expect(result.deliverables.recommendations?.[0]).toBe("Implement proper input validation");
    expect(result.deliverables.recommendations?.[4]).toBe("Set up monitoring and alerting");
  });

  it('should use retry callback for intelligent format correction', async () => {
    let retryCallbackCalled = false;
    const malformedResponse = `This is not JSON at all, just plain text response.`;

    const retryCallback = async (content: string, attempt: number) => {
      retryCallbackCalled = true;
      // Simulate AI correcting the format
      return JSON.stringify({
        deliverables: {
          analysis: "Corrected analysis via retry callback",
          recommendations: ["AI-generated fix"],
          documents: ["corrected.md"]
        },
        memory_operations: [],
        metadata: {
          subagent: "Test Agent",
          task_completion_status: "complete",
          processing_time: "retry_correction",
          confidence_level: "medium"
        }
      });
    };

    const result = await ResponseParser.parseWithRetry(malformedResponse, "Test Agent", {
      maxRetries: 2,
      retryCallback
    });

    expect(retryCallbackCalled).toBe(true);
    expect(result.deliverables.analysis).toBe("Corrected analysis via retry callback");
    expect(result.metadata.processing_time).toBe("retry_correction");
  });
});
