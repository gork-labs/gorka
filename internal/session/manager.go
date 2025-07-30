package session

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
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

// GetContextStats provides context budget monitoring and compression analytics
func (sm *SessionManager) GetContextStats(sessionID string) (map[string]interface{}, error) {
	session, exists := sm.GetSession(sessionID)
	if !exists {
		return nil, fmt.Errorf("session not found")
	}
	
	unfiltered := sm.estimateTokens(session.Messages)
	filtered := sm.estimateTokens(sm.filterMessagesForAPI(session.Messages))
	
	compressionRatio := float64(1)
	if filtered > 0 {
		compressionRatio = float64(unfiltered) / float64(filtered)
	}
	
	return map[string]interface{}{
		"session_id":         sessionID,
		"total_messages":     len(session.Messages),
		"filtered_messages":  len(sm.filterMessagesForAPI(session.Messages)),
		"unfiltered_tokens":  unfiltered,
		"filtered_tokens":    filtered,
		"compression_ratio":  compressionRatio,
		"will_fit":          filtered < 100000,
		"tokens_saved":      unfiltered - filtered,
		"reduction_percent": float64(unfiltered-filtered) / float64(unfiltered) * 100,
	}, nil
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

// GetFilteredSessionMessages returns context-filtered messages for API calls to prevent token limits
func (sm *SessionManager) GetFilteredSessionMessages(sessionID string) ([]openai.ChatCompletionMessage, error) {
	sm.sessionMutex.RLock()
	defer sm.sessionMutex.RUnlock()
	
	session, exists := sm.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("session %s not found", sessionID)
	}
	
	return sm.filterMessagesForAPI(session.Messages), nil
}

// filterMessagesForAPI reduces context size while preserving conversation flow
func (sm *SessionManager) filterMessagesForAPI(messages []openai.ChatCompletionMessage) []openai.ChatCompletionMessage {
	const maxTokens = 100000 // Leave room for response (well under 128K limit)
	const maxMessages = 20   // Hard limit on message count
	
	if len(messages) == 0 {
		return messages
	}
	
	// Step 1: Prune old messages first (keep system + recent exchanges)
	pruned := sm.pruneOldMessages(messages, maxMessages)
	
	// Step 2: Smart filtering based on message content
	var filtered []openai.ChatCompletionMessage
	for _, msg := range pruned {
		filteredMsg := sm.smartFilterMessage(msg)
		filtered = append(filtered, filteredMsg)
	}
	
	// Step 3: Final token check and emergency pruning
	if sm.estimateTokens(filtered) > maxTokens {
		filtered = sm.emergencyPrune(filtered, maxTokens)
	}
	
	return filtered
}

// pruneOldMessages keeps system message + recent N exchanges
func (sm *SessionManager) pruneOldMessages(messages []openai.ChatCompletionMessage, maxMessages int) []openai.ChatCompletionMessage {
	if len(messages) <= maxMessages {
		return messages
	}
	
	// Always keep the system message (assumed to be first)
	var systemMsg *openai.ChatCompletionMessage
	var nonSystemMessages []openai.ChatCompletionMessage
	
	for i, msg := range messages {
		if i == 0 && msg.Role == openai.ChatMessageRoleSystem {
			systemMsg = &msg
		} else {
			nonSystemMessages = append(nonSystemMessages, msg)
		}
	}
	
	// Keep most recent messages within limit
	keepCount := maxMessages - 1 // Reserve space for system message
	if keepCount <= 0 {
		keepCount = maxMessages
	}
	
	var result []openai.ChatCompletionMessage
	if systemMsg != nil {
		result = append(result, *systemMsg)
	}
	
	if len(nonSystemMessages) > keepCount {
		// Keep the most recent messages
		start := len(nonSystemMessages) - keepCount
		result = append(result, nonSystemMessages[start:]...)
	} else {
		result = append(result, nonSystemMessages...)
	}
	
	return result
}

// smartFilterMessage applies intelligent filtering based on message type and content
func (sm *SessionManager) smartFilterMessage(msg openai.ChatCompletionMessage) openai.ChatCompletionMessage {
	filteredMsg := msg // Copy the message
	
	switch msg.Role {
	case openai.ChatMessageRoleTool:
		// More aggressive filtering for code files
		if sm.isFileContent(msg.Content) {
			filteredMsg.Content = sm.summarizeFileContent(msg.Content)
		} else {
			filteredMsg.Content = sm.summarizeToolResponse(msg.Content)
		}
		
	case openai.ChatMessageRoleAssistant:
		// Keep assistant reasoning but trim code blocks
		filteredMsg.Content = sm.trimCodeBlocks(msg.Content, 1000)
		
	case openai.ChatMessageRoleUser:
		// User messages usually short, but check for large code pastes
		if len(msg.Content) > 3000 {
			filteredMsg.Content = msg.Content[:3000] + "...[user input truncated]"
		}
		
	case openai.ChatMessageRoleSystem:
		// Keep system messages as-is (they're typically well-sized)
		break
	}
	
	return filteredMsg
}

// estimateTokens provides more accurate token count estimation with code awareness
func (sm *SessionManager) estimateTokens(messages []openai.ChatCompletionMessage) int {
	total := 0
	for _, msg := range messages {
		content := msg.Content
		
		// Code content has different token density
		if sm.containsCode(content) {
			total += len(content) / 3 // Code is denser
		} else {
			total += len(content) / 4 // Regular text
		}
		
		// Tool calls are expensive
		if len(msg.ToolCalls) > 0 {
			total += len(msg.ToolCalls) * 50 // More realistic overhead
		}
	}
	return total
}

// containsCode detects if content contains code patterns
func (sm *SessionManager) containsCode(content string) bool {
	codeIndicators := []string{"```", "func ", "class ", "def ", "import ", "{", "}"}
	for _, indicator := range codeIndicators {
		if strings.Contains(content, indicator) {
			return true
		}
	}
	return false
}

// emergencyPrune aggressively reduces context when approaching token limits
func (sm *SessionManager) emergencyPrune(messages []openai.ChatCompletionMessage, maxTokens int) []openai.ChatCompletionMessage {
	var systemMsg *openai.ChatCompletionMessage
	var otherMessages []openai.ChatCompletionMessage
	
	for i, msg := range messages {
		if i == 0 && msg.Role == openai.ChatMessageRoleSystem {
			systemMsg = &msg
		} else {
			otherMessages = append(otherMessages, msg)
		}
	}
	
	var result []openai.ChatCompletionMessage
	if systemMsg != nil {
		result = append(result, *systemMsg)
	}
	
	// Add messages from newest backwards until we hit limit
	tokensUsed := 0
	if systemMsg != nil {
		tokensUsed = len(systemMsg.Content) / 4
	}
	
	var selectedMessages []openai.ChatCompletionMessage
	for i := len(otherMessages) - 1; i >= 0; i-- {
		msgTokens := len(otherMessages[i].Content) / 4
		if tokensUsed+msgTokens > maxTokens {
			break
		}
		selectedMessages = append([]openai.ChatCompletionMessage{otherMessages[i]}, selectedMessages...)
		tokensUsed += msgTokens
	}
	
	result = append(result, selectedMessages...)
	return result
}

// isFileContent detects if content appears to be file content
func (sm *SessionManager) isFileContent(content string) bool {
	// Try to parse as JSON first
	var response map[string]interface{}
	if err := json.Unmarshal([]byte(content), &response); err != nil {
		return false
	}
	
	// Check for file content indicators
	if _, hasContent := response["content"]; hasContent {
		if _, hasFilePath := response["filePath"]; hasFilePath {
			return true
		}
	}
	
	return false
}

// summarizeFileContent creates intelligent summary of code files
func (sm *SessionManager) summarizeFileContent(content string) string {
	// Try to parse as JSON to extract file content
	var response map[string]interface{}
	if err := json.Unmarshal([]byte(content), &response); err != nil {
		return content // Not JSON, return as-is
	}
	
	fileContent, hasContent := response["content"].(string)
	if !hasContent {
		// Not file content, use regular tool response summarization
		return sm.summarizeToolResponse(content)
	}
	
	lines := strings.Split(fileContent, "\n")
	
	summary := map[string]interface{}{
		"type":      "file_content",
		"filePath":  response["filePath"],
		"lineCount": len(lines),
		"functions": sm.countFunctions(fileContent),
		"classes":   sm.countClasses(fileContent),
		"imports":   sm.extractImports(fileContent, 5), // First 5 imports
		"preview":   strings.Join(lines[:sm.min(8, len(lines))], "\n"), // First 8 lines
	}
	
	// Copy other metadata fields
	for key, value := range response {
		if key != "content" && key != "filePath" {
			summary[key] = value
		}
	}
	
	summaryBytes, _ := json.Marshal(summary)
	return string(summaryBytes)
}

// trimCodeBlocks reduces large code blocks while preserving context
func (sm *SessionManager) trimCodeBlocks(content string, maxLength int) string {
	if len(content) <= maxLength {
		return content
	}
	
	// Look for code blocks and trim them
	codeBlockPattern := regexp.MustCompile("```[\\s\\S]*?```")
	
	result := content
	codeBlocks := codeBlockPattern.FindAllString(content, -1)
	
	for _, block := range codeBlocks {
		if len(block) > 500 { // Trim large code blocks
			lines := strings.Split(block, "\n")
			if len(lines) > 10 {
				// Keep first and last few lines
				trimmed := strings.Join(lines[:5], "\n") + 
					"\n... [code block trimmed] ...\n" +
					strings.Join(lines[len(lines)-3:], "\n")
				result = strings.Replace(result, block, trimmed, 1)
			}
		}
	}
	
	// Final length check
	if len(result) > maxLength {
		result = result[:maxLength] + "...[response truncated]"
	}
	
	return result
}

// countFunctions counts function definitions in code
func (sm *SessionManager) countFunctions(content string) int {
	patterns := []string{
		`func\s+\w+`,           // Go functions
		`function\s+\w+`,       // JavaScript functions
		`def\s+\w+`,           // Python functions
		`\w+\s*\([^)]*\)\s*{`, // Generic function patterns
	}
	
	count := 0
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		count += len(re.FindAllString(content, -1))
	}
	
	return count
}

// countClasses counts class definitions in code
func (sm *SessionManager) countClasses(content string) int {
	patterns := []string{
		`class\s+\w+`,     // Python, JavaScript classes
		`type\s+\w+\s+struct`, // Go structs
		`interface\s+\w+`, // Go interfaces
	}
	
	count := 0
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		count += len(re.FindAllString(content, -1))
	}
	
	return count
}

// extractImports extracts import statements from code
func (sm *SessionManager) extractImports(content string, maxImports int) []string {
	patterns := []string{
		`import\s+"[^"]*"`,     // Go imports
		`import\s+\w+\s+"[^"]*"`, // Go named imports
		`from\s+\w+\s+import`,  // Python imports
		`import\s+[\w,\s{}]+\s+from`, // JavaScript imports
	}
	
	var imports []string
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllString(content, maxImports)
		imports = append(imports, matches...)
		if len(imports) >= maxImports {
			break
		}
	}
	
	if len(imports) > maxImports {
		imports = imports[:maxImports]
	}
	
	return imports
}

// min returns the smaller of two integers
func (sm *SessionManager) min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// summarizeToolResponse creates a concise summary of tool response JSON
func (sm *SessionManager) summarizeToolResponse(content string) string {
	// Try to parse as JSON to extract key fields
	var response map[string]interface{}
	if err := json.Unmarshal([]byte(content), &response); err != nil {
		return "" // Not JSON, let caller handle truncation
	}
	
	// Extract key information based on common response patterns
	summary := make(map[string]interface{})
	
	// Common success/status fields
	if success, ok := response["success"]; ok {
		summary["success"] = success
	}
	if status, ok := response["status"]; ok {
		summary["status"] = status
	}
	if exitCode, ok := response["exit_code"]; ok {
		summary["exit_code"] = exitCode
	}
	
	// File operation results
	if filePath, ok := response["filePath"]; ok {
		summary["filePath"] = filePath
	}
	if lineCount, ok := response["lineCount"]; ok {
		summary["lineCount"] = lineCount
	}
	
	// Search/count results
	if totalFound, ok := response["totalFound"]; ok {
		summary["totalFound"] = totalFound
	}
	if found, ok := response["found"]; ok {
		summary["found"] = found
	}
	
	// Entity/knowledge operations
	if entityCount, ok := response["entity_count"]; ok {
		summary["entity_count"] = entityCount
	}
	
	// Tool execution metadata
	if toolsExecuted, ok := response["tools_executed"]; ok {
		summary["tools_executed"] = toolsExecuted
	}
	
	// Error information
	if errorMsg, ok := response["error"]; ok {
		if errorStr, ok := errorMsg.(string); ok && len(errorStr) > 100 {
			summary["error"] = errorStr[:100] + "..."
		} else {
			summary["error"] = errorMsg
		}
	}
	
	// Include content preview for file reads
	if content, ok := response["content"]; ok {
		if contentStr, ok := content.(string); ok && len(contentStr) > 200 {
			summary["content_preview"] = contentStr[:200] + "...[content truncated]"
		} else {
			summary["content"] = content
		}
	}
	
	// Serialize summary
	summaryBytes, err := json.Marshal(summary)
	if err != nil {
		return ""
	}
	
	return string(summaryBytes)
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
