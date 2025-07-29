---
target_execution: "llm_agent_implementation"
implementation_domain: "generation_command"
---

# GENERATION COMMAND IMPLEMENTATION

## COMMAND_LINE_INTERFACE

File: `cmd/secondbrain-gen/main.go`

```go
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"gorka/internal/generation"
)

var (
	version = "dev"
	commit  = "unknown"
	date    = "unknown"
)

func main() {
	var (
		inputDir   = flag.String("input", "internal/embedded-resources/behavioral-specs", "Directory containing behavioral matrix JSON files")
		outputDir  = flag.String("output", "internal/embedded-resources/chatmodes", "Directory to write generated chatmode files")
		template   = flag.String("template", "", "Custom template file (uses embedded template if not specified)")
		verbose    = flag.Bool("verbose", false, "Enable verbose output")
		validate   = flag.Bool("validate", true, "Validate generated chatmodes")
		help       = flag.Bool("help", false, "Show help")
		versionFlag = flag.Bool("version", false, "Show version information")
	)

	// Short flags
	flag.StringVar(inputDir, "i", *inputDir, "Directory containing behavioral matrix JSON files (short)")
	flag.StringVar(outputDir, "o", *outputDir, "Directory to write generated chatmode files (short)")
	flag.StringVar(template, "t", *template, "Custom template file (short)")
	flag.BoolVar(verbose, "v", *verbose, "Enable verbose output (short)")

	flag.Parse()

	if *versionFlag {
		fmt.Printf("secondbrain-gen %s\n", version)
		fmt.Printf("  commit: %s\n", commit)
		fmt.Printf("  date: %s\n", date)
		os.Exit(0)
	}

	if *help {
		printHelp()
		os.Exit(0)
	}

	// Validate flags
	if *inputDir == "" {
		log.Fatal("Input directory cannot be empty")
	}
	if *outputDir == "" {
		log.Fatal("Output directory cannot be empty")
	}

	config := generation.Config{
		InputDir:  *inputDir,
		OutputDir: *outputDir,
		Template:  *template,
		Verbose:   *verbose,
		Validate:  *validate,
	}

	generator := generation.NewGenerator(config)

	if *verbose {
		fmt.Printf("Starting chatmode generation:\n")
		fmt.Printf("  Input:  %s\n", *inputDir)
		fmt.Printf("  Output: %s\n", *outputDir)
		if *template != "" {
			fmt.Printf("  Template: %s\n", *template)
		}
		fmt.Printf("  Validate: %t\n", *validate)
		fmt.Println()
	}

	if err := generator.GenerateAll(); err != nil {
		log.Fatalf("Generation failed: %v", err)
	}

	if *verbose {
		fmt.Printf("✓ Successfully generated chatmodes from %s to %s\n", *inputDir, *outputDir)
	}
}

func printHelp() {
	fmt.Println("secondbrain-gen - Generate VS Code chatmodes from behavioral matrices")
	fmt.Println("")
	fmt.Println("USAGE:")
	fmt.Println("  secondbrain-gen [flags]")
	fmt.Println("")
	fmt.Println("FLAGS:")
	flag.PrintDefaults()
	fmt.Println("")
	fmt.Println("EXAMPLES:")
	fmt.Println("  # Use defaults")
	fmt.Println("  secondbrain-gen")
	fmt.Println("")
	fmt.Println("  # Custom paths with verbose output")
	fmt.Println("  secondbrain-gen -i specs -o chatmodes -v")
	fmt.Println("")
	fmt.Println("  # Use custom template")
	fmt.Println("  secondbrain-gen -t custom-template.md")
	fmt.Println("")
	fmt.Println("  # Skip validation (faster)")
	fmt.Println("  secondbrain-gen --validate=false")
	fmt.Println("")
	fmt.Println("GO GENERATE INTEGRATION:")
	fmt.Println("  //go:generate go run ../../../cmd/secondbrain-gen")
	fmt.Println("  //go:generate go run ../../../cmd/secondbrain-gen --input=. --output=../chatmodes")
	fmt.Println("")
	fmt.Println("BUILD INTEGRATION:")
	fmt.Println("  make generate     # Regenerate all chatmodes")
	fmt.Println("  make build        # Build with fresh chatmodes")
	fmt.Println("")
	fmt.Println("For more information: https://github.com/gork-labs/gorka")
}
```

## ERROR_HANDLING_SYSTEM

File: `internal/generation/errors.go`

```go
package generation

import (
	"fmt"
	"strings"
)

// GenerationError represents a structured error during generation
type GenerationError struct {
	Type     ErrorType
	File     string
	Line     int
	Message  string
	Cause    error
	Context  map[string]string
}

type ErrorType string

const (
	ErrorTypeInput      ErrorType = "INPUT"
	ErrorTypeTemplate   ErrorType = "TEMPLATE"
	ErrorTypeGeneration ErrorType = "GENERATION"
	ErrorTypeValidation ErrorType = "VALIDATION"
	ErrorTypeOutput     ErrorType = "OUTPUT"
)

func (e *GenerationError) Error() string {
	var parts []string

	if e.File != "" {
		if e.Line > 0 {
			parts = append(parts, fmt.Sprintf("%s:%d", e.File, e.Line))
		} else {
			parts = append(parts, e.File)
		}
	}

	parts = append(parts, fmt.Sprintf("[%s]", e.Type))
	parts = append(parts, e.Message)

	if e.Cause != nil {
		parts = append(parts, fmt.Sprintf("(%v)", e.Cause))
	}

	return strings.Join(parts, " ")
}

func (e *GenerationError) Unwrap() error {
	return e.Cause
}

// NewInputError creates an input validation error
func NewInputError(file, message string, cause error) *GenerationError {
	return &GenerationError{
		Type:    ErrorTypeInput,
		File:    file,
		Message: message,
		Cause:   cause,
	}
}

// NewTemplateError creates a template processing error
func NewTemplateError(file, message string, line int, cause error) *GenerationError {
	return &GenerationError{
		Type:    ErrorTypeTemplate,
		File:    file,
		Line:    line,
		Message: message,
		Cause:   cause,
	}
}

// NewGenerationError creates a generation processing error
func NewGenerationError(file, message string, cause error) *GenerationError {
	return &GenerationError{
		Type:    ErrorTypeGeneration,
		File:    file,
		Message: message,
		Cause:   cause,
	}
}

// NewValidationError creates a validation error
func NewValidationError(file, message string, line int) *GenerationError {
	return &GenerationError{
		Type:    ErrorTypeValidation,
		File:    file,
		Line:    line,
		Message: message,
	}
}

// NewOutputError creates an output writing error
func NewOutputError(file, message string, cause error) *GenerationError {
	return &GenerationError{
		Type:    ErrorTypeOutput,
		File:    file,
		Message: message,
		Cause:   cause,
	}
}

// ErrorCollector collects multiple errors during generation
type ErrorCollector struct {
	errors []*GenerationError
}

func NewErrorCollector() *ErrorCollector {
	return &ErrorCollector{
		errors: make([]*GenerationError, 0),
	}
}

func (ec *ErrorCollector) Add(err *GenerationError) {
	ec.errors = append(ec.errors, err)
}

func (ec *ErrorCollector) AddInput(file, message string, cause error) {
	ec.Add(NewInputError(file, message, cause))
}

func (ec *ErrorCollector) AddTemplate(file, message string, line int, cause error) {
	ec.Add(NewTemplateError(file, message, line, cause))
}

func (ec *ErrorCollector) AddGeneration(file, message string, cause error) {
	ec.Add(NewGenerationError(file, message, cause))
}

func (ec *ErrorCollector) AddValidation(file, message string, line int) {
	ec.Add(NewValidationError(file, message, line))
}

func (ec *ErrorCollector) AddOutput(file, message string, cause error) {
	ec.Add(NewOutputError(file, message, cause))
}

func (ec *ErrorCollector) HasErrors() bool {
	return len(ec.errors) > 0
}

func (ec *ErrorCollector) Errors() []*GenerationError {
	return ec.errors
}

func (ec *ErrorCollector) Error() string {
	if len(ec.errors) == 0 {
		return "no errors"
	}

	var messages []string
	for _, err := range ec.errors {
		messages = append(messages, err.Error())
	}

	return fmt.Sprintf("%d error(s):\n%s", len(ec.errors), strings.Join(messages, "\n"))
}

// FormatErrors formats errors for human-readable output
func FormatErrors(errors []*GenerationError, verbose bool) string {
	if len(errors) == 0 {
		return ""
	}

	var output strings.Builder

	// Group errors by type
	errorsByType := make(map[ErrorType][]*GenerationError)
	for _, err := range errors {
		errorsByType[err.Type] = append(errorsByType[err.Type], err)
	}

	// Format each group
	for errorType, errs := range errorsByType {
		output.WriteString(fmt.Sprintf("\n%s ERRORS (%d):\n", errorType, len(errs)))

		for _, err := range errs {
			output.WriteString(fmt.Sprintf("  %s\n", err.Error()))

			if verbose && err.Context != nil {
				for key, value := range err.Context {
					output.WriteString(fmt.Sprintf("    %s: %s\n", key, value))
				}
			}
		}
	}

	return output.String()
}
```

## PERFORMANCE_OPTIMIZATION

File: `internal/generation/performance.go`

```go
package generation

import (
	"fmt"
	"runtime"
	"sync"
	"time"
)

// PerformanceMetrics tracks generation performance
type PerformanceMetrics struct {
	StartTime         time.Time
	EndTime           time.Time
	FilesProcessed    int
	FilesGenerated    int
	ValidationErrors  int
	MemoryUsed        uint64
	PeakMemoryUsed    uint64
	ConcurrentWorkers int
}

func (pm *PerformanceMetrics) Duration() time.Duration {
	return pm.EndTime.Sub(pm.StartTime)
}

func (pm *PerformanceMetrics) FilesPerSecond() float64 {
	duration := pm.Duration().Seconds()
	if duration == 0 {
		return 0
	}
	return float64(pm.FilesProcessed) / duration
}

func (pm *PerformanceMetrics) String() string {
	return fmt.Sprintf(
		"Performance: %d files in %v (%.1f files/sec), %d generated, %d errors, %.1fMB peak memory",
		pm.FilesProcessed,
		pm.Duration().Round(time.Millisecond),
		pm.FilesPerSecond(),
		pm.FilesGenerated,
		pm.ValidationErrors,
		float64(pm.PeakMemoryUsed)/1024/1024,
	)
}

// ParallelGenerator handles concurrent chatmode generation
type ParallelGenerator struct {
	config    Config
	metrics   *PerformanceMetrics
	semaphore chan struct{}
	wg        sync.WaitGroup
	mu        sync.Mutex
	errors    *ErrorCollector
}

func NewParallelGenerator(config Config) *ParallelGenerator {
	maxWorkers := runtime.NumCPU()
	if maxWorkers > 4 {
		maxWorkers = 4 // Reasonable limit for file generation
	}

	return &ParallelGenerator{
		config:    config,
		semaphore: make(chan struct{}, maxWorkers),
		errors:    NewErrorCollector(),
		metrics: &PerformanceMetrics{
			StartTime:         time.Now(),
			ConcurrentWorkers: maxWorkers,
		},
	}
}

func (pg *ParallelGenerator) GenerateAllParallel(files []string) error {
	pg.metrics.StartTime = time.Now()
	defer func() {
		pg.metrics.EndTime = time.Now()
	}()

	// Start memory monitoring
	go pg.monitorMemory()

	// Process files concurrently
	for _, file := range files {
		pg.wg.Add(1)
		go pg.processFile(file)
	}

	pg.wg.Wait()

	if pg.errors.HasErrors() {
		pg.metrics.ValidationErrors = len(pg.errors.Errors())
		return pg.errors
	}

	return nil
}

func (pg *ParallelGenerator) processFile(file string) {
	defer pg.wg.Done()

	// Acquire semaphore
	pg.semaphore <- struct{}{}
	defer func() { <-pg.semaphore }()

	// Update metrics
	pg.mu.Lock()
	pg.metrics.FilesProcessed++
	pg.mu.Unlock()

	// Generate chatmode (implementation would call the actual generator)
	if pg.config.Verbose {
		fmt.Printf("Processing %s\n", file)
	}

	// Simulate generation work
	// In real implementation, this would call the actual generation logic

	pg.mu.Lock()
	pg.metrics.FilesGenerated++
	pg.mu.Unlock()
}

func (pg *ParallelGenerator) monitorMemory() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			var m runtime.MemStats
			runtime.ReadMemStats(&m)

			pg.mu.Lock()
			pg.metrics.MemoryUsed = m.Alloc
			if m.Alloc > pg.metrics.PeakMemoryUsed {
				pg.metrics.PeakMemoryUsed = m.Alloc
			}
			pg.mu.Unlock()
		default:
			return
		}
	}
}

func (pg *ParallelGenerator) GetMetrics() *PerformanceMetrics {
	pg.mu.Lock()
	defer pg.mu.Unlock()
	return pg.metrics
}
```

## TESTING_FRAMEWORK

File: `internal/generation/testing.go`

```go
package generation

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestFixtures provides test data for generation testing
type TestFixtures struct {
	BehavioralSpecs map[string]map[string]interface{}
	Templates       map[string]string
	ExpectedOutputs map[string]string
}

func LoadTestFixtures(t *testing.T, fixturesDir string) *TestFixtures {
	fixtures := &TestFixtures{
		BehavioralSpecs: make(map[string]map[string]interface{}),
		Templates:       make(map[string]string),
		ExpectedOutputs: make(map[string]string),
	}

	// Load behavioral specs
	specsDir := filepath.Join(fixturesDir, "behavioral-specs")
	if err := filepath.WalkDir(specsDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if strings.HasSuffix(d.Name(), ".json") {
			data, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("Failed to read spec file %s: %v", path, err)
			}

			var spec map[string]interface{}
			if err := json.Unmarshal(data, &spec); err != nil {
				t.Fatalf("Failed to parse spec file %s: %v", path, err)
			}

			fixtures.BehavioralSpecs[d.Name()] = spec
		}
		return nil
	}); err != nil {
		t.Fatalf("Failed to load behavioral specs: %v", err)
	}

	// Load templates
	templatesDir := filepath.Join(fixturesDir, "templates")
	if err := filepath.WalkDir(templatesDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if strings.HasSuffix(d.Name(), ".md") {
			data, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("Failed to read template file %s: %v", path, err)
			}
			fixtures.Templates[d.Name()] = string(data)
		}
		return nil
	}); err != nil {
		t.Fatalf("Failed to load templates: %v", err)
	}

	// Load expected outputs
	outputsDir := filepath.Join(fixturesDir, "expected-outputs")
	if err := filepath.WalkDir(outputsDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if strings.HasSuffix(d.Name(), ".md") {
			data, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("Failed to read expected output file %s: %v", path, err)
			}
			fixtures.ExpectedOutputs[d.Name()] = string(data)
		}
		return nil
	}); err != nil {
		t.Fatalf("Failed to load expected outputs: %v", err)
	}

	return fixtures
}

// GenerationTestCase represents a single test case for generation
type GenerationTestCase struct {
	Name            string
	BehavioralSpec  string
	Template        string
	ExpectedOutput  string
	ShouldFail      bool
	ExpectedErrors  []string
}

// RunGenerationTest executes a generation test case
func RunGenerationTest(t *testing.T, testCase GenerationTestCase, fixtures *TestFixtures) {
	t.Run(testCase.Name, func(t *testing.T) {
		// Create temporary directories
		tempDir := t.TempDir()
		inputDir := filepath.Join(tempDir, "input")
		outputDir := filepath.Join(tempDir, "output")

		if err := os.MkdirAll(inputDir, 0755); err != nil {
			t.Fatalf("Failed to create input directory: %v", err)
		}
		if err := os.MkdirAll(outputDir, 0755); err != nil {
			t.Fatalf("Failed to create output directory: %v", err)
		}

		// Write behavioral spec
		specData, ok := fixtures.BehavioralSpecs[testCase.BehavioralSpec]
		if !ok {
			t.Fatalf("Behavioral spec %s not found in fixtures", testCase.BehavioralSpec)
		}

		specBytes, err := json.MarshalIndent(specData, "", "  ")
		if err != nil {
			t.Fatalf("Failed to marshal behavioral spec: %v", err)
		}

		specFile := filepath.Join(inputDir, testCase.BehavioralSpec)
		if err := os.WriteFile(specFile, specBytes, 0644); err != nil {
			t.Fatalf("Failed to write behavioral spec: %v", err)
		}

		// Setup generator config
		config := Config{
			InputDir:  inputDir,
			OutputDir: outputDir,
			Verbose:   true,
			Validate:  true,
		}

		if testCase.Template != "" {
			templateData, ok := fixtures.Templates[testCase.Template]
			if !ok {
				t.Fatalf("Template %s not found in fixtures", testCase.Template)
			}

			templateFile := filepath.Join(tempDir, testCase.Template)
			if err := os.WriteFile(templateFile, []byte(templateData), 0644); err != nil {
				t.Fatalf("Failed to write template: %v", err)
			}
			config.Template = templateFile
		}

		// Run generation
		generator := NewGenerator(config)
		err = generator.GenerateAll()

		// Check results
		if testCase.ShouldFail {
			if err == nil {
				t.Fatalf("Expected generation to fail, but it succeeded")
			}

			// Check for expected error messages
			for _, expectedError := range testCase.ExpectedErrors {
				if !strings.Contains(err.Error(), expectedError) {
					t.Errorf("Expected error message to contain %q, but got: %v", expectedError, err)
				}
			}
		} else {
			if err != nil {
				t.Fatalf("Generation failed unexpectedly: %v", err)
			}

			// Compare output with expected
			if testCase.ExpectedOutput != "" {
				expectedData, ok := fixtures.ExpectedOutputs[testCase.ExpectedOutput]
				if !ok {
					t.Fatalf("Expected output %s not found in fixtures", testCase.ExpectedOutput)
				}

				// Find generated file
				outputFiles, err := filepath.Glob(filepath.Join(outputDir, "*.chatmode.md"))
				if err != nil {
					t.Fatalf("Failed to scan output directory: %v", err)
				}
				if len(outputFiles) != 1 {
					t.Fatalf("Expected exactly 1 output file, got %d", len(outputFiles))
				}

				actualData, err := os.ReadFile(outputFiles[0])
				if err != nil {
					t.Fatalf("Failed to read generated file: %v", err)
				}

				if strings.TrimSpace(string(actualData)) != strings.TrimSpace(expectedData) {
					t.Errorf("Generated output does not match expected:\nExpected:\n%s\n\nActual:\n%s", expectedData, string(actualData))
				}
			}
		}
	})
}
```

## CLI_INTEGRATION_EXAMPLES

```bash
# Basic usage examples
secondbrain-gen                                    # Use defaults
secondbrain-gen -v                                 # Verbose output
secondbrain-gen -i specs -o chatmodes             # Custom paths
secondbrain-gen --validate=false                  # Skip validation
secondbrain-gen -t custom-template.md             # Custom template

# Development workflow integration
//go:generate secondbrain-gen                     # Go generate directive
//go:generate secondbrain-gen -i . -o ../../agents # Relative paths

# CI/CD integration
secondbrain-gen --validate                        # Validation mode
if ! secondbrain-gen --validate; then
  echo "Generation validation failed"
  exit 1
fi

# Performance monitoring
time secondbrain-gen -v                           # Monitor execution time
secondbrain-gen -v | grep "Performance:"          # Extract metrics

# Error handling
secondbrain-gen 2>&1 | grep "ERROR"              # Filter errors
secondbrain-gen || echo "Generation failed: $?"   # Check exit code
```
