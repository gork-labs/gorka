package exec

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"gorka/internal/interfaces"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/modelcontextprotocol/go-sdk/jsonschema"
)

type ExecTools struct {
	workspaceRoot string
}

type ExecRequest struct {
	Command string            `json:"command"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
	WorkDir string            `json:"work_dir,omitempty"`
	Timeout int               `json:"timeout,omitempty"` // seconds
}

type ExecResponse struct {
	Success    bool   `json:"success"`
	ExitCode   int    `json:"exit_code"`
	Stdout     string `json:"stdout"`
	Stderr     string `json:"stderr"`
	Command    string `json:"command"`
	WorkDir    string `json:"work_dir"`
	Duration   string `json:"duration"`
	TimedOut   bool   `json:"timed_out"`
}

func NewExecTools(workspaceRoot string) *ExecTools {
	return &ExecTools{
		workspaceRoot: workspaceRoot,
	}
}

// Register implements the interfaces.ToolProvider interface
func (et *ExecTools) Register(registrar interfaces.ToolRegistrar) {
	execSchema := &jsonschema.Schema{
		Type: "object",
		Properties: map[string]*jsonschema.Schema{
			"command": {
				Type:        "string",
				Description: "Command to execute",
			},
			"args": {
				Type:        "array",
				Description: "Command arguments",
				Items: &jsonschema.Schema{
					Type: "string",
				},
			},
			"env": {
				Type:        "object",
				Description: "Environment variables to set",
				AdditionalProperties: &jsonschema.Schema{
					Type: "string",
				},
			},
			"work_dir": {
				Type:        "string",
				Description: "Working directory (relative to workspace root)",
			},
			"timeout": {
				Type:        "integer",
				Description: "Timeout in seconds (default: 30)",
				Default:     json.RawMessage("30"),
			},
		},
		Required: []string{"command"},
	}
	
	// Register exec for both MCP and OpenAI usage
	registrar.RegisterMCPTool("exec", "Execute system commands with timeout and environment control", et.CreateExecHandler(), execSchema)
	registrar.RegisterOpenAITool("exec", "Execute system commands with timeout and environment control", execSchema, et.createExecExecutor())
}

func (et *ExecTools) validateWorkDir(workDir string) (string, error) {
	if workDir == "" {
		return et.workspaceRoot, nil
	}
	
	if !filepath.IsAbs(workDir) {
		workDir = filepath.Join(et.workspaceRoot, workDir)
	}

	absPath, err := filepath.Abs(workDir)
	if err != nil {
		return "", err
	}

	absWorkspace, err := filepath.Abs(et.workspaceRoot)
	if err != nil {
		return "", err
	}

	if !strings.HasPrefix(absPath, absWorkspace) {
		return "", fmt.Errorf("work directory outside workspace: %s", workDir)
	}

	return absPath, nil
}

func (et *ExecTools) ExecuteCommand(req ExecRequest) (*ExecResponse, error) {
	// Validate and resolve work directory
	workDir, err := et.validateWorkDir(req.WorkDir)
	if err != nil {
		return nil, err
	}

	// Create command
	cmd := exec.Command(req.Command, req.Args...)
	cmd.Dir = workDir

	// Set environment variables
	cmd.Env = os.Environ()
	if req.Env != nil {
		for key, value := range req.Env {
			cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
		}
	}

	// Set timeout (default 30 seconds)
	timeout := time.Duration(req.Timeout) * time.Second
	if timeout <= 0 {
		timeout = 30 * time.Second
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd = exec.CommandContext(ctx, req.Command, req.Args...)
	cmd.Dir = workDir
	cmd.Env = os.Environ()
	if req.Env != nil {
		for key, value := range req.Env {
			cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
		}
	}

	start := time.Now()
	
	// Capture output
	stdout, err := cmd.Output()
	duration := time.Since(start)
	
	var stderr []byte
	var exitCode int
	var timedOut bool
	
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			timedOut = true
			exitCode = -1
		} else if exitError, ok := err.(*exec.ExitError); ok {
			stderr = exitError.Stderr
			exitCode = exitError.ExitCode()
		} else {
			return nil, fmt.Errorf("failed to execute command: %w", err)
		}
	}

	cmdStr := req.Command
	if len(req.Args) > 0 {
		cmdStr += " " + strings.Join(req.Args, " ")
	}

	return &ExecResponse{
		Success:    exitCode == 0 && !timedOut,
		ExitCode:   exitCode,
		Stdout:     string(stdout),
		Stderr:     string(stderr),
		Command:    cmdStr,
		WorkDir:    workDir,
		Duration:   duration.String(),
		TimedOut:   timedOut,
	}, nil
}

func (et *ExecTools) CreateExecHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req ExecRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}
		
		result, err := et.ExecuteCommand(req)
		if err != nil {
			return nil, err
		}
		
		// Return the complete execution result in JSON format
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

// Executor function for OpenAI tool calling
func (et *ExecTools) createExecExecutor() func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		var req ExecRequest
		if err := mapToStruct(params, &req); err != nil {
			return "", err
		}
		
		result, err := et.ExecuteCommand(req)
		if err != nil {
			return "", err
		}
		
		resultJSON, _ := json.Marshal(result)
		return string(resultJSON), nil
	}
}