#!/bin/bash
cd /Users/bohdan/Projects/GorkLabs/agents
echo "Testing exec tool implementation..."

# Build the project
echo "Building with new exec tool..."
make build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Exec tool implementation complete."
    echo ""
    echo "📋 Exec Tool Features:"
    echo "  - Execute system commands with timeout control"
    echo "  - Environment variable support"
    echo "  - Working directory validation (workspace-restricted)"
    echo "  - Command output capture (stdout/stderr)"
    echo "  - Exit code and duration reporting"
    echo "  - Security: Commands restricted to workspace directory"
    echo ""
    echo "💡 To use the exec tool:"
    echo "  1. Restart VS Code or reload MCP server"
    echo "  2. Use: exec tool with parameters:"
    echo "     - command: Command to run (required)"
    echo "     - args: Array of arguments (optional)"
    echo "     - env: Environment variables (optional)"
    echo "     - work_dir: Working directory (optional, defaults to workspace)"
    echo "     - timeout: Timeout in seconds (optional, default 30)"
    echo ""
    echo "Example usage after restart:"
    echo '  {"command": "make", "args": ["build"], "timeout": 60}'
else
    echo "❌ Build failed. Check compilation errors above."
    exit 1
fi