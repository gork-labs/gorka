package tools

import (
	"fmt"
	"path/filepath"

	"gorka/internal/interfaces"
	"gorka/internal/tools/exec"
	"gorka/internal/tools/fetch"
	"gorka/internal/tools/file"
	"gorka/internal/tools/knowledge"
	"gorka/internal/tools/system"
	"gorka/internal/tools/thinking"

	"github.com/modelcontextprotocol/go-sdk/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/sashabaranov/go-openai"
)

// ToolsManager implements interfaces.ToolRegistrar and manages tool registration and execution
type ToolsManager struct {
	fileTools      *file.FileTools
	knowledgeTools *knowledge.KnowledgeTools
	thinkingTools  *thinking.ThinkingTools
	execTools      *exec.ExecTools
	systemTools    *system.SystemTools
	fetchTools     *fetch.FetchTools
	mcpTools       []MCPToolEntry
	openaiTools    []openai.Tool
	
	// Registry for OpenAI tool execution
	openaiExecutors map[string]func(params map[string]interface{}) (string, error)
}

// Compile-time check that ToolsManager implements interfaces.ToolRegistrar
var _ interfaces.ToolRegistrar = (*ToolsManager)(nil)

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
		fetchTools:     fetch.NewFetchTools(),
		mcpTools:       []MCPToolEntry{},
		openaiTools:    []openai.Tool{},
		openaiExecutors: make(map[string]func(params map[string]interface{}) (string, error)),
	}

	// Register all tools
	tm.fileTools.Register(tm)
	tm.execTools.Register(tm)
	tm.knowledgeTools.Register(tm)
	tm.thinkingTools.Register(tm)
	tm.systemTools.Register(tm)
	tm.fetchTools.Register(tm)

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

func (tm *ToolsManager) GetFetchTools() *fetch.FetchTools {
	return tm.fetchTools
}

// RegisterMCPTool registers a tool for MCP usage
func (tm *ToolsManager) RegisterMCPTool(name, description string, handler mcp.ToolHandler, schema *jsonschema.Schema) {
	// Check if tool is already registered to prevent duplicates
	for _, entry := range tm.mcpTools {
		if entry.Tool.Name == name {
			// Tool already registered, replace the handler and return
			entry.Handler = handler
			return
		}
	}
	
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
	// Check if tool is already registered to prevent duplicates
	for _, tool := range tm.openaiTools {
		if tool.Function.Name == name {
			// Tool already registered, update the executor and return
			tm.openaiExecutors[name] = executor
			return
		}
	}
	
	tm.openaiTools = append(tm.openaiTools, openai.Tool{
		Type: openai.ToolTypeFunction,
		Function: &openai.FunctionDefinition{
			Name:        name,
			Description: description,
			Parameters:  schema, // Direct assignment - jsonschema.Schema implements proper JSON serialization
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
		availableTools := func() []string {
			var names []string
			for toolName := range tm.openaiExecutors {
				names = append(names, toolName)
			}
			return names
		}()
		return "", fmt.Errorf("unknown tool: %s (available: %v)", name, availableTools)
	}
	
	return executor(params)
}
