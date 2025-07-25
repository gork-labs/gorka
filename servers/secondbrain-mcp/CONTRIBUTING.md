# Contributing to SecondBrain MCP

## Development Setup

### Prerequisites
- Node.js 18+
- npm 8+
- Git

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd secondbrain-mcp

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Code Quality

#### Linting
```bash
# Check for linting issues
npm run lint:check

# Auto-fix linting issues
npm run lint
```

#### Formatting
```bash
# Check code formatting
npm run format:check

# Auto-format code
npm run format
```

#### Type Checking
```bash
# Check TypeScript types
npm run type-check
```

### Testing

#### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

#### Integration Tests
Tests are organized by category:
- `tests/unit/` - Unit tests for individual components
- `tests/integration/` - Integration tests for component interactions
- `tests/` - Feature and system tests

### Building

#### Development Build
```bash
npm run build
```

#### Production Build
```bash
npm run clean && npm run build
```

### Docker Development

#### Build Docker Image
```bash
npm run docker:build
```

#### Run in Docker
```bash
npm run docker:run
```

### Security

#### Security Audit
```bash
npm run security:audit
```

#### Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Audit after updates
npm run security:audit
```

## Code Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Provide explicit return types for functions
- Use proper error handling with typed errors
- Prefer composition over inheritance

### Naming Conventions
- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` (no `I` prefix)

### Error Handling
- Use structured error objects
- Log errors with context
- Provide meaningful error messages
- Handle async errors properly

### Testing Standards
- Write tests for all public APIs
- Use descriptive test names
- Group related tests with `describe` blocks
- Mock external dependencies
- Aim for >80% code coverage

## Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code standards
   - Add/update tests
   - Update documentation

3. **Pre-commit Checks**
   ```bash
   npm run lint
   npm run format
   npm run type-check
   npm test
   ```

4. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat: add new functionality"
   git commit -m "fix: resolve issue with X"
   git commit -m "docs: update README"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Release Process

### Version Management
- Use semantic versioning (semver)
- Update CHANGELOG.md
- Tag releases in Git

### NPM Publishing
Automated via GitHub Actions on release:
1. Create GitHub release
2. CI/CD pipeline runs tests
3. Builds package
4. Publishes to NPM

## Architecture Guidelines

### File Organization
```
src/
├── core/           # Core server functionality
├── agents/         # Agent management
├── ai/             # AI client abstractions
├── analytics/      # Analytics and metrics
├── ml/             # Machine learning
├── quality/        # Quality validation
├── tools/          # Tool implementations
├── utils/          # Utilities and helpers
└── types/          # Type definitions
```

### Dependency Management
- Keep dependencies minimal
- Use exact versions for critical dependencies
- Regular security audits
- Document dependency choices

## Monitoring and Observability

### Logging
- Use structured logging
- Include correlation IDs
- Log at appropriate levels
- Sanitize sensitive data

### Metrics
- Track key performance indicators
- Monitor error rates
- Measure response times
- Session analytics

## Support

For questions or support:
- Create GitHub issue
- Check existing documentation
- Review test examples
