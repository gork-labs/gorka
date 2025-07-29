#!/bin/bash

# Gorka - Agent System Installer
# Usage: gorka install [global|workspace]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="$(dirname "$SCRIPT_DIR")"

# GitHub repository configuration
GITHUB_REPO="gork-labs/gorka"
GITHUB_BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1" >&2
}

# Function to detect system architecture
detect_platform() {
    local os
    local arch

    case "$(uname)" in
        "Darwin")
            os="darwin"
            ;;
        "Linux")
            os="linux"
            ;;
        *)
            print_error "Unsupported operating system: $(uname)"
            return 1
            ;;
    esac

    case "$(uname -m)" in
        "x86_64"|"amd64")
            arch="amd64"
            ;;
        "arm64"|"aarch64")
            arch="arm64"
            ;;
        *)
            print_error "Unsupported architecture: $(uname -m)"
            return 1
            ;;
    esac

    echo "${os}_${arch}"
}

# Function to install workspace configuration
install() {
    print_step "Installing secondbrain-cli, secondbrain-mcp binaries and gorka script..."

    # Create local bin directory
    local local_bin="$HOME/.local/bin"
    mkdir -p "$local_bin"

    # Detect platform
    local platform
    platform=$(detect_platform)
    if [ $? -ne 0 ]; then
        exit 1
    fi

    # Get latest release info from GitHub API
    print_info "Checking for latest release..."
    local release_info
    release_info=$(curl -s "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$release_info" ]; then
        print_error "Failed to fetch release information from GitHub"
        exit 1
    fi

    # Extract download URL for the platform-specific binary
    local binary_name="secondbrain-mcp_${platform}"
    local download_url
    download_url=$(echo "$release_info" | grep -o "\"browser_download_url\": \"[^\"]*${binary_name}[^\"]*\"" | cut -d'"' -f4)

    if [ -z "$download_url" ]; then
        print_error "No binary found for platform: $platform"
        exit 1
    fi

    # Download the binary
    local binary_path="$local_bin/secondbrain-mcp"
    print_info "Downloading secondbrain-mcp binary from: $download_url"

    if ! curl -L -o "$binary_path" "$download_url" 2>/dev/null; then
        print_error "Failed to download secondbrain-mcp binary"
        exit 1
    fi

    chmod +x "$binary_path"
    print_success "secondbrain-mcp binary downloaded successfully to $binary_path"

    # Extract download URL for secondbrain-cli binary
    local cli_binary_name="secondbrain-cli_${platform}"
    local cli_download_url
    cli_download_url=$(echo "$release_info" | grep -o "\"browser_download_url\": \"[^\"]*${cli_binary_name}[^\"]*\"" | cut -d'"' -f4)

    if [ -z "$cli_download_url" ]; then
        print_error "No secondbrain-cli binary found for platform: $platform"
        exit 1
    fi

    # Download the secondbrain-cli binary
    local cli_binary_path="$local_bin/secondbrain-cli"
    print_info "Downloading secondbrain-cli binary from: $cli_download_url"

    if ! curl -L -o "$cli_binary_path" "$cli_download_url" 2>/dev/null; then
        print_error "Failed to download secondbrain-cli binary"
        exit 1
    fi

    chmod +x "$cli_binary_path"
    print_success "secondbrain-cli binary downloaded successfully to $cli_binary_path"

    # Extract download URL for the gorka script
    local gorka_download_url
    gorka_download_url=$(echo "$release_info" | grep -o "\"browser_download_url\": \"[^\"]*gorka[^\"]*\"" | cut -d'"' -f4)

    if [ -n "$gorka_download_url" ]; then
        # Download the gorka script
        local gorka_path="$local_bin/gorka"
        print_info "Downloading gorka script from: $gorka_download_url"

        if ! curl -L -o "$gorka_path" "$gorka_download_url" 2>/dev/null; then
            print_warning "Failed to download gorka script, using current version"
            cp "$0" "$gorka_path"
        fi

        chmod +x "$gorka_path"
        print_success "gorka script installed to $gorka_path"
    else
        print_info "No gorka script found in release, copying current version"
        cp "$0" "$local_bin/gorka"
        chmod +x "$local_bin/gorka"
        print_success "gorka script copied to $local_bin/gorka"
    fi

    # Check if ~/.local/bin is in PATH
    if ! echo "$PATH" | grep -q "$local_bin"; then
        print_warning "IMPORTANT: $local_bin is not in your PATH"
        print_info ""
        print_info "To use the installed tools, add this line to your shell profile:"
        print_info ""
        
        # Detect shell and provide specific instructions
        if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
            print_info "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"
            print_info "  source ~/.zshrc"
        elif [ -n "$BASH_VERSION" ] || [ "$SHELL" = "/bin/bash" ] || [ "$SHELL" = "/usr/bin/bash" ]; then
            print_info "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
            print_info "  source ~/.bashrc"
        else
            print_info "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.profile"
            print_info "  source ~/.profile"
        fi
        print_info ""
    fi

    print_success "Installation completed successfully!"
    print_info ""
    print_info "Installed tools:"
    print_info "  • secondbrain-cli - Main CLI interface"
    print_info "  • secondbrain-mcp - MCP server for VS Code"
    print_info "  • gorka - Management script"
    print_info ""
    
    if echo "$PATH" | grep -q "$local_bin"; then
        print_info "✓ Tools are ready to use:"
        print_info "  secondbrain-cli --help"
        print_info "  gorka --help"
    else
        print_warning "⚠ Please update your PATH first (see instructions above), then:"
        print_info "  secondbrain-cli --help"
        print_info "  gorka --help"
    fi
}

# Run installation
install
