---
target_execution: "llm_agent_implementation"
implementation_domain: "openrouter_agent_spawning"
---

# OPENROUTER AGENT SPAWNING IMPLEMENTATION

## AGENT_SPAWNER_CORE_IMPLEMENTATION

File: `internal/openrouter/agent.go`

```go
package openrouter

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/sashabaranov/go-openai"
)

// Agent represents a spawned LLM agent with behavioral context
type Agent struct {
	ID                string
	AgentType        string
	BehavioralMatrix BehavioralMatrix
	Session          *Session
	Client           *Client
	Context          context.Context
	Cancel           context.CancelFunc
}

// BehavioralMatrix defines agent behavioral specifications
type BehavioralMatrix struct {
	AgentID           string                 `json:"agent_id"`
	MCPTool          string                 `json:"mcp_tool"`
	VSCodeChatmode   string                 `json:"vscode_chatmode"`
	BehavioralPrompt  BehavioralPromptSpec   `json:"behavioral_prompt"`
}

// BehavioralPromptSpec defines input/output schemas and instructions
type BehavioralPromptSpec struct {
	SystemPromptTemplate string                 `json:"system_prompt_template"`
	InputSchema        map[string]interface{} `json:"input_schema"`
	SystemInstructions []string               `json:"system_instructions"`
	OutputSchema       map[string]interface{} `json:"output_schema"`
	Tools             ToolAccess             `json:"tools"`
}

// ToolAccess defines tool availability for agent execution modes
type ToolAccess struct {
	MCPMode    []string `json:"mcp_mode"`
	VSCodeMode []string `json:"vscode_mode"`
}

// Session manages agent conversation state
type Session struct {
	ID        string
	Messages  []openai.ChatCompletionMessage
	CreatedAt time.Time
	UpdatedAt time.Time
}

// AgentSpawner manages LLM agent creation and lifecycle
type AgentSpawner struct {
	client              *Client
	behavioralSpecs     map[string]BehavioralMatrix
	activeSessions      map[string]*Session
	maxParallelAgents   int
	activeAgentCount    int
	coreSystemPrinciples string
}

// NewAgentSpawner creates agent spawning controller
func NewAgentSpawner(client *Client, maxParallel int) *AgentSpawner {
	return &AgentSpawner{
		client:              client,
		behavioralSpecs:     make(map[string]BehavioralMatrix),
		activeSessions:      make(map[string]*Session),
		maxParallelAgents:   maxParallel,
		activeAgentCount:    0,
		coreSystemPrinciples: "",
	}
}

// LoadBehavioralSpecs loads behavioral matrices from embedded JSON
func (as *AgentSpawner) LoadBehavioralSpecs(specs map[string]BehavioralMatrix) {
	as.behavioralSpecs = specs
}

// LoadCoreSystemPrinciples loads core system principles for embedding in prompts
func (as *AgentSpawner) LoadCoreSystemPrinciples(principles string) {
	as.coreSystemPrinciples = principles
}

// SpawnAgent creates new LLM agent with behavioral context
func (as *AgentSpawner) SpawnAgent(ctx context.Context, agentType string, taskContext map[string]interface{}) (*Agent, error) {
	// Validate agent capacity
	if as.activeAgentCount >= as.maxParallelAgents {
		return nil, fmt.Errorf("maximum_parallel_agents_reached: %d", as.maxParallelAgents)
	}

	// Retrieve behavioral matrix
	behavioralMatrix, exists := as.behavioralSpecs[agentType]
	if !exists {
		return nil, fmt.Errorf("unknown_agent_type: %s", agentType)
	}

	// Create agent session
	session := &Session{
		ID:        generateSessionID(),
		Messages:  []openai.ChatCompletionMessage{},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Create agent context with cancellation
	agentCtx, cancel := context.WithCancel(ctx)

	// Initialize agent
	agent := &Agent{
		ID:                generateAgentID(),
		AgentType:        agentType,
		BehavioralMatrix: behavioralMatrix,
		Session:          session,
		Client:           as.client,
		Context:          agentCtx,
		Cancel:           cancel,
	}

	// Inject behavioral context into system prompt
	systemMessage := as.buildSystemPrompt(behavioralMatrix, taskContext)
	session.Messages = append(session.Messages, systemMessage)

	// Register active session
	as.activeSessions[session.ID] = session
	as.activeAgentCount++

	return agent, nil
}

// buildSystemPrompt constructs behavioral system prompt with context injection
// This same prompt is used for both OpenRouter agents AND VSCode chatmodes
func (as *AgentSpawner) buildSystemPrompt(matrix BehavioralMatrix, taskContext map[string]interface{}) openai.ChatCompletionMessage {
	// Convert behavioral matrix to JSON for system prompt
	behavioralJSON, _ := json.Marshal(matrix.BehavioralPrompt)

	// Convert task context to JSON
	contextJSON, _ := json.Marshal(taskContext)

	// Standard execution protocol for all agents
	executionProtocol := map[string]interface{}{
		"thinking_requirement": "mandatory_sequential_thinking_15_plus_thoughts_minimum",
		"evidence_validation": map[string]interface{}{
			"file_path_references": map[string]interface{}{
				"required": true,
				"weight":   40,
			},
			"actionable_steps": map[string]interface{}{
				"required": true,
				"weight":   30,
			},
			"structured_output": map[string]interface{}{
				"required": true,
				"weight":   30,
			},
		},
		"honesty_protocols": map[string]interface{}{
			"limitation_disclosure": "mandatory",
			"evidence_based_only":   true,
			"assumption_validation": "required",
		},
		"anti_human_content": map[string]interface{}{
			"performance_metrics": "prohibited",
			"time_estimations":    "prohibited",
			"cost_analysis":       "prohibited",
		},
	}

	executionProtocolJSON, _ := json.Marshal(executionProtocol)

	systemPrompt := fmt.Sprintf(`%s

CORE_SYSTEM_PRINCIPLES:
%s

BEHAVIORAL_EXECUTION_MATRIX:
%s

EXECUTION_PROTOCOL:
%s

TASK_CONTEXT:
%s

Execute according to core system principles, behavioral matrix specifications and execution protocol requirements. Use mandatory sequential thinking (15+ thoughts minimum). Provide only machine-readable JSON outputs. NO human-focused metrics, performance data, time estimations, cost analysis, or efficiency measurements.`,
		matrix.BehavioralPrompt.SystemPromptTemplate,
		as.coreSystemPrinciples,
		string(behavioralJSON),
		string(executionProtocolJSON),
		string(contextJSON))

	return openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleSystem,
		Content: systemPrompt,
	}
}

// BuildChatmodeSystemPrompt constructs identical system prompt for VSCode chatmodes
// This ensures perfect consistency between OpenRouter agents and chatmodes
func (as *AgentSpawner) BuildChatmodeSystemPrompt(matrix BehavioralMatrix, taskContext map[string]interface{}) string {
	message := as.buildSystemPrompt(matrix, taskContext)
	return message.Content
}

// ExecuteTask processes task through spawned agent
func (a *Agent) ExecuteTask(task map[string]interface{}) (map[string]interface{}, error) {
	// Convert task to JSON for LLM processing
	taskJSON, err := json.Marshal(task)
	if err != nil {
		return nil, fmt.Errorf("task_serialization_failed: %w", err)
	}

	// Add user message with task
	userMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: string(taskJSON),
	}

	a.Session.Messages = append(a.Session.Messages, userMessage)
	a.Session.UpdatedAt = time.Now()

	// Execute LLM completion
	response, err := a.Client.CreateChatCompletion(a.Context, a.Session.Messages)
	if err != nil {
		return nil, fmt.Errorf("llm_execution_failed: %w", err)
	}

	// Extract agent response
	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no_llm_response_received")
	}

	agentResponse := response.Choices[0].Message.Content

	// Add assistant response to session
	assistantMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleAssistant,
		Content: agentResponse,
	}
	a.Session.Messages = append(a.Session.Messages, assistantMessage)

	// Parse JSON response
	var result map[string]interface{}
	if err := json.Unmarshal([]byte(agentResponse), &result); err != nil {
		return nil, fmt.Errorf("llm_response_not_valid_json: %w", err)
	}

	return result, nil
}

// CleanupAgent terminates agent and releases resources
func (as *AgentSpawner) CleanupAgent(agent *Agent) {
	agent.Cancel()
	delete(as.activeSessions, agent.Session.ID)
	as.activeAgentCount--
}

// Helper functions
func generateSessionID() string {
	return fmt.Sprintf("session_%d", time.Now().UnixNano())
}

func generateAgentID() string {
	return fmt.Sprintf("agent_%d", time.Now().UnixNano())
}
```

## BEHAVIORAL_SPECS_LOADER_IMPLEMENTATION

File: `internal/openrouter/specs_loader.go`

```go
package openrouter

import (
	"embed"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
)

// BehavioralSpecsLoader manages loading embedded behavioral matrices
// Uses existing implementation from internal/generation/generator.go
type BehavioralSpecsLoader struct {
	embeddedSpecs        embed.FS
	embeddedInstructions embed.FS
}

// NewBehavioralSpecsLoader creates specs loader with embedded FS
func NewBehavioralSpecsLoader(embeddedSpecs embed.FS, embeddedInstructions embed.FS) *BehavioralSpecsLoader {
	return &BehavioralSpecsLoader{
		embeddedSpecs:        embeddedSpecs,
		embeddedInstructions: embeddedInstructions,
	}
}

// LoadAllSpecs loads all behavioral matrices from embedded JSON files
// Reuses existing logic from generation package
func (bsl *BehavioralSpecsLoader) LoadAllSpecs() (map[string]BehavioralMatrix, error) {
	specs := make(map[string]BehavioralMatrix)

	// Walk through embedded behavioral specs directory
	err := bsl.walkEmbeddedSpecs("", func(path string, content []byte) error {
		if !strings.HasSuffix(path, ".json") {
			return nil
		}

		var matrix BehavioralMatrix
		if err := json.Unmarshal(content, &matrix); err != nil {
			return fmt.Errorf("failed_to_parse_behavioral_spec_%s: %w", path, err)
		}

		// Validate required fields
		if matrix.AgentID == "" {
			return fmt.Errorf("missing_agent_id_in_spec: %s", path)
		}

		specs[matrix.AgentID] = matrix
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed_to_load_behavioral_specs: %w", err)
	}

	return specs, nil
}

// GetAvailableAgentTypes returns list of available agent types from loaded specs
func (bsl *BehavioralSpecsLoader) GetAvailableAgentTypes() ([]string, error) {
	specs, err := bsl.LoadAllSpecs()
	if err != nil {
		return nil, err
	}

	agentTypes := make([]string, 0, len(specs))
	for agentID := range specs {
		agentTypes = append(agentTypes, agentID)
	}

	return agentTypes, nil
}

// LoadCoreSystemPrinciples loads embedded core system principles
func (bsl *BehavioralSpecsLoader) LoadCoreSystemPrinciples() (string, error) {
	content, err := bsl.embeddedInstructions.ReadFile("CORE_SYSTEM_PRINCIPLES_GORKA.instructions.md")
	if err != nil {
		return "", fmt.Errorf("failed_to_load_core_system_principles: %w", err)
	}
	return string(content), nil
}

// walkEmbeddedSpecs walks through embedded filesystem
func (bsl *BehavioralSpecsLoader) walkEmbeddedSpecs(dir string, fn func(string, []byte) error) error {
	entries, err := bsl.embeddedSpecs.ReadDir(dir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		path := filepath.Join(dir, entry.Name())

		if entry.IsDir() {
			if err := bsl.walkEmbeddedSpecs(path, fn); err != nil {
				return err
			}
			continue
		}

		content, err := bsl.embeddedSpecs.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed_to_read_embedded_file_%s: %w", path, err)
		}

		if err := fn(path, content); err != nil {
			return err
		}
	}

	return nil
}
```

## MCP_TOOL_REGISTRATION_FOR_AGENT_SPAWNING

File: `internal/mcp/agent_tools.go`

```go
package mcp

import (
	"context"
	"encoding/json"
	"fmt"

	"gorka/internal/openrouter"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
)

// AgentTools provides MCP tool registration for agent spawning
type AgentTools struct {
	spawner     *openrouter.AgentSpawner
	specsLoader *openrouter.BehavioralSpecsLoader
}

// NewAgentTools creates agent tools handler
func NewAgentTools(spawner *openrouter.AgentSpawner, specsLoader *openrouter.BehavioralSpecsLoader) *AgentTools {
	return &AgentTools{
		spawner:     spawner,
		specsLoader: specsLoader,
	}
}

// RegisterTools dynamically registers agent spawning tools based on available specs
func (at *AgentTools) RegisterTools(srv *server.Server) error {
	// Load available specs to determine which tools to register
	specs, err := at.specsLoader.LoadAllSpecs()
	if err != nil {
		return fmt.Errorf("failed_to_load_specs_for_tool_registration: %w", err)
	}

	// Register tools dynamically based on available behavioral specs
	for agentID, matrix := range specs {
		mcpTool := matrix.MCPTool
		if mcpTool == "" {
			continue // Skip specs without MCP tool definition
		}

		// Register the MCP tool with truly dynamic handler - no hardcoded switch
		srv.RegisterTool(mcpTool, func(ctx context.Context, request map[string]interface{}) (map[string]interface{}, error) {
			return at.executeAgent(ctx, agentID, request)
		})
	}

	return nil
}

// validateAgentRequest validates incoming agent spawn requests against available specs
func (at *AgentTools) validateAgentRequest(agentType string, request map[string]interface{}) error {
	// Get available agent types from actual spec files
	availableTypes, err := at.specsLoader.GetAvailableAgentTypes()
	if err != nil {
		return fmt.Errorf("failed_to_get_available_agent_types: %w", err)
	}

	// Create validation map from actual available types
	validAgentTypes := make(map[string]bool)
	for _, agentType := range availableTypes {
		validAgentTypes[agentType] = true
	}

	if !validAgentTypes[agentType] {
		return fmt.Errorf("invalid_agent_type: %s", agentType)
	}

	// Validate request structure
	if request == nil {
		return fmt.Errorf("request_cannot_be_nil")
	}

	// Validate no human-focused content
	if err := at.validateAntiHumanContent(request); err != nil {
		return err
	}

	return nil
}

// validateAntiHumanContent ensures no human-targeted information
func (at *AgentTools) validateAntiHumanContent(data map[string]interface{}) error {
	prohibitedTerms := []string{
		"performance_metrics",
		"time_estimation",
		"cost_analysis",
		"efficiency_measurement",
		"optimization_statistics",
		"resource_utilization",
	}

	dataJSON, _ := json.Marshal(data)
	content := string(dataJSON)

	for _, term := range prohibitedTerms {
		if matched, _ := regexp.MatchString(term, content); matched {
			return fmt.Errorf("prohibited_human_content_detected: %s", term)
		}
	}

	return nil
}

// executeAgent spawns agent and executes task with validation
func (at *AgentTools) executeAgent(ctx context.Context, agentType string, request map[string]interface{}) (map[string]interface{}, error) {
	// Validate request using real spec data
	if err := at.validateAgentRequest(agentType, request); err != nil {
		return nil, fmt.Errorf("agent_request_validation_failed: %w", err)
	}

	// Spawn agent
	agent, err := at.spawner.SpawnAgent(ctx, agentType, request)
	if err != nil {
		return nil, fmt.Errorf("agent_spawn_failed: %w", err)
	}

	// Ensure cleanup
	defer at.spawner.CleanupAgent(agent)

	// Execute task
	result, err := agent.ExecuteTask(request)
	if err != nil {
		return nil, fmt.Errorf("agent_execution_failed: %w", err)
	}

	return result, nil
}
```

## UPDATED_MCP_SERVER_MAIN_ENTRY_POINT

File: `cmd/secondbrain-mcp/main.go`

```go
package main

import (
	"context"
	"embed"
	"log"
	"os"
	"strconv"

	"gorka/internal/mcp"
	"gorka/internal/openrouter"
	"gorka/internal/utils"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
	"github.com/modelcontextprotocol/go-sdk/pkg/transport/stdio"
)

//go:embed internal/behavioral-specs/*.json
var behavioralSpecs embed.FS

//go:embed internal/embedded-resources/instructions/*.md
var instructionFiles embed.FS

func main() {
	// Load configuration
	config, err := utils.LoadConfig()
	if err != nil {
		log.Fatalf("Configuration load failed: %v", err)
	}

	// Initialize OpenRouter client
	client, err := openrouter.NewClient()
	if err != nil {
		log.Fatalf("OpenRouter client initialization failed: %v", err)
	}

	// Load behavioral specifications
	specsLoader := openrouter.NewBehavioralSpecsLoader(behavioralSpecs, instructionFiles)
	specs, err := specsLoader.LoadAllSpecs()
	if err != nil {
		log.Fatalf("Behavioral specs loading failed: %v", err)
	}

	// Load core system principles
	coreSystemPrinciples, err := specsLoader.LoadCoreSystemPrinciples()
	if err != nil {
		log.Fatalf("Core system principles loading failed: %v", err)
	}

	// Determine max parallel agents
	maxParallel := getMaxParallelAgents()

	// Initialize agent spawner
	spawner := openrouter.NewAgentSpawner(client, maxParallel)
	spawner.LoadBehavioralSpecs(specs)
	spawner.LoadCoreSystemPrinciples(coreSystemPrinciples)

	// Initialize MCP tools with specs loader for dynamic registration
	agentTools := mcp.NewAgentTools(spawner, specsLoader)

	// Create MCP server
	mcpServer := server.New()
	if err := agentTools.RegisterTools(mcpServer); err != nil {
		log.Fatalf("Tool registration failed: %v", err)
	}

	// Initialize stdio transport
	transport := stdio.NewTransport(os.Stdin, os.Stdout)

	// Start MCP server
	srv := server.New(mcpServer, transport)
	if err := srv.Serve(context.Background()); err != nil {
		log.Fatalf("MCP server execution failed: %v", err)
	}
}

// getMaxParallelAgents determines agent concurrency limit
func getMaxParallelAgents() int {
	if envVal := os.Getenv("SECONDBRAIN_MAX_PARALLEL_AGENTS"); envVal != "" {
		if val, err := strconv.Atoi(envVal); err == nil && val > 0 {
			return val
		}
	}
	return 3 // Default conservative limit
}
```

## AGENT_LIFECYCLE_MANAGEMENT

```go
// Add to internal/openrouter/agent.go

// AgentLifecycleManager handles agent timeouts and resource cleanup
type AgentLifecycleManager struct {
	spawner        *AgentSpawner
	activeAgents   map[string]*Agent
	agentTimeouts  map[string]time.Time
	maxAgentTime   time.Duration
}

// NewAgentLifecycleManager creates lifecycle manager
func NewAgentLifecycleManager(spawner *AgentSpawner, maxTime time.Duration) *AgentLifecycleManager {
	return &AgentLifecycleManager{
		spawner:        spawner,
		activeAgents:   make(map[string]*Agent),
		agentTimeouts:  make(map[string]time.Time),
		maxAgentTime:   maxTime,
	}
}

// TrackAgent registers agent for lifecycle management
func (alm *AgentLifecycleManager) TrackAgent(agent *Agent) {
	alm.activeAgents[agent.ID] = agent
	alm.agentTimeouts[agent.ID] = time.Now().Add(alm.maxAgentTime)
}

// CleanupExpiredAgents terminates agents exceeding timeout
func (alm *AgentLifecycleManager) CleanupExpiredAgents() {
	now := time.Now()

	for agentID, timeout := range alm.agentTimeouts {
		if now.After(timeout) {
			if agent, exists := alm.activeAgents[agentID]; exists {
				alm.spawner.CleanupAgent(agent)
				delete(alm.activeAgents, agentID)
				delete(alm.agentTimeouts, agentID)
			}
		}
	}
}

// StartCleanupRoutine runs background cleanup process
func (alm *AgentLifecycleManager) StartCleanupRoutine(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			alm.CleanupExpiredAgents()
		}
	}
}
```

## ERROR_HANDLING_AND_VALIDATION

```go
// Add to internal/mcp/agent_tools.go imports
import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"

	"gorka/internal/openrouter"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
)
```

## ENVIRONMENT_CONFIGURATION

```bash
# Required environment variables for OpenRouter agent spawning

# OpenRouter API configuration
export OPENROUTER_API_KEY="your_openrouter_api_key"
export OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"

# Agent execution configuration
export SECONDBRAIN_MODEL="anthropic/claude-3.5-sonnet"
export SECONDBRAIN_WORKSPACE="/path/to/workspace"
export SECONDBRAIN_MAX_PARALLEL_AGENTS="3"

# Agent lifecycle configuration
export SECONDBRAIN_AGENT_TIMEOUT="300"  # 5 minutes max per agent
export SECONDBRAIN_REQUEST_TIMEOUT="60" # 60 seconds API timeout
```
