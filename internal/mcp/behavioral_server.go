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

	// Add all tools
	bs.setupTools()

	return bs
}

func (bs *BehavioralServer) setupTools() {
	// Register core tools (file, knowledge, thinking)
	if err := bs.toolsManager.RegisterAllTools(bs.server); err != nil {
		fmt.Printf("Warning: Failed to register core tools: %v\n", err)
	}

	// Add behavioral matrix tools
	for _, toolDef := range BehavioralToolDefinitions {
		tool := &mcp.Tool{
			Name:        toolDef.Name,
			Description: toolDef.Description,
		}

		handler := CreateBehavioralToolHandler(bs.engine, toolDef.AgentID)
		mcp.AddTool(bs.server, tool, handler)
	}
}

func (bs *BehavioralServer) Start(ctx context.Context) error {
	// Load behavioral matrices
	if err := bs.engine.LoadBehavioralMatrices(); err != nil {
		return fmt.Errorf("failed to load behavioral matrices: %w", err)
	}

	// Create stdio transport
	transport := mcp.NewStdioTransport()

	// Connect server to transport
	session, err := bs.server.Connect(ctx, transport)
	if err != nil {
		return fmt.Errorf("failed to connect server: %w", err)
	}

	// Wait for session to complete
	session.Wait()
	return nil
}
