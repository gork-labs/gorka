package openrouter

import (
	"path/filepath"
	"testing"
	"time"

	"gorka/internal/session"
	"gorka/internal/types"
	"github.com/sashabaranov/go-openai"
)

func TestAgentSessionPersistence(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	
	// Create a mock agent spawner with SessionManager
	spawner := &AgentSpawner{
		sessionManager: session.NewSessionManagerWithDir(filepath.Join(tempDir, "sessions")),
	}

	// Create a test behavioral matrix
	matrix := &types.BehavioralMatrix{
		AgentID: "test_agent",
	}

	// Test session creation via SessionManager
	agentSession, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	if agentSession.AgentID != "test_agent" {
		t.Errorf("Expected agent ID test_agent, got %s", agentSession.AgentID)
	}

	if agentSession.Completed {
		t.Error("New session should not be completed")
	}

	// Test message addition
	testMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: "Test message",
	}

	err = spawner.sessionManager.AddMessage(agentSession.ID, testMessage)
	if err != nil {
		t.Fatalf("Failed to add message: %v", err)
	}

	// Retrieve session and verify message was added
	retrievedSession, exists := spawner.GetSession(agentSession.ID)
	if !exists {
		t.Error("Session should exist")
	}

	// Should have system message + user message = 2 messages
	messages, err := spawner.sessionManager.GetSessionMessages(retrievedSession.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}

	if len(messages) != 2 {
		t.Errorf("Expected 2 messages, got %d", len(messages))
	}

	// Test session completion
	spawner.sessionManager.CompleteSession(agentSession.ID)
	completedSession, exists := spawner.GetSession(agentSession.ID)
	if !exists {
		t.Error("Session should still exist immediately after completion")
	}
	if !completedSession.Completed {
		t.Error("Session should be marked as completed")
	}

	// Test session cleanup
	spawner.CleanupOldSessions(time.Hour) // Should not remove recent session
	if spawner.GetSessionCount() != 1 {
		t.Errorf("Expected 1 session after cleanup, got %d", spawner.GetSessionCount())
	}

	// Test old session cleanup
	spawner.CleanupOldSessions(time.Nanosecond) // Should remove all sessions
	if spawner.GetSessionCount() != 0 {
		t.Errorf("Expected 0 sessions after aggressive cleanup, got %d", spawner.GetSessionCount())
	}
}

func TestSessionMessageHistory(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	
	spawner := &AgentSpawner{
		sessionManager: session.NewSessionManagerWithDir(filepath.Join(tempDir, "sessions")),
	}

	matrix := &types.BehavioralMatrix{
		AgentID: "test_agent",
	}

	agentSession, err := spawner.sessionManager.CreateSession("conversation_test", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}
	
	// Simulate a conversation
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleUser, Content: "First message"},
		{Role: openai.ChatMessageRoleAssistant, Content: "First response"},
		{Role: openai.ChatMessageRoleUser, Content: "Second message"},
		{Role: openai.ChatMessageRoleAssistant, Content: "Second response"},
	}

	// Add messages to session
	for _, msg := range messages {
		err := spawner.sessionManager.AddMessage(agentSession.ID, msg)
		if err != nil {
			t.Fatalf("Failed to add message: %v", err)
		}
	}

	// Verify conversation history
	sessionMessages, err := spawner.sessionManager.GetSessionMessages(agentSession.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}

	// Should have system message + 4 conversation messages = 5 total
	expectedCount := 5
	if len(sessionMessages) != expectedCount {
		t.Errorf("Expected %d messages, got %d", expectedCount, len(sessionMessages))
	}

	// Verify message order and content
	if sessionMessages[0].Role != openai.ChatMessageRoleSystem {
		t.Error("First message should be system message")
	}

	if sessionMessages[1].Content != "First message" {
		t.Error("Second message should be first user message")
	}

	if sessionMessages[2].Content != "First response" {
		t.Error("Third message should be first assistant response")
	}
}

func TestAutomaticSessionCompletion(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	
	spawner := &AgentSpawner{
		sessionManager: session.NewSessionManagerWithDir(filepath.Join(tempDir, "sessions")),
	}

	matrix := &types.BehavioralMatrix{
		AgentID: "test_agent",
	}

	// Test session generation creates unique IDs
	session1, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session 1: %v", err)
	}

	session2, err := spawner.sessionManager.CreateSession("test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session 2: %v", err)
	}
	
	if session1.ID == session2.ID {
		t.Error("Session IDs should be unique")
	}

	// Test session completion
	if session1.Completed {
		t.Error("New session should not be completed")
	}

	spawner.sessionManager.CompleteSession(session1.ID)
	
	completedSession, exists := spawner.GetSession(session1.ID)
	if !exists {
		t.Error("Session should exist after completion")
	}
	
	if !completedSession.Completed {
		t.Error("Session should be marked as completed")
	}
}
