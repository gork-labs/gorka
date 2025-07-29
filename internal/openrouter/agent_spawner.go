package openrouter

import (
	"context"
	"fmt"

	"gorka/internal/behavioral"
	"github.com/sashabaranov/go-openai"
)

// AgentSpawner handles OpenRouter LLM agent spawning using shared behavioral processing
type AgentSpawner struct {
	client               *Client
	coreSystemPrinciples string
}

// NewAgentSpawner creates a new agent spawner with OpenRouter integration
func NewAgentSpawner() (*AgentSpawner, error) {
	client, err := NewClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenRouter client: %w", err)
	}

	// Load core system principles from shared behavioral package
	coreSystemPrinciples, err := behavioral.LoadCoreSystemPrinciples()
	if err != nil {
		// Continue without core principles if not found (for development)
		coreSystemPrinciples = ""
	}

	return &AgentSpawner{
		client:               client,
		coreSystemPrinciples: coreSystemPrinciples,
	}, nil
}

// SpawnAgent spawns an OpenRouter LLM agent using shared behavioral processing
func (s *AgentSpawner) SpawnAgent(matrix *behavioral.BehavioralMatrix, userInput string) (*openai.ChatCompletionResponse, error) {
	// Use the SAME system prompt building method as chatmode generation
	// This ensures 100% consistency between chatmode and agent prompts
	taskContext := behavioral.TaskContext{
		ExecutionMode:  "openrouter_agent",
		ToolsAvailable: "mcp_delegated_tools",
	}

	// Generate identical prompt content using shared behavioral processing
	systemPrompt, err := behavioral.BuildSystemPrompt(matrix, taskContext, s.coreSystemPrinciples)
	if err != nil {
		return nil, fmt.Errorf("failed to build system prompt: %w", err)
	}

	// Create OpenRouter messages
	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: userInput,
		},
	}

	// Execute via OpenRouter
	return s.client.CreateChatCompletion(context.Background(), messages)
}

// SpawnAgentByID spawns an agent by loading the behavioral matrix from embedded resources
func (s *AgentSpawner) SpawnAgentByID(agentID string, userInput string) (*openai.ChatCompletionResponse, error) {
	// Load behavioral matrix for the agent
	matrix, err := behavioral.GetBehavioralMatrixFromEmbedded(agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to load behavioral matrix for agent %s: %w", agentID, err)
	}

	return s.SpawnAgent(matrix, userInput)
}

// GetAvailableAgents returns a list of available agent IDs that can be spawned
func (s *AgentSpawner) GetAvailableAgents() ([]string, error) {
	// This could be enhanced to dynamically scan the embedded behavioral specs
	// For now, return the known agents from the optimal development plan
	return []string{
		"project_orchestrator",
		"software_engineer", 
		"security_engineer",
		"devops_engineer",
		"database_architect",
		"software_architect",
		"prompt_engineer",
	}, nil
}

// ValidateAgent checks if an agent ID is valid and can be spawned
func (s *AgentSpawner) ValidateAgent(agentID string) error {
	_, err := behavioral.GetBehavioralMatrixFromEmbedded(agentID)
	return err
}
