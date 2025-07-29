package tools

import (
	"encoding/json"
	"path/filepath"

	"gorka/internal/tools/file"
	"gorka/internal/tools/knowledge"
	"gorka/internal/tools/thinking"

	"github.com/modelcontextprotocol/go-sdk/jsonschema"
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

// intPtr returns a pointer to an integer
func intPtr(i int) *int {
	return &i
}

// float64Ptr returns a pointer to a float64
func float64Ptr(f float64) *float64 {
	return &f
}

func (tm *ToolsManager) RegisterAllTools(server *mcp.Server) error {
	// File tools
	fileTools := []struct {
		name        string
		description string
		handler     mcp.ToolHandler
		schema      *jsonschema.Schema
	}{
		{
			name:        "read_file",
			description: "Read file contents with line range support",
			handler:     tm.fileTools.CreateReadFileHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"file_path": {
						Type:        "string",
						Description: "Absolute path to the file to read",
					},
					"start_line": {
						Type:        "integer",
						Description: "Line number to start reading from (1-based)",
						Default:     json.RawMessage("1"),
					},
					"end_line": {
						Type:        "integer",
						Description: "Line number to end reading at (1-based). If 0, read to end of file",
						Default:     json.RawMessage("0"),
					},
				},
				Required: []string{"file_path"},
			},
		},
		{
			name:        "replace_string_in_file",
			description: "Replace string in file with context validation",
			handler:     tm.fileTools.CreateReplaceStringHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"file_path": {
						Type:        "string",
						Description: "Absolute path to the file to edit",
					},
					"old_string": {
						Type:        "string",
						Description: "Exact string to replace",
					},
					"new_string": {
						Type:        "string",
						Description: "Replacement string",
					},
				},
				Required: []string{"file_path", "old_string", "new_string"},
			},
		},
		{
			name:        "create_file",
			description: "Create new file with content",
			handler:     tm.fileTools.CreateCreateFileHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"file_path": {
						Type:        "string",
						Description: "Absolute path to the file to create",
					},
					"content": {
						Type:        "string",
						Description: "File content",
					},
				},
				Required: []string{"file_path", "content"},
			},
		},
		{
			name:        "grep_search",
			description: "Search for text patterns in files",
			handler:     tm.fileTools.CreateGrepSearchHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"query": {
						Type:        "string",
						Description: "Search pattern",
					},
					"include_pattern": {
						Type:        "string",
						Description: "File pattern to include (optional)",
					},
					"is_regexp": {
						Type:        "boolean",
						Description: "Whether query is a regular expression",
						Default:     json.RawMessage("false"),
					},
					"max_results": {
						Type:        "integer",
						Description: "Maximum number of results",
						Default:     json.RawMessage("100"),
					},
				},
				Required: []string{"query", "is_regexp"},
			},
		},
		{
			name:        "file_search",
			description: "Search for files by name pattern",
			handler:     tm.fileTools.CreateFileSearchHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"query": {
						Type:        "string",
						Description: "File name search pattern",
					},
					"max_results": {
						Type:        "integer",
						Description: "Maximum number of results",
						Default:     json.RawMessage("100"),
					},
				},
				Required: []string{"query"},
			},
		},
		{
			name:        "list_dir",
			description: "List directory contents",
			handler:     tm.fileTools.CreateListDirHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"path": {
						Type:        "string",
						Description: "Absolute path to the directory to list",
					},
				},
				Required: []string{"path"},
			},
		},
	}

	// Knowledge tools
	knowledgeTools := []struct {
		name        string
		description string
		handler     mcp.ToolHandler
		schema      *jsonschema.Schema
	}{
		{
			name:        "create_entities",
			description: "Create or update entities in knowledge graph",
			handler:     tm.knowledgeTools.CreateCreateEntitiesHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"entities": {
						Type:        "array",
						Description: "Array of entities to create",
						Items: &jsonschema.Schema{
							Type: "object",
							Properties: map[string]*jsonschema.Schema{
								"name": {
									Type:        "string",
									Description: "Entity name",
								},
								"entity_type": {
									Type:        "string",
									Description: "Entity type",
								},
								"observations": {
									Type:        "array",
									Description: "Array of observations",
									Items: &jsonschema.Schema{
										Type: "string",
									},
								},
							},
							Required: []string{"name", "entity_type", "observations"},
						},
					},
				},
				Required: []string{"entities"},
			},
		},
		{
			name:        "search_nodes",
			description: "Search entities in knowledge graph",
			handler:     tm.knowledgeTools.CreateSearchNodesHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"query": {
						Type:        "string",
						Description: "Search query to match against entity names, types, and observation content",
					},
				},
				Required: []string{"query"},
			},
		},
		{
			name:        "create_relations",
			description: "Create relations between entities",
			handler:     tm.knowledgeTools.CreateCreateRelationsHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"relations": {
						Type:        "array",
						Description: "Array of relations to create",
						Items: &jsonschema.Schema{
							Type: "object",
							Properties: map[string]*jsonschema.Schema{
								"from": {
									Type:        "string",
									Description: "Name of the entity where the relation starts",
								},
								"to": {
									Type:        "string",
									Description: "Name of the entity where the relation ends",
								},
								"relation_type": {
									Type:        "string",
									Description: "Type of the relation",
								},
							},
							Required: []string{"from", "to", "relation_type"},
						},
					},
				},
				Required: []string{"relations"},
			},
		},
		{
			name:        "add_observations",
			description: "Add observations to existing entities",
			handler:     tm.knowledgeTools.CreateAddObservationsHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"observations": {
						Type:        "array",
						Description: "Array of observations to add",
						Items: &jsonschema.Schema{
							Type: "object",
							Properties: map[string]*jsonschema.Schema{
								"entity_name": {
									Type:        "string",
									Description: "Name of the entity to add observations to",
								},
								"contents": {
									Type:        "array",
									Description: "Array of observation contents to add",
									Items: &jsonschema.Schema{
										Type: "string",
									},
								},
							},
							Required: []string{"entity_name", "contents"},
						},
					},
				},
				Required: []string{"observations"},
			},
		},
		{
			name:        "read_graph",
			description: "Read entire knowledge graph",
			handler:     tm.knowledgeTools.CreateReadGraphHandler(),
			schema: &jsonschema.Schema{
				Type:       "object",
				Properties: map[string]*jsonschema.Schema{},
			},
		},
	}

	// Thinking tools
	thinkingTools := []struct {
		name        string
		description string
		handler     mcp.ToolHandler
		schema      *jsonschema.Schema
	}{
		{
			name:        "think_hard",
			description: "Execute structured sequential thinking with 15+ thought minimum",
			handler:     tm.thinkingTools.CreateThinkHardHandler(),
			schema: &jsonschema.Schema{
				Type: "object",
				Properties: map[string]*jsonschema.Schema{
					"thought": {
						Type:        "string",
						Description: "Your current thinking step",
					},
					"next_thought_needed": {
						Type:        "boolean",
						Description: "Whether another thought step is needed",
					},
					"thought_number": {
						Type:        "integer",
						Description: "Current thought number",
						Minimum:     float64Ptr(1),
					},
					"total_thoughts": {
						Type:        "integer",
						Description: "Estimated total thoughts needed",
						Minimum:     float64Ptr(1),
					},
					"is_revision": {
						Type:        "boolean",
						Description: "Whether this revises previous thinking",
					},
					"revises_thought": {
						Type:        "integer",
						Description: "Which thought is being reconsidered",
						Minimum:     float64Ptr(1),
					},
					"branch_from_thought": {
						Type:        "integer",
						Description: "Branching point thought number",
						Minimum:     float64Ptr(1),
					},
					"branch_id": {
						Type:        "string",
						Description: "Branch identifier",
					},
					"needs_more_thoughts": {
						Type:        "boolean",
						Description: "If more thoughts are needed",
					},
				},
				Required: []string{"thought", "next_thought_needed", "thought_number", "total_thoughts"},
			},
		},
	}

	// Register all file tools
	for _, tool := range fileTools {
		mcpTool := &mcp.Tool{
			Name:        tool.name,
			Description: tool.description,
			InputSchema: tool.schema,
		}
		mcp.AddTool(server, mcpTool, tool.handler)
	}

	// Register all knowledge tools
	for _, tool := range knowledgeTools {
		mcpTool := &mcp.Tool{
			Name:        tool.name,
			Description: tool.description,
			InputSchema: tool.schema,
		}
		mcp.AddTool(server, mcpTool, tool.handler)
	}

	// Register all thinking tools
	for _, tool := range thinkingTools {
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
