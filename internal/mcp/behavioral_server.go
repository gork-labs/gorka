package mcp

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

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

	// Use workspace from config
	workspaceRoot := config.Workspace

	// Set up storage directory
	storageDir := filepath.Join(workspaceRoot, ".gorka", "storage")
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		fmt.Printf("Warning: Failed to create storage directory: %v\n", err)
	}

	// Initialize tools manager
	toolsManager := tools.NewToolsManager(workspaceRoot, storageDir)

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
		
		mcp.AddTool(bs.server, tool, handler)
		fmt.Printf("DEBUG: Registered tool: %s -> %s\n", toolDef.Name, toolDef.AgentID)
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
