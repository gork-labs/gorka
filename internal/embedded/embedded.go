package embedded

import (
	"embed"
)

// InstructionsFS contains all instruction files
//go:embed embedded-resources/instructions/*.md
var InstructionsFS embed.FS

// BehavioralSpecsFS contains all behavioral specification JSON files
//go:embed embedded-resources/behavioral-specs/*.json
var BehavioralSpecsFS embed.FS

// ChatmodeTemplatesFS contains all chatmode template files
//go:embed embedded-resources/chatmode-templates/*.tmpl
var ChatmodeTemplatesFS embed.FS

// ChatmodesFS contains all generated chatmode files
//go:embed embedded-resources/chatmodes/*.md
var ChatmodesFS embed.FS
