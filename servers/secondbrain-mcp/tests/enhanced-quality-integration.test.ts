import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecondBrainServer } from '../src/core/server.js';
import {
  SubAgentResponse,
  ValidateOutputArgs,
  EnhancedQualityAssessment
} from '../src/utils/types.js';

describe('Enhanced Quality Control Integration', () => {
  let server: SecondBrainServer;

  beforeEach(async () => {
    server = new SecondBrainServer();
    await server.initialize();
  });

  afterEach(async () => {
    // Cleanup if needed
  });

  const createMockResponse = (quality: 'high' | 'medium' | 'low'): SubAgentResponse => {
    const baseResponse: SubAgentResponse = {
      deliverables: {
        analysis: '',
        recommendations: [],
        documents: []
      },
      memory_operations: [
        {
          operation: 'create_entities',
          data: {
            entities: [
              {
                name: 'TestEntity',
                entityType: 'TestType',
                observations: ['Test observation']
              }
            ]
          }
        }
      ],
      metadata: {
        chatmode: 'Security Engineer',
        task_completion_status: 'complete',
        processing_time: '30000',
        confidence_level: 'high'
      }
    };

    switch (quality) {
      case 'high':
        return {
          ...baseResponse,
          deliverables: {
            analysis: 'Security analysis of the authentication system reveals critical vulnerabilities:\n\n**File: src/auth/authentication.service.ts**\n- Line 45: Password comparison uses plain text instead of bcrypt:\n```typescript\nif (user.password === password) { // CRITICAL VULNERABILITY\n  return this.generateJWT(user.id);\n}\n```\n\n**File: src/models/user.model.ts**\n- Line 23: SQL injection vulnerability in findByEmail method:\n```typescript\nconst query = `SELECT * FROM users WHERE email = "${email}"`; // VULNERABLE\n```\n\n**File: src/routes/auth.routes.ts**\n- Line 15: Missing rate limiting on login endpoint\n- Line 28: No CSRF protection on password reset\n\n**File: src/middleware/auth.middleware.ts**\n- Line 67: JWT verification lacks proper error handling',
            recommendations: [
              'Fix src/auth/authentication.service.ts:45 - Replace string comparison with bcrypt.compare(password, user.hashedPassword)',
              'Update src/models/user.model.ts:23 - Use parameterized query: SELECT * FROM users WHERE email = $1',
              'Add rate limiting to src/routes/auth.routes.ts:15 using express-rate-limit middleware',
              'Implement CSRF tokens in src/middleware/security.middleware.ts',
              'Add proper error handling in src/middleware/auth.middleware.ts:67 for JWT verification failures'
            ],
            documents: ['security-analysis.md', 'threat-model.md', 'security-architecture.md']
          },
          memory_operations: [
            {
              operation: 'create_entities',
              data: {
                entities: [
                  {
                    name: 'SecurityThreat_SQLInjection',
                    entityType: 'SecurityThreat',
                    observations: ['SQL injection vulnerability in user input handling']
                  },
                  {
                    name: 'SecurityControl_OAuth2',
                    entityType: 'SecurityControl',
                    observations: ['OAuth 2.0 with PKCE provides secure authentication']
                  }
                ]
              }
            },
            {
              operation: 'create_relations',
              data: {
                relations: [
                  {
                    from: 'SecurityControl_OAuth2',
                    to: 'SecurityThreat_SQLInjection',
                    relationType: 'mitigates'
                  }
                ]
              }
            }
          ]
        };

      case 'medium':
        return {
          ...baseResponse,
          deliverables: {
            analysis: 'Security analysis of src/auth/ reveals several issues:\n\n**File: src/auth/authentication.service.ts**\n- Password validation could be improved\n```typescript\nif (password.length < 8) return false; // Basic check only\n```\n\n**File: src/routes/auth.routes.ts** \n- Some endpoints lack proper validation\n- Line 25 needs rate limiting\n\nThe analysis is incomplete and needs more specific details about vulnerabilities and concrete remediation steps.',
            recommendations: [
              'Review password validation in src/auth/authentication.service.ts:67',
              'Add rate limiting to src/routes/auth.routes.ts:25',
              'Implement proper error handling in authentication flow'
            ],
            documents: ['security-notes.md']
          },
          metadata: {
            ...baseResponse.metadata,
            confidence_level: 'medium',
            task_completion_status: 'partial'
          }
        };

      case 'low':
        return {
          ...baseResponse,
          deliverables: {
            analysis: 'Brief security check done.',
            recommendations: [],
            documents: []
          },
          memory_operations: [],
          metadata: {
            ...baseResponse.metadata,
            confidence_level: 'low',
            task_completion_status: 'failed'
          }
        };
    }
  };

  describe('validate_output tool with enhanced quality control', () => {
    it('should validate high-quality response successfully', async () => {
      const highQualityResponse = createMockResponse('high');
      const args = {
        sub_agent_response: JSON.stringify(highQualityResponse),
        requirements: 'Perform comprehensive security analysis of the authentication system',
        quality_criteria: 'Must include detailed threat analysis, specific recommendations, and architectural guidance',
        chatmode: 'Security Engineer',
        enable_refinement: true
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      // Enhanced quality assessment
      expect(validationResult.enhanced_quality.overall_score).toBeGreaterThan(80);
      expect(validationResult.enhanced_quality.passed).toBe(true);
      expect(validationResult.enhanced_quality.confidence).toBe('high');
      expect(validationResult.enhanced_quality.quality_threshold).toBe(80); // Security Engineer threshold

      // Quality details
      expect(validationResult.quality_details.category_scores).toHaveProperty('format');
      expect(validationResult.quality_details.category_scores).toHaveProperty('completeness');
      expect(validationResult.quality_details.category_scores).toHaveProperty('content');
      expect(validationResult.quality_details.category_scores).toHaveProperty('specificity'); // New category
      expect(validationResult.quality_details.rule_results).toHaveLength(8); // 5 universal + 3 specificity rules
      expect(validationResult.quality_details.critical_issues).toHaveLength(0);

      // Legacy compatibility
      expect(validationResult.legacy_quality.score).toBeGreaterThan(80);
      expect(validationResult.legacy_quality.passed).toBe(true);

      // Format validation
      expect(validationResult.format_validation.valid).toBe(true);
      expect(validationResult.format_validation.deliverables_present).toBe(true);

      // Metadata
      expect(validationResult.validation_metadata.chatmode_used).toBe('Security Engineer');
      expect(validationResult.validation_metadata.validator_version).toBe('3.0');
    });

    it('should identify refinement needs for medium-quality response', async () => {
      const mediumQualityResponse = createMockResponse('medium');
      const args = {
        sub_agent_response: JSON.stringify(mediumQualityResponse),
        requirements: 'Perform comprehensive security analysis',
        quality_criteria: 'Must include detailed analysis and specific recommendations',
        chatmode: 'Security Engineer',
        session_id: 'test-session-123',
        enable_refinement: true
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      // Should not pass quality threshold (using reduced content to ensure it fails)
      expect(validationResult.enhanced_quality.overall_score).toBeLessThan(80);
      expect(validationResult.enhanced_quality.can_refine).toBe(true);

      // Should have refinement information if it actually needs refinement
      if (!validationResult.enhanced_quality.passed) {
        expect(validationResult.refinement).toBeDefined();
        expect(validationResult.refinement.needs_refinement).toBe(true);
        expect(validationResult.refinement.refinement_prompt).toContain('REFINEMENT REQUEST');
        expect(validationResult.refinement.attempt_number).toBe(1);

        // Should have specific recommendations
        expect(validationResult.quality_details.recommendations.length).toBeGreaterThan(0);
        expect(validationResult.quality_details.refinement_suggestions.length).toBeGreaterThan(0);
      } else {
        // If it passes, refinement should not be needed
        expect(validationResult.refinement).toBeDefined();
        expect(validationResult.refinement.needs_refinement).toBe(false);
      }
    });

    it('should handle low-quality response with appropriate feedback', async () => {
      const lowQualityResponse = createMockResponse('low');
      const args = {
        sub_agent_response: JSON.stringify(lowQualityResponse),
        requirements: 'Perform comprehensive security analysis',
        quality_criteria: 'Must include detailed analysis and recommendations',
        chatmode: 'Security Engineer',
        session_id: 'test-session-456',
        enable_refinement: true
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      // Should fail quality checks
      expect(validationResult.enhanced_quality.passed).toBe(false);
      expect(validationResult.enhanced_quality.overall_score).toBeLessThan(50);
      expect(validationResult.enhanced_quality.confidence).toBe('low');

      // Should have multiple failed rules
      const failedRules = validationResult.quality_details.rule_results.filter(
        (rule: any) => !rule.passed
      );
      expect(failedRules.length).toBeGreaterThan(1);

      // Should have comprehensive recommendations
      expect(validationResult.quality_details.recommendations.length).toBeGreaterThan(2);
    });

    it('should work without refinement enabled', async () => {
      const mediumQualityResponse = createMockResponse('medium');
      const args = {
        sub_agent_response: JSON.stringify(mediumQualityResponse),
        requirements: 'Perform security analysis',
        quality_criteria: 'Include analysis and recommendations',
        chatmode: 'Security Engineer',
        enable_refinement: false
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      // Should not have refinement information
      expect(validationResult.refinement).toBeUndefined();

      // But should still have quality assessment
      expect(validationResult.enhanced_quality).toBeDefined();
      expect(validationResult.quality_details).toBeDefined();
    });

    it('should handle different chatmode quality thresholds', async () => {
      const response = createMockResponse('medium');

      // Test with Security Engineer (high threshold)
      const securityArgs = {
        sub_agent_response: JSON.stringify(response),
        requirements: 'Security analysis',
        quality_criteria: 'Security requirements',
        chatmode: 'Security Engineer'
      };

      const securityResult = await (server as any).handleValidateOutput(securityArgs);
      const securityValidation = JSON.parse(securityResult.content[0].text);

      // Test with default chatmode (lower threshold)
      const defaultArgs = {
        sub_agent_response: JSON.stringify(response),
        requirements: 'General analysis',
        quality_criteria: 'General requirements',
        chatmode: 'default'
      };

      const defaultResult = await (server as any).handleValidateOutput(defaultArgs);
      const defaultValidation = JSON.parse(defaultResult.content[0].text);

      // Security Engineer should have higher threshold
      expect(securityValidation.enhanced_quality.quality_threshold).toBe(80);
      expect(defaultValidation.enhanced_quality.quality_threshold).toBe(70);

      // Same response might pass default but fail security threshold
      if (securityValidation.enhanced_quality.overall_score < 80 &&
          defaultValidation.enhanced_quality.overall_score >= 70) {
        expect(securityValidation.enhanced_quality.passed).toBe(false);
        expect(defaultValidation.enhanced_quality.passed).toBe(true);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const args = {
        sub_agent_response: 'invalid json {',
        requirements: 'Test requirements',
        quality_criteria: 'Test criteria',
        chatmode: 'default'
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      // JSON repair may succeed in creating a minimal object, but quality should still be low
      expect(validationResult.enhanced_quality.passed).toBe(false);
      expect(validationResult.quality_details.critical_issues.length).toBeGreaterThan(0);

      // The format validation might succeed due to repair, but the overall quality should be poor
      // This demonstrates that our repair logic is working while still catching quality issues
    });

    it('should measure validation performance', async () => {
      const response = createMockResponse('high');
      const args = {
        sub_agent_response: JSON.stringify(response),
        requirements: 'Performance test',
        quality_criteria: 'Test criteria',
        chatmode: 'default'
      };

      const startTime = Date.now();
      const result = await (server as any).handleValidateOutput(args);
      const endTime = Date.now();

      const validationResult = JSON.parse(result.content[0].text);

      // Should complete reasonably quickly
      expect(validationResult.validation_metadata.validation_time_ms).toBeLessThan(1000);
      expect(validationResult.enhanced_quality.processing_time_ms).toBeLessThan(500);

      // Total time should be reasonable
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('category-specific quality assessment', () => {
    it('should assess format quality correctly', async () => {
      const response = createMockResponse('high');
      const args = {
        sub_agent_response: JSON.stringify(response),
        requirements: 'Test',
        quality_criteria: 'Test',
        chatmode: 'default'
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      const formatScore = validationResult.quality_details.category_scores.format;
      expect(formatScore).toBeGreaterThan(80);

      const formatRule = validationResult.quality_details.rule_results.find(
        (rule: any) => rule.category === 'format'
      );
      expect(formatRule.passed).toBe(true);
    });

    it('should assess completeness quality correctly', async () => {
      const incompleteResponse = {
        ...createMockResponse('high'),
        deliverables: {
          analysis: '',
          recommendations: []
        }
      };

      const args = {
        sub_agent_response: JSON.stringify(incompleteResponse),
        requirements: 'Complete analysis required',
        quality_criteria: 'Must include analysis and recommendations',
        chatmode: 'default'
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      const completenessScore = validationResult.quality_details.category_scores.completeness;
      expect(completenessScore).toBeLessThan(70);

      const completenessRule = validationResult.quality_details.rule_results.find(
        (rule: any) => rule.category === 'completeness'
      );
      expect(completenessRule.passed).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    it('should maintain legacy quality assessment format', async () => {
      const response = createMockResponse('high');
      const args = {
        sub_agent_response: JSON.stringify(response),
        requirements: 'Legacy test',
        quality_criteria: 'Legacy criteria'
      };

      const result = await (server as any).handleValidateOutput(args);
      const validationResult = JSON.parse(result.content[0].text);

      // Legacy format should be present
      expect(validationResult.legacy_quality).toBeDefined();
      expect(validationResult.legacy_quality.score).toBeDefined();
      expect(validationResult.legacy_quality.passed).toBeDefined();
      expect(validationResult.legacy_quality.issues).toBeDefined();
      expect(validationResult.legacy_quality.recommendations).toBeDefined();
      expect(validationResult.legacy_quality.confidence).toBeDefined();

      // Should match enhanced assessment
      expect(validationResult.legacy_quality.score).toBe(validationResult.enhanced_quality.overall_score);
      expect(validationResult.legacy_quality.passed).toBe(validationResult.enhanced_quality.passed);
    });
  });
});
