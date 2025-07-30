package mcp

import (
	"context"
	"fmt"

	"gorka/internal/behavioral"
	"gorka/internal/tools"
	"gorka/internal/utils"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type BehavioralServer struct {
	engine       *behavioral.Engine
	server       *mcp.Server
	toolsManager *tools.ToolsManager
}

func NewBehavioralServer(engine *behavioral.Engine, config *utils.Config) *BehavioralServer {
	// Create the MCP server with implementation info
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "gorka-behavioral-server",
		Version: "1.0.0",
	}, nil)

	// Use the engine's existing tools manager instead of creating a new one
	toolsManager := engine.GetToolsManager()

	bs := &BehavioralServer{
		engine:       engine,
		server:       server,
		toolsManager: toolsManager,
	}

	if err := bs.engine.LoadBehavioralMatrices(); err != nil {
		panic(fmt.Sprintf("Failed to load behavioral matrices: %v", err))
	}

	bs.setupTools()

	return bs
}

func (bs *BehavioralServer) setupTools() {
	if err := bs.toolsManager.RegisterAllTools(bs.server); err != nil {
		fmt.Printf("Warning: Failed to register core tools: %v\n", err)
	}

	// Load behavioral tool definitions dynamically
	toolDefinitions, err := LoadBehavioralToolDefinitions()
	if err != nil {
		fmt.Printf("ERROR: Failed to load behavioral tool definitions: %v\n", err)
		return
	}

	fmt.Printf("DEBUG: Loaded %d behavioral tool definitions\n", len(toolDefinitions))
	
	for _, toolDef := range toolDefinitions {
		tool, handler, err := CreateBehavioralToolWithSchema(bs.engine, toolDef)
		if err != nil {
			fmt.Printf("Warning: Failed to create behavioral tool %s: %v\n", toolDef.Name, err)
			continue
		}
		
		// Register to MCP server (existing behavior)
		mcp.AddTool(bs.server, tool, handler)
		
		// Register to OpenAI tool system so agents can access it
		bs.toolsManager.RegisterOpenAITool(
			tool.Name,
			tool.Description,
			tool.InputSchema,
			CreateBehavioralOpenAIExecutor(bs.engine, toolDef.AgentID),
		)
		
		fmt.Printf("DEBUG: Registered tool to both MCP and OpenAI: %s -> %s\n", toolDef.Name, toolDef.AgentID)
	}
}

func (bs *BehavioralServer) Start(ctx context.Context) error {
	transport := mcp.NewStdioTransport()

	session, err := bs.server.Connect(ctx, transport)
	if err != nil {
		return fmt.Errorf("failed to connect server: %w", err)
	}

	session.Wait()
	return nil
}
