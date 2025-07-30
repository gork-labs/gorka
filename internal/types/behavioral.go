package types

import (
	"encoding/json"
	"fmt"
	"strings"
)

// BehavioralMatrix represents a behavioral matrix specification
type BehavioralMatrix struct {
	AgentID    string                 `json:"agent_id"`
	MCPTool    string                 `json:"mcp_tool"`
	VSCodeMode string                 `json:"vscode_chatmode"`
	Algorithm  map[string]interface{} `json:"algorithm"`
}

// TaskContext represents the execution context for behavioral processing
type TaskContext struct {
	ExecutionMode  string
	ToolsAvailable string
}

// BehavioralRequest represents a request for behavioral matrix execution
type BehavioralRequest struct {
	AgentID          string                 `json:"agent_id"`
	InputParameters  map[string]interface{} `json:"input_parameters"`
	ExecutionContext map[string]interface{} `json:"execution_context"`
}

// BehavioralResult represents the result of behavioral matrix execution
type BehavioralResult struct {
	AgentID       string                 `json:"agent_id"`
	OutputData    map[string]interface{} `json:"output_data"`
	ExecutionMeta map[string]interface{} `json:"execution_metadata"`
	QualityScore  float64                `json:"quality_score"`
}

// BuildSystemPrompt builds a system prompt for behavioral execution
// This is the SHARED function used by both chatmode generation and OpenRouter agent spawning
// to ensure 100% consistency between deployment modes
func BuildSystemPrompt(matrix *BehavioralMatrix, context TaskContext, coreSystemPrinciples string) (string, error) {
	var promptBuilder strings.Builder

	// Start with core system principles for consistency
	if coreSystemPrinciples != "" {
		promptBuilder.WriteString(coreSystemPrinciples)
		promptBuilder.WriteString("\n\n")
	}

	// Add behavioral matrix execution
	promptBuilder.WriteString("## BEHAVIORAL MATRIX EXECUTION\n\n")

	// Try to extract system prompt template from algorithm
	if systemPrompt, ok := getStringFromAlgorithm(matrix.Algorithm, "system_prompt_template"); ok {
		promptBuilder.WriteString(systemPrompt)
	} else {
		// Generate default system prompt based on agent ID and algorithm
		promptBuilder.WriteString(fmt.Sprintf("You are a %s specialized agent. Execute behavioral matrix algorithms with high precision and quality.", strings.ReplaceAll(matrix.AgentID, "_", " ")))
	}
	promptBuilder.WriteString("\n\n")

	// Add system instructions if available in algorithm
	if instructions, ok := getStringArrayFromAlgorithm(matrix.Algorithm, "system_instructions"); ok {
		promptBuilder.WriteString("## SYSTEM INSTRUCTIONS\n")
		for _, instruction := range instructions {
			promptBuilder.WriteString("- ")
			promptBuilder.WriteString(instruction)
			promptBuilder.WriteString("\n")
		}
		promptBuilder.WriteString("\n")
	}

	// Add execution context
	promptBuilder.WriteString("## EXECUTION CONTEXT\n")
	promptBuilder.WriteString(fmt.Sprintf("Execution Mode: %s\n", context.ExecutionMode))
	promptBuilder.WriteString(fmt.Sprintf("Tools Available: %s\n", context.ToolsAvailable))
	promptBuilder.WriteString("\n")

	// Add comprehensive behavioral algorithm as JSON
	promptBuilder.WriteString("## BEHAVIORAL ALGORITHM\n")
	algorithmJSON, err := json.MarshalIndent(matrix.Algorithm, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal algorithm: %w", err)
	}
	promptBuilder.WriteString(string(algorithmJSON))
	promptBuilder.WriteString("\n\n")

	// Add agent identification
	promptBuilder.WriteString("## AGENT IDENTIFICATION\n")
	promptBuilder.WriteString(fmt.Sprintf("Agent ID: %s\n", matrix.AgentID))
	promptBuilder.WriteString(fmt.Sprintf("MCP Tool: %s\n", matrix.MCPTool))
	promptBuilder.WriteString(fmt.Sprintf("VS Code Chatmode: %s\n", matrix.VSCodeMode))
	promptBuilder.WriteString("\n")

	return promptBuilder.String(), nil
}

// GetToolsFromAlgorithm extracts tools configuration from algorithm structure
func GetToolsFromAlgorithm(algorithm map[string]interface{}, mode string) []string {
	if tools, ok := algorithm["tools"].(map[string]interface{}); ok {
		if modeTools, ok := tools[mode].([]interface{}); ok {
			var toolStrings []string
			for _, tool := range modeTools {
				if toolStr, ok := tool.(string); ok {
					toolStrings = append(toolStrings, toolStr)
				}
			}
			return toolStrings
		}
	}
	return []string{}
}

// getStringFromAlgorithm safely extracts a string value from the algorithm map
func getStringFromAlgorithm(algorithm map[string]interface{}, key string) (string, bool) {
	if value, exists := algorithm[key]; exists {
		if strValue, ok := value.(string); ok {
			return strValue, true
		}
	}
	return "", false
}

// getStringArrayFromAlgorithm safely extracts a string array from the algorithm map
func getStringArrayFromAlgorithm(algorithm map[string]interface{}, key string) ([]string, bool) {
	if value, exists := algorithm[key]; exists {
		if arrayValue, ok := value.([]interface{}); ok {
			var strings []string
			for _, item := range arrayValue {
				if strItem, ok := item.(string); ok {
					strings = append(strings, strItem)
				}
			}
			if len(strings) > 0 {
				return strings, true
			}
		}
	}
	return nil, false
}