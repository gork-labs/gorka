package file

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

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
	Success     bool   `json:"success"`
	FilePath    string `json:"filePath"`
	ReplacedAt  int    `json:"replacedAt"`
	OldContent  string `json:"oldContent"`
	NewContent  string `json:"newContent"`
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
	FilePath    string `json:"filePath"`
	LineNumber  int    `json:"lineNumber"`
	Line        string `json:"line"`
	MatchStart  int    `json:"matchStart"`
	MatchEnd    int    `json:"matchEnd"`
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

	err = filepath.WalkDir(ft.workspaceRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() {
			return nil
		}

		if len(matches) >= maxResults {
			return nil
		}

		relPath, _ := filepath.Rel(ft.workspaceRoot, path)

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
