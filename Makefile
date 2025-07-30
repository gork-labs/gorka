# Makefile for triple executable build system
.PHONY: build clean generate install install-local test deps build-release

# Default target
all: generate build

# Install dependencies
deps:
	go mod download
	go mod tidy

# Generate chatmodes from behavioral specs
generate:
	go generate ./internal/embedded/embedded-resources/behavioral-specs/
	@echo "Chatmodes generated successfully"

# Build all three executables
build: generate
	@echo "Building all executables..."
	@mkdir -p bin
	go build -o bin/secondbrain-mcp ./cmd/secondbrain-mcp
	go build -o bin/gorka ./cmd/gorka
	go build -o bin/secondbrain-gen ./cmd/secondbrain-gen
	@echo "Build complete: bin/secondbrain-{mcp,cli,gen}"

# Build cross-platform release binaries (same as GitHub Actions)
build-release: generate
	@echo "Building cross-platform release binaries..."
	@mkdir -p bin/release
	@for binary in gorka secondbrain-mcp secondbrain-gen; do \
		for platform in linux_amd64 linux_arm64 darwin_amd64 darwin_arm64 windows_amd64; do \
			goos=$$(echo $$platform | cut -d'_' -f1); \
			goarch=$$(echo $$platform | cut -d'_' -f2); \
			output="bin/release/$${binary}_$${platform}"; \
			if [ "$$goos" = "windows" ]; then \
				output="$${output}.exe"; \
			fi; \
			echo "Building $$output..."; \
			GOOS=$$goos GOARCH=$$goarch go build -ldflags="-s -w" -o $$output ./cmd/$$binary; \
		done; \
	done
	@cp install.sh bin/release/gorka
	@chmod +x bin/release/gorka
	@echo "Cross-platform build complete in bin/release/"

# Install executables to GOPATH/bin
install: build
	go install ./cmd/secondbrain-mcp
	go install ./cmd/gorka
	go install ./cmd/secondbrain-gen

# Install executables to ~/.local/bin
install-local: build
	@echo "Installing executables to ~/.local/bin..."
	@mkdir -p ~/.local/bin
	cp bin/secondbrain-mcp ~/.local/bin/
	cp bin/gorka ~/.local/bin/
	cp bin/secondbrain-gen ~/.local/bin/
	@echo "✓ Installed to ~/.local/bin: secondbrain-mcp, gorka, secondbrain-gen"

# Clean generated files and binaries
clean:
	rm -rf bin/
	rm -rf internal/embedded/embedded-resources/chatmodes/*.chatmode.md
	go clean

# Run tests
test:
	go test ./...

# Development workflow: watch for changes and regenerate
dev-watch:
	@echo "Watching for behavioral spec changes..."
	while inotifywait -e modify internal/embedded/embedded-resources/behavioral-specs/*.json; do \
		make generate; \
	done

# Validate generated chatmodes are up-to-date
validate-generation:
	@echo "Validating chatmode generation..."
	go run ./cmd/secondbrain-gen --input=internal/embedded/embedded-resources/behavioral-specs --output=internal/embedded/embedded-resources/chatmodes --validate
	@if git diff --quiet internal/embedded/embedded-resources/chatmodes/; then \
		echo "✓ Generated chatmodes are up-to-date"; \
	else \
		echo "✗ Generated chatmodes are out of sync with behavioral specs"; \
		echo "Run 'make generate' to update"; \
		exit 1; \
	fi
