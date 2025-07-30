package system

import (
	"context"
	"encoding/json"
	"os"

	"gorka/internal/interfaces"
	"gorka/internal/version"

	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/modelcontextprotocol/go-sdk/jsonschema"
)

type SystemTools struct {
	activeModel string
}

func NewSystemTools() *SystemTools {
	// Get active model from environment or default
	activeModel := os.Getenv("SECONDBRAIN_MODEL")
	if activeModel == "" {
		activeModel = "unknown"
	}
	
	return &SystemTools{
		activeModel: activeModel,
	}
}

// Register implements the interfaces.ToolProvider interface
func (st *SystemTools) Register(registrar interfaces.ToolRegistrar) {
	systemInfoSchema := &jsonschema.Schema{
		Type: "object",
		Properties: map[string]*jsonschema.Schema{
			"detailed": {
				Type:        "boolean",
				Description: "Include detailed system information",
			},
		},
	}
	
	// Register system info tool for both MCP and OpenAI usage
	registrar.RegisterMCPTool("get_system_info", "Get system information and status", st.GetSystemInfo, systemInfoSchema)
	registrar.RegisterOpenAITool("get_system_info", "Get system information and status", systemInfoSchema, st.createGetSystemInfoExecutor())
}

// SystemInfo represents system information response
type SystemInfo struct {
	Version     version.Info `json:"version"`
	ActiveModel string       `json:"active_model"`
	Environment struct {
		MaxParallelAgents string `json:"max_parallel_agents"`
		Workspace         string `json:"workspace"`
	} `json:"environment"`
}

func (st *SystemTools) GetSystemInfo(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
	info := SystemInfo{
		Version:     version.GetInfo(),
		ActiveModel: st.activeModel,
		Environment: struct {
			MaxParallelAgents string `json:"max_parallel_agents"`
			Workspace         string `json:"workspace"`
		}{
			MaxParallelAgents: getEnvOrDefault("SECONDBRAIN_MAX_PARALLEL_AGENTS", "3"),
			Workspace:         getEnvOrDefault("SECONDBRAIN_WORKSPACE", "unknown"),
		},
	}

	result, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return nil, err
	}

	return &mcp.CallToolResultFor[any]{
		Content: []mcp.Content{
			&mcp.TextContent{Text: string(result)},
		},
	}, nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Executor function for OpenAI tool calling
func (st *SystemTools) createGetSystemInfoExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		info := SystemInfo{
			Version:     version.GetInfo(),
			ActiveModel: st.activeModel,
			Environment: struct {
				MaxParallelAgents string `json:"max_parallel_agents"`
				Workspace         string `json:"workspace"`
			}{
				MaxParallelAgents: getEnvOrDefault("SECONDBRAIN_MAX_PARALLEL_AGENTS", "3"),
				Workspace:         getEnvOrDefault("SECONDBRAIN_WORKSPACE", "unknown"),
			},
		}

		result, err := json.MarshalIndent(info, "", "  ")
		if err != nil {
			return "", err
		}

		return string(result), nil
	}
}