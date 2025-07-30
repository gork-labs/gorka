package session

import (
	"path/filepath"
	"testing"
	"time"

	"gorka/internal/types"
	"github.com/sashabaranov/go-openai"
)

func TestSessionManagerBasicOperations(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	sm := NewSessionManagerWithDir(filepath.Join(tempDir, "sessions"))

	// Create a test behavioral matrix
	matrix := &types.BehavioralMatrix{
		AgentID: "test_agent",
	}

	// Test session creation
	session, err := sm.CreateSession("test_agent", matrix, "core principles")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	if session.AgentID != "test_agent" {
		t.Errorf("Expected agent ID test_agent, got %s", session.AgentID)
	}

	if session.Completed {
		t.Error("New session should not be completed")
	}

	// Test session retrieval
	retrievedSession, exists := sm.GetSession(session.ID)
	if !exists {
		t.Error("Session should exist")
	}

	if retrievedSession.ID != session.ID {
		t.Error("Retrieved session should have the same ID")
	}

	// Test message addition
	testMessage := openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: "Test message",
	}

	err = sm.AddMessage(session.ID, testMessage)
	if err != nil {
		t.Fatalf("Failed to add message: %v", err)
	}

	// Verify message was added
	messages, err := sm.GetSessionMessages(session.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}

	// Should have system message + user message = 2 messages
	if len(messages) != 2 {
		t.Errorf("Expected 2 messages, got %d", len(messages))
	}
}

func TestSessionManagerMessageHistory(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	sm := NewSessionManagerWithDir(filepath.Join(tempDir, "sessions"))

	matrix := &types.BehavioralMatrix{
		AgentID: "conversation_agent",
	}

	session, err := sm.CreateSession("conversation_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	// Simulate a conversation
	conversationMessages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleUser, Content: "First message"},
		{Role: openai.ChatMessageRoleAssistant, Content: "First response"},
		{Role: openai.ChatMessageRoleUser, Content: "Second message"},
		{Role: openai.ChatMessageRoleAssistant, Content: "Second response"},
	}

	// Add messages to session
	for _, msg := range conversationMessages {
		err := sm.AddMessage(session.ID, msg)
		if err != nil {
			t.Fatalf("Failed to add message: %v", err)
		}
	}

	// Verify conversation history
	messages, err := sm.GetSessionMessages(session.ID)
	if err != nil {
		t.Fatalf("Failed to get session messages: %v", err)
	}

	// Should have system message + 4 conversation messages = 5 total
	expectedCount := 5
	if len(messages) != expectedCount {
		t.Errorf("Expected %d messages, got %d", expectedCount, len(messages))
	}

	// Verify message order and content
	if messages[0].Role != openai.ChatMessageRoleSystem {
		t.Error("First message should be system message")
	}

	if messages[1].Content != "First message" {
		t.Error("Second message should be first user message")
	}

	if messages[2].Content != "First response" {
		t.Error("Third message should be first assistant response")
	}
}

func TestSessionManagerCompletion(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	sm := NewSessionManagerWithDir(filepath.Join(tempDir, "sessions"))

	matrix := &types.BehavioralMatrix{
		AgentID: "completion_test_agent",
	}

	session, err := sm.CreateSession("completion_test_agent", matrix, "")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	// Session should not be completed initially
	if session.Completed {
		t.Error("New session should not be completed")
	}

	// Complete the session
	sm.CompleteSession(session.ID)

	// Verify session is marked as completed
	retrievedSession, exists := sm.GetSession(session.ID)
	if !exists {
		t.Error("Session should still exist after completion")
	}

	if !retrievedSession.Completed {
		t.Error("Session should be marked as completed")
	}
}

func TestSessionManagerCleanup(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	sm := NewSessionManagerWithDir(filepath.Join(tempDir, "sessions"))

	matrix := &types.BehavioralMatrix{
		AgentID: "cleanup_test_agent",
	}

	// Create multiple sessions
	session1, _ := sm.CreateSession("cleanup_test_agent", matrix, "")
	session2, _ := sm.CreateSession("cleanup_test_agent", matrix, "")

	// Verify both sessions exist
	if sm.GetSessionCount() != 2 {
		t.Errorf("Expected 2 sessions, got %d", sm.GetSessionCount())
	}

	// Test cleanup with future cutoff (should not remove recent sessions)
	sm.CleanupOldSessions(time.Hour)
	if sm.GetSessionCount() != 2 {
		t.Errorf("Expected 2 sessions after cleanup, got %d", sm.GetSessionCount())
	}

	// Test aggressive cleanup (should remove all sessions)
	sm.CleanupOldSessions(time.Nanosecond)
	if sm.GetSessionCount() != 0 {
		t.Errorf("Expected 0 sessions after aggressive cleanup, got %d", sm.GetSessionCount())
	}

	// Verify sessions no longer exist
	_, exists1 := sm.GetSession(session1.ID)
	_, exists2 := sm.GetSession(session2.ID)

	if exists1 || exists2 {
		t.Error("Sessions should not exist after cleanup")
	}
}

func TestSessionManagerActiveSessions(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	sm := NewSessionManagerWithDir(filepath.Join(tempDir, "sessions"))

	matrix := &types.BehavioralMatrix{
		AgentID: "active_test_agent",
	}

	// Create sessions
	session1, _ := sm.CreateSession("active_test_agent", matrix, "")
	session2, _ := sm.CreateSession("active_test_agent", matrix, "")

	// Both should be active initially
	activeSessions := sm.GetActiveSessions()
	if len(activeSessions) != 2 {
		t.Errorf("Expected 2 active sessions, got %d", len(activeSessions))
	}

	// Complete one session
	sm.CompleteSession(session1.ID)

	// Should now have only 1 active session
	activeSessions = sm.GetActiveSessions()
	if len(activeSessions) != 1 {
		t.Errorf("Expected 1 active session after completion, got %d", len(activeSessions))
	}

	// Verify the active session is the correct one
	_, exists := activeSessions[session2.ID]
	if !exists {
		t.Error("Session2 should be in active sessions")
	}

	_, exists = activeSessions[session1.ID]
	if exists {
		t.Error("Session1 should not be in active sessions after completion")
	}
}

func TestSessionManagerUniqueIDs(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()
	sm := NewSessionManagerWithDir(filepath.Join(tempDir, "sessions"))

	matrix := &types.BehavioralMatrix{
		AgentID: "unique_id_test_agent",
	}

	// Create multiple sessions and verify unique IDs
	session1, _ := sm.CreateSession("unique_id_test_agent", matrix, "")
	session2, _ := sm.CreateSession("unique_id_test_agent", matrix, "")
	session3, _ := sm.CreateSession("unique_id_test_agent", matrix, "")

	ids := []string{session1.ID, session2.ID, session3.ID}

	// Check that all IDs are unique
	for i := 0; i < len(ids); i++ {
		for j := i + 1; j < len(ids); j++ {
			if ids[i] == ids[j] {
				t.Errorf("Session IDs should be unique, but found duplicate: %s", ids[i])
			}
		}
	}
}
