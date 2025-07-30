package behavioral

import (
	"testing"

	"gorka/internal/types"
)

func TestQualityValidator(t *testing.T) {
	validator := NewQualityValidator()

	// Test with sample behavioral result
	result := &types.BehavioralResult{
		AgentID: "software_engineer",
		OutputData: map[string]interface{}{
			"analysis": "analyzed internal/behavioral/engine.go and found implementation gaps",
			"recommendations": []string{
				"create new validator.go file",
				"implement quality assessment logic",
				"modify engine.go to integrate validation",
			},
			"file_paths": []string{
				"internal/behavioral/validator.go",
				"internal/behavioral/honesty.go",
				"cmd/secondbrain-mcp/main.go",
			},
		},
		ExecutionMeta: map[string]interface{}{
			"matrix_version": "1.0",
		},
		QualityScore: 0.0, // Will be set by validator
	}

	assessment, err := validator.ValidateQuality(result)
	if err != nil {
		t.Fatalf("Quality validation failed: %v", err)
	}

	// Verify assessment structure
	if assessment == nil {
		t.Fatal("Assessment is nil")
	}

	if assessment.OverallScore < 0.0 || assessment.OverallScore > 1.0 {
		t.Errorf("Overall score out of range: %f", assessment.OverallScore)
	}

	// Check component scores exist
	expectedComponents := []string{"file_path_references", "actionable_steps", "structured_output"}
	for _, component := range expectedComponents {
		if _, exists := assessment.ComponentScores[component]; !exists {
			t.Errorf("Missing component score: %s", component)
		}
	}

	// Verify validation result is set
	if assessment.ValidationResult == "" {
		t.Error("Validation result is empty")
	}

	t.Logf("Quality assessment: %+v", assessment)
}

func TestHonestyValidator(t *testing.T) {
	validator := NewHonestyValidator()

	// Test with sample behavioral result
	result := &types.BehavioralResult{
		AgentID: "software_engineer",
		OutputData: map[string]interface{}{
			"analysis": "analyzed_available_files in internal/behavioral directory. based_on_available_information, found implementation requirements. cannot_verify external dependencies without additional context.",
		},
		ExecutionMeta: map[string]interface{}{
			"matrix_version": "1.0",
		},
	}

	assessment, err := validator.ValidateHonesty(result)
	if err != nil {
		t.Fatalf("Honesty validation failed: %v", err)
	}

	// Verify assessment structure
	if assessment == nil {
		t.Fatal("Assessment is nil")
	}

	if assessment.LimitationScore < 0.0 || assessment.LimitationScore > 1.0 {
		t.Errorf("Limitation score out of range: %f", assessment.LimitationScore)
	}

	if assessment.EvidenceScore < 0.0 || assessment.EvidenceScore > 1.0 {
		t.Errorf("Evidence score out of range: %f", assessment.EvidenceScore)
	}

	t.Logf("Honesty assessment: %+v", assessment)
}

func TestEngineWithValidation(t *testing.T) {
	engine := NewEngine()

	// Verify validators are initialized
	if engine.qualityValidator == nil {
		t.Error("Quality validator not initialized")
	}

	if engine.honestyValidator == nil {
		t.Error("Honesty validator not initialized")
	}

	// Test with mock behavioral request
	req := &types.BehavioralRequest{
		AgentID: "test_agent",
		InputParameters: map[string]interface{}{
			"task": "validation_test",
		},
		ExecutionContext: map[string]interface{}{},
	}

	// Create mock matrix for test
	engine.matrices["test_agent"] = &types.BehavioralMatrix{
		AgentID:    "test_agent",
		MCPTool:    "test_tool",
		VSCodeMode: "test_mode",
		Algorithm: map[string]interface{}{
			"steps": []interface{}{
				map[string]interface{}{
					"action": "analyze",
				},
				map[string]interface{}{
					"action": "implement",
				},
			},
		},
	}

	result, err := engine.ExecuteBehavioralMatrix(req)
	if err != nil {
		t.Fatalf("Execution failed: %v", err)
	}

	// Verify validation data is present
	if _, exists := result.ExecutionMeta["quality_assessment"]; !exists {
		t.Error("Quality assessment missing from execution metadata")
	}

	if _, exists := result.ExecutionMeta["honesty_assessment"]; !exists {
		t.Error("Honesty assessment missing from execution metadata")
	}

	// Verify quality score is set
	if result.QualityScore == 0.85 {
		t.Error("Quality score was not updated by validation")
	}

	t.Logf("Execution result: %+v", result)
}
