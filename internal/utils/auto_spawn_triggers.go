package utils

import (
	"strings"
)

// AutoSpawnTriggers contains keywords and patterns that should trigger automatic subagent spawning
type AutoSpawnTriggers struct {
	ChangeKeywords    []string
	ModifyKeywords    []string
	FixKeywords       []string
	ImplementKeywords []string
	CreateKeywords    []string
}

// DefaultAutoSpawnTriggers returns the default set of triggers for automatic subagent spawning
func DefaultAutoSpawnTriggers() *AutoSpawnTriggers {
	return &AutoSpawnTriggers{
		ChangeKeywords: []string{
			"change", "modify", "update", "alter", "fix", "correct", "repair",
			"improve", "enhance", "refactor", "optimize", "adjust", "revise",
		},
		ModifyKeywords: []string{
			"edit", "write", "create", "generate", "build", "implement",
			"add", "remove", "delete", "replace", "insert",
		},
		FixKeywords: []string{
			"debug", "troubleshoot", "resolve", "solve", "patch", "hotfix",
			"bugfix", "error", "issue", "problem", "broken",
		},
		ImplementKeywords: []string{
			"implement", "develop", "code", "program", "build", "construct",
			"setup", "configure", "install", "deploy",
		},
		CreateKeywords: []string{
			"create", "make", "generate", "produce", "establish", "form",
			"design", "architect", "plan", "structure",
		},
	}
}

// ShouldSpawnSubagents analyzes the user request to determine if subagents should be spawned
func (ast *AutoSpawnTriggers) ShouldSpawnSubagents(userRequest string) bool {
	lowerRequest := strings.ToLower(userRequest)
	
	// Check for explicit subagent spawn requests
	if strings.Contains(lowerRequest, "run subagents") ||
		strings.Contains(lowerRequest, "spawn agents") ||
		strings.Contains(lowerRequest, "use agents") ||
		strings.Contains(lowerRequest, "execute agents") {
		return true
	}
	
	// Check for change-related keywords
	for _, keyword := range ast.ChangeKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return true
		}
	}
	
	// Check for modification keywords
	for _, keyword := range ast.ModifyKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return true
		}
	}
	
	// Check for fix keywords
	for _, keyword := range ast.FixKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return true
		}
	}
	
	// Check for implementation keywords
	for _, keyword := range ast.ImplementKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return true
		}
	}
	
	// Check for creation keywords
	for _, keyword := range ast.CreateKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return true
		}
	}
	
	return false
}

// GetSpawnReason returns a descriptive reason for why subagents should be spawned
func (ast *AutoSpawnTriggers) GetSpawnReason(userRequest string) string {
	lowerRequest := strings.ToLower(userRequest)
	
	// Check for explicit subagent spawn requests
	if strings.Contains(lowerRequest, "run subagents") ||
		strings.Contains(lowerRequest, "spawn agents") ||
		strings.Contains(lowerRequest, "use agents") ||
		strings.Contains(lowerRequest, "execute agents") {
		return "explicit_subagent_request"
	}
	
	// Check for change-related keywords
	for _, keyword := range ast.ChangeKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return "change_request_detected"
		}
	}
	
	// Check for modification keywords
	for _, keyword := range ast.ModifyKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return "modification_request_detected"
		}
	}
	
	// Check for fix keywords
	for _, keyword := range ast.FixKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return "fix_request_detected"
		}
	}
	
	// Check for implementation keywords
	for _, keyword := range ast.ImplementKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return "implementation_request_detected"
		}
	}
	
	// Check for creation keywords
	for _, keyword := range ast.CreateKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return "creation_request_detected"
		}
	}
	
	return "no_trigger_detected"
}

// SuggestComplexityLevel suggests the appropriate complexity level based on the request
func (ast *AutoSpawnTriggers) SuggestComplexityLevel(userRequest string) string {
	lowerRequest := strings.ToLower(userRequest)
	
	// High complexity indicators
	highComplexityKeywords := []string{
		"architecture", "system", "refactor", "redesign", "overhaul",
		"complex", "comprehensive", "complete", "entire", "full",
		"multiple", "various", "several", "many", "all",
	}
	
	for _, keyword := range highComplexityKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return "high"
		}
	}
	
	// Medium complexity indicators
	mediumComplexityKeywords := []string{
		"integrate", "implement", "enhance", "improve", "optimize",
		"configure", "setup", "deploy", "install", "build",
	}
	
	for _, keyword := range mediumComplexityKeywords {
		if strings.Contains(lowerRequest, keyword) {
			return "medium"
		}
	}
	
	// Default to standard complexity
	return "standard"
}