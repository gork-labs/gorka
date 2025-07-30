package tools

import (
	"fmt"
	"path/filepath"

	"gorka/internal/tools/exec"
	"gorka/internal/tools/file"
	"gorka/internal/tools/knowledge"
	"gorka/internal/tools/system"
	"gorka/internal/tools/thinking"

	"github.com/modelcontextprotocol/go-sdk/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/sashabaranov/go-openai"
)

// ToolRegistrar defines the interface for registering tools
type ToolRegistrar interface {
	RegisterMCPTool(name, description string, handler mcp.ToolHandler, schema *jsonschema.Schema)
	RegisterOpenAITool(name, description string, schema *jsonschema.Schema, executor func(params map[string]interface{}) (string, error))
}

// ToolProvider defines the interface for tool providers
type ToolProvider interface {
	Register(registrar ToolRegistrar)
}

type ToolsManager struct {
	fileTools      *file.FileTools
	knowledgeTools *knowledge.KnowledgeTools
	thinkingTools  *thinking.ThinkingTools
	execTools      *exec.ExecTools
	systemTools    *system.SystemTools
	mcpTools       []MCPToolEntry
	openaiTools    []openai.Tool
	
	// Registry for OpenAI tool execution
	openaiExecutors map[string]func(params map[string]interface{}) (string, error)
}

type MCPToolEntry struct {
	Tool    *mcp.Tool
	Handler mcp.ToolHandler
}

func NewToolsManager(workspaceRoot string, storageDir string) *ToolsManager {
	knowledgeStorageDir := filepath.Join(storageDir, "knowledge")
	thinkingStorageDir := filepath.Join(storageDir, "thinking")

	tm := &ToolsManager{
		fileTools:      file.NewFileTools(workspaceRoot),
		knowledgeTools: knowledge.NewKnowledgeTools(knowledgeStorageDir),
		thinkingTools:  thinking.NewThinkingTools(thinkingStorageDir),
		execTools:      exec.NewExecTools(workspaceRoot),
		systemTools:    system.NewSystemTools(),
		mcpTools:       []MCPToolEntry{},
		openaiTools:    []openai.Tool{},
		openaiExecutors: make(map[string]func(params map[string]interface{}) (string, error)),
	}

	// Register all tools
	tm.fileTools.Register(tm)
	tm.execTools.Register(tm)
	// TODO: Register other tools when we update them

	return tm
}

// intPtr returns a pointer to an integer
func intPtr(i int) *int {
	return &i
}

// float64Ptr returns a pointer to a float64
func float64Ptr(f float64) *float64 {
	return &f
}

func (tm *ToolsManager) RegisterAllTools(server *mcp.Server) error {
	// Register tools from the centralized registry
	for _, tool := range tm.mcpTools {
		mcp.AddTool(server, tool.Tool, tool.Handler)
	}

	// Register remaining tools that haven't been converted yet
	// TODO: Remove this section as tools are converted to use Register() method
	
	// Knowledge tools (not yet converted)
	knowledgeTools := []struct {
		name        string
		description string
		handler     mcp.ToolHandler
		schema      *jsonschema.Schema
	}{
		// ... (keep existing knowledge tools for now)
	}

	// Register remaining unconverted tools
	for _, tool := range knowledgeTools {
		mcpTool := &mcp.Tool{
			Name:        tool.name,
			Description: tool.description,
			InputSchema: tool.schema,
		}
		mcp.AddTool(server, mcpTool, tool.handler)
	}

	return nil
}

func (tm *ToolsManager) GetFileTools() *file.FileTools {
	return tm.fileTools
}

func (tm *ToolsManager) GetKnowledgeTools() *knowledge.KnowledgeTools {
	return tm.knowledgeTools
}

func (tm *ToolsManager) GetThinkingTools() *thinking.ThinkingTools {
	return tm.thinkingTools
}

func (tm *ToolsManager) GetExecTools() *exec.ExecTools {
	return tm.execTools
}

// RegisterMCPTool registers a tool for MCP usage
func (tm *ToolsManager) RegisterMCPTool(name, description string, handler mcp.ToolHandler, schema *jsonschema.Schema) {
	tm.mcpTools = append(tm.mcpTools, MCPToolEntry{
		Tool: &mcp.Tool{
			Name:        name,
			Description: description,
			InputSchema: schema,
		},
		Handler: handler,
	})
}

// RegisterOpenAITool registers a tool for OpenAI/OpenRouter usage
func (tm *ToolsManager) RegisterOpenAITool(name, description string, schema *jsonschema.Schema, executor func(params map[string]interface{}) (string, error)) {
	tm.openaiTools = append(tm.openaiTools, openai.Tool{
		Type: openai.ToolTypeFunction,
		Function: &openai.FunctionDefinition{
			Name:        name,
			Description: description,
			Parameters:  schema, // Direct assignment, no conversion needed
		},
	})
	
	// Register the executor function
	tm.openaiExecutors[name] = executor
}

// GetOpenAITools returns tools for OpenRouter usage
func (tm *ToolsManager) GetOpenAITools() []openai.Tool {
	return tm.openaiTools
}

// ExecuteOpenAITool executes an OpenAI tool by name using the registered executor
func (tm *ToolsManager) ExecuteOpenAITool(name string, params map[string]interface{}) (string, error) {
	executor, exists := tm.openaiExecutors[name]
	if !exists {
		return "", fmt.Errorf("unknown tool: %s", name)
	}
	
	return executor(params)
}
