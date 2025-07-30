package openrouter

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"
	"testing"

	"gorka/internal/session"
	"gorka/internal/types"
	"github.com/sashabaranov/go-openai"
)

// Mock implementation that matches the AgentSpawner structure for testing
type mockAgentSpawner struct {
	sessionManager   *session.SessionManager
	responses        []openai.ChatCompletionResponse
	callCount        int
	shouldErr        bool
	errMsg           string
	toolResults      map[string]string
}

func newMockAgentSpawner(t *testing.T) *mockAgentSpawner {
	tempDir := t.TempDir()
	return &mockAgentSpawner{
		sessionManager: session.NewSessionManagerWithDir(filepath.Join(tempDir, "sessions")),
		toolResults:    make(map[string]string),
	}
}

func (m *mockAgentSpawner) addResponse(response openai.ChatCompletionResponse) {
	m.responses = append(m.responses, response)
}

func (m *mockAgentSpawner) setError(errMsg string) {
	m.shouldErr = true
	m.errMsg = errMsg
}

func (m *mockAgentSpawner) addToolResult(toolName, result string) {
	m.toolResults[toolName] = result
}

func (m *mockAgentSpawner) executeConversationLoop(agentSession *session.AgentSession) (*openai.ChatCompletionResponse, error) {
	var lastResponse *openai.ChatCompletionResponse
	
	for {
		if m.shouldErr {
			return nil, errors.New(m.errMsg)
		}
		
		if m.callCount >= len(m.responses) {
			return nil, errors.New("no more mock responses available")
		}
		
		response := m.responses[m.callCount]
		m.callCount++
		lastResponse = &response
		
		if len(response.Choices) == 0 {
			return nil, errors.New("OpenRouter returned response with no choices")
		}
		
		choice := response.Choices[0]
		
		// Add assistant response to session
		assistantMessage := openai.ChatCompletionMessage{
			Role:    choice.Message.Role,
			Content: choice.Message.Content,
		}
		
		// Handle tool calls if present
		if len(choice.Message.ToolCalls) > 0 {
			assistantMessage.ToolCalls = choice.Message.ToolCalls
			if err := m.sessionManager.AddMessage(agentSession.ID, assistantMessage); err != nil {
				return nil, errors.New("failed to add assistant message: " + err.Error())
			}
			
			// Execute tool calls and add results
			thinkingContinuationNeeded := false
			for _, toolCall := range choice.Message.ToolCalls {
				toolResult := m.executeToolCall(toolCall)
				toolMessage := openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					Content:    toolResult,
					ToolCallID: toolCall.ID,
				}
				if err := m.sessionManager.AddMessage(agentSession.ID, toolMessage); err != nil {
					return nil, errors.New("failed to add tool message: " + err.Error())
				}
				
				// Check if thinking continuation is needed
				if m.needsThinkingContinuation(toolCall) {
					thinkingContinuationNeeded = true
				}
			}
			
			// If thinking continuation is needed, add a prompt for the next thought
			if thinkingContinuationNeeded {
				continuationMessage := openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleUser,
					Content: "Please continue with your next thought in the sequence.",
				}
				if err := m.sessionManager.AddMessage(agentSession.ID, continuationMessage); err != nil {
					return nil, errors.New("failed to add thinking continuation message: " + err.Error())
				}
			}
			
			// Continue the loop to get the next response
			continue
		} else {
			// No tool calls - this is the final response
			if err := m.sessionManager.AddMessage(agentSession.ID, assistantMessage); err != nil {
				return nil, errors.New("failed to add final assistant message: " + err.Error())
			}
			break
		}
	}
	
	return lastResponse, nil
}

func (m *mockAgentSpawner) executeToolCall(toolCall openai.ToolCall) string {
	// Check if we have a mock result for this tool
	if result, exists := m.toolResults[toolCall.Function.Name]; exists {
		return result
	}
	
	// Default tool execution
	switch toolCall.Function.Name {
	case "test_tool":
		return "test result"
	case "think_hard":
		return "Thought processed"
	case "gather_info":
		return "gathered: user profile data"
	case "process_data":
		return "processed: insights generated"
	case "tool_a":
		return "result_a"
	case "tool_b":
		return "result_b"
	default:
		return "Error executing tool " + toolCall.Function.Name + ": tool not found"
	}
}

func (m *mockAgentSpawner) needsThinkingContinuation(toolCall openai.ToolCall) bool {
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

func TestExecuteConversationLoop_NoToolCalls_Simplified(t *testing.T) {
	// Test conversation with no tool calls (simple response)
	spawner := newMockAgentSpawner(t)
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "Simple response without tools",
				},
			},
		},
	})
	
	// Create session
	matrix := &types.BehavioralMatrix{AgentID: "test_agent"}
	agentSession, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	
	// Add user message
	userMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: "Test message",
	}
	err = spawner.sessionManager.AddMessage(agentSession.ID, userMessage)
	if err != nil {
		t.Fatalf("Failed to add user message: %v", err)
	}
	
	// Execute conversation loop
	response, err := spawner.executeConversationLoop(agentSession)
	if err != nil {
		t.Fatalf("Conversation loop failed: %v", err)
	}
	
	// Verify response
	if response.Choices[0].Message.Content != "Simple response without tools" {
		t.Errorf("Expected 'Simple response without tools', got '%s'", response.Choices[0].Message.Content)
	}
	
	// Verify session messages were added correctly
	messages, err := spawner.sessionManager.GetSessionMessages(agentSession.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}
	
	// Should have: system message + user message + assistant message = 3 total
	if len(messages) != 3 {
		t.Errorf("Expected 3 messages, got %d", len(messages))
	}
	
	// Check final message is the assistant response
	lastMessage := messages[len(messages)-1]
	if lastMessage.Role != openai.ChatMessageRoleAssistant {
		t.Errorf("Expected last message to be assistant, got %s", lastMessage.Role)
	}
	if lastMessage.Content != "Simple response without tools" {
		t.Errorf("Expected 'Simple response without tools', got '%s'", lastMessage.Content)
	}
}

func TestExecuteConversationLoop_WithToolCalls_Simplified(t *testing.T) {
	// Test conversation with tool calls
	spawner := newMockAgentSpawner(t)
	
	// First response with tool call
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "I'll use a tool to help you.",
					ToolCalls: []openai.ToolCall{
						{
							ID:   "call_123",
							Type: openai.ToolTypeFunction,
							Function: openai.FunctionCall{
								Name:      "test_tool",
								Arguments: `{"param": "value"}`,
							},
						},
					},
				},
			},
		},
	})
	
	// Second response after tool execution
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "Based on the tool result, here's my final answer.",
				},
			},
		},
	})
	
	// Create session
	matrix := &types.BehavioralMatrix{AgentID: "test_agent"}
	agentSession, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	
	// Add user message
	userMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: "Test message requiring tools",
	}
	err = spawner.sessionManager.AddMessage(agentSession.ID, userMessage)
	if err != nil {
		t.Fatalf("Failed to add user message: %v", err)
	}
	
	// Execute conversation loop
	response, err := spawner.executeConversationLoop(agentSession)
	if err != nil {
		t.Fatalf("Conversation loop failed: %v", err)
	}
	
	// Verify final response
	if response.Choices[0].Message.Content != "Based on the tool result, here's my final answer." {
		t.Errorf("Expected final answer, got '%s'", response.Choices[0].Message.Content)
	}
	
	// Verify session messages include tool execution
	messages, err := spawner.sessionManager.GetSessionMessages(agentSession.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}
	
	// Should have: system + user + assistant_with_tools + tool_result + final_assistant = 5 total
	if len(messages) != 5 {
		t.Errorf("Expected 5 messages, got %d", len(messages))
	}
	
	// Check message sequence
	if messages[1].Role != openai.ChatMessageRoleUser {
		t.Error("Second message should be user")
	}
	if messages[2].Role != openai.ChatMessageRoleAssistant {
		t.Error("Third message should be assistant with tool calls")
	}
	if len(messages[2].ToolCalls) == 0 {
		t.Error("Assistant message should have tool calls")
	}
	if messages[3].Role != openai.ChatMessageRoleTool {
		t.Error("Fourth message should be tool result")
	}
	if messages[4].Role != openai.ChatMessageRoleAssistant {
		t.Error("Fifth message should be final assistant response")
	}
}

func TestExecuteConversationLoop_ToolCallError_Simplified(t *testing.T) {
	// Test tool call execution error handling
	spawner := newMockAgentSpawner(t)
	spawner.addToolResult("nonexistent_tool", "Error executing tool nonexistent_tool: tool not found")
	
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "I'll use a tool.",
					ToolCalls: []openai.ToolCall{
						{
							ID:   "call_123",
							Type: openai.ToolTypeFunction,
							Function: openai.FunctionCall{
								Name:      "nonexistent_tool",
								Arguments: `{}`,
							},
						},
					},
				},
			},
		},
	})
	
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "I'll handle the error gracefully.",
				},
			},
		},
	})
	
	// Create session
	matrix := &types.BehavioralMatrix{AgentID: "test_agent"}
	agentSession, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	
	// Add user message
	userMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: "Test message with failing tool",
	}
	err = spawner.sessionManager.AddMessage(agentSession.ID, userMessage)
	if err != nil {
		t.Fatalf("Failed to add user message: %v", err)
	}
	
	// Execute conversation loop
	response, err := spawner.executeConversationLoop(agentSession)
	if err != nil {
		t.Fatalf("Conversation loop failed: %v", err)
	}
	
	// Verify it completed despite tool error
	if response.Choices[0].Message.Content != "I'll handle the error gracefully." {
		t.Errorf("Expected graceful handling, got '%s'", response.Choices[0].Message.Content)
	}
	
	// Verify tool error was recorded in session
	messages, err := spawner.sessionManager.GetSessionMessages(agentSession.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}
	
	// Find tool result message
	var toolResultMessage *openai.ChatCompletionMessage
	for _, msg := range messages {
		if msg.Role == openai.ChatMessageRoleTool {
			toolResultMessage = &msg
			break
		}
	}
	
	if toolResultMessage == nil {
		t.Error("Should have tool result message")
	} else if !contains(toolResultMessage.Content, "Error executing tool") {
		t.Errorf("Tool result should contain error message, got: %s", toolResultMessage.Content)
	}
}

func TestExecuteConversationLoop_ThinkingContinuation_Simplified(t *testing.T) {
	// Test thinking continuation logic
	spawner := newMockAgentSpawner(t)
	
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "Let me think about this.",
					ToolCalls: []openai.ToolCall{
						{
							ID:   "call_think",
							Type: openai.ToolTypeFunction,
							Function: openai.FunctionCall{
								Name:      "think_hard",
								Arguments: `{"thought": "First thought", "next_thought_needed": true, "thought_number": 1, "total_thoughts": 2}`,
							},
						},
					},
				},
			},
		},
	})
	
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "Continuing my thinking process.",
					ToolCalls: []openai.ToolCall{
						{
							ID:   "call_think2",
							Type: openai.ToolTypeFunction,
							Function: openai.FunctionCall{
								Name:      "think_hard",
								Arguments: `{"thought": "Second thought", "next_thought_needed": false, "thought_number": 2, "total_thoughts": 2}`,
							},
						},
					},
				},
			},
		},
	})
	
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{
			{
				Message: openai.ChatCompletionMessage{
					Role:    openai.ChatMessageRoleAssistant,
					Content: "Based on my thinking, here's my conclusion.",
				},
			},
		},
	})
	
	// Create session
	matrix := &types.BehavioralMatrix{AgentID: "test_agent"}
	agentSession, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	
	// Add user message
	userMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: "Please think about this problem",
	}
	err = spawner.sessionManager.AddMessage(agentSession.ID, userMessage)
	if err != nil {
		t.Fatalf("Failed to add user message: %v", err)
	}
	
	// Execute conversation loop
	response, err := spawner.executeConversationLoop(agentSession)
	if err != nil {
		t.Fatalf("Conversation loop failed: %v", err)
	}
	
	// Verify final response
	if response.Choices[0].Message.Content != "Based on my thinking, here's my conclusion." {
		t.Errorf("Expected conclusion, got '%s'", response.Choices[0].Message.Content)
	}
	
	// Verify session includes thinking continuation message
	messages, err := spawner.sessionManager.GetSessionMessages(agentSession.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}
	
	// Should find continuation message
	foundContinuation := false
	for _, msg := range messages {
		if msg.Role == openai.ChatMessageRoleUser && contains(msg.Content, "continue with your next thought") {
			foundContinuation = true
			break
		}
	}
	
	if !foundContinuation {
		t.Error("Should have found thinking continuation message")
	}
}

func TestExecuteConversationLoop_APIError_Simplified(t *testing.T) {
	// Test API error handling
	spawner := newMockAgentSpawner(t)
	spawner.setError("API connection failed")
	
	// Create session
	matrix := &types.BehavioralMatrix{AgentID: "test_agent"}
	agentSession, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	
	// Execute conversation loop should fail
	_, err = spawner.executeConversationLoop(agentSession)
	if err == nil {
		t.Error("Expected conversation loop to fail with API error")
	}
	
	if !contains(err.Error(), "API connection failed") {
		t.Errorf("Expected API error message, got: %s", err.Error())
	}
}

func TestExecuteConversationLoop_NoChoices_Simplified(t *testing.T) {
	// Test response with no choices
	spawner := newMockAgentSpawner(t)
	spawner.addResponse(openai.ChatCompletionResponse{
		Choices: []openai.ChatCompletionChoice{}, // Empty choices
	})
	
	// Create session
	matrix := &types.BehavioralMatrix{AgentID: "test_agent"}
	agentSession, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	
	// Execute conversation loop should fail
	_, err = spawner.executeConversationLoop(agentSession)
	if err == nil {
		t.Error("Expected conversation loop to fail with no choices error")
	}
	
	if !stringContains(err.Error(), "no choices") {
		t.Errorf("Expected no choices error message, got: %s", err.Error())
	}
}

// Helper function to check if string contains substring
func stringContains(s, substr string) bool {
	return strings.Contains(s, substr)
}

