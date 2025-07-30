package file

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGrepSearchBinaryProtection(t *testing.T) {
	// Create a temporary directory for tests
	tmpDir, err := os.MkdirTemp("", "grep_binary_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create file tools instance
	ft := NewFileTools(tmpDir)

	// Create a text file
	textFile := filepath.Join(tmpDir, "test.txt")
	textContent := "Hello, World!\nThis is a test file with searchable content."
	if err := os.WriteFile(textFile, []byte(textContent), 0644); err != nil {
		t.Fatalf("Failed to create text file: %v", err)
	}

	// Create a binary file
	binaryFile := filepath.Join(tmpDir, "test.bin")
	binaryContent := []byte{0x00, 0x01, 0x02, 0x00, 0x03, 0x04, 'H', 'e', 'l', 'l', 'o', 0x00}
	if err := os.WriteFile(binaryFile, binaryContent, 0644); err != nil {
		t.Fatalf("Failed to create binary file: %v", err)
	}

	// Test grep search for "Hello" - should only find it in text file, not binary
	req := GrepSearchRequest{
		Query:      "Hello",
		IsRegexp:   false,
		MaxResults: 10,
	}

	result, err := ft.GrepSearch(req)
	if err != nil {
		t.Fatalf("GrepSearch failed: %v", err)
	}

	// Should find match in text file but not in binary file
	if len(result.Matches) != 1 {
		t.Errorf("Expected 1 match, got %d. Matches: %+v", len(result.Matches), result.Matches)
	}

	if len(result.Matches) > 0 && result.Matches[0].FilePath != "test.txt" {
		t.Errorf("Expected match in test.txt, got %s", result.Matches[0].FilePath)
	}
}

func TestReadFileBinaryProtection(t *testing.T) {
	// Create a temporary directory for tests
	tmpDir, err := os.MkdirTemp("", "read_binary_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create file tools instance
	ft := NewFileTools(tmpDir)

	// Create a binary file
	binaryFile := filepath.Join(tmpDir, "test.bin")
	binaryContent := []byte{0x00, 0x01, 0x02, 0x00, 0x03, 0x04}
	if err := os.WriteFile(binaryFile, binaryContent, 0644); err != nil {
		t.Fatalf("Failed to create binary file: %v", err)
	}

	// Test reading binary file - should fail
	req := ReadFileRequest{
		FilePath:  binaryFile,
		StartLine: 1,
		EndLine:   0,
	}

	_, err = ft.ReadFile(req)
	if err == nil {
		t.Error("ReadFile should have failed for binary file")
	}
	if err != nil && !strings.Contains(err.Error(), "cannot read binary file") {
		t.Errorf("Expected binary file error, got: %v", err)
	}
}

func TestReplaceStringBinaryProtection(t *testing.T) {
	// Create a temporary directory for tests
	tmpDir, err := os.MkdirTemp("", "replace_binary_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create file tools instance
	ft := NewFileTools(tmpDir)

	// Create a binary file
	binaryFile := filepath.Join(tmpDir, "test.bin")
	binaryContent := []byte{0x00, 0x01, 0x02, 0x00, 0x03, 0x04}
	if err := os.WriteFile(binaryFile, binaryContent, 0644); err != nil {
		t.Fatalf("Failed to create binary file: %v", err)
	}

	// Test replacing string in binary file - should fail
	req := ReplaceStringRequest{
		FilePath:  binaryFile,
		OldString: "test",
		NewString: "replacement",
	}

	_, err = ft.ReplaceString(req)
	if err == nil {
		t.Error("ReplaceString should have failed for binary file")
	}
	if err != nil && !strings.Contains(err.Error(), "cannot replace string in binary file") {
		t.Errorf("Expected binary file error, got: %v", err)
	}
}