package behavioral

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"

	"gorka/internal/embedded"
)

// TaskContext represents the execution context for behavioral processing
type TaskContext struct {
	ExecutionMode  string
	ToolsAvailable string
}

// ParseBehavioralMatrix parses a behavioral matrix from JSON data
func ParseBehavioralMatrix(data []byte) (*BehavioralMatrix, error) {
	var matrix BehavioralMatrix
	if err := json.Unmarshal(data, &matrix); err != nil {
		return nil, fmt.Errorf("failed to parse behavioral matrix: %w", err)
	}
	return &matrix, nil
}

// LoadCoreSystemPrinciples loads all system instructions from embedded resources
func LoadCoreSystemPrinciples() (string, error) {
	// Read all files in the instructions directory
	entries, err := embedded.InstructionsFS.ReadDir("embedded-resources/instructions")
	if err != nil {
		return "", fmt.Errorf("failed to read instructions directory: %w", err)
	}

	// Collect all .md instruction files
	var instructionFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
			instructionFiles = append(instructionFiles, entry.Name())
		}
	}

	// Sort filenames for consistent ordering
	sort.Strings(instructionFiles)

	var result strings.Builder

	// Load and concatenate all instruction files
	for i, filename := range instructionFiles {
		if i > 0 {
			result.WriteString("\n\n")
		}

		// Add file header for clarity
		result.WriteString(fmt.Sprintf("# Instructions from: %s\n\n", filename))

		// Read file content
		content, err := embedded.InstructionsFS.ReadFile("embedded-resources/instructions/" + filename)
		if err != nil {
			return "", fmt.Errorf("failed to read instruction file %s: %w", filename, err)
		}

		result.WriteString(string(content))
	}

	return result.String(), nil
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

// Helper functions to extract data from algorithm structure

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

// LoadBehavioralMatrix loads a behavioral matrix from file path
func LoadBehavioralMatrix(filePath string) (*BehavioralMatrix, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read behavioral matrix file: %w", err)
	}

	return ParseBehavioralMatrix(data)
}

// GetBehavioralMatrixFromEmbedded loads a behavioral matrix from embedded resources
func GetBehavioralMatrixFromEmbedded(agentID string) (*BehavioralMatrix, error) {
	// Browse all behavioral spec files dynamically using go:embed
	entries, err := embedded.BehavioralSpecsFS.ReadDir("embedded-resources/behavioral-specs")
	if err != nil {
		return nil, fmt.Errorf("failed to read behavioral specs directory: %w", err)
	}

	// Find matching behavioral spec file dynamically
	for _, entry := range entries {
		if strings.Contains(entry.Name(), agentID) && strings.HasSuffix(entry.Name(), ".json") {
			content, err := embedded.BehavioralSpecsFS.ReadFile("embedded-resources/behavioral-specs/" + entry.Name())
			if err != nil {
				return nil, fmt.Errorf("failed to read behavioral spec: %w", err)
			}

			return ParseBehavioralMatrix(content)
		}
	}

	return nil, fmt.Errorf("behavioral matrix for agent %s not found in embedded resources", agentID)
}
