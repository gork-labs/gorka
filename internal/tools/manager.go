package tools

import (
	"path/filepath"

	"gorka/internal/tools/file"
	"gorka/internal/tools/knowledge"
	"gorka/internal/tools/thinking"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ToolsManager struct {
	fileTools      *file.FileTools
	knowledgeTools *knowledge.KnowledgeTools
	thinkingTools  *thinking.ThinkingTools
}

func NewToolsManager(workspaceRoot string, storageDir string) *ToolsManager {
	knowledgeStorageDir := filepath.Join(storageDir, "knowledge")
	thinkingStorageDir := filepath.Join(storageDir, "thinking")

	return &ToolsManager{
		fileTools:      file.NewFileTools(workspaceRoot),
		knowledgeTools: knowledge.NewKnowledgeTools(knowledgeStorageDir),
		thinkingTools:  thinking.NewThinkingTools(thinkingStorageDir),
	}
}

func (tm *ToolsManager) RegisterAllTools(server *mcp.Server) error {
	// File tools
	fileTools := []struct {
		name        string
		description string
		handler     mcp.ToolHandler
	}{
		{
			name:        "read_file",
			description: "Read file contents with line range support",
			handler:     tm.fileTools.CreateReadFileHandler(),
		},
		{
			name:        "replace_string_in_file",
			description: "Replace string in file with context validation",
			handler:     tm.fileTools.CreateReplaceStringHandler(),
		},
		{
			name:        "create_file",
			description: "Create new file with content",
			handler:     tm.fileTools.CreateCreateFileHandler(),
		},
		{
			name:        "grep_search",
			description: "Search for text patterns in files",
			handler:     tm.fileTools.CreateGrepSearchHandler(),
		},
		{
			name:        "file_search",
			description: "Search for files by name pattern",
			handler:     tm.fileTools.CreateFileSearchHandler(),
		},
		{
			name:        "list_dir",
			description: "List directory contents",
			handler:     tm.fileTools.CreateListDirHandler(),
		},
	}

	// Knowledge tools
	knowledgeTools := []struct {
		name        string
		description string
		handler     mcp.ToolHandler
	}{
		{
			name:        "create_entities",
			description: "Create or update entities in knowledge graph",
			handler:     tm.knowledgeTools.CreateCreateEntitiesHandler(),
		},
		{
			name:        "search_nodes",
			description: "Search entities in knowledge graph",
			handler:     tm.knowledgeTools.CreateSearchNodesHandler(),
		},
		{
			name:        "create_relations",
			description: "Create relations between entities",
			handler:     tm.knowledgeTools.CreateCreateRelationsHandler(),
		},
		{
			name:        "add_observations",
			description: "Add observations to existing entities",
			handler:     tm.knowledgeTools.CreateAddObservationsHandler(),
		},
		{
			name:        "read_graph",
			description: "Read entire knowledge graph",
			handler:     tm.knowledgeTools.CreateReadGraphHandler(),
		},
	}

	// Thinking tools
	thinkingTools := []struct {
		name        string
		description string
		handler     mcp.ToolHandler
	}{
		{
			name:        "think_hard",
			description: "Execute structured sequential thinking with 15+ thought minimum",
			handler:     tm.thinkingTools.CreateThinkHardHandler(),
		},
	}

	// Register all file tools
	for _, tool := range fileTools {
		mcpTool := &mcp.Tool{
			Name:        tool.name,
			Description: tool.description,
		}
		mcp.AddTool(server, mcpTool, tool.handler)
	}

	// Register all knowledge tools
	for _, tool := range knowledgeTools {
		mcpTool := &mcp.Tool{
			Name:        tool.name,
			Description: tool.description,
		}
		mcp.AddTool(server, mcpTool, tool.handler)
	}

	// Register all thinking tools
	for _, tool := range thinkingTools {
		mcpTool := &mcp.Tool{
			Name:        tool.name,
			Description: tool.description,
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
