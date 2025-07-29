package generation

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type Config struct {
	InputDir  string
	OutputDir string
	Template  string
	Verbose   bool
	Validate  bool
}

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
