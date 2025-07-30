package mcp

import (
	"context"
	"encoding/json"

	"gorka/internal/behavioral"
	"gorka/internal/types"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ToolDefinition struct {
	Name        string
	Description string
	AgentID     string
}

var BehavioralToolDefinitions = []ToolDefinition{
	{
		Name:        "spawn_behavioral_agents",
		Description: "Execute project orchestrator behavioral matrix",
		AgentID:     "project_orchestrator",
	},
	{
		Name:        "execute_implementation_behavioral_matrix",
		Description: "Execute software engineer behavioral matrix",
		AgentID:     "software_engineer",
	},
	{
		Name:        "execute_security_behavioral_matrix",
		Description: "Execute security engineer behavioral matrix",
		AgentID:     "security_engineer",
	},
}

// Tool handler for behavioral matrix execution
func CreateBehavioralToolHandler(engine *behavioral.Engine, agentID string) mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		// Convert map[string]any to map[string]interface{}
		inputParams := make(map[string]interface{})
		for k, v := range params.Arguments {
			inputParams[k] = v
		}

		behavioralReq := &types.BehavioralRequest{
			AgentID:          agentID,
			InputParameters:  inputParams,
			ExecutionContext: map[string]interface{}{},
		}

		result, err := engine.ExecuteBehavioralMatrix(behavioralReq)
		if err != nil {
			return nil, err
		}

		resultJSON, _ := json.Marshal(result)

		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{Text: string(resultJSON)},
			},
		}, nil
	}
}

// CreateBehavioralToolWithSchema creates a behavioral tool with extracted input schema
func CreateBehavioralToolWithSchema(engine *behavioral.Engine, toolDef ToolDefinition) (*mcp.Tool, mcp.ToolHandler, error) {
	// Get the behavioral matrix to extract schema
	matrices := engine.GetBehavioralMatrices()
	matrix, exists := matrices[toolDef.AgentID]
	if !exists {
		// Return tool without schema if matrix not found
		tool := &mcp.Tool{
			Name:        toolDef.Name,
			Description: toolDef.Description,
		}
		handler := CreateBehavioralToolHandler(engine, toolDef.AgentID)
		return tool, handler, nil
	}
	
	// Extract input schema from behavioral matrix
	inputSchema, err := types.ExtractInputSchema(matrix)
	if err != nil {
		// Return tool without schema if extraction fails
		tool := &mcp.Tool{
			Name:        toolDef.Name,
			Description: toolDef.Description,
		}
		handler := CreateBehavioralToolHandler(engine, toolDef.AgentID)
		return tool, handler, nil
	}
	
	// Create tool with extracted schema
	tool := &mcp.Tool{
		Name:        toolDef.Name,
		Description: toolDef.Description,
		InputSchema: inputSchema,
	}
	
	handler := CreateBehavioralToolHandler(engine, toolDef.AgentID)
	return tool, handler, nil
}
