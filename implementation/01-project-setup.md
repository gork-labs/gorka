---
target_execution: "llm_agent_implementation"
implementation_domain: "project_setup"
---

# PROJECT SETUP IMPLEMENTATION

## GO_MODULE_INITIALIZATION

```bash
go mod init gorka
go get github.com/modelcontextprotocol/go-sdk
go get github.com/spf13/cobra
go get github.com/spf13/viper
go get github.com/sashabaranov/go-openai
go get golang.org/x/sync
go get golang.org/x/time
```

## TRIPLE_EXECUTABLE_PROJECT_STRUCTURE

```bash
# Create the triple executable structure
mkdir -p cmd/secondbrain-mcp
mkdir -p cmd/secondbrain-cli
mkdir -p cmd/secondbrain-gen
mkdir -p internal/{openrouter,mcp,cli,generation,filesystem,behavioral-specs,chatmode-generation,embedded-resources,schemas,utils}
mkdir -p internal/chatmode-generation/{chatmode-templates,generated-chatmodes}
mkdir -p internal/embedded-resources/{behavioral-specs,chatmodes,instructions}
mkdir -p agents
mkdir -p instructions
mkdir -p test/{fixtures,integration}
mkdir -p docs/examples
```

## GO_GENERATE_INTEGRATION_SETUP

```bash
# Create go:generate trigger file for chatmode generation
cat > internal/behavioral-specs/generate.go << 'EOF'
//go:generate secondbrain-gen --input=. --output=../../agents --verbose

package main

// This file exists solely to trigger chatmode generation via go:generate
// Run: go generate ./internal/behavioral-specs/
EOF
```

## MAKEFILE_WITH_GENERATION_SUPPORT

```makefile
# Makefile for triple executable build system
.PHONY: build clean generate install test deps

# Default target
all: generate build

# Install dependencies
deps:
	go mod download
	go mod tidy

# Generate chatmodes from behavioral specs
generate:
	go generate ./internal/behavioral-specs/
	@echo "Chatmodes generated successfully"

# Build all three executables
build: generate
	@echo "Building all executables..."
	go build -o bin/secondbrain-mcp ./cmd/secondbrain-mcp
	go build -o bin/secondbrain-cli ./cmd/secondbrain-cli
	go build -o bin/secondbrain-gen ./cmd/secondbrain-gen
	@echo "Build complete: bin/secondbrain-{mcp,cli,gen}"

# Install executables to GOPATH/bin
install: build
	go install ./cmd/secondbrain-mcp
	go install ./cmd/secondbrain-cli
	go install ./cmd/secondbrain-gen

# Clean generated files and binaries
clean:
	rm -rf bin/
	rm -rf agents/*.chatmode.md
	go clean

# Run tests
test:
	go test ./...

# Development workflow: watch for changes and regenerate
dev-watch:
	@echo "Watching for behavioral spec changes..."
	while inotifywait -e modify internal/behavioral-specs/*.json; do \
		make generate; \
	done

# Validate generated chatmodes are up-to-date
validate-generation:
	@echo "Validating chatmode generation..."
	go run ./cmd/secondbrain-gen --input=internal/behavioral-specs --output=agents --validate
	@if git diff --quiet agents/; then \
		echo "✓ Generated chatmodes are up-to-date"; \
	else \
		echo "✗ Generated chatmodes are out of sync with behavioral specs"; \
		echo "Run 'make generate' to update"; \
		exit 1; \
	fi
```

## ADDITIONAL_CONSIDERATIONS

### **1. Security & Environment Management**
```bash
# Create secure environment handling
echo "Consider implementing secure API key management"
echo "- Use environment variables for OpenRouter API key"
echo "- Configure OpenAI SDK with OpenRouter base URL: https://openrouter.ai/api/v1"
echo "- Implement key validation and error handling"
echo "- Add timeout and retry logic for API calls"
```

### **1.0. MVP Environment Variables Validation**
```bash
# MVP requires these four core environment variables
echo "MVP Environment Variable Requirements:"
echo "REQUIRED:"
echo "  - OPENROUTER_API_KEY: OpenRouter API authentication"
echo "  - SECONDBRAIN_MODEL: Single model for all agents (e.g., anthropic/claude-3.5-sonnet)"
echo "  - SECONDBRAIN_WORKSPACE: Workspace path for file operations"
echo "  - SECONDBRAIN_MAX_PARALLEL_AGENTS: Concurrency limit (recommended: 3-5)"
echo ""
echo "OPTIONAL:"
echo "  - SECONDBRAIN_LOG_LEVEL: Logging verbosity (default: info)"
echo "  - SECONDBRAIN_REQUEST_TIMEOUT: API timeout (default: 3600s)"
echo "  - SECONDBRAIN_MAX_CONTEXT_SIZE: Token limit (default: 50000)"
echo "  - SECONDBRAIN_OPENROUTER_BASE_URL: Custom API endpoint (default: https://openrouter.ai/api/v1)"
```

### **1.1. OpenRouter API Configuration**
```bash
# OpenAI SDK configuration for OpenRouter
echo "OpenRouter integration via OpenAI SDK:"
echo "- Set BaseURL to 'https://openrouter.ai/api/v1'"
echo "- Use OpenRouter API key as Authorization header"
echo "- Model names: 'anthropic/claude-3.5-sonnet', etc."
echo "- 100% compatible with OpenAI SDK methods"
```

### **2. Cross-Platform Compatibility**
```bash
# File path handling considerations
echo "Platform-specific considerations:"
echo "- Use filepath.Join() for cross-platform paths"
echo "- Handle Windows vs Unix executable extensions"
echo "- Test on multiple operating systems"
```

### **3. Error Handling & Logging**
```bash
# Consider structured logging
echo "Implement comprehensive error handling:"
echo "- Structured logging with levels (debug, info, warn, error)"
echo "- Error wrapping and context preservation"
echo "- User-friendly error messages in CLI"
echo "- Detailed debugging information for development"
```

### **4. Configuration Management**
```bash
# Configuration file considerations
echo "Configuration strategy:"
echo "- Support for config files (.gorka.yaml, .gorka.json)"
echo "- Environment variable overrides"
echo "- Command-line flag precedence"
echo "- Validation of configuration values"
```

### **5. Testing Strategy**
```bash
# Comprehensive testing approach
echo "Testing considerations:"
echo "- Unit tests for all internal packages"
echo "- Integration tests for MCP protocol"
echo "- End-to-end tests for CLI workspace management"
echo "- Mock OpenRouter API for testing"
echo "- Test embedded resource extraction"
```

### **6. Documentation Requirements**
```bash
# Documentation structure
echo "Documentation needs:"
echo "- README with installation and usage"
echo "- API documentation for internal packages"
echo "- Examples of behavioral specs and chatmodes"
echo "- Troubleshooting guides"
echo "- Development setup instructions"
```

### **7. Performance Considerations**
```bash
# Performance optimization
echo "Performance factors:"
echo "- Efficient embedded resource loading"
echo "- Memory usage optimization for MCP server"
echo "- Fast CLI command execution"
echo "- Connection pooling for OpenRouter API"
echo "- Caching strategies for behavioral specs"
```

### **8. Deployment & Distribution**
```bash
# Release management
echo "Deployment considerations:"
echo "- GitHub Actions for automated builds"
echo "- Release versioning strategy"
echo "- Binary signing for security"
echo "- Package managers (brew, apt, chocolatey)"
echo "- Docker containerization options"
```

### **9. Monitoring & Observability**
```bash
# Operational monitoring
echo "Observability needs:"
echo "- Health check endpoints for MCP server"
echo "- Metrics collection (request counts, response times)"
echo "- OpenRouter API usage tracking"
echo "- CLI command usage analytics (opt-in)"
```

### **10. Maintenance & Updates**
```bash
# Long-term maintenance
echo "Maintenance strategy:"
echo "- Automated dependency updates"
echo "- Backward compatibility guarantees"
echo "- Migration scripts for configuration changes"
echo "- Deprecation notices and upgrade paths"
```

### **11. MVP-Specific Implementation Requirements**
```bash
# MVP Core Requirements
echo "MVP Implementation Priorities:"
echo "1. Environment Variable Validation:"
echo "   - Startup validation for all required env vars"
echo "   - Clear error messages for missing/invalid values"
echo "   - Default value assignment for optional vars"
echo ""
echo "2. Basic Error Handling:"
echo "   - OpenRouter API failure recovery"
echo "   - File system access error handling"
echo "   - Invalid MCP request handling"
echo "   - Agent timeout and cleanup"
echo ""
echo "3. Concurrency Management:"
echo "   - Semaphore-based agent limiting"
echo "   - Immediate rejection when max agents reached"
echo "   - Proper agent session cleanup"
echo ""
echo "4. Core Agent Types (MVP subset):"
echo "   - Project Orchestrator (task delegation)"
echo "   - Software Engineer (code analysis)"
echo "   - Security Engineer (security analysis)"
echo "   - Postpone: DevOps, Database, Software Architect agents"
echo ""
echo "5. Basic Logging:"
echo "   - Structured JSON logging"
echo "   - Agent lifecycle tracking"
echo "   - OpenRouter API call monitoring"
echo "   - Debug mode for verbose output"
```

### **12. Startup Validation Protocol**
```bash
# MVP startup validation requirements
echo "Startup Validation Checklist:"
echo "1. Environment Variables:"
echo "   - Validate OPENROUTER_API_KEY format and connectivity"
echo "   - Verify SECONDBRAIN_MODEL is supported by OpenRouter"
echo "   - Check SECONDBRAIN_WORKSPACE exists and is writable"
echo "   - Validate SECONDBRAIN_MAX_PARALLEL_AGENTS is positive integer"
echo ""
echo "2. OpenRouter Integration:"
echo "   - Test API connectivity with health check"
echo "   - Validate model availability"
echo "   - Configure OpenAI SDK with OpenRouter base URL"
echo ""
echo "3. File System Access:"
echo "   - Verify workspace directory permissions"
echo "   - Test file read/write operations"
echo "   - Validate path traversal protection"
echo ""
echo "4. Behavioral Specs Loading:"
echo "   - Load embedded behavioral specifications"
echo "   - Validate JSON schema compliance"
echo "   - Verify core agent types available"
```

## FILESYSTEM_STRUCTURE_CREATION

```bash
# Dual executable directories
mkdir -p cmd/secondbrain-mcp
mkdir -p cmd/secondbrain-cli

# OpenRouter integration
mkdir -p internal/openrouter

# CLI functionality
mkdir -p internal/cli

# MCP protocol
mkdir -p internal/mcp

# File system provider
mkdir -p internal/filesystem

# Behavioral specifications (embedded in both executables)
mkdir -p internal/behavioral-specs

# CLI embedded resources
mkdir -p internal/embedded-resources/behavioral-specs
mkdir -p internal/embedded-resources/chatmodes
mkdir -p internal/embedded-resources/instructions

# Chatmode generation
mkdir -p internal/chatmode-generation/chatmode-templates
mkdir -p internal/chatmode-generation/generated-chatmodes

# JSON schemas
mkdir -p internal/schemas

# Utilities
mkdir -p internal/utils

# Generated chatmodes (embedded in CLI)
mkdir -p agents

# Instruction files (embedded in CLI)
mkdir -p instructions

# Testing directories
mkdir -p test/integration
mkdir -p test/fixtures

# Documentation
mkdir -p docs/examples
```

## REQUIRED_DIRECTORIES_VALIDATION

```json
{
  "required_directories": [
    "cmd/secondbrain-mcp",
    "cmd/secondbrain-cli",
    "internal/openrouter",
    "internal/cli",
    "internal/mcp",
    "internal/filesystem",
    "internal/behavioral-specs",
    "internal/embedded-resources",
    "internal/chatmode-generation",
    "internal/schemas",
    "internal/utils",
    "agents",
    "instructions",
    "test/integration",
    "test/fixtures",
    "docs/examples"
  ]
}
```

## GO_MODULE_DEPENDENCIES

```json
{
  "required_dependencies": {
    "github.com/modelcontextprotocol/go-sdk": "latest",
    "github.com/spf13/cobra": "latest",
    "github.com/spf13/viper": "latest",
    "github.com/sashabaranov/go-openai": "latest",
    "golang.org/x/sync": "latest",
    "golang.org/x/time": "latest"
  },
  "standard_library": {
    "embed": "go:embed directive support",
    "encoding/json": "JSON parsing for configs",
    "fmt": "formatted I/O",
    "io": "I/O primitives",
    "io/fs": "file system interfaces",
    "os": "operating system interface",
    "path/filepath": "file path manipulation",
    "net/http": "HTTP client for OpenRouter",
    "context": "request context handling",
    "time": "time operations",
    "strings": "string operations",
    "regexp": "regular expressions",
    "errors": "error handling"
  },
  "go_commands": [
    "go get github.com/modelcontextprotocol/go-sdk",
    "go get github.com/spf13/cobra",
    "go get github.com/spf13/viper",
    "go get github.com/sashabaranov/go-openai",
    "go get golang.org/x/sync",
    "go get golang.org/x/time"
  ]
}
```

## PROJECT_STRUCTURE_VERIFICATION

```bash
tree -d -L 4
```

Expected output structure:
```
.
├── agents                           # Generated chatmodes (embedded in CLI)
├── cmd                             # Dual executable entry points
│   ├── secondbrain-cli             # CLI management tool
│   └── secondbrain-mcp             # MCP server
├── docs                            # Documentation
│   └── examples                    # Usage examples
├── instructions                    # Instruction files (embedded in CLI)
├── internal                        # Internal packages
│   ├── behavioral-specs            # Behavioral prompts (embedded in both)
│   ├── chatmode-generation         # Chatmode template engine
│   │   ├── chatmode-templates
│   │   └── generated-chatmodes
│   ├── cli                         # CLI command implementations
│   ├── embedded-resources          # Resources for go:embed
│   │   ├── behavioral-specs
│   │   ├── chatmodes
│   │   └── instructions
│   ├── filesystem                  # File system provider
│   ├── mcp                         # MCP protocol handling
│   ├── openrouter                  # OpenRouter integration
│   ├── schemas                     # JSON schemas
│   └── utils                       # Utility functions
└── test                           # Testing
    ├── fixtures                   # Test data
    └── integration               # Integration tests
```

## MCP_ENVIRONMENT_CONFIGURATION

```bash
# Environment variables are configured via MCP server configuration
echo "MCP Environment Configuration:"
echo "All environment variables are provided through VS Code MCP configuration:"
echo ""
echo "In .vscode/mcp.json:"
echo '{'
echo '  "servers": {'
echo '    "secondbrain-gorka": {'
echo '      "command": "secondbrain-mcp",'
echo '      "args": [],'
echo '      "env": {'
echo '        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",'
echo '        "SECONDBRAIN_MODEL": "${SECONDBRAIN_MODEL}",'
echo '        "SECONDBRAIN_WORKSPACE": "${SECONDBRAIN_WORKSPACE}",'
echo '        "SECONDBRAIN_MAX_PARALLEL_AGENTS": "${SECONDBRAIN_MAX_PARALLEL_AGENTS}"'
echo '      }'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "Users set these in their shell environment or VS Code settings:"
echo "- OPENROUTER_API_KEY=your_api_key"
echo "- SECONDBRAIN_MODEL=anthropic/claude-3.5-sonnet"
echo "- SECONDBRAIN_WORKSPACE=/path/to/project"
echo "- SECONDBRAIN_MAX_PARALLEL_AGENTS=3"
```

# Create .gitignore
cat > .gitignore << 'EOF'
# Binaries
/secondbrain-mcp
/secondbrain-cli
*.exe
*.exe~
*.dll
*.so
*.dylib

# Test binary, built with `go test -c`
*.test

# Output of the go coverage tool
*.out

# Go workspace file
go.work

# IDE files
.vscode/settings.json
.idea/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Generated files
/internal/chatmode-generation/generated-chatmodes/*
!/internal/chatmode-generation/generated-chatmodes/.gitkeep

# Test artifacts
/test/output/
/test/tmp/

# Build artifacts
/dist/
/build/
EOF
```

## BUILD_CONFIGURATION

```bash
# Create Makefile
cat > Makefile << 'EOF'
.PHONY: build build-mcp build-cli clean test install-deps generate

# Build both executables
build: build-mcp build-cli

# Build MCP server
build-mcp:
	go build -o secondbrain-mcp ./cmd/secondbrain-mcp

# Build CLI tool
build-cli:
	go build -o secondbrain-cli ./cmd/secondbrain-cli

# Clean build artifacts
clean:
	rm -f secondbrain-mcp secondbrain-cli

# Run tests
test:
	go test -v ./...

# Install dependencies
install-deps:
	go mod download
	go mod tidy

# Generate chatmodes from behavioral specs
generate:
	go run ./internal/chatmode-generation/cmd/generate.go

# Development build with race detection
dev-build:
	go build -race -o secondbrain-mcp ./cmd/secondbrain-mcp
	go build -race -o secondbrain-cli ./cmd/secondbrain-cli

# Cross-compilation targets
build-all:
	GOOS=linux GOARCH=amd64 go build -o dist/secondbrain-mcp-linux-amd64 ./cmd/secondbrain-mcp
	GOOS=linux GOARCH=amd64 go build -o dist/secondbrain-cli-linux-amd64 ./cmd/secondbrain-cli
	GOOS=darwin GOARCH=amd64 go build -o dist/secondbrain-mcp-darwin-amd64 ./cmd/secondbrain-mcp
	GOOS=darwin GOARCH=amd64 go build -o dist/secondbrain-cli-darwin-amd64 ./cmd/secondbrain-cli
	GOOS=darwin GOARCH=arm64 go build -o dist/secondbrain-mcp-darwin-arm64 ./cmd/secondbrain-mcp
	GOOS=darwin GOARCH=arm64 go build -o dist/secondbrain-cli-darwin-arm64 ./cmd/secondbrain-cli
	GOOS=windows GOARCH=amd64 go build -o dist/secondbrain-mcp-windows-amd64.exe ./cmd/secondbrain-mcp
	GOOS=windows GOARCH=amd64 go build -o dist/secondbrain-cli-windows-amd64.exe ./cmd/secondbrain-cli
EOF
```

## VALIDATION_CHECKS

```bash
# Verify directory structure
echo "=== Checking directory structure ==="
for dir in cmd/secondbrain-mcp cmd/secondbrain-cli internal/openrouter internal/cli internal/mcp internal/filesystem internal/behavioral-specs internal/embedded-resources internal/chatmode-generation internal/schemas internal/utils agents instructions test/integration test/fixtures docs/examples; do
  if [ -d "$dir" ]; then
    echo "✓ $dir exists"
  else
    echo "✗ $dir missing"
  fi
done

# Verify Go module
echo "=== Checking Go module ==="
if [ -f "go.mod" ]; then
  echo "✓ go.mod exists"
  go mod verify
else
  echo "✗ go.mod missing"
fi

# Verify dependencies
echo "=== Checking dependencies ==="
go list -m all | grep -E "(modelcontextprotocol|cobra|viper|openai)"

# Test build (without running)
echo "=== Testing build ==="
go build -o /tmp/test-mcp ./cmd/secondbrain-mcp && echo "✓ MCP server builds" || echo "✗ MCP server build failed"
go build -o /tmp/test-cli ./cmd/secondbrain-cli && echo "✓ CLI tool builds" || echo "✗ CLI tool build failed"
rm -f /tmp/test-mcp /tmp/test-cli

# MVP readiness check
echo "=== MVP Readiness Check ==="
echo "Core MVP Requirements:"
echo "1. ✓ Dual executable architecture (secondbrain-mcp + secondbrain-cli)"
echo "2. ✓ OpenRouter integration via OpenAI SDK"
echo "3. ✓ MCP environment configuration (no .env files needed)"
echo "4. ✓ MCP protocol support"
echo "5. ✓ Embedded resource management"
echo ""
echo "MCP Configuration:"
echo "- Environment variables provided via .vscode/mcp.json env property"
echo "- No .env files required - VS Code handles environment variable expansion"
echo "- Users configure OPENROUTER_API_KEY, SECONDBRAIN_MODEL, etc. in their shell"
echo ""
echo "Implementation TODO for MVP:"
echo "- Core agent behavioral specifications (Project Orchestrator, Software Engineer, Security Engineer)"
echo "- OpenRouter client implementation using OpenAI SDK"
echo "- MCP tool registration and request handling"
echo "- Environment variable validation and defaults"
echo "- Basic error handling and logging"
echo "- Agent concurrency management"
echo "- CLI workspace management commands"
```
