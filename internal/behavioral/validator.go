package behavioral

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"gorka/internal/types"
)

type QualityValidator struct {
	filePathWeight   float64
	actionableWeight float64
	structuredWeight float64
}

type QualityAssessment struct {
	OverallScore     float64            `json:"overall_score"`
	ComponentScores  map[string]float64 `json:"component_scores"`
	ValidationResult string             `json:"validation_result"`
	FailureReasons   []string           `json:"failure_reasons,omitempty"`
}

type EvidenceRequirements struct {
	FilePathReferences     bool `json:"file_path_references"`
	ActionableSteps        bool `json:"actionable_steps"`
	StructuredOutputFormat bool `json:"structured_output_format"`
}

func NewQualityValidator() *QualityValidator {
	return &QualityValidator{
		filePathWeight:   0.40,
		actionableWeight: 0.30,
		structuredWeight: 0.30,
	}
}

func (qv *QualityValidator) ValidateQuality(result *types.BehavioralResult) (*QualityAssessment, error) {
	assessment := &QualityAssessment{
		ComponentScores: make(map[string]float64),
		FailureReasons:  []string{},
	}

	// Convert result to JSON string for analysis
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return nil, err
	}
	resultText := string(resultJSON)

	// Validate file path references
	filePathScore := qv.validateFilePathReferences(resultText)
	assessment.ComponentScores["file_path_references"] = filePathScore

	if filePathScore < 0.5 {
		assessment.FailureReasons = append(assessment.FailureReasons, "insufficient_file_path_references")
	}

	// Validate actionable steps
	actionableScore := qv.validateActionableSteps(result.OutputData)
	assessment.ComponentScores["actionable_steps"] = actionableScore

	if actionableScore < 0.5 {
		assessment.FailureReasons = append(assessment.FailureReasons, "insufficient_actionable_steps")
	}

	// Validate structured output
	structuredScore := qv.validateStructuredOutput(result.OutputData)
	assessment.ComponentScores["structured_output"] = structuredScore

	if structuredScore < 0.5 {
		assessment.FailureReasons = append(assessment.FailureReasons, "insufficient_structured_output")
	}

	// Calculate overall score
	assessment.OverallScore = (filePathScore*qv.filePathWeight +
		actionableScore*qv.actionableWeight +
		structuredScore*qv.structuredWeight)

	// Determine validation result
	if assessment.OverallScore >= 0.7 {
		assessment.ValidationResult = "sufficient_quality"
	} else {
		assessment.ValidationResult = "insufficient_quality"
	}

	return assessment, nil
}

func (qv *QualityValidator) validateFilePathReferences(text string) float64 {
	// Look for file path patterns
	filePathPatterns := []string{
		`[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+`, // file.ext
		`internal/[a-zA-Z0-9_/-]+`,      // internal paths
		`cmd/[a-zA-Z0-9_/-]+`,           // cmd paths
		`\.go$`,                         // Go files
		`\.json$`,                       // JSON files
		`\.md$`,                         // Markdown files
	}

	pathCount := 0
	for _, pattern := range filePathPatterns {
		re, _ := regexp.Compile(pattern)
		matches := re.FindAllString(text, -1)
		pathCount += len(matches)
	}

	// Score based on number of file references
	if pathCount >= 5 {
		return 1.0
	} else if pathCount >= 3 {
		return 0.8
	} else if pathCount >= 1 {
		return 0.6
	}
	return 0.0
}

func (qv *QualityValidator) validateActionableSteps(outputData map[string]interface{}) float64 {
	actionVerbs := []string{
		"create", "modify", "execute", "implement", "configure",
		"install", "setup", "build", "deploy", "test", "validate",
		"analyze", "generate", "process", "initialize",
	}

	dataText := fmt.Sprintf("%v", outputData)
	dataText = strings.ToLower(dataText)

	actionCount := 0
	for _, verb := range actionVerbs {
		if strings.Contains(dataText, verb) {
			actionCount++
		}
	}

	// Score based on actionable content
	if actionCount >= 5 {
		return 1.0
	} else if actionCount >= 3 {
		return 0.8
	} else if actionCount >= 1 {
		return 0.6
	}
	return 0.0
}

func (qv *QualityValidator) validateStructuredOutput(outputData map[string]interface{}) float64 {
	score := 0.0

	// Check for required structural elements
	if len(outputData) > 0 {
		score += 0.3
	}

	// Check for nested structure
	for _, value := range outputData {
		if _, ok := value.(map[string]interface{}); ok {
			score += 0.2
			break
		}
		if _, ok := value.([]interface{}); ok {
			score += 0.2
			break
		}
	}

	// Check for specific required fields
	requiredFields := []string{"result", "metadata", "analysis", "recommendations"}
	for _, field := range requiredFields {
		if _, exists := outputData[field]; exists {
			score += 0.1
		}
	}

	if score > 1.0 {
		score = 1.0
	}

	return score
}
