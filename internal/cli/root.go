package cli

import (
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/spf13/cobra"
	"gorka/internal/embedded"
)

var rootCmd = &cobra.Command{
	Use:   "secondbrain-cli",
	Short: "SecondBrain CLI management tool",
	Long:  "A CLI tool for managing SecondBrain MCP server workspace and configuration",
}

var componentsCmd = &cobra.Command{
	Use:   "components",
	Short: "Manage workspace components",
	Long:  "Commands for managing Gorka workspace components and configurations",
}

var componentsInstallCmd = &cobra.Command{
	Use:   "install",
	Short: "Install Gorka workspace components",
	Long:  "Install Gorka chatmodes to .github/chatmodes and configure VS Code MCP settings",
	Run: func(cmd *cobra.Command, args []string) {
		if err := installComponents(); err != nil {
			fmt.Printf("Error installing components: %v\n", err)
			return
		}
		fmt.Println("Gorka components installed successfully!")
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("SecondBrain CLI v0.1.0")
	},
}

var selfUpgradeCmd = &cobra.Command{
	Use:   "self-upgrade",
	Short: "Upgrade secondbrain-cli and secondbrain-mcp to the latest version",
	Long:  "Download and run the latest installation script to upgrade both secondbrain-cli and secondbrain-mcp binaries",
	Run: func(cmd *cobra.Command, args []string) {
		if err := performSelfUpgrade(); err != nil {
			fmt.Printf("Error during self-upgrade: %v\n", err)
			return
		}
		fmt.Println("Self-upgrade completed successfully!")
	},
}

func init() {
	componentsCmd.AddCommand(componentsInstallCmd)
	rootCmd.AddCommand(componentsCmd)
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(selfUpgradeCmd)
}

// Execute executes the root command
func Execute() error {
	return rootCmd.Execute()
}

// GorkaConfig represents the structure of gorka.json
type GorkaConfig struct {
	Servers   []string `json:"servers"`
	Inputs    []string `json:"inputs"`
	Chatmodes []string `json:"chatmodes"`
}

// MCPConfig represents the structure of mcp.json for VS Code
type MCPConfig struct {
	Servers map[string]MCPServer `json:"servers"`
}

// MCPServer represents a single MCP server configuration
type MCPServer struct {
	Command string            `json:"command"`
	Args    []string          `json:"args,omitempty"`
	Env     map[string]string `json:"env,omitempty"`
}

// installComponents implements the components install command
func installComponents() error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	// Step 1: Extract chatmodes to .github/chatmodes/
	if err := extractChatmodes(cwd); err != nil {
		return fmt.Errorf("failed to extract chatmodes: %w", err)
	}

	// Step 2: Create gorka.json in .vscode/
	if err := createGorkaConfig(cwd); err != nil {
		return fmt.Errorf("failed to create gorka.json: %w", err)
	}

	// Step 3: Register MCP servers in .vscode/mcp.json
	if err := registerMCPServers(cwd); err != nil {
		return fmt.Errorf("failed to register MCP servers: %w", err)
	}

	return nil
}

// extractChatmodes extracts chatmode files from embedded resources
func extractChatmodes(workspaceDir string) error {
	chatmodesDir := filepath.Join(workspaceDir, ".github", "chatmodes")
	if err := os.MkdirAll(chatmodesDir, 0755); err != nil {
		return fmt.Errorf("failed to create chatmodes directory: %w", err)
	}

	// Read all chatmode files from embedded resources
	entries, err := fs.ReadDir(embedded.ChatmodesFS, "embedded-resources/chatmodes")
	if err != nil {
		return fmt.Errorf("failed to read embedded chatmodes: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		// Read the embedded file
		content, err := fs.ReadFile(embedded.ChatmodesFS, "embedded-resources/chatmodes/"+entry.Name())
		if err != nil {
			return fmt.Errorf("failed to read embedded chatmode %s: %w", entry.Name(), err)
		}

		// Write to target directory
		targetPath := filepath.Join(chatmodesDir, entry.Name())
		if err := os.WriteFile(targetPath, content, 0644); err != nil {
			return fmt.Errorf("failed to write chatmode %s: %w", entry.Name(), err)
		}
	}

	return nil
}

// createGorkaConfig creates the gorka.json configuration file
func createGorkaConfig(workspaceDir string) error {
	vscodeDir := filepath.Join(workspaceDir, ".vscode")
	if err := os.MkdirAll(vscodeDir, 0755); err != nil {
		return fmt.Errorf("failed to create .vscode directory: %w", err)
	}

	// Get list of chatmode files
	chatmodes, err := getChatmodesList()
	if err != nil {
		return fmt.Errorf("failed to get chatmodes list: %w", err)
	}

	config := GorkaConfig{
		Servers: []string{
			"context7",
			"deepwiki",
			"git", 
			"secondbrain",
		},
		Inputs: []string{
			"openrouter-api-key",
		},
		Chatmodes: chatmodes,
	}

	configJSON, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal gorka config: %w", err)
	}

	configPath := filepath.Join(vscodeDir, "gorka.json")
	if err := os.WriteFile(configPath, configJSON, 0644); err != nil {
		return fmt.Errorf("failed to write gorka.json: %w", err)
	}

	return nil
}

// registerMCPServers creates or updates the mcp.json file
func registerMCPServers(workspaceDir string) error {
	vscodeDir := filepath.Join(workspaceDir, ".vscode")
	mcpPath := filepath.Join(vscodeDir, "mcp.json")

	// Create default MCP configuration
	mcpConfig := MCPConfig{
		Servers: map[string]MCPServer{
			"context7": {
				Command: "uvx",
				Args:    []string{"mcp-server-context7"},
			},
			"deepwiki": {
				Command: "npx",
				Args:    []string{"-y", "@deepwiki/mcp-server"},
			},
			"git": {
				Command: "uvx",
				Args:    []string{"mcp-server-git", "--repository", "${workspaceFolder}"},
			},
			"secondbrain": {
				Command: "secondbrain-mcp",
				Args:    []string{},
				Env: map[string]string{
					"OPENROUTER_API_KEY":               "${OPENROUTER_API_KEY}",
					"SECONDBRAIN_MODEL":                "anthropic/claude-3.5-sonnet",
					"SECONDBRAIN_WORKSPACE":            "${workspaceFolder}",
					"SECONDBRAIN_MAX_PARALLEL_AGENTS":  "3",
				},
			},
		},
	}

	// Check if mcp.json already exists
	if _, err := os.Stat(mcpPath); err == nil {
		// File exists, read and merge
		existingData, err := os.ReadFile(mcpPath)
		if err != nil {
			return fmt.Errorf("failed to read existing mcp.json: %w", err)
		}

		var existingConfig MCPConfig
		if err := json.Unmarshal(existingData, &existingConfig); err != nil {
			return fmt.Errorf("failed to parse existing mcp.json: %w", err)
		}

		// Merge configurations - preserve existing servers, add/update Gorka servers
		for name, server := range mcpConfig.Servers {
			existingConfig.Servers[name] = server
		}
		mcpConfig = existingConfig
	}

	// Write the configuration
	configJSON, err := json.MarshalIndent(mcpConfig, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal MCP config: %w", err)
	}

	if err := os.WriteFile(mcpPath, configJSON, 0644); err != nil {
		return fmt.Errorf("failed to write mcp.json: %w", err)
	}

	return nil
}

// getChatmodesList returns the list of available chatmode files
func getChatmodesList() ([]string, error) {
	var chatmodes []string

	entries, err := fs.ReadDir(embedded.ChatmodesFS, "embedded-resources/chatmodes")
	if err != nil {
		return nil, fmt.Errorf("failed to read embedded chatmodes: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".md" {
			chatmodes = append(chatmodes, entry.Name())
		}
	}

	return chatmodes, nil
}

// performSelfUpgrade downloads and executes the install script to upgrade the binaries
func performSelfUpgrade() error {
	const installScriptURL = "https://raw.githubusercontent.com/gork-labs/gorka/main/install.sh"
	
	fmt.Println("Downloading latest installation script...")
	
	// Download the install script
	resp, err := http.Get(installScriptURL)
	if err != nil {
		return fmt.Errorf("failed to download install script: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download install script: HTTP %d", resp.StatusCode)
	}
	
	// Create temporary file for the script
	tmpFile, err := os.CreateTemp("", "gorka-install-*.sh")
	if err != nil {
		return fmt.Errorf("failed to create temporary file: %w", err)
	}
	defer os.Remove(tmpFile.Name()) // Clean up
	defer tmpFile.Close()
	
	// Copy script content to temporary file
	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		return fmt.Errorf("failed to write install script: %w", err)
	}
	
	// Close the file before making it executable
	tmpFile.Close()
	
	// Make the script executable
	if err := os.Chmod(tmpFile.Name(), 0755); err != nil {
		return fmt.Errorf("failed to make script executable: %w", err)
	}
	
	fmt.Println("Running installation script...")
	
	// Execute the install script
	cmd := exec.Command("/bin/bash", tmpFile.Name())
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to execute install script: %w", err)
	}
	
	return nil
}
