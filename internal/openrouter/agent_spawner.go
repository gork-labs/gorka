package openrouter

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"gorka/internal/session"
	"gorka/internal/tools"
	"gorka/internal/types"
	"gorka/internal/utils"
	"github.com/sashabaranov/go-openai"
)

// BehavioralEngine interface to avoid circular imports
type BehavioralEngine interface {
	GetAvailableAgents() []string
	GetBehavioralMatrices() map[string]*types.BehavioralMatrix
}

// AgentSpawner handles OpenRouter LLM agent spawning using shared behavioral processing
type AgentSpawner struct {
	client               *Client
	coreSystemPrinciples string
	sessionManager       *session.SessionManager
	toolsManager         *tools.ToolsManager
	behavioralEngine     BehavioralEngine
}

// NewAgentSpawner creates a new agent spawner with OpenRouter integration
func NewAgentSpawner(toolsManager *tools.ToolsManager, behavioralEngine BehavioralEngine) (*AgentSpawner, error) {
	// Load configuration first
	config, err := utils.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	client, err := NewClientWithToolsManager(toolsManager)
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenRouter client: %w", err)
	}

	// Load core system principles from shared utils package
	coreSystemPrinciples, err := utils.LoadCoreSystemPrinciples()
	if err != nil {
		// Continue without core principles if not found (for development)
		coreSystemPrinciples = ""
	}

	return &AgentSpawner{
		client:               client,
		coreSystemPrinciples: coreSystemPrinciples,
		sessionManager:       session.NewSessionManagerWithConfig(config),
		toolsManager:         toolsManager,
		behavioralEngine:     behavioralEngine,
	}, nil
}

// SpawnAgent spawns an OpenRouter LLM agent with automatic session management
func (s *AgentSpawner) SpawnAgent(matrix *types.BehavioralMatrix, userInput string) (*openai.ChatCompletionResponse, error) {
	// Create a new session for this agent execution
	agentSession, err := s.sessionManager.CreateSession(matrix.AgentID, matrix, s.coreSystemPrinciples)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}
	
	// Add user message to session
	userMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: userInput,
	}
	if err := s.sessionManager.AddMessage(agentSession.ID, userMessage); err != nil {
		return nil, fmt.Errorf("failed to add user message: %w", err)
	}
	
	// Execute conversation loop until completion (no more tool calls)
	response, err := s.executeConversationLoop(agentSession)
	if err != nil {
		return nil, err
	}
	
	// Mark session as completed and clean it up
	s.sessionManager.CompleteSession(agentSession.ID)
	
	return response, nil
}

// executeConversationLoop handles the full conversation including tool calls
func (s *AgentSpawner) executeConversationLoop(agentSession *session.AgentSession) (*openai.ChatCompletionResponse, error) {
	var lastResponse *openai.ChatCompletionResponse
	
	for {
		// Get filtered session messages to prevent API token limits
		messages, err := s.sessionManager.GetFilteredSessionMessages(agentSession.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get filtered session messages: %w", err)
		}
		
		// Execute via OpenRouter with current session history
		response, err := s.client.CreateChatCompletion(context.Background(), messages)
		if err != nil {
			return nil, err
		}
		
		lastResponse = response
		
		if len(response.Choices) == 0 {
			return nil, fmt.Errorf("OpenRouter returned response with no choices")
		}
		
		choice := response.Choices[0]
		
		// Add assistant response to session
		assistantMessage := openai.ChatCompletionMessage{
			Role:    choice.Message.Role,
			Content: choice.Message.Content,
		}
		
		// Handle tool calls if present
		if len(choice.Message.ToolCalls) > 0 {
			// Tool calls are already properly parsed by the OpenRouter client adapter system
			assistantMessage.ToolCalls = choice.Message.ToolCalls
			if err := s.sessionManager.AddMessage(agentSession.ID, assistantMessage); err != nil {
				return nil, fmt.Errorf("failed to add assistant message: %w", err)
			}
			
			// Execute tool calls and add results
			for _, toolCall := range choice.Message.ToolCalls {
				toolResult := s.executeToolCall(toolCall)
				toolMessage := openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					Content:    toolResult,
					ToolCallID: toolCall.ID,
				}
				if err := s.sessionManager.AddMessage(agentSession.ID, toolMessage); err != nil {
					return nil, fmt.Errorf("failed to add tool message: %w", err)
				}
			}
			
			// If thinking continuation is needed, add a prompt for the next thought
			// DISABLED: This eats up context fast, only add when explicitly retrying
			// if thinkingContinuationNeeded {
			//     continuationMessage := openai.ChatCompletionMessage{
			//         Role:    openai.ChatMessageRoleUser,
			//         Content: "Please continue with your next thought in the sequence.",
			//     }
			//     if err := s.sessionManager.AddMessage(agentSession.ID, continuationMessage); err != nil {
			//         return nil, fmt.Errorf("failed to add thinking continuation message: %w", err)
			//     }
			// }
			
			// Continue the loop to get the next response
			continue
		} else {
			// No tool calls - this is the final response
			if err := s.sessionManager.AddMessage(agentSession.ID, assistantMessage); err != nil {
				return nil, fmt.Errorf("failed to add final assistant message: %w", err)
			}
			break
		}
	}
	
	return lastResponse, nil
}

// executeToolCall executes a tool call and returns the result
func (s *AgentSpawner) executeToolCall(toolCall openai.ToolCall) string {
	// Parse tool arguments
	var params map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &params); err != nil {
		return fmt.Sprintf("Error parsing tool arguments: %v", err)
	}
	
	// Execute tool via the centralized tools manager
	result, err := s.toolsManager.ExecuteOpenAITool(toolCall.Function.Name, params)
	if err != nil {
		return fmt.Sprintf("Error executing tool %s: %v", toolCall.Function.Name, err)
	}
	
	return result
}

// needsThinkingContinuation checks if a tool call requires thinking continuation
func (s *AgentSpawner) needsThinkingContinuation(toolCall openai.ToolCall) bool {
	// Only check think_hard tool calls
	if toolCall.Function.Name != "think_hard" {
		return false
	}
	
	// Parse tool arguments to check for next_thought_needed
	var params map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &params); err != nil {
		return false
	}
	
	// Check if next_thought_needed is true
	if nextNeeded, ok := params["next_thought_needed"].(bool); ok && nextNeeded {
		return true
	}
	
	return false
}

// SpawnAgentByID spawns an agent by loading the behavioral matrix from embedded resources
func (s *AgentSpawner) SpawnAgentByID(agentID string, userInput string) (*openai.ChatCompletionResponse, error) {
	// Load behavioral matrix for the agent
	matrix, err := utils.GetBehavioralMatrixFromEmbedded(agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to load behavioral matrix for agent %s: %w", agentID, err)
	}

	return s.SpawnAgent(matrix, userInput)
}

// GetAvailableAgents returns a list of available agent IDs from the behavioral engine
func (s *AgentSpawner) GetAvailableAgents() ([]string, error) {
	agents := s.behavioralEngine.GetAvailableAgents()
	if len(agents) == 0 {
		return nil, fmt.Errorf("no behavioral agents available")
	}
	return agents, nil
}

// ValidateAgent checks if an agent ID is valid and can be spawned
func (s *AgentSpawner) ValidateAgent(agentID string) error {
	_, err := utils.GetBehavioralMatrixFromEmbedded(agentID)
	return err
}

// GetSession retrieves a session by ID (delegates to SessionManager)
func (s *AgentSpawner) GetSession(sessionID string) (*session.AgentSession, bool) {
	return s.sessionManager.GetSession(sessionID)
}

// CleanupOldSessions removes sessions older than the specified duration (delegates to SessionManager)
func (s *AgentSpawner) CleanupOldSessions(maxAge time.Duration) {
	s.sessionManager.CleanupOldSessions(maxAge)
}

// GetSessionCount returns the number of active sessions (delegates to SessionManager)
func (s *AgentSpawner) GetSessionCount() int {
	return s.sessionManager.GetSessionCount()
}
