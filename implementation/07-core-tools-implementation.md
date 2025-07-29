---
target_execution: "llm_agent_implementation"
implementation_domain: "core_tools_implementation"
---

# CORE TOOLS IMPLEMENTATION

## FILE_TOOLS_IMPLEMENTATION

File: `internal/tools/file/file_tools.go`

```go
package file

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
)

type FileTools struct {
	workspaceRoot string
}

type ReadFileRequest struct {
	FilePath  string `json:"filePath"`
	StartLine int    `json:"startLine"`
	EndLine   int    `json:"endLine"`
}

type ReadFileResponse struct {
	Content   string `json:"content"`
	LineCount int    `json:"lineCount"`
	FilePath  string `json:"filePath"`
}

type ReplaceStringRequest struct {
	FilePath  string `json:"filePath"`
	OldString string `json:"oldString"`
	NewString string `json:"newString"`
}

type ReplaceStringResponse struct {
	Success     bool   `json:"success"`
	FilePath    string `json:"filePath"`
	ReplacedAt  int    `json:"replacedAt"`
	OldContent  string `json:"oldContent"`
	NewContent  string `json:"newContent"`
}

type CreateFileRequest struct {
	FilePath string `json:"filePath"`
	Content  string `json:"content"`
}

type CreateFileResponse struct {
	Success  bool   `json:"success"`
	FilePath string `json:"filePath"`
	Created  bool   `json:"created"`
}

type GrepSearchRequest struct {
	Query          string `json:"query"`
	IncludePattern string `json:"includePattern,omitempty"`
	IsRegexp       bool   `json:"isRegexp"`
	MaxResults     int    `json:"maxResults,omitempty"`
}

type GrepSearchResponse struct {
	Matches    []GrepMatch `json:"matches"`
	TotalFound int         `json:"totalFound"`
	Query      string      `json:"query"`
}

type GrepMatch struct {
	FilePath    string `json:"filePath"`
	LineNumber  int    `json:"lineNumber"`
	Line        string `json:"line"`
	MatchStart  int    `json:"matchStart"`
	MatchEnd    int    `json:"matchEnd"`
}

type FileSearchRequest struct {
	Query      string `json:"query"`
	MaxResults int    `json:"maxResults,omitempty"`
}

type FileSearchResponse struct {
	Files      []string `json:"files"`
	TotalFound int      `json:"totalFound"`
	Pattern    string   `json:"pattern"`
}

type ListDirRequest struct {
	Path string `json:"path"`
}

type ListDirResponse struct {
	Items []DirItem `json:"items"`
	Path  string    `json:"path"`
}

type DirItem struct {
	Name  string `json:"name"`
	IsDir bool   `json:"isDir"`
	Size  int64  `json:"size,omitempty"`
}

func NewFileTools(workspaceRoot string) *FileTools {
	return &FileTools{
		workspaceRoot: workspaceRoot,
	}
}

func (ft *FileTools) validatePath(path string) (string, error) {
	if !filepath.IsAbs(path) {
		path = filepath.Join(ft.workspaceRoot, path)
	}

	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}

	absWorkspace, err := filepath.Abs(ft.workspaceRoot)
	if err != nil {
		return "", err
	}

	if !strings.HasPrefix(absPath, absWorkspace) {
		return "", fmt.Errorf("path outside workspace: %s", path)
	}

	return absPath, nil
}

func (ft *FileTools) ReadFile(req ReadFileRequest) (*ReadFileResponse, error) {
	validPath, err := ft.validatePath(req.FilePath)
	if err != nil {
		return nil, err
	}

	file, err := os.Open(validPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	lineNum := 1

	for scanner.Scan() {
		if lineNum >= req.StartLine && (req.EndLine == 0 || lineNum <= req.EndLine) {
			lines = append(lines, scanner.Text())
		}
		lineNum++
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return &ReadFileResponse{
		Content:   strings.Join(lines, "\n"),
		LineCount: lineNum - 1,
		FilePath:  req.FilePath,
	}, nil
}

func (ft *FileTools) ReplaceString(req ReplaceStringRequest) (*ReplaceStringResponse, error) {
	validPath, err := ft.validatePath(req.FilePath)
	if err != nil {
		return nil, err
	}

	content, err := os.ReadFile(validPath)
	if err != nil {
		return nil, err
	}

	oldContent := string(content)
	replacedCount := strings.Count(oldContent, req.OldString)

	if replacedCount == 0 {
		return &ReplaceStringResponse{
			Success:    false,
			FilePath:   req.FilePath,
			ReplacedAt: -1,
			OldContent: oldContent,
			NewContent: oldContent,
		}, fmt.Errorf("string not found: %s", req.OldString)
	}

	if replacedCount > 1 {
		return &ReplaceStringResponse{
			Success:    false,
			FilePath:   req.FilePath,
			ReplacedAt: -1,
			OldContent: oldContent,
			NewContent: oldContent,
		}, fmt.Errorf("multiple matches found (%d), replacement ambiguous", replacedCount)
	}

	newContent := strings.Replace(oldContent, req.OldString, req.NewString, 1)

	err = os.WriteFile(validPath, []byte(newContent), 0644)
	if err != nil {
		return nil, err
	}

	replacedAt := strings.Index(oldContent, req.OldString)

	return &ReplaceStringResponse{
		Success:    true,
		FilePath:   req.FilePath,
		ReplacedAt: replacedAt,
		OldContent: oldContent,
		NewContent: newContent,
	}, nil
}

func (ft *FileTools) CreateFile(req CreateFileRequest) (*CreateFileResponse, error) {
	validPath, err := ft.validatePath(req.FilePath)
	if err != nil {
		return nil, err
	}

	dir := filepath.Dir(validPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	_, err = os.Stat(validPath)
	fileExists := !os.IsNotExist(err)

	err = os.WriteFile(validPath, []byte(req.Content), 0644)
	if err != nil {
		return nil, err
	}

	return &CreateFileResponse{
		Success:  true,
		FilePath: req.FilePath,
		Created:  !fileExists,
	}, nil
}

func (ft *FileTools) GrepSearch(req GrepSearchRequest) (*GrepSearchResponse, error) {
	var pattern *regexp.Regexp
	var err error

	if req.IsRegexp {
		pattern, err = regexp.Compile(req.Query)
		if err != nil {
			return nil, fmt.Errorf("invalid regex: %v", err)
		}
	}

	maxResults := req.MaxResults
	if maxResults == 0 {
		maxResults = 100
	}

	var matches []GrepMatch
	totalFound := 0

	searchPath := ft.workspaceRoot
	if req.IncludePattern != "" {
		searchPath = filepath.Join(ft.workspaceRoot, req.IncludePattern)
	}

	err = filepath.WalkDir(searchPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}

		if len(matches) >= maxResults {
			return nil
		}

		relPath, _ := filepath.Rel(ft.workspaceRoot, path)

		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		lineNum := 1

		for scanner.Scan() {
			line := scanner.Text()

			var match bool
			var start, end int

			if req.IsRegexp {
				if loc := pattern.FindStringIndex(line); loc != nil {
					match = true
					start, end = loc[0], loc[1]
				}
			} else {
				if idx := strings.Index(strings.ToLower(line), strings.ToLower(req.Query)); idx != -1 {
					match = true
					start = idx
					end = idx + len(req.Query)
				}
			}

			if match {
				matches = append(matches, GrepMatch{
					FilePath:   relPath,
					LineNumber: lineNum,
					Line:       line,
					MatchStart: start,
					MatchEnd:   end,
				})
				totalFound++

				if len(matches) >= maxResults {
					return nil
				}
			}

			lineNum++
		}

		return scanner.Err()
	})

	if err != nil {
		return nil, err
	}

	return &GrepSearchResponse{
		Matches:    matches,
		TotalFound: totalFound,
		Query:      req.Query,
	}, nil
}

func (ft *FileTools) FileSearch(req FileSearchRequest) (*FileSearchResponse, error) {
	maxResults := req.MaxResults
	if maxResults == 0 {
		maxResults = 100
	}

	var files []string
	totalFound := 0

	err := filepath.WalkDir(ft.workspaceRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}

		if len(files) >= maxResults {
			return nil
		}

		relPath, _ := filepath.Rel(ft.workspaceRoot, path)
		fileName := filepath.Base(relPath)

		if matched, _ := filepath.Match(req.Query, fileName); matched {
			files = append(files, relPath)
			totalFound++
		} else if strings.Contains(strings.ToLower(fileName), strings.ToLower(req.Query)) {
			files = append(files, relPath)
			totalFound++
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &FileSearchResponse{
		Files:      files,
		TotalFound: totalFound,
		Pattern:    req.Query,
	}, nil
}

func (ft *FileTools) ListDir(req ListDirRequest) (*ListDirResponse, error) {
	validPath, err := ft.validatePath(req.Path)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(validPath)
	if err != nil {
		return nil, err
	}

	var items []DirItem
	for _, entry := range entries {
		item := DirItem{
			Name:  entry.Name(),
			IsDir: entry.IsDir(),
		}

		if !entry.IsDir() {
			if info, err := entry.Info(); err == nil {
				item.Size = info.Size()
			}
		}

		items = append(items, item)
	}

	return &ListDirResponse{
		Items: items,
		Path:  req.Path,
	}, nil
}

func (ft *FileTools) RegisterMCPTools(srv *server.Server) error {
	// read_file tool
	srv.RegisterTool("read_file", "Read file contents with line range support", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"filePath": map[string]interface{}{
				"type":        "string",
				"description": "Absolute path to file",
			},
			"startLine": map[string]interface{}{
				"type":        "number",
				"description": "Starting line number (1-based)",
			},
			"endLine": map[string]interface{}{
				"type":        "number",
				"description": "Ending line number (1-based)",
			},
		},
		"required": []string{"filePath", "startLine", "endLine"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req ReadFileRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return ft.ReadFile(req)
	})

	// replace_string_in_file tool
	srv.RegisterTool("replace_string_in_file", "Replace string in file with context validation", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"filePath": map[string]interface{}{
				"type":        "string",
				"description": "Absolute path to file",
			},
			"oldString": map[string]interface{}{
				"type":        "string",
				"description": "Exact string to replace (must be unique)",
			},
			"newString": map[string]interface{}{
				"type":        "string",
				"description": "Replacement string",
			},
		},
		"required": []string{"filePath", "oldString", "newString"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req ReplaceStringRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return ft.ReplaceString(req)
	})

	// create_file tool
	srv.RegisterTool("create_file", "Create new file with content", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"filePath": map[string]interface{}{
				"type":        "string",
				"description": "Absolute path for new file",
			},
			"content": map[string]interface{}{
				"type":        "string",
				"description": "File content",
			},
		},
		"required": []string{"filePath", "content"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req CreateFileRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return ft.CreateFile(req)
	})

	// grep_search tool
	srv.RegisterTool("grep_search", "Search for text patterns in files", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"query": map[string]interface{}{
				"type":        "string",
				"description": "Search pattern",
			},
			"includePattern": map[string]interface{}{
				"type":        "string",
				"description": "File pattern to include",
			},
			"isRegexp": map[string]interface{}{
				"type":        "boolean",
				"description": "Whether query is regex",
			},
			"maxResults": map[string]interface{}{
				"type":        "number",
				"description": "Maximum results to return",
			},
		},
		"required": []string{"query", "isRegexp"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req GrepSearchRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return ft.GrepSearch(req)
	})

	// file_search tool
	srv.RegisterTool("file_search", "Search for files by name pattern", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"query": map[string]interface{}{
				"type":        "string",
				"description": "File name pattern",
			},
			"maxResults": map[string]interface{}{
				"type":        "number",
				"description": "Maximum results to return",
			},
		},
		"required": []string{"query"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req FileSearchRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return ft.FileSearch(req)
	})

	// list_dir tool
	srv.RegisterTool("list_dir", "List directory contents", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"path": map[string]interface{}{
				"type":        "string",
				"description": "Directory path",
			},
		},
		"required": []string{"path"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req ListDirRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return ft.ListDir(req)
	})

	return nil
}

func mapToStruct(m map[string]interface{}, v interface{}) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}
```

## KNOWLEDGE_BASE_TOOLS_IMPLEMENTATION

File: `internal/tools/knowledge/knowledge_tools.go`

```go
package knowledge

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
)

type KnowledgeTools struct {
	storageDir string
	graph      *KnowledgeGraph
}

type KnowledgeGraph struct {
	Entities  map[string]*Entity    `json:"entities"`
	Relations map[string]*Relation  `json:"relations"`
	Updated   time.Time            `json:"updated"`
}

type Entity struct {
	Name         string    `json:"name"`
	EntityType   string    `json:"entityType"`
	Observations []string  `json:"observations"`
	Created      time.Time `json:"created"`
	Updated      time.Time `json:"updated"`
}

type Relation struct {
	ID           string    `json:"id"`
	From         string    `json:"from"`
	To           string    `json:"to"`
	RelationType string    `json:"relationType"`
	Created      time.Time `json:"created"`
}

type CreateEntitiesRequest struct {
	Entities []EntityData `json:"entities"`
}

type EntityData struct {
	Name         string   `json:"name"`
	EntityType   string   `json:"entityType"`
	Observations []string `json:"observations"`
}

type CreateEntitiesResponse struct {
	Success     bool     `json:"success"`
	Created     []string `json:"created"`
	Updated     []string `json:"updated"`
	EntityCount int      `json:"entityCount"`
}

type SearchNodesRequest struct {
	Query string `json:"query"`
}

type SearchNodesResponse struct {
	Entities []Entity `json:"entities"`
	Query    string   `json:"query"`
	Found    int      `json:"found"`
}

type CreateRelationsRequest struct {
	Relations []RelationData `json:"relations"`
}

type RelationData struct {
	From         string `json:"from"`
	To           string `json:"to"`
	RelationType string `json:"relationType"`
}

type CreateRelationsResponse struct {
	Success   bool     `json:"success"`
	Created   []string `json:"created"`
	Relations int      `json:"relations"`
}

type AddObservationsRequest struct {
	Observations []ObservationData `json:"observations"`
}

type ObservationData struct {
	EntityName string   `json:"entityName"`
	Contents   []string `json:"contents"`
}

type AddObservationsResponse struct {
	Success bool     `json:"success"`
	Updated []string `json:"updated"`
}

type ReadGraphResponse struct {
	Graph       *KnowledgeGraph `json:"graph"`
	EntityCount int             `json:"entityCount"`
	RelationCount int           `json:"relationCount"`
}

func NewKnowledgeTools(storageDir string) *KnowledgeTools {
	kt := &KnowledgeTools{
		storageDir: storageDir,
		graph: &KnowledgeGraph{
			Entities:  make(map[string]*Entity),
			Relations: make(map[string]*Relation),
			Updated:   time.Now(),
		},
	}

	if err := os.MkdirAll(storageDir, 0755); err != nil {
		fmt.Printf("Failed to create storage directory: %v\n", err)
	}

	kt.loadGraph()
	return kt
}

func (kt *KnowledgeTools) getGraphPath() string {
	return filepath.Join(kt.storageDir, "knowledge_graph.json")
}

func (kt *KnowledgeTools) loadGraph() error {
	graphPath := kt.getGraphPath()

	if _, err := os.Stat(graphPath); os.IsNotExist(err) {
		return nil // No existing graph
	}

	data, err := os.ReadFile(graphPath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, kt.graph)
}

func (kt *KnowledgeTools) saveGraph() error {
	kt.graph.Updated = time.Now()

	data, err := json.MarshalIndent(kt.graph, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(kt.getGraphPath(), data, 0644)
}

func (kt *KnowledgeTools) CreateEntities(req CreateEntitiesRequest) (*CreateEntitiesResponse, error) {
	var created, updated []string

	for _, entityData := range req.Entities {
		if existing, exists := kt.graph.Entities[entityData.Name]; exists {
			// Update existing entity
			existing.Observations = append(existing.Observations, entityData.Observations...)
			existing.Updated = time.Now()
			updated = append(updated, entityData.Name)
		} else {
			// Create new entity
			entity := &Entity{
				Name:         entityData.Name,
				EntityType:   entityData.EntityType,
				Observations: entityData.Observations,
				Created:      time.Now(),
				Updated:      time.Now(),
			}
			kt.graph.Entities[entityData.Name] = entity
			created = append(created, entityData.Name)
		}
	}

	if err := kt.saveGraph(); err != nil {
		return nil, err
	}

	return &CreateEntitiesResponse{
		Success:     true,
		Created:     created,
		Updated:     updated,
		EntityCount: len(kt.graph.Entities),
	}, nil
}

func (kt *KnowledgeTools) SearchNodes(req SearchNodesRequest) (*SearchNodesResponse, error) {
	var entities []Entity
	query := strings.ToLower(req.Query)

	for _, entity := range kt.graph.Entities {
		// Search in entity name
		if strings.Contains(strings.ToLower(entity.Name), query) {
			entities = append(entities, *entity)
			continue
		}

		// Search in entity type
		if strings.Contains(strings.ToLower(entity.EntityType), query) {
			entities = append(entities, *entity)
			continue
		}

		// Search in observations
		for _, observation := range entity.Observations {
			if strings.Contains(strings.ToLower(observation), query) {
				entities = append(entities, *entity)
				break
			}
		}
	}

	return &SearchNodesResponse{
		Entities: entities,
		Query:    req.Query,
		Found:    len(entities),
	}, nil
}

func (kt *KnowledgeTools) CreateRelations(req CreateRelationsRequest) (*CreateRelationsResponse, error) {
	var created []string

	for _, relationData := range req.Relations {
		// Verify entities exist
		if _, exists := kt.graph.Entities[relationData.From]; !exists {
			return nil, fmt.Errorf("entity not found: %s", relationData.From)
		}
		if _, exists := kt.graph.Entities[relationData.To]; !exists {
			return nil, fmt.Errorf("entity not found: %s", relationData.To)
		}

		// Create relation ID
		relationID := fmt.Sprintf("%s|%s|%s", relationData.From, relationData.RelationType, relationData.To)

		// Create relation
		relation := &Relation{
			ID:           relationID,
			From:         relationData.From,
			To:           relationData.To,
			RelationType: relationData.RelationType,
			Created:      time.Now(),
		}

		kt.graph.Relations[relationID] = relation
		created = append(created, relationID)
	}

	if err := kt.saveGraph(); err != nil {
		return nil, err
	}

	return &CreateRelationsResponse{
		Success:   true,
		Created:   created,
		Relations: len(kt.graph.Relations),
	}, nil
}

func (kt *KnowledgeTools) AddObservations(req AddObservationsRequest) (*AddObservationsResponse, error) {
	var updated []string

	for _, obsData := range req.Observations {
		if entity, exists := kt.graph.Entities[obsData.EntityName]; exists {
			entity.Observations = append(entity.Observations, obsData.Contents...)
			entity.Updated = time.Now()
			updated = append(updated, obsData.EntityName)
		} else {
			return nil, fmt.Errorf("entity not found: %s", obsData.EntityName)
		}
	}

	if err := kt.saveGraph(); err != nil {
		return nil, err
	}

	return &AddObservationsResponse{
		Success: true,
		Updated: updated,
	}, nil
}

func (kt *KnowledgeTools) ReadGraph() (*ReadGraphResponse, error) {
	return &ReadGraphResponse{
		Graph:         kt.graph,
		EntityCount:   len(kt.graph.Entities),
		RelationCount: len(kt.graph.Relations),
	}, nil
}

func (kt *KnowledgeTools) RegisterMCPTools(srv *server.Server) error {
	// create_entities tool
	srv.RegisterTool("create_entities", "Create or update entities in knowledge graph", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"entities": map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"name": map[string]interface{}{
							"type":        "string",
							"description": "Entity name",
						},
						"entityType": map[string]interface{}{
							"type":        "string",
							"description": "Entity type",
						},
						"observations": map[string]interface{}{
							"type": "array",
							"items": map[string]interface{}{
								"type": "string",
							},
							"description": "Entity observations",
						},
					},
					"required": []string{"name", "entityType", "observations"},
				},
			},
		},
		"required": []string{"entities"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req CreateEntitiesRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return kt.CreateEntities(req)
	})

	// search_nodes tool
	srv.RegisterTool("search_nodes", "Search entities in knowledge graph", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"query": map[string]interface{}{
				"type":        "string",
				"description": "Search query",
			},
		},
		"required": []string{"query"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req SearchNodesRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return kt.SearchNodes(req)
	})

	// create_relations tool
	srv.RegisterTool("create_relations", "Create relations between entities", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"relations": map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"from": map[string]interface{}{
							"type":        "string",
							"description": "Source entity name",
						},
						"to": map[string]interface{}{
							"type":        "string",
							"description": "Target entity name",
						},
						"relationType": map[string]interface{}{
							"type":        "string",
							"description": "Relation type",
						},
					},
					"required": []string{"from", "to", "relationType"},
				},
			},
		},
		"required": []string{"relations"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req CreateRelationsRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return kt.CreateRelations(req)
	})

	// add_observations tool
	srv.RegisterTool("add_observations", "Add observations to existing entities", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"observations": map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"entityName": map[string]interface{}{
							"type":        "string",
							"description": "Entity name",
						},
						"contents": map[string]interface{}{
							"type": "array",
							"items": map[string]interface{}{
								"type": "string",
							},
							"description": "Observation contents",
						},
					},
					"required": []string{"entityName", "contents"},
				},
			},
		},
		"required": []string{"observations"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req AddObservationsRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return kt.AddObservations(req)
	})

	// read_graph tool
	srv.RegisterTool("read_graph", "Read entire knowledge graph", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{},
	}, func(args map[string]interface{}) (interface{}, error) {
		return kt.ReadGraph()
	})

	return nil
}

func mapToStruct(m map[string]interface{}, v interface{}) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}
```

## THINKING_TOOLS_IMPLEMENTATION

File: `internal/tools/thinking/thinking_tools.go`

```go
package thinking

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
)

type ThinkingTools struct {
	storageDir string
}

type ThinkingRequest struct {
	Thought            string `json:"thought"`
	NextThoughtNeeded  bool   `json:"nextThoughtNeeded"`
	ThoughtNumber      int    `json:"thoughtNumber"`
	TotalThoughts      int    `json:"totalThoughts"`
	IsRevision         bool   `json:"isRevision,omitempty"`
	RevisesThought     int    `json:"revisesThought,omitempty"`
	BranchFromThought  int    `json:"branchFromThought,omitempty"`
	BranchId           string `json:"branchId,omitempty"`
	NeedsMoreThoughts  bool   `json:"needsMoreThoughts,omitempty"`
}

type ThinkingResponse struct {
	ThoughtNumber       int                `json:"thoughtNumber"`
	TotalThoughts       int                `json:"totalThoughts"`
	NextThoughtNeeded   bool               `json:"nextThoughtNeeded"`
	ThoughtHistory      []ThoughtRecord    `json:"thoughtHistory"`
	FinalConclusion     string             `json:"finalConclusion,omitempty"`
	ValidationStatus    string             `json:"validationStatus"`
	QualityMetrics      map[string]float64 `json:"qualityMetrics"`
}

type ThoughtRecord struct {
	Number         int       `json:"number"`
	Content        string    `json:"content"`
	Timestamp      time.Time `json:"timestamp"`
	IsRevision     bool      `json:"isRevision,omitempty"`
	RevisesThought int       `json:"revisesThought,omitempty"`
	BranchId       string    `json:"branchId,omitempty"`
}

type ThinkingSession struct {
	ID           string          `json:"id"`
	Thoughts     []ThoughtRecord `json:"thoughts"`
	Started      time.Time       `json:"started"`
	LastUpdated  time.Time       `json:"lastUpdated"`
	Completed    bool            `json:"completed"`
	MinThoughts  int             `json:"minThoughts"`
}

func NewThinkingTools(storageDir string) *ThinkingTools {
	tt := &ThinkingTools{
		storageDir: storageDir,
	}

	if err := os.MkdirAll(storageDir, 0755); err != nil {
		fmt.Printf("Failed to create thinking storage directory: %v\n", err)
	}

	return tt
}

func (tt *ThinkingTools) generateSessionID() string {
	return fmt.Sprintf("thinking_%d", time.Now().UnixNano())
}

func (tt *ThinkingTools) getSessionPath(sessionID string) string {
	return filepath.Join(tt.storageDir, fmt.Sprintf("%s.json", sessionID))
}

func (tt *ThinkingTools) loadSession(sessionID string) (*ThinkingSession, error) {
	sessionPath := tt.getSessionPath(sessionID)

	if _, err := os.Stat(sessionPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	data, err := os.ReadFile(sessionPath)
	if err != nil {
		return nil, err
	}

	var session ThinkingSession
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, err
	}

	return &session, nil
}

func (tt *ThinkingTools) saveSession(session *ThinkingSession) error {
	session.LastUpdated = time.Now()

	data, err := json.MarshalIndent(session, "", "  ")
	if err != nil {
		return err
	}

	sessionPath := tt.getSessionPath(session.ID)
	return os.WriteFile(sessionPath, data, 0644)
}

func (tt *ThinkingTools) validateThinkingRequest(req ThinkingRequest) error {
	if req.ThoughtNumber < 1 {
		return fmt.Errorf("thought number must be >= 1")
	}

	if req.TotalThoughts < 15 {
		return fmt.Errorf("total thoughts must be >= 15 (minimum requirement)")
	}

	if req.ThoughtNumber > req.TotalThoughts && !req.NeedsMoreThoughts {
		return fmt.Errorf("thought number exceeds total thoughts")
	}

	if len(req.Thought) < 10 {
		return fmt.Errorf("thought content too short (minimum 10 characters)")
	}

	return nil
}

func (tt *ThinkingTools) calculateQualityMetrics(session *ThinkingSession) map[string]float64 {
	metrics := make(map[string]float64)

	if len(session.Thoughts) == 0 {
		return metrics
	}

	// Depth metric - average thought length
	totalLength := 0
	for _, thought := range session.Thoughts {
		totalLength += len(thought.Content)
	}
	metrics["average_thought_length"] = float64(totalLength) / float64(len(session.Thoughts))

	// Progression metric - whether thoughts build on each other
	metrics["thought_count"] = float64(len(session.Thoughts))

	// Minimum requirement compliance
	if len(session.Thoughts) >= 15 {
		metrics["minimum_compliance"] = 1.0
	} else {
		metrics["minimum_compliance"] = float64(len(session.Thoughts)) / 15.0
	}

	// Revision usage (indicates deeper thinking)
	revisionCount := 0
	for _, thought := range session.Thoughts {
		if thought.IsRevision {
			revisionCount++
		}
	}
	metrics["revision_ratio"] = float64(revisionCount) / float64(len(session.Thoughts))

	return metrics
}

func (tt *ThinkingTools) ExecuteThinking(req ThinkingRequest) (*ThinkingResponse, error) {
	if err := tt.validateThinkingRequest(req); err != nil {
		return nil, err
	}

	// For first thought, create new session
	var session *ThinkingSession
	var sessionID string

	if req.ThoughtNumber == 1 {
		sessionID = tt.generateSessionID()
		session = &ThinkingSession{
			ID:          sessionID,
			Thoughts:    []ThoughtRecord{},
			Started:     time.Now(),
			LastUpdated: time.Now(),
			Completed:   false,
			MinThoughts: 15,
		}
	} else {
		// Try to find existing session - for now, create new session ID based on content
		sessionID = tt.generateSessionID()
		sessionPath := tt.getSessionPath(sessionID)

		// Look for recent sessions
		files, err := filepath.Glob(filepath.Join(tt.storageDir, "thinking_*.json"))
		if err == nil && len(files) > 0 {
			// Use most recent session
			recentFile := files[len(files)-1]
			sessionID = filepath.Base(recentFile[:len(recentFile)-5]) // Remove .json
		}

		var err error
		session, err = tt.loadSession(sessionID)
		if err != nil {
			// Create new session if loading fails
			sessionID = tt.generateSessionID()
			session = &ThinkingSession{
				ID:          sessionID,
				Thoughts:    []ThoughtRecord{},
				Started:     time.Now(),
				LastUpdated: time.Now(),
				Completed:   false,
				MinThoughts: 15,
			}
		}
	}

	// Add thought to session
	thoughtRecord := ThoughtRecord{
		Number:         req.ThoughtNumber,
		Content:        req.Thought,
		Timestamp:      time.Now(),
		IsRevision:     req.IsRevision,
		RevisesThought: req.RevisesThought,
		BranchId:       req.BranchId,
	}

	session.Thoughts = append(session.Thoughts, thoughtRecord)

	// Update session completion status
	if !req.NextThoughtNeeded {
		session.Completed = true
	}

	// Adjust total thoughts if needed
	if req.NeedsMoreThoughts && req.TotalThoughts < req.ThoughtNumber+5 {
		req.TotalThoughts = req.ThoughtNumber + 5
	}

	if err := tt.saveSession(session); err != nil {
		return nil, err
	}

	// Calculate quality metrics
	qualityMetrics := tt.calculateQualityMetrics(session)

	// Determine validation status
	validationStatus := "in_progress"
	if session.Completed {
		if len(session.Thoughts) >= 15 {
			validationStatus = "completed_valid"
		} else {
			validationStatus = "completed_insufficient"
		}
	}

	// Prepare final conclusion if session is complete
	var finalConclusion string
	if session.Completed && len(session.Thoughts) > 0 {
		finalConclusion = session.Thoughts[len(session.Thoughts)-1].Content
	}

	return &ThinkingResponse{
		ThoughtNumber:     req.ThoughtNumber,
		TotalThoughts:     req.TotalThoughts,
		NextThoughtNeeded: req.NextThoughtNeeded,
		ThoughtHistory:    session.Thoughts,
		FinalConclusion:   finalConclusion,
		ValidationStatus:  validationStatus,
		QualityMetrics:    qualityMetrics,
	}, nil
}

func (tt *ThinkingTools) RegisterMCPTools(srv *server.Server) error {
	// think_hard tool
	srv.RegisterTool("think_hard", "Execute structured sequential thinking with 15+ thought minimum", map[string]interface{}{
		"type": "object",
		"properties": map[string]interface{}{
			"thought": map[string]interface{}{
				"type":        "string",
				"description": "Current thought content",
			},
			"nextThoughtNeeded": map[string]interface{}{
				"type":        "boolean",
				"description": "Whether another thought is needed",
			},
			"thoughtNumber": map[string]interface{}{
				"type":        "number",
				"description": "Current thought number",
			},
			"totalThoughts": map[string]interface{}{
				"type":        "number",
				"description": "Total thoughts planned (minimum 15)",
			},
			"isRevision": map[string]interface{}{
				"type":        "boolean",
				"description": "Whether this revises a previous thought",
			},
			"revisesThought": map[string]interface{}{
				"type":        "number",
				"description": "Which thought number is being revised",
			},
			"branchFromThought": map[string]interface{}{
				"type":        "number",
				"description": "Thought number to branch from",
			},
			"branchId": map[string]interface{}{
				"type":        "string",
				"description": "Branch identifier",
			},
			"needsMoreThoughts": map[string]interface{}{
				"type":        "boolean",
				"description": "Whether more thoughts are needed than originally planned",
			},
		},
		"required": []string{"thought", "nextThoughtNeeded", "thoughtNumber", "totalThoughts"},
	}, func(args map[string]interface{}) (interface{}, error) {
		var req ThinkingRequest
		if err := mapToStruct(args, &req); err != nil {
			return nil, err
		}
		return tt.ExecuteThinking(req)
	})

	return nil
}

func mapToStruct(m map[string]interface{}, v interface{}) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}
```

## TOOLS_MANAGER_INTEGRATION

File: `internal/tools/manager.go`

```go
package tools

import (
	"fmt"
	"path/filepath"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
	"gorka/internal/tools/file"
	"gorka/internal/tools/knowledge"
	"gorka/internal/tools/thinking"
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

func (tm *ToolsManager) RegisterAllTools(srv *server.Server) error {
	if err := tm.fileTools.RegisterMCPTools(srv); err != nil {
		return fmt.Errorf("failed to register file tools: %v", err)
	}

	if err := tm.knowledgeTools.RegisterMCPTools(srv); err != nil {
		return fmt.Errorf("failed to register knowledge tools: %v", err)
	}

	if err := tm.thinkingTools.RegisterMCPTools(srv); err != nil {
		return fmt.Errorf("failed to register thinking tools: %v", err)
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
```

## MAIN_SERVER_INTEGRATION

File: `cmd/main.go` (update)

```go
package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"github.com/modelcontextprotocol/go-sdk/pkg/server"
	"gorka/internal/behavioral"
	"gorka/internal/tools"
)

func main() {
	// Get workspace root from environment or current directory
	workspaceRoot := os.Getenv("GORKA_WORKSPACE_ROOT")
	if workspaceRoot == "" {
		cwd, err := os.Getwd()
		if err != nil {
			log.Fatalf("Failed to get current directory: %v", err)
		}
		workspaceRoot = cwd
	}

	// Set up storage directory
	storageDir := filepath.Join(workspaceRoot, ".gorka", "storage")
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		log.Fatalf("Failed to create storage directory: %v", err)
	}

	// Create MCP server
	srv := server.NewServer("gorka-behavioral-server", "1.0.0")

	// Initialize tools manager
	toolsManager := tools.NewToolsManager(workspaceRoot, storageDir)

	// Register all core tools
	if err := toolsManager.RegisterAllTools(srv); err != nil {
		log.Fatalf("Failed to register tools: %v", err)
	}

	// Initialize behavioral engine
	behavioralEngine := behavioral.NewEngine()

	// Register behavioral agent tools
	if err := registerBehavioralAgents(srv, behavioralEngine); err != nil {
		log.Fatalf("Failed to register behavioral agents: %v", err)
	}

	// Start server with stdio transport
	ctx := context.Background()
	if err := srv.Serve(ctx); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func registerBehavioralAgents(srv *server.Server, engine *behavioral.Engine) error {
	// Register behavioral matrix execution tools
	// Implementation details from previous documents...
	return nil
}
```

## CHATMODE_TOOL_MAPPING

File: `internal/chatmode-generation/tool-mapping.go`

```go
package chatmode

import (
	"encoding/json"
)

// VSCodeToolMapping maps core tools to VS Code equivalents
type VSCodeToolMapping struct {
	CoreTools   []string `json:"coreTools"`
	VSCodeTools []string `json:"vscodeTools"`
	MCPRequired bool     `json:"mcpRequired"`
}

var CoreToolMappings = map[string]VSCodeToolMapping{
	// File tools that map directly to VS Code
	"read_file": {
		CoreTools:   []string{"read_file"},
		VSCodeTools: []string{"read_file"},
		MCPRequired: false,
	},
	"replace_string_in_file": {
		CoreTools:   []string{"replace_string_in_file"},
		VSCodeTools: []string{"replace_string_in_file"},
		MCPRequired: false,
	},
	"create_file": {
		CoreTools:   []string{"create_file"},
		VSCodeTools: []string{"create_file"},
		MCPRequired: false,
	},
	"grep_search": {
		CoreTools:   []string{"grep_search"},
		VSCodeTools: []string{"grep_search"},
		MCPRequired: false,
	},
	"file_search": {
		CoreTools:   []string{"file_search"},
		VSCodeTools: []string{"file_search"},
		MCPRequired: false,
	},
	"list_dir": {
		CoreTools:   []string{"list_dir"},
		VSCodeTools: []string{"list_dir"},
		MCPRequired: false,
	},

	// Knowledge base tools - require MCP server
	"create_entities": {
		CoreTools:   []string{"create_entities"},
		VSCodeTools: []string{"create_entities"},
		MCPRequired: true,
	},
	"search_nodes": {
		CoreTools:   []string{"search_nodes"},
		VSCodeTools: []string{"search_nodes"},
		MCPRequired: true,
	},
	"create_relations": {
		CoreTools:   []string{"create_relations"},
		VSCodeTools: []string{"create_relations"},
		MCPRequired: true,
	},
	"add_observations": {
		CoreTools:   []string{"add_observations"},
		VSCodeTools: []string{"add_observations"},
		MCPRequired: true,
	},
	"read_graph": {
		CoreTools:   []string{"read_graph"},
		VSCodeTools: []string{"read_graph"},
		MCPRequired: true,
	},

	// Thinking tools - require MCP server
	"think_hard": {
		CoreTools:   []string{"think_hard"},
		VSCodeTools: []string{"think_hard"},
		MCPRequired: true,
	},
}

func GenerateToolsArrayForChatmode(behavioralMatrixTools []string) ([]string, bool) {
	var chatmodeTools []string
	requiresMCP := false

	for _, tool := range behavioralMatrixTools {
		if mapping, exists := CoreToolMappings[tool]; exists {
			chatmodeTools = append(chatmodeTools, mapping.VSCodeTools...)
			if mapping.MCPRequired {
				requiresMCP = true
			}
		} else {
			// Unknown tool - assume VS Code compatible
			chatmodeTools = append(chatmodeTools, tool)
		}
	}

	return chatmodeTools, requiresMCP
}
```

## TESTING_IMPLEMENTATION

```bash
# File tools test
go test ./internal/tools/file -v

# Knowledge base tools test
go test ./internal/tools/knowledge -v

# Thinking tools test
go test ./internal/tools/thinking -v

# Integration test
go test ./internal/tools -v

# Build server with core tools
go build -o gorka-server cmd/main.go

# Test MCP tool registration
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | ./gorka-server

# Test file tool
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "read_file", "arguments": {"filePath": "README.md", "startLine": 1, "endLine": 10}}}' | ./gorka-server

# Test thinking tool
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "think_hard", "arguments": {"thought": "Initial analysis", "nextThoughtNeeded": true, "thoughtNumber": 1, "totalThoughts": 15}}}' | ./gorka-server
```
