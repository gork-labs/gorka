package behavioral

import (
	"fmt"
	"os"

	"gorka/internal/utils"
	"gorka/internal/types"
)

// LoadBehavioralMatrix loads a behavioral matrix from file path
func LoadBehavioralMatrix(filePath string) (*types.BehavioralMatrix, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read behavioral matrix file: %w", err)
	}

	return utils.ParseBehavioralMatrix(data)
}
