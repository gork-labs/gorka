# SecondBrain MCP Server

[![npm version](https://badge.fury.io/js/@gork-labs%2Fsecondbrain-mcp.svg)](https://badge.fury.io/js/@gork-labs%2Fsecondbrain-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Multi-agent orchestration system with quality control, analytics, and ML-powered intelligence for specialized sub-agent delegation.**

SecondBrain MCP Server enables primary AI agents to spawn and coordinate specialized sub-agents while maintaining quality control, preventing infinite loops, and optimizing costs through intelligent delegation.

## 🚀 Features

- **🤖 Multi-Agent Orchestration**: Spawn specialized sub-agents with domain expertise
- **🔒 Loop Protection**: Sophisticated session management prevents infinite delegation
- **⚡ Quality Control**: 5-tier validation system with ML-powered assessment
- **📊 Real-time Analytics**: Performance monitoring and optimization insights
- **🧠 ML Intelligence**: Predictive quality scoring and adaptive learning
- **💰 Cost Optimization**: 80% cost reduction through intelligent delegation
- **🎯 12 MCP Tools**: Comprehensive toolkit for agent coordination

## 📦 Installation

```bash
npm install -g @gork-labs/secondbrain-mcp
```

## 🔧 Configuration

Add to your `mcp.json` configuration file:

```json
{
  "mcpServers": {
    "secondbrain": {
      "command": "npx",
      "args": ["@gork-labs/secondbrain-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key",
        "ANTHROPIC_API_KEY": "your-anthropic-api-key"
      }
    }
  }
}
```

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for sub-agent spawning
- `ANTHROPIC_API_KEY` - Anthropic API key for alternative models
- `SECONDBRAIN_SESSION_PATH` - Custom session storage path (optional)
- `SECONDBRAIN_MAX_CALLS` - Maximum calls per session (default: 20)

## 🛠️ Available MCP Tools

### Core Agent Tools
- **`spawn_agent`** - Spawn specialized sub-agents with domain expertise
- **`list_chatmodes`** - List available specialized agent types
- **`validate_output`** - Comprehensive quality control and validation
- **`get_session_stats`** - Session tracking and loop protection metrics

### Analytics & Intelligence
- **`get_quality_analytics`** - Quality trends and performance insights
- **`get_performance_analytics`** - Performance optimization metrics
- **`get_system_health`** - System status and health monitoring
- **`generate_analytics_report`** - Comprehensive analytics reports

### ML-Powered Features
- **`predict_quality_score`** - ML-based quality prediction
- **`predict_refinement_success`** - Refinement success probability
- **`get_ml_insights`** - Advanced ML insights and recommendations
- **`get_optimization_suggestions`** - System optimization suggestions

## 🎯 Quick Start Example

```typescript
// Spawn a Security Engineer for vulnerability analysis
const response = await mcp.callTool('spawn_agent', {
  chatmode: 'Security Engineer',
  task: 'Analyze web application for security vulnerabilities',
  context: 'E-commerce platform with user authentication and payment processing',
  expected_deliverables: 'Vulnerability report with remediation recommendations'
});

// Validate the sub-agent response
const validation = await mcp.callTool('validate_output', {
  sub_agent_response: response.content[0].text,
  requirements: 'Security vulnerability analysis',
  quality_criteria: 'Must include specific vulnerabilities and remediation steps',
  chatmode: 'Security Engineer',
  enable_refinement: true
});

// Get ML insights about system performance
const insights = await mcp.callTool('get_ml_insights', {});
```

## 🏗️ Architecture

### Hub-and-Spoke Model
```
Primary Agent (GPT-4)
├── Security Engineer → Threat analysis
├── DevOps Engineer → Infrastructure review
├── Database Architect → Data security
└── Coordination & Validation → Final report
```

### Cost Optimization
- **Traditional**: 100% expensive model usage
- **SecondBrain**: 20% primary (GPT-4) + 80% specialized (o4-mini)
- **Result**: ~80% cost reduction with maintained quality

### Quality Control Pipeline
1. **Format Validation** - JSON structure and completeness
2. **Content Assessment** - Deliverables and quality scoring
3. **ML Enhancement** - Predictive assessment and learning
4. **Refinement Management** - Iterative improvement tracking
5. **Analytics Integration** - Performance monitoring and insights

## 📊 Specialized Agent Types

| Agent Type | Expertise | Use Cases |
|------------|-----------|-----------|
| Security Engineer | Security analysis, vulnerability assessment | Code review, threat modeling, compliance |
| DevOps Engineer | Infrastructure, deployment, monitoring | CI/CD, scaling, performance optimization |
| Database Architect | Data modeling, performance, security | Schema design, query optimization, backup |
| Software Architect | System design, patterns, scalability | Architecture decisions, technical strategy |
| Test Engineer | Testing strategies, automation, QA | Test planning, coverage analysis, automation |

## 🔍 Quality Metrics

The system tracks comprehensive quality metrics:

- **Overall Quality Score** (0-100): Weighted assessment across all dimensions
- **Rule-based Validation**: 5 universal quality rules
- **ML-Powered Assessment**: Predictive scoring and confidence levels
- **Refinement Success Rate**: Learning-based improvement tracking
- **Cross-Agent Performance**: Comparative analysis across specializations

## 📈 Analytics Capabilities

### Real-time Monitoring
- Agent performance tracking
- Quality trend analysis
- Cost optimization metrics
- Session management stats

### ML Intelligence
- Ensemble prediction models
- Cross-chatmode pattern analysis
- Optimization opportunity identification
- Adaptive learning and improvement

### Reporting
- Executive summaries
- Detailed technical reports
- Performance optimization insights
- System health monitoring

## 🛡️ Loop Protection

SecondBrain implements sophisticated loop protection:

- **Session Management**: Call limits and refinement tracking
- **Agent Restrictions**: Sub-agents cannot spawn other agents
- **Resource Limits**: Maximum 20 calls per session, 2 refinement iterations
- **Quality Thresholds**: Chatmode-specific quality requirements
- **Timeout Protection**: Automatic session cleanup and resource management

## 🔧 Advanced Configuration

### Custom Quality Thresholds
```json
{
  "qualityThresholds": {
    "Security Engineer": 0.80,
    "DevOps Engineer": 0.75,
    "default": 0.75
  }
}
```

### Analytics Configuration
```json
{
  "analytics": {
    "enabled": true,
    "retentionDays": 30,
    "mlInsights": true
  }
}
```

## 🧪 Development

```bash
git clone https://github.com/gork-labs/gorka.git
cd gorka/servers/secondbrain-mcp
npm install
npm run build
npm test
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📋 Requirements

- **Node.js**: >= 18.0.0
- **API Keys**: OpenAI and/or Anthropic API access
- **MCP Client**: Compatible MCP client (GitHub Copilot, Claude Desktop, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/gork-labs/gorka)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Gorka AI Agent System](https://github.com/gork-labs/gorka)
- [Issue Tracker](https://github.com/gork-labs/gorka/issues)

## ⭐ Support

If you find SecondBrain MCP Server useful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting issues
- 💡 Suggesting improvements
- 🤝 Contributing code

---

**Built with ❤️ by the Gorka team** | **Powered by Model Context Protocol**
