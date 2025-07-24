---
title: "Gorka System Maintenance Guide"
author: "@bohdan-shulha"
date: "2025-07-24"
last_updated: "2025-07-24T16:14:41+02:00"
timezone: "Europe/Warsaw"
status: "approved"
version: "1.0.0"
reviewers: []
tags: ["maintenance", "administration", "system-care", "operations"]
document_type: "guide"
---

# Gorka System Maintenance Guide
*Last updated: 2025-07-24T16:14:41+02:00 (Europe/Warsaw)*
*Version: 1.0.0*
*Status: APPROVED*

## Document History
| Version | Date | Time | Author | Status | Changes |
|---------|------|------|--------|--------|---------|
| 1.0.0 | 2025-07-24 | 16:14:41 | @bohdan-shulha | Approved | Initial system maintenance guide |

## Overview

This guide provides comprehensive maintenance procedures for the Gorka AI agent ecosystem, ensuring optimal performance, reliability, and user experience.

## Maintenance Philosophy

Gorka follows a **proactive maintenance approach**:
- **Preventive**: Regular updates and health checks
- **Automated**: Self-upgrading and cleanup capabilities
- **Transparent**: Clear status reporting and diagnostics
- **Minimal Disruption**: Maintenance during natural workflow breaks

## Maintenance Schedule

### Daily Operations (Automated)
- **Health Monitoring**: System automatically checks component integrity
- **Memory Optimization**: Background cleanup of temporary data
- **Access Logging**: Track agent usage and performance metrics

### Weekly Maintenance (5-10 minutes)
- **Component Updates**: Sync with latest repository changes
- **Orphan Cleanup**: Remove outdated components
- **Memory Review**: Quick assessment of knowledge graph quality
- **Performance Check**: Review system responsiveness

### Monthly Maintenance (15-30 minutes)
- **Binary Updates**: Upgrade Gorka CLI to latest version
- **Deep Memory Cleanup**: Comprehensive knowledge graph optimization
- **Documentation Audit**: Ensure all docs are current and accurate
- **Configuration Review**: Optimize settings and remove unused features

### Quarterly Review (30-60 minutes)
- **System Architecture Assessment**: Review overall system health
- **Performance Analysis**: Analyze usage patterns and bottlenecks
- **Security Audit**: Update security configurations and review access
- **Backup and Recovery**: Verify backup procedures and test recovery

## Routine Maintenance Procedures

### Weekly Maintenance Routine

#### Step 1: System Status Check
```bash
# Check current component status
gorka update list

# Review both global and workspace installations
gorka update list global
gorka update list workspace
```

**Expected Output**: All components show ✓ status with no missing files

#### Step 2: Component Synchronization
```bash
# Sync with latest repository
gorka update sync

# Verify updates were applied
gorka update list
```

**What This Does**:
- Downloads latest agent configurations
- Updates MCP server definitions
- Refreshes chatmode files
- Updates instruction documents
- Maintains backward compatibility

#### Step 3: Orphan Cleanup
```bash
# Remove components no longer in repository
gorka update clean-orphans

# Verify cleanup results
gorka update list
```

**What This Removes**:
- Components tracked by Gorka but removed from repository
- Unused MCP server configurations
- Outdated chatmode files
- Obsolete instruction documents

#### Step 4: Memory Health Check
```bash
# Open VS Code in your main project
cd your-main-project

# Check memory file integrity
ls -la .vscode/memory.json

# Review memory size (should be reasonable, not massive)
wc -l .vscode/memory.json
```

Use **Memory Curator** agent to review memory quality:
```
"Please review the current memory graph for quality, duplicates, and optimization opportunities"
```

### Monthly Maintenance Routine

#### Step 1: Binary Update
```bash
# Upgrade Gorka CLI to latest version
gorka self-upgrade

# Verify new version
gorka help
```

**Safety Features**:
- Automatic backup creation
- Validation testing before installation
- Automatic rollback on failure
- Atomic replacement process

#### Step 2: Deep Memory Optimization
Use **Memory Curator** for comprehensive cleanup:
```
"Please perform a comprehensive memory optimization including:
1. Identify and merge duplicate entities
2. Remove outdated or incorrect information
3. Optimize relationship structures
4. Generate a cleanup report"
```

#### Step 3: Documentation Audit
Use **Technical Writer** to review documentation:
```
"Please audit all documentation in the docs/ directory for:
1. Accuracy and currency
2. Broken links or references
3. Missing or outdated information
4. Consistency with current system capabilities"
```

#### Step 4: Configuration Optimization
```bash
# Check for unused configurations
gorka update list available

# Remove unused components if identified
gorka update remove <type> <name> <scope>

# Clean up any remaining orphans
gorka update clean-orphans
```

### Quarterly System Review

#### Step 1: Performance Analysis
1. **Usage Metrics Review**:
   - Which agents are used most frequently?
   - Are there performance bottlenecks?
   - Which features provide the most value?

2. **Memory Growth Analysis**:
   ```bash
   # Check memory file sizes across projects
   find . -name "memory.json" -exec ls -lh {} \;

   # Review memory growth trends
   # Large files (>1MB) may need optimization
   ```

3. **Documentation Coverage**:
   - Are all major system components documented?
   - Is user-facing documentation complete and accurate?
   - Are troubleshooting guides effective?

#### Step 2: Security and Access Review
1. **Configuration Security**:
   - Review MCP server configurations for security best practices
   - Ensure no sensitive information in configuration files
   - Verify proper file permissions

2. **Memory Content Review**:
   - Use Memory Curator to audit for sensitive information
   - Ensure business-specific data is properly anonymized
   - Review relationship structures for data leaks

#### Step 3: Backup and Recovery Verification
1. **Configuration Backup**:
   ```bash
   # Backup critical configuration files
   tar -czf gorka-backup-$(date +%Y%m%d).tar.gz \
     .vscode/mcp.json \
     .vscode/gorka.json \
     .vscode/memory.json \
     .github/chatmodes/ \
     .github/instructions/
   ```

2. **Recovery Testing**:
   - Test restoration procedures in a separate directory
   - Verify all components work after restoration
   - Document any issues or improvements needed

## Health Monitoring

### System Health Indicators

#### Green Status (Healthy)
- ✅ All components show ✓ in `gorka update list`
- ✅ MCP servers respond normally in VS Code
- ✅ Chatmodes load and function correctly
- ✅ Memory files are reasonable size (<1MB typically)
- ✅ No error messages in VS Code output

#### Yellow Status (Attention Needed)
- ⚠️ Some components show ✗ (missing files)
- ⚠️ Memory files growing rapidly (>100KB/week)
- ⚠️ Occasional MCP server connectivity issues
- ⚠️ Slow agent response times
- ⚠️ Outdated Gorka binary version

#### Red Status (Action Required)
- 🔴 Multiple missing components
- 🔴 MCP servers consistently failing
- 🔴 Memory files corrupted or extremely large
- 🔴 Agents not responding or giving errors
- 🔴 Installation integrity compromised

### Diagnostic Commands

#### Quick Health Check
```bash
# Overall system status
gorka update list

# Component availability check
gorka update list available

# Binary version check
gorka --version || gorka help  # Show current capabilities
```

#### Detailed Diagnostics
```bash
# Check file integrity
find .vscode .github -name "*.json" -exec echo "=== {} ===" \; -exec head -1 {} \;

# Memory file validation
jq . .vscode/memory.json >/dev/null && echo "Memory JSON valid" || echo "Memory JSON corrupted"

# MCP configuration validation
jq . .vscode/mcp.json >/dev/null && echo "MCP JSON valid" || echo "MCP JSON corrupted"
```

#### VS Code Integration Check
1. Open VS Code Command Palette (`Cmd/Ctrl + Shift + P`)
2. Search for "MCP" - should show MCP-related commands
3. Check Output panel for MCP server logs
4. Verify chatmodes appear in chat interface

## Troubleshooting Common Issues

### Component Synchronization Issues

#### Problem: `gorka update sync` fails
**Symptoms**: Error messages about repository access or file permissions

**Solution**:
```bash
# Clear cache and retry
gorka clean
gorka update sync

# If still failing, check network connectivity
ping github.com

# Check file permissions
ls -la ~/.local/share/gorka/
```

#### Problem: Components show as missing after sync
**Symptoms**: `gorka update list` shows ✗ for components

**Solution**:
```bash
# Verify files exist
ls -la .github/chatmodes/
ls -la .github/instructions/

# Reinstall if missing
gorka install

# Check for permission issues
chmod -R 644 .github/chatmodes/*.md
chmod -R 644 .github/instructions/*.md
```

### Memory System Issues

#### Problem: Memory file growing too large
**Symptoms**: `.vscode/memory.json` > 1MB, slow agent responses

**Solution**:
1. Use Memory Curator for optimization:
   ```
   "The memory file has grown large. Please optimize by removing duplicates, outdated information, and consolidating related entities."
   ```

2. If severely corrupted, reset and rebuild:
   ```bash
   # Backup current memory
   cp .vscode/memory.json .vscode/memory.json.backup

   # Start fresh
   echo '{}' > .vscode/memory.json
   ```

#### Problem: Memory corruption or invalid JSON
**Symptoms**: JSON parsing errors, agents can't access memory

**Solution**:
```bash
# Validate JSON
jq . .vscode/memory.json

# If corrupted, restore from backup or reset
cp .vscode/memory.json.backup .vscode/memory.json
# OR
echo '{}' > .vscode/memory.json
```

### MCP Server Issues

#### Problem: MCP servers not connecting
**Symptoms**: "No MCP servers found" in VS Code

**Solution**:
1. Check MCP configuration:
   ```bash
   jq . .vscode/mcp.json
   ```

2. Restart VS Code completely

3. Reinstall MCP configuration:
   ```bash
   gorka install
   ```

4. Check VS Code Output panel for MCP error messages

#### Problem: Specific MCP server failing
**Symptoms**: Some servers work, others don't

**Solution**:
1. Check server-specific logs in VS Code Output panel
2. Verify server is installed and accessible
3. Remove and reinstall problematic server:
   ```bash
   gorka update remove server <server-name>
   gorka update sync
   ```

### Performance Issues

#### Problem: Slow agent responses
**Symptoms**: Long delays in agent interactions

**Potential Causes & Solutions**:
1. **Large memory file**: Optimize with Memory Curator
2. **Network issues**: Check internet connectivity
3. **VS Code resource usage**: Restart VS Code, close unused extensions
4. **System resources**: Check CPU/memory usage

#### Problem: VS Code becomes unresponsive
**Symptoms**: VS Code freezes or crashes during agent interactions

**Solution**:
1. Restart VS Code
2. Check system resources
3. Disable other VS Code extensions temporarily
4. Reset memory file if extremely large
5. Check for VS Code updates

## Backup and Recovery

### What to Backup

#### Critical Configuration Files
- `.vscode/mcp.json` - MCP server configurations
- `.vscode/gorka.json` - Gorka metadata tracking
- `.vscode/memory.json` - Knowledge graph data

#### Important Project Files
- `.github/chatmodes/` - Agent profiles (can be restored from repository)
- `.github/instructions/` - Agent instructions (can be restored from repository)
- `docs/` - Generated documentation (valuable but regenerable)

### Backup Procedures

#### Automated Backup Script
```bash
#!/bin/bash
# gorka-backup.sh

PROJECT_NAME=$(basename "$PWD")
BACKUP_DIR="$HOME/gorka-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${PROJECT_NAME}_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_FILE" \
    .vscode/mcp.json \
    .vscode/gorka.json \
    .vscode/memory.json \
    .github/chatmodes/ \
    .github/instructions/ \
    docs/

echo "Backup created: $BACKUP_FILE"
```

#### Manual Backup
```bash
# Create backup directory
mkdir -p ~/gorka-backups

# Create timestamped backup
tar -czf ~/gorka-backups/project-backup-$(date +%Y%m%d).tar.gz \
    .vscode/ .github/ docs/
```

### Recovery Procedures

#### Complete System Recovery
```bash
# Extract backup
cd your-project-directory
tar -xzf ~/gorka-backups/project-backup-YYYYMMDD.tar.gz

# Verify extraction
ls .vscode/ .github/

# Test system integrity
gorka update list
```

#### Partial Recovery (Memory Only)
```bash
# Restore just memory file
tar -xzf ~/gorka-backups/project-backup-YYYYMMDD.tar.gz .vscode/memory.json

# Verify memory integrity
jq . .vscode/memory.json
```

#### Recovery from Repository
```bash
# If local files are lost but repository is available
gorka clean
gorka install
gorka update sync

# Note: This restores configurations but not local memory/docs
```

## Performance Optimization

### Memory Optimization

#### Regular Memory Maintenance
Use Memory Curator monthly for:
```
"Please optimize memory by:
1. Merging duplicate entities
2. Removing outdated information
3. Consolidating related concepts
4. Improving relationship efficiency"
```

#### Memory Size Guidelines
- **Small projects**: <100KB memory file
- **Medium projects**: 100KB - 500KB memory file
- **Large projects**: 500KB - 1MB memory file
- **Enterprise projects**: >1MB (requires careful management)

### Configuration Optimization

#### Remove Unused Components
```bash
# Review what's available vs. what's installed
gorka update list available
gorka update list

# Remove unused servers
gorka update remove server <unused-server>

# Remove unused chatmodes
gorka update remove chatmode "<unused-chatmode.md>"
```

#### Optimize MCP Configuration
- Keep only actively used MCP servers
- Remove redundant configurations
- Ensure server configurations are minimal and efficient

### VS Code Optimization

#### Memory Usage
- Monitor VS Code memory usage in Activity Monitor/Task Manager
- Restart VS Code daily for optimal performance
- Limit number of open files and tabs

#### Extension Management
- Disable unnecessary VS Code extensions
- Keep only essential extensions active
- Update VS Code and extensions regularly

## Monitoring and Metrics

### Usage Metrics to Track

#### Weekly Metrics
- Number of agent interactions
- Most frequently used agents
- Memory file growth rate
- Documentation generation volume

#### Monthly Metrics
- System reliability (uptime/downtime)
- Performance trends (response times)
- Memory optimization effectiveness
- User satisfaction indicators

#### Quarterly Metrics
- Total value delivered (time saved)
- Documentation coverage improvement
- Knowledge graph quality evolution
- System adoption across team/organization

### Monitoring Tools

#### Built-in Diagnostics
```bash
# System status overview
gorka update list

# Component health check
gorka update list available

# File integrity check
find .vscode .github -name "*.json" -type f -exec jq . {} \; >/dev/null
```

#### Custom Monitoring Scripts
Create project-specific monitoring scripts to track:
- Memory file growth rates
- Documentation freshness
- Configuration drift
- Performance baselines

## Best Practices

### Maintenance Best Practices

#### Routine Maintenance
1. **Schedule Regular Updates**: Weekly sync, monthly cleanup
2. **Monitor System Health**: Check status indicators regularly
3. **Backup Before Changes**: Always backup before major changes
4. **Test After Updates**: Verify functionality after updates
5. **Document Issues**: Keep maintenance log for patterns

#### Proactive Management
1. **Stay Current**: Keep Gorka binary and components updated
2. **Monitor Growth**: Watch memory and configuration file sizes
3. **Clean Regularly**: Don't let orphans accumulate
4. **Review Periodically**: Monthly system health assessments
5. **Plan Capacity**: Monitor usage trends and plan for growth

#### Team Maintenance
1. **Shared Responsibility**: Distribute maintenance tasks
2. **Documentation**: Keep maintenance procedures documented
3. **Communication**: Share maintenance schedules and results
4. **Training**: Ensure team members understand procedures
5. **Escalation**: Clear escalation paths for complex issues

### Security Best Practices

#### Configuration Security
- Never commit sensitive information to version control
- Use appropriate file permissions (644 for configs)
- Regularly review configurations for sensitive data
- Maintain separation between different environments

#### Memory Security
- Review memory content for sensitive information
- Use Memory Curator to audit and clean sensitive data
- Consider memory encryption for highly sensitive projects
- Implement memory retention policies

## Troubleshooting Quick Reference

| Issue | Quick Fix | Detailed Solution |
|-------|-----------|-------------------|
| Components missing | `gorka update sync` | See Component Synchronization Issues |
| MCP servers not working | Restart VS Code | See MCP Server Issues |
| Memory file large | Use Memory Curator | See Memory System Issues |
| Permission errors | Check file permissions | See Configuration Security |
| Slow performance | Restart VS Code, check memory | See Performance Issues |
| JSON corruption | Validate with `jq`, restore backup | See Memory corruption section |
| Update failures | `gorka clean && gorka update sync` | See Component Synchronization Issues |

Remember: When in doubt, the sequence `gorka clean → gorka update sync → restart VS Code` resolves most common issues.
