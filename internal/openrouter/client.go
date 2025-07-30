package openrouter

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"gorka/internal/tools"
	"gorka/internal/utils"

	"github.com/modelcontextprotocol/go-sdk/jsonschema"
	"github.com/sashabaranov/go-openai"
)

// customTransport wraps http.RoundTripper to add custom headers
type customTransport struct {
	Transport http.RoundTripper
}

// RoundTrip implements http.RoundTripper interface
func (t *customTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Add custom headers
	req.Header.Set("HTTP-Referer", "https://github.com/gork-labs/gorka")
	req.Header.Set("X-Title", "Gorka")

	return t.Transport.RoundTrip(req)
}

// Client wraps the OpenAI client configured for OpenRouter
type Client struct {
	client       *openai.Client
	config       *utils.Config
	toolsManager *tools.ToolsManager
	openaiTools  []openai.Tool
}

// NewClient creates a new OpenRouter client
func NewClient() (*Client, error) {
	config, err := utils.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// Configure OpenAI client for OpenRouter
	httpClient := &http.Client{
		Timeout:   time.Duration(config.RequestTimeout) * time.Second,
		Transport: &customTransport{Transport: http.DefaultTransport},
	}

	clientConfig := openai.DefaultConfig(config.OpenRouterAPIKey)
	clientConfig.BaseURL = config.OpenRouterBaseURL
	clientConfig.HTTPClient = httpClient

	client := openai.NewClientWithConfig(clientConfig)

	// Initialize tools manager
	toolsManager := tools.NewToolsManager(config.Workspace, config.Workspace+"/.gorka/storage")

	// Get OpenAI tools from centralized registry
	openaiTools := toolsManager.GetOpenAITools()

	return &Client{
		client:       client,
		config:       config,
		toolsManager: toolsManager,
		openaiTools:  openaiTools,
	}, nil
}

// CreateChatCompletion creates a chat completion using OpenRouter with tool support
func (c *Client) CreateChatCompletion(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
	request := openai.ChatCompletionRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   c.config.MaxContextSize,
		Temperature: 0.7,
		Tools:       c.openaiTools,
		ToolChoice:  "auto",
	}

	response, err := c.client.CreateChatCompletion(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("OpenRouter API call failed: %w", err)
	}

	// Handle tool calls if present
	if len(response.Choices) > 0 && len(response.Choices[0].Message.ToolCalls) > 0 {
		return c.handleToolCalls(ctx, messages, &response)
	}

	return &response, nil
}

// HealthCheck validates OpenRouter connectivity and model availability
func (c *Client) HealthCheck(ctx context.Context) error {
	// Simple test message to validate connectivity
	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleUser,
			Content: "Hello",
		},
	}

	request := openai.ChatCompletionRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   10,
		Temperature: 0.0,
	}

	_, err := c.client.CreateChatCompletion(ctx, request)
	if err != nil {
		return fmt.Errorf("OpenRouter health check failed: %w", err)
	}

	return nil
}

// GetModel returns the configured model name
func (c *Client) GetModel() string {
	return c.config.Model
}

// convertMCPToolsToOpenAI converts MCP tools to OpenAI format
func convertMCPToolsToOpenAI(toolsManager *tools.ToolsManager) []openai.Tool {
	// Define which tools to expose to OpenRouter agents (exclude orchestrator tools)
	toolDefinitions := []struct {
		name        string
		description string
		schema      *jsonschema.Schema
	}{
		{
			name:        "read_file",
			description: "Read file contents with line range support",
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"file_path": {Type: "string", Description: "Absolute path to the file to read"},
					"start_line": {Type: "integer", Description: "Line number to start reading from (1-based)", Default: json.RawMessage("1")},
					"end_line": {Type: "integer", Description: "Line number to end reading at (1-based). If 0, read to end of file", Default: json.RawMessage("0")},
				},
				Required: []string{"file_path"},
			},
		},
		{
			name:        "file_search",
			description: "Search for files by name pattern",
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"query": {Type: "string", Description: "File name search pattern"},
					"max_results": {Type: "integer", Description: "Maximum number of results", Default: json.RawMessage("100")},
				},
				Required: []string{"query"},
			},
		},
		{
			name:        "grep_search",
			description: "Search for text patterns in files",
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"query": {Type: "string", Description: "Search pattern"},
					"include_pattern": {Type: "string", Description: "File pattern to include (optional)"},
					"is_regexp": {Type: "boolean", Description: "Whether query is a regular expression", Default: json.RawMessage("false")},
					"max_results": {Type: "integer", Description: "Maximum number of results", Default: json.RawMessage("100")},
				},
				Required: []string{"query", "is_regexp"},
			},
		},
		{
			name:        "list_dir",
			description: "List directory contents",
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"path": {Type: "string", Description: "Absolute path to the directory to list"},
				},
				Required: []string{"path"},
			},
		},
		{
			name:        "replace_string_in_file",
			description: "Replace string in file with context validation",
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"file_path": {Type: "string", Description: "Absolute path to the file to edit"},
					"old_string": {Type: "string", Description: "Exact string to replace"},
					"new_string": {Type: "string", Description: "Replacement string"},
				},
				Required: []string{"file_path", "old_string", "new_string"},
			},
		},
		{
			name:        "create_file",
			description: "Create new file with content",
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"file_path": {Type: "string", Description: "Absolute path to the file to create"},
					"content": {Type: "string", Description: "File content"},
				},
				Required: []string{"file_path", "content"},
			},
		},
	}

	var openaiTools []openai.Tool
	for _, tool := range toolDefinitions {
		openaiTools = append(openaiTools, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        tool.name,
				Description: tool.description,
				Parameters:  convertJSONSchemaToMap(tool.schema),
			},
		})
	}

	return openaiTools
}

// convertJSONSchemaToMap converts jsonschema.Schema to map[string]interface{}
func convertJSONSchemaToMap(schema *jsonschema.Schema) map[string]interface{} {
	result := map[string]interface{}{
		"type": schema.Type,
	}

	if schema.Properties != nil {
		properties := make(map[string]interface{})
		for name, prop := range schema.Properties {
			properties[name] = convertJSONSchemaToMap(prop)
		}
		result["properties"] = properties
	}

	if len(schema.Required) > 0 {
		result["required"] = schema.Required
	}

	if schema.Description != "" {
		result["description"] = schema.Description
	}

	return result
}

// handleToolCalls processes tool calls and continues the conversation
func (c *Client) handleToolCalls(ctx context.Context, originalMessages []openai.ChatCompletionMessage, response *openai.ChatCompletionResponse) (*openai.ChatCompletionResponse, error) {
	// Add the assistant's message with tool calls
	messages := append(originalMessages, response.Choices[0].Message)

	// Execute each tool call
	for _, toolCall := range response.Choices[0].Message.ToolCalls {
		toolResult, err := c.executeToolCall(toolCall)
		if err != nil {
			toolResult = fmt.Sprintf("Error: %v", err)
		}

		// Add tool result message
		messages = append(messages, openai.ChatCompletionMessage{
			Role:       openai.ChatMessageRoleTool,
			Content:    toolResult,
			ToolCallID: toolCall.ID,
		})
	}

	// Continue conversation with tool results
	request := openai.ChatCompletionRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   c.config.MaxContextSize,
		Temperature: 0.7,
	}

	newResponse, err := c.client.CreateChatCompletion(ctx, request)
	if err != nil {
		return nil, err
	}
	return &newResponse, nil
}

// executeToolCall executes a specific tool call using the centralized tool system
func (c *Client) executeToolCall(toolCall openai.ToolCall) (string, error) {
	var params map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &params); err != nil {
		return "", fmt.Errorf("failed to parse tool arguments: %w", err)
	}

	// Use the centralized tool execution system
	return c.toolsManager.ExecuteOpenAITool(toolCall.Function.Name, params)
}
