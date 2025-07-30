package behavioral

import (
	"strings"

	"gorka/internal/types"
)

type HonestyValidator struct {
	requiredPatterns   []string
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

func (hv *HonestyValidator) ValidateHonesty(result *types.BehavioralResult) (*HonestyAssessment, error) {
	assessment := &HonestyAssessment{
		ViolationReasons: []string{},
	}

	// Get analysis text from result
	var resultText string
	if analysis, exists := result.OutputData["analysis"]; exists {
		if analysisStr, ok := analysis.(string); ok {
			resultText = strings.ToLower(analysisStr)
		}
	}

	// If no analysis field, check all output data
	if resultText == "" {
		var allText []string
		for _, value := range result.OutputData {
			if str, ok := value.(string); ok {
				allText = append(allText, str)
			}
		}
		resultText = strings.ToLower(strings.Join(allText, " "))
	}

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
