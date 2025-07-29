---
target_execution: "llm_agent_implementation"
implementation_domain: "behavioral_matrices"
---

# BEHAVIORAL MATRICES IMPLEMENTATION

## PROJECT_ORCHESTRATOR_MATRIX

File: `internal/behavioral-specs/project-orchestrator.json`

```json
{
  "agent_id": "project_orchestrator",
  "mcp_tool": "spawn_behavioral_agents",
  "vscode_chatmode": "Project Orchestrator - Gorka.chatmode.md",
  "algorithm": {
    "input": {
      "task_specification": "string",
      "complexity_level": "enum",
      "context_data": "object"
    },
    "steps": [
      {
        "action": "analyze_task_domain_requirements",
        "logic": "map_task_to_required_behavioral_agents"
      },
      {
        "action": "synthesize_behavioral_results",
        "logic": "basic_result_aggregation"
      }
    ],
    "output": {
      "coordinated_result": "object",
      "execution_metadata": "object",
      "agent_contributions": "array"
    },
    "tools": {
      "mcp_mode": ["spawn_behavioral_agents", "basic_output_validation"],
      "vscode_mode": ["spawn_agent", "spawn_agents_parallel", "validate_output"]
    }
  }
}
```

## SOFTWARE_ENGINEER_MATRIX

File: `internal/behavioral-specs/software-engineer.json`

```json
{
  "agent_id": "software_engineer",
  "mcp_tool": "execute_implementation_behavioral_matrix",
  "vscode_chatmode": "Software Engineer - Gorka.chatmode.md",
  "algorithm": {
    "input": {
      "implementation_specification": "object",
      "technical_context": "object",
      "quality_requirements": "object"
    },
    "steps": [
      {
        "action": "analyze_implementation_requirements",
        "logic": "specification_to_implementation_mapping"
      },
      {
        "action": "validate_implementation_quality",
        "logic": "basic_quality_assessment"
      }
    ],
    "output": {
      "implementation_result": "object",
      "quality_assessment": "object",
      "implementation_metadata": "object"
    },
    "tools": {
      "mcp_mode": ["read_file", "edit_file", "basic_quality_validator"],
      "vscode_mode": ["read_file", "replace_string_in_file", "get_errors", "semantic_search"]
    }
  }
}
```

## SECURITY_ENGINEER_MATRIX

File: `internal/behavioral-specs/security-engineer.json`

```json
{
  "agent_id": "security_engineer",
  "mcp_tool": "execute_security_behavioral_matrix",
  "vscode_chatmode": "Security Engineer - Gorka.chatmode.md",
  "algorithm": {
    "input": {
      "security_analysis_target": "object",
      "analysis_scope": "enum",
      "context_data": "object"
    },
    "steps": [
      {
        "action": "execute_security_analysis_patterns",
        "logic": "basic_vulnerability_detection"
      },
      {
        "action": "generate_security_recommendations",
        "logic": "simple_remediation_processing"
      }
    ],
    "output": {
      "security_findings": "array",
      "risk_assessment": "object",
      "recommendations": "array"
    },
    "tools": {
      "mcp_mode": ["read_file", "grep_search", "basic_security_analyzer"],
      "vscode_mode": ["read_file", "grep_search", "semantic_search", "list_code_usages"]
    }
  }
}
```

## DEVOPS_ENGINEER_MATRIX

File: `internal/behavioral-specs/devops-engineer.json`

```json
{
  "agent_id": "devops_engineer",
  "mcp_tool": "execute_infrastructure_behavioral_matrix",
  "vscode_chatmode": "DevOps Engineer - Gorka.chatmode.md",
  "algorithm": {
    "input": {
      "infrastructure_target": "object",
      "optimization_scope": "enum",
      "constraint_parameters": "object"
    },
    "steps": [
      {
        "action": "analyze_infrastructure_patterns",
        "logic": "basic_infrastructure_assessment"
      },
      {
        "action": "validate_infrastructure_solution",
        "logic": "simple_solution_validation"
      }
    ],
    "output": {
      "infrastructure_analysis": "object",
      "optimization_plan": "object",
      "validation_result": "object"
    },
    "tools": {
      "mcp_mode": ["read_file", "basic_infrastructure_analyzer", "validate_configuration"],
      "vscode_mode": ["read_file", "run_in_terminal", "create_and_run_task", "get_task_output"]
    }
  }
}
```

## DATABASE_ARCHITECT_MATRIX

File: `internal/behavioral-specs/database-architect.json`

```json
{
  "agent_id": "database_architect",
  "mcp_tool": "execute_database_behavioral_matrix",
  "vscode_chatmode": "Database Architect - Gorka.chatmode.md",
  "algorithm": {
    "input": {
      "database_analysis_target": "object",
      "optimization_scope": "enum",
      "technical_context": "object"
    },
    "steps": [
      {
        "action": "analyze_database_architecture_patterns",
        "logic": "basic_schema_and_query_analysis"
      },
      {
        "action": "validate_database_solution_quality",
        "logic": "simple_data_integrity_validation"
      }
    ],
    "output": {
      "database_assessment": "object",
      "optimization_recommendations": "array",
      "solution_validation": "object"
    },
    "tools": {
      "mcp_mode": ["read_file", "basic_database_analyzer", "validate_schema"],
      "vscode_mode": ["read_file", "grep_search", "semantic_search"]
    }
  }
}
```

## SOFTWARE_ARCHITECT_MATRIX

File: `internal/behavioral-specs/software-architect.json`

```json
{
  "agent_id": "software_architect",
  "mcp_tool": "execute_architecture_behavioral_matrix",
  "vscode_chatmode": "Software Architect - Gorka.chatmode.md",
  "algorithm": {
    "input": {
      "architecture_analysis_target": "object",
      "design_scope": "enum",
      "technical_constraints": "object"
    },
    "steps": [
      {
        "action": "analyze_system_architecture_patterns",
        "logic": "basic_architectural_assessment"
      },
      {
        "action": "validate_architecture_solution_quality",
        "logic": "simple_maintainability_validation"
      }
    ],
    "output": {
      "architecture_analysis": "object",
      "architecture_design": "object",
      "design_validation": "object"
    },
    "tools": {
      "mcp_mode": ["read_file", "basic_architecture_analyzer", "validate_design"],
      "vscode_mode": ["read_file", "semantic_search", "list_code_usages"]
    }
  }
}
```

## PROMPT_ENGINEER_MATRIX

File: `internal/behavioral-specs/prompt-writer.json`

```json
{
  "agent_id": "prompt_engineer",
  "mcp_tool": "execute_prompt_engineering_behavioral_matrix",
  "vscode_chatmode": "Prompt Writer - Gorka.chatmode.md",
  "algorithm": {
    "input": {
      "prompt_optimization_target": "object",
      "optimization_scope": "enum",
      "llm_constraints": "object",
      "domain_context": "object"
    },
    "steps": [
      {
        "action": "analyze_prompt_quality_patterns",
        "logic": "basic_prompt_structure_assessment"
      },
      {
        "action": "generate_optimization_algorithms",
        "logic": "simple_prompt_pattern_generation"
      }
    ],
    "output": {
      "prompt_analysis": "object",
      "optimized_prompts": "array",
      "quality_metrics": "object",
      "algorithm_specifications": "object"
    },
    "tools": {
      "mcp_mode": ["read_file", "basic_prompt_analyzer", "validate_prompt_quality"],
      "vscode_mode": ["read_file", "semantic_search", "think_hard"]
    }
  }
}
```

## BEHAVIORAL_MATRIX_CREATION_COMMANDS

```bash
# Create all behavioral matrix files
cat > internal/behavioral-specs/project-orchestrator.json << 'EOF'
[PROJECT_ORCHESTRATOR_MATRIX content above]
EOF

cat > internal/behavioral-specs/software-engineer.json << 'EOF'
[SOFTWARE_ENGINEER_MATRIX content above]
EOF

cat > internal/behavioral-specs/security-engineer.json << 'EOF'
[SECURITY_ENGINEER_MATRIX content above]
EOF

cat > internal/behavioral-specs/devops-engineer.json << 'EOF'
[DEVOPS_ENGINEER_MATRIX content above]
EOF

cat > internal/behavioral-specs/database-architect.json << 'EOF'
[DATABASE_ARCHITECT_MATRIX content above]
EOF

cat > internal/behavioral-specs/software-architect.json << 'EOF'
[SOFTWARE_ARCHITECT_MATRIX content above]
EOF

cat > internal/behavioral-specs/prompt-writer.json << 'EOF'
[PROMPT_ENGINEER_MATRIX content above]
EOF
```

## BEHAVIORAL_MATRIX_VALIDATION

```bash
# Validate JSON syntax
for file in internal/behavioral-specs/*.json; do
  jq empty "$file" && echo "$file: valid" || echo "$file: invalid"
done
```
