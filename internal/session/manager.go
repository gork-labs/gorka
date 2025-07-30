package session

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"gorka/internal/types"
	"gorka/internal/utils"
	"github.com/sashabaranov/go-openai"
)

// AgentSession represents a persistent conversation session for an agent
type AgentSession struct {
	ID        string                          `json:"id"`
	AgentID   string                          `json:"agent_id"`
	Messages  []openai.ChatCompletionMessage `json:"messages"`
	CreatedAt time.Time                       `json:"created_at"`
	UpdatedAt time.Time                       `json:"updated_at"`
	Matrix    *types.BehavioralMatrix         `json:"-"` // Don't serialize the full matrix
	Completed bool                            `json:"completed"` // Track if session is complete
}

// SessionManager handles agent session lifecycle and persistence
type SessionManager struct {
	sessions       map[string]*AgentSession
	sessionMutex   sync.RWMutex
	sessionCounter int64
	storageDir     string
}

// NewSessionManager creates a new session manager with .gorka storage
// Uses current working directory as workspace if no config is available
func NewSessionManager() *SessionManager {
	// Fallback to current working directory
	workspaceDir := "."
	if wd, err := os.Getwd(); err == nil {
		workspaceDir = wd
	}
	
	sessionsDir := filepath.Join(workspaceDir, ".gorka", "sessions")
	return NewSessionManagerWithDir(sessionsDir)
}

// NewSessionManagerWithConfig creates a new session manager using provided config
func NewSessionManagerWithConfig(config *utils.Config) *SessionManager {
	sessionsDir := filepath.Join(config.Workspace, ".gorka", "sessions")
	return NewSessionManagerWithDir(sessionsDir)
}

// NewSessionManagerWithWorkspace creates a new session manager with specified workspace
func NewSessionManagerWithWorkspace(workspacePath string) *SessionManager {
	sessionsDir := filepath.Join(workspacePath, ".gorka", "sessions")
	return NewSessionManagerWithDir(sessionsDir)
}

// NewSessionManagerWithDir creates a new session manager with custom storage directory
func NewSessionManagerWithDir(storageDir string) *SessionManager {
	sm := &SessionManager{
		sessions:       make(map[string]*AgentSession),
		sessionMutex:   sync.RWMutex{},
		sessionCounter: 0,
		storageDir:     storageDir,
	}
	
	// Create storage directories
	sm.ensureStorageDirectories()
	
	// Load existing sessions from disk
	sm.loadSessionsFromDisk()
	
	return sm
}

// CreateSession creates a new session with the given parameters
func (sm *SessionManager) CreateSession(agentID string, matrix *types.BehavioralMatrix, coreSystemPrinciples string) (*AgentSession, error) {
	sessionID := sm.generateSessionID(agentID)
	return sm.getOrCreateSession(sessionID, agentID, matrix, coreSystemPrinciples), nil
}

// GetSession retrieves a session by ID
func (sm *SessionManager) GetSession(sessionID string) (*AgentSession, bool) {
	sm.sessionMutex.RLock()
	defer sm.sessionMutex.RUnlock()
	
	session, exists := sm.sessions[sessionID]
	return session, exists
}

// AddMessage adds a message to an existing session
func (sm *SessionManager) AddMessage(sessionID string, message openai.ChatCompletionMessage) error {
	sm.sessionMutex.Lock()
	defer sm.sessionMutex.Unlock()
	
	session, exists := sm.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session %s not found", sessionID)
	}
	
	session.Messages = append(session.Messages, message)
	session.UpdatedAt = time.Now()
	
	// Save updated session to disk
	sm.saveSessionToDisk(session, session.Completed)
	
	return nil
}

// CompleteSession marks a session as completed and moves it to completed storage
func (sm *SessionManager) CompleteSession(sessionID string) {
	sm.sessionMutex.Lock()
	defer sm.sessionMutex.Unlock()
	
	if session, exists := sm.sessions[sessionID]; exists {
		session.Completed = true
		session.UpdatedAt = time.Now()
		
		// Save completed session to disk immediately
		sm.saveSessionToDisk(session, true)
		
		// Remove from active sessions directory
		activeFilePath := filepath.Join(sm.storageDir, "active", sessionID+".json")
		os.Remove(activeFilePath)
	}
}

// GetSessionMessages returns the messages for a session
func (sm *SessionManager) GetSessionMessages(sessionID string) ([]openai.ChatCompletionMessage, error) {
	sm.sessionMutex.RLock()
	defer sm.sessionMutex.RUnlock()
	
	session, exists := sm.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session %s not found", sessionID)
	}
	
	return session.Messages, nil
}

// CleanupOldSessions removes sessions older than the specified duration
func (sm *SessionManager) CleanupOldSessions(maxAge time.Duration) {
	sm.sessionMutex.Lock()
	defer sm.sessionMutex.Unlock()
	
	cutoff := time.Now().Add(-maxAge)
	for sessionID, session := range sm.sessions {
		if session.UpdatedAt.Before(cutoff) {
			delete(sm.sessions, sessionID)
		}
	}
}

// GetSessionCount returns the number of active sessions
func (sm *SessionManager) GetSessionCount() int {
	sm.sessionMutex.RLock()
	defer sm.sessionMutex.RUnlock()
	
	return len(sm.sessions)
}

// GetActiveSessions returns a map of all active (non-completed) sessions
func (sm *SessionManager) GetActiveSessions() map[string]*AgentSession {
	sm.sessionMutex.RLock()
	defer sm.sessionMutex.RUnlock()
	
	activeSessions := make(map[string]*AgentSession)
	for sessionID, session := range sm.sessions {
		if !session.Completed {
			// Create a copy to avoid race conditions
			sessionCopy := *session
			activeSessions[sessionID] = &sessionCopy
		}
	}
	
	return activeSessions
}

// generateSessionID creates a unique session ID for an agent
func (sm *SessionManager) generateSessionID(agentID string) string {
	sm.sessionMutex.Lock()
	defer sm.sessionMutex.Unlock()
	
	sm.sessionCounter++
	return fmt.Sprintf("%s_%d_%d", agentID, time.Now().Unix(), sm.sessionCounter)
}

// getOrCreateSession retrieves an existing session or creates a new one
func (sm *SessionManager) getOrCreateSession(sessionID, agentID string, matrix *types.BehavioralMatrix, coreSystemPrinciples string) *AgentSession {
	sm.sessionMutex.Lock()
	defer sm.sessionMutex.Unlock()
	
	// Check if session exists
	if session, exists := sm.sessions[sessionID]; exists {
		session.UpdatedAt = time.Now()
		return session
	}
	
	// Create new session with system prompt
	taskContext := types.TaskContext{
		ExecutionMode:  "openrouter_agent",
		ToolsAvailable: "mcp_delegated_tools",
	}
	
	systemPrompt, err := types.BuildSystemPrompt(matrix, taskContext, coreSystemPrinciples)
	if err != nil {
		// Fallback to basic system prompt if building fails
		systemPrompt = fmt.Sprintf("You are a %s agent. Execute tasks according to your behavioral specifications.", agentID)
	}
	
	session := &AgentSession{
		ID:        sessionID,
		AgentID:   agentID,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: systemPrompt,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Matrix:    matrix,
		Completed: false,
	}
	
	sm.sessions[sessionID] = session
	
	// Save new session to disk
	sm.saveSessionToDisk(session, false)
	
	return session
}

// cleanupCompletedSession removes a completed session
func (sm *SessionManager) cleanupCompletedSession(sessionID string) {
	sm.sessionMutex.Lock()
	defer sm.sessionMutex.Unlock()
	
	if session, exists := sm.sessions[sessionID]; exists && session.Completed {
		delete(sm.sessions, sessionID)
	}
}

// ensureStorageDirectories creates the .gorka session storage directories
func (sm *SessionManager) ensureStorageDirectories() {
	activeDir := filepath.Join(sm.storageDir, "active")
	completedDir := filepath.Join(sm.storageDir, "completed")
	
	os.MkdirAll(activeDir, 0755)
	os.MkdirAll(completedDir, 0755)
}

// saveSessionToDisk saves a session to a JSON file
func (sm *SessionManager) saveSessionToDisk(session *AgentSession, completed bool) error {
	subDir := "active"
	if completed {
		subDir = "completed"
	}
	
	filePath := filepath.Join(sm.storageDir, subDir, session.ID+".json")
	
	// Create a copy of the session for serialization (excluding Matrix to avoid circular refs)
	sessionData := struct {
		ID        string                          `json:"id"`
		AgentID   string                          `json:"agent_id"`
		Messages  []openai.ChatCompletionMessage `json:"messages"`
		CreatedAt time.Time                       `json:"created_at"`
		UpdatedAt time.Time                       `json:"updated_at"`
		Completed bool                            `json:"completed"`
	}{
		ID:        session.ID,
		AgentID:   session.AgentID,
		Messages:  session.Messages,
		CreatedAt: session.CreatedAt,
		UpdatedAt: session.UpdatedAt,
		Completed: session.Completed,
	}
	
	data, err := json.MarshalIndent(sessionData, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}
	
	// Write atomically by writing to temp file then renaming
	tempPath := filePath + ".tmp"
	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write session file: %w", err)
	}
	
	if err := os.Rename(tempPath, filePath); err != nil {
		os.Remove(tempPath) // Clean up temp file on error
		return fmt.Errorf("failed to move session file: %w", err)
	}
	
	return nil
}

// loadSessionsFromDisk loads existing sessions from JSON files
func (sm *SessionManager) loadSessionsFromDisk() {
	sm.loadSessionsFromDirectory("active", false)
	sm.loadSessionsFromDirectory("completed", true)
}

// loadSessionsFromDirectory loads sessions from a specific directory
func (sm *SessionManager) loadSessionsFromDirectory(subDir string, completed bool) {
	dirPath := filepath.Join(sm.storageDir, subDir)
	
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		// Directory might not exist yet, that's OK
		return
	}
	
	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			filePath := filepath.Join(dirPath, entry.Name())
			
			data, err := os.ReadFile(filePath)
			if err != nil {
				fmt.Printf("Warning: failed to read session file %s: %v\n", filePath, err)
				continue
			}
			
			var sessionData struct {
				ID        string                          `json:"id"`
				AgentID   string                          `json:"agent_id"`
				Messages  []openai.ChatCompletionMessage `json:"messages"`
				CreatedAt time.Time                       `json:"created_at"`
				UpdatedAt time.Time                       `json:"updated_at"`
				Completed bool                            `json:"completed"`
			}
			
			if err := json.Unmarshal(data, &sessionData); err != nil {
				fmt.Printf("Warning: failed to unmarshal session file %s: %v\n", filePath, err)
				continue
			}
			
			// Create session object (without Matrix since it's not persisted)
			session := &AgentSession{
				ID:        sessionData.ID,
				AgentID:   sessionData.AgentID,
				Messages:  sessionData.Messages,
				CreatedAt: sessionData.CreatedAt,
				UpdatedAt: sessionData.UpdatedAt,
				Completed: sessionData.Completed,
				Matrix:    nil, // Will be set when session is actively used
			}
			
			sm.sessions[session.ID] = session
		}
	}
}
