package generation

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	"gorka/internal/embedded"
	"gorka/internal/types"
	"gorka/internal/utils"
)

// ChatmodeGenerator handles generation of VS Code chatmode files from behavioral specifications
// This is the specification-compliant version with enhanced validation
type ChatmodeGenerator struct {
	config    Config
	templates map[string]*template.Template
}

// ChatmodeData represents the data structure passed to chatmode templates
type ChatmodeData struct {
	AgentID           string
	DisplayName       string
	Description       string
	Tools             []string
	Algorithm         map[string]interface{}
	AlgorithmJSON     string
	BehavioralContent string
	MCPTool           string
	GeneratedAt       time.Time
}

// NewChatmodeGenerator creates a new spec-compliant generator
func NewChatmodeGenerator(inputDir, outputDir, templateDir string) (*ChatmodeGenerator, error) {
	config := Config{
		InputDir:  inputDir,
		OutputDir: outputDir,
		Template:  templateDir,
		Verbose:   false,
		Validate:  false,
	}

	generator := &ChatmodeGenerator{
		config:    config,
		templates: make(map[string]*template.Template),
	}

	// Load templates for compatibility
	if err := generator.loadTemplates(); err != nil {
		return nil, fmt.Errorf("failed to load templates: %w", err)
	}

	return generator, nil
}

// NewGenerator creates a new spec-compliant generator with config
func NewGenerator(config Config) *ChatmodeGenerator {
	generator := &ChatmodeGenerator{
		config:    config,
		templates: make(map[string]*template.Template),
	}
	
	// Load embedded template
	if err := generator.loadTemplates(); err != nil {
		// This should not happen with embedded templates
		panic(fmt.Sprintf("Failed to load embedded templates: %v", err))
	}
	
	return generator
}

// loadTemplates loads chatmode templates from embedded resources
func (g *ChatmodeGenerator) loadTemplates() error {
	// Load embedded default template from centralized embedded package
	templateContent, err := embedded.ChatmodeTemplatesFS.ReadFile("embedded-resources/chatmode-templates/default.tmpl")
	if err != nil {
		return fmt.Errorf("failed to load embedded default template: %w", err)
	}

	tmpl, err := template.New("default").Parse(string(templateContent))
	if err != nil {
		return fmt.Errorf("failed to parse default template: %w", err)
	}
	g.templates["default"] = tmpl

	// Load custom templates from template directory if specified
	templateDir := g.config.Template
	if templateDir != "" {
		templateFiles, err := filepath.Glob(filepath.Join(templateDir, "*.tmpl"))
		if err != nil {
			return err
		}

		for _, templateFile := range templateFiles {
			name := strings.TrimSuffix(filepath.Base(templateFile), ".tmpl")
			// Skip if we already have this template name (don't override default)
			if name == "default" {
				continue
			}
			
			tmpl, err := template.ParseFiles(templateFile)
			if err != nil {
				return fmt.Errorf("failed to parse template %s: %w", templateFile, err)
			}
			g.templates[name] = tmpl
		}
	}

	return nil
}

// GenerateAll generates chatmode files for all behavioral specifications
func (g *ChatmodeGenerator) GenerateAll() ([]string, error) {
	if g.config.Verbose {
		fmt.Printf("Generating chatmodes from %s to %s\n", g.config.InputDir, g.config.OutputDir)
	}

	// Find all behavioral spec files
	specFiles, err := filepath.Glob(filepath.Join(g.config.InputDir, "*.json"))
	if err != nil {
		return nil, err
	}

	var generatedFiles []string

	for _, specFile := range specFiles {
		outputFile, err := g.generateChatmodeFromSpec(specFile)
		if err != nil {
			return nil, fmt.Errorf("failed to generate chatmode from %s: %w", specFile, err)
		}
		generatedFiles = append(generatedFiles, outputFile)

		if g.config.Verbose {
			fmt.Printf("Generated chatmode from %s\n", specFile)
		}
	}

	if g.config.Validate {
		if err := g.validateGeneratedChatmodes(); err != nil {
			return nil, fmt.Errorf("validation failed: %w", err)
		}
	}

	return generatedFiles, nil
}

// generateChatmodeFromSpec generates a single chatmode file from a behavioral specification
func (g *ChatmodeGenerator) generateChatmodeFromSpec(specFile string) (string, error) {
	// Read and parse behavioral specification
	data, err := os.ReadFile(specFile)
	if err != nil {
		return "", err
	}

	var matrix types.BehavioralMatrix
	if err := json.Unmarshal(data, &matrix); err != nil {
		return "", fmt.Errorf("failed to parse behavioral matrix: %w", err)
	}

	// Create chatmode data
	chatmodeData := g.createChatmodeData(&matrix)

	// Generate behavioral content using shared behavioral processing
	behavioralContent, err := g.generateBehavioralContent(&matrix)
	if err != nil {
		return "", fmt.Errorf("failed to generate behavioral content: %w", err)
	}
	chatmodeData.BehavioralContent = behavioralContent

	// Determine output filename
	outputFile := filepath.Join(g.config.OutputDir, matrix.VSCodeMode)

	// Select template (use default if specific template not found)
	templateName := "default"
	if tmpl, exists := g.templates[matrix.AgentID]; exists {
		_ = tmpl // Use agent-specific template if available
	}

	template := g.templates[templateName]
	if template == nil {
		return "", fmt.Errorf("template not found: %s", templateName)
	}

	// Generate chatmode file
	outputFileHandle, err := os.Create(outputFile)
	if err != nil {
		return "", err
	}
	defer outputFileHandle.Close()

	if err := template.Execute(outputFileHandle, chatmodeData); err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return outputFile, nil
}

// createChatmodeData creates template data from a behavioral matrix
func (g *ChatmodeGenerator) createChatmodeData(matrix *types.BehavioralMatrix) *ChatmodeData {
	// Extract display name from VSCodeMode filename
	displayName := strings.TrimSuffix(matrix.VSCodeMode, ".chatmode.md")

	// Get tools for VS Code mode from algorithm using shared behavioral processing
	tools := types.GetToolsFromAlgorithm(matrix.Algorithm, "vscode_mode")
	
	// Add default tools if none specified
	if len(tools) == 0 {
		tools = []string{
			"changes", "codebase", "editFiles", "extensions", "fetch", "findTestFiles",
			"githubRepo", "new", "openSimpleBrowser", "problems", "runCommands",
			"runNotebooks", "runTasks", "runTests", "search", "searchResults",
			"terminalLastCommand", "terminalSelection", "testFailure", "usages",
			"vscodeAPI", "git_diff", "git_diff_staged", "git_diff_unstaged",
			"git_log", "git_show", "git_status", "get_current_time",
			"sequentialthinking", "context7", "deepwiki", "memory",
		}
	}

	// Serialize algorithm to JSON for embedding in template
	algorithmJSON, err := json.MarshalIndent(matrix.Algorithm, "    ", "  ")
	if err != nil {
		// Fallback to empty object if serialization fails
		algorithmJSON = []byte("{}")
	}

	return &ChatmodeData{
		AgentID:           matrix.AgentID,
		DisplayName:       displayName,
		Description:       "", // Eliminated per ANTI_HUMAN_CONTENT_DIRECTIVE
		Tools:             tools,
		Algorithm:         matrix.Algorithm,
		AlgorithmJSON:     string(algorithmJSON),
		BehavioralContent: "", // Will be populated by generateBehavioralContent
		MCPTool:           matrix.MCPTool,
		GeneratedAt:       time.Now(),
	}
}

// generateBehavioralContent generates behavioral content using shared behavioral processing
// This ensures identical prompts between chatmodes and OpenRouter agent spawning
func (g *ChatmodeGenerator) generateBehavioralContent(matrix *types.BehavioralMatrix) (string, error) {
	// Load core system principles
	coreSystemPrinciples, err := utils.LoadCoreSystemPrinciples()
	if err != nil {
		// Continue without core principles if not found (for development)
		coreSystemPrinciples = ""
	}

	// Create task context for VS Code chatmode
	taskContext := types.TaskContext{
		ExecutionMode:  "vscode_chatmode",
		ToolsAvailable: "vscode_integrated_tools",
	}

	// Use shared behavioral processing to generate system prompt
	return types.BuildSystemPrompt(matrix, taskContext, coreSystemPrinciples)
}

// FindOutdatedChatmodes finds chatmode files that are outdated compared to their behavioral specs
func (g *ChatmodeGenerator) FindOutdatedChatmodes() ([]string, error) {
	// Find all behavioral spec files
	specFiles, err := filepath.Glob(filepath.Join(g.config.InputDir, "*.json"))
	if err != nil {
		return nil, err
	}

	var outdatedFiles []string

	for _, specFile := range specFiles {
		// Read behavioral spec to get output filename
		data, err := os.ReadFile(specFile)
		if err != nil {
			return nil, err
		}

		var matrix types.BehavioralMatrix
		if err := json.Unmarshal(data, &matrix); err != nil {
			return nil, err
		}

		outputFile := filepath.Join(g.config.OutputDir, matrix.VSCodeMode)

		// Check if chatmode file is outdated
		if g.isChatmodeOutdated(specFile, outputFile) {
			outdatedFiles = append(outdatedFiles, outputFile)
		}
	}

	return outdatedFiles, nil
}

// isChatmodeOutdated checks if a chatmode file is outdated compared to its behavioral spec
func (g *ChatmodeGenerator) isChatmodeOutdated(specFile, chatmodeFile string) bool {
	// Check if chatmode file exists
	chatmodeStat, err := os.Stat(chatmodeFile)
	if err != nil {
		return true // File doesn't exist, so it's outdated
	}

	// Check if spec file is newer than chatmode file
	specStat, err := os.Stat(specFile)
	if err != nil {
		return false // Can't check spec file, assume chatmode is up-to-date
	}

	return specStat.ModTime().After(chatmodeStat.ModTime())
}

// GetChecksumForSpec generates a checksum for a behavioral specification file
func (g *ChatmodeGenerator) GetChecksumForSpec(specFile string) (string, error) {
	file, err := os.Open(specFile)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

// validateGeneratedChatmodes validates all generated chatmode files using the validator
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
