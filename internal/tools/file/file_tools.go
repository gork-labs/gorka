package file

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// ToolRegistrar interface - should match the one in tools package
type ToolRegistrar interface {
	RegisterMCPTool(name, description string, handler mcp.ToolHandler, schema *jsonschema.Schema)
	RegisterOpenAITool(name, description string, schema *jsonschema.Schema, executor func(params map[string]interface{}) (string, error))
}

type FileTools struct {
	workspaceRoot string
}

type ReadFileRequest struct {
	FilePath  string `json:"file_path"`
	StartLine int    `json:"start_line"`
	EndLine   int    `json:"end_line"`
}

type ReadFileResponse struct {
	Content   string `json:"content"`
	LineCount int    `json:"lineCount"`
	FilePath  string `json:"filePath"`
}

type ReplaceStringRequest struct {
	FilePath  string `json:"file_path"`
	OldString string `json:"old_string"`
	NewString string `json:"new_string"`
}

type ReplaceStringResponse struct {
	Success    bool   `json:"success"`
	FilePath   string `json:"filePath"`
	ReplacedAt int    `json:"replacedAt"`
	OldContent string `json:"oldContent"`
	NewContent string `json:"newContent"`
}

type CreateFileRequest struct {
	FilePath string `json:"file_path"`
	Content  string `json:"content"`
}

type CreateFileResponse struct {
	Success  bool   `json:"success"`
	FilePath string `json:"filePath"`
	Created  bool   `json:"created"`
}

type GrepSearchRequest struct {
	Query          string `json:"query"`
	IncludePattern string `json:"include_pattern,omitempty"`
	IsRegexp       bool   `json:"is_regexp"`
	MaxResults     int    `json:"max_results,omitempty"`
}

type GrepSearchResponse struct {
	Matches    []GrepMatch `json:"matches"`
	TotalFound int         `json:"totalFound"`
	Query      string      `json:"query"`
}

type GrepMatch struct {
	FilePath   string `json:"filePath"`
	LineNumber int    `json:"lineNumber"`
	Line       string `json:"line"`
	MatchStart int    `json:"matchStart"`
	MatchEnd   int    `json:"matchEnd"`
}

type FileSearchRequest struct {
	Query      string `json:"query"`
	MaxResults int    `json:"max_results,omitempty"`
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

// Register implements the ToolProvider interface
func (ft *FileTools) Register(registrar ToolRegistrar) {
	// Define the schemas once to reuse for both MCP and OpenAI registration

	readFileSchema := &jsonschema.Schema{
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
	}

	replaceStringSchema := &jsonschema.Schema{
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
	}

	createFileSchema := &jsonschema.Schema{
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
	}

	grepSearchSchema := &jsonschema.Schema{
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
	}

	fileSearchSchema := &jsonschema.Schema{
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
	}

	listDirSchema := &jsonschema.Schema{
		Type: "object",
		Properties: map[string]*jsonschema.Schema{
			"path": {
				Type:        "string",
				Description: "Absolute path to the directory to list",
			},
		},
		Required: []string{"path"},
	}

	// Register all tools for both MCP and OpenAI usage
	registrar.RegisterMCPTool("read_file", "Read file contents with line range support", ft.CreateReadFileHandler(), readFileSchema)
	registrar.RegisterOpenAITool("read_file", "Read file contents with line range support", readFileSchema, ft.createReadFileExecutor())

	registrar.RegisterMCPTool("replace_string_in_file", "Replace string in file with context validation", ft.CreateReplaceStringHandler(), replaceStringSchema)
	registrar.RegisterOpenAITool("replace_string_in_file", "Replace string in file with context validation", replaceStringSchema, ft.createReplaceStringExecutor())

	registrar.RegisterMCPTool("create_file", "Create new file with content", ft.CreateCreateFileHandler(), createFileSchema)
	registrar.RegisterOpenAITool("create_file", "Create new file with content", createFileSchema, ft.createCreateFileExecutor())

	registrar.RegisterMCPTool("grep_search", "Search for text patterns in files", ft.CreateGrepSearchHandler(), grepSearchSchema)
	registrar.RegisterOpenAITool("grep_search", "Search for text patterns in files", grepSearchSchema, ft.createGrepSearchExecutor())

	registrar.RegisterMCPTool("file_search", "Search for files by name pattern", ft.CreateFileSearchHandler(), fileSearchSchema)
	registrar.RegisterOpenAITool("file_search", "Search for files by name pattern", fileSearchSchema, ft.createFileSearchExecutor())

	registrar.RegisterMCPTool("list_dir", "List directory contents", ft.CreateListDirHandler(), listDirSchema)
	registrar.RegisterOpenAITool("list_dir", "List directory contents", listDirSchema, ft.createListDirExecutor())
}

func (ft *FileTools) validatePath(path string) (string, error) {
	if path == "" {
		return "", fmt.Errorf("file path cannot be empty")
	}

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

	// Check if path is a directory
	info, err := os.Stat(validPath)
	if err != nil {
		return nil, err
	}

	if info.IsDir() {
		return nil, fmt.Errorf("path is a directory, not a file: %s", req.FilePath)
	}

	file, err := os.Open(validPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Check if the file is binary before reading
	isBin, err := isBinary(file)
	if err != nil {
		return nil, fmt.Errorf("error checking file type for %s: %w", req.FilePath, err)
	}
	if isBin {
		return nil, fmt.Errorf("cannot read binary file: %s", req.FilePath)
	}

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

// isBinary checks if a file is likely binary by looking for null bytes in the first 512 bytes.
func isBinary(file *os.File) (bool, error) {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return false, err
	}

	// Rewind the file pointer so the caller can read from the beginning.
	if _, err := file.Seek(0, 0); err != nil {
		return false, err
	}

	return bytes.Contains(buffer[:n], []byte{0}), nil
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

	err = filepath.WalkDir(ft.workspaceRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}

		if len(matches) >= maxResults {
			return nil
		}

		relPath, _ := filepath.Rel(ft.workspaceRoot, path)

		// Skip binary files and large files that might cause scanner issues
		if ft.shouldSkipFile(relPath, d) {
			return nil
		}

		// If includePattern is specified, check if file matches
		if req.IncludePattern != "" {
			matched, _ := filepath.Match(req.IncludePattern, filepath.Base(relPath))
			if !matched {
				// Also try matching against the full relative path for patterns like "*/dir/*"
				matched, _ = filepath.Match(req.IncludePattern, relPath)
				if !matched {
					return nil
				}
			}
		}

		file, err := os.Open(path)
		if err != nil {
			return nil
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		// Set a reasonable maximum token size (64KB instead of default ~64KB)
		// This prevents "token too long" errors on minified files
		const maxTokenSize = 64 * 1024
		buf := make([]byte, maxTokenSize)
		scanner.Buffer(buf, maxTokenSize)

		lineNum := 1

		for scanner.Scan() {
			line := scanner.Text()

			// Skip extremely long lines that might be minified code/data
			if len(line) > 10000 {
				lineNum++
				continue
			}

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

		// Handle scanner errors gracefully - don't fail the entire search
		if scanErr := scanner.Err(); scanErr != nil {
			// Log the error but continue with other files
			fmt.Printf("Warning: Skipping file %s due to scanning error: %v\n", relPath, scanErr)
		}

		return nil
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

// shouldSkipFile determines if a file should be skipped during grep search
func (ft *FileTools) shouldSkipFile(relPath string, d fs.DirEntry) bool {
	// Skip common binary file extensions
	ext := strings.ToLower(filepath.Ext(relPath))
	binaryExts := []string{
		".exe", ".dll", ".so", ".dylib", ".bin", ".dat",
		".jpg", ".jpeg", ".png", ".gif", ".bmp", ".ico",
		".mp3", ".mp4", ".avi", ".mov", ".wav",
		".zip", ".tar", ".gz", ".rar", ".7z",
		".pdf", ".doc", ".docx", ".xls", ".xlsx",
	}

	for _, binExt := range binaryExts {
		if ext == binExt {
			return true
		}
	}

	// Skip very large files (over 10MB) that might be data/binary
	if info, err := d.Info(); err == nil && info.Size() > 10*1024*1024 {
		return true
	}

	// Skip common directories that contain large/binary files
	skipDirs := []string{
		"node_modules", ".git", "vendor", "dist", "build",
		"target", "bin", ".vscode", ".idea", "__pycache__",
	}

	pathParts := strings.Split(relPath, string(filepath.Separator))
	for _, part := range pathParts {
		for _, skipDir := range skipDirs {
			if part == skipDir {
				return true
			}
		}
	}

	// Skip minified files which often have extremely long lines
	if strings.Contains(relPath, ".min.") {
		return true
	}

	return false
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

		// Try pattern matching on both filename and full relative path
		var matched bool

		// Try matching the filename
		if match, _ := filepath.Match(req.Query, fileName); match {
			matched = true
		}

		// Try matching the full relative path for patterns like "*/*.chatmode.md"
		if !matched {
			if match, _ := filepath.Match(req.Query, relPath); match {
				matched = true
			}
		}

		// Also do substring matching as fallback
		if !matched && strings.Contains(strings.ToLower(fileName), strings.ToLower(req.Query)) {
			matched = true
		}

		if matched {
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

func (ft *FileTools) CreateReadFileHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req ReadFileRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}

		result, err := ft.ReadFile(req)
		if err != nil {
			return nil, err
		}

		// Return the actual file content, not just a status message
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: result.Content,
				},
			},
			IsError: false,
		}, nil
	}
}

func (ft *FileTools) CreateReplaceStringHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req ReplaceStringRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}

		result, err := ft.ReplaceString(req)
		if err != nil {
			return nil, err
		}

		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("Successfully replaced string in %s at position %d", result.FilePath, result.ReplacedAt),
				},
			},
			IsError: false,
		}, nil
	}
}

func (ft *FileTools) CreateCreateFileHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req CreateFileRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}

		result, err := ft.CreateFile(req)
		if err != nil {
			return nil, err
		}

		action := "Updated"
		if result.Created {
			action = "Created"
		}

		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("%s file %s", action, result.FilePath),
				},
			},
			IsError: false,
		}, nil
	}
}

func (ft *FileTools) CreateGrepSearchHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req GrepSearchRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}

		result, err := ft.GrepSearch(req)
		if err != nil {
			return nil, err
		}

		// Return the actual search results in JSON format
		resultJSON, _ := json.Marshal(result)

		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: string(resultJSON),
				},
			},
			IsError: false,
		}, nil
	}
}

func (ft *FileTools) CreateFileSearchHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req FileSearchRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}

		result, err := ft.FileSearch(req)
		if err != nil {
			return nil, err
		}

		// Return the actual file list in JSON format
		resultJSON, _ := json.Marshal(result)

		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: string(resultJSON),
				},
			},
			IsError: false,
		}, nil
	}
}

func (ft *FileTools) CreateListDirHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req ListDirRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}

		result, err := ft.ListDir(req)
		if err != nil {
			return nil, err
		}

		// Return the actual directory listing in JSON format
		resultJSON, _ := json.Marshal(result)

		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: string(resultJSON),
				},
			},
			IsError: false,
		}, nil
	}
}

func mapToStruct(m map[string]any, v interface{}) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}

// Executor functions for OpenAI tool calling
func (ft *FileTools) createReadFileExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		var req ReadFileRequest
		if err := mapToStruct(params, &req); err != nil {
			return "", err
		}

		result, err := ft.ReadFile(req)
		if err != nil {
			return "", err
		}

		return result.Content, nil
	}
}

func (ft *FileTools) createReplaceStringExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		var req ReplaceStringRequest
		if err := mapToStruct(params, &req); err != nil {
			return "", err
		}

		result, err := ft.ReplaceString(req)
		if err != nil {
			return "", err
		}

		return fmt.Sprintf("Successfully replaced string in %s at position %d", result.FilePath, result.ReplacedAt), nil
	}
}

func (ft *FileTools) createCreateFileExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		var req CreateFileRequest
		if err := mapToStruct(params, &req); err != nil {
			return "", err
		}

		result, err := ft.CreateFile(req)
		if err != nil {
			return "", err
		}

		action := "Updated"
		if result.Created {
			action = "Created"
		}

		return fmt.Sprintf("%s file %s", action, result.FilePath), nil
	}
}

func (ft *FileTools) createGrepSearchExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		var req GrepSearchRequest
		if err := mapToStruct(params, &req); err != nil {
			return "", err
		}

		result, err := ft.GrepSearch(req)
		if err != nil {
			return "", err
		}

		resultJSON, _ := json.Marshal(result)
		return string(resultJSON), nil
	}
}

func (ft *FileTools) createFileSearchExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		var req FileSearchRequest
		if err := mapToStruct(params, &req); err != nil {
			return "", err
		}

		result, err := ft.FileSearch(req)
		if err != nil {
			return "", err
		}

		resultJSON, _ := json.Marshal(result)
		return string(resultJSON), nil
	}
}

func (ft *FileTools) createListDirExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		var req ListDirRequest
		if err := mapToStruct(params, &req); err != nil {
			return "", err
		}

		result, err := ft.ListDir(req)
		if err != nil {
			return "", err
		}

		resultJSON, _ := json.Marshal(result)
		return string(resultJSON), nil
	}
}
