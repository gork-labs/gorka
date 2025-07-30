package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"

	"gorka/internal/embedded"
	"gorka/internal/types"
)

// LoadCoreSystemPrinciples loads all system instructions from embedded resources
func LoadCoreSystemPrinciples() (string, error) {
	// Read all files in the instructions directory
	entries, err := embedded.InstructionsFS.ReadDir("embedded-resources/instructions")
	if err != nil {
		return "", fmt.Errorf("failed to read instructions directory: %w", err)
	}

	// Collect all .md instruction files
	var instructionFiles []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".md") {
			instructionFiles = append(instructionFiles, entry.Name())
		}
	}

	// Sort filenames for consistent ordering
	sort.Strings(instructionFiles)

	var result strings.Builder

	// Load and concatenate all instruction files
	for i, filename := range instructionFiles {
		if i > 0 {
			result.WriteString("\n\n")
		}

		// Add file header for clarity
		result.WriteString(fmt.Sprintf("# Instructions from: %s\n\n", filename))

		// Read file content
		content, err := embedded.InstructionsFS.ReadFile("embedded-resources/instructions/" + filename)
		if err != nil {
			return "", fmt.Errorf("failed to read instruction file %s: %w", filename, err)
		}

		result.WriteString(string(content))
	}

	return result.String(), nil
}

// ParseBehavioralMatrix parses a behavioral matrix from JSON data
func ParseBehavioralMatrix(data []byte) (*types.BehavioralMatrix, error) {
	var matrix types.BehavioralMatrix
	if err := json.Unmarshal(data, &matrix); err != nil {
		return nil, fmt.Errorf("failed to parse behavioral matrix: %w", err)
	}
	return &matrix, nil
}

// GetBehavioralMatrixFromEmbedded loads a behavioral matrix from embedded resources
func GetBehavioralMatrixFromEmbedded(agentID string) (*types.BehavioralMatrix, error) {
	// Browse all behavioral spec files dynamically using go:embed
	entries, err := embedded.BehavioralSpecsFS.ReadDir("embedded-resources/behavioral-specs")
	if err != nil {
		return nil, fmt.Errorf("failed to read behavioral specs directory: %w", err)
	}

	// Find matching behavioral spec file dynamically
	for _, entry := range entries {
		if strings.Contains(entry.Name(), agentID) && strings.HasSuffix(entry.Name(), ".json") {
			content, err := embedded.BehavioralSpecsFS.ReadFile("embedded-resources/behavioral-specs/" + entry.Name())
			if err != nil {
				return nil, fmt.Errorf("failed to read behavioral spec: %w", err)
			}

			return ParseBehavioralMatrix(content)
		}
	}

	return nil, fmt.Errorf("behavioral matrix for agent %s not found in embedded resources", agentID)
}

// IsBinaryFile checks if a file is likely binary by looking for null bytes in the first 512 bytes.
func IsBinaryFile(file *os.File) (bool, error) {
	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && err != io.EOF {
		return false, err
	}

	// Rewind the file pointer so the caller can read from the beginning.
	if _, err := file.Seek(0, 0); err != nil {
		return false, err
	}

	return bytes.Contains(buffer[:n], []byte{0}), nil
}