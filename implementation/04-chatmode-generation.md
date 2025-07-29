---
target_execution: "llm_agent_implementation"
implementation_domain: "chatmode_generation"
---

# CHATMODE GENERATION IMPLEMENTATION

## ARCHITECTURAL_PRINCIPLE_CORRECTION

**CRITICAL ARCHITECTURE FIX:**

The chatmode generator must NOT depend on OpenRouter AgentSpawner. This creates a circular dependency and violates the single source of truth principle.

**CORRECT ARCHITECTURE:**
```
JSON Behavioral Specs (source of truth)
    ↓
Shared Behavioral Processing (internal/behavioral/prompt_builder.go)
    ↓
    ├── Chatmode Generator (standalone, no OpenRouter dependency)
    └── OpenRouter AgentSpawner (uses shared behavioral processing)
```

**KEY PRINCIPLES:**
1. **Single Source of Truth**: JSON behavioral matrices are authoritative
2. **Shared Processing Logic**: Both chatmode generation and agent spawning use identical behavioral processing
3. **No Circular Dependencies**: Chatmode generator works offline without OpenRouter
4. **Consistency Guarantee**: Same system prompts across all deployment modes via shared processing
5. **Centralized Go Embed Architecture**: All resources loaded via centralized internal/embedded package

## CENTRALIZED_EMBEDDED_ARCHITECTURE

**CRITICAL**: All file loading must use centralized go:embed from internal/embedded package.

```go
// File: internal/embedded/instructions.go
package embedded

import "embed"

//go:embed ../embedded-resources/instructions/*.md
var InstructionsFS embed.FS

// File: internal/embedded/behavioral_specs.go  
package embedded

import "embed"

//go:embed ../embedded-resources/behavioral-specs/*.json
var BehavioralSpecsFS embed.FS

// File: internal/embedded/templates.go
package embedded

import "embed"

//go:embed ../generation/chatmode-templates/*.tmpl
var ChatmodeTemplatesFS embed.FS
```

```go
// File: internal/behavioral/prompt_builder.go
package behavioral

import (
	"encoding/json"
	"fmt"
	"strings"
	
	"gorka/internal/embedded"
)

// LoadCoreSystemPrinciples loads instructions using centralized embedded package
func LoadCoreSystemPrinciples() (string, error) {
	// Browse all instruction files dynamically from centralized embedded package
	entries, err := embedded.InstructionsFS.ReadDir("../embedded-resources/instructions")
	if err != nil {
		return "", fmt.Errorf("failed to read instructions directory: %w", err)
	}
	
	// Find CORE_SYSTEM_PRINCIPLES file dynamically
	for _, entry := range entries {
		if strings.Contains(entry.Name(), "CORE_SYSTEM_PRINCIPLES") && strings.HasSuffix(entry.Name(), ".md") {
			content, err := embedded.InstructionsFS.ReadFile("../embedded-resources/instructions/" + entry.Name())
			if err != nil {
				return "", fmt.Errorf("failed to read core principles: %w", err)
			}
			return string(content), nil
		}
	}
	
	return "", fmt.Errorf("CORE_SYSTEM_PRINCIPLES file not found in embedded instructions")
}

// GetBehavioralMatrixFromEmbedded loads behavioral specs using centralized embedded package
func GetBehavioralMatrixFromEmbedded(agentID string) (*BehavioralMatrix, error) {
	// Browse all behavioral spec files dynamically from centralized embedded package
	entries, err := embedded.BehavioralSpecsFS.ReadDir("../embedded-resources/behavioral-specs")
	if err != nil {
		return nil, fmt.Errorf("failed to read behavioral specs directory: %w", err)
	}
	
	// Find matching behavioral spec file dynamically
	for _, entry := range entries {
		if strings.Contains(entry.Name(), agentID) && strings.HasSuffix(entry.Name(), ".json") {
			content, err := embedded.BehavioralSpecsFS.ReadFile("../embedded-resources/behavioral-specs/" + entry.Name())
			if err != nil {
				return nil, fmt.Errorf("failed to read behavioral spec: %w", err)
			}
			
			var matrix BehavioralMatrix
			if err := json.Unmarshal(content, &matrix); err != nil {
				return nil, fmt.Errorf("failed to parse behavioral matrix: %w", err)
			}
			return &matrix, nil
		}
	}
	
	return nil, fmt.Errorf("behavioral matrix for agent %s not found", agentID)
}
```

```go
// File: internal/generation/generator.go  
package generation

import (
	"text/template"
	
	"gorka/internal/embedded"
)

// loadTemplates loads chatmode templates using centralized embedded package
func (g *ChatmodeGenerator) loadTemplates() error {
	// Load embedded default template from centralized embedded package
	templateContent, err := embedded.ChatmodeTemplatesFS.ReadFile("../generation/chatmode-templates/default.tmpl")
	if err != nil {
		return fmt.Errorf("failed to load embedded default template: %w", err)
	}

	tmpl, err := template.New("default").Parse(string(templateContent))
	if err != nil {
		return fmt.Errorf("failed to parse default template: %w", err)
	}
	g.templates["default"] = tmpl

	return nil
}
```

## STANDALONE_GENERATOR_ARCHITECTURE

File: `cmd/secondbrain-gen/main.go`

```go
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"gorka/internal/generation"
)

func main() {
	var (
		inputDir   = flag.String("input", "internal/embedded-resources/behavioral-specs", "Directory containing behavioral matrix JSON files")
		outputDir  = flag.String("output", "internal/embedded-resources/chatmodes", "Directory to write generated chatmode files")
		template   = flag.String("template", "", "Custom template file (uses embedded template if not specified)")
		verbose    = flag.Bool("verbose", false, "Enable verbose output")
		validate   = flag.Bool("validate", true, "Validate generated chatmodes")
		help       = flag.Bool("help", false, "Show help")
	)

	flag.StringVar(inputDir, "i", *inputDir, "Directory containing behavioral matrix JSON files (short)")
	flag.StringVar(outputDir, "o", *outputDir, "Directory to write generated chatmode files (short)")
	flag.StringVar(template, "t", *template, "Custom template file (short)")
	flag.BoolVar(verbose, "v", *verbose, "Enable verbose output (short)")

	flag.Parse()

	if *help {
		fmt.Println("secondbrain-gen - Generate VS Code chatmodes from behavioral matrices")
		fmt.Println("\nUsage: secondbrain-gen [flags]")
		fmt.Println("\nFlags:")
		flag.PrintDefaults()
		fmt.Println("\nExamples:")
		fmt.Println("  secondbrain-gen                                    # Use defaults")
		fmt.Println("  secondbrain-gen -i specs -o chatmodes -v          # Custom paths with verbose")
		fmt.Println("  //go:generate secondbrain-gen                     # Use in go:generate directive")
		os.Exit(0)
	}

	config := generation.Config{
		InputDir:  *inputDir,
		OutputDir: *outputDir,
		Template:  *template,
		Verbose:   *verbose,
		Validate:  *validate,
	}

	generator, err := generation.NewChatmodeGenerator(config)
	if err != nil {
		log.Fatalf("Failed to create generator: %v", err)
	}

	if err := generator.GenerateAll(); err != nil {
		log.Fatalf("Generation failed: %v", err)
	}

	if *verbose {
		fmt.Printf("Successfully generated chatmodes from %s to %s\n", *inputDir, *outputDir)
	}
}
```

## GENERATION_ENGINE

File: `internal/generation/generator.go`

```go
package generation

import (
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"log"
	"os"
	"path/filepath"
	"strings"

	"gorka/internal/embedded-resources"
	"gorka/internal/openrouter"
)

//go:embed chatmode-templates/*
var chatmodeTemplates embed.FS

## GENERATION_ENGINE

File: `internal/generation/generator.go`

```go
package generation

import (
	"encoding/json"
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"strings"

	"gorka/internal/behavioral"
)

//go:embed chatmode-templates/*
var chatmodeTemplates embed.FS

type Config struct {
	InputDir  string
	OutputDir string
	Template  string
	Verbose   bool
	Validate  bool
}

type ChatmodeGenerator struct {
	config               Config
	coreSystemPrinciples string
}

type ChatmodeData struct {
	Description        string   `json:"description"`
	Tools             []string `json:"tools"`
	BehavioralContent string   `json:"behavioral_content"`
	AgentID           string   `json:"agent_id"`
	Title             string   `json:"title"`
}

func NewChatmodeGenerator(config Config) (*ChatmodeGenerator, error) {
	// Load core system principles from shared behavioral package
	coreSystemPrinciples, err := behavioral.LoadCoreSystemPrinciples()
	if err != nil {
		return nil, fmt.Errorf("failed_to_load_core_system_principles: %w", err)
	}

	return &ChatmodeGenerator{
		config:               config,
		coreSystemPrinciples: coreSystemPrinciples,
	}, nil
}

func (g *ChatmodeGenerator) GenerateAll() error {
	if g.config.Verbose {
		fmt.Printf("Generating chatmodes from %s to %s\n", g.config.InputDir, g.config.OutputDir)
	}

	// Validate input directory
	if err := g.validateInputDir(); err != nil {
		return fmt.Errorf("input validation failed: %w", err)
	}

	// Create output directory
	if err := os.MkdirAll(g.config.OutputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Get behavioral spec files
	files, err := g.getBehavioralSpecFiles()
	if err != nil {
		return fmt.Errorf("failed to get behavioral spec files: %w", err)
	}

	// Generate chatmode for each behavioral spec
	for _, file := range files {
		if err := g.generateChatmodeFromMatrix(file); err != nil {
			return fmt.Errorf("failed to generate chatmode for %s: %w", file, err)
		}

		if g.config.Verbose {
			fmt.Printf("Generated chatmode from %s\n", file)
		}
	}

	if g.config.Validate {
		if err := g.validateGeneratedChatmodes(); err != nil {
			return fmt.Errorf("validation failed: %w", err)
		}
	}

	return nil
}

func (g *ChatmodeGenerator) generateChatmodeFromMatrix(matrixFile string) error {
	// Read behavioral matrix
	data, err := os.ReadFile(matrixFile)
	if err != nil {
		return fmt.Errorf("failed to read matrix file: %w", err)
	}

	// Parse behavioral matrix using shared behavioral package
	matrix, err := behavioral.ParseBehavioralMatrix(data)
	if err != nil {
		return fmt.Errorf("failed to parse behavioral matrix: %w", err)
	}

	// Generate behavioral content using shared behavioral processing
	// This ensures identical system prompts as OpenRouter agent spawning
	taskContext := behavioral.TaskContext{
		ExecutionMode:  "vscode_chatmode",
		ToolsAvailable: "vscode_integrated_tools",
	}

	behavioralContent, err := behavioral.BuildSystemPrompt(matrix, taskContext, g.coreSystemPrinciples)
	if err != nil {
		return fmt.Errorf("failed to generate behavioral content: %w", err)
	}

	// Create chatmode data
	chatmodeData := ChatmodeData{
		Description:       fmt.Sprintf("Behavioral agent: %s", strings.ReplaceAll(matrix.AgentID, "_", " ")),
		Tools:            matrix.BehavioralPrompt.Tools.VSCodeMode,
		BehavioralContent: behavioralContent,
		AgentID:          matrix.AgentID,
		Title:            strings.Title(strings.ReplaceAll(matrix.AgentID, "_", " ")),
	}

	// Render chatmode using specification-compliant template
	return g.renderChatmode(chatmodeData, matrix.VSCodeChatmode)
}
```

## SHARED_BEHAVIORAL_PROCESSING

File: `internal/behavioral/prompt_builder.go`

```go
package behavioral

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// BehavioralMatrix represents a behavioral specification matrix
type BehavioralMatrix struct {
	AgentID          string           `json:"agent_id"`
	MCPTool          string           `json:"mcp_tool"`
	VSCodeChatmode   string           `json:"vscode_chatmode"`
	BehavioralPrompt BehavioralPrompt `json:"behavioral_prompt"`
}

// BehavioralPrompt represents the behavioral prompt structure
type BehavioralPrompt struct {
	SystemPromptTemplate string                   `json:"system_prompt_template"`
	InputSchema         map[string]interface{}   `json:"input_schema"`
	SystemInstructions  []string                 `json:"system_instructions"`
	OutputSchema        map[string]interface{}   `json:"output_schema"`
	Tools               BehavioralTools          `json:"tools"`
}

// BehavioralTools represents the tools configuration
type BehavioralTools struct {
	MCPMode    []string `json:"mcp_mode"`
	VSCodeMode []string `json:"vscode_mode"`
}

// TaskContext represents the execution context for behavioral processing
type TaskContext struct {
	ExecutionMode  string
	ToolsAvailable string
}

// ParseBehavioralMatrix parses a behavioral matrix from JSON data
func ParseBehavioralMatrix(data []byte) (*BehavioralMatrix, error) {
	var matrix BehavioralMatrix
	if err := json.Unmarshal(data, &matrix); err != nil {
		return nil, fmt.Errorf("failed to parse behavioral matrix: %w", err)
	}
	return &matrix, nil
}

// LoadCoreSystemPrinciples loads core system principles from embedded resources
func LoadCoreSystemPrinciples() (string, error) {
	// Try multiple possible paths since the working directory may vary
	possiblePaths := []string{
		"../instructions/CORE_SYSTEM_PRINCIPLES_GORKA.instructions.md",                          // From behavioral-specs directory
		"internal/embedded-resources/instructions/CORE_SYSTEM_PRINCIPLES_GORKA.instructions.md", // From project root
		"instructions/CORE_SYSTEM_PRINCIPLES_GORKA.instructions.md",                             // From embedded-resources directory
	}
	
	for _, path := range possiblePaths {
		if data, err := os.ReadFile(path); err == nil {
			return string(data), nil
		}
	}
	
	return "", fmt.Errorf("core system principles file not found in any expected location")
}

// BuildSystemPrompt builds a system prompt for behavioral execution
// This is the SHARED function used by both chatmode generation and OpenRouter agent spawning
// to ensure 100% consistency between deployment modes
func BuildSystemPrompt(matrix *BehavioralMatrix, context TaskContext, coreSystemPrinciples string) (string, error) {
	var promptBuilder strings.Builder
	
	// Start with core system principles for consistency
	if coreSystemPrinciples != "" {
		promptBuilder.WriteString(coreSystemPrinciples)
		promptBuilder.WriteString("\n\n")
	}
	
	// Add behavioral template
	promptBuilder.WriteString("## BEHAVIORAL MATRIX EXECUTION\n\n")
	promptBuilder.WriteString(matrix.BehavioralPrompt.SystemPromptTemplate)
	promptBuilder.WriteString("\n\n")
	
	// Add system instructions
	if len(matrix.BehavioralPrompt.SystemInstructions) > 0 {
		promptBuilder.WriteString("## SYSTEM INSTRUCTIONS\n")
		for _, instruction := range matrix.BehavioralPrompt.SystemInstructions {
			promptBuilder.WriteString("- ")
			promptBuilder.WriteString(instruction)
			promptBuilder.WriteString("\n")
		}
		promptBuilder.WriteString("\n")
	}
	
	// Add execution context
	promptBuilder.WriteString("## EXECUTION CONTEXT\n")
	promptBuilder.WriteString(fmt.Sprintf("Execution Mode: %s\n", context.ExecutionMode))
	promptBuilder.WriteString(fmt.Sprintf("Tools Available: %s\n", context.ToolsAvailable))
	promptBuilder.WriteString("\n")
	
	// Add input/output schema
	if matrix.BehavioralPrompt.InputSchema != nil {
		promptBuilder.WriteString("## INPUT SCHEMA\n")
		inputJSON, _ := json.Marshal(matrix.BehavioralPrompt.InputSchema)
		promptBuilder.WriteString(string(inputJSON))
		promptBuilder.WriteString("\n\n")
	}
	
	if matrix.BehavioralPrompt.OutputSchema != nil {
		promptBuilder.WriteString("## OUTPUT SCHEMA\n")
		outputJSON, _ := json.Marshal(matrix.BehavioralPrompt.OutputSchema)
		promptBuilder.WriteString(string(outputJSON))
		promptBuilder.WriteString("\n\n")
	}
	
	return promptBuilder.String(), nil
}
```

## UPDATED_OPENROUTER_INTEGRATION

File: `internal/openrouter/agent_spawner.go`

```go
package openrouter

import (
	"context"
	"fmt"

	"gorka/internal/behavioral"
	"github.com/sashabaranov/go-openai"
)

// AgentSpawner handles OpenRouter LLM agent spawning using shared behavioral processing
type AgentSpawner struct {
	client               *Client
	coreSystemPrinciples string
}

// NewAgentSpawner creates a new agent spawner with OpenRouter integration
func NewAgentSpawner() (*AgentSpawner, error) {
	client, err := NewClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create OpenRouter client: %w", err)
	}

	// Load core system principles from shared behavioral package
	coreSystemPrinciples, err := behavioral.LoadCoreSystemPrinciples()
	if err != nil {
		return nil, fmt.Errorf("failed to load core system principles: %w", err)
	}

	return &AgentSpawner{
		client:               client,
		coreSystemPrinciples: coreSystemPrinciples,
	}, nil
}

// SpawnAgent spawns an OpenRouter LLM agent using shared behavioral processing
func (s *AgentSpawner) SpawnAgent(matrix *behavioral.BehavioralMatrix, userInput string) (*openai.ChatCompletionResponse, error) {
	// Use the SAME system prompt building method as chatmode generation
	// This ensures 100% consistency between chatmode and agent prompts
	taskContext := behavioral.TaskContext{
		ExecutionMode:  "openrouter_agent",
		ToolsAvailable: "mcp_delegated_tools",
	}

	// Generate identical prompt content using shared behavioral processing
	systemPrompt, err := behavioral.BuildSystemPrompt(matrix, taskContext, s.coreSystemPrinciples)
	if err != nil {
		return nil, fmt.Errorf("failed to build system prompt: %w", err)
	}

	// Create OpenRouter messages
	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: userInput,
		},
	}

	// Execute via OpenRouter
	return s.client.CreateChatCompletion(context.Background(), messages)
}

	return &ChatmodeGenerator{
		config:               config,
		spawner:              spawner,
		specsLoader:          specsLoader,
		coreSystemPrinciples: coreSystemPrinciples,
	}, nil
}

func (g *ChatmodeGenerator) GenerateAll() error {
	if g.config.Verbose {
		fmt.Printf("Generating chatmodes from %s to %s\n", g.config.InputDir, g.config.OutputDir)
	}

	// Validate input directory
	if err := g.validateInputDir(); err != nil {
		return fmt.Errorf("input validation failed: %w", err)
	}

	// Create output directory
	if err := os.MkdirAll(g.config.OutputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Get behavioral spec files
	files, err := g.getBehavioralSpecFiles()
	if err != nil {
		return fmt.Errorf("failed to get behavioral spec files: %w", err)
	}

	// Generate chatmode for each behavioral spec
	for _, file := range files {
		if err := g.generateChatmodeFromMatrix(file); err != nil {
			return fmt.Errorf("failed to generate chatmode for %s: %w", file, err)
		}

		if g.config.Verbose {
			fmt.Printf("Generated chatmode from %s\n", file)
		}
	}

	if g.config.Validate {
		if err := g.validateGeneratedChatmodes(); err != nil {
			return fmt.Errorf("validation failed: %w", err)
		}
	}

	return nil
}

func (g *ChatmodeGenerator) validateInputDir() error {
	info, err := os.Stat(g.config.InputDir)
	if err != nil {
		return fmt.Errorf("input directory does not exist: %s", g.config.InputDir)
	}
	if !info.IsDir() {
		return fmt.Errorf("input path is not a directory: %s", g.config.InputDir)
	}
	return nil
}

func (g *ChatmodeGenerator) getBehavioralSpecFiles() ([]string, error) {
	var files []string

	// Try filesystem first, then embedded resources
	if _, err := os.Stat(g.config.InputDir); err == nil {
		// Use filesystem
		matches, err := filepath.Glob(filepath.Join(g.config.InputDir, "*.json"))
		if err != nil {
			return nil, err
		}
		files = matches
	} else {
		// Use embedded resources
		entries, err := behavioralSpecs.ReadDir(".")
		if err != nil {
			return nil, err
		}

		for _, entry := range entries {
			if strings.HasSuffix(entry.Name(), ".json") {
				files = append(files, entry.Name())
			}
		}
	}

	if len(files) == 0 {
		return nil, fmt.Errorf("no *.json files found in %s", g.config.InputDir)
	}

	return files, nil
}

func (g *ChatmodeGenerator) generateChatmodeFromMatrix(matrixFile string) error {
	// Read behavioral matrix
	var data []byte
	var err error

	if _, statErr := os.Stat(g.config.InputDir); statErr == nil {
		// Read from filesystem
		data, err = os.ReadFile(filepath.Join(g.config.InputDir, filepath.Base(matrixFile)))
	} else {
		// Read from embedded resources
		data, err = behavioralSpecs.ReadFile(filepath.Base(matrixFile))
	}

	if err != nil {
		return fmt.Errorf("failed to read matrix file: %w", err)
	}

	// Parse behavioral matrix
	var matrix map[string]interface{}
	if err := json.Unmarshal(data, &matrix); err != nil {
		return fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Extract required fields
	agentID, ok := matrix["agent_id"].(string)
	if !ok {
		return fmt.Errorf("missing or invalid agent_id field")
	}

	vscodeChatmode, ok := matrix["vscode_chatmode"].(string)
	if !ok {
		return fmt.Errorf("missing or invalid vscode_chatmode field")
	}

	// Extract tools from behavioral prompt
	var tools []string
	if behavioralPrompt, ok := matrix["behavioral_prompt"].(map[string]interface{}); ok {
		if toolsData, ok := behavioralPrompt["tools"].(map[string]interface{}); ok {
			if vscodeTools, ok := toolsData["vscode_mode"].([]interface{}); ok {
				for _, tool := range vscodeTools {
					if toolStr, ok := tool.(string); ok {
						tools = append(tools, toolStr)
					}
				}
			}
		}
	}

	// Generate behavioral content JSON
	behavioralContent, err := g.generateBehavioralContent(matrix)
	if err != nil {
		return fmt.Errorf("failed to generate behavioral content: %w", err)
	}

	// Create chatmode data
	chatmodeData := ChatmodeData{
		Description:       fmt.Sprintf("Behavioral agent: %s", strings.ReplaceAll(agentID, "_", " ")),
		Tools:            tools,
		BehavioralContent: behavioralContent,
		AgentID:          agentID,
		Title:            strings.Title(strings.ReplaceAll(agentID, "_", " ")),
	}

	// Render chatmode
	return g.renderChatmode(chatmodeData, vscodeChatmode)
}

func (g *ChatmodeGenerator) generateBehavioralContent(matrix map[string]interface{}) (string, error) {
	// Convert map to BehavioralMatrix struct for compatibility
	matrixJSON, err := json.Marshal(matrix)
	if err != nil {
		return "", fmt.Errorf("failed_to_marshal_matrix: %w", err)
	}

	var behavioralMatrix openrouter.BehavioralMatrix
	if err := json.Unmarshal(matrixJSON, &behavioralMatrix); err != nil {
		return "", fmt.Errorf("failed_to_unmarshal_to_behavioral_matrix: %w", err)
	}

	// Use the SAME system prompt building method as OpenRouter agents
	// This ensures 100% consistency between chatmode and agent prompts
	taskContext := map[string]interface{}{
		"execution_mode": "vscode_chatmode",
		"tools_available": "vscode_integrated_tools",
	}

	// Generate identical prompt content using shared method
	systemPrompt := g.spawner.BuildChatmodeSystemPrompt(behavioralMatrix, taskContext)

	return systemPrompt, nil
}

func (g *ChatmodeGenerator) renderChatmode(data ChatmodeData, filename string) error {
	// Get template content
	tmplContent, err := g.getTemplate()
	if err != nil {
		return fmt.Errorf("failed to get template: %w", err)
	}

	// Parse template
	tmpl, err := template.New("chatmode").Funcs(template.FuncMap{
		"title": strings.Title,
	}).Parse(tmplContent)
	if err != nil {
		return fmt.Errorf("failed to parse template: %w", err)
	}

	// Prepare template data
	toolsJSON, _ := json.Marshal(data.Tools)
	templateData := struct {
		ChatmodeData
		ToolsJSON string
	}{
		ChatmodeData: data,
		ToolsJSON:    string(toolsJSON),
	}

	// Write output file
	outputPath := filepath.Join(g.config.OutputDir, filename)
	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("failed to create output file: %w", err)
	}
	defer file.Close()

	return tmpl.Execute(file, templateData)
}

func (g *ChatmodeGenerator) getTemplate() (string, error) {
	// Use custom template if provided
	if g.config.Template != "" {
		data, err := os.ReadFile(g.config.Template)
		if err != nil {
			return "", fmt.Errorf("failed to read custom template: %w", err)
		}
		return string(data), nil
	}

	// Use embedded template
	data, err := templates.ReadFile("chatmode-templates/base.md")
	if err != nil {
		return "", fmt.Errorf("failed to read embedded template: %w", err)
	}
	return string(data), nil
}

func (g *ChatmodeGenerator) validateGeneratedChatmodes() error {
	validator := NewValidator(g.config)
	errors := validator.ValidateAllChatmodes()

	if len(errors) > 0 {
		var errorMessages []string
		for _, err := range errors {
			errorMessages = append(errorMessages, err.Error())
		}
		return fmt.Errorf("validation failed:\n%s", strings.Join(errorMessages, "\n"))
	}

	return nil
}
```

## GENERATION_WORKFLOW

File: `internal/generation/workflow.go`

```go
package generation

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"gopkg.in/yaml.v3"
)

type ValidationResult struct {
	Valid  bool
	Errors []string
}

type GenerationWorkflow struct {
	generator *ChatmodeGenerator
}

func NewWorkflow(generator *ChatmodeGenerator) *GenerationWorkflow {
	return &GenerationWorkflow{generator: generator}
}

func (w *GenerationWorkflow) ExecuteGenerationPipeline() error {
	// Step 1: Input validation
	if err := w.validateInputDirectory(); err != nil {
		return fmt.Errorf("step 1 - input validation failed: %w", err)
	}

	// Step 2: Template loading
	if err := w.validateTemplates(); err != nil {
		return fmt.Errorf("step 2 - template validation failed: %w", err)
	}

	// Step 3: Behavioral matrix processing
	if err := w.generator.GenerateAll(); err != nil {
		return fmt.Errorf("step 3 - generation failed: %w", err)
	}

	// Step 4: Output validation
	if w.generator.config.Validate {
		if err := w.validateGeneratedOutput(); err != nil {
			return fmt.Errorf("step 4 - output validation failed: %w", err)
		}
	}

	return nil
}

func (w *GenerationWorkflow) validateInputDirectory() error {
	info, err := os.Stat(w.generator.config.InputDir)
	if err != nil {
		return fmt.Errorf("input directory does not exist: %s", w.generator.config.InputDir)
	}
	if !info.IsDir() {
		return fmt.Errorf("input path is not a directory: %s", w.generator.config.InputDir)
	}

	// Check for JSON files
	files, err := filepath.Glob(filepath.Join(w.generator.config.InputDir, "*.json"))
	if err != nil {
		return fmt.Errorf("failed to scan for JSON files: %w", err)
	}
	if len(files) == 0 {
		return fmt.Errorf("no *.json files found in %s", w.generator.config.InputDir)
	}

	// Validate each JSON file
	for _, file := range files {
		if err := w.validateBehavioralSpec(file); err != nil {
			return fmt.Errorf("invalid behavioral spec %s: %w", file, err)
		}
	}

	return nil
}

func (w *GenerationWorkflow) validateBehavioralSpec(file string) error {
	data, err := os.ReadFile(file)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	var matrix map[string]interface{}
	if err := json.Unmarshal(data, &matrix); err != nil {
		return fmt.Errorf("invalid JSON syntax: %w", err)
	}

	// Check required fields
	requiredFields := []string{"agent_id", "vscode_chatmode", "behavioral_prompt"}
	for _, field := range requiredFields {
		if _, ok := matrix[field]; !ok {
			return fmt.Errorf("missing required field: %s", field)
		}
	}

	return nil
}

func (w *GenerationWorkflow) validateTemplates() error {
	// Template validation logic
	return nil
}

func (w *GenerationWorkflow) validateGeneratedOutput() error {
	files, err := filepath.Glob(filepath.Join(w.generator.config.OutputDir, "*.chatmode.md"))
	if err != nil {
		return fmt.Errorf("failed to scan generated files: %w", err)
	}

	for _, file := range files {
		if err := w.validateGeneratedChatmode(file); err != nil {
			return fmt.Errorf("validation failed for %s: %w", file, err)
		}
	}

	return nil
}

func (w *GenerationWorkflow) validateGeneratedChatmode(file string) error {
	data, err := os.ReadFile(file)
	if err != nil {
		return fmt.Errorf("failed to read generated file: %w", err)
	}

	content := string(data)

	// Split frontmatter and content
	parts := strings.SplitN(content, "---", 3)
	if len(parts) < 3 {
		return fmt.Errorf("invalid chatmode format: missing YAML frontmatter")
	}

	// Validate YAML frontmatter
	frontmatter := parts[1]
	var yamlData map[string]interface{}
	if err := yaml.Unmarshal([]byte(frontmatter), &yamlData); err != nil {
		return fmt.Errorf("invalid YAML frontmatter: %w", err)
	}

	// Check required frontmatter fields
	if _, ok := yamlData["description"]; !ok {
		return fmt.Errorf("missing description in frontmatter")
	}
	if _, ok := yamlData["tools"]; !ok {
		return fmt.Errorf("missing tools in frontmatter")
	}

	// Validate JSON content blocks
	remainingContent := parts[2]
	if !strings.Contains(remainingContent, "```json") {
		return fmt.Errorf("missing JSON behavioral content block")
	}

	return nil
}
```

## CHATMODE_TEMPLATE

File: `internal/chatmode-generation/chatmode-templates/base.md`

```markdown
---
description: "{{.Description}}"
tools: {{.ToolsJSON}}
---

# {{.Title}} Behavioral Execution

## BEHAVIORAL_ALGORITHM

```json
{{.BehavioralContent}}
```

## EXECUTION_PROTOCOL

Execute behavioral matrix algorithm with mandatory sequential thinking (15+ thoughts minimum).
Apply evidence validation requirements and honesty protocols.
Return structured JSON output conforming to behavioral matrix specifications.

### Evidence Requirements
- File path references (40% weight)
- Actionable implementation steps (30% weight)
- Structured output format (30% weight)

### Thinking Protocol
- Use sequential thinking tool for complex analysis
- Minimum 15 thoughts for comprehensive evaluation
- Include assumption validation and bias recognition
- Provide logical reasoning chains

### Output Format
- Structured JSON response
- Clear implementation guidance
- Specific file references
- Actionable next steps
```

## VALIDATION_ENGINE

File: `internal/generation/validator.go`

```go
package generation

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"gopkg.in/yaml.v3"
)

type Validator struct {
	config Config
}

type ValidationError struct {
	File    string
	Message string
	Line    int
}

func (e ValidationError) Error() string {
	if e.Line > 0 {
		return fmt.Sprintf("%s:%d: %s", e.File, e.Line, e.Message)
	}
	return fmt.Sprintf("%s: %s", e.File, e.Message)
}

func NewValidator(config Config) *Validator {
	return &Validator{config: config}
}

func (v *Validator) ValidateAllChatmodes() []ValidationError {
	var errors []ValidationError

	files, err := filepath.Glob(filepath.Join(v.config.OutputDir, "*.chatmode.md"))
	if err != nil {
		errors = append(errors, ValidationError{
			File:    v.config.OutputDir,
			Message: fmt.Sprintf("Failed to scan directory: %v", err),
		})
		return errors
	}

	for _, file := range files {
		if fileErrors := v.validateChatmode(file); len(fileErrors) > 0 {
			errors = append(errors, fileErrors...)
		}
	}

	return errors
}

func (v *Validator) validateChatmode(file string) []ValidationError {
	var errors []ValidationError

	data, err := os.ReadFile(file)
	if err != nil {
		return []ValidationError{{
			File:    file,
			Message: fmt.Sprintf("Failed to read file: %v", err),
		}}
	}

	content := string(data)

	// Validate frontmatter
	if frontmatterErrors := v.validateFrontmatter(file, content); len(frontmatterErrors) > 0 {
		errors = append(errors, frontmatterErrors...)
	}

	// Validate JSON content
	if jsonErrors := v.validateJSONContent(file, content); len(jsonErrors) > 0 {
		errors = append(errors, jsonErrors...)
	}

	// Validate VS Code schema compliance
	if schemaErrors := v.validateVSCodeSchema(file, content); len(schemaErrors) > 0 {
		errors = append(errors, schemaErrors...)
	}

	return errors
}

func (v *Validator) validateFrontmatter(file, content string) []ValidationError {
	var errors []ValidationError

	parts := strings.SplitN(content, "---", 3)
	if len(parts) < 3 {
		return []ValidationError{{
			File:    file,
			Message: "Missing YAML frontmatter delimiters",
			Line:    1,
		}}
	}

	frontmatter := parts[1]
	var yamlData map[string]interface{}
	if err := yaml.Unmarshal([]byte(frontmatter), &yamlData); err != nil {
		return []ValidationError{{
			File:    file,
			Message: fmt.Sprintf("Invalid YAML syntax: %v", err),
			Line:    2,
		}}
	}

	// Check required fields
	requiredFields := []string{"description", "tools"}
	for _, field := range requiredFields {
		if _, ok := yamlData[field]; !ok {
			errors = append(errors, ValidationError{
				File:    file,
				Message: fmt.Sprintf("Missing required frontmatter field: %s", field),
				Line:    2,
			})
		}
	}

	return errors
}

func (v *Validator) validateJSONContent(file, content string) []ValidationError {
	var errors []ValidationError

	// Extract JSON blocks
	lines := strings.Split(content, "\n")
	inJSONBlock := false
	jsonStart := 0
	var jsonContent strings.Builder

	for i, line := range lines {
		if strings.TrimSpace(line) == "```json" {
			inJSONBlock = true
			jsonStart = i + 1
			jsonContent.Reset()
			continue
		}
		if inJSONBlock && strings.TrimSpace(line) == "```" {
			// Validate this JSON block
			var jsonData interface{}
			if err := json.Unmarshal([]byte(jsonContent.String()), &jsonData); err != nil {
				errors = append(errors, ValidationError{
					File:    file,
					Message: fmt.Sprintf("Invalid JSON: %v", err),
					Line:    jsonStart,
				})
			}
			inJSONBlock = false
		}
		if inJSONBlock {
			jsonContent.WriteString(line + "\n")
		}
	}

	return errors
}

func (v *Validator) validateVSCodeSchema(file, content string) []ValidationError {
	var errors []ValidationError

	// Extract frontmatter
	parts := strings.SplitN(content, "---", 3)
	if len(parts) < 3 {
		return errors // Already caught in frontmatter validation
	}

	frontmatter := parts[1]
	var yamlData map[string]interface{}
	if err := yaml.Unmarshal([]byte(frontmatter), &yamlData); err != nil {
		return errors // Already caught in frontmatter validation
	}

	// VS Code specific validations
	if desc, ok := yamlData["description"].(string); ok {
		if len(desc) == 0 {
			errors = append(errors, ValidationError{
				File:    file,
				Message: "Description cannot be empty",
				Line:    2,
			})
		}
		if len(desc) > 200 {
			errors = append(errors, ValidationError{
				File:    file,
				Message: "Description too long (max 200 characters)",
				Line:    2,
			})
		}
	}

	if tools, ok := yamlData["tools"].([]interface{}); ok {
		if len(tools) == 0 {
			errors = append(errors, ValidationError{
				File:    file,
				Message: "Tools array cannot be empty",
				Line:    2,
			})
		}
	}

	return errors
}
```

## CHATMODE_TEMPLATE

File: `internal/chatmode-generation/chatmode-templates/base.md`

```markdown
---
description: "{{.Description}}"
tools: {{.ToolsJSON}}
---

# {{.Title}} Behavioral Execution

## BEHAVIORAL_ALGORITHM

```json
{{.BehavioralContent}}
```

## EXECUTION_PROTOCOL

Execute behavioral matrix algorithm with mandatory sequential thinking (15+ thoughts minimum).
Apply evidence validation requirements and honesty protocols.
Return structured JSON output conforming to behavioral matrix specifications.

### Evidence Requirements
- File path references (40% weight)
- Actionable implementation steps (30% weight)
- Structured output format (30% weight)

### Thinking Protocol
- Use sequential thinking tool for complex analysis
- Minimum 15 thoughts for comprehensive evaluation
- Include assumption validation and bias recognition
- Provide logical reasoning chains

### Output Format
- Structured JSON response
- Clear implementation guidance
- Specific file references
- Actionable next steps
```

## BUILD_INTEGRATION_EXAMPLES

### GitHub Actions Workflow

File: `.github/workflows/validate-generation.yml`

```yaml
name: Validate Chatmode Generation

on:
  push:
    paths:
      - 'internal/behavioral-specs/*.json'
      - 'internal/chatmode-generation/**'
  pull_request:
    paths:
      - 'internal/behavioral-specs/*.json'
      - 'internal/chatmode-generation/**'

jobs:
  validate-generation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Build generator
        run: go build -o bin/secondbrain-gen ./cmd/secondbrain-gen

      - name: Generate chatmodes
        run: ./bin/secondbrain-gen --input=internal/behavioral-specs --output=agents --validate

      - name: Check for uncommitted changes
        run: |
          git diff --exit-code agents/ || {
            echo "Generated chatmodes are out of sync with behavioral specs"
            echo "Run 'make generate' and commit the changes"
            exit 1
          }
```

### Pre-commit Hook

File: `.githooks/pre-commit`

```bash
#!/bin/bash
set -e

echo "Validating chatmode generation..."

# Build generator if needed
if [ ! -f "bin/secondbrain-gen" ] || [ "cmd/secondbrain-gen/main.go" -nt "bin/secondbrain-gen" ]; then
    echo "Building secondbrain-gen..."
    go build -o bin/secondbrain-gen ./cmd/secondbrain-gen
fi

# Generate chatmodes
./bin/secondbrain-gen --input=internal/behavioral-specs --output=agents --validate

# Check if generation resulted in changes
if ! git diff --quiet agents/; then
    echo "ERROR: Generated chatmodes are out of sync with behavioral specs"
    echo "Run 'make generate' to update chatmodes and stage the changes"
    exit 1
fi

echo "✓ Chatmode generation validation passed"
```

## DEVELOPMENT_WORKFLOW_COMMANDS

```bash
# Initial setup
make deps                    # Install dependencies
make generate               # Generate chatmodes for first time
make build                  # Build all executables

# Development cycle
# 1. Edit behavioral spec
vim internal/behavioral-specs/software-engineer.json

# 2. Regenerate chatmodes
make generate

# 3. Review changes
git diff agents/

# 4. Test changes
make validate-generation

# 5. Rebuild CLI with updated chatmodes
make build

# Continuous development
make dev-watch             # Watch for changes and auto-regenerate
```

## ARCHITECTURAL_BENEFITS_OF_CORRECTED_DESIGN

### Key Improvements

✅ **No Circular Dependencies**
- Chatmode generator is standalone and doesn't depend on OpenRouter
- AgentSpawner uses shared behavioral processing, not chatmode generator
- Clean dependency graph with single source of truth

✅ **Offline Capability**
- Chatmode generation works without OpenRouter API keys
- No network dependencies for static file generation
- Supports CI/CD environments without API access

✅ **Shared Behavioral Processing**
- `internal/behavioral/prompt_builder.go` provides consistent system prompt generation
- Both chatmode generation and agent spawning use identical logic
- Single point of maintenance for behavioral matrix processing

✅ **Consistency Guarantee**
- Same system prompts across VS Code chatmode and OpenRouter agent execution
- Shared core system principles loading and embedding
- Unified behavioral matrix parsing and processing

✅ **Maintainability**
- JSON behavioral specs remain the single source of truth
- Changes to behavioral logic automatically apply to both modes
- Clear separation of concerns between generation and execution

### Implementation Summary

**Before (Incorrect):**
```
ChatmodeGenerator → OpenRouter.AgentSpawner → OpenRouter.Client
                                ↑
                          (circular dependency)
```

**After (Correct):**
```
JSON Behavioral Specs
    ↓
internal/behavioral/prompt_builder.go
    ↓
    ├── internal/generation/generator.go (chatmodes)
    └── internal/openrouter/agent_spawner.go (LLM agents)
```

This architecture ensures that both chatmode generation and OpenRouter agent spawning use identical behavioral processing logic while maintaining clean dependencies and offline capability for static generation.
