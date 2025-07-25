import { describe, it, expect, beforeEach } from 'vitest';
import { QualityValidator } from '../src/quality/validator.js';
import {
  SubAgentResponse,
  ValidationContext,
  EnhancedQualityAssessment
} from '../src/utils/types.js';

describe('QualityValidator', () => {
  let validator: QualityValidator;
  let mockResponse: SubAgentResponse;
  let mockContext: ValidationContext;

  beforeEach(() => {
    validator = new QualityValidator();

    mockResponse = {
      deliverables: {
        analysis: 'Security analysis of src/auth/authentication.service.ts reveals several vulnerabilities:\n\n1. **Password validation bypass**: Line 45 in authenticateUser() function lacks input sanitization:\n```typescript\nif (user.password === password) { // VULNERABLE - no bcrypt comparison\n  return generateToken(user);\n}\n```\n\n2. **SQL injection risk**: Database query in src/models/user.model.ts:23 uses string concatenation:\n```sql\nSELECT * FROM users WHERE email = "${email}" // VULNERABLE\n```\n\n3. **Missing rate limiting**: The /api/auth/login endpoint in src/routes/auth.routes.ts:15 has no protection against brute force attacks.',
        recommendations: [
          'Fix src/auth/authentication.service.ts:45 - Replace string comparison with bcrypt.compare()',
          'Update src/models/user.model.ts:23 - Use parameterized queries to prevent SQL injection',
          'Add rate limiting middleware to src/routes/auth.routes.ts:15 using express-rate-limit',
          'Implement CSRF protection in src/middleware/security.middleware.ts'
        ],
        documents: ['security-requirements.md', 'threat-model.md']
      },
      memory_operations: [
        {
          operation: 'create_entities',
          data: {
            entities: [
              {
                name: 'SecurityRequirement_MFA',
                entityType: 'SecurityControl',
                observations: ['Multi-factor authentication is required for all user accounts']
              }
            ]
          }
        },
        {
          operation: 'create_relations',
          data: {
            relations: [
              {
                from: 'SecurityRequirement_MFA',
                to: 'UserAuthentication_System',
                relationType: 'requires'
              }
            ]
          }
        }
      ],
      metadata: {
        chatmode: 'Security Engineer',
        task_completion_status: 'complete',
        processing_time: '45000',
        confidence_level: 'high'
      }
    };

    mockContext = {
      chatmode: 'Security Engineer',
      requirements: 'Analyze security requirements for the authentication system',
      qualityCriteria: 'Must include comprehensive threat analysis and specific security recommendations'
    };
  });

  describe('validateResponse', () => {
    it('should validate a high-quality response successfully', async () => {
      const assessment = await validator.validateResponse(mockResponse, mockContext);

      expect(assessment.overallScore).toBeGreaterThan(80);
      expect(assessment.passed).toBe(true);
      expect(assessment.confidence).toBe('high');
      expect(assessment.ruleResults).toHaveLength(8); // 5 universal rules + 3 specificity rules
      expect(assessment.categories).toHaveProperty('format');
      expect(assessment.categories).toHaveProperty('completeness');
      expect(assessment.categories).toHaveProperty('content');
      expect(assessment.categories).toHaveProperty('specificity'); // New category
      expect(assessment.criticalIssues).toHaveLength(0);
    });

    it('should handle missing deliverables gracefully', async () => {
      const incompleteResponse = {
        ...mockResponse,
        deliverables: {
          analysis: '',
          recommendations: []
        }
      };

      const assessment = await validator.validateResponse(incompleteResponse, mockContext);

      expect(assessment.overallScore).toBeLessThan(70);
      expect(assessment.passed).toBe(false);
      expect(assessment.recommendations.some(rec => rec.includes('incomplete'))).toBe(true);
      expect(assessment.canRefine).toBe(true);
    });

    it('should validate format compliance correctly', async () => {
      const malformedResponse = {
        ...mockResponse,
        metadata: null as any
      };

      const assessment = await validator.validateResponse(malformedResponse, mockContext);

      expect(assessment.categories.format).toBeLessThan(80);
      expect(assessment.ruleResults.some(r => r.category === 'format' && !r.passed)).toBe(true);
    });

    it('should assess memory operations validity', async () => {
      const responseWithBadMemoryOps = {
        ...mockResponse,
        memory_operations: [
          {
            operation: 'invalid_operation' as any,
            data: {}
          }
        ]
      };

      const assessment = await validator.validateResponse(responseWithBadMemoryOps, mockContext);

      const memoryRule = assessment.ruleResults.find(r => r.category === 'memory');
      expect(memoryRule).toBeDefined();
      expect(memoryRule!.score).toBeLessThan(100);
    });

    it('should handle validation errors gracefully', async () => {
      const invalidResponse = null as any;

      const assessment = await validator.validateResponse(invalidResponse, mockContext);

      expect(assessment.overallScore).toBe(0);
      expect(assessment.passed).toBe(false);
      expect(assessment.confidence).toBe('low');
      expect(assessment.criticalIssues).toHaveLength(1);
    });

    it('should use different quality thresholds for different chatmodes', async () => {
      const securityContext = { ...mockContext, chatmode: 'Security Engineer' };
      const genericContext = { ...mockContext, chatmode: 'default' };

      const securityAssessment = await validator.validateResponse(mockResponse, securityContext);
      const genericAssessment = await validator.validateResponse(mockResponse, genericContext);

      expect(securityAssessment.qualityThreshold).toBe(80);
      expect(genericAssessment.qualityThreshold).toBe(70);
    });

    it('should provide refinement suggestions when quality is below threshold', async () => {
      const lowQualityResponse = {
        ...mockResponse,
        deliverables: {
          analysis: 'Brief analysis',
          recommendations: []
        }
      };

      const assessment = await validator.validateResponse(lowQualityResponse, mockContext);

      expect(assessment.canRefine).toBe(true);
      expect(assessment.refinementSuggestions.length).toBeGreaterThan(0); // Should have suggestions for failed rules
      expect(assessment.recommendations.length).toBeGreaterThan(0); // Should contain specific improvement suggestions
    });

    it('should categorize rule results correctly', async () => {
      const assessment = await validator.validateResponse(mockResponse, mockContext);

      // Check that all categories are properly calculated
      expect(assessment.categories).toMatchObject({
        format: expect.any(Number),
        completeness: expect.any(Number),
        memory: expect.any(Number),
        completion: expect.any(Number),
        content: expect.any(Number)
      });

      // All category scores should be between 0 and 100
      Object.values(assessment.categories).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it('should measure processing time', async () => {
      const assessment = await validator.validateResponse(mockResponse, mockContext);

      expect(assessment.processingTime).toBeGreaterThan(0);
      expect(assessment.processingTime).toBeLessThan(5000); // Should be fast
    });
  });

  describe('quality rules', () => {
    it('should evaluate format compliance correctly', async () => {
      const completeResponse = mockResponse;
      const assessment = await validator.validateResponse(completeResponse, mockContext);

      const formatRule = assessment.ruleResults.find(r => r.category === 'format');
      expect(formatRule).toBeDefined();
      expect(formatRule!.passed).toBe(true);
      expect(formatRule!.score).toBeGreaterThan(80);
    });

    it('should evaluate deliverables completeness', async () => {
      const completeResponse = mockResponse;
      const assessment = await validator.validateResponse(completeResponse, mockContext);

      const completenessRule = assessment.ruleResults.find(r => r.category === 'completeness');
      expect(completenessRule).toBeDefined();
      expect(completenessRule!.passed).toBe(true);
      expect(completenessRule!.score).toBeGreaterThan(70);
    });

    it('should evaluate response quality based on content depth', async () => {
      const shallowResponse = {
        ...mockResponse,
        deliverables: {
          analysis: 'Short',
          recommendations: ['Brief rec']
        }
      };

      const assessment = await validator.validateResponse(shallowResponse, mockContext);

      const contentRule = assessment.ruleResults.find(r => r.category === 'content');
      expect(contentRule).toBeDefined();
      expect(contentRule!.score).toBeLessThan(70);
    });

    it('should evaluate task completion metadata', async () => {
      const partialResponse = {
        ...mockResponse,
        metadata: {
          ...mockResponse.metadata,
          task_completion_status: 'partial' as const,
          confidence_level: 'low' as const
        }
      };

      const assessment = await validator.validateResponse(partialResponse, mockContext);

      const completionRule = assessment.ruleResults.find(r => r.category === 'completion');
      expect(completionRule).toBeDefined();
      expect(completionRule!.score).toBeLessThan(assessment.ruleResults.find(r => r.category === 'completion' && r.passed)?.score || 100);
    });
  });

  describe('weighted scoring', () => {
    it('should calculate weighted overall score correctly', async () => {
      const assessment = await validator.validateResponse(mockResponse, mockContext);

      // Overall score should be a weighted average of individual rule scores
      expect(assessment.overallScore).toBeGreaterThan(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);

      // Score should be reasonable given the high-quality mock response with specific file references
      expect(assessment.overallScore).toBeGreaterThan(80);
    });
  });

  describe('confidence assessment', () => {
    it('should assign high confidence for high-scoring responses', async () => {
      const assessment = await validator.validateResponse(mockResponse, mockContext);

      if (assessment.overallScore >= 85) {
        expect(assessment.confidence).toBe('high');
      }
    });

    it('should assign low confidence for low-scoring responses', async () => {
      const poorResponse = {
        ...mockResponse,
        deliverables: { analysis: '', recommendations: [] },
        memory_operations: [],
        metadata: {
          ...mockResponse.metadata,
          task_completion_status: 'failed' as const,
          confidence_level: 'low' as const
        }
      };

      const assessment = await validator.validateResponse(poorResponse, mockContext);
      expect(assessment.confidence).toBe('low');
    });
  });
});
