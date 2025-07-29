package openrouter

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"gorka/internal/utils"

	"github.com/sashabaranov/go-openai"
)

// Client wraps the OpenAI client configured for OpenRouter
type Client struct {
	client *openai.Client
	config *utils.Config
}

// NewClient creates a new OpenRouter client
func NewClient() (*Client, error) {
	config, err := utils.LoadConfig()
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	// Configure OpenAI client for OpenRouter
	httpClient := &http.Client{
		Timeout: time.Duration(config.RequestTimeout) * time.Second,
	}

	clientConfig := openai.DefaultConfig(config.OpenRouterAPIKey)
	clientConfig.BaseURL = config.OpenRouterBaseURL
	clientConfig.HTTPClient = httpClient

	client := openai.NewClientWithConfig(clientConfig)

	return &Client{
		client: client,
		config: config,
	}, nil
}

// CreateChatCompletion creates a chat completion using OpenRouter
func (c *Client) CreateChatCompletion(ctx context.Context, messages []openai.ChatCompletionMessage) (*openai.ChatCompletionResponse, error) {
	request := openai.ChatCompletionRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   c.config.MaxContextSize,
		Temperature: 0.7,
	}

	response, err := c.client.CreateChatCompletion(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("OpenRouter API call failed: %w", err)
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
