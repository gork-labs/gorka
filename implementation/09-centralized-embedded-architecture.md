---
target_execution: "llm_agent_implementa### File: `internal/embedded/templates.go`

```go
package embedded

import "embed"

// ChatmodeTemplatesFS contains all chatmode template files embedded at build time
//go:embed embedded-resources/chatmode-templates/*.tmpl
var ChatmodeTemplatesFS embed.FS
```mentation_domain: "centralized_embedded_architecture"
---

# CENTRALIZED EMBEDDED ARCHITECTURE IMPLEMENTATION

## ARCHITECTURAL_PRINCIPLE

**CORE ARCHITECTURE**: All go:embed directives centralized in `internal/embedded` package to solve relative path limitations and provide single source of truth for embedded resources.

**KEY BENEFITS:**
1. **No Relative Path Issues**: go:embed patterns work correctly from centralized location
2. **Single Source of Truth**: All embedded resources managed in one package
3. **Clean Dependencies**: Other packages import embedded package and use exported filesystems
4. **Maintainable**: Changes to embedded resources only require updates in one place

## CENTRALIZED_EMBEDDED_PACKAGE

### File: `internal/embedded/instructions.go`

```go
package embedded

import "embed"

// InstructionsFS contains all instruction files embedded at build time
//go:embed embedded-resources/instructions/*.md
var InstructionsFS embed.FS
```

### File: `internal/embedded/behavioral_specs.go`

```go
package embedded

import "embed"

// BehavioralSpecsFS contains all behavioral specification files embedded at build time
//go:embed embedded-resources/behavioral-specs/*.json
var BehavioralSpecsFS embed.FS
```

### File: `internal/embedded/templates.go`

```go
package embedded

import "embed"

// ChatmodeTemplatesFS contains all chatmode template files embedded at build time
//go:embed ../generation/chatmode-templates/*.tmpl
var ChatmodeTemplatesFS embed.FS
```

### File: `internal/embedded/chatmodes.go`

```go
package embedded

import "embed"

// ChatmodesFS contains all generated chatmode files embedded at build time
//go:embed embedded-resources/chatmodes/*.md
var ChatmodesFS embed.FS
```

## CONSUMER_IMPLEMENTATION

### Behavioral Package Integration

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
	entries, err := embedded.InstructionsFS.ReadDir("embedded-resources/instructions")
	if err != nil {
		return "", fmt.Errorf("failed to read instructions directory: %w", err)
	}
	
	for _, entry := range entries {
		if strings.Contains(entry.Name(), "CORE_SYSTEM_PRINCIPLES") && strings.HasSuffix(entry.Name(), ".md") {
			content, err := embedded.InstructionsFS.ReadFile("embedded-resources/instructions/" + entry.Name())
			if err != nil {
				return "", fmt.Errorf("failed to read core principles: %w", err)
			}
			return string(content), nil
		}
	}
	
	return "", fmt.Errorf("CORE_SYSTEM_PRINCIPLES file not found")
}

// GetBehavioralMatrixFromEmbedded loads behavioral specs using centralized embedded package
func GetBehavioralMatrixFromEmbedded(agentID string) (*BehavioralMatrix, error) {
	entries, err := embedded.BehavioralSpecsFS.ReadDir("embedded-resources/behavioral-specs")
	if err != nil {
		return nil, fmt.Errorf("failed to read behavioral specs directory: %w", err)
	}
	
	for _, entry := range entries {
		if strings.Contains(entry.Name(), agentID) && strings.HasSuffix(entry.Name(), ".json") {
			content, err := embedded.BehavioralSpecsFS.ReadFile("embedded-resources/behavioral-specs/" + entry.Name())
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

### Generation Package Integration

```go
// File: internal/generation/generator.go
package generation

import (
	"text/template"
	"fmt"
	
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

	// Load any additional templates dynamically
	entries, err := embedded.ChatmodeTemplatesFS.ReadDir("../generation/chatmode-templates")
	if err != nil {
		return fmt.Errorf("failed to read templates directory: %w", err)
	}

	for _, entry := range entries {
		if entry.Name() != "default.tmpl" && strings.HasSuffix(entry.Name(), ".tmpl") {
			templateName := strings.TrimSuffix(entry.Name(), ".tmpl")
			content, err := embedded.ChatmodeTemplatesFS.ReadFile("../generation/chatmode-templates/" + entry.Name())
			if err != nil {
				continue // Skip failed templates
			}
			
			tmpl, err := template.New(templateName).Parse(string(content))
			if err != nil {
				continue // Skip invalid templates
			}
			g.templates[templateName] = tmpl
		}
	}

	return nil
}
```

### CLI Package Integration

```go
// File: internal/cli/embedded.go
package cli

import (
	"fmt"
	"strings"
	
	"gorka/internal/embedded"
)

// ListEmbeddedChatmodes lists all embedded chatmode files
func ListEmbeddedChatmodes() ([]string, error) {
	entries, err := embedded.ChatmodesFS.ReadDir("embedded-resources/chatmodes")
	if err != nil {
		return nil, fmt.Errorf("failed to read chatmodes directory: %w", err)
	}
	
	var chatmodes []string
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name(), ".chatmode.md") {
			chatmodes = append(chatmodes, entry.Name())
		}
	}
	
	return chatmodes, nil
}

// GetEmbeddedChatmodeContent reads content of an embedded chatmode file
func GetEmbeddedChatmodeContent(filename string) (string, error) {
	content, err := embedded.ChatmodesFS.ReadFile("embedded-resources/chatmodes/" + filename)
	if err != nil {
		return "", fmt.Errorf("failed to read chatmode file %s: %w", filename, err)
	}
	return string(content), nil
}
```

## MIGRATION_STRATEGY

### Step 1: Create Centralized Embedded Package
1. Create `internal/embedded/` directory
2. Create individual files for each resource type
3. Add go:embed directives with correct relative paths

### Step 2: Update Consumer Packages
1. Remove local go:embed directives from behavioral, generation, cli packages
2. Add imports to `gorka/internal/embedded`
3. Update code to use exported embedded filesystems

### Step 3: Test and Validate
1. Ensure all go:embed patterns work correctly
2. Test that all resources are accessible
3. Validate that build process works correctly

## ARCHITECTURAL_BENEFITS

### Solved Problems
1. **Relative Path Issues**: No more go:embed pattern errors with `..` paths
2. **Duplicate Embed Directives**: Single source for each resource type
3. **Maintenance Overhead**: Changes only needed in centralized package
4. **Build Consistency**: All embedded resources handled uniformly

### Performance Benefits
1. **Single Embedding**: Resources embedded once, used by multiple packages
2. **Build Efficiency**: Faster builds with centralized embedding
3. **Runtime Efficiency**: Direct access to embedded filesystems

### Maintainability Benefits
1. **Clear Ownership**: Embedded package owns all resource embedding
2. **Easy Updates**: Resource changes only require embedded package updates
3. **Consistent Patterns**: All packages use same access patterns
4. **Better Testing**: Embedded resources can be tested centrally

## VALIDATION_REQUIREMENTS

### Build-Time Validation
1. All go:embed patterns must resolve correctly
2. All referenced files must exist
3. No circular dependencies between packages

### Runtime Validation
1. All embedded filesystems must be accessible
2. File reading operations must work correctly
3. Dynamic file discovery must function properly

### Integration Validation
1. Behavioral package must access instructions and specs correctly
2. Generation package must access templates correctly
3. CLI package must access chatmodes correctly
