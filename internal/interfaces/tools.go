package interfaces

import (
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/modelcontextprotocol/go-sdk/jsonschema"
)

// ToolRegistrar defines the interface for registering tools
type ToolRegistrar interface {
	RegisterMCPTool(name, description string, handler mcp.ToolHandler, schema *jsonschema.Schema)
	RegisterOpenAITool(name, description string, schema *jsonschema.Schema, executor func(params map[string]interface{}) (string, error))
}

// ToolProvider defines the interface for tool providers
type ToolProvider interface {
	Register(registrar ToolRegistrar)
}