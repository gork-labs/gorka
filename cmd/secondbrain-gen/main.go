package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"gorka/internal/generation"
)

var (
	inputDir         = flag.String("input", "internal/embedded-resources/behavioral-specs", "Input directory containing behavioral specification JSON files")
	outputDir        = flag.String("output", "internal/embedded-resources/chatmodes", "Output directory for generated chatmode files")
	validate         = flag.Bool("validate", false, "Validate that generated chatmodes are up-to-date with behavioral specs")
	verbose          = flag.Bool("verbose", false, "Enable verbose output")
	templateDir      = flag.String("templates", "internal/chatmode-generation/chatmode-templates", "Directory containing chatmode templates")
	useSpecGenerator = flag.Bool("spec-mode", false, "Use specification-compliant generator with enhanced validation")
	help             = flag.Bool("help", false, "Show help")
)

func main() {
	flag.StringVar(inputDir, "i", *inputDir, "Directory containing behavioral matrix JSON files (short)")
	flag.StringVar(outputDir, "o", *outputDir, "Directory to write generated chatmode files (short)")
	flag.StringVar(templateDir, "t", *templateDir, "Custom template directory (short)")
	flag.BoolVar(verbose, "v", *verbose, "Enable verbose output (short)")

	flag.Parse()

	if *help {
		fmt.Println("secondbrain-gen - Generate VS Code chatmodes from behavioral matrices")
		fmt.Println("\nUsage: secondbrain-gen [flags]")
		fmt.Println("\nFlags:")
		flag.PrintDefaults()
		fmt.Println("\nExamples:")
		fmt.Println("  secondbrain-gen                                    # Use defaults")
		fmt.Println("  secondbrain-gen -i specs -o chatmodes -v          # Custom paths with verbose")
		fmt.Println("  secondbrain-gen --spec-mode --validate             # Use enhanced validation")
		fmt.Println("  //go:generate secondbrain-gen                     # Use in go:generate directive")
		os.Exit(0)
	}

	if *useSpecGenerator {
		// Use specification-compliant generator
		if err := runSpecGenerator(); err != nil {
			log.Fatalf("Spec generator failed: %v", err)
		}
	} else {
		// Use existing generator for compatibility
		if err := runLegacyGenerator(); err != nil {
			log.Fatalf("Legacy generator failed: %v", err)
		}
	}
}

func runSpecGenerator() error {
	if *verbose {
		log.Println("Using specification-compliant generator...")
		log.Printf("Input directory: %s", *inputDir)
		log.Printf("Output directory: %s", *outputDir)
		log.Printf("Template directory: %s", *templateDir)
		log.Printf("Validate mode: %v", *validate)
	}

	config := generation.Config{
		InputDir:  *inputDir,
		OutputDir: *outputDir,
		Template:  "",
		Verbose:   *verbose,
		Validate:  *validate,
	}

	generator := generation.NewGenerator(config)

	if *validate {
		// Validation mode: check if generated files are up-to-date
		if err := validateGenerationSpec(generator); err != nil {
			log.Fatalf("Validation failed: %v", err)
		}
		fmt.Println("✓ Generated chatmodes are up-to-date (spec mode)")
		return nil
	}

	// Generation mode: generate chatmode files
	_, err := generator.GenerateAll()
	if err != nil {
		return fmt.Errorf("generation failed: %w", err)
	}

	if *verbose {
		fmt.Println("✓ Spec-compliant chatmode generation completed successfully")
	}

	return nil
}

func runLegacyGenerator() error {
	if *verbose {
		log.Println("secondbrain-gen starting...")
		log.Printf("Input directory: %s", *inputDir)
		log.Printf("Output directory: %s", *outputDir)
		log.Printf("Template directory: %s", *templateDir)
		log.Printf("Validate mode: %v", *validate)
	}

	// Initialize the generator
	generator, err := generation.NewChatmodeGenerator(*inputDir, *outputDir, *templateDir)
	if err != nil {
		return fmt.Errorf("failed to initialize generator: %w", err)
	}

	if *validate {
		// Validation mode: check if generated files are up-to-date
		if err := validateGeneration(generator); err != nil {
			return fmt.Errorf("validation failed: %w", err)
		}
		fmt.Println("✓ Generated chatmodes are up-to-date")
		return nil
	}

	// Generation mode: generate chatmode files
	if err := generateChatmodes(generator); err != nil {
		return fmt.Errorf("generation failed: %w", err)
	}

	if *verbose {
		fmt.Println("✓ Chatmode generation completed successfully")
	}

	return nil
}

func validateGenerationSpec(generator *generation.ChatmodeGenerator) error {
	// Use workflow for enhanced validation
	workflow := generation.NewWorkflow(generator)
	return workflow.ExecuteGenerationPipeline()
}

func generateChatmodes(generator *generation.ChatmodeGenerator) error {
	// Ensure output directory exists
	if err := os.MkdirAll(*outputDir, 0755); err != nil {
		return fmt.Errorf("failed to create output directory: %w", err)
	}

	// Generate chatmodes from behavioral specs
	generatedFiles, err := generator.GenerateAll()
	if err != nil {
		return fmt.Errorf("failed to generate chatmodes: %w", err)
	}

	if *verbose {
		fmt.Printf("Generated %d chatmode files:\n", len(generatedFiles))
		for _, file := range generatedFiles {
			fmt.Printf("  - %s\n", file)
		}
	}

	return nil
}

func validateGeneration(generator *generation.ChatmodeGenerator) error {
	// Check if all behavioral specs have corresponding up-to-date chatmodes
	outdated, err := generator.FindOutdatedChatmodes()
	if err != nil {
		return fmt.Errorf("failed to check chatmode status: %w", err)
	}

	if len(outdated) > 0 {
		fmt.Fprintf(os.Stderr, "✗ Found %d outdated chatmode(s):\n", len(outdated))
		for _, file := range outdated {
			fmt.Fprintf(os.Stderr, "  - %s\n", file)
		}
		fmt.Fprintf(os.Stderr, "\nRun 'make generate' or 'secondbrain-gen' to update.\n")
		return fmt.Errorf("chatmodes are out of sync with behavioral specs")
	}

	return nil
}
