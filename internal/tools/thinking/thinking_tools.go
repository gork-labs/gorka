package thinking

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ThinkingTools struct {
	storageDir string
}

type ThinkingRequest struct {
	Thought            string `json:"thought"`
	NextThoughtNeeded  bool   `json:"nextThoughtNeeded"`
	ThoughtNumber      int    `json:"thoughtNumber"`
	TotalThoughts      int    `json:"totalThoughts"`
	IsRevision         bool   `json:"isRevision,omitempty"`
	RevisesThought     int    `json:"revisesThought,omitempty"`
	BranchFromThought  int    `json:"branchFromThought,omitempty"`
	BranchId           string `json:"branchId,omitempty"`
	NeedsMoreThoughts  bool   `json:"needsMoreThoughts,omitempty"`
}

type ThinkingResponse struct {
	ThoughtNumber       int                `json:"thoughtNumber"`
	TotalThoughts       int                `json:"totalThoughts"`
	NextThoughtNeeded   bool               `json:"nextThoughtNeeded"`
	ThoughtHistory      []ThoughtRecord    `json:"thoughtHistory"`
	FinalConclusion     string             `json:"finalConclusion,omitempty"`
	ValidationStatus    string             `json:"validationStatus"`
	QualityMetrics      map[string]float64 `json:"qualityMetrics"`
}

type ThoughtRecord struct {
	Number         int       `json:"number"`
	Content        string    `json:"content"`
	Timestamp      time.Time `json:"timestamp"`
	IsRevision     bool      `json:"isRevision,omitempty"`
	RevisesThought int       `json:"revisesThought,omitempty"`
	BranchId       string    `json:"branchId,omitempty"`
}

type ThinkingSession struct {
	ID           string          `json:"id"`
	Thoughts     []ThoughtRecord `json:"thoughts"`
	Started      time.Time       `json:"started"`
	LastUpdated  time.Time       `json:"lastUpdated"`
	Completed    bool            `json:"completed"`
	MinThoughts  int             `json:"minThoughts"`
}

func NewThinkingTools(storageDir string) *ThinkingTools {
	tt := &ThinkingTools{
		storageDir: storageDir,
	}

	if err := os.MkdirAll(storageDir, 0755); err != nil {
		fmt.Printf("Failed to create thinking storage directory: %v\n", err)
	}

	return tt
}

func (tt *ThinkingTools) generateSessionID() string {
	return fmt.Sprintf("thinking_%d", time.Now().UnixNano())
}

func (tt *ThinkingTools) getSessionPath(sessionID string) string {
	return filepath.Join(tt.storageDir, fmt.Sprintf("%s.json", sessionID))
}

func (tt *ThinkingTools) loadSession(sessionID string) (*ThinkingSession, error) {
	sessionPath := tt.getSessionPath(sessionID)

	if _, err := os.Stat(sessionPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	data, err := os.ReadFile(sessionPath)
	if err != nil {
		return nil, err
	}

	var session ThinkingSession
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, err
	}

	return &session, nil
}

func (tt *ThinkingTools) saveSession(session *ThinkingSession) error {
	session.LastUpdated = time.Now()

	data, err := json.MarshalIndent(session, "", "  ")
	if err != nil {
		return err
	}

	sessionPath := tt.getSessionPath(session.ID)
	return os.WriteFile(sessionPath, data, 0644)
}

func (tt *ThinkingTools) validateThinkingRequest(req ThinkingRequest) error {
	if req.ThoughtNumber < 1 {
		return fmt.Errorf("thought number must be >= 1")
	}

	if req.TotalThoughts < 15 {
		return fmt.Errorf("total thoughts must be >= 15 (minimum requirement)")
	}

	if req.ThoughtNumber > req.TotalThoughts && !req.NeedsMoreThoughts {
		return fmt.Errorf("thought number exceeds total thoughts")
	}

	if len(req.Thought) < 10 {
		return fmt.Errorf("thought content too short (minimum 10 characters)")
	}

	return nil
}

func (tt *ThinkingTools) calculateQualityMetrics(session *ThinkingSession) map[string]float64 {
	metrics := make(map[string]float64)

	if len(session.Thoughts) == 0 {
		return metrics
	}

	// Depth metric - average thought length
	totalLength := 0
	for _, thought := range session.Thoughts {
		totalLength += len(thought.Content)
	}
	metrics["average_thought_length"] = float64(totalLength) / float64(len(session.Thoughts))

	// Progression metric - whether thoughts build on each other
	metrics["thought_count"] = float64(len(session.Thoughts))

	// Minimum requirement compliance
	if len(session.Thoughts) >= 15 {
		metrics["minimum_compliance"] = 1.0
	} else {
		metrics["minimum_compliance"] = float64(len(session.Thoughts)) / 15.0
	}

	// Revision usage (indicates deeper thinking)
	revisionCount := 0
	for _, thought := range session.Thoughts {
		if thought.IsRevision {
			revisionCount++
		}
	}
	metrics["revision_ratio"] = float64(revisionCount) / float64(len(session.Thoughts))

	return metrics
}

func (tt *ThinkingTools) ExecuteThinking(req ThinkingRequest) (*ThinkingResponse, error) {
	if err := tt.validateThinkingRequest(req); err != nil {
		return nil, err
	}

	// For first thought, create new session
	var session *ThinkingSession
	var sessionID string

	if req.ThoughtNumber == 1 {
		sessionID = tt.generateSessionID()
		session = &ThinkingSession{
			ID:          sessionID,
			Thoughts:    []ThoughtRecord{},
			Started:     time.Now(),
			LastUpdated: time.Now(),
			Completed:   false,
			MinThoughts: 15,
		}
	} else {
		// Try to find existing session - for now, create new session ID based on content
		sessionID = tt.generateSessionID()

		// Look for recent sessions
		if files, err := filepath.Glob(filepath.Join(tt.storageDir, "thinking_*.json")); err == nil && len(files) > 0 {
			// Use most recent session
			recentFile := files[len(files)-1]
			sessionID = filepath.Base(recentFile[:len(recentFile)-5]) // Remove .json
		}

		if loadedSession, loadErr := tt.loadSession(sessionID); loadErr == nil {
			session = loadedSession
		} else {
			// Create new session if loading fails
			sessionID = tt.generateSessionID()
			session = &ThinkingSession{
				ID:          sessionID,
				Thoughts:    []ThoughtRecord{},
				Started:     time.Now(),
				LastUpdated: time.Now(),
				Completed:   false,
				MinThoughts: 15,
			}
		}
	}

	// Add thought to session
	thoughtRecord := ThoughtRecord{
		Number:         req.ThoughtNumber,
		Content:        req.Thought,
		Timestamp:      time.Now(),
		IsRevision:     req.IsRevision,
		RevisesThought: req.RevisesThought,
		BranchId:       req.BranchId,
	}

	session.Thoughts = append(session.Thoughts, thoughtRecord)

	// Update session completion status
	if !req.NextThoughtNeeded {
		session.Completed = true
	}

	// Adjust total thoughts if needed
	if req.NeedsMoreThoughts && req.TotalThoughts < req.ThoughtNumber+5 {
		req.TotalThoughts = req.ThoughtNumber + 5
	}

	if err := tt.saveSession(session); err != nil {
		return nil, err
	}

	// Calculate quality metrics
	qualityMetrics := tt.calculateQualityMetrics(session)

	// Determine validation status
	validationStatus := "in_progress"
	if session.Completed {
		if len(session.Thoughts) >= 15 {
			validationStatus = "completed_valid"
		} else {
			validationStatus = "completed_insufficient"
		}
	}

	// Prepare final conclusion if session is complete
	var finalConclusion string
	if session.Completed && len(session.Thoughts) > 0 {
		finalConclusion = session.Thoughts[len(session.Thoughts)-1].Content
	}

	return &ThinkingResponse{
		ThoughtNumber:     req.ThoughtNumber,
		TotalThoughts:     req.TotalThoughts,
		NextThoughtNeeded: req.NextThoughtNeeded,
		ThoughtHistory:    session.Thoughts,
		FinalConclusion:   finalConclusion,
		ValidationStatus:  validationStatus,
		QualityMetrics:    qualityMetrics,
	}, nil
}

func (tt *ThinkingTools) CreateThinkHardHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req ThinkingRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}
		
		result, err := tt.ExecuteThinking(req)
		if err != nil {
			return nil, err
		}
		
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("Thought %d/%d processed. Status: %s. Quality metrics: %.2f avg length, %.2f compliance", 
						result.ThoughtNumber, result.TotalThoughts, result.ValidationStatus,
						result.QualityMetrics["average_thought_length"], result.QualityMetrics["minimum_compliance"]),
				},
			},
			IsError: false,
		}, nil
	}
}

func mapToStruct(m map[string]any, v interface{}) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}
