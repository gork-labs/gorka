package behavioral

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Engine struct {
	matrices         map[string]*BehavioralMatrix
	qualityValidator *QualityValidator
	honestyValidator *HonestyValidator
}

type BehavioralMatrix struct {
	AgentID    string                 `json:"agent_id"`
	MCPTool    string                 `json:"mcp_tool"`
	VSCodeMode string                 `json:"vscode_chatmode"`
	Algorithm  map[string]interface{} `json:"algorithm"`
}

type BehavioralRequest struct {
	AgentID          string                 `json:"agent_id"`
	InputParameters  map[string]interface{} `json:"input_parameters"`
	ExecutionContext map[string]interface{} `json:"execution_context"`
}

type BehavioralResult struct {
	AgentID       string                 `json:"agent_id"`
	OutputData    map[string]interface{} `json:"output_data"`
	ExecutionMeta map[string]interface{} `json:"execution_metadata"`
	QualityScore  float64                `json:"quality_score"`
}

func NewEngine() *Engine {
	return &Engine{
		matrices:         make(map[string]*BehavioralMatrix),
		qualityValidator: NewQualityValidator(),
		honestyValidator: NewHonestyValidator(),
	}
}

func (e *Engine) LoadBehavioralMatrices() error {
	specDir := "internal/embedded-resources/behavioral-specs"

	files, err := filepath.Glob(filepath.Join(specDir, "*.json"))
	if err != nil {
		return err
	}

	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return err
		}

		var matrix BehavioralMatrix
		if err := json.Unmarshal(data, &matrix); err != nil {
			return err
		}

		e.matrices[matrix.AgentID] = &matrix
	}

	return nil
}

func (e *Engine) ExecuteBehavioralMatrix(req *BehavioralRequest) (*BehavioralResult, error) {
	matrix, exists := e.matrices[req.AgentID]
	if !exists {
		return nil, fmt.Errorf("behavioral matrix not found: %s", req.AgentID)
	}

	// Execute behavioral algorithm
	result := &BehavioralResult{
		AgentID:    req.AgentID,
		OutputData: make(map[string]interface{}),
		ExecutionMeta: map[string]interface{}{
			"matrix_version": "1.0",
			"execution_mode": "mcp_server",
		},
		QualityScore: 0.85,
	}

	// Process algorithm steps
	if algorithm, ok := matrix.Algorithm["steps"].([]interface{}); ok {
		for _, step := range algorithm {
			if stepMap, ok := step.(map[string]interface{}); ok {
				action := stepMap["action"].(string)
				result.OutputData[action] = "executed"
			}
		}
	}

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

func (e *Engine) GetAvailableAgents() []string {
	agents := make([]string, 0, len(e.matrices))
	for agentID := range e.matrices {
		agents = append(agents, agentID)
	}
	return agents
}
