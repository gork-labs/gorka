package tools

import (
	"fmt"

	"github.com/modelcontextprotocol/go-sdk/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/sashabaranov/go-openai"
)

// ToolDefinition represents a centralized tool definition
type ToolDefinition struct {
	Name        string
	Description string
	Schema      *jsonschema.Schema
	MCPHandler  mcp.ToolHandler
	OpenAIFunc  func(params map[string]interface{}) (string, error)
}

// ToolRegistry manages centralized tool definitions
type ToolRegistry struct {
	tools map[string]*ToolDefinition
}

// NewToolRegistry creates a new tool registry
func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{
		tools: make(map[string]*ToolDefinition),
	}
}

// Register adds a tool definition to the registry
func (r *ToolRegistry) Register(tool *ToolDefinition) {
	r.tools[tool.Name] = tool
}

// GetTools returns all registered tools
func (r *ToolRegistry) GetTools() map[string]*ToolDefinition {
	return r.tools
}

// GetMCPTools returns tools formatted for MCP registration
func (r *ToolRegistry) GetMCPTools() []struct {
	Tool    *mcp.Tool
	Handler mcp.ToolHandler
} {
	var mcpTools []struct {
		Tool    *mcp.Tool
		Handler mcp.ToolHandler
	}

	for _, tool := range r.tools {
		mcpTools = append(mcpTools, struct {
			Tool    *mcp.Tool
			Handler mcp.ToolHandler
		}{
			Tool: &mcp.Tool{
				Name:        tool.Name,
				Description: tool.Description,
				InputSchema: tool.Schema,
			},
			Handler: tool.MCPHandler,
		})
	}

	return mcpTools
}

// GetOpenAITools returns tools formatted for OpenAI/OpenRouter
func (r *ToolRegistry) GetOpenAITools() []openai.Tool {
	var openaiTools []openai.Tool

	for _, tool := range r.tools {
		openaiTools = append(openaiTools, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.Schema, // Direct assignment - no conversion needed!
			},
		})
	}

	return openaiTools
}

// ExecuteOpenAITool executes a tool by name with OpenAI-formatted parameters
func (r *ToolRegistry) ExecuteOpenAITool(name string, params map[string]interface{}) (string, error) {
	tool, exists := r.tools[name]
	if !exists {
		return "", fmt.Errorf("unknown tool: %s", name)
	}

	return tool.OpenAIFunc(params)
}