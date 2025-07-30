package openrouter

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gorka/internal/openrouter/adapters"
	"gorka/internal/tools"
	"gorka/internal/utils"

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
	client          *openai.Client
	config          *utils.Config
	toolsManager    *tools.ToolsManager
	openaiTools     []openai.Tool
	adapterRegistry *adapters.AdapterRegistry
}

// NewClient creates a new OpenRouter client
func NewClient() (*Client, error) {
	config, err := utils.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	var client *openai.Client

	if config.UseOpenAI {
		// Configure for direct OpenAI API
		clientConfig := openai.DefaultConfig(config.OpenAIAPIKey)
		client = openai.NewClientWithConfig(clientConfig)
	} else {
		// Configure OpenAI client for OpenRouter
		httpClient := &http.Client{
			Timeout:   time.Duration(config.RequestTimeout) * time.Second,
			Transport: &customTransport{Transport: http.DefaultTransport},
		}

		clientConfig := openai.DefaultConfig(config.OpenRouterAPIKey)
		clientConfig.BaseURL = config.OpenRouterBaseURL
		clientConfig.HTTPClient = httpClient

		client = openai.NewClientWithConfig(clientConfig)
	}

	// Initialize tools manager
	toolsManager := tools.NewToolsManager(config.Workspace, config.Workspace+"/.gorka/storage")

	// Get OpenAI tools from centralized registry
	openaiTools := toolsManager.GetOpenAITools()

	// Initialize adapter registry
	adapterRegistry := adapters.NewAdapterRegistry()

	return &Client{
		client:          client,
		config:          config,
		toolsManager:    toolsManager,
		openaiTools:     openaiTools,
		adapterRegistry: adapterRegistry,
	}, nil
}

// ToolExecutionMetadata tracks tool execution during the conversation
type ToolExecutionMetadata struct {
	ToolsExecuted     int      `json:"tools_executed"`
	ToolTypes         []string `json:"tool_types"`
	ExecutionResults  []string `json:"execution_results"`
	ExecutionMode     string   `json:"execution_mode"`
	ToolCallsDetected int      `json:"tool_calls_detected"`
	XMLToolsUsed      int      `json:"xml_tools_used"`
	ErrorsEncountered []string `json:"errors_encountered"`
}

// EnhancedChatCompletionResponse wraps the OpenAI response with tool execution metadata
type EnhancedChatCompletionResponse struct {
	*openai.ChatCompletionResponse
	ToolExecutionMeta *ToolExecutionMetadata `json:"tool_execution_metadata"`
}

// CreateChatCompletion creates a chat completion using OpenRouter with tool support and enhanced tracking
func (c *Client) CreateChatCompletion(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
	fmt.Printf("DEBUG: CreateChatCompletion called with %d messages\n", len(messages))

	// Initialize tool execution tracking
	toolMeta := &ToolExecutionMetadata{
		ToolTypes:         []string{},
		ExecutionResults:  []string{},
		ErrorsEncountered: []string{},
	}

	fmt.Printf("DEBUG: Available tools count: %d\n", len(c.openaiTools))
	for i, tool := range c.openaiTools {
		fmt.Printf("DEBUG: Tool %d: %s\n", i, tool.Function.Name)
	}

	request := openai.ChatCompletionRequest{
		Model:               c.config.Model,
		Messages:            messages,
		MaxCompletionTokens: c.config.MaxContextSize,
		Temperature:         0.7,
		Tools:               c.openaiTools,
		ToolChoice:          "auto",
		ParallelToolCalls:   false, // Disable parallel tool calls to prevent chaos
	}

	// Log the request details
	fmt.Printf("DEBUG: Creating OpenRouter request:\n")
	fmt.Printf("  - Model: %s\n", request.Model)
	fmt.Printf("  - Messages count: %d\n", len(request.Messages))
	fmt.Printf("  - MaxCompletionTokens: %d\n", request.MaxCompletionTokens)
	fmt.Printf("  - Tools count: %d\n", len(request.Tools))
	fmt.Printf("  - ToolChoice: %v\n", request.ToolChoice)

	// Log message details
	for i, msg := range request.Messages {
		fmt.Printf("  - Message %d: Role=%s, ContentLen=%d\n", i, msg.Role, len(msg.Content))
		if len(msg.ToolCalls) > 0 {
			fmt.Printf("    ToolCalls: %d\n", len(msg.ToolCalls))
		}
		if msg.ToolCallID != "" {
			fmt.Printf("    ToolCallID: %s\n", msg.ToolCallID)
		}
	}

	// Apply adapter-specific configuration recommendations
	configRecs := c.adapterRegistry.GetConfigRecommendations(c.config.Model)
	if configRecs.HasOptimizations {
		fmt.Printf("DEBUG: %s\n", configRecs.DebugMessage)

		// Apply ChatTemplateKwargs for vLLM/compatible services
		if len(configRecs.ChatTemplateKwargs) > 0 {
			request.ChatTemplateKwargs = configRecs.ChatTemplateKwargs
			fmt.Printf("DEBUG: Applied ChatTemplateKwargs: %+v\n", configRecs.ChatTemplateKwargs)
		}

		// Enable parallel tool calls if recommended (DISABLED - causes chaos)
		// if configRecs.ParallelToolCalls != nil {
		//     request.ParallelToolCalls = *configRecs.ParallelToolCalls
		//     fmt.Printf("DEBUG: Set ParallelToolCalls to: %t\n", *configRecs.ParallelToolCalls)
		// }
		// Always disable parallel tool calls to prevent chaos
		request.ParallelToolCalls = false
		fmt.Printf("DEBUG: ParallelToolCalls forcibly disabled\n")

		// Apply optimized TopP sampling if recommended
		if configRecs.TopP != nil {
			request.TopP = *configRecs.TopP
			fmt.Printf("DEBUG: Set TopP to: %.2f\n", *configRecs.TopP)
		}
	} else {
		fmt.Printf("DEBUG: No adapter optimizations for model: %s\n", c.config.Model)
	}

	fmt.Printf("DEBUG: Sending request to API...\n")
	response, err := c.createChatCompletionWithRetry(ctx, request, 3)
	if err != nil {
		// Enhanced error logging
		fmt.Printf("DEBUG: API call failed with error: %v\n", err)
		fmt.Printf("DEBUG: Error type: %T\n", err)
		fmt.Printf("DEBUG: Request model was: %s\n", request.Model)
		fmt.Printf("DEBUG: Request had %d tools\n", len(request.Tools))

		// Try to extract more details from the error if it's an OpenAI API error
		if apiErr, ok := err.(*openai.APIError); ok {
			fmt.Printf("DEBUG: OpenAI API Error Details:\n")
			fmt.Printf("  - HTTPStatusCode: %d\n", apiErr.HTTPStatusCode)
			fmt.Printf("  - Code: %s\n", apiErr.Code)
			fmt.Printf("  - Message: %s\n", apiErr.Message)
			fmt.Printf("  - Param: %s\n", apiErr.Param)
			fmt.Printf("  - Type: %s\n", apiErr.Type)
		}

		return nil, fmt.Errorf("API call failed: %w", err)
	}

	// Handle tool calls if present - find first non-empty choice
	if len(response.Choices) > 0 {
		selectedChoice, _, found := c.selectNonEmptyChoice(response.Choices)
		
		if !found {
			fmt.Printf("DEBUG: No non-empty choices found in response\n")
			toolMeta.ExecutionMode = "no_tools"
			c.attachToolMetadata(&response, toolMeta)
			return &response, nil
		}
		
		// First try OpenAI SDK tool calls
		if len(selectedChoice.Message.ToolCalls) > 0 {
			toolMeta.ToolCallsDetected = len(selectedChoice.Message.ToolCalls)
			toolMeta.ExecutionMode = "openai_tools"

			enhancedResponse, err := c.handleToolCallsWithTracking(ctx, messages, &response, selectedChoice, toolMeta)
			if err != nil {
				return nil, err
			}
			return enhancedResponse, nil
		}

		// Try adapter-based parsing for model-specific formats
		content := selectedChoice.Message.Content
		fmt.Printf("DEBUG: Checking adapter for model: %s, content length: %d\n", c.config.Model, len(content))
		if adapter := c.adapterRegistry.GetAdapter(c.config.Model); adapter != nil {
			fmt.Printf("DEBUG: Found adapter: %s, attempting to parse tool calls\n", adapter.GetName())
			if adaptedToolCalls, err := adapter.ParseToolCalls(content); err == nil && len(adaptedToolCalls) > 0 {
				fmt.Printf("DEBUG: Adapter parsed %d tool calls successfully\n", len(adaptedToolCalls))
				// Convert to OpenAI ToolCall format and handle them
				selectedChoice.Message.ToolCalls = adaptedToolCalls
				
				fmt.Printf("DEBUG: Set ToolCalls field to %d items\n", len(adaptedToolCalls))
				toolMeta.ToolCallsDetected = len(adaptedToolCalls)
				toolMeta.ExecutionMode = "adapter_tools"

				enhancedResponse, err := c.handleToolCallsWithTracking(ctx, messages, &response, selectedChoice, toolMeta)
				if err != nil {
					return nil, err
				}
				return enhancedResponse, nil
			} else {
				if err != nil {
					fmt.Printf("DEBUG: Adapter parsing failed: %v\n", err)
				} else {
					fmt.Printf("DEBUG: Adapter found no tool calls in content\n")
				}
			}
		} else {
			fmt.Printf("DEBUG: No adapter found for model: %s\n", c.config.Model)
		}
	}

	// No tools executed
	toolMeta.ExecutionMode = "no_tools"

	// Add metadata to the response (we'll store it in a custom field)
	c.attachToolMetadata(&response, toolMeta)

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
		Model:               c.config.Model,
		Messages:            messages,
		MaxCompletionTokens: 10,
		Temperature:         0.0,
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

// selectNonEmptyChoice finds the first choice with non-empty content or tool calls
// Returns the selected choice, its index, and whether a valid choice was found
func (c *Client) selectNonEmptyChoice(choices []openai.ChatCompletionChoice) (*openai.ChatCompletionChoice, int, bool) {
	if len(choices) == 0 {
		fmt.Printf("DEBUG: No choices available for selection\n")
		return nil, -1, false
	}
	
	for i, choice := range choices {
		hasContent := strings.TrimSpace(choice.Message.Content) != ""
		hasToolCalls := len(choice.Message.ToolCalls) > 0
		
		if hasContent || hasToolCalls {
			fmt.Printf("DEBUG: Selected choice %d (hasContent=%t, hasToolCalls=%t, contentLen=%d)\n", 
				i, hasContent, hasToolCalls, len(choice.Message.Content))
			return &choice, i, true
		}
		
		fmt.Printf("DEBUG: Skipped choice %d (empty content, no tool calls)\n", i)
	}
	
	fmt.Printf("DEBUG: No non-empty choices found in %d available choices\n", len(choices))
	return nil, -1, false
}

// createChatCompletionWithRetry attempts to create a chat completion with retry logic for empty responses
func (c *Client) createChatCompletionWithRetry(ctx context.Context, request openai.ChatCompletionRequest, maxRetries int) (openai.ChatCompletionResponse, error) {
	for attempt := 1; attempt <= maxRetries; attempt++ {
		fmt.Printf("DEBUG: API call attempt %d/%d\n", attempt, maxRetries)
		
		response, err := c.client.CreateChatCompletion(ctx, request)
		if err != nil {
			fmt.Printf("DEBUG: Attempt %d failed with error: %v\n", attempt, err)
			if attempt == maxRetries {
				return openai.ChatCompletionResponse{}, err
			}
			continue
		}
		
		// Check if we have choices
		if len(response.Choices) > 0 {
			// Check if we have at least one non-empty choice
			selectedChoice, _, found := c.selectNonEmptyChoice(response.Choices)
			if found {
				fmt.Printf("DEBUG: Attempt %d succeeded with %d choices\n", attempt, len(response.Choices))
				return response, nil
			}
			fmt.Printf("DEBUG: Attempt %d returned %d choices but all were empty\n", attempt, len(response.Choices))
			
			// Special case: If this is a thinking tool call with next_thought_needed=false, don't retry
			if c.isThinkingComplete(selectedChoice) {
				fmt.Printf("DEBUG: Thinking is complete (next_thought_needed=false), not retrying\n")
				return response, nil
			}
		} else {
			fmt.Printf("DEBUG: Attempt %d returned 0 choices\n", attempt)
		}
		
		if attempt < maxRetries {
			fmt.Printf("DEBUG: Retrying API call...\n")
		}
	}
	
	return openai.ChatCompletionResponse{}, fmt.Errorf("all %d attempts returned empty or no choices", maxRetries)
}

// isThinkingComplete checks if a choice contains a think_hard tool call with next_thought_needed=false
func (c *Client) isThinkingComplete(choice *openai.ChatCompletionChoice) bool {
	if choice == nil || len(choice.Message.ToolCalls) == 0 {
		return false
	}
	
	for _, toolCall := range choice.Message.ToolCalls {
		if toolCall.Function.Name == "think_hard" {
			// Parse the arguments to check next_thought_needed
			var params map[string]interface{}
			if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &params); err != nil {
				continue
			}
			
			if nextNeeded, ok := params["next_thought_needed"].(bool); ok && !nextNeeded {
				fmt.Printf("DEBUG: Found think_hard with next_thought_needed=false\n")
				return true
			}
		}
	}
	
	return false
}

// handleToolCallsWithTracking processes tool calls with enhanced tracking
func (c *Client) handleToolCallsWithTracking(ctx context.Context, originalMessages []openai.ChatCompletionMessage, response *openai.ChatCompletionResponse, selectedChoice *openai.ChatCompletionChoice, toolMeta *ToolExecutionMetadata) (*openai.ChatCompletionResponse, error) {
	// Add the assistant's message with tool calls
	messages := append(originalMessages, selectedChoice.Message)

	// Execute each tool call with tracking
	for _, toolCall := range selectedChoice.Message.ToolCalls {
		toolResult, err := c.executeToolCall(toolCall)
		if err != nil {
			toolMeta.ErrorsEncountered = append(toolMeta.ErrorsEncountered, fmt.Sprintf("Tool %s: %v", toolCall.Function.Name, err))
			toolResult = fmt.Sprintf("Error: %v", err)
		} else {
			toolMeta.ToolsExecuted++
			toolMeta.ToolTypes = append(toolMeta.ToolTypes, toolCall.Function.Name)
			toolMeta.ExecutionResults = append(toolMeta.ExecutionResults, fmt.Sprintf("%s executed successfully", toolCall.Function.Name))
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
		Model:               c.config.Model,
		Messages:            messages,
		MaxCompletionTokens: c.config.MaxContextSize,
		Temperature:         0.7,
		Tools:               c.openaiTools,
		ToolChoice:          "auto",
		ParallelToolCalls:   false, // Disable parallel tool calls to prevent chaos
	}

	newResponse, err := c.createChatCompletionWithRetry(ctx, request, 3)
	if err != nil {
		return nil, fmt.Errorf("follow-up call failed: %w", err)
	}
	if len(newResponse.Choices) == 0 {
		return nil, fmt.Errorf("follow-up call returned no choices after retries")
	}
	
	// Find first non-empty choice in follow-up response
	followUpChoice, _, found := c.selectNonEmptyChoice(newResponse.Choices)
	if !found {
		return nil, fmt.Errorf("follow-up call returned empty content in all choices")
	}

	// Update the response to use the selected choice as the first choice for consistency
	newResponse.Choices[0] = *followUpChoice

	// Attach tool metadata to the response
	c.attachToolMetadata(&newResponse, toolMeta)

	return &newResponse, nil
}

// attachToolMetadata attaches tool execution metadata to the response
func (c *Client) attachToolMetadata(response *openai.ChatCompletionResponse, toolMeta *ToolExecutionMetadata) {
	// We'll store the metadata in the response's Object field or as a special marker in the content
	// Since we can't modify the OpenAI struct directly, we'll use a custom approach
	if len(response.Choices) > 0 {
		// Add a special metadata comment to track tool execution
		metadataJSON, _ := json.Marshal(toolMeta)
		originalContent := response.Choices[0].Message.Content

		// Add metadata as a special comment that can be parsed later
		response.Choices[0].Message.Content = originalContent + fmt.Sprintf("\n\n<!-- TOOL_EXECUTION_METADATA: %s -->", string(metadataJSON))
	}
}

// XMLToolCall represents a parsed XML tool call
type XMLToolCall struct {
	Function   string
	Parameters map[string]string
}

// executeXMLToolCall executes a specific XML tool call using the centralized tool system
func (c *Client) executeXMLToolCall(xmlToolCall XMLToolCall) (string, error) {
	// Convert XML parameters to map[string]interface{} for tool execution
	params := make(map[string]interface{})
	for key, value := range xmlToolCall.Parameters {
		params[key] = value
	}

	// Use the centralized tool execution system
	return c.toolsManager.ExecuteOpenAITool(xmlToolCall.Function, params)
}

// executeToolCall executes a specific tool call using the centralized tool system
func (c *Client) executeToolCall(toolCall openai.ToolCall) (string, error) {
	// Debug logging to understand the parsing issue
	fmt.Printf("DEBUG: Tool call function name: %s\n", toolCall.Function.Name)
	fmt.Printf("DEBUG: Tool call arguments: %s\n", toolCall.Function.Arguments)

	var params map[string]interface{}
	if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &params); err != nil {
		return "", fmt.Errorf("failed to parse tool arguments: %w (raw args: %s)", err, toolCall.Function.Arguments)
	}

	// Use the centralized tool execution system
	return c.toolsManager.ExecuteOpenAITool(toolCall.Function.Name, params)
}
