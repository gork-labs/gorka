package adapters

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"github.com/sashabaranov/go-openai"
)

// QwenAdapter handles Qwen model responses that use XML-based tool calling
type QwenAdapter struct{}

// NewQwenAdapter creates a new Qwen adapter
func NewQwenAdapter() *QwenAdapter {
	return &QwenAdapter{}
}

// GetName returns the adapter name
func (a *QwenAdapter) GetName() string {
	return "qwen"
}

// CanHandle determines if this adapter can handle the given model
func (a *QwenAdapter) CanHandle(modelName string) bool {
	modelLower := strings.ToLower(modelName)
	
	// Check for Qwen model patterns
	qwenPatterns := []string{
		"qwen",
		"qwen2",
		"qwen3",
		"qwen-",
		"qwq",
	}
	
	for _, pattern := range qwenPatterns {
		if strings.Contains(modelLower, pattern) {
			return true
		}
	}
	
	return false
}

// ParseToolCalls extracts tool calls from Qwen XML format
func (a *QwenAdapter) ParseToolCalls(content string) ([]openai.ToolCall, error) {
	var toolCalls []openai.ToolCall
	
	// Pattern to match <tool_call>...</tool_call> blocks
	// Using (?s) flag to allow . to match newlines
	toolCallPattern := regexp.MustCompile(`(?s)<tool_call>\s*(.*?)\s*</tool_call>`)
	toolCallMatches := toolCallPattern.FindAllStringSubmatch(content, -1)
	
	if len(toolCallMatches) == 0 {
		return nil, nil // No tool calls found
	}
	
	for i, match := range toolCallMatches {
		if len(match) < 2 {
			continue
		}
		
		toolCallContent := strings.TrimSpace(match[1])
		
		// Parse the JSON content within the tool_call block
		var toolCallData map[string]interface{}
		if err := json.Unmarshal([]byte(toolCallContent), &toolCallData); err != nil {
			// Try to extract function name and arguments manually if JSON parsing fails
			name, args, extractErr := a.extractFunctionCallManually(toolCallContent)
			if extractErr != nil {
				return nil, fmt.Errorf("failed to parse tool call %d: JSON error: %v, manual extraction error: %v", i+1, err, extractErr)
			}
			toolCallData = map[string]interface{}{
				"name":      name,
				"arguments": args,
			}
		}
		
		// Extract function name
		name, ok := toolCallData["name"].(string)
		if !ok {
			return nil, fmt.Errorf("tool call %d missing or invalid 'name' field", i+1)
		}
		
		// Extract arguments - they might be an object or a string
		var argumentsStr string
		if args, exists := toolCallData["arguments"]; exists {
			switch v := args.(type) {
			case string:
				argumentsStr = v
			case map[string]interface{}:
				// Convert object back to JSON string
				argsBytes, err := json.Marshal(v)
				if err != nil {
					return nil, fmt.Errorf("failed to marshal arguments for tool call %d: %v", i+1, err)
				}
				argumentsStr = string(argsBytes)
			default:
				// For other types, try to marshal them
				argsBytes, err := json.Marshal(v)
				if err != nil {
					return nil, fmt.Errorf("failed to marshal arguments for tool call %d: %v", i+1, err)
				}
				argumentsStr = string(argsBytes)
			}
		} else {
			argumentsStr = "{}" // Default empty arguments
		}
		
		// Create OpenAI ToolCall
		toolCall := openai.ToolCall{
			ID:   fmt.Sprintf("call_%d", i+1), // Generate a unique ID
			Type: openai.ToolTypeFunction,
			Function: openai.FunctionCall{
				Name:      name,
				Arguments: argumentsStr,
			},
		}
		
		toolCalls = append(toolCalls, toolCall)
	}
	
	return toolCalls, nil
}

// ShouldFallbackToStandard returns true to try standard parsing if XML parsing fails
func (a *QwenAdapter) ShouldFallbackToStandard() bool {
	return true
}

// GetConfigRecommendations returns Qwen-specific configuration recommendations
func (a *QwenAdapter) GetConfigRecommendations(modelName string) ModelConfigRecommendations {
	modelLower := strings.ToLower(modelName)
	
	// Qwen3-Coder specific optimizations
	if strings.Contains(modelLower, "coder") {
		parallelToolCalls := true
		topP := float32(0.8) // Optimized for Qwen3-Coder
		
		return ModelConfigRecommendations{
			ChatTemplateKwargs: map[string]interface{}{
				"enable_thinking": false,
				// vLLM recommendations for Qwen3-Coder:
				// --enable-auto-tool-choice and --tool-call-parser hermes
				"tool_call_parser": "hermes",
				"enable_auto_tool_choice": true,
			},
			ParallelToolCalls: &parallelToolCalls, // Native parallel function call support
			TopP: &topP, // Optimized sampling for tool calling
			DebugMessage: fmt.Sprintf("Applied Qwen3-Coder optimizations (parallel tools, hermes parser, top_p=%.1f) for model: %s", topP, modelName),
			HasOptimizations: true,
		}
	}
	
	// General Qwen model optimizations
	if strings.Contains(modelLower, "qwen") {
		parallelToolCalls := true
		topP := float32(0.7) // General Qwen optimization
		
		return ModelConfigRecommendations{
			ChatTemplateKwargs: map[string]interface{}{
				"enable_thinking": false,
				// Use "nous" function call template (preferred over "qwen" for newer models)
				"fncall_prompt_type": "nous",
			},
			ParallelToolCalls: &parallelToolCalls, // Native parallel function call support
			TopP: &topP,
			DebugMessage: fmt.Sprintf("Applied general Qwen optimizations (nous template, parallel tools, top_p=%.1f) for model: %s", topP, modelName),
			HasOptimizations: true,
		}
	}
	
	// No specific optimizations for this model variant
	return ModelConfigRecommendations{
		HasOptimizations: false,
	}
}

// extractFunctionCallManually attempts to extract function name and arguments
// from malformed JSON using string parsing
func (a *QwenAdapter) extractFunctionCallManually(content string) (string, interface{}, error) {
	// Look for "name": "function_name" pattern
	namePattern := regexp.MustCompile(`"name"\s*:\s*"([^"]+)"`)
	nameMatch := namePattern.FindStringSubmatch(content)
	if len(nameMatch) < 2 {
		return "", nil, fmt.Errorf("could not extract function name from: %s", content)
	}
	
	name := nameMatch[1]
	
	// Look for "arguments": {...} or "arguments": "..." pattern
	argsPattern := regexp.MustCompile(`"arguments"\s*:\s*(.+)(?:\s*}?\s*$)`)
	argsMatch := argsPattern.FindStringSubmatch(content)
	
	var arguments interface{} = map[string]interface{}{} // Default empty object
	
	if len(argsMatch) >= 2 {
		argsStr := strings.TrimSpace(argsMatch[1])
		
		// Remove trailing } if present (in case it's part of the outer JSON)
		argsStr = strings.TrimRight(argsStr, "}")
		argsStr = strings.TrimSpace(argsStr)
		
		// Try to parse as JSON
		var parsedArgs interface{}
		if err := json.Unmarshal([]byte(argsStr), &parsedArgs); err == nil {
			arguments = parsedArgs
		} else {
			// If it's not valid JSON, treat it as a string value
			arguments = argsStr
		}
	}
	
	return name, arguments, nil
}