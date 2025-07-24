#!/bin/bash

# Gorka Setup Script
# Downloads and installs the gorka CLI tool from GitHub

set -e

# Configuration
GITHUB_REPO="bohdan-gork/agents"  # Update this to your actual GitHub repo
GITHUB_BRANCH="main"
GORKA_URL="https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/bin/gorka"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to determine the best local bin directory
get_local_bin_dir() {
    case "$(uname)" in
        "Darwin"|"Linux")
            # Check if ~/.local/bin exists (common on Linux)
            if [ -d "$HOME/.local/bin" ]; then
                echo "$HOME/.local/bin"
                return
            fi

            # Check if ~/bin exists (common on some systems)
            if [ -d "$HOME/bin" ]; then
                echo "$HOME/bin"
                return
            fi

            # Default to ~/.local/bin and create it
            echo "$HOME/.local/bin"
            ;;
        *)
            print_error "Unsupported operating system: $(uname)"
            exit 1
            ;;
    esac
}

# Function to check if directory is in PATH
is_in_path() {
    local dir="$1"
    case ":$PATH:" in
        *":$dir:"*) return 0 ;;
        *) return 1 ;;
    esac
}

# Function to add directory to PATH in shell profile
add_to_path() {
    local bin_dir="$1"
    local shell_name=$(basename "$SHELL")
    local profile_file=""

    case "$shell_name" in
        "bash")
            if [ -f "$HOME/.bash_profile" ]; then
                profile_file="$HOME/.bash_profile"
            elif [ -f "$HOME/.bashrc" ]; then
                profile_file="$HOME/.bashrc"
            else
                profile_file="$HOME/.bash_profile"
            fi
            ;;
        "zsh")
            profile_file="$HOME/.zshrc"
            ;;
        "fish")
            # Fish uses a different syntax
            if command -v fish >/dev/null 2>&1; then
                fish -c "fish_add_path $bin_dir" 2>/dev/null || true
                print_info "Added $bin_dir to fish PATH"
                return
            fi
            ;;
        *)
            profile_file="$HOME/.profile"
            ;;
    esac

    if [ -n "$profile_file" ]; then
        if ! grep -q "export PATH.*$bin_dir" "$profile_file" 2>/dev/null; then
            echo "" >> "$profile_file"
            echo "# Added by gorka setup" >> "$profile_file"
            echo "export PATH=\"$bin_dir:\$PATH\"" >> "$profile_file"
            print_info "Added $bin_dir to PATH in $profile_file"
            print_warning "Please restart your shell or run: source $profile_file"
        fi
    fi
}

# Main installation function
install_gorka() {
    print_info "Starting gorka installation..."

    # Check if curl or wget is available
    if command -v curl >/dev/null 2>&1; then
        DOWNLOAD_CMD="curl -fsSL"
    elif command -v wget >/dev/null 2>&1; then
        DOWNLOAD_CMD="wget -qO-"
    else
        print_error "Neither curl nor wget is available. Please install one of them."
        exit 1
    fi

    # Determine installation directory
    BIN_DIR=$(get_local_bin_dir)
    print_info "Installing to: $BIN_DIR"

    # Create the directory if it doesn't exist
    if [ ! -d "$BIN_DIR" ]; then
        print_info "Creating directory: $BIN_DIR"
        mkdir -p "$BIN_DIR"
    fi

    # Download gorka
    print_info "Downloading gorka from GitHub..."
    GORKA_PATH="$BIN_DIR/gorka"

    if $DOWNLOAD_CMD "$GORKA_URL" > "$GORKA_PATH"; then
        print_success "Downloaded gorka successfully"
    else
        print_error "Failed to download gorka from $GORKA_URL"
        print_error "Please check your internet connection and that the repository exists"
        exit 1
    fi

    # Make it executable
    chmod +x "$GORKA_PATH"
    print_success "Made gorka executable"

    # Check if the bin directory is in PATH
    if ! is_in_path "$BIN_DIR"; then
        print_warning "Directory $BIN_DIR is not in your PATH"
        add_to_path "$BIN_DIR"
    else
        print_success "Directory $BIN_DIR is already in your PATH"
    fi

    # Verify installation
    if [ -x "$GORKA_PATH" ]; then
        print_success "Gorka installed successfully to $GORKA_PATH"
        print_info "You can now run: gorka install"

        # Test if gorka is accessible via PATH
        if command -v gorka >/dev/null 2>&1; then
            print_success "Gorka is accessible via PATH"
        else
            print_warning "Gorka is not yet accessible via PATH. You may need to restart your shell."
        fi
    else
        print_error "Installation failed - gorka is not executable"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Gorka Setup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -f, --force    Force reinstallation even if gorka already exists"
    echo ""
    echo "This script will:"
    echo "  1. Download the gorka CLI tool from GitHub"
    echo "  2. Install it to your local bin directory (~/.local/bin or ~/bin)"
    echo "  3. Ensure the bin directory is in your PATH"
    echo ""
}

# Parse command line arguments
FORCE_INSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -f|--force)
            FORCE_INSTALL=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Check if gorka is already installed
if command -v gorka >/dev/null 2>&1 && [ "$FORCE_INSTALL" = false ]; then
    EXISTING_GORKA=$(command -v gorka)
    print_warning "Gorka is already installed at: $EXISTING_GORKA"
    print_info "Use --force to reinstall"
    exit 0
fi

# Run the installation
install_gorka

print_success "Setup complete!"
echo ""
print_info "Next steps:"
echo "  1. Restart your shell or run: source ~/.zshrc (or your shell's profile)"
echo "  2. Run: gorka install"
echo "  3. Enjoy using the gorka agent system!"
