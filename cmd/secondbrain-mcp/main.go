package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"gorka/internal/behavioral"
	"gorka/internal/mcp"
	"gorka/internal/utils"

	"github.com/subosito/gotenv"
)

func main() {
	// Load environment variables from .env file in development
	if err := gotenv.Load(); err != nil {
		// .env file is optional, so we only log if there's an error loading it
		// (file not found is not an error, but invalid format would be)
		if !os.IsNotExist(err) {
			log.Printf("Warning: Error loading .env file: %v", err)
		}
	}

	// Load and validate configuration
	config, err := utils.LoadConfig()
	if err != nil {
		log.Fatalf("Configuration loading failed: %v", err)
	}

	// Log configuration (without sensitive data)
	fmt.Fprintf(os.Stderr, "Configuration loaded:\n")
	fmt.Fprintf(os.Stderr, "  Model: %s\n", config.Model)
	fmt.Fprintf(os.Stderr, "  Workspace: %s\n", config.Workspace)
	fmt.Fprintf(os.Stderr, "  Max Parallel Agents: %d\n", config.MaxParallelAgents)
	fmt.Fprintf(os.Stderr, "  Log Level: %s\n", config.LogLevel)
	fmt.Fprintf(os.Stderr, "  Request Timeout: %ds\n", config.RequestTimeout)
	fmt.Fprintf(os.Stderr, "  Max Context Size: %d\n", config.MaxContextSize)
	fmt.Fprintf(os.Stderr, "  OpenRouter Base URL: %s\n", config.OpenRouterBaseURL)

	// Create behavioral engine
	engine := behavioral.NewEngine()

	// Create behavioral MCP server
	server := mcp.NewBehavioralServer(engine, config)

	fmt.Fprintf(os.Stderr, "Starting Gorka Behavioral MCP server...\n")

	// Start the server (this will block)
	ctx := context.Background()
	if err := server.Start(ctx); err != nil {
		log.Fatalf("MCP server failed: %v", err)
	}
}
