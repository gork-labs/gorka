package behavioral

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"gorka/internal/embedded"
	"gorka/internal/openrouter"
	"gorka/internal/types"
)

type Engine struct {
	matrices         map[string]*types.BehavioralMatrix
	qualityValidator *QualityValidator
	honestyValidator *HonestyValidator
	agentSpawner     *openrouter.AgentSpawner
}

func NewEngine() *Engine {
	// Initialize OpenRouter agent spawner - fail fast if config is invalid
	agentSpawner, err := openrouter.NewAgentSpawner()
	if err != nil {
		// Don't fallback to simulation - fail immediately
		panic(fmt.Sprintf("Failed to initialize OpenRouter agent spawner: %v", err))
	}

	return &Engine{
		matrices:         make(map[string]*types.BehavioralMatrix),
		qualityValidator: NewQualityValidator(),
		honestyValidator: NewHonestyValidator(),
		agentSpawner:     agentSpawner,
	}
}

func (e *Engine) LoadBehavioralMatrices() error {
	// Read all behavioral spec files from embedded resources
	entries, err := embedded.BehavioralSpecsFS.ReadDir("embedded-resources/behavioral-specs")
	if err != nil {
		return fmt.Errorf("failed to read behavioral specs directory: %w", err)
	}

	fmt.Printf("DEBUG: Found %d entries in behavioral-specs directory\n", len(entries))

	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			fmt.Printf("DEBUG: Loading behavioral spec: %s\n", entry.Name())
			
			data, err := embedded.BehavioralSpecsFS.ReadFile("embedded-resources/behavioral-specs/" + entry.Name())
			if err != nil {
				return fmt.Errorf("failed to read behavioral spec %s: %w", entry.Name(), err)
			}

			var matrix types.BehavioralMatrix
			if err := json.Unmarshal(data, &matrix); err != nil {
				return fmt.Errorf("failed to unmarshal behavioral spec %s: %w", entry.Name(), err)
			}

			fmt.Printf("DEBUG: Loaded matrix for agent: %s\n", matrix.AgentID)
			e.matrices[matrix.AgentID] = &matrix
		}
	}

	fmt.Printf("DEBUG: Total matrices loaded: %d\n", len(e.matrices))
	for agentID := range e.matrices {
		fmt.Printf("DEBUG: Available agent: %s\n", agentID)
	}

	return nil
}

func (e *Engine) ExecuteBehavioralMatrix(req *types.BehavioralRequest) (*types.BehavioralResult, error) {
	matrix, exists := e.matrices[req.AgentID]
	if !exists {
		return nil, fmt.Errorf("behavioral matrix not found: %s", req.AgentID)
	}

	// Prepare user input from request parameters
	userInput := formatUserInputFromRequest(req)

	// Execute real LLM agent via OpenRouter - NO SIMULATION
	llmResponse, err := e.agentSpawner.SpawnAgent(matrix, userInput)
	if err != nil {
		return nil, fmt.Errorf("OpenRouter agent execution failed: %w", err)
	}

	// Process real LLM response
	if len(llmResponse.Choices) == 0 {
		return nil, fmt.Errorf("OpenRouter returned empty response")
	}

	llmContent := llmResponse.Choices[0].Message.Content

	// Create result from actual LLM response
	result := &types.BehavioralResult{
		AgentID: req.AgentID,
		OutputData: map[string]interface{}{
			"llm_response":     llmContent,
			"model_used":       llmResponse.Model,
			"tokens_used":      llmResponse.Usage.TotalTokens,
			"completion_tokens": llmResponse.Usage.CompletionTokens,
			"prompt_tokens":    llmResponse.Usage.PromptTokens,
		},
		ExecutionMeta: map[string]interface{}{
			"execution_mode":   "openrouter_real",
			"agent_id":        req.AgentID,
			"openrouter_model": llmResponse.Model,
			"request_id":      llmResponse.ID,
		},
	}

	// Process algorithm steps validation from actual response
	if algorithm, ok := matrix.Algorithm["steps"].([]interface{}); ok {
		stepResults := make(map[string]string)
		for _, step := range algorithm {
			if stepMap, ok := step.(map[string]interface{}); ok {
				action := stepMap["action"].(string)
				// Check if LLM response addresses this step
				if strings.Contains(strings.ToLower(llmContent), strings.ToLower(action)) ||
				   strings.Contains(strings.ToLower(llmContent), strings.ReplaceAll(action, "_", " ")) {
					stepResults[action] = "addressed_in_response"
				} else {
					stepResults[action] = "not_explicitly_addressed"
				}
			}
		}
		result.OutputData["algorithm_step_analysis"] = stepResults
	}

	// Validate quality of real response
	qualityAssessment, err := e.qualityValidator.ValidateQuality(result)
	if err != nil {
		return nil, fmt.Errorf("quality validation failed: %w", err)
	}

	// Validate honesty of real response
	honestyAssessment, err := e.honestyValidator.ValidateHonesty(result)
	if err != nil {
		return nil, fmt.Errorf("honesty validation failed: %w", err)
	}

	// Update result with validation of real LLM response
	result.ExecutionMeta["quality_assessment"] = qualityAssessment
	result.ExecutionMeta["honesty_assessment"] = honestyAssessment
	result.QualityScore = qualityAssessment.OverallScore

	// If quality is insufficient, return error instead of retry flag
	if qualityAssessment.ValidationResult == "insufficient_quality" {
		return nil, fmt.Errorf("LLM response quality insufficient: %s", qualityAssessment.ValidationResult)
	}

	return result, nil
}

// formatUserInputFromRequest converts request parameters into user input for LLM
func formatUserInputFromRequest(req *types.BehavioralRequest) string {
	var parts []string
	
	// Add agent context
	parts = append(parts, fmt.Sprintf("Agent: %s", req.AgentID))
	
	// Process input parameters
	if len(req.InputParameters) > 0 {
		parts = append(parts, "Input Parameters:")
		for key, value := range req.InputParameters {
			parts = append(parts, fmt.Sprintf("- %s: %v", key, value))
		}
	}
	
	// Process execution context
	if len(req.ExecutionContext) > 0 {
		parts = append(parts, "Execution Context:")
		for key, value := range req.ExecutionContext {
			parts = append(parts, fmt.Sprintf("- %s: %v", key, value))
		}
	}
	
	// Default request if no specific parameters
	if len(req.InputParameters) == 0 && len(req.ExecutionContext) == 0 {
		parts = append(parts, "Please execute your behavioral matrix algorithm and provide your analysis.")
	}
	
	return strings.Join(parts, "\n")
}

func (e *Engine) GetAvailableAgents() []string {
	agents := make([]string, 0, len(e.matrices))
	for agentID := range e.matrices {
		agents = append(agents, agentID)
	}
	return agents
}
