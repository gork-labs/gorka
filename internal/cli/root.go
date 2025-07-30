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
	"strings"

	"gorka/internal/embedded"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "gorka",
	Short: "Gorka CLI management tool",
	Long:  "Gorka workspace and SecondBrain MCP",
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
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("Gorka CLI v0.1.0")
	},
}

var selfUpgradeCmd = &cobra.Command{
	Use:   "self-upgrade",
	Short: "Upgrade gorka and secondbrain-mcp to the latest version",
	Long:  "Download and run the latest installation script to upgrade both gorka and secondbrain-mcp binaries",
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
	Inputs  []MCPInput           `json:"inputs,omitempty"`
	Servers map[string]MCPServer `json:"servers"`
}

// MCPInput represents an input configuration for VS Code MCP
type MCPInput struct {
	Type        string `json:"type"`
	ID          string `json:"id"`
	Description string `json:"description"`
	Password    bool   `json:"password,omitempty"`
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

	fmt.Println("Installing Gorka workspace components...")
	fmt.Printf("Working directory: %s\n", cwd)

	// Step 1: Create .gorka directory structure
	fmt.Println("\n1. Setting up .gorka directory...")
	if err := setupGorkaDirectory(cwd); err != nil {
		return fmt.Errorf("failed to setup .gorka directory: %w", err)
	}

	// Step 2: Extract chatmodes to .github/chatmodes/
	fmt.Println("\n2. Extracting chatmodes...")
	if err := extractChatmodes(cwd); err != nil {
		return fmt.Errorf("failed to extract chatmodes: %w", err)
	}

	// Step 3: Create gorka.json in .vscode/
	fmt.Println("\n3. Creating Gorka configuration...")
	if err := createGorkaConfig(cwd); err != nil {
		return fmt.Errorf("failed to create gorka.json: %w", err)
	}

	// Step 4: Register MCP servers in .vscode/mcp.json
	fmt.Println("\n4. Configuring MCP servers...")
	if err := registerMCPServers(cwd); err != nil {
		return fmt.Errorf("failed to register MCP servers: %w", err)
	}

	fmt.Println("\n✅ All components installed successfully!")
	return nil
}

// extractChatmodes extracts chatmode files from embedded resources
func extractChatmodes(workspaceDir string) error {
	chatmodesDir := filepath.Join(workspaceDir, ".github", "chatmodes")
	fmt.Printf("   Creating directory: %s\n", chatmodesDir)
	if err := os.MkdirAll(chatmodesDir, 0755); err != nil {
		return fmt.Errorf("failed to create chatmodes directory: %w", err)
	}

	// Read all chatmode files from embedded resources
	entries, err := fs.ReadDir(embedded.ChatmodesFS, "embedded-resources/chatmodes")
	if err != nil {
		return fmt.Errorf("failed to read embedded chatmodes: %w", err)
	}

	var installedCount int
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

		fmt.Printf("   ✓ Installed chatmode: %s\n", entry.Name())
		installedCount++
	}

	fmt.Printf("   Installed %d chatmode files\n", installedCount)
	return nil
}

// createGorkaConfig creates the gorka.json configuration file
func createGorkaConfig(workspaceDir string) error {
	vscodeDir := filepath.Join(workspaceDir, ".vscode")
	fmt.Printf("   Creating directory: %s\n", vscodeDir)
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
	fmt.Printf("   ✓ Created gorka.json with %d servers, 1 input, and %d chatmodes\n", len(config.Servers), len(config.Chatmodes))
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
		Inputs: []MCPInput{
			{
				Type:        "promptString",
				ID:          "openrouter-api-key",
				Description: "OpenRouter API key for LLM access",
				Password:    true,
			},
		},
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
					"OPENROUTER_API_KEY":              "${input:openrouter-api-key}",
					"SECONDBRAIN_MODEL":               "qwen/qwen3-coder:free",
					"SECONDBRAIN_WORKSPACE":           "${workspaceFolder}",
					"SECONDBRAIN_MAX_PARALLEL_AGENTS": "3",
				},
			},
		},
	}

	var isUpdate bool
	// Check if mcp.json already exists
	if _, err := os.Stat(mcpPath); err == nil {
		isUpdate = true
		fmt.Printf("   Found existing mcp.json, merging configurations...\n")
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
			if existingServer, exists := existingConfig.Servers[name]; exists {
				// Server already exists, merge environment variables gracefully
				if existingServer.Env == nil {
					existingServer.Env = make(map[string]string)
				}

				// Only add new environment variables, don't override existing ones
				for envKey, envValue := range server.Env {
					if _, envExists := existingServer.Env[envKey]; !envExists {
						existingServer.Env[envKey] = envValue
					}
				}

				// Update command and args (these are safe to update)
				existingServer.Command = server.Command
				existingServer.Args = server.Args

				existingConfig.Servers[name] = existingServer
			} else {
				// New server, add it completely
				existingConfig.Servers[name] = server
			}
		}

		// Merge inputs - add new inputs that don't exist
		if existingConfig.Inputs == nil {
			existingConfig.Inputs = make([]MCPInput, 0)
		}
		
		for _, newInput := range mcpConfig.Inputs {
			found := false
			for i, existingInput := range existingConfig.Inputs {
				if existingInput.ID == newInput.ID {
					// Update existing input with new configuration
					existingConfig.Inputs[i] = newInput
					found = true
					break
				}
			}
			if !found {
				// Add new input
				existingConfig.Inputs = append(existingConfig.Inputs, newInput)
			}
		}
		
		mcpConfig = existingConfig
	} else {
		fmt.Printf("   Creating new mcp.json...\n")
	}

	// Write the configuration
	configJSON, err := json.MarshalIndent(mcpConfig, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal MCP config: %w", err)
	}

	if err := os.WriteFile(mcpPath, configJSON, 0644); err != nil {
		return fmt.Errorf("failed to write mcp.json: %w", err)
	}

	if isUpdate {
		fmt.Printf("   ✓ Updated mcp.json with %d MCP servers and %d inputs\n", len(mcpConfig.Servers), len(mcpConfig.Inputs))
	} else {
		fmt.Printf("   ✓ Created mcp.json with %d MCP servers and %d inputs\n", len(mcpConfig.Servers), len(mcpConfig.Inputs))
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

// setupGorkaDirectory creates the .gorka directory structure with proper gitignore configuration
func setupGorkaDirectory(workspaceDir string) error {
	gorkaDir := filepath.Join(workspaceDir, ".gorka")
	storageDir := filepath.Join(gorkaDir, "storage")
	thinkingDir := filepath.Join(storageDir, "thinking")

	// Create the directory structure
	fmt.Printf("   Creating directory: %s\n", thinkingDir)
	if err := os.MkdirAll(thinkingDir, 0755); err != nil {
		return fmt.Errorf("failed to create .gorka/storage/thinking directory: %w", err)
	}

	// Create .gitkeep to preserve the directory structure
	gitkeepPath := filepath.Join(thinkingDir, ".gitkeep")
	gitkeepContent := "# Keep this directory in version control\n# Thinking session files are ignored but directory structure is preserved\n"
	if err := os.WriteFile(gitkeepPath, []byte(gitkeepContent), 0644); err != nil {
		return fmt.Errorf("failed to create .gitkeep: %w", err)
	}
	fmt.Printf("   ✓ Created .gitkeep in thinking directory\n")

	// Create .gitignore to ignore thinking session files
	gitignorePath := filepath.Join(thinkingDir, ".gitignore")
	gitignoreContent := `# Ignore all thinking session files
*.json
!.gitkeep
`
	if err := os.WriteFile(gitignorePath, []byte(gitignoreContent), 0644); err != nil {
		return fmt.Errorf("failed to create .gitignore: %w", err)
	}
	fmt.Printf("   ✓ Created .gitignore to ignore thinking session files\n")

	// Also update the main .gitignore to ensure .gorka/storage/thinking/*.json is ignored
	mainGitignorePath := filepath.Join(workspaceDir, ".gitignore")
	if err := updateMainGitignore(mainGitignorePath); err != nil {
		fmt.Printf("   Warning: Could not update main .gitignore: %v\n", err)
	} else {
		fmt.Printf("   ✓ Updated main .gitignore with .gorka/storage/thinking/ ignore rules\n")
	}

	fmt.Printf("   Setup complete: .gorka directory structure ready\n")
	return nil
}

// updateMainGitignore adds .gorka/storage/thinking ignore rules to the main .gitignore
func updateMainGitignore(gitignorePath string) error {
	// Read existing .gitignore if it exists
	var existingContent []byte
	var err error
	if _, statErr := os.Stat(gitignorePath); statErr == nil {
		existingContent, err = os.ReadFile(gitignorePath)
		if err != nil {
			return fmt.Errorf("failed to read existing .gitignore: %w", err)
		}
	}

	existingStr := string(existingContent)

	// Check if .gorka rules already exist
	if strings.Contains(existingStr, ".gorka/storage/thinking/") {
		// Rules already exist, don't duplicate
		return nil
	}

	// Add .gorka ignore rules
	newRules := `
# Gorka storage - ignore thinking session files but keep directory structure
.gorka/storage/thinking/*.json
!.gorka/storage/thinking/.gitkeep
!.gorka/storage/thinking/.gitignore
`

	// Append to existing content
	updatedContent := existingStr + newRules

	// Write back to file
	if err := os.WriteFile(gitignorePath, []byte(updatedContent), 0644); err != nil {
		return fmt.Errorf("failed to write .gitignore: %w", err)
	}

	return nil
}
