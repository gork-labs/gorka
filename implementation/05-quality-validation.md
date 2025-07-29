---
target_execution: "llm_agent_implementation"
implementation_domain: "quality_validation"
---

# QUALITY VALIDATION IMPLEMENTATION

## QUALITY_VALIDATOR

File: `internal/behavioral/validator.go`

```go
package behavioral

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

type QualityValidator struct {
	filePathWeight    float64
	actionableWeight  float64
	structuredWeight  float64
}

type QualityAssessment struct {
	OverallScore     float64            `json:"overall_score"`
	ComponentScores  map[string]float64 `json:"component_scores"`
	ValidationResult string             `json:"validation_result"`
	FailureReasons   []string           `json:"failure_reasons,omitempty"`
}

type EvidenceRequirements struct {
	FilePathReferences      bool `json:"file_path_references"`
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

func (qv *QualityValidator) ValidateQuality(result *BehavioralResult) (*QualityAssessment, error) {
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
		`[a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+`,           // file.ext
		`internal/[a-zA-Z0-9_/-]+`,                // internal paths
		`cmd/[a-zA-Z0-9_/-]+`,                     // cmd paths
		`\.go$`,                                   // Go files
		`\.json$`,                                 // JSON files
		`\.md$`,                                   // Markdown files
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
```

## HONESTY_PROTOCOLS

File: `internal/behavioral/honesty.go`

```go
package behavioral

import (
	"strings"
)

type HonestyValidator struct {
	requiredPatterns []string
	prohibitedPatterns []string
}

type HonestyAssessment struct {
	IsCompliant      bool     `json:"is_compliant"`
	LimitationScore  float64  `json:"limitation_score"`
	EvidenceScore    float64  `json:"evidence_score"`
	ViolationReasons []string `json:"violation_reasons,omitempty"`
}

func NewHonestyValidator() *HonestyValidator {
	return &HonestyValidator{
		requiredPatterns: []string{
			"analyzed_available_files",
			"cannot_verify",
			"limited_to_scope",
			"based_on_available_information",
			"analysis_scope",
		},
		prohibitedPatterns: []string{
			"assuming",
			"probably",
			"might_be",
			"speculation",
			"without_verification",
		},
	}
}

func (hv *HonestyValidator) ValidateHonesty(result *BehavioralResult) (*HonestyAssessment, error) {
	assessment := &HonestyAssessment{
		ViolationReasons: []string{},
	}

	resultText := strings.ToLower(result.OutputData["analysis"].(string))

	// Check for limitation disclosure
	limitationScore := hv.validateLimitationDisclosure(resultText)
	assessment.LimitationScore = limitationScore

	// Check for evidence-based claims
	evidenceScore := hv.validateEvidenceBased(resultText)
	assessment.EvidenceScore = evidenceScore

	// Check for prohibited speculation
	if hv.containsProhibitedPatterns(resultText) {
		assessment.ViolationReasons = append(assessment.ViolationReasons, "contains_prohibited_speculation")
	}

	// Overall compliance assessment
	assessment.IsCompliant = (limitationScore >= 0.5 &&
		evidenceScore >= 0.5 &&
		len(assessment.ViolationReasons) == 0)

	return assessment, nil
}

func (hv *HonestyValidator) validateLimitationDisclosure(text string) float64 {
	score := 0.0

	for _, pattern := range hv.requiredPatterns {
		if strings.Contains(text, pattern) {
			score += 0.2
		}
	}

	if score > 1.0 {
		score = 1.0
	}

	return score
}

func (hv *HonestyValidator) validateEvidenceBased(text string) float64 {
	evidenceIndicators := []string{
		"file_path", "analyzed", "found_in", "based_on",
		"verified", "confirmed", "observed", "identified",
	}

	score := 0.0
	for _, indicator := range evidenceIndicators {
		if strings.Contains(text, indicator) {
			score += 0.15
		}
	}

	if score > 1.0 {
		score = 1.0
	}

	return score
}

func (hv *HonestyValidator) containsProhibitedPatterns(text string) bool {
	for _, pattern := range hv.prohibitedPatterns {
		if strings.Contains(text, pattern) {
			return true
		}
	}
	return false
}
```

## VALIDATION_INTEGRATION

File: `internal/behavioral/engine.go` (addition)

```go
// Add to Engine struct
type Engine struct {
	matrices         map[string]*BehavioralMatrix
	qualityValidator *QualityValidator
	honestyValidator *HonestyValidator
}

// Update NewEngine function
func NewEngine() *Engine {
	return &Engine{
		matrices:         make(map[string]*BehavioralMatrix),
		qualityValidator: NewQualityValidator(),
		honestyValidator: NewHonestyValidator(),
	}
}

// Add validation to ExecuteBehavioralMatrix
func (e *Engine) ExecuteBehavioralMatrix(req *BehavioralRequest) (*BehavioralResult, error) {
	// ... existing execution logic ...

	// Validate quality
	qualityAssessment, err := e.qualityValidator.ValidateQuality(result)
	if err != nil {
		return nil, err
	}

	// Validate honesty
	honestyAssessment, err := e.honestyValidator.ValidateHonesty(result)
	if err != nil {
		return nil, err
	}

	// Update result with validation data
	result.ExecutionMeta["quality_assessment"] = qualityAssessment
	result.ExecutionMeta["honesty_assessment"] = honestyAssessment
	result.QualityScore = qualityAssessment.OverallScore

	// Determine if retry needed
	if qualityAssessment.ValidationResult == "insufficient_quality" {
		result.ExecutionMeta["retry_required"] = true
		result.ExecutionMeta["retry_reason"] = "quality_validation_failed"
	}

	return result, nil
}
```

## VALIDATION_TESTING

```bash
# Build with validation
go build -o gorka-server cmd/main.go

# Test quality validation
cat > test_validation.json << 'EOF'
{
  "agent_id": "software_engineer",
  "input_parameters": {
    "implementation_specification": {"task": "test"}
  },
  "execution_context": {}
}
EOF

# Run validation test
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "execute_implementation_behavioral_matrix", "arguments": {}}}' | ./gorka-server
```
