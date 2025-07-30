package utils

import (
	"os"
	"path/filepath"
	"strings"
)

// ProjectLanguage represents detected project languages and frameworks
type ProjectLanguage struct {
	Primary    string            `json:"primary"`
	Secondary  []string          `json:"secondary"`
	Frameworks []string          `json:"frameworks"`
	BuildTools []string          `json:"build_tools"`
	Metadata   map[string]string `json:"metadata"`
}

// DetectProjectLanguage analyzes the workspace to detect programming languages and frameworks
func DetectProjectLanguage(workspaceRoot string) *ProjectLanguage {
	lang := &ProjectLanguage{
		Secondary:  make([]string, 0),
		Frameworks: make([]string, 0),
		BuildTools: make([]string, 0),
		Metadata:   make(map[string]string),
	}

	// Check for language-specific files
	languageIndicators := map[string][]string{
		"Go":         {"go.mod", "go.sum", "main.go"},
		"JavaScript": {"package.json", "package-lock.json", "yarn.lock"},
		"TypeScript": {"tsconfig.json", "package.json"},
		"Python":     {"requirements.txt", "setup.py", "pyproject.toml", "Pipfile"},
		"Java":       {"pom.xml", "build.gradle", "gradlew"},
		"C#":         {"*.csproj", "*.sln", "packages.config"},
		"Rust":       {"Cargo.toml", "Cargo.lock"},
		"Ruby":       {"Gemfile", "Gemfile.lock"},
		"PHP":        {"composer.json", "composer.lock"},
	}

	// Framework indicators
	frameworkIndicators := map[string][]string{
		"React":     {"package.json"}, // Check package.json content for react
		"Vue":       {"package.json"}, // Check package.json content for vue
		"Angular":   {"angular.json", "package.json"},
		"Django":    {"manage.py", "settings.py"},
		"Flask":     {"app.py", "requirements.txt"},
		"Spring":    {"pom.xml", "application.properties"},
		"Express":   {"package.json"}, // Check package.json for express
		"Gin":       {"go.mod"},       // Check go.mod for gin
		"Echo":      {"go.mod"},       // Check go.mod for echo
	}

	// Build tool indicators
	buildToolIndicators := map[string][]string{
		"Make":     {"Makefile", "makefile"},
		"Docker":   {"Dockerfile", "docker-compose.yml", "docker-compose.yaml"},
		"Gradle":   {"build.gradle", "gradlew"},
		"Maven":    {"pom.xml"},
		"NPM":      {"package.json", "package-lock.json"},
		"Yarn":     {"yarn.lock"},
		"Poetry":   {"pyproject.toml"},
		"Cargo":    {"Cargo.toml"},
		"Composer": {"composer.json"},
	}

	var detectedLanguages []string
	var detectedFrameworks []string
	var detectedBuildTools []string

	// Walk through workspace to detect files
	filepath.Walk(workspaceRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Continue on errors
		}

		// Skip hidden directories and node_modules
		if info.IsDir() && (strings.HasPrefix(info.Name(), ".") || info.Name() == "node_modules") {
			return filepath.SkipDir
		}

		fileName := info.Name()
		
		// Check language indicators
		for language, indicators := range languageIndicators {
			for _, indicator := range indicators {
				if matched, _ := filepath.Match(indicator, fileName); matched {
					if !contains(detectedLanguages, language) {
						detectedLanguages = append(detectedLanguages, language)
					}
				}
			}
		}

		// Check framework indicators
		for framework, indicators := range frameworkIndicators {
			for _, indicator := range indicators {
				if matched, _ := filepath.Match(indicator, fileName); matched {
					if !contains(detectedFrameworks, framework) {
						detectedFrameworks = append(detectedFrameworks, framework)
					}
				}
			}
		}

		// Check build tool indicators
		for tool, indicators := range buildToolIndicators {
			for _, indicator := range indicators {
				if matched, _ := filepath.Match(indicator, fileName); matched {
					if !contains(detectedBuildTools, tool) {
						detectedBuildTools = append(detectedBuildTools, tool)
					}
				}
			}
		}

		return nil
	})

	// Determine primary language (most common or most specific)
	if len(detectedLanguages) > 0 {
		lang.Primary = detectedLanguages[0]
		if len(detectedLanguages) > 1 {
			lang.Secondary = detectedLanguages[1:]
		}
	} else {
		lang.Primary = "Unknown"
	}

	lang.Frameworks = detectedFrameworks
	lang.BuildTools = detectedBuildTools

	// Add metadata based on detected tools
	if contains(detectedBuildTools, "Docker") {
		lang.Metadata["containerized"] = "true"
	}
	if contains(detectedBuildTools, "Make") {
		lang.Metadata["has_makefile"] = "true"
	}

	return lang
}

// contains checks if a string slice contains a specific string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}