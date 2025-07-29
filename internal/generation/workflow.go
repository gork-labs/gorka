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
	_, err := w.generator.GenerateAll()
	if err != nil {
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

	// Check required fields - support both old and new formats
	requiredFields := []string{"agent_id", "vscode_chatmode"}
	for _, field := range requiredFields {
		if _, ok := matrix[field]; !ok {
			return fmt.Errorf("missing required field: %s", field)
		}
	}

	// Check for either algorithm or behavioral_prompt
	if _, hasAlgorithm := matrix["algorithm"]; !hasAlgorithm {
		if _, hasBehavioralPrompt := matrix["behavioral_prompt"]; !hasBehavioralPrompt {
			return fmt.Errorf("missing required field: algorithm or behavioral_prompt")
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
