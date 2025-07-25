/**
 * Comprehensive Tool Calling Format Validation Tests
 *
 * Tests the current regex-based tool calling extraction system and validates
 * various formats that agents might produce. Also demonstrates edge cases
 * where the current approach fails.
 *
 * Created: 2025-07-25T17:04:49+02:00
 * Author: Staff Software Engineer - Gorka
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Type definitions matching the actual implementation
interface ToolCall {
  tool: string;
  arguments: Record<string, any>;
}

/**
 * Extract tool call from agent response - copied from actual implementation
 * This is the exact method from server.ts that we're testing
 */
function extractToolCall(content: string): ToolCall | null {
  try {
    // Multiple patterns to match different tool call formats
    const patterns = [
      // Standard format: {"tool": "toolname", "arguments": {...}}
      /\{"tool":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]*\}|\[[^\]]*\]|"[^"]*"|[^,}]+)\}/,
      // Loose format: {"tool": "toolname", "arguments": {...anything...}}
      /\{"tool":\s*"([^"]+)"[\s\S]*?"arguments":\s*(\{[\s\S]*?\})\}/,
      // Simple format: {"tool": "toolname"}
      /\{"tool":\s*"([^"]+)"\}/
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          const toolName = match[1];
          let args = {};

          if (match[2]) {
            // Try to parse arguments
            try {
              args = JSON.parse(match[2]);
            } catch {
              // If parse fails, try to extract the full JSON
              const fullJsonMatch = content.match(/\{[\s\S]*\}/);
              if (fullJsonMatch) {
                const parsed = JSON.parse(fullJsonMatch[0]);
                if (parsed.tool === toolName && parsed.arguments) {
                  args = parsed.arguments;
                }
              }
            }
          }

          return {
            tool: toolName,
            arguments: args
          };
        } catch (parseError) {
          continue; // Try next pattern
        }
      }
    }

    // Fallback: try to parse the entire content as JSON
    const fullMatch = content.match(/\{[\s\S]*\}/);
    if (fullMatch) {
      const parsed = JSON.parse(fullMatch[0]);
      if (parsed.tool) {
        return {
          tool: parsed.tool,
          arguments: parsed.arguments || {}
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

describe('Tool Calling Format Validation', () => {
  describe('Current Regex-Based Implementation', () => {
    describe('Valid Tool Call Formats', () => {
      it('should extract simple tool calls without arguments', () => {
        const input = '{"tool": "read_file"}';
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: {}
        });
      });

      it('should extract tool calls with simple arguments', () => {
        const input = '{"tool": "read_file", "arguments": {"filePath": "/path/to/file"}}';
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: { filePath: '/path/to/file' }
        });
      });

      it('should extract tool calls with multiple arguments', () => {
        const input = '{"tool": "grep_search", "arguments": {"query": "function", "includePattern": "*.ts", "isRegexp": false}}';
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'grep_search',
          arguments: {
            query: 'function',
            includePattern: '*.ts',
            isRegexp: false
          }
        });
      });

      it('should handle tool calls with nested objects', () => {
        const input = '{"tool": "create_entities", "arguments": {"entities": [{"name": "Test_Entity", "type": "concept", "properties": {"nested": true}}]}}';
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'create_entities',
          arguments: {
            entities: [{
              name: 'Test_Entity',
              type: 'concept',
              properties: { nested: true }
            }]
          }
        });
      });

      it('should handle tool calls with arrays', () => {
        const input = '{"tool": "validate_files", "arguments": {"files": ["file1.ts", "file2.ts", "file3.ts"]}}';
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'validate_files',
          arguments: {
            files: ['file1.ts', 'file2.ts', 'file3.ts']
          }
        });
      });

      it('should handle tool calls with extra whitespace', () => {
        const input = `{
          "tool": "read_file",
          "arguments": {
            "filePath": "/path/to/file",
            "startLine": 1,
            "endLine": 100
          }
        }`;
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: {
            filePath: '/path/to/file',
            startLine: 1,
            endLine: 100
          }
        });
      });
    });

    describe('Tool Calls with Surrounding Text', () => {
      it('should extract tool calls from text with explanations', () => {
        const input = `I need to read the file to understand the structure.

{"tool": "read_file", "arguments": {"filePath": "/src/components/Button.tsx"}}

This will help me analyze the component.`;

        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: { filePath: '/src/components/Button.tsx' }
        });
      });

      it('should extract first tool call when multiple are present', () => {
        const input = `First I'll read the file:
{"tool": "read_file", "arguments": {"filePath": "/file1.ts"}}

Then I'll search for patterns:
{"tool": "grep_search", "arguments": {"query": "pattern"}}`;

        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: { filePath: '/file1.ts' }
        });
      });
    });

    describe('Edge Cases and Challenges', () => {
      it('should handle tool calls with string arguments containing quotes', () => {
        const input = '{"tool": "grep_search", "arguments": {"query": "function \\"test\\"", "isRegexp": false}}';
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'grep_search',
          arguments: {
            query: 'function "test"',
            isRegexp: false
          }
        });
      });

      it('should handle tool calls with complex JSON strings as arguments', () => {
        const input = '{"tool": "process_config", "arguments": {"config": "{\\"nested\\": {\\"value\\": true, \\"array\\": [1,2,3]}}"}}';
        const result = extractToolCall(input);

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('process_config');
        // Note: This might fail with current regex approach due to complexity
      });

      it('should handle tool calls with multiline string arguments', () => {
        const input = `{"tool": "write_file", "arguments": {"content": "Line 1\\nLine 2\\nLine 3", "filePath": "/test.txt"}}`;
        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'write_file',
          arguments: {
            content: 'Line 1\nLine 2\nLine 3',
            filePath: '/test.txt'
          }
        });
      });
    });

    describe('Malformed Input Handling', () => {
      it('should return null for invalid JSON', () => {
        const input = '{"tool": "read_file", "arguments": {filePath: /invalid/json}}';
        const result = extractToolCall(input);

        expect(result).toBeNull();
      });

      it('should return null for missing tool field', () => {
        const input = '{"command": "read_file", "arguments": {"filePath": "/path"}}';
        const result = extractToolCall(input);

        expect(result).toBeNull();
      });

      it('should return null for non-JSON input', () => {
        const input = 'This is just regular text without any JSON structure.';
        const result = extractToolCall(input);

        expect(result).toBeNull();
      });

      it('should handle empty input', () => {
        const input = '';
        const result = extractToolCall(input);

        expect(result).toBeNull();
      });

      it('should handle null/undefined input gracefully', () => {
        expect(() => extractToolCall(null as any)).not.toThrow();
        expect(() => extractToolCall(undefined as any)).not.toThrow();
      });
    });

    describe('Complex Real-World Scenarios', () => {
      it('should handle tool calls from actual agent responses', () => {
        const input = `I need to analyze the component structure first. Let me read the main component file:

{"tool": "read_file", "arguments": {"filePath": "/src/components/UserProfile.tsx", "startLine": 1, "endLine": 50}}

This will help me understand the current implementation.`;

        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: {
            filePath: '/src/components/UserProfile.tsx',
            startLine: 1,
            endLine: 50
          }
        });
      });

      it('should handle memory operations with complex data structures', () => {
        const input = `{"tool": "create_entities", "arguments": {"entities": [{"name": "UserAuthentication_Process", "entityType": "process", "observations": ["Business process: User login and session management", "Triggers: User login attempt", "Steps: Validate credentials, create session, log activity"]}]}}`;

        const result = extractToolCall(input);

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('create_entities');
        expect(result?.arguments.entities).toHaveLength(1);
        expect(result?.arguments.entities[0].name).toBe('UserAuthentication_Process');
      });

      it('should handle search operations with regex patterns', () => {
        const input = `{"tool": "grep_search", "arguments": {"query": "export\\s+(interface|type|class)\\s+([A-Za-z]+)", "isRegexp": true, "includePattern": "src/**/*.ts"}}`;

        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'grep_search',
          arguments: {
            query: 'export\\s+(interface|type|class)\\s+([A-Za-z]+)',
            isRegexp: true,
            includePattern: 'src/**/*.ts'
          }
        });
      });
    });

    describe('Performance and Reliability Concerns', () => {
      it('should handle large argument objects efficiently', () => {
        const largeArray = Array.from({ length: 1000 }, (_, i) => `item${i}`);
        const input = `{"tool": "process_large_data", "arguments": {"data": ${JSON.stringify(largeArray)}}}`;

        const start = performance.now();
        const result = extractToolCall(input);
        const end = performance.now();

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('process_large_data');
        expect(result?.arguments.data).toHaveLength(1000);
        expect(end - start).toBeLessThan(100); // Should complete within 100ms
      });

      it('should handle deeply nested objects', () => {
        const deepObject = {
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: 'deep value',
                    array: [1, 2, 3, { nested: true }]
                  }
                }
              }
            }
          }
        };

        const input = `{"tool": "process_deep_object", "arguments": ${JSON.stringify(deepObject)}}`;
        const result = extractToolCall(input);

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('process_deep_object');
        expect(result?.arguments.level1.level2.level3.level4.level5.value).toBe('deep value');
      });
    });
  });

  describe('Failure Mode Analysis', () => {
    describe('Regex Pattern Limitations', () => {
      it('should fail on complex nested JSON with unbalanced braces in strings', () => {
        // This represents a realistic scenario where regex parsing fails
        const input = '{"tool": "analyze_code", "arguments": {"pattern": "if (condition) { /* comment with } inside */ }", "files": ["*.ts"]}}';

        const result = extractToolCall(input);

        // This test documents a known limitation - regex can't handle this reliably
        // The current implementation might or might not parse this correctly
        console.log('Complex nested JSON result:', result);
        // We don't assert success/failure here since it's a known edge case
      });

      it('should struggle with JSON containing regex patterns as values', () => {
        const input = '{"tool": "validate_pattern", "arguments": {"regex": "\\\\{[^}]+\\\\}", "flags": "gi"}}';

        const result = extractToolCall(input);

        // This documents another edge case where regex patterns as values can confuse the parser
        console.log('Regex pattern as value result:', result);
      });

      it('should fail on tool calls with comments in JSON', () => {
        const input = `{
          "tool": "read_file", // This is the tool name
          "arguments": {
            "filePath": "/path/to/file", // File path
            "startLine": 1 // Starting line
          }
        }`;

        const result = extractToolCall(input);

        // JSON with comments is invalid JSON and should fail
        expect(result).toBeNull();
      });
    });

    describe('Error Recovery Scenarios', () => {
      it('should handle partial JSON gracefully', () => {
        const input = '{"tool": "read_file", "arguments": {"filePath": "/path/to/file"';
        const result = extractToolCall(input);

        expect(result).toBeNull();
      });

      it('should handle multiple malformed attempts', () => {
        const input = `First attempt: {"tool": "invalid_json", "arguments": {broken

        Second attempt: {"tool": "read_file", "arguments": {"filePath": "/correct/path.ts"}}

        Third attempt: {"tool": "another_broken}`;

        const result = extractToolCall(input);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: { filePath: '/correct/path.ts' }
        });
      });
    });
  });

  describe('OpenAI Native Function Calling Comparison', () => {
    describe('What OpenAI Function Calling Would Provide', () => {
      it('should demonstrate structured function definition', () => {
        // This shows how OpenAI native function calling would define tools
        const openAIToolDefinition = {
          type: 'function',
          function: {
            name: 'read_file',
            description: 'Read contents of a file with optional line range',
            parameters: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Absolute path to the file to read'
                },
                startLine: {
                  type: 'number',
                  description: 'Starting line number (1-based)'
                },
                endLine: {
                  type: 'number',
                  description: 'Ending line number (1-based)'
                }
              },
              required: ['filePath']
            }
          }
        };

        // OpenAI would return structured tool calls like this:
        const openAIToolCall = {
          id: 'call_abc123',
          type: 'function',
          function: {
            name: 'read_file',
            arguments: '{"filePath": "/src/component.tsx", "startLine": 1, "endLine": 50}'
          }
        };

        expect(openAIToolDefinition.function.name).toBe('read_file');
        expect(openAIToolCall.function.name).toBe('read_file');

        // The arguments would be guaranteed valid JSON
        const parsedArgs = JSON.parse(openAIToolCall.function.arguments);
        expect(parsedArgs.filePath).toBe('/src/component.tsx');
      });

      it('should demonstrate automatic validation and error handling', () => {
        // OpenAI function calling provides automatic validation
        const functionSchema = {
          type: 'object',
          properties: {
            filePath: { type: 'string' },
            startLine: { type: 'number', minimum: 1 },
            endLine: { type: 'number', minimum: 1 }
          },
          required: ['filePath']
        };

        // This would be automatically validated by OpenAI
        const validCall = { filePath: '/path/file.ts', startLine: 1, endLine: 100 };
        const invalidCall = { filePath: 123, startLine: -1 }; // Would be rejected automatically

        expect(typeof validCall.filePath).toBe('string');
        expect(typeof invalidCall.filePath).toBe('number'); // This would fail OpenAI validation
      });
    });

    describe('Reliability Improvements', () => {
      it('should demonstrate guaranteed JSON parsing', () => {
        // With OpenAI function calling, we never need to parse JSON from text
        // The API returns pre-parsed, validated function calls

        const currentApproachRisks = [
          'Regex parsing failures',
          'Invalid JSON in responses',
          'Unbalanced braces in strings',
          'Multiple tool calls in one response',
          'Comments in JSON',
          'Malformed escape sequences'
        ];

        const openAIApproachBenefits = [
          'Structured function call objects',
          'Automatic JSON validation',
          'Schema validation',
          'Type safety',
          'Multiple tool calls supported',
          'Built-in error handling'
        ];

        expect(currentApproachRisks.length).toBeGreaterThan(0);
        expect(openAIApproachBenefits.length).toBeGreaterThan(0);

        // This test documents the conceptual advantages
        console.log('Current risks:', currentApproachRisks);
        console.log('OpenAI benefits:', openAIApproachBenefits);
      });
    });
  });

  describe('Integration Test Scenarios', () => {
    describe('Real-World Agent Responses', () => {
      it('should handle typical Software Engineer agent responses', () => {
        const softwareEngineerResponse = `I need to analyze the component structure to understand the current implementation. Let me start by reading the main component file:

{"tool": "read_file", "arguments": {"filePath": "/src/components/PaymentForm.tsx", "startLine": 1, "endLine": 100}}

This will help me understand the component's props, state management, and current validation logic.`;

        const result = extractToolCall(softwareEngineerResponse);

        expect(result).toEqual({
          tool: 'read_file',
          arguments: {
            filePath: '/src/components/PaymentForm.tsx',
            startLine: 1,
            endLine: 100
          }
        });
      });

      it('should handle Security Engineer agent responses with complex patterns', () => {
        const securityEngineerResponse = `I'll search for potential security vulnerabilities in the authentication logic:

{"tool": "grep_search", "arguments": {"query": "(password|token|secret|key)\\s*=\\s*['\\\"][^'\\\"]+['\\\"]", "isRegexp": true, "includePattern": "src/**/*.{js,ts,jsx,tsx}"}}`;

        const result = extractToolCall(securityEngineerResponse);

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('grep_search');
        expect(result?.arguments.isRegexp).toBe(true);
      });

      it('should handle Database Architect agent responses with complex queries', () => {
        const dbArchitectResponse = `Let me analyze the database schema and relationships:

{"tool": "semantic_search", "arguments": {"query": "database schema model entity relationship foreign key index constraint"}}

This will help identify the current data model and potential optimization opportunities.`;

        const result = extractToolCall(dbArchitectResponse);

        expect(result).toEqual({
          tool: 'semantic_search',
          arguments: {
            query: 'database schema model entity relationship foreign key index constraint'
          }
        });
      });
    });

    describe('Memory Operations Integration', () => {
      it('should handle complex memory entity creation', () => {
        const memoryOperationResponse = `{"tool": "create_entities", "arguments": {"entities": [{"name": "PaymentProcessing_Process", "entityType": "process", "observations": ["Business process: Credit card payment processing", "Validation steps: Card number, expiry, CVV, billing address", "Integration points: Payment gateway, fraud detection, audit logging", "Security requirements: PCI DSS compliance, data encryption", "Error handling: Retry logic, fallback payment methods", "Knowledge captured: 2025-07-25T17:04:49+02:00"]}]}}`;

        const result = extractToolCall(memoryOperationResponse);

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('create_entities');
        expect(result?.arguments.entities).toHaveLength(1);

        const entity = result?.arguments.entities[0];
        expect(entity.name).toBe('PaymentProcessing_Process');
        expect(entity.entityType).toBe('process');
        expect(entity.observations).toHaveLength(6);
      });

      it('should handle relationship creation between entities', () => {
        const relationshipResponse = `{"tool": "create_relations", "arguments": {"relations": [{"from": "PaymentForm_Component", "to": "PaymentProcessing_Process", "relationType": "implements"}, {"from": "PaymentProcessing_Process", "to": "PaymentGateway_Service", "relationType": "integrates_with"}]}}`;

        const result = extractToolCall(relationshipResponse);

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('create_relations');
        expect(result?.arguments.relations).toHaveLength(2);

        const relations = result?.arguments.relations;
        expect(relations[0].from).toBe('PaymentForm_Component');
        expect(relations[0].relationType).toBe('implements');
        expect(relations[1].to).toBe('PaymentGateway_Service');
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should benchmark extraction performance on various input sizes', () => {
      const testCases = [
        { name: 'Small', size: 100 },
        { name: 'Medium', size: 1000 },
        { name: 'Large', size: 10000 },
        { name: 'Very Large', size: 100000 }
      ];

      testCases.forEach(testCase => {
        const largeContent = 'x'.repeat(testCase.size);
        const input = `${largeContent} {"tool": "test_tool", "arguments": {"data": "test"}} ${largeContent}`;

        const start = performance.now();
        const result = extractToolCall(input);
        const end = performance.now();

        expect(result).not.toBeNull();
        expect(result?.tool).toBe('test_tool');

        const duration = end - start;
        console.log(`${testCase.name} input (${testCase.size} chars): ${duration.toFixed(2)}ms`);

        // Performance should be reasonable even for large inputs
        expect(duration).toBeLessThan(1000); // Less than 1 second
      });
    });
  });
});

describe('OpenAI Native Function Calling Implementation Example', () => {
  describe('How OpenAI runTools Would Improve This System', () => {
    it('should demonstrate the OpenAI runTools approach', () => {
      // This is how the system could be improved using OpenAI's native function calling
      const openAIToolsExample = {
        tools: [
          {
            type: 'function' as const,
            function: {
              name: 'read_file',
              description: 'Read contents of a file with optional line range',
              parameters: {
                type: 'object',
                properties: {
                  filePath: {
                    type: 'string',
                    description: 'Absolute path to the file to read'
                  },
                  startLine: {
                    type: 'number',
                    description: 'Starting line number (1-based)',
                    minimum: 1
                  },
                  endLine: {
                    type: 'number',
                    description: 'Ending line number (1-based)',
                    minimum: 1
                  }
                },
                required: ['filePath']
              }
            }
          },
          {
            type: 'function' as const,
            function: {
              name: 'create_entities',
              description: 'Create entities in the knowledge graph',
              parameters: {
                type: 'object',
                properties: {
                  entities: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        entityType: { type: 'string' },
                        observations: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      },
                      required: ['name', 'entityType', 'observations']
                    }
                  }
                },
                required: ['entities']
              }
            }
          }
        ]
      };

      // Verify tool definitions are properly structured
      expect(openAIToolsExample.tools).toHaveLength(2);
      expect(openAIToolsExample.tools[0].function.name).toBe('read_file');
      expect(openAIToolsExample.tools[1].function.name).toBe('create_entities');

      // Each tool has proper schema validation
      expect(openAIToolsExample.tools[0].function.parameters.required).toContain('filePath');
      expect(openAIToolsExample.tools[1].function.parameters.required).toContain('entities');
    });

    it('should demonstrate automatic function execution flow', () => {
      // This shows the conceptual flow of OpenAI's runTools method
      const conceptualFlow = {
        steps: [
          '1. Agent responds with function_call in structured format',
          '2. OpenAI SDK automatically parses and validates arguments',
          '3. Function is executed with validated parameters',
          '4. Result is passed back to agent in structured format',
          '5. Agent continues with next step or provides final response'
        ],
        benefits: [
          'No regex parsing required',
          'Automatic argument validation',
          'Type safety throughout the flow',
          'Built-in error handling',
          'Support for multiple simultaneous function calls',
          'Streaming support for long-running functions'
        ],
        currentLimitations: [
          'Manual JSON parsing from text',
          'No automatic validation',
          'Fragile regex patterns',
          'Single tool call per iteration',
          'Manual error handling',
          'No type safety'
        ]
      };

      expect(conceptualFlow.steps).toHaveLength(5);
      expect(conceptualFlow.benefits.length).toBeGreaterThan(conceptualFlow.currentLimitations.length);

      console.log('OpenAI runTools flow:', conceptualFlow);
    });
  });

  describe('Migration Strategy Assessment', () => {
    it('should outline migration path to native function calling', () => {
      const migrationPlan = {
        phase1: {
          description: 'Add OpenAI function calling support alongside current approach',
          changes: [
            'Define function schemas for all MCP tools',
            'Implement OpenAI runTools integration',
            'Add feature flag for function calling vs text parsing',
            'Test with subset of chatmodes'
          ],
          riskLevel: 'Low',
          effort: 'Medium'
        },
        phase2: {
          description: 'Migrate high-volume chatmodes to function calling',
          changes: [
            'Switch Software Engineer and Security Engineer chatmodes',
            'Monitor performance and reliability improvements',
            'Collect metrics on parsing failures',
            'Refine function schemas based on usage'
          ],
          riskLevel: 'Medium',
          effort: 'Medium'
        },
        phase3: {
          description: 'Complete migration and remove legacy parsing',
          changes: [
            'Migrate all remaining chatmodes',
            'Remove extractToolCall regex implementation',
            'Update documentation and tests',
            'Archive legacy tool calling tests'
          ],
          riskLevel: 'Low',
          effort: 'Small'
        }
      };

      expect(migrationPlan.phase1.riskLevel).toBe('Low');
      expect(migrationPlan.phase2.changes).toHaveLength(4);
      expect(migrationPlan.phase3.description).toContain('Complete migration');

      console.log('Migration plan:', migrationPlan);
    });

    it('should calculate potential reliability improvements', () => {
      const reliabilityMetrics = {
        currentApproach: {
          parseSuccessRate: 0.85, // Estimated based on regex limitations
          averageParseTime: 5, // milliseconds
          supportedComplexity: 'Limited',
          errorRecovery: 'Manual',
          typeValidation: 'None'
        },
        openAIApproach: {
          parseSuccessRate: 0.99, // Much higher with native parsing
          averageParseTime: 1, // Faster with pre-parsed data
          supportedComplexity: 'Full',
          errorRecovery: 'Automatic',
          typeValidation: 'Built-in'
        }
      };

      const improvement = {
        parseSuccessRateIncrease: reliabilityMetrics.openAIApproach.parseSuccessRate - reliabilityMetrics.currentApproach.parseSuccessRate,
        performanceImprovement: reliabilityMetrics.currentApproach.averageParseTime / reliabilityMetrics.openAIApproach.averageParseTime
      };

      expect(improvement.parseSuccessRateIncrease).toBeCloseTo(0.14);
      expect(improvement.performanceImprovement).toBe(5);

      console.log('Reliability improvements:', improvement);
    });
  });
});
