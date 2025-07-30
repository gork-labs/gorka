package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"

	"gorka/internal/behavioral"
	"gorka/internal/embedded"
	"gorka/internal/types"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ToolDefinition struct {
	Name        string
	Description string
	AgentID     string
}

// LoadBehavioralToolDefinitions dynamically loads tool definitions from embedded behavioral specs
func LoadBehavioralToolDefinitions() ([]ToolDefinition, error) {
	var toolDefinitions []ToolDefinition

	// Read all behavioral spec files from embedded resources
	entries, err := embedded.BehavioralSpecsFS.ReadDir("embedded-resources/behavioral-specs")
	if err != nil {
		return nil, fmt.Errorf("failed to read behavioral specs directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			data, err := embedded.BehavioralSpecsFS.ReadFile("embedded-resources/behavioral-specs/" + entry.Name())
			if err != nil {
				fmt.Printf("WARNING: Failed to read behavioral spec %s: %v\n", entry.Name(), err)
				continue
			}

			var matrix types.BehavioralMatrix
			if err := json.Unmarshal(data, &matrix); err != nil {
				fmt.Printf("WARNING: Failed to unmarshal behavioral spec %s: %v\n", entry.Name(), err)
				continue
			}

			// Create tool definition from behavioral matrix
			toolDef := ToolDefinition{
				Name:        matrix.MCPTool,
				Description: fmt.Sprintf("Execute %s behavioral matrix", strings.ReplaceAll(matrix.AgentID, "_", " ")),
				AgentID:     matrix.AgentID,
			}

			toolDefinitions = append(toolDefinitions, toolDef)
		}
	}

	if len(toolDefinitions) == 0 {
		return nil, fmt.Errorf("no valid behavioral tool definitions found")
	}

	return toolDefinitions, nil
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

		// Return raw JSON for LLM-to-LLM communication
		resultJSON, _ := json.Marshal(result)
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{Text: string(resultJSON)},
			},
		}, nil
	}
}

// CreateBehavioralOpenAIExecutor creates an OpenAI executor function for behavioral tools
func CreateBehavioralOpenAIExecutor(engine *behavioral.Engine, agentID string) func(params map[string]interface{}) (string, error) {
	return func(params map[string]interface{}) (string, error) {
		behavioralReq := &types.BehavioralRequest{
			AgentID:          agentID,
			InputParameters:  params,
			ExecutionContext: map[string]interface{}{},
		}

		result, err := engine.ExecuteBehavioralMatrix(behavioralReq)
		if err != nil {
			return "", err
		}

		// Return raw JSON for LLM-to-LLM communication
		resultJSON, err := json.Marshal(result)
		if err != nil {
			return "", fmt.Errorf("failed to marshal behavioral result: %w", err)
		}
		
		return string(resultJSON), nil
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

// isVSCodeChatmodeContext detects if the tool is being called from VSCode chatmode
func isVSCodeChatmodeContext(arguments map[string]any) bool {
	// Check for VSCode-specific patterns in the arguments
	if taskSpec, ok := arguments["task_specification"].(string); ok {
		// VSCode chatmode typically has longer, more descriptive task specifications
		return len(taskSpec) > 100
	}
	// Could also check for other VSCode-specific markers
	return false
}

// formatForVSCodeChatmode creates user-friendly output for VSCode users
func formatForVSCodeChatmode(result *types.BehavioralResult, agentID string) string {
	var output strings.Builder

	// Agent identification
	output.WriteString(fmt.Sprintf("## %s Analysis Complete\n\n", strings.Title(strings.ReplaceAll(agentID, "_", " "))))

	// Extract key insights
	if outputData, ok := result.OutputData["work_results"].(map[string]interface{}); ok {
		// For project orchestrator, show coordination results
		if agentID == "project_orchestrator" {
			if coordResult, ok := outputData["coordinated_result"].(map[string]interface{}); ok {
				output.WriteString("### Coordination Summary\n")
				if status, ok := coordResult["coordination_status"].(string); ok {
					output.WriteString(fmt.Sprintf("**Status**: %s\n", status))
				}
				if agentsExecuted, ok := coordResult["agents_executed"].(int); ok {
					output.WriteString(fmt.Sprintf("**Agents Coordinated**: %d\n", agentsExecuted))
				}
				if summary, ok := coordResult["synthesis_summary"].(string); ok {
					output.WriteString(fmt.Sprintf("**Summary**: %s\n\n", summary))
				}
			}

			// Show agent contributions
			if contributions, ok := outputData["agent_contributions"].([]interface{}); ok {
				output.WriteString("### Specialist Agent Results\n")
				for i, contrib := range contributions {
					if contribMap, ok := contrib.(map[string]interface{}); ok {
						if agentID, ok := contribMap["agent_id"].(string); ok {
							if status, ok := contribMap["status"].(string); ok {
								output.WriteString(fmt.Sprintf("%d. **%s**: %s\n", i+1,
									strings.Title(strings.ReplaceAll(agentID, "_", " ")), status))
							}
						}
					}
				}
				output.WriteString("\n")
			}
		} else {
			// For specialist agents, show their specific results
			if summary, ok := outputData["summary"].(string); ok {
				output.WriteString(fmt.Sprintf("### Analysis Summary\n%s\n\n", summary))
			}

			if actions, ok := outputData["actions_taken"].([]interface{}); ok {
				output.WriteString("### Actions Performed\n")
				for i, action := range actions {
					if actionStr, ok := action.(string); ok {
						output.WriteString(fmt.Sprintf("%d. %s\n", i+1, actionStr))
					}
				}
				output.WriteString("\n")
			}
		}
	}

	// Show execution metadata
	if execMeta, ok := result.ExecutionMeta["execution_mode"].(string); ok {
		output.WriteString(fmt.Sprintf("*Execution Mode*: %s\n", execMeta))
	}
	if model, ok := result.OutputData["model_used"].(string); ok {
		output.WriteString(fmt.Sprintf("*Model Used*: %s\n", model))
	}
	if tokens, ok := result.OutputData["tokens_used"].(int); ok {
		output.WriteString(fmt.Sprintf("*Tokens Used*: %d\n", tokens))
	}

	return output.String()
}
