package utils

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all configuration values
type Config struct {
	OpenRouterAPIKey  string
	OpenAIAPIKey      string
	Model             string
	Workspace         string
	MaxParallelAgents int
	LogLevel          string
	RequestTimeout    int
	MaxContextSize    int
	OpenRouterBaseURL string
	UseOpenAI         bool
}

// LoadConfig loads and validates configuration from environment variables
func LoadConfig() (*Config, error) {
	config := &Config{}

	// Required environment variables
	config.OpenRouterAPIKey = os.Getenv("OPENROUTER_API_KEY")
	if config.OpenRouterAPIKey == "" {
		return nil, errors.New("OPENROUTER_API_KEY is required")
	}

	config.Model = os.Getenv("SECONDBRAIN_MODEL")
	if config.Model == "" {
		return nil, errors.New("SECONDBRAIN_MODEL is required")
	}

	config.Workspace = os.Getenv("SECONDBRAIN_WORKSPACE")
	if config.Workspace == "" {
		return nil, errors.New("SECONDBRAIN_WORKSPACE is required")
	}

	maxAgentsStr := os.Getenv("SECONDBRAIN_MAX_PARALLEL_AGENTS")
	if maxAgentsStr == "" {
		return nil, errors.New("SECONDBRAIN_MAX_PARALLEL_AGENTS is required")
	}
	var err error
	config.MaxParallelAgents, err = strconv.Atoi(maxAgentsStr)
	if err != nil || config.MaxParallelAgents <= 0 {
		return nil, errors.New("SECONDBRAIN_MAX_PARALLEL_AGENTS must be a positive integer")
	}

	// Optional environment variables with defaults
	config.LogLevel = getEnvWithDefault("SECONDBRAIN_LOG_LEVEL", "info")
	config.LogLevel = strings.ToLower(config.LogLevel)
	if !isValidLogLevel(config.LogLevel) {
		return nil, fmt.Errorf("invalid log level: %s (must be debug, info, warn, or error)", config.LogLevel)
	}

	timeoutStr := getEnvWithDefault("SECONDBRAIN_REQUEST_TIMEOUT", "3600")
	config.RequestTimeout, err = strconv.Atoi(timeoutStr)
	if err != nil || config.RequestTimeout <= 0 {
		return nil, errors.New("SECONDBRAIN_REQUEST_TIMEOUT must be a positive integer")
	}

	contextSizeStr := getEnvWithDefault("SECONDBRAIN_MAX_CONTEXT_SIZE", "2048")
	config.MaxContextSize, err = strconv.Atoi(contextSizeStr)
	if err != nil || config.MaxContextSize <= 0 {
		return nil, errors.New("SECONDBRAIN_MAX_CONTEXT_SIZE must be a positive integer")
	}

	config.OpenRouterBaseURL = getEnvWithDefault("SECONDBRAIN_OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

	// Validate workspace directory exists and is writable
	if err := validateWorkspaceDirectory(config.Workspace); err != nil {
		return nil, fmt.Errorf("workspace validation failed: %w", err)
	}

	return config, nil
}

// getEnvWithDefault returns environment variable value or default if not set
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// isValidLogLevel checks if log level is valid
func isValidLogLevel(level string) bool {
	validLevels := []string{"debug", "info", "warn", "error"}
	for _, valid := range validLevels {
		if level == valid {
			return true
		}
	}
	return false
}

// validateWorkspaceDirectory checks if workspace directory exists and is writable
func validateWorkspaceDirectory(path string) error {
	// Check if directory exists
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("workspace directory does not exist: %s", path)
	}

	if !info.IsDir() {
		return fmt.Errorf("workspace path is not a directory: %s", path)
	}

	// Test write permissions by creating a temporary file
	testFile := fmt.Sprintf("%s/.gorka_test_%d", path, os.Getpid())
	file, err := os.Create(testFile)
	if err != nil {
		return fmt.Errorf("workspace directory is not writable: %s", path)
	}
	file.Close()
	os.Remove(testFile)

	return nil
}
