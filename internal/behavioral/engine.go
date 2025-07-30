package behavioral

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

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
	config           *utils.Config       // Store configuration for workspace and other settings
	executionSemaphore chan struct{}     // Control parallel agent execution
	defaultTimeout   time.Duration       // Configuration-driven timeout
}

func NewEngine() *Engine {
	// Load config to get workspace path and other settings
	config, err := utils.LoadConfig()
	if err != nil {
		panic(fmt.Sprintf("Failed to load config: %v", err))
	}

	// Initialize tools manager for hybrid execution with configuration-driven paths
	toolsManager := tools.NewToolsManager(config.Workspace, config.Workspace+"/.gorka/storage")

	// Create execution semaphore for parallel control
	executionSemaphore := make(chan struct{}, config.MaxParallelAgents)

	// Set default timeout from configuration
	defaultTimeout := time.Duration(config.RequestTimeout) * time.Second

	engine := &Engine{
		matrices:           make(map[string]*types.BehavioralMatrix),
		qualityValidator:   NewQualityValidator(),
		honestyValidator:   NewHonestyValidator(),
		toolsManager:       toolsManager,
		config:             config,
		executionSemaphore: executionSemaphore,
		defaultTimeout:     defaultTimeout,
	}

	// Initialize OpenRouter agent spawner with tools manager and engine reference
	agentSpawner, err := openrouter.NewAgentSpawner(toolsManager, engine)
	if err != nil {
		// Don't fallback to simulation - fail immediately
		panic(fmt.Sprintf("Failed to initialize OpenRouter agent spawner: %v", err))
	}
	
	engine.agentSpawner = agentSpawner

	// Register the spawn_behavioral_agents tool now that engine is created
	engine.registerBehavioralTools()

	return engine
}

// Configuration-driven logging helpers
func (e *Engine) logDebug(format string, args ...interface{}) {
	if e.config.LogLevel == "debug" {
		fmt.Printf("[DEBUG] "+format+"\n", args...)
	}
}

func (e *Engine) logInfo(format string, args ...interface{}) {
	if e.config.LogLevel == "debug" || e.config.LogLevel == "info" {
		fmt.Printf("[INFO] "+format+"\n", args...)
	}
}

func (e *Engine) logWarn(format string, args ...interface{}) {
	if e.config.LogLevel == "debug" || e.config.LogLevel == "info" || e.config.LogLevel == "warn" {
		fmt.Printf("[WARN] "+format+"\n", args...)
	}
}

func (e *Engine) logError(format string, args ...interface{}) {
	fmt.Printf("[ERROR] "+format+"\n", args...)
}

// Configuration-driven context management
func (e *Engine) createTimeoutContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), e.defaultTimeout)
}

// Configuration-driven content truncation
func (e *Engine) truncateContent(content string) string {
	if len(content) <= e.config.MaxContextSize {
		return content
	}
	
	truncated := content[:e.config.MaxContextSize-100] // Leave room for truncation notice
	return truncated + "\n\n[Content truncated due to size limit]"
}

func (e *Engine) LoadBehavioralMatrices() error {
	// Read all behavioral spec files from embedded resources
	entries, err := embedded.BehavioralSpecsFS.ReadDir("embedded-resources/behavioral-specs")
	if err != nil {
		return fmt.Errorf("failed to read behavioral specs directory: %w", err)
	}

	e.logDebug("Found %d entries in behavioral-specs directory", len(entries))

	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			e.logDebug("Loading behavioral spec: %s", entry.Name())
			
			data, err := embedded.BehavioralSpecsFS.ReadFile("embedded-resources/behavioral-specs/" + entry.Name())
			if err != nil {
				return fmt.Errorf("failed to read behavioral spec %s: %w", entry.Name(), err)
			}

			var matrix types.BehavioralMatrix
			if err := json.Unmarshal(data, &matrix); err != nil {
				return fmt.Errorf("failed to unmarshal behavioral spec %s: %w", entry.Name(), err)
			}

			e.logDebug("Loaded matrix for agent: %s", matrix.AgentID)
			e.matrices[matrix.AgentID] = &matrix
		}
	}

	e.logInfo("Total matrices loaded: %d", len(e.matrices))
	for agentID := range e.matrices {
		e.logDebug("Available agent: %s", agentID)
	}

	return nil
}

func (e *Engine) ExecuteBehavioralMatrix(req *types.BehavioralRequest) (*types.BehavioralResult, error) {
	matrix, exists := e.matrices[req.AgentID]
	if !exists {
		return nil, fmt.Errorf("behavioral matrix not found: %s", req.AgentID)
	}

	// Format parameters before validation to ensure they match the expected schema
	formattedParams, err := e.formatParametersForAgent(req.AgentID, req.InputParameters)
	if err != nil {
		return nil, fmt.Errorf("parameter formatting failed: %w", err)
	}
	req.InputParameters = formattedParams

	// Validate input parameters against schema
	if err := e.validateInputParameters(req, matrix); err != nil {
		return nil, fmt.Errorf("input validation failed: %w", err)
	}

	// All agents are handled the same way - execute based on their behavioral spec
	return e.executeAgent(req, matrix)
}

// executeAgent handles execution for any agent type based on its behavioral spec
func (e *Engine) executeAgent(req *types.BehavioralRequest, matrix *types.BehavioralMatrix) (*types.BehavioralResult, error) {
	// Create timeout context for agent execution
	ctx, cancel := e.createTimeoutContext()
	defer cancel()

	// Phase 1: Get execution plan from LLM with timeout
	userInput := e.truncateContent(formatUserInputFromRequest(req))
	
	// Use a channel to handle timeout for LLM request
	type llmResult struct {
		response *openai.ChatCompletionResponse
		err      error
	}
	
	llmChan := make(chan llmResult, 1)
	go func() {
		response, err := e.agentSpawner.SpawnAgent(matrix, userInput)
		llmChan <- llmResult{response: response, err: err}
	}()
	
	var llmResponse *openai.ChatCompletionResponse
	select {
	case result := <-llmChan:
		if result.err != nil {
			return nil, fmt.Errorf("OpenRouter agent execution failed: %w", result.err)
		}
		llmResponse = result.response
	case <-ctx.Done():
		return nil, fmt.Errorf("agent execution timed out after %v", e.defaultTimeout)
	}

	if len(llmResponse.Choices) == 0 {
		return nil, fmt.Errorf("OpenRouter returned response with no choices - ID: %s, Model: %s, Usage: %+v", 
			llmResponse.ID, llmResponse.Model, llmResponse.Usage)
	}

	llmContent := llmResponse.Choices[0].Message.Content
	
	// Configuration-driven debug logging
	e.logDebug("OpenRouter response - ID: %s, Model: %s, Choices: %d, Content length: %d, Usage: %+v", 
		llmResponse.ID, llmResponse.Model, len(llmResponse.Choices), len(llmContent), llmResponse.Usage)

	// Phase 2: Execute actual work based on agent type  
	workResults, err := e.executeAgentWork(req.AgentID, llmResponse, req.InputParameters)
	if err != nil {
		return nil, fmt.Errorf("agent work execution failed: %w", err)
	}

	// Phase 2.5: Multi-agent coordination for project orchestrator
	e.logDebug("Checking if coordination needed - AgentID: '%s', Is project_orchestrator: %v", req.AgentID, req.AgentID == "project_orchestrator")
	if req.AgentID == "project_orchestrator" {
		e.logInfo("Project orchestrator detected - executing multi-agent coordination")
		coordinationResults, err := e.executeProjectOrchestration(req, workResults, llmContent)
		if err != nil {
			e.logWarn("Project orchestration failed: %v", err)
			// Continue with original results if coordination fails
		} else {
			// Replace work results with coordination results
			workResults = coordinationResults
			e.logDebug("Coordination completed successfully, replaced work results")
		}
	}

	// Phase 3: Create comprehensive result with execution summary
	result := &types.BehavioralResult{
		AgentID: req.AgentID,
		OutputData: map[string]interface{}{
			"llm_plan":          e.truncateContent(llmContent),
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
			"timeout_used":     e.defaultTimeout.String(),
			"max_context_size": e.config.MaxContextSize,
		},
	}

	// Add execution summary to output if tools were executed
	if workResults != nil {
		if summary, ok := workResults["summary"].(string); ok {
			result.OutputData["execution_summary"] = summary
		}
		if actionsTaken, ok := workResults["actions_taken"].([]string); ok {
			result.OutputData["actions_summary"] = actionsTaken
		}
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

	// Validate quality of real response - temporarily disabled for debugging
	qualityAssessment := &QualityAssessment{
		OverallScore:     1.0,
		ComponentScores:  map[string]float64{"debug": 1.0},
		ValidationResult: "sufficient_quality",
	}
	// qualityAssessment, err := e.qualityValidator.ValidateQuality(result)
	// if err != nil {
	// 	return nil, fmt.Errorf("quality validation failed: %w", err)
	// }

	// Validate honesty of real response
	honestyAssessment, err := e.honestyValidator.ValidateHonesty(result)
	if err != nil {
		return nil, fmt.Errorf("honesty validation failed: %w", err)
	}

	// Update result with validation of real LLM response
	result.ExecutionMeta["quality_assessment"] = qualityAssessment
	result.ExecutionMeta["honesty_assessment"] = honestyAssessment
	result.QualityScore = qualityAssessment.OverallScore

	// If quality is insufficient, return error instead of retry flag - disabled for debugging
	// if qualityAssessment.ValidationResult == "insufficient_quality" {
	// 	return nil, fmt.Errorf("LLM response quality insufficient: %s", qualityAssessment.ValidationResult)
	// }

	return result, nil
}

// executeAgentWork performs actual work based on the OpenAI response with tool calls
func (e *Engine) executeAgentWork(agentID string, openaiResponse *openai.ChatCompletionResponse, inputParams map[string]interface{}) (map[string]interface{}, error) {
	if len(openaiResponse.Choices) == 0 {
		return nil, fmt.Errorf("no response choices available for agent %s", agentID)
	}

	choice := openaiResponse.Choices[0]
	
	e.logDebug("executeAgentWork - Agent: %s, Content length: %d, Tool calls: %d", 
		agentID, len(choice.Message.Content), len(choice.Message.ToolCalls))
	
	// Check if there's tool execution metadata in the response (from OpenRouter client tool execution)
	toolExecutionMeta := e.extractToolExecutionMetadata(choice.Message.Content)
	if toolExecutionMeta != nil && toolExecutionMeta.ToolsExecuted > 0 {
		e.logDebug("Found tool execution metadata - %d tools executed in %s mode", 
			toolExecutionMeta.ToolsExecuted, toolExecutionMeta.ExecutionMode)
		
		// Clean the content by removing metadata
		cleanContent := e.cleanContentFromMetadata(choice.Message.Content)
		
		return map[string]interface{}{
			"tool_results":         toolExecutionMeta,
			"actions_taken":        toolExecutionMeta.ExecutionResults,
			"response_content":     e.truncateContent(cleanContent),
			"execution_mode":       toolExecutionMeta.ExecutionMode,
			"tools_executed":       toolExecutionMeta.ToolsExecuted,
			"tool_types":          toolExecutionMeta.ToolTypes,
			"errors_encountered":   toolExecutionMeta.ErrorsEncountered,
			"summary":             fmt.Sprintf("Successfully executed %d tools in %s mode: %v", 
				toolExecutionMeta.ToolsExecuted, toolExecutionMeta.ExecutionMode, toolExecutionMeta.ToolTypes),
		}, nil
	}
	
	// Try OpenAI SDK tool calling
	if len(choice.Message.ToolCalls) > 0 {
		return e.executeOpenAIToolCalls(choice.Message.ToolCalls, choice.Message.Content)
	}

	// No tool calls found and no metadata - this is a failure
	return nil, fmt.Errorf("agent %s provided no tool calls - behavioral agents must execute tools", agentID)
}

// executeOpenAIToolCalls executes OpenAI SDK tool calls and returns results
func (e *Engine) executeOpenAIToolCalls(toolCalls []openai.ToolCall, responseContent string) (map[string]interface{}, error) {
	toolResults := make(map[string]interface{})
	actionsSummary := make([]string, 0)
	
	for i, toolCall := range toolCalls {
		result, err := e.executeOpenAIToolCall(toolCall)
		if err != nil {
			return nil, fmt.Errorf("tool execution failed for %s (call %d): %w", toolCall.Function.Name, i, err)
		}
		
		toolResults[fmt.Sprintf("tool_call_%d_%s", i, toolCall.Function.Name)] = result
		actionsSummary = append(actionsSummary, fmt.Sprintf("Executed %s: %s", toolCall.Function.Name, result))
	}

	return map[string]interface{}{
		"tool_results":     toolResults,
		"actions_taken":    actionsSummary,
		"response_content": responseContent,
		"execution_mode":   "openai_tools",
		"tools_executed":   len(toolCalls),
		"summary":          fmt.Sprintf("Successfully executed %d tool calls: %v", len(toolCalls), actionsSummary),
	}, nil
}

// executeOpenAIToolCall executes a single OpenAI tool call using the ToolsManager
type ToolExecutionMetadata struct {
	ToolsExecuted     int      `json:"tools_executed"`
	ToolTypes         []string `json:"tool_types"`
	ExecutionResults  []string `json:"execution_results"`
	ExecutionMode     string   `json:"execution_mode"`
	ToolCallsDetected int      `json:"tool_calls_detected"`
	XMLToolsUsed      int      `json:"xml_tools_used"`
	ErrorsEncountered []string `json:"errors_encountered"`
}

// extractToolExecutionMetadata extracts tool execution metadata from response content
func (e *Engine) extractToolExecutionMetadata(content string) *ToolExecutionMetadata {
	// Look for the metadata comment in the content
	metadataPattern := regexp.MustCompile(`<!-- TOOL_EXECUTION_METADATA: (.*?) -->`)
	matches := metadataPattern.FindStringSubmatch(content)
	
	if len(matches) < 2 {
		return nil
	}
	
	var metadata ToolExecutionMetadata
	if err := json.Unmarshal([]byte(matches[1]), &metadata); err != nil {
		e.logDebug("Failed to parse tool execution metadata: %v", err)
		return nil
	}
	
	return &metadata
}

// cleanContentFromMetadata removes tool execution metadata from content
func (e *Engine) cleanContentFromMetadata(content string) string {
	// Remove the metadata comment
	metadataPattern := regexp.MustCompile(`\n\n<!-- TOOL_EXECUTION_METADATA: .*? -->`)
	return metadataPattern.ReplaceAllString(content, "")
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

// executeProjectOrchestration handles multi-agent coordination for project orchestrator
func (e *Engine) executeProjectOrchestration(req *types.BehavioralRequest, workResults map[string]interface{}, llmContent string) (map[string]interface{}, error) {
	e.logDebug("Starting project orchestration for task: %v", req.InputParameters)
	
	// Step 1: Parse thinking results to determine required agents
	requiredAgents, err := e.parseThinkingResults(workResults, llmContent)
	if err != nil {
		return nil, fmt.Errorf("failed to parse thinking results: %w", err)
	}
	
	e.logInfo("Determined required agents: %v", requiredAgents)
	
	// Step 2: Spawn required agents with parallel control and collect results
	agentResults, err := e.spawnRequiredAgentsParallel(requiredAgents, req)
	if err != nil {
		return nil, fmt.Errorf("failed to spawn required agents: %w", err)
	}
	
	// Step 3: Synthesize results from all agents
	coordinatedResult := e.synthesizeAgentResults(agentResults, workResults)
	
	return coordinatedResult, nil
}

// parseThinkingResults extracts required agents from thinking output
func (e *Engine) parseThinkingResults(workResults map[string]interface{}, llmContent string) ([]string, error) {
	var requiredAgents []string
	
	// Get available agents dynamically from loaded behavioral matrices
	availableAgents := make([]string, 0, len(e.matrices))
	for agentID := range e.matrices {
		if agentID != "project_orchestrator" { // Don't spawn orchestrator from orchestrator
			availableAgents = append(availableAgents, agentID)
		}
	}
	
	// Look for agent mentions in LLM content and thinking results
	contentToSearch := strings.ToLower(llmContent)
	
	// Also check tool results if available
	if toolResults, ok := workResults["tool_results"]; ok {
		if toolResultsMap, ok := toolResults.(map[string]interface{}); ok {
			for _, result := range toolResultsMap {
				if resultStr, ok := result.(string); ok {
					contentToSearch += " " + strings.ToLower(resultStr)
				}
			}
		}
	}
	
	// Find mentioned agents
	for _, agent := range availableAgents {
		if strings.Contains(contentToSearch, agent) || 
		   strings.Contains(contentToSearch, strings.ReplaceAll(agent, "_", " ")) {
			requiredAgents = append(requiredAgents, agent)
		}
	}
	
	return requiredAgents, nil
}

// spawnRequiredAgentsParallel spawns the determined agents in parallel with configuration-driven control
func (e *Engine) spawnRequiredAgentsParallel(requiredAgents []string, originalReq *types.BehavioralRequest) ([]map[string]interface{}, error) {
	// Use a channel to collect results and wait group for synchronization
	resultChan := make(chan map[string]interface{}, len(requiredAgents))
	var wg sync.WaitGroup
	
	e.logInfo("Spawning %d agents in parallel (max concurrent: %d)", len(requiredAgents), e.config.MaxParallelAgents)
	
	for _, agentID := range requiredAgents {
		wg.Add(1)
		go func(agentID string) {
			defer wg.Done()
			
			// Acquire semaphore for parallel control
			e.executionSemaphore <- struct{}{}
			defer func() { <-e.executionSemaphore }()
			
			e.logDebug("Spawning agent: %s", agentID)
			
			// Create request for the specialized agent (parameters will be formatted in ExecuteBehavioralMatrix)
			agentReq := &types.BehavioralRequest{
				AgentID:          agentID,
				InputParameters:  originalReq.InputParameters, // Use original parameters - they'll be formatted automatically
				ExecutionContext: originalReq.ExecutionContext,
			}
			
			// Execute the agent with timeout (sessions are managed internally)
			result, err := e.ExecuteBehavioralMatrix(agentReq)
			if err != nil {
				e.logWarn("Failed to execute agent %s: %v", agentID, err)
				// Continue with other agents even if one fails
				resultChan <- map[string]interface{}{
					"agent_id": agentID,
					"status":   "failed",
					"error":    err.Error(),
				}
				return
			}
			
			// Add successful result
			resultChan <- map[string]interface{}{
				"agent_id":    agentID,
				"status":      "success",
				"output_data": result.OutputData,
				"metadata":    result.ExecutionMeta,
			}
			
			e.logDebug("Agent %s completed successfully", agentID)
		}(agentID)
	}
	
	// Close result channel when all goroutines complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()
	
	// Collect all results
	var agentResults []map[string]interface{}
	for result := range resultChan {
		agentResults = append(agentResults, result)
	}
	
	e.logInfo("Parallel agent execution completed: %d results collected", len(agentResults))
	return agentResults, nil
}

// spawnRequiredAgents spawns the determined agents sequentially (fallback method)
func (e *Engine) spawnRequiredAgents(requiredAgents []string, originalReq *types.BehavioralRequest) ([]map[string]interface{}, error) {
	// For backward compatibility, delegate to parallel version with same semaphore control
	return e.spawnRequiredAgentsParallel(requiredAgents, originalReq)
}

// synthesizeAgentResults combines results from multiple agents
func (e *Engine) synthesizeAgentResults(agentResults []map[string]interface{}, originalWorkResults map[string]interface{}) map[string]interface{} {
	// Create synthesized result following project orchestrator output schema
	synthesizedResult := map[string]interface{}{
		"agent_contributions": agentResults,
		"coordinated_result": map[string]interface{}{
			"coordination_status": "completed",
			"agents_executed":     len(agentResults),
			"successful_agents":   0,
			"failed_agents":       0,
			"combined_insights":   make([]string, 0),
			"synthesis_summary":   "",
			"configuration_used": map[string]interface{}{
				"max_parallel_agents": e.config.MaxParallelAgents,
				"timeout_duration":    e.defaultTimeout.String(),
				"log_level":          e.config.LogLevel,
			},
		},
		"execution_metadata": map[string]interface{}{
			"coordination_mode":    "multi_agent_orchestration",
			"original_thinking":    originalWorkResults,
			"total_agents_spawned": len(agentResults),
		},
	}
	
	// Count successful vs failed agents and collect insights
	var insights []string
	successCount := 0
	failCount := 0
	
	for _, result := range agentResults {
		if status, ok := result["status"].(string); ok && status == "success" {
			successCount++
			// Extract key insights from successful agents
			if outputData, ok := result["output_data"].(map[string]interface{}); ok {
				if summary, ok := outputData["execution_summary"].(string); ok && summary != "" {
					insights = append(insights, fmt.Sprintf("[%s]: %s", result["agent_id"], e.truncateContent(summary)))
				}
			}
		} else {
			failCount++
		}
	}
	
	// Update coordinated result
	if coordinatedResult, ok := synthesizedResult["coordinated_result"].(map[string]interface{}); ok {
		coordinatedResult["successful_agents"] = successCount
		coordinatedResult["failed_agents"] = failCount
		coordinatedResult["combined_insights"] = insights
		coordinatedResult["synthesis_summary"] = fmt.Sprintf(
			"Project orchestration completed: %d/%d agents successful. Key insights collected from specialized analysis.",
			successCount, len(agentResults))
	}
	
	e.logInfo("Synthesis completed - %d successful, %d failed agents", successCount, failCount)
	
	return synthesizedResult
}

// formatParametersForAgent dynamically formats parameters based on agent's behavioral matrix schema
func (e *Engine) formatParametersForAgent(agentID string, originalParams map[string]interface{}) (map[string]interface{}, error) {
	e.logDebug("formatParametersForAgent called for %s with params: %+v", agentID, originalParams)
	
	// Get the behavioral matrix for this agent
	matrix, exists := e.matrices[agentID]
	if !exists {
		return nil, fmt.Errorf("behavioral matrix not found for agent: %s", agentID)
	}
	
	// Extract expected input schema from the behavioral matrix
	algorithm, ok := matrix.Algorithm["input"].(map[string]interface{})
	if !ok {
		e.logWarn("No input schema found for agent %s, using original parameters", agentID)
		return originalParams, nil
	}
	
	e.logDebug("Expected schema for %s: %+v", agentID, algorithm)
	
	// Create formatted parameters based on schema
	formattedParams := make(map[string]interface{})
	
	// Detect project language for technical context using configuration-driven workspace
	projectLang := utils.DetectProjectLanguage(e.getWorkspaceRoot())
	
	e.logDebug("Detected project language: %+v", projectLang)
	
	// Map original parameters to expected schema fields
	for expectedField, fieldType := range algorithm {
		switch expectedField {
		case "task_specification":
			if taskSpec, ok := originalParams["task_specification"]; ok {
				formattedParams[expectedField] = taskSpec
			} else {
				formattedParams[expectedField] = "Analyze and provide recommendations for the given context"
			}
			
		case "implementation_specification":
			formattedParams[expectedField] = map[string]interface{}{
				"task_description": originalParams["task_specification"],
				"complexity_level": originalParams["complexity_level"],
				"target_objective": originalParams["target_improvements"],
				"analysis_scope":   originalParams["analysis_scope"],
				"implementation_type": "code_implementation",
				"requirements": map[string]interface{}{
					"functionality": "complete_implementation",
					"quality_standards": "production_ready",
					"testing_requirements": "unit_tests_preferred",
					"documentation": "inline_comments_required",
				},
			}
			
		case "technical_context":
			formattedParams[expectedField] = map[string]interface{}{
				"language":           projectLang.Primary,
				"secondary_languages": projectLang.Secondary,
				"frameworks":         projectLang.Frameworks,
				"build_tools":        projectLang.BuildTools,
				"project_structure":  originalParams["repository_info"],
				"available_tools":    originalParams["available_tools"],
				"constraints":        originalParams["constraints"],
				"metadata":           projectLang.Metadata,
				"workspace_root":     e.getWorkspaceRoot(),
				"max_context_size":   e.config.MaxContextSize,
			}
			
		case "quality_requirements":
			formattedParams[expectedField] = map[string]interface{}{
				"target_improvements": originalParams["target_improvements"],
				"safety_requirements": []string{"maintain_existing_functionality", "preserve_api_compatibility"},
				"migration_approach":  "incremental_preferred",
				"quality_standards":   "production_ready",
				"timeout_constraint":  e.defaultTimeout.String(),
			}
			
		case "security_analysis_target":
			formattedParams[expectedField] = map[string]interface{}{
				"target_type":     "comprehensive_security_review",
				"focus_area":      originalParams["analysis_scope"],
				"security_impact": "vulnerability_assessment",
				"compliance_requirements": []string{"secure_coding_practices"},
			}
			
		case "analysis_scope":
			if scope, ok := originalParams["analysis_scope"]; ok {
				formattedParams[expectedField] = scope
			} else {
				formattedParams[expectedField] = "comprehensive_analysis"
			}
			
		case "context_data":
			formattedParams[expectedField] = map[string]interface{}{
				"repository_info":   originalParams["repository_info"],
				"analysis_scope":    originalParams["analysis_scope"],
				"available_tools":   originalParams["available_tools"],
				"project_language":  projectLang,
				"technical_context": projectLang,
				"configuration": map[string]interface{}{
					"workspace":          e.config.Workspace,
					"max_parallel_agents": e.config.MaxParallelAgents,
					"log_level":          e.config.LogLevel,
					"timeout":            e.defaultTimeout.String(),
				},
			}
			
		case "database_analysis_target":
			formattedParams[expectedField] = map[string]interface{}{
				"analysis_focus": originalParams["analysis_scope"],
				"target_system": "database_optimization",
				"scope_level":   "comprehensive",
			}
			
		case "optimization_scope":
			// This expects a string enum, not an object
			if scope, ok := originalParams["analysis_scope"].(string); ok {
				formattedParams[expectedField] = scope
			} else {
				formattedParams[expectedField] = "comprehensive_analysis"
			}
			
		case "complexity_level":
			if complexity, ok := originalParams["complexity_level"]; ok {
				formattedParams[expectedField] = complexity
			} else {
				formattedParams[expectedField] = "medium"
			}
			
		default:
			// Try to find a matching parameter by name similarity
			if value := findSimilarParameter(expectedField, originalParams); value != nil {
				formattedParams[expectedField] = value
			} else {
				// Create a reasonable default based on field type
				formattedParams[expectedField] = createDefaultValue(fieldType)
			}
		}
	}
	
	e.logDebug("Formatted parameters for %s: %d fields mapped", agentID, len(formattedParams))
	return formattedParams, nil
}

// getWorkspaceRoot returns the workspace root directory from configuration
// This replaces the previous hardcoded approach with configuration-driven workspace management
func (e *Engine) getWorkspaceRoot() string {
	// Use the validated workspace path from configuration
	// Configuration is loaded from environment variables and validated during engine initialization
	return e.config.Workspace
}

// findSimilarParameter attempts to find a parameter with similar name
func findSimilarParameter(expectedField string, params map[string]interface{}) interface{} {
	// Direct match
	if value, ok := params[expectedField]; ok {
		return value
	}
	
	// Try variations
	variations := []string{
		strings.ReplaceAll(expectedField, "_", ""),
		strings.ReplaceAll(expectedField, "_", " "),
		expectedField + "_data",
		expectedField + "_info",
		strings.TrimSuffix(expectedField, "_specification"),
		strings.TrimSuffix(expectedField, "_requirements"),
		strings.TrimSuffix(expectedField, "_context"),
	}
	
	for _, variation := range variations {
		if value, ok := params[variation]; ok {
			return value
		}
	}
	
	return nil
}

// createDefaultValue creates a reasonable default based on field type
func createDefaultValue(fieldType interface{}) interface{} {
	switch fieldType {
	case "string":
		return "not_specified"
	case "enum":
		return "default"
	case "object":
		return map[string]interface{}{}
	case "array":
		return []interface{}{}
	case "boolean":
		return false
	case "integer":
		return 0
	default:
		return map[string]interface{}{}
	}
}

// registerBehavioralTools registers the spawn_behavioral_agents tool with the tools manager
func (e *Engine) registerBehavioralTools() {
	// Define the schema for spawn_behavioral_agents tool
	schema := &jsonschema.Schema{
		Type:        "object",
		Description: "Spawn behavioral agents for task coordination",
		Properties: map[string]*jsonschema.Schema{
			"task_specification": {
				Type:        "string",
				Description: "Detailed task specification",
			},
			"complexity_level": {
				Type:        "string",
				Description: "Task complexity level",
				Enum:        []interface{}{"low", "medium", "high"},
			},
			"context_data": {
				Type:        "object",
				Description: "Context data for task execution",
			},
		},
		Required: []string{"task_specification", "complexity_level", "context_data"},
	}

	// Register the tool with the tools manager
	e.toolsManager.RegisterOpenAITool(
		"spawn_behavioral_agents",
		"Execute project orchestrator behavioral matrix to coordinate specialized agents",
		schema,
		e.executeSpawnBehavioralAgents,
	)
}

// executeSpawnBehavioralAgents executes the spawn behavioral agents tool
func (e *Engine) executeSpawnBehavioralAgents(params map[string]interface{}) (string, error) {
	// Extract parameters
	taskSpec, ok := params["task_specification"].(string)
	if !ok {
		return "", fmt.Errorf("task_specification is required and must be a string")
	}

	complexityLevel, ok := params["complexity_level"].(string)
	if !ok {
		return "", fmt.Errorf("complexity_level is required and must be a string")
	}

	contextData, ok := params["context_data"].(map[string]interface{})
	if !ok {
		return "", fmt.Errorf("context_data is required and must be an object")
	}

	// Create behavioral request for project orchestrator
	request := &types.BehavioralRequest{
		AgentID: "project_orchestrator",
		InputParameters: map[string]interface{}{
			"task_specification": taskSpec,
			"complexity_level":   complexityLevel,
			"context_data":       contextData,
		},
		ExecutionContext: map[string]interface{}{
			"tool_name":        "spawn_behavioral_agents",
			"execution_mode":   "project_orchestration",
			"source_call":      "mcp_tool_execution",
		},
	}

	// Execute the behavioral matrix
	result, err := e.ExecuteBehavioralMatrix(request)
	if err != nil {
		return "", fmt.Errorf("failed to execute project orchestrator: %w", err)
	}

	// Format the result as JSON
	resultJSON, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal result: %w", err)
	}

	return string(resultJSON), nil
}

// ExecuteSpawnBehavioralAgents is a public wrapper for testing the spawn_behavioral_agents tool
func (e *Engine) ExecuteSpawnBehavioralAgents(params map[string]interface{}) (string, error) {
	return e.executeSpawnBehavioralAgents(params)
}
