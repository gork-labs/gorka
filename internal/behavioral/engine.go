package behavioral

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"gorka/internal/embedded"
	"gorka/internal/openrouter"
	"gorka/internal/tools"
	"gorka/internal/types"
)

type Engine struct {
	matrices         map[string]*types.BehavioralMatrix
	qualityValidator *QualityValidator
	honestyValidator *HonestyValidator
	agentSpawner     *openrouter.AgentSpawner
	toolsManager     *tools.ToolsManager // Add tools access for local execution
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

	// Validate input parameters against schema
	if err := e.validateInputParameters(req, matrix); err != nil {
		return nil, fmt.Errorf("input validation failed: %w", err)
	}

	// All agents are handled the same way - execute based on their behavioral spec
	return e.executeAgent(req, matrix)
}

// executeAgent handles execution for any agent type based on its behavioral spec
func (e *Engine) executeAgent(req *types.BehavioralRequest, matrix *types.BehavioralMatrix) (*types.BehavioralResult, error) {
	// Prepare user input from request parameters
	userInput := formatUserInputFromRequest(req)

	// Execute real LLM agent via OpenRouter
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
			"llm_response":      llmContent,
			"model_used":        llmResponse.Model,
			"tokens_used":       llmResponse.Usage.TotalTokens,
			"completion_tokens": llmResponse.Usage.CompletionTokens,
			"prompt_tokens":     llmResponse.Usage.PromptTokens,
		},
		ExecutionMeta: map[string]interface{}{
			"execution_mode":    "openrouter_real",
			"agent_id":         req.AgentID,
			"openrouter_model": llmResponse.Model,
			"request_id":       llmResponse.ID,
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

func (e *Engine) GetBehavioralMatrices() map[string]*types.BehavioralMatrix {
	return e.matrices
}

// validateInputParameters validates request parameters against behavioral matrix schema
func (e *Engine) validateInputParameters(req *types.BehavioralRequest, matrix *types.BehavioralMatrix) error {
	// Extract expected input schema from behavioral matrix
	var inputSchema map[string]interface{}
	
	// Try behavioral_prompt.input_schema first (project-orchestrator format)
	if behavioralPrompt, ok := matrix.Algorithm["behavioral_prompt"].(map[string]interface{}); ok {
		if schema, ok := behavioralPrompt["input_schema"].(map[string]interface{}); ok {
			inputSchema = schema
		}
	}
	
	// Fallback to algorithm.input format (other agents)
	if inputSchema == nil {
		if schema, ok := matrix.Algorithm["input"].(map[string]interface{}); ok {
			inputSchema = schema
		}
	}
	
	// If no schema defined, allow any parameters
	if inputSchema == nil {
		return nil
	}
	
	// Validate required fields and types
	for fieldName, fieldDef := range inputSchema {
		if err := e.validateField(fieldName, fieldDef, req.InputParameters); err != nil {
			return fmt.Errorf("field %s: %w", fieldName, err)
		}
	}
	
	return nil
}

// validateField validates individual field against its definition
func (e *Engine) validateField(fieldName string, fieldDef interface{}, params map[string]interface{}) error {
	value, exists := params[fieldName]
	
	// Handle different field definition formats
	switch def := fieldDef.(type) {
	case string:
		// Simple type definition (e.g., "string", "enum", "object")
		return e.validateSimpleField(fieldName, def, value, exists, true) // Default required
	case map[string]interface{}:
		// Detailed definition with type, required, etc.
		return e.validateDetailedField(fieldName, def, value, exists)
	default:
		// Unknown definition format, skip validation
		return nil
	}
}

// validateSimpleField validates field with simple type definition
func (e *Engine) validateSimpleField(fieldName, typeDef string, value interface{}, exists, required bool) error {
	if required && !exists {
		return fmt.Errorf("required field missing")
	}
	
	if !exists {
		return nil // Optional field not provided
	}
	
	// Validate type
	switch typeDef {
	case "string":
		if _, ok := value.(string); !ok {
			return fmt.Errorf("expected string, got %T", value)
		}
	case "enum":
		if _, ok := value.(string); !ok {
			return fmt.Errorf("expected string (enum), got %T", value)
		}
	case "object":
		if _, ok := value.(map[string]interface{}); !ok {
			return fmt.Errorf("expected object, got %T", value)
		}
	case "array":
		if _, ok := value.([]interface{}); !ok {
			return fmt.Errorf("expected array, got %T", value)
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("expected boolean, got %T", value)
		}
	case "integer":
		switch value.(type) {
		case int, int32, int64, float64:
			// Accept numeric types
		default:
			return fmt.Errorf("expected integer, got %T", value)
		}
	}
	
	return nil
}

// validateDetailedField validates field with detailed definition
func (e *Engine) validateDetailedField(fieldName string, fieldDef map[string]interface{}, value interface{}, exists bool) error {
	// Extract required flag (default true)
	required := true
	if reqVal, ok := fieldDef["required"].(bool); ok {
		required = reqVal
	}
	
	// Extract type (default string)
	typeDef := "string"
	if typeVal, ok := fieldDef["type"].(string); ok {
		typeDef = typeVal
	}
	
	// Validate using simple field validation
	if err := e.validateSimpleField(fieldName, typeDef, value, exists, required); err != nil {
		return err
	}
	
	// Additional validation for enum values
	if typeDef == "string" || typeDef == "enum" {
		if enumVals, ok := fieldDef["enum"].([]interface{}); ok && exists {
			valueStr, ok := value.(string)
			if !ok {
				return fmt.Errorf("enum value must be string")
			}
			
			valid := false
			for _, enumVal := range enumVals {
				if enumStr, ok := enumVal.(string); ok && enumStr == valueStr {
					valid = true
					break
				}
			}
			
			if !valid {
				return fmt.Errorf("invalid enum value: %s", valueStr)
			}
		}
	}
	
	return nil
}
