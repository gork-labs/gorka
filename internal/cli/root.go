package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "secondbrain-cli",
	Short: "SecondBrain CLI management tool",
	Long:  "A CLI tool for managing SecondBrain MCP server workspace and configuration",
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the version number",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("SecondBrain CLI v0.1.0")
	},
}

func init() {
	rootCmd.AddCommand(versionCmd)
}

// Execute executes the root command
func Execute() error {
	return rootCmd.Execute()
}
