---
target_execution: "llm_agent_implementation"
implementation_domain: "go_mcp_server"
---

# GO MCP SERVER IMPLEMENTATION

## MAIN_ENTRY_POINT

File: `cmd/main.go`

```go
package main

import (
	"context"
	"log"
	"os"

	"gorka/internal/behavioral"
	"gorka/internal/mcp"
	"github.com/modelcontextprotocol/go-sdk/pkg/server"
	"github.com/modelcontextprotocol/go-sdk/pkg/transport/stdio"
)

func main() {
	engine := behavioral.NewEngine()

	mcpServer := mcp.NewServer(engine)

	transport := stdio.NewTransport(os.Stdin, os.Stdout)

	srv := server.New(mcpServer, transport)

	if err := srv.Serve(context.Background()); err != nil {
		log.Fatal(err)
	}
}
```

## BEHAVIORAL_ENGINE

File: `internal/behavioral/engine.go`

```go
package behavioral

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Engine struct {
	matrices map[string]*BehavioralMatrix
}

type BehavioralMatrix struct {
	AgentID     string                 `json:"agent_id"`
	MCPTool     string                 `json:"mcp_tool"`
	VSCodeMode  string                 `json:"vscode_chatmode"`
	Algorithm   map[string]interface{} `json:"algorithm"`
}

type BehavioralRequest struct {
	AgentID         string                 `json:"agent_id"`
	InputParameters map[string]interface{} `json:"input_parameters"`
	ExecutionContext map[string]interface{} `json:"execution_context"`
}

type BehavioralResult struct {
	AgentID         string                 `json:"agent_id"`
	OutputData      map[string]interface{} `json:"output_data"`
	ExecutionMeta   map[string]interface{} `json:"execution_metadata"`
	QualityScore    float64               `json:"quality_score"`
}

func NewEngine() *Engine {
	return &Engine{
		matrices: make(map[string]*BehavioralMatrix),
	}
}

func (e *Engine) LoadBehavioralMatrices() error {
	specDir := "internal/behavioral-specs"

	files, err := filepath.Glob(filepath.Join(specDir, "*.json"))
	if err != nil {
		return err
	}

	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return err
		}

		var matrix BehavioralMatrix
		if err := json.Unmarshal(data, &matrix); err != nil {
			return err
		}

		e.matrices[matrix.AgentID] = &matrix
	}

	return nil
}

func (e *Engine) ExecuteBehavioralMatrix(req *BehavioralRequest) (*BehavioralResult, error) {
	matrix, exists := e.matrices[req.AgentID]
	if !exists {
		return nil, fmt.Errorf("behavioral matrix not found: %s", req.AgentID)
	}

	// Execute behavioral algorithm
	result := &BehavioralResult{
		AgentID: req.AgentID,
		OutputData: make(map[string]interface{}),
		ExecutionMeta: map[string]interface{}{
			"matrix_version": "1.0",
			"execution_mode": "mcp_server",
		},
		QualityScore: 0.85,
	}

	// Process algorithm steps
	if algorithm, ok := matrix.Algorithm["steps"].([]interface{}); ok {
		for _, step := range algorithm {
			if stepMap, ok := step.(map[string]interface{}); ok {
				action := stepMap["action"].(string)
				result.OutputData[action] = "executed"
			}
		}
	}

	return result, nil
}

func (e *Engine) GetAvailableAgents() []string {
	agents := make([]string, 0, len(e.matrices))
	for agentID := range e.matrices {
		agents = append(agents, agentID)
	}
	return agents
}
```

## MCP_SERVER_IMPLEMENTATION

File: `internal/mcp/server.go`

```go
package mcp

import (
	"context"
	"encoding/json"

	"gorka/internal/behavioral"
	"github.com/modelcontextprotocol/go-sdk/pkg/protocol"
)

type Server struct {
	engine *behavioral.Engine
}

func NewServer(engine *behavioral.Engine) *Server {
	return &Server{engine: engine}
}

func (s *Server) Initialize(ctx context.Context, req *protocol.InitializeRequest) (*protocol.InitializeResult, error) {
	if err := s.engine.LoadBehavioralMatrices(); err != nil {
		return nil, err
	}

	return &protocol.InitializeResult{
		ProtocolVersion: "2024-11-05",
		Capabilities: protocol.ServerCapabilities{
			Tools: &protocol.ToolsCapability{},
		},
		ServerInfo: protocol.ServerInfo{
			Name:    "gorka-behavioral-server",
			Version: "1.0.0",
		},
	}, nil
}

func (s *Server) ListTools(ctx context.Context, req *protocol.ListToolsRequest) (*protocol.ListToolsResult, error) {
	tools := []protocol.Tool{
		{
			Name:        "spawn_behavioral_agents",
			Description: "Execute project orchestrator behavioral matrix",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"task_specification": {"type": "string"},
					"complexity_level":    {"type": "string"},
					"context_data":       {"type": "object"},
				},
			},
		},
		{
			Name:        "execute_implementation_behavioral_matrix",
			Description: "Execute software engineer behavioral matrix",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"implementation_specification": {"type": "object"},
					"technical_context":           {"type": "object"},
					"quality_requirements":        {"type": "object"},
				},
			},
		},
		{
			Name:        "execute_security_behavioral_matrix",
			Description: "Execute security engineer behavioral matrix",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"security_analysis_target": {"type": "object"},
					"analysis_scope":          {"type": "string"},
					"context_data":           {"type": "object"},
				},
			},
		},
	}

	return &protocol.ListToolsResult{Tools: tools}, nil
}

func (s *Server) CallTool(ctx context.Context, req *protocol.CallToolRequest) (*protocol.CallToolResult, error) {
	var agentID string

	switch req.Name {
	case "spawn_behavioral_agents":
		agentID = "project_orchestrator"
	case "execute_implementation_behavioral_matrix":
		agentID = "software_engineer"
	case "execute_security_behavioral_matrix":
		agentID = "security_engineer"
	default:
		return nil, protocol.NewError(protocol.InvalidRequest, "unknown tool")
	}

	behavioralReq := &behavioral.BehavioralRequest{
		AgentID:          agentID,
		InputParameters:  req.Arguments,
		ExecutionContext: map[string]interface{}{},
	}

	result, err := s.engine.ExecuteBehavioralMatrix(behavioralReq)
	if err != nil {
		return nil, err
	}

	resultJSON, _ := json.Marshal(result)

	return &protocol.CallToolResult{
		Content: []protocol.Content{
			{
				Type: "text",
				Text: string(resultJSON),
			},
		},
	}, nil
}
```

## MCP_TOOL_HANDLERS

File: `internal/mcp/tools.go`

```go
package mcp

import (
	"gorka/internal/behavioral"
	"github.com/modelcontextprotocol/go-sdk/pkg/protocol"
)

type ToolDefinition struct {
	Name        string
	Description string
	AgentID     string
	InputSchema map[string]interface{}
}

var BehavioralToolDefinitions = []ToolDefinition{
	{
		Name:        "spawn_behavioral_agents",
		Description: "Execute project orchestrator behavioral matrix",
		AgentID:     "project_orchestrator",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"task_specification": {"type": "string"},
				"complexity_level":    {"type": "string"},
				"context_data":       {"type": "object"},
			},
			"required": []string{"task_specification"},
		},
	},
	{
		Name:        "execute_implementation_behavioral_matrix",
		Description: "Execute software engineer behavioral matrix",
		AgentID:     "software_engineer",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"implementation_specification": {"type": "object"},
				"technical_context":           {"type": "object"},
				"quality_requirements":        {"type": "object"},
			},
			"required": []string{"implementation_specification"},
		},
	},
	{
		Name:        "execute_security_behavioral_matrix",
		Description: "Execute security engineer behavioral matrix",
		AgentID:     "security_engineer",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"security_analysis_target": {"type": "object"},
				"analysis_scope":          {"type": "string"},
				"context_data":           {"type": "object"},
			},
			"required": []string{"security_analysis_target"},
		},
	},
}

func ConvertToProtocolTools(definitions []ToolDefinition) []protocol.Tool {
	tools := make([]protocol.Tool, len(definitions))
	for i, def := range definitions {
		tools[i] = protocol.Tool{
			Name:        def.Name,
			Description: def.Description,
			InputSchema: def.InputSchema,
		}
	}
	return tools
}
```

## GO_MODULE_BUILD

```bash
go build -o gorka-server cmd/main.go
```

## SERVER_EXECUTION_TEST

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}' | ./gorka-server
```
