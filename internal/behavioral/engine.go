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
	"gorka/internal/utils"
	"github.com/modelcontextprotocol/go-sdk/jsonschema"
	"github.com/sashabaranov/go-openai"
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

	// Load config to get workspace path
	config, err := utils.LoadConfig()
	if err != nil {
		panic(fmt.Sprintf("Failed to load config: %v", err))
	}

	// Initialize tools manager for hybrid execution
	toolsManager := tools.NewToolsManager(config.Workspace, config.Workspace+"/.gorka/storage")

	return &Engine{
		matrices:         make(map[string]*types.BehavioralMatrix),
		qualityValidator: NewQualityValidator(),
		honestyValidator: NewHonestyValidator(),
		agentSpawner:     agentSpawner,
		toolsManager:     toolsManager,
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
	// Phase 1: Get execution plan from LLM
	userInput := formatUserInputFromRequest(req)
	llmResponse, err := e.agentSpawner.SpawnAgent(matrix, userInput)
	if err != nil {
		return nil, fmt.Errorf("OpenRouter agent execution failed: %w", err)
	}

	if len(llmResponse.Choices) == 0 {
		return nil, fmt.Errorf("OpenRouter returned empty response")
	}

	llmContent := llmResponse.Choices[0].Message.Content

	// Phase 2: Execute actual work based on agent type  
	workResults, err := e.executeAgentWork(req.AgentID, llmResponse, req.InputParameters)
	if err != nil {
		return nil, fmt.Errorf("agent work execution failed: %w", err)
	}

	// Phase 3: Create comprehensive result
	result := &types.BehavioralResult{
		AgentID: req.AgentID,
		OutputData: map[string]interface{}{
			"llm_plan":          llmContent,
			"work_results":      workResults,
			"model_used":        llmResponse.Model,
			"tokens_used":       llmResponse.Usage.TotalTokens,
			"completion_tokens": llmResponse.Usage.CompletionTokens,
			"prompt_tokens":     llmResponse.Usage.PromptTokens,
		},
		ExecutionMeta: map[string]interface{}{
			"execution_mode":    "hybrid_llm_plus_tools",
			"agent_id":         req.AgentID,
			"openrouter_model": llmResponse.Model,
			"request_id":       llmResponse.ID,
			"work_executed":    len(workResults) > 0,
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

// executeAgentWork performs actual work based on the OpenAI response with tool calls
func (e *Engine) executeAgentWork(agentID string, openaiResponse *openai.ChatCompletionResponse, inputParams map[string]interface{}) (map[string]interface{}, error) {
	if len(openaiResponse.Choices) == 0 {
		return e.executeAnalysisOnly("No response choices available", agentID), nil
	}

	choice := openaiResponse.Choices[0]
	
	// Check if there are tool calls in the response
	if len(choice.Message.ToolCalls) == 0 {
		// No tool calls, return analysis only
		return e.executeAnalysisOnly(choice.Message.Content, agentID), nil
	}

	// Execute all tool calls and collect results
	toolResults := make(map[string]interface{})
	
	for i, toolCall := range choice.Message.ToolCalls {
		result, err := e.executeOpenAIToolCall(toolCall)
		if err != nil {
			return nil, fmt.Errorf("tool execution failed for %s (call %d): %w", toolCall.Function.Name, i, err)
		}
		
		toolResults[fmt.Sprintf("tool_call_%d_%s", i, toolCall.Function.Name)] = result
	}

	return map[string]interface{}{
		"tool_results":     toolResults,
		"response_content": choice.Message.Content,
		"execution_mode":   "openai_tools",
		"tools_executed":   len(choice.Message.ToolCalls),
	}, nil
}

// executeOpenAIToolCall executes a single OpenAI tool call using the ToolsManager
func (e *Engine) executeOpenAIToolCall(toolCall openai.ToolCall) (string, error) {
	var params map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &params); err != nil {
		return "", fmt.Errorf("failed to parse tool arguments: %w", err)
	}

	// Use the centralized OpenAI tool execution system
	return e.toolsManager.ExecuteOpenAITool(toolCall.Function.Name, params)
}

// executeAnalysisOnly is a fallback for when no tool call is detected.
func (e *Engine) executeAnalysisOnly(llmPlan, agentID string) map[string]interface{} {
	return map[string]interface{}{
		"analysis":       llmPlan,
		"execution_note": fmt.Sprintf("No tool call detected for agent %s. Returning analysis.", agentID),
		"execution_mode": "analysis_only",
	}
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
	// Extract expected input schema using the centralized function from types package
	schema, err := types.ExtractInputSchema(matrix)
	if err != nil {
		return fmt.Errorf("failed to extract input schema: %w", err)
	}
	
	// If no schema properties defined, allow any parameters
	if len(schema.Properties) == 0 {
		return nil
	}
	
	// Validate required fields
	for _, requiredField := range schema.Required {
		if _, exists := req.InputParameters[requiredField]; !exists {
			return fmt.Errorf("required field missing: %s", requiredField)
		}
	}
	
	// Validate field types and constraints
	for fieldName, fieldSchema := range schema.Properties {
		if value, exists := req.InputParameters[fieldName]; exists {
			if err := e.validateFieldValue(fieldName, value, fieldSchema); err != nil {
				return fmt.Errorf("field %s: %w", fieldName, err)
			}
		}
	}
	
	return nil
}

// validateFieldValue validates a single field value against its schema
func (e *Engine) validateFieldValue(fieldName string, value interface{}, schema *jsonschema.Schema) error {
	switch schema.Type {
	case "string":
		if _, ok := value.(string); !ok {
			return fmt.Errorf("expected string, got %T", value)
		}
		// Validate enum constraints
		if len(schema.Enum) > 0 {
			valueStr := value.(string)
			valid := false
			for _, enumVal := range schema.Enum {
				if enumStr, ok := enumVal.(string); ok && enumStr == valueStr {
					valid = true
					break
				}
			}
			if !valid {
				return fmt.Errorf("invalid enum value: %s", valueStr)
			}
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
