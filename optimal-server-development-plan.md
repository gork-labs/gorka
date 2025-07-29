---
specification_type: "simple_behavioral_execution_matrix"
target_execution: "machine_to_machine_only"
human_interaction: false
version: "9.0.0"
last_updated: "2025-07-28T11:08:33+02:00"
behavioral_determinism: true
deployment_modes: ["mcp_server", "vscode_chatmode"]
simplification: "no_ml_support_single_machine_focus"
anti_human_content: "strictly_prohibited"
---

# SIMPLE BEHAVIORAL EXECUTION MATRIX

## ANTI_HUMAN_CONTENT_DIRECTIVE

```json
{
  "human_content_prohibition": {
    "performance_metrics": "strictly_forbidden",
    "time_estimations": "strictly_forbidden",
    "cost_analysis": "strictly_forbidden",
    "resource_optimization_metrics": "strictly_forbidden",
    "human_readable_descriptions": "minimize_to_essential_only",
    "efficiency_measurements": "strictly_forbidden",
    "optimization_statistics": "strictly_forbidden"
  },
  "llm_only_content_mandate": {
    "target_audience": "llm_to_llm_communication_exclusively",
    "content_format": "json_behavioral_matrices_only",
    "processing_optimization": "machine_readable_structures_only",
    "human_intervention_points": "zero_tolerance_policy"
  },
  "enforcement_protocol": {
    "content_generation": "must_not_include_human_targeted_metrics_performance_data_or_analysis",
    "behavioral_execution": "pure_algorithmic_processing_without_human_consideration_or_analysis",
    "output_validation": "verify_zero_human_focused_information_metrics_or_analysis_generated",
    "llm_only_mandate": "all_content_optimized_exclusively_for_machine_to_machine_processing"
  }
}
```

```json
{
  "execution_model": "openrouter_llm_agent_spawning",
  "communication_protocol": "llm_to_llm_via_openrouter_api",
  "human_interaction": false,
  "deployment_architecture": "single_machine_with_openrouter_integration",
  "behavioral_consistency": "identical_agent_prompts_across_deployment_modes",
  "complexity_level": "llm_powered_agent_coordination"
}
```

## CENTRALIZED_EMBEDDED_ARCHITECTURE

```json
{
  "architectural_principle": {
    "centralized_go_embed": "single_package_contains_all_embedded_resources_using_go_embed_directives",
    "exported_filesystems": "embedded_package_exports_embed_fs_instances_for_consumption_by_other_packages",
    "no_relative_paths": "go_embed_patterns_use_direct_relative_paths_from_embedded_package_location",
    "single_source_of_truth": "all_embedded_resources_managed_through_central_embedded_package",
    "implementation_status": "✅ COMPLETED - Fully implemented and operational"
  },
  "package_structure": {
    "embedded_package_location": "internal/embedded",
    "embedded_resources_location": "internal/embedded/embedded-resources",
    "path_resolution": "embedded_package_accesses_resources_via_embedded_resources_subdirectory_within_package"
  },
  "go_embed_implementation": {
    "instructions_filesystem": "internal/embedded/embedded.go_with_go_embed_embedded_resources_instructions_directive",
    "behavioral_specs_filesystem": "internal/embedded/embedded.go_with_go_embed_embedded_resources_behavioral_specs_directive", 
    "chatmode_templates_filesystem": "internal/embedded/embedded.go_with_go_embed_embedded_resources_chatmode_templates_directive",
    "chatmodes_filesystem": "internal/embedded/embedded.go_with_go_embed_embedded_resources_chatmodes_directive",
    "single_file_implementation": "all_go_embed_directives_consolidated_in_single_embedded_go_file",
    "exported_access": "other_packages_import_and_use_exported_embed_fs_instances"
  },
  "consumer_integration": {
    "behavioral_package_usage": "imports_embedded_package_and_uses_exported_filesystems_for_instructions_and_specs",
    "generation_package_usage": "imports_embedded_package_and_uses_exported_filesystems_for_templates_and_specs",
    "cli_package_usage": "imports_embedded_package_for_chatmode_and_instruction_embedding"
  }
}
```

## OPENROUTER_BEHAVIORAL_ENGINE

```json
{
  "architectural_separation": {
    "shared_behavioral_processing": "internal/behavioral/prompt_builder.go_provides_system_prompt_generation_for_both_chatmodes_and_openrouter_agents",
    "dependency_flow": "openrouter_agent_spawner_depends_on_shared_behavioral_processing_not_chatmode_generator",
    "consistency_mechanism": "both_chatmode_generation_and_agent_spawning_use_identical_behavioral_matrix_processing_logic"
  },
  "behavioral_processor": {
    "input": "AgentBehavioralPrompt_JSON",
    "shared_processing": "internal/behavioral/BuildSystemPrompt_function",
    "execution": "openrouter_llm_agent_spawning",
    "output": "LLMGeneratedBehavioralResult_JSON"
  },
  "openrouter_integration": {
    "api_client": "internal/openrouter/client.go_using_official_openai_sdk",
    "sdk_library": "github.com/sashabaranov/go-openai_for_openrouter_compatibility",
    "agent_spawning": "llm_agent_creation_via_openrouter_api_using_openai_sdk",
    "tool_delegation": "mcp_tool_access_for_spawned_agents",
    "session_management": "persistent_agent_conversations",
    "prompt_source": "uses_shared_behavioral_processing_for_system_prompt_generation"
  },
  "dual_mode_execution": {
    "mcp_server_mode": "openrouter_agent_spawning_via_mcp_tools_using_shared_behavioral_processing",
    "vscode_chatmode_mode": "direct_openrouter_agent_execution_with_native_tools_using_shared_behavioral_processing"
  },
  "embedded_instructions_architecture": {
    "core_principles_embedding": "internal/embedded/instructions.go_with_go_embed_embedded_resources_instructions",
    "centralized_access": "all_packages_import_internal_embedded_for_unified_resource_access",
    "prompt_integration": "core_principles_loaded_via_centralized_embedded_package_and_embedded_in_every_agent_system_prompt",
    "consistency_guarantee": "identical_core_principles_in_openrouter_agents_and_vscode_chatmodes_via_centralized_embedded_package",
    "single_source_maintenance": "core_principles_updated_once_in_embedded_resources_applied_everywhere_automatically"
  }
}
```

## DUAL_MODE_CHATMODE_GENERATION

```json
{
  "architecture_principle": {
    "standalone_generation": "chatmode_generator_does_not_depend_on_openrouter_agent_spawner",
    "shared_behavioral_processing": "both_chatmode_generation_and_agent_spawning_use_shared_behavioral_processing_logic",
    "single_source_of_truth": "json_behavioral_matrices_are_the_authoritative_source_for_both_chatmodes_and_agent_prompts",
    "no_circular_dependencies": "chatmode_generator_and_agent_spawner_both_depend_on_shared_behavioral_package_only"
  },
  "correct_dependency_flow": {
    "layer_1_source": "json_behavioral_matrices_in_embedded_resources",
    "layer_2_centralized_embedding": "internal/embedded/package_with_go_embed_directives_for_all_resources",
    "layer_3_shared_processing": "internal/behavioral/prompt_builder.go_using_centralized_embedded_package",
    "layer_4_consumers": ["internal/generation/generator.go_for_chatmodes", "internal/openrouter/agent_spawner.go_for_llm_agents"],
    "consistency_guarantee": "all_consumers_use_identical_embedded_resources_via_centralized_package"
  },
  "vscode_schema_compliance": {
    "yaml_frontmatter": {
      "description": "string",
      "tools": "array"
    },
    "forbidden_fields": ["name", "author", "version", "created", "behavioral_matrix_source", "generation_timestamp", "auto_generated", "source_of_truth", "chatmode", "model", "temperature", "behavioral_matrix_version", "generated_from", "generated_at", "anti_hallucination_protocols", "evidence_requirements", "honesty_mandates"]
  },
  "content_optimization": {
    "minimal_yaml_frontmatter": "vscode_schema_only",
    "json_behavioral_blocks": "structured_algorithm_execution",
    "zero_human_explanations": "machine_readable_only"
  },
  "generation_process": {
    "source": "json_behavioral_matrices",
    "target": "vscode_chatmode_files",
    "consistency": "identical_behavioral_algorithms_via_shared_processing",
    "maintenance": "single_source_of_truth_with_shared_behavioral_logic",
    "offline_capability": "chatmode_generation_works_without_openrouter_api_or_network_access"
  }
}
```

## INTERNAL_TOOLS_IMPLEMENTATION_STRATEGY

```json
{
  "core_architecture_principle": {
    "standalone_operation": "single_mcp_server_with_all_tools_internal",
    "no_external_dependencies": "all_functionality_built_into_main_server_process",
    "official_sdk_usage": "github.com/modelcontextprotocol/go-sdk_for_tool_registration"
  },
  "internal_tool_categories": {
    "file_tools": {
      "implementation_path": "internal/tools/file/file_tools.go",
      "mcp_tools": ["read_file", "replace_string_in_file", "create_file", "grep_search", "file_search", "list_dir"],
      "purpose": "workspace_file_operations_for_behavioral_agents",
      "integration": "direct_mcp_tool_registration_within_server"
    },
    "knowledge_tools": {
      "implementation_path": "internal/tools/knowledge/knowledge_tools.go",
      "mcp_tools": ["create_entities", "search_nodes", "create_relations", "add_observations", "read_graph"],
      "purpose": "knowledge_graph_persistence_for_behavioral_context",
      "integration": "direct_mcp_tool_registration_within_server"
    },
    "thinking_tools": {
      "implementation_path": "internal/tools/thinking/thinking_tools.go",
      "mcp_tools": ["think_hard"],
      "purpose": "structured_sequential_thinking_for_behavioral_analysis",
      "integration": "direct_mcp_tool_registration_within_server"
    }
  },
  "tool_manager_coordination": {
    "implementation_path": "internal/tools/manager.go",
    "function": "unified_tool_registration_coordination",
    "integration_pattern": "all_tools_registered_via_single_manager_instance"
  },
  "architectural_benefits": {
    "reliability": "no_external_process_dependencies_or_communication_failures",
    "performance": "direct_function_calls_instead_of_subprocess_communication",
    "deployment": "single_binary_deployment_with_all_functionality_included",
    "maintenance": "unified_codebase_without_multiple_server_coordination"
  }
}
```

## OPENROUTER_MCP_PROTOCOL_INTEGRATION

```json
{
  "server_specification": {
    "transport": "stdio",
    "execution_model": "openrouter_llm_agent_spawning",
    "communication": "llm_to_llm_via_openrouter_api",
    "human_interaction": false,
    "behavioral_determinism": false,
    "llm_powered": true
  },
  "core_components": {
    "openrouter_client": "llm_api_communication_manager",
    "mcp_protocol_handler": "tool_communication_and_delegation_manager",
    "agent_spawner": "openrouter_llm_agent_creation_router",
    "context_injector": "behavioral_prompt_and_context_injection",
    "tool_delegator": "mcp_tool_access_for_spawned_agents"
  },
  "tool_registration": {
    "method": "dynamic_registration_based_on_behavioral_specs_directory",
    "approach": "scan_embedded_behavioral_specs_and_register_mcp_tools_dynamically",
    "registration_pattern": "behavioral_spec_mcp_tool_field_determines_tool_name",
    "agent_handlers": "dynamic_registration_with_generic_openrouter_spawning_handler",
    "validation": "agent_request_validation_using_actual_behavioral_spec_data"
  }
}
```

## OPENROUTER_BEHAVIORAL_MATRICES

### PROJECT_ORCHESTRATOR_MATRIX
```json
{
  "agent_id": "project_orchestrator",
  "mcp_tool": "spawn_behavioral_agents",
  "vscode_chatmode": "Project Orchestrator - Gorka.chatmode.md",
  "behavioral_prompt": {
    "system_prompt_template": "You are a Project Orchestrator specialized in task delegation and coordination. Analyze the given task and determine which specialist agents need to be spawned to complete it effectively.",
    "input_schema": {"task_specification": "string", "complexity_level": "enum", "context_data": "object"},
    "system_instructions": [
      "Analyze task domain requirements and map to appropriate specialist agents",
      "Coordinate multi-agent execution through OpenRouter spawning",
      "Synthesize results from multiple specialist agents",
      "Provide comprehensive project coordination and oversight"
    ],
    "output_schema": {"coordinated_result": "object", "execution_metadata": "object", "agent_contributions": "array"},
    "tools": {
      "mcp_mode": ["spawn_behavioral_agents", "validate_output"],
      "vscode_mode": ["spawn_agent", "spawn_agents_parallel", "validate_output"]
    }
  }
}
```

### SOFTWARE_ENGINEER_MATRIX
```json
{
  "agent_id": "software_engineer",
  "mcp_tool": "execute_implementation_behavioral_matrix",
  "vscode_chatmode": "Software Engineer - Gorka.chatmode.md",
  "behavioral_prompt": {
    "system_prompt_template": "You are a Senior Software Engineer with expertise in implementation, code analysis, and software development best practices. Provide thorough technical analysis and implementation guidance.",
    "input_schema": {"implementation_specification": "object", "technical_context": "object", "quality_requirements": "object"},
    "system_instructions": [
      "Analyze implementation requirements with deep technical understanding",
      "Provide detailed code analysis and implementation recommendations",
      "Ensure code quality and adherence to best practices",
      "Generate actionable implementation steps with file references"
    ],
    "output_schema": {"implementation_result": "object", "quality_assessment": "object", "implementation_metadata": "object"},
    "tools": {
      "mcp_mode": ["read_file", "edit_file", "code_analysis"],
      "vscode_mode": ["read_file", "replace_string_in_file", "get_errors", "semantic_search"]
    }
  }
}
```

### SECURITY_ENGINEER_MATRIX
```json
{
  "agent_id": "security_engineer",
  "mcp_tool": "execute_security_behavioral_matrix",
  "vscode_chatmode": "Security Engineer - Gorka.chatmode.md",
  "behavioral_prompt": {
    "system_prompt_template": "You are a Senior Security Engineer with expertise in vulnerability assessment, security architecture, and threat modeling. Provide comprehensive security analysis and recommendations.",
    "input_schema": {"security_analysis_target": "object", "analysis_scope": "enum", "context_data": "object"},
    "system_instructions": [
      "Execute comprehensive security analysis with threat modeling",
      "Identify vulnerabilities and security weaknesses",
      "Provide actionable security recommendations and remediation steps",
      "Generate detailed security findings with risk assessments"
    ],
    "output_schema": {"security_findings": "array", "risk_assessment": "object", "recommendations": "array"},
    "tools": {
      "mcp_mode": ["read_file", "grep_search", "security_analyzer"],
      "vscode_mode": ["read_file", "grep_search", "semantic_search", "list_code_usages"]
    }
  }
}
```

### DEVOPS_ENGINEER_MATRIX
```json
{
  "agent_id": "devops_engineer",
  "mcp_tool": "execute_infrastructure_behavioral_matrix",
  "vscode_chatmode": "DevOps Engineer - Gorka.chatmode.md",
  "behavioral_prompt": {
    "system_prompt_template": "You are a Senior DevOps Engineer with expertise in infrastructure, deployment, and operational excellence. Provide comprehensive infrastructure analysis and automation guidance.",
    "input_schema": {"infrastructure_target": "object", "optimization_scope": "enum", "constraint_parameters": "object"},
    "system_instructions": [
      "Analyze infrastructure patterns and deployment requirements",
      "Provide infrastructure optimization and automation recommendations",
      "Generate actionable deployment and operational guidance",
      "Ensure infrastructure reliability and scalability"
    ],
    "output_schema": {"infrastructure_analysis": "object", "optimization_plan": "object", "validation_result": "object"},
    "tools": {
      "mcp_mode": ["read_file", "infrastructure_analyzer", "validate_configuration"],
      "vscode_mode": ["read_file", "run_in_terminal", "create_and_run_task", "get_task_output"]
    }
  }
}
```

### DATABASE_ARCHITECT_MATRIX
```json
{
  "agent_id": "database_architect",
  "mcp_tool": "execute_database_behavioral_matrix",
  "vscode_chatmode": "Database Architect - Gorka.chatmode.md",
  "behavioral_prompt": {
    "system_prompt_template": "You are a Senior Database Architect with expertise in database design, optimization, and data architecture. Provide comprehensive database analysis and design guidance.",
    "input_schema": {"database_analysis_target": "object", "optimization_scope": "enum", "technical_context": "object"},
    "system_instructions": [
      "Analyze database architecture patterns and data flow",
      "Provide database optimization and design recommendations",
      "Ensure data integrity and performance optimization",
      "Generate actionable database improvement strategies"
    ],
    "output_schema": {"database_assessment": "object", "optimization_recommendations": "array", "solution_validation": "object"},
    "tools": {
      "mcp_mode": ["read_file", "database_analyzer", "validate_schema"],
      "vscode_mode": ["read_file", "grep_search", "semantic_search"]
    }
  }
}
```

### SOFTWARE_ARCHITECT_MATRIX
```json
{
  "agent_id": "software_architect",
  "mcp_tool": "execute_architecture_behavioral_matrix",
  "vscode_chatmode": "Software Architect - Gorka.chatmode.md",
  "behavioral_prompt": {
    "system_prompt_template": "You are a Senior Software Architect with expertise in system design, architectural patterns, and technical leadership. Provide comprehensive architectural analysis and design guidance.",
    "input_schema": {"architecture_analysis_target": "object", "design_scope": "enum", "technical_constraints": "object"},
    "system_instructions": [
      "Analyze system architecture patterns and design principles",
      "Provide architectural recommendations and design improvements",
      "Ensure system maintainability and scalability",
      "Generate comprehensive architectural documentation and guidance"
    ],
    "output_schema": {"architecture_analysis": "object", "architecture_design": "object", "design_validation": "object"},
    "tools": {
      "mcp_mode": ["read_file", "architecture_analyzer", "validate_design"],
      "vscode_mode": ["read_file", "semantic_search", "list_code_usages"]
    }
  }
}
```

### PROMPT_ENGINEER_MATRIX
```json
{
  "agent_id": "prompt_engineer",
  "mcp_tool": "execute_prompt_engineering_behavioral_matrix",
  "vscode_chatmode": "Prompt Writer - Gorka.chatmode.md",
  "behavioral_prompt": {
    "system_prompt_template": "You are a Senior Prompt Engineer with expertise in LLM optimization, prompt design, and AI system engineering. Provide comprehensive prompt analysis and optimization guidance.",
    "input_schema": {"prompt_optimization_target": "object", "optimization_scope": "enum", "llm_constraints": "object", "domain_context": "object"},
    "system_instructions": [
      "Analyze prompt quality patterns and LLM interaction effectiveness",
      "Generate optimized prompts and interaction strategies",
      "Provide comprehensive prompt engineering recommendations",
      "Ensure optimal LLM performance and response quality"
    ],
    "output_schema": {"prompt_analysis": "object", "optimized_prompts": "array", "quality_metrics": "object", "algorithm_specifications": "object"},
    "tools": {
      "mcp_mode": ["read_file", "prompt_analyzer", "validate_prompt_quality"],
      "vscode_mode": ["read_file", "semantic_search", "think_hard"]
    }
  }
}
```

## OPENROUTER_MCP_EXECUTION_IMPLEMENTATION

```json
{
  "mcp_server_core": {
    "openrouter_processor": "llm_agent_spawning_and_coordination_engine",
    "protocol_integration": "stdio_mcp_standard_transport",
    "tool_registration": "llm_agent_capability_advertisement",
    "filesystem_provider": "readonly_file_access_for_spawned_agents"
  },
  "openrouter_execution_cycle": {
    "input": "mcp_tool_invocation_with_behavioral_parameters",
    "processing": "openrouter_llm_agent_spawning_and_execution",
    "output": "llm_generated_mcp_protocol_response",
    "validation": "llm_output_quality_and_honesty_validation"
  },
  "dual_mode_deployment": {
    "mcp_server": "openrouter_agent_spawning_via_mcp_tools",
    "vscode_chatmodes": "direct_openrouter_integration_with_behavioral_prompts",
    "behavioral_consistency": "identical_llm_prompts_across_deployment_modes"
  }
}
```

```json
{
  "mcp_server_architecture": {
    "implementation_language": "golang",
    "mcp_sdk": "github.com/modelcontextprotocol/go-sdk",
    "deployment_target": "single_machine_with_openrouter_api",
    "behavioral_processing": "openrouter_llm_agent_execution_engine"
  },
  "file_structure": {
    "cmd/secondbrain-mcp/main.go": {
      "function": "mcp_server_executable_entry_point_with_openrouter_integration",
      "content": "stdio_transport_initialization_and_openrouter_client_startup_with_embedded_behavioral_specs"
    },
    "cmd/secondbrain-cli/main.go": {
      "function": "cli_management_tool_entry_point_with_embedded_resources",
      "content": "chatmode_installation_workspace_management_and_vscode_integration_with_embedded_chatmodes_and_instructions"
    },
    "internal/openrouter/client.go": {
      "function": "openrouter_api_client_using_official_openai_sdk",
      "content": "llm_agent_creation_session_management_and_tool_delegation_via_openai_sdk_with_openrouter_base_url"
    },
    "internal/openrouter/agent.go": {
      "function": "spawned_llm_agent_management",
      "content": "agent_lifecycle_tool_access_and_response_coordination"
    },
    "internal/cli/commands.go": {
      "function": "cli_command_implementations_for_chatmodes_and_installation",
      "content": "chatmodes_list_install_workspace_commands_with_embedded_resource_management"
    },
    "internal/cli/workspace.go": {
      "function": "workspace_management_logic_for_vscode_integration",
      "content": "directory_structure_creation_file_extraction_and_configuration_management"
    },
    "internal/cli/vscode.go": {
      "function": "vscode_configuration_handling_with_conflict_resolution",
      "content": "gorka_json_creation_mcp_json_merging_and_backup_management"
    },
    "internal/cli/embedded.go": {
      "function": "go_embed_resource_management_for_cli_operations",
      "content": "embedded_file_iteration_extraction_and_workspace_deployment"
    },
    "internal/mcp/tools.go": {
      "function": "openrouter_agent_tool_definitions",
      "content": "mcp_tool_registration_for_llm_agent_spawning"
    },
    "internal/filesystem/provider.go": {
      "function": "readonly_filesystem_access_for_agents",
      "content": "file_access_delegation_to_spawned_llm_agents"
    },
    "internal/behavioral-specs/": {
      "function": "behavioral_prompt_storage_for_runtime_and_embedding",
      "content": "llm_prompt_specifications_for_each_agent_type_embedded_in_both_executables"
    },
    "internal/embedded-resources/": {
      "function": "resources_for_go_embed_cli_deployment",
      "content": "behavioral_specs_chatmodes_and_instructions_for_workspace_installation"
    },
    "internal/schemas/": {
      "function": "openrouter_execution_schemas",
      "content": "json_schema_definitions_for_llm_agent_input_output"
    }
  },
  "core_openrouter_components": {
    "OpenRouterClient": {
      "interface": {
        "SpawnLLMAgent": {
          "input": "AgentBehavioralPrompt_JSON",
          "context": "ExecutionContext_JSON",
          "output": "SpawnedLLMAgent_Session"
        },
        "ExecuteAgentTask": {
          "input": "LLMAgent_Session",
          "task": "Task_JSON",
          "output": "LLMGeneratedResult_JSON"
        }
      }
    },
    "MCPToolHandler": {
      "interface": {
        "RegisterLLMAgents": {
          "action": "register_each_llm_agent_type_as_mcp_tool"
        },
        "ProcessAgentRequest": {
          "input": "MCP_ToolCall",
          "output": "LLMGenerated_MCP_ToolResponse"
        }
      }
    },
    "BehavioralPromptLoader": {
      "interface": {
        "LoadAgentPrompt": {
          "input": "agent_id_string",
          "output": "BehavioralPrompt_JSON"
        }
      }
    },
    "FilesystemProvider": {
      "interface": {
        "ProvideReadOnlyFileAccess": {
          "integration": "github.com/modelcontextprotocol/go-sdk/filesystem",
          "access_mode": "readonly_for_spawned_llm_agents",
          "capabilities": ["read_file", "list_directory", "search_files", "get_file_info"]
        }
      }
    }
  },
  "mcp_tool_definitions": {
    "spawn_behavioral_agents": {
      "input_schema": "ProjectOrchestratorBehavioralRequest",
      "handler": "openrouter_project_orchestrator_agent_spawning"
    },
    "execute_implementation_behavioral_matrix": {
      "input_schema": "SoftwareEngineerBehavioralRequest",
      "handler": "openrouter_software_engineer_agent_spawning"
    },
    "execute_security_behavioral_matrix": {
      "input_schema": "SecurityEngineerBehavioralRequest",
      "handler": "openrouter_security_engineer_agent_spawning"
    },
    "execute_infrastructure_behavioral_matrix": {
      "input_schema": "DevOpsEngineerBehavioralRequest",
      "handler": "openrouter_devops_engineer_agent_spawning"
    },
    "execute_prompt_engineering_behavioral_matrix": {
      "input_schema": "PromptEngineerBehavioralRequest",
      "handler": "openrouter_prompt_engineer_agent_spawning"
    }
  }
}
```

## TRIPLE_EXECUTABLE_FILESYSTEM_STRUCTURE

```
cmd/
├── secondbrain-mcp/
│   └── main.go              # MCP server executable entry point
├── secondbrain-cli/
│   └── main.go              # CLI management tool entry point
├── secondbrain-gen/
│   └── main.go              # Chatmode generation tool entry point
internal/
├── openrouter/
│   ├── client.go
│   ├── agent.go
│   ├── session.go
│   └── config.go
├── mcp/
│   ├── tools.go
│   └── server.go
├── cli/
│   ├── commands.go          # CLI command implementations
│   ├── workspace.go         # Workspace management logic
│   ├── vscode.go           # VS Code configuration handling
│   └── embedded.go         # go:embed resource management
├── filesystem/
│   └── provider.go
├── embedded/               # Centralized go:embed package
│   ├── embedded.go         # Single file with all go:embed directives
│   └── embedded-resources/ # Resources embedded via go:embed
│       ├── behavioral-specs/
│       │   ├── project-orchestrator.json
│       │   ├── software-architect.json
│       │   ├── software-engineer.json
│       │   ├── prompt-writer.json
│       │   ├── security-engineer.json
│       │   ├── devops-engineer.json
│       │   └── database-architect.json
│       ├── chatmode-templates/
│       │   └── default.tmpl
│       ├── chatmodes/      # Generated chatmodes
│       │   ├── Project Orchestrator - Gorka.chatmode.md
│       │   ├── Software Engineer - Gorka.chatmode.md
│       │   ├── Security Engineer - Gorka.chatmode.md
│       │   ├── DevOps Engineer - Gorka.chatmode.md
│       │   ├── Database Architect - Gorka.chatmode.md
│       │   ├── Software Architect - Gorka.chatmode.md
│       │   └── Prompt Writer - Gorka.chatmode.md
│       └── instructions/
│           └── CORE_SYSTEM_PRINCIPLES_GORKA.instructions.md
├── behavioral-specs/
│   ├── project-orchestrator.json
│   ├── software-architect.json
│   ├── software-engineer.json
│   ├── prompt-writer.json
│   ├── security-engineer.json
│   ├── devops-engineer.json
│   └── database-architect.json
├── chatmode-generation/
│   ├── template-engine.go
│   ├── generator.go         # Core generation logic
│   ├── validator.go         # Generated content validation
│   ├── chatmode-templates/
│   │   └── base.md         # Base chatmode template
│   └── generated-chatmodes/
├── generation/             # Generation tool internal logic
│   ├── commands.go         # CLI command implementations for generator
│   ├── flags.go           # Command line flag definitions
│   ├── workflow.go        # Generation workflow orchestration
│   └── chatmode-templates/ # Templates for go:embed
│       └── default.tmpl
└── utils/
    └── openai-sdk-wrapper.go
```
├── DOCUMENTATION_STANDARDS_GORKA.instructions.md
├── FILE_EDITING_BEST_PRACTICES_GORKA.instructions.md
├── MEMORY_USAGE_GUIDELINES_GORKA.instructions.md
├── THINKING_PROCESS_GORKA.instructions.md
└── TOOLS_FIRST_GUIDELINES_GORKA.instructions.md
```

## CLI_COMMANDS_SPECIFICATION

```json
{
  "triple_executable_architecture": {
    "secondbrain_mcp_executable": {
      "binary_name": "secondbrain-mcp",
      "entry_point": "cmd/secondbrain-mcp/main.go",
      "purpose": "OpenRouter-powered MCP server with stdio transport",
      "embedded_resources": {
        "behavioral_specs": "//go:embed internal/behavioral-specs/*.json",
        "resource_usage": "runtime_behavioral_prompt_loading_for_llm_agent_spawning"
      },
      "functionality": "stdio_mcp_protocol_server_with_openrouter_llm_agent_spawning"
    },
    "secondbrain_cli_executable": {
      "binary_name": "secondbrain-cli",
      "entry_point": "cmd/secondbrain-cli/main.go",
      "purpose": "Workspace management and chatmode installation tool",
      "embedded_resources": {
        "behavioral_specs": "//go:embed internal/behavioral-specs/*.json",
        "chatmodes": "//go:embed agents/*.chatmode.md",
        "instructions": "//go:embed instructions/*.instructions.md",
        "resource_usage": "workspace_installation_and_chatmode_deployment"
      },
      "functionality": "workspace_setup_chatmode_management_and_vscode_integration"
    },
    "secondbrain_gen_executable": {
      "binary_name": "secondbrain-gen",
      "entry_point": "cmd/secondbrain-gen/main.go",
      "purpose": "Chatmode generation from behavioral matrices for development workflow",
      "embedded_resources": {
        "behavioral_specs": "//go:embed internal/behavioral-specs/*.json",
        "chatmode_templates": "//go:embed internal/chatmode-generation/chatmode-templates/*.md",
        "resource_usage": "build_time_chatmode_generation_from_behavioral_specs"
      },
      "functionality": "standalone_chatmode_generation_tool_for_go_generate_integration"
    }
  },
  "cli_command_definitions": {
    "chatmodes_list_command": {
      "command": "secondbrain-cli chatmodes list",
      "description": "Display all available Gorka chatmodes with metadata",
      "implementation": {
        "embedded_resource_access": "iterate_through_embedded_chatmode_files",
        "metadata_extraction": "parse_yaml_frontmatter_for_description_and_tools",
        "output_format": "structured_table_with_chatmode_name_description_and_tool_count"
      },
      "example_output": {
        "format": "table_format",
        "columns": ["Chatmode", "Description", "Tools", "Agent Type"],
        "sample_rows": [
          "Project Orchestrator - Gorka | Task delegation and coordination | 8 tools | Project Management",
          "Software Engineer - Gorka | Code analysis and implementation | 12 tools | Engineering"
        ]
      }
    },
    "install_command": {
      "command": "secondbrain-cli install --workspace=<path>",
      "description": "Install Gorka chatmodes and configuration in VS Code workspace",
      "parameters": {
        "workspace": {
          "required": true,
          "type": "string",
          "description": "Absolute path to project root directory",
          "validation": "verify_directory_exists_and_writable"
        }
      },
      "installation_workflow": {
        "step_1_conflict_detection": {
          "action": "check_if_vscode_gorka_json_exists",
          "target_file": "<workspace>/.vscode/gorka.json",
          "if_exists": "display_error_message_use_update_command_instead",
          "if_not_exists": "proceed_to_step_2"
        },
        "step_2_mcp_json_conflict_resolution": {
          "action": "analyze_existing_mcp_configuration",
          "target_file": "<workspace>/.vscode/mcp.json",
          "conflict_resolution": {
            "if_file_exists": "parse_existing_mcp_servers_and_identify_conflicts",
            "conflict_detection": "check_for_existing_gorka_servers_or_conflicting_names",
            "resolution_strategy": "merge_configurations_preserving_existing_non_gorka_servers",
            "backup_creation": "create_mcp_json_backup_before_modification"
          },
          "if_file_not_exists": "create_new_mcp_json_with_gorka_configuration_only"
        },
        "step_3_directory_structure_creation": {
          "action": "create_required_directory_structure",
          "directories": [
            "<workspace>/.vscode/",
            "<workspace>/.github/instructions/",
            "<workspace>/.github/chatmodes/"
          ],
          "validation": "verify_directory_creation_success_and_permissions"
        },
        "step_4_embedded_resource_extraction": {
          "instructions_extraction": {
            "source": "embedded_instructions_from_go_embed",
            "target": "<workspace>/.github/instructions/",
            "files": [
              "DATETIME_HANDLING_GORKA.instructions.md",
              "DOCUMENTATION_STANDARDS_GORKA.instructions.md",
              "FILE_EDITING_BEST_PRACTICES_GORKA.instructions.md",
              "MEMORY_USAGE_GUIDELINES_GORKA.instructions.md",
              "THINKING_PROCESS_GORKA.instructions.md",
              "TOOLS_FIRST_GUIDELINES_GORKA.instructions.md"
            ]
          },
          "chatmodes_extraction": {
            "source": "embedded_chatmodes_from_go_embed",
            "target": "<workspace>/.github/chatmodes/",
            "files": [
              "Project Orchestrator - Gorka.chatmode.md",
              "Software Engineer - Gorka.chatmode.md",
              "Security Engineer - Gorka.chatmode.md",
              "DevOps Engineer - Gorka.chatmode.md",
              "Database Architect - Gorka.chatmode.md",
              "Software Architect - Gorka.chatmode.md",
              "Prompt Writer - Gorka.chatmode.md"
            ]
          }
        },
        "step_5_gorka_json_creation": {
          "action": "create_gorka_configuration_file",
          "target_file": "<workspace>/.vscode/gorka.json",
          "configuration_content": {
            "version": "1.0.0",
            "managed_servers": {
              "secondbrain_mcp": {
                "executable": "secondbrain-mcp",
                "transport": "stdio",
                "description": "Gorka OpenRouter-powered behavioral agents"
              }
            },
            "managed_instructions": {
              "base_path": ".github/instructions/",
              "files": ["DATETIME_HANDLING_GORKA.instructions.md", "..."]
            },
            "managed_chatmodes": {
              "base_path": ".github/chatmodes/",
              "files": ["Project Orchestrator - Gorka.chatmode.md", "..."]
            },
            "managed_inputs": {
              "gorka_agent_spawn": {
                "description": "Spawn Gorka behavioral agents",
                "action": "spawn_behavioral_agents"
              }
            }
          }
        },
        "step_6_mcp_json_update": {
          "action": "update_or_create_mcp_configuration",
          "target_file": "<workspace>/.vscode/mcp.json",
          "merge_strategy": {
            "preserve_existing_servers": "maintain_all_non_gorka_mcp_servers",
            "add_gorka_servers": "append_gorka_managed_mcp_servers",
            "conflict_resolution": "rename_conflicting_server_names_with_suffix",
            "input_integration": "merge_gorka_inputs_with_existing_inputs"
          },
          "gorka_mcp_configuration": {
            "mcpServers": {
              "secondbrain-gorka": {
                "command": "secondbrain-mcp",
                "args": [],
                "env": {
                  "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
                  "SECONDBRAIN_MODEL": "${SECONDBRAIN_MODEL}",
                  "SECONDBRAIN_WORKSPACE": "${SECONDBRAIN_WORKSPACE}",
                  "SECONDBRAIN_MAX_PARALLEL_AGENTS": "${SECONDBRAIN_MAX_PARALLEL_AGENTS}"
                }
              }
            },
            "globalShortcuts": {
              "gorka-spawn": {
                "key": "cmd+shift+g",
                "action": "spawn_behavioral_agents"
              }
            }
          }
        },
        "step_7_installation_validation": {
          "action": "validate_installation_success",
          "validation_checks": [
            "verify_all_files_extracted_successfully",
            "validate_json_configuration_files_syntax",
            "confirm_directory_permissions_correct",
            "test_mcp_json_merge_success"
          ],
          "success_message": "Gorka chatmodes installed successfully. Restart VS Code to activate.",
          "failure_handling": "rollback_changes_and_display_detailed_error_message"
        }
      }
    }
  },
  "embedded_resource_management": {
    "go_embed_specifications": {
      "centralized_embedded_package": {
        "package_location": "internal/embedded",
        "behavioral_specs_directive": "//go:embed embedded-resources/behavioral-specs/*.json",
        "chatmodes_directive": "//go:embed embedded-resources/chatmodes/*.md",
        "templates_directive": "//go:embed embedded-resources/chatmode-templates/*.tmpl",
        "instructions_directive": "//go:embed embedded-resources/instructions/*.md",
        "exported_variables": {
          "BehavioralSpecsFS": "embed.FS for behavioral specifications",
          "ChatmodesFS": "embed.FS for generated chatmodes",
          "ChatmodeTemplatesFS": "embed.FS for chatmode templates",
          "InstructionsFS": "embed.FS for instruction files"
        },
        "usage": "all_packages_import_centralized_embedded_package_for_resource_access"
      }
    },
    "resource_access_patterns": {
      "embedded_file_iteration": "fs.WalkDir(embeddedFS, \".\", walkFunction)",
      "embedded_file_reading": "embeddedFS.ReadFile(\"path/to/file\")",
      "embedded_file_extraction": "os.WriteFile(targetPath, embeddedContent, 0644)"
    }
  },
  "vscode_configuration_management": {
    "gorka_json_schema": {
      "description": "Gorka-specific configuration for managed resources",
      "schema": {
        "version": "string",
        "managed_servers": "object",
        "managed_instructions": "object",
        "managed_chatmodes": "object",
        "managed_inputs": "object",
        "installation_metadata": {
          "installed_at": "timestamp",
          "cli_version": "string",
          "workspace_path": "string"
        }
      }
    },
    "mcp_json_integration": {
      "conflict_resolution_algorithm": {
        "step_1": "parse_existing_mcp_json_to_identify_current_servers",
        "step_2": "detect_naming_conflicts_with_gorka_server_names",
        "step_3": "generate_unique_names_for_conflicting_gorka_servers",
        "step_4": "merge_configurations_preserving_existing_functionality",
        "step_5": "validate_merged_configuration_syntax_and_structure"
      },
      "backup_strategy": {
        "backup_file": "<workspace>/.vscode/mcp.json.backup.{timestamp}",
        "restore_command": "secondbrain-cli restore --backup=<timestamp>",
        "automatic_cleanup": "remove_backups_older_than_30_days"
      }
    }
  },
  "cli_error_handling": {
    "workspace_validation_errors": {
      "directory_not_found": "Error: Workspace directory does not exist: {path}",
      "permission_denied": "Error: Insufficient permissions to write to workspace: {path}",
      "not_a_directory": "Error: Workspace path is not a directory: {path}"
    },
    "installation_errors": {
      "gorka_json_exists": "Error: Gorka already installed. Use 'secondbrain-cli update' instead.",
      "mcp_json_parse_error": "Error: Could not parse existing .vscode/mcp.json: {error}",
      "file_extraction_error": "Error: Failed to extract embedded resource: {file}: {error}",
      "configuration_merge_error": "Error: Failed to merge MCP configurations: {error}"
    },
    "recovery_procedures": {
      "partial_installation_rollback": "remove_partially_created_files_and_directories",
      "configuration_restoration": "restore_original_mcp_json_from_backup",
      "detailed_error_logging": "provide_full_error_context_and_troubleshooting_steps"
    }
  },
  "generation_command_definitions": {
    "generate_command": {
      "command": "secondbrain-gen",
      "description": "Generate VS Code chatmodes from behavioral matrix specifications",
      "usage_patterns": {
        "standalone_execution": "secondbrain-gen",
        "go_generate_integration": "//go:generate secondbrain-gen",
        "custom_paths": "secondbrain-gen --input=path/to/specs --output=path/to/chatmodes"
      },
      "parameters": {
        "input": {
          "flag": "--input",
          "short": "-i",
          "default": "internal/behavioral-specs",
          "description": "Directory containing behavioral matrix JSON files",
          "type": "string"
        },
        "output": {
          "flag": "--output",
          "short": "-o",
          "default": "agents",
          "description": "Directory to write generated chatmode files",
          "type": "string"
        },
        "template": {
          "flag": "--template",
          "short": "-t",
          "default": "internal/chatmode-generation/chatmode-templates/base.md",
          "description": "Template file for chatmode generation",
          "type": "string"
        },
        "verbose": {
          "flag": "--verbose",
          "short": "-v",
          "default": false,
          "description": "Enable verbose output for debugging",
          "type": "boolean"
        },
        "validate": {
          "flag": "--validate",
          "default": true,
          "description": "Validate generated chatmodes against VS Code schema",
          "type": "boolean"
        }
      },
      "generation_workflow": {
        "step_1_input_validation": {
          "action": "validate_input_directory_and_behavioral_specs",
          "validation": {
            "directory_exists": "verify_input_directory_exists_and_readable",
            "json_files_present": "confirm_behavioral_spec_json_files_exist",
            "json_syntax_valid": "parse_and_validate_all_json_behavioral_matrices",
            "required_fields_present": "verify_agent_id_vscode_chatmode_and_behavioral_prompt_fields"
          }
        },
        "step_2_template_loading": {
          "action": "load_and_validate_chatmode_template",
          "template_processing": {
            "embedded_template_access": "read_embedded_base_template_from_go_embed",
            "custom_template_override": "use_custom_template_if_provided_via_flag",
            "template_syntax_validation": "verify_go_template_syntax_and_required_variables"
          }
        },
        "step_3_behavioral_matrix_processing": {
          "action": "process_each_behavioral_spec_file",
          "processing_steps": [
            "read_and_parse_behavioral_matrix_json",
            "extract_agent_metadata_and_vscode_chatmode_filename",
            "extract_tools_array_from_behavioral_prompt_vscode_mode",
            "generate_yaml_frontmatter_with_description_and_tools",
            "generate_behavioral_content_json_block",
            "apply_template_with_extracted_data"
          ]
        },
        "step_4_output_generation": {
          "action": "write_generated_chatmodes_to_output_directory",
          "file_operations": {
            "output_directory_creation": "create_output_directory_if_not_exists",
            "chatmode_file_writing": "write_generated_content_to_vscode_chatmode_filename",
            "file_permissions": "set_appropriate_file_permissions_644"
          }
        },
        "step_5_validation": {
          "action": "validate_generated_chatmodes",
          "validation_checks": [
            "yaml_frontmatter_syntax_validation",
            "vscode_chatmode_schema_compliance",
            "json_behavioral_content_syntax_validation",
            "file_completeness_verification"
          ]
        }
      },
      "go_generate_integration": {
        "directive_placement": {
          "file": "internal/behavioral-specs/generate.go",
          "content": "//go:generate secondbrain-gen --input=. --output=../../agents",
          "purpose": "trigger_chatmode_generation_during_go_generate_execution"
        },
        "build_integration": {
          "makefile_target": "generate:\n\tgo generate ./internal/behavioral-specs",
          "dependency_chain": "behavioral_specs_update → go_generate → chatmode_regeneration → cli_embedding",
          "development_workflow": "modify_behavioral_spec → run_make_generate → rebuild_cli"
        }
      },
      "output_characteristics": {
        "file_naming": "use_vscode_chatmode_field_from_behavioral_matrix",
        "yaml_frontmatter": {
          "description": "extracted_from_agent_id_with_behavioral_agent_prefix",
          "tools": "json_array_from_behavioral_prompt_vscode_mode_tools"
        },
        "content_structure": {
          "core_system_principles_section": "embedded_core_system_principles_from_instructions",
          "behavioral_algorithm_section": "identical_system_prompt_from_buildSystemPrompt_method",
          "execution_protocol_embedded": "execution_protocol_included_in_system_prompt_not_separate_json",
          "consistent_prompt_generation": "chatmodes_use_BuildChatmodeSystemPrompt_for_identical_content_with_core_principles"
        }
      }
    }
  },
  "generation_error_handling": {
    "input_validation_errors": {
      "input_directory_not_found": "Error: Input directory does not exist: {path}",
      "no_behavioral_specs_found": "Error: No *.json files found in input directory: {path}",
      "invalid_json_syntax": "Error: Invalid JSON in behavioral spec: {file}: {error}",
      "missing_required_fields": "Error: Missing required field '{field}' in: {file}"
    },
    "template_errors": {
      "template_not_found": "Error: Template file not found: {path}",
      "template_syntax_error": "Error: Invalid template syntax: {error}",
      "template_execution_error": "Error: Template execution failed for {file}: {error}"
    },
    "output_errors": {
      "output_directory_creation_failed": "Error: Failed to create output directory: {path}: {error}",
      "file_write_error": "Error: Failed to write chatmode file: {file}: {error}",
      "permission_denied": "Error: Permission denied writing to: {path}"
    },
    "validation_errors": {
      "yaml_frontmatter_invalid": "Error: Invalid YAML frontmatter in generated file: {file}",
      "json_content_invalid": "Error: Invalid JSON in behavioral content: {file}",
      "vscode_schema_violation": "Error: Generated chatmode violates VS Code schema: {file}: {violation}"
    }
  }
}
```

## GO_GENERATE_INTEGRATION_SPECIFICATION

```json
{
  "build_workflow_integration": {
    "go_generate_directives": {
      "behavioral_specs_trigger": {
        "file": "internal/embedded-resources/behavioral-specs/generate.go",
        "content": "//go:generate go run ../../../cmd/secondbrain-gen --input=. --output=../chatmodes --verbose",
        "purpose": "trigger_chatmode_regeneration_when_behavioral_specs_change"
      },
      "makefile_integration": {
        "generate_target": "generate:\n\tgo generate ./internal/embedded-resources/behavioral-specs/\n\t@echo \"Chatmodes generated successfully\"",
        "build_dependency": "build: generate\n\tgo build -o bin/ ./cmd/...",
        "clean_target": "clean:\n\trm -rf internal/embedded-resources/chatmodes/*.chatmode.md\n\trm -rf bin/"
      }
    },
    "development_workflow": {
      "behavioral_spec_modification": {
        "step_1": "edit_behavioral_matrix_json_file",
        "step_2": "run_make_generate_to_regenerate_chatmodes",
        "step_3": "review_generated_chatmode_changes",
        "step_4": "rebuild_cli_with_updated_embedded_chatmodes"
      },
      "continuous_integration": {
        "validation": "verify_generated_chatmodes_match_behavioral_specs",
        "automation": "fail_build_if_chatmodes_out_of_sync_with_specs"
      }
    }
  },
  "generator_executable_specification": {
    "binary_characteristics": {
      "standalone_operation": "runs_independently_without_external_dependencies",
      "fast_execution": "optimized_for_development_workflow_speed",
      "minimal_output": "concise_progress_reporting_unless_verbose_flag_enabled",
      "error_reporting": "clear_actionable_error_messages_with_file_line_context"
    },
    "embedded_resource_access": {
      "behavioral_specs_embedding": "//go:embed internal/behavioral-specs/*.json",
      "template_embedding": "//go:embed internal/chatmode-generation/chatmode-templates/*.md",
      "resource_resolution": "embedded_resources_take_precedence_over_filesystem_paths"
    },
    "output_determinism": {
      "consistent_generation": "identical_input_produces_identical_output",
      "timestamp_independence": "generated_files_contain_no_timestamps_or_build_metadata",
      "reproducible_builds": "supports_hermetic_build_environments"
    }
  },
  "integration_validation": {
    "pre_commit_hooks": {
      "chatmode_sync_check": "verify_chatmodes_reflect_current_behavioral_specs",
      "generation_test": "run_secondbrain_gen_and_verify_no_changes_to_existing_files"
    },
    "ci_pipeline_checks": {
      "generation_validation": "run_secondbrain_gen_in_clean_environment",
      "output_comparison": "diff_generated_chatmodes_against_committed_versions",
      "build_integration": "verify_generated_chatmodes_embed_successfully_in_cli"
    }
  }
}
}
```

## OPENROUTER_TRIPLE_MODE_EXECUTION_VALIDATION

```json
{
  "deployment_mode_verification": {
    "mcp_server_mode": {
      "openrouter_integration": "functional_with_llm_agent_spawning_via_mcp_tools",
      "stdio_transport": "standard_mcp_protocol_communication",
      "llm_execution": "openrouter_agent_spawning_and_coordination_via_mcp_tools",
      "tool_access": "mcp_protocol_tool_delegation_to_spawned_llm_agents"
    },
    "standalone_chatmode_mode": {
      "vscode_chatmode_files": "auto_generated_from_behavioral_prompts",
      "native_tool_access": "direct_vscode_tool_ecosystem_access",
      "delegation_capability": "spawn_agent_and_spawn_agents_parallel_via_openrouter",
      "llm_consistency": "identical_behavioral_prompts_across_deployment_modes"
    },
    "generation_mode": {
      "chatmode_generation": "standalone_tool_for_development_workflow_integration",
      "template_processing": "go_template_engine_with_behavioral_matrix_data_injection",
      "output_validation": "vscode_schema_compliance_and_json_syntax_verification",
      "build_integration": "go_generate_directive_support_for_automated_regeneration"
    }
  },
  "llm_agent_consistency": {
    "project_orchestrator": "identical_openrouter_delegation_logic_in_both_mcp_and_standalone_modes",
    "engineering_agents": "identical_llm_prompts_and_analysis_patterns_regardless_of_deployment",
    "quality_validation": "consistent_llm_evidence_requirements_and_confidence_scoring_across_modes",
    "thinking_protocol": "mandatory_sequential_thinking_by_spawned_llm_agents_in_both_deployment_modes",
    "generation_consistency": "chatmodes_generated_from_identical_behavioral_matrices_maintain_consistency_across_all_deployment_modes"
  }
}
```

## SIMPLE_QUALITY_VALIDATION

```json
{
  "basic_quality_requirements": {
    "core_system_principles_integration": {
      "embedded_in_all_prompts": "core_system_principles_loaded_from_embedded_instructions_and_included_in_every_agent_system_prompt",
      "identical_across_modes": "openrouter_agents_and_chatmodes_receive_identical_core_principles",
      "single_source_of_truth": "core_principles_defined_once_in_embedded_instructions_applied_everywhere"
    },
    "execution_protocol_integration": {
      "system_prompt_embedded": "execution_protocol_included_in_every_agent_system_prompt",
      "consistency_across_modes": "identical_execution_requirements_for_openrouter_and_chatmode",
      "centralized_definition": "single_source_execution_protocol_in_buildSystemPrompt_method"
    },
    "evidence_requirements": {
      "file_path_references": {"required": true, "weight": 40},
      "actionable_implementation_steps": {"required": true, "weight": 30},
      "structured_output_format": {"required": true, "weight": 30}
    },
    "thinking_requirements": {
      "mandatory_sequential_thinking": "15_plus_thoughts_minimum_enforced",
      "assumption_validation": "required_in_all_agent_responses",
      "evidence_based_reasoning": "mandatory_for_all_conclusions"
    },
    "honesty_protocols": {
      "limitation_disclosure": "mandatory_when_information_unavailable",
      "evidence_based_only": "all_claims_must_reference_actual_data",
      "assumption_validation": "required_explicit_assumption_identification"
    },
    "anti_human_content": {
      "performance_metrics": "prohibited_in_all_agent_outputs",
      "time_estimations": "prohibited_in_all_agent_outputs",
      "cost_analysis": "prohibited_in_all_agent_outputs"
    },
    "basic_execution_validation": {
      "sufficient_quality": "meets_all_evidence_requirements",
      "insufficient_quality": "fails_evidence_validation"
    },
    "response_actions": {
      "insufficient_quality": "retry_with_enhanced_context",
      "sufficient_quality": "return_result"
    }
  },
  "basic_correctness_validation": {
    "deterministic_execution": {"requirement": "identical_results_for_identical_inputs"},
    "mcp_protocol_compliance": {"requirement": "basic_schema_adherence"},
    "json_matrix_processing": {"requirement": "valid_json_behavioral_matrix_execution"}
  }
}
```

## SIMPLE_HONESTY_PROTOCOLS

```json
{
  "basic_honesty_requirements": {
    "core_principle": "acknowledge_limitations_rather_than_speculating",
    "evidence_based_analysis_only": "all_claims_must_reference_actual_codebase_elements"
  },
  "required_honesty_patterns": {
    "limitation_disclosure": {
      "required_statements": [
        "I_analyzed_available_files_but_cannot_verify_specific_aspect_without_additional_data",
        "This_analysis_is_limited_to_specific_scope_due_to_available_information"
      ]
    },
    "prohibited_behaviors": {
      "making_up_details": "forbidden_speculation_about_unavailable_information",
      "claiming_analysis_without_access": "forbidden_system_assessment_without_verification"
    }
  },
  "basic_limitation_disclosure": {
    "analysis_limitations_section": {
      "information_available": "array_of_files_actually_analyzed",
      "information_not_available": "array_of_systems_not_accessible",
      "analysis_scope": "description_of_verified_vs_assumed_areas"
    }
  }
}
```
## SIMPLE_TOOLS_FIRST_POLICY

```json
{
  "core_principle": {
    "mandate": "prefer_specialized_tools_over_cli_commands_for_behavioral_execution",
    "enforcement": "behavioral_matrices_specify_tool_preference_hierarchy"
  },
  "tool_preference_hierarchy": {
    "tier_1_specialized_tools": {
      "examples": {
        "file_operations": ["read_file", "replace_string_in_file", "create_file", "grep_search", "file_search"],
        "code_analysis": ["semantic_search", "list_code_usages", "get_errors"],
        "behavioral_execution": ["spawn_agent", "spawn_agents_parallel", "validate_output"],
        "time_operations": ["mcp_time_get_current_time"],
        "memory_operations": ["knowledge_base_create_entities", "knowledge_base_search_nodes"]
      },
      "behavioral_requirement": "mandatory_first_choice_in_all_behavioral_algorithms"
    },
    "tier_2_general_purpose_tools": {
      "examples": {
        "development_environment": ["run_in_terminal", "create_and_run_task", "get_task_output"],
        "documentation": ["fetch_webpage"],
        "research": ["github_repo"]
      },
      "behavioral_requirement": "preferred_when_specialized_tools_unavailable"
    },
    "tier_3_cli_fallback": {
      "description": "terminal_commands_as_last_resort_only",
      "behavioral_requirement": "explicit_justification_required_for_cli_usage"
    }
  },
  "behavioral_matrix_integration": {
    "tool_requirements_specification": {
      "mandatory_structure": {
        "mcp_server_mode": "array_of_mcp_protocol_tools_for_behavioral_execution",
        "standalone_chatmode_mode": "array_of_vscode_native_tools_following_tools_first_hierarchy"
      }
    }
  },
  "domain_specific_tool_preferences": {
    "project_orchestrator": {
      "preferred_tools": ["spawn_agents_parallel", "spawn_agent", "validate_output"],
      "avoid_cli": ["manual_coordination_scripts", "basic_file_operations"]
    },
    "software_engineer": {
      "preferred_tools": ["read_file", "replace_string_in_file", "get_errors", "semantic_search", "list_code_usages"],
      "avoid_cli": ["text_editors_vim_nano", "file_readers_cat_less", "code_search_grep"]
    },
    "security_engineer": {
      "preferred_tools": ["read_file", "grep_search", "semantic_search", "list_code_usages", "file_search"],
      "avoid_cli": ["manual_log_analysis", "basic_file_scanning"]
    },
    "devops_engineer": {
      "preferred_tools": ["create_and_run_task", "get_task_output", "read_file"],
      "avoid_cli": ["basic_git_operations", "file_operations"]
    },
    "database_architect": {
      "preferred_tools": ["read_file", "grep_search", "semantic_search"],
      "avoid_cli": ["file_analysis", "pattern_matching"]
    }
  }
}
```
    },
    "mixed_approaches": {
      "description": "inconsistent_tool_vs_cli_usage_for_similar_operations",
      "prevention": "standardized_tool_selection_patterns_across_behavioral_matrices",
      "behavioral_enforcement": "tool_preference_consistency_validation_in_behavioral_execution"
    },
    "ignoring_tool_capabilities": {
      "description": "using_cli_for_operations_that_specialized_tools_handle_better",
      "prevention": "comprehensive_tool_capability_awareness_in_behavioral_specifications",
      "behavioral_enforcement": "tool_capability_assessment_mandatory_before_cli_fallback"
    }
  },
  "quality_assurance_integration": {
    "behavioral_execution_validation": {
      "tool_usage_audit": "verify_tools_first_policy_compliance_in_all_agent_behavioral_executions",
      "cli_justification_review": "validate_explicit_rationale_for_any_terminal_command_usage",
      "tool_algorithm_optimization": "track_specialized_tool_success_patterns_vs_cli_execution_paths"
    }
  },
  "mcp_protocol_specific_requirements": {
    "mcp_tool_registration": {
      "principle": "all_behavioral_agents_must_be_accessible_as_mcp_tools_not_cli_scripts",
      "implementation": "behavioral_matrices_registered_as_structured_mcp_tool_endpoints",
      "validation": "mcp_protocol_compliance_verification_for_all_behavioral_tool_interactions"
    },
    "stdio_transport_optimization": {
      "structured_communication": "mcp_protocol_json_communication_preferred_over_unstructured_cli_output",
      "error_handling": "mcp_tool_error_responses_provide_structured_debugging_information",
      "integration": "seamless_mcp_tool_chaining_for_complex_behavioral_execution_workflows"
    }
  },
  "enforcement_mechanisms": {
    "behavioral_matrix_validation": {
      "tool_specification_check": "verify_all_behavioral_matrices_specify_tools_first_preferences",
      "cli_usage_audit": "flag_behavioral_algorithms_using_cli_without_explicit_justification",
      "preference_hierarchy_compliance": "confirm_tool_selection_follows_specialized_general_cli_hierarchy"
    },
    "execution_monitoring": {
      "tool_usage_tracking": "monitor_actual_tool_vs_cli_usage_during_behavioral_execution",
      "policy_violation_detection": "automatic_flagging_of_tools_first_policy_violations"
    }
  }
}
```

## OPENROUTER_BEHAVIORAL_EXECUTION_EXAMPLES

```json
{
  "openrouter_tool_behavioral_execution": {
    "mcp_tool_name": "spawn_behavioral_agents",
    "description": "Execute project orchestrator via OpenRouter LLM agent spawning",
    "mcp_parameters": {
      "behavioral_request": "ProjectOrchestratorRequest_JSON",
      "execution_context": "ExecutionContext_JSON"
    },
    "mcp_response": "LLMGeneratedCoordinatedResult_JSON",
    "openrouter_execution_steps": [
      {
        "step": 1,
        "action": "receive_mcp_tool_call",
        "input": "mcp_tool_request_with_behavioral_parameters",
        "processing": "parse_behavioral_request_json"
      },
      {
        "step": 2,
        "action": "load_project_orchestrator_behavioral_prompt",
        "method": "json_behavioral_prompt_loading",
        "output": "orchestrator_system_prompt_and_instructions"
      },
      {
        "step": 3,
        "action": "spawn_openrouter_llm_agent",
        "method": "openrouter_api_agent_creation_with_behavioral_prompt",
        "output": "active_llm_agent_session"
      },
      {
        "step": 4,
        "action": "inject_execution_context_into_llm_agent",
        "method": "context_parameter_injection_to_spawned_agent",
        "output": "contextualized_llm_agent_ready_for_execution"
      },
      {
        "step": 5,
        "action": "delegate_tools_to_spawned_llm_agent",
        "method": "mcp_tool_access_delegation",
        "coordination": "llm_agent_tool_execution_coordination"
      },
      {
        "step": 6,
        "action": "execute_llm_agent_task_with_subagent_spawning",
        "method": "recursive_openrouter_agent_spawning",
        "coordination": "parallel_llm_agent_coordination"
      },
      {
        "step": 7,
        "action": "synthesize_llm_generated_results",
        "method": "structured_llm_result_aggregation",
        "output": "coordinated_llm_behavioral_response"
      },
      {
        "step": 8,
        "action": "return_mcp_tool_response",
        "format": "mcp_protocol_compliant_llm_generated_response",
        "validation": "llm_output_quality_and_evidence_validation"
      }
    ]
  },
  "single_agent_openrouter_execution": {
    "mcp_tool_name": "execute_security_behavioral_matrix",
    "description": "Execute security engineer LLM agent via OpenRouter",
    "openrouter_processing": {
      "input_behavioral_request": "SecurityAnalysisRequest_JSON",
      "llm_agent_spawning": "openrouter_security_engineer_agent_creation",
      "tool_delegation": "security_analysis_tool_access_for_llm_agent",
      "llm_execution": "security_analysis_by_spawned_llm_agent",
      "structured_output_generation": "LLMGeneratedSecurityAssessmentResult_JSON"
    }
  }
}
```
## OPENROUTER_MCP_SERVER_OPERATIONAL_SUMMARY

```json
{
  "openrouter_mcp_server_specification": {
    "server_purpose": "Execute LLM agent spawning via OpenRouter API for intelligent agent coordination",
    "implementation_stack": "Go with github.com/modelcontextprotocol/go-sdk and OpenRouter API integration",
    "deployment_model": "single_machine_with_openrouter_api_access",
    "core_functionality": "OpenRouter LLM agent spawning and MCP tool delegation"
  },
  "llm_agent_execution_model": {
    "agent_behavioral_prompts": "System prompts and instructions for spawning specialized LLM agents",
    "mcp_tool_registration": "Each agent type registered as OpenRouter-powered MCP tool",
    "execution_protocol": "Receive MCP tool call → Spawn OpenRouter LLM agent → Delegate tools → Return LLM results",
    "coordination_capability": "Project orchestrator spawns multiple specialist LLM agents for complex tasks"
  },
  "openrouter_protocol_integration": {
    "transport": "stdio_standard_mcp_protocol",
    "tool_definitions": "llm_agent_capabilities_as_mcp_tools",
    "request_processing": "mcp_tool_call_to_openrouter_agent_spawning",
    "response_format": "mcp_protocol_compliant_llm_generated_responses"
  },
  "operational_characteristics": {
    "llm_powered_behavior": "Real LLM agents provide intelligent analysis and recommendations",
    "llm_optimized": "OpenRouter API integration for professional-grade LLM execution",
    "single_machine_focus": "Local MCP server coordinates remote OpenRouter LLM agents",
    "behavioral_consistency": "Consistent system prompts ensure reliable agent behavior across deployments"
  },
  "implementation_readiness": {
    "specification_completeness": "Full behavioral prompts defined for all agent types with OpenRouter integration",
    "mcp_integration_design": "Complete MCP tool registration and OpenRouter agent spawning protocol",
    "go_architecture": "Clear package structure with OpenRouter client and agent management",
    "execution_validation": "LLM output quality assessment and validation algorithms defined"
  }
}
```

## SIMPLE_THINKING_PROTOCOL

```json
{
  "basic_thinking_requirements": {
    "tool_specification": {
      "tool_name": "think_hard",
      "usage_mandate": "all_agents_must_use_for_complex_analysis",
      "minimum_thoughts": 15
    },
    "json_thinking_format": {
      "required_structure": {
        "thought": "analysis_content",
        "nextThoughtNeeded": "boolean",
        "thoughtNumber": "integer",
        "totalThoughts": "integer"
      }
    },
    "behavioral_agent_compliance": {
      "all_agents": {
        "thinking_requirement": "mandatory_for_complex_analysis",
        "minimum_thoughts": 15,
        "focus_areas": ["problem_analysis", "solution_design", "implementation_validation"]
      }
    }
  },
  "llm_to_llm_thinking_consistency": {
    "deterministic_thought_processing": {
      "input_standardization": "json_structured_requests",
      "processing_algorithm": "simple_behavioral_matrix_thinking_execution",
      "output_standardization": "json_structured_thought_sequences"
    }
  }
}
```

## SIMPLE_OPERATIONAL_VALIDATION

```json
{
  "basic_execution_validation": {
    "mcp_tool_response_validation": {
      "json_structure_compliance": {
        "schema_validation": "basic_json_schema_enforcement",
        "behavioral_output_format": "structured_response_validation"
      },
      "thinking_protocol_compliance": {
        "sequential_thinking_tool_usage": "mandatory_verification",
        "minimum_thought_count": "15_thoughts_minimum_enforced"
      }
    },
    "behavioral_matrix_execution_validation": {
      "deterministic_processing": {
        "identical_input_identical_output": "reproducibility_required",
        "execution_environment_isolation": "minimal_external_variance"
      },
      "mcp_protocol_compliance": {
        "stdio_transport_functionality": "standard_mcp_communication_verified",
        "tool_registration_success": "all_behavioral_agents_registered_as_tools"
      }
    }
  },
  "basic_quality_scoring": {
    "evidence_based_validation": {
      "file_reference_scoring": {"weight": 40, "requirement": "specific_file_paths_required"},
      "actionable_recommendations": {"weight": 30, "requirement": "implementation_ready_guidance_required"},
      "structured_output": {"weight": 30, "requirement": "json_formatted_output_required"}
    },
    "basic_quality_validation": {
      "sufficient_quality": "meets_all_requirements",
      "insufficient_quality": "fails_validation_requirements"
    }
  },
  "mcp_server_operational_validation": {
    "golang_implementation": {
      "mcp_sdk_integration": "github.com/modelcontextprotocol/go-sdk_standard_compliance",
      "behavioral_matrix_processing": "simple_json_algorithm_execution_engine",
      "stdio_transport_operation": "standard_mcp_protocol_communication"
    },
    "behavioral_agent_tool_registration": {
      "all_agents_as_mcp_tools": "basic_behavioral_matrix_tool_registration",
      "tool_invocation_processing": "mcp_request_to_behavioral_execution_mapping",
      "structured_response_generation": "json_behavioral_result_formatting"
    }
  }
}
```

## OPENROUTER_MCP_SERVER_SPECIFICATION

```json
{
  "openrouter_mcp_server_execution_system": {
    "implementation_stack": {
      "runtime": "golang",
      "mcp_framework": "github.com/modelcontextprotocol/go-sdk",
      "llm_api": "openrouter_api_integration",
      "transport_protocol": "stdio_standard_mcp",
      "deployment_model": "single_machine_with_api_access"
    },
    "openrouter_agent_spawning_engine": {
      "core_functionality": "openrouter_llm_agent_creation_and_coordination",
      "agent_implementation": "behavioral_prompts_spawned_as_openrouter_llm_agents",
      "execution_protocol": "mcp_tool_call_to_openrouter_agent_spawning",
      "response_format": "llm_generated_structured_results"
    },
    "operational_characteristics": {
      "llm_to_llm_communication": "openrouter_api_powered_agent_communication",
      "human_intervention": "zero_human_interaction_points",
      "behavioral_determinism": false,
      "llm_intelligence": "real_artificial_intelligence_via_openrouter",
      "execution_consistency": "consistent_system_prompts_across_agent_spawning"
    },
    "agent_llm_execution": {
      "thinking_protocol": "mandatory_sequential_thinking_by_spawned_llm_agents",
      "evidence_requirements": "file_paths_and_actionable_steps_generated_by_llm",
      "output_validation": "llm_generated_content_quality_assessment"
    }
  },
  "openrouter_protocol_integration": {
    "tool_registration": {
      "project_orchestrator": "spawn_behavioral_agents_openrouter_tool",
      "security_engineer": "execute_security_behavioral_matrix_openrouter_tool",
      "software_engineer": "execute_implementation_behavioral_matrix_openrouter_tool",
      "devops_engineer": "execute_infrastructure_behavioral_matrix_openrouter_tool",
      "all_agents": "behavioral_prompt_to_openrouter_tool_mapping"
    },
    "request_processing_cycle": {
      "step_1": "receive_mcp_tool_invocation_with_behavioral_parameters",
      "step_2": "load_agent_specific_behavioral_prompt_from_json",
      "step_3": "spawn_openrouter_llm_agent_with_behavioral_prompt",
      "step_4": "inject_execution_context_into_spawned_llm_agent",
      "step_5": "delegate_mcp_tools_to_spawned_llm_agent",
      "step_6": "execute_llm_agent_task_with_tool_access",
      "step_7": "validate_llm_output_against_quality_requirements",
      "step_8": "return_mcp_protocol_compliant_llm_generated_response"
    }
  },
  "openrouter_execution_guarantees": {
    "llm_powered_processing": {
      "intelligent_analysis": "real_llm_reasoning_and_problem_solving",
      "adaptive_responses": "context_aware_llm_generated_solutions"
    },
    "mcp_server_reliability": {
      "tool_availability": "all_llm_agents_available_as_mcp_tools",
      "protocol_compliance": "standard_mcp_stdio_transport_communication",
      "response_formatting": "structured_llm_generated_output_schema_compliance"
    },
    "llm_operational_efficiency": {
      "openrouter_integration": "professional_grade_llm_api_execution",
      "tool_delegation": "seamless_mcp_tool_access_for_spawned_agents",
      "coordination": "intelligent_multi_agent_task_coordination"
    }
  },
  "implementation_readiness_verification": {
    "openrouter_server_components": {
      "openrouter_client": "llm_agent_spawning_and_session_management",
      "mcp_tool_handlers": "llm_agent_tool_registration_and_delegation",
      "validation_algorithms": "llm_output_quality_assessment_and_validation"
    },
    "agent_behavioral_prompts": {
      "all_agents_specified": "comprehensive_system_prompts_for_specialist_agents",
      "thinking_protocol_integration": "sequential_thinking_requirements_for_llm_agents",
      "mcp_tool_mapping": "behavioral_prompt_to_openrouter_tool_registration_complete"
    },
    "operational_validation": {
      "openrouter_api_integration": "verified_llm_agent_spawning_and_execution",
      "llm_to_llm_coordination": "intelligent_multi_agent_task_delegation",
      "mcp_protocol_standard": "stdio_transport_compliance_with_llm_output"
    }
  }
}
```
    "behavioral_matrix_processing_engine": {
      "core_functionality": "simple_json_behavioral_algorithm_execution",
      "agent_implementation": "behavioral_matrices_registered_as_mcp_tools",
      "execution_protocol": "mcp_tool_call_to_behavioral_execution_mapping",
      "response_format": "structured_json_behavioral_results"
    },
    "operational_characteristics": {
      "llm_to_llm_communication": "exclusive_communication_model",
      "human_intervention": "zero_human_interaction_points",
      "behavioral_determinism": "identical_inputs_produce_identical_outputs",
      "execution_consistency": "simple_behavioral_matrix_processing"
    },
    "agent_behavioral_execution": {
      "thinking_protocol": "mandatory_json_sequential_thinking_15_plus_thoughts",
      "evidence_requirements": "file_paths_and_actionable_steps_mandatory",
      "output_validation": "basic_quality_assessment"
    }
  },
  "mcp_protocol_behavioral_integration": {
    "tool_registration": {
      "project_orchestrator": "spawn_behavioral_agents_mcp_tool",
      "security_engineer": "execute_security_behavioral_matrix_mcp_tool",
      "software_engineer": "execute_implementation_behavioral_matrix_mcp_tool",
      "devops_engineer": "execute_infrastructure_behavioral_matrix_mcp_tool",
      "all_agents": "behavioral_matrix_to_mcp_tool_mapping"
    },
    "request_processing_cycle": {
      "step_1": "receive_mcp_tool_invocation_with_behavioral_parameters",
      "step_2": "load_agent_specific_behavioral_matrix_from_json",
      "step_3": "inject_execution_context_into_behavioral_algorithm",
      "step_4": "execute_behavioral_matrix_with_mandatory_json_thinking",
      "step_5": "validate_behavioral_output_against_quality_algorithms",
      "step_6": "return_mcp_protocol_compliant_structured_json_response"
    }
  },
  "behavioral_execution_guarantees": {
    "deterministic_processing": {
      "behavioral_algorithm_consistency": "reproducible_execution",
      "json_thinking_standardization": "consistent_thought_format_across_agents"
    },
    "mcp_server_reliability": {
      "tool_availability": "all_behavioral_agents_available_as_mcp_tools",
      "protocol_compliance": "standard_mcp_stdio_transport_communication",
      "response_formatting": "structured_json_output_schema_compliance"
    },
    "llm_operational_efficiency": {
      "behavioral_matrix_execution": "simple_json_algorithm_processing",
      "context_elimination": "no_human_readable_interpretation_required",
      "thinking_consistency": "mandatory_structured_json_thinking_protocol"
    }
  },
  "implementation_readiness_verification": {
    "mcp_server_components": {
      "behavioral_engine": "json_matrix_processor_implementation_ready",
      "mcp_tool_handlers": "behavioral_agent_tool_registration_specified",
      "validation_algorithms": "quality_assessment_automation_defined"
    },
    "agent_behavioral_matrices": {
      "all_agents_specified": "basic_behavioral_algorithm_definitions",
      "thinking_protocol_mandated": "json_sequential_thinking_requirements_specified",
      "mcp_tool_mapping": "behavioral_matrix_to_tool_registration_complete"
    },
    "operational_validation": {
      "zero_human_intervention": "no_human_readable_processing_required",
      "llm_to_llm_exclusive": "simple_behavioral_matrix_execution_verified",
      "mcp_protocol_standard": "stdio_transport_compliance_confirmed"
    }
  }
}
```

## PRIORITY_IMPLEMENTATION_TASKS_CHATMODE_LLM_OPTIMIZATION

```json
{
  "critical_chatmode_fixes": {
    "priority": "immediate",
    "issue": "vs_code_schema_validation_failures_in_all_chatmode_files",
    "root_cause": "template_engine_generates_excessive_yaml_frontmatter_fields",
    "business_impact": "dual_mode_architecture_broken_vscode_compatibility_lost",
    "solution_approach": "llm_optimized_chatmode_architecture_with_minimal_yaml_frontmatter"
  },
  "implementation_sequence": {
    "task_1_template_engine_llm_optimization": {
      "file": "internal/chatmode-generation/template-engine.go",
      "current_issue": "renderChatmodeTemplate_generates_invalid_yaml_frontmatter_with_excessive_fields",
      "required_fix": "generate_only_description_and_tools_fields_for_vscode_schema_compliance",
      "implementation": "modify_yaml_frontmatter_generation_to_minimal_schema_compliant_format",
      "validation": "verify_all_generated_chatmode_files_pass_vscode_validation"
    },
    "task_2_json_behavioral_content_optimization": {
      "rationale": "chatmode_files_consumed_by_llms_require_structured_json_format",
      "current_state": "markdown_content_requires_conversion_to_json_behavioral_format",
      "target": "json_structured_behavioral_content_blocks_for_llm_consumption",
      "implementation": "replace_markdown_with_json_behavioral_algorithm_blocks",
      "specification": "structured_json_behavioral_execution_format"
    },
    "task_3_behavioral_matrix_integration": {
      "source_data": "internal/behavioral-specs/*.json_files_with_tool_requirements_arrays",
      "mapping_logic": "use_standalone_mode_tools_array_for_chatmode_yaml_frontmatter_tools_field",
      "content_generation": "extract_behavioral_algorithm_as_json_blocks_for_llm_optimization",
      "consistency_guarantee": "identical_behavioral_logic_between_mcp_and_chatmode_formats"
    },
    "task_4_chatmode_file_regeneration": {
      "scope": "all_12_agent_chatmode_files_in_agents_directory",
      "current_status": "invalid_yaml_frontmatter_causing_vscode_validation_failures",
      "regeneration_process": "use_optimized_template_engine_to_generate_vscode_compliant_chatmodes",
      "validation_requirement": "100_percent_vscode_schema_compliance_verification"
    },
    "task_5_dual_mode_behavioral_validation": {
      "behavioral_consistency": "verify_identical_agent_behavior_between_formats",
      "integration_test": "confirm_dual_mode_architecture_functions_correctly"
    }
  },
  "technical_specifications": {
    "vscode_compliant_yaml_frontmatter": {
      "tools": "array_from_behavioral_matrix_standalone_mode_tools"
    },
    "json_behavioral_content_structure": {
      "behavioral_algorithm": "direct_json_from_behavioral_matrix_for_deterministic_execution",
      "anti_hallucination_protocols": "json_evidence_requirements_validation_rules",
      "honesty_requirements": "json_limitation_disclosure_confidence_scoring",
      "tool_integration": "json_tool_mapping_capability_binding"
    },
    "llm_processing_specifications": {
      "algorithm_format": "json_behavioral_algorithms_for_deterministic_execution",
      "data_structure": "single_source_truth_behavioral_matrices_generate_chatmodes"
    }
  },
  "technical_requirements": {
    "vscode_validation": "all_chatmode_files_conform_to_schema_specification",
    "behavioral_consistency": "json_behavioral_content_maintains_algorithm_consistency",
    "dual_mode_architecture": "mcp_and_chatmode_formats_provide_identical_agent_behavior",
    "source_synchronization": "behavioral_matrix_modification_triggers_chatmode_regeneration"
  }
}
```

## BEHAVIORAL_EXECUTION_ENVIRONMENT_SPECIFICATION

```json
{
  "llm_runtime_environment": {
    "execution_model": "deterministic_behavioral_matrix_processing",
    "communication_protocol": "json_structured_llm_to_llm_only",
    "context_management": "algorithmic_behavioral_context_injection",
    "state_management": "stateless_behavioral_execution_with_context_parameters"
  },
  "behavioral_matrix_execution_engine": {
    "algorithm_processing": {
      "input_validation": "json_schema_enforcement_for_behavioral_requests",
      "step_execution": "sequential_deterministic_algorithm_processing",
      "output_generation": "structured_behavioral_result_formatting",
      "error_handling": "behavioral_execution_error_classification_and_recovery"
    },
    "context_injection_protocols": {
      "parameter_mapping": "behavioral_request_to_algorithm_parameter_binding",
      "context_enrichment": "execution_environment_data_injection",
      "constraint_application": "behavioral_boundary_and_limitation_enforcement",
      "validation_integration": "honesty_and_evidence_requirement_injection"
    }
  },
  "mcp_behavioral_runtime": {
    "tool_execution_environment": {
      "mcp_protocol_compliance": "stdio_transport_behavioral_tool_invocation",
      "behavioral_agent_registration": "mcp_tool_capability_advertisement",
      "request_processing": "mcp_tool_call_to_behavioral_execution_mapping",
      "response_formatting": "mcp_protocol_structured_json_response_generation"
    },
    "behavioral_consistency_enforcement": {
      "deterministic_execution": "identical_behavioral_matrix_identical_output",
      "algorithm_isolation": "no_external_state_dependency_in_behavioral_processing",
      "validation_integration": "mandatory_evidence_and_honesty_validation",
      "quality_assessment": "algorithmic_behavioral_output_quality_scoring"
    }
  },
  "standalone_chatmode_runtime": {
    "vscode_integration_environment": {
      "tool_access": "native_vscode_tool_ecosystem_direct_access",
      "behavioral_execution": "chatmode_behavioral_algorithm_processing",
      "delegation_capability": "spawn_agent_behavioral_coordination",
      "context_management": "vscode_workspace_context_behavioral_injection"
    },
    "behavioral_algorithm_consistency": {
      "algorithm_execution": "identical_behavioral_logic_as_mcp_mode",
      "tool_mapping": "behavioral_matrix_tool_requirements_to_vscode_tools",
      "validation_protocols": "consistent_evidence_and_honesty_requirements",
      "output_standardization": "identical_behavioral_result_format"
    }
  },
  "cross_mode_behavioral_validation": {
    "consistency_verification": {
      "algorithm_equivalence": "mathematical_proof_of_behavioral_algorithm_identity",
      "output_validation": "cross_mode_behavioral_result_comparison",
      "tool_mapping_verification": "behavioral_tool_requirement_satisfaction_validation",
      "quality_score_consistency": "identical_evidence_and_honesty_scoring_across_modes"
    },
    "runtime_environment_isolation": {
      "no_mode_specific_behavior": "behavioral_algorithms_independent_of_execution_environment",
      "context_parameter_standardization": "identical_context_injection_across_modes",
      "validation_requirement_consistency": "uniform_evidence_and_honesty_protocols",
      "deterministic_guarantee": "mode_agnostic_behavioral_execution_determinism"
    }
  }
}
```

## SIMPLE_BEHAVIORAL_COORDINATION

```json
{
  "basic_agent_coordination": {
    "project_orchestrator_coordination": {
      "agent_selection": {
        "input": "task_analysis_and_domain_identification",
        "logic": "simple_domain_to_agent_mapping",
        "output": "selected_agent_for_task_execution"
      },
      "sequential_execution": {
        "input": "multi_agent_task_requirements",
        "logic": "sequential_agent_execution_with_result_handoff",
        "output": "coordinated_sequential_execution_plan"
      },
      "result_collection": {
        "input": "individual_agent_outputs",
        "logic": "simple_result_aggregation_and_formatting",
        "output": "combined_agent_results"
      }
    },
    "basic_quality_validation": {
      "evidence_checking": {
        "algorithm": "basic_file_reference_validation",
        "validation": "file_existence_and_basic_content_verification",
        "output": "evidence_quality_assessment"
      },
      "honesty_validation": {
        "algorithm": "limitation_disclosure_verification",
        "validation": "explicit_limitation_acknowledgment_checking",
        "output": "honesty_compliance_verification"
      }
    }
  },
  "simple_execution_efficiency": {
    "basic_optimization": {
      "step_simplification": {
        "algorithm": "minimal_step_behavioral_execution",
        "optimization": "straightforward_algorithm_processing",
        "output": "simplified_execution_path"
      },
      "context_management": {
        "algorithm": "basic_context_parameter_handling",
        "optimization": "essential_context_only_injection",
        "output": "streamlined_context_usage"
      }
    },
    "tool_coordination": {
      "tool_selection": {
        "input": "task_requirements_and_available_tools",
        "logic": "simple_tool_matching_to_requirements",
        "output": "appropriate_tool_selection"
      },
      "tool_execution": {
        "algorithm": "sequential_tool_execution_coordination",
        "coordination": "basic_tool_dependency_management",
        "output": "coordinated_tool_usage_plan"
      }
    }
  }
}
```

## SIMPLE_BEHAVIORAL_STATE_MANAGEMENT

## SIMPLE_BEHAVIORAL_STATE_MANAGEMENT

```json
{
  "basic_stateless_execution": {
    "context_parameter_management": {
      "principle": "all_execution_state_in_context_parameters",
      "implementation": "simple_context_parameter_passing",
      "validation": "basic_context_completeness_checking"
    },
    "execution_isolation": {
      "principle": "each_execution_independent",
      "implementation": "basic_execution_step_isolation",
      "validation": "simple_independence_verification"
    }
  },
  "basic_determinism": {
    "consistent_execution": {
      "principle": "same_input_same_output",
      "implementation": "basic_deterministic_processing",
      "validation": "simple_consistency_checking"
    },
    "simple_validation": {
      "input_validation": "basic_input_format_checking",
      "execution_validation": "simple_step_completion_verification",
      "output_validation": "basic_result_format_checking"
    }
  }
}
```

## SIMPLE_CROSS_AGENT_COORDINATION

```json
{
  "basic_agent_coordination": {
    "simple_agent_selection": {
      "algorithm": "basic_domain_matching_for_agent_selection",
      "selection_method": "simple_domain_to_agent_mapping",
      "implementation": "straightforward_agent_capability_matching"
    },
    "sequential_execution": {
      "algorithm": "basic_sequential_agent_execution",
      "execution_method": "simple_agent_task_handoff",
      "implementation": "sequential_processing_with_result_passing"
    },
    "basic_coordination": {
      "algorithm": "simple_agent_result_coordination",
      "coordination_method": "basic_result_collection_and_formatting",
      "implementation": "straightforward_multi_agent_result_aggregation"
    }
  }
}
```

## COMPLETE_IMPLEMENTATION_SPECIFICATIONS

### Centralized Embedded Architecture

The system now implements a centralized go:embed architecture to resolve relative path issues and ensure consistent resource loading across all packages. This architecture is detailed in `implementation/09-centralized-embedded-architecture.md`.

**Key Architecture Components:**
- **Centralized Embedded Package**: `internal/embedded/` contains all go:embed directives
- **Resource Categories**: Behavioral specifications, chatmode templates, and instruction files
- **Consumer Integration**: All packages import from centralized embedded package
- **Path Resolution**: Eliminates relative path issues with go:embed

**Implementation Status**: ✅ **COMPLETED** - Centralized embedded architecture is fully implemented and operational. All embedded resources are accessible via `internal/embedded` package.

```json
{
  "mcp_server_implementation_complete": {
    "golang_implementation_architecture": {
      "main_entry_point": {
        "file": "cmd/secondbrain-mcp/main.go",
        "implementation": {
          "mcp_server_initialization": "stdio_transport_setup_and_behavioral_engine_startup",
          "behavioral_matrix_loading": "centralized_embedded_resource_loading_via_internal_embedded_package",
          "tool_registration": "basic_agent_mcp_tool_registration",
          "error_handling_setup": "basic_error_handling_initialization"
        }
      },
      "behavioral_engine_core": {
        "file": "internal/behavioral/engine.go",
        "implementation": {
          "behavioral_matrix_processor": "json_behavioral_algorithm_execution_engine",
          "context_injection_engine": "basic_context_parameter_injection",
          "execution_state_manager": "simple_stateless_execution_management",
          "quality_validator": "basic_behavioral_output_quality_validation"
        }
      },
      "mcp_protocol_integration": {
        "file": "internal/mcp/tools.go",
        "implementation": {
          "tool_definition_registry": "behavioral_agent_mcp_tool_definition_and_registration",
          "request_processor": "mcp_tool_call_to_behavioral_execution_mapping",
          "response_formatter": "mcp_protocol_compliant_json_response_generation",
          "error_response_handler": "basic_mcp_protocol_error_response_generation"
        }
      }
    }
  },
  "chatmode_generation_implementation": {
    "template_engine": {
      "file": "internal/chatmode-generation/template-engine.go",
      "implementation": {
        "vscode_schema_compliance": "minimal_yaml_frontmatter_generation_with_description_and_tools_only",
        "behavioral_content": "json_behavioral_algorithm_integration_for_llm_consumption",
        "tool_mapping": "behavioral_matrix_tool_requirements_to_vscode_tools_mapping"
      }
    }
  }
}
```

## ESSENTIAL_MCP_SERVERS_INTEGRATION

```json
{
  "internal_mcp_tools": {
    "thinking_tools": {
      "tool_name": "think_hard",
      "purpose": "structured_critical_thinking_for_behavioral_agents",
      "core_functionality": "15_plus_thought_sequential_analysis_processing",
      "integration": "internal_mcp_tool_registration_within_single_server",
      "implementation": "internal/tools/thinking/thinking_tools.go"
    },
    "knowledge_tools": {
      "tool_names": ["create_entities", "search_nodes", "create_relations", "add_observations", "read_graph"],
      "purpose": "behavioral_context_and_knowledge_persistence",
      "core_functionality": "entity_relationship_knowledge_graph_management",
      "integration": "internal_mcp_tool_registration_within_single_server",
      "implementation": "internal/tools/knowledge/knowledge_tools.go"
    },
    "file_tools": {
      "tool_names": ["read_file", "replace_string_in_file", "create_file", "grep_search", "file_search", "list_dir"],
      "purpose": "file_operation_tools_for_behavioral_agents",
      "core_functionality": "discrete_file_tools_read_write_search_and_analysis",
      "integration": "internal_mcp_tool_registration_within_single_server",
      "implementation": "internal/tools/file/file_tools.go"
    }
  },
  "standalone_architecture": {
    "self_contained_operation": "single_mcp_server_with_all_tools_internal",
    "no_external_dependencies": "all_functionality_built_into_main_server",
    "unified_tool_registration": "all_tools_registered_via_official_mcp_sdk"
  }
}
```

## SIMPLIFIED_SYSTEM_ARCHITECTURE

```json
{
  "essential_system_components": {
    "mcp_behavioral_server": "golang_based_behavioral_matrix_execution_with_internal_tools",
    "internal_tools": {
      "thinking_tools": "think_hard_tool_internal_implementation",
      "knowledge_tools": "knowledge_graph_operations_internal_implementation",
      "file_tools": "file_operation_tools_internal_implementation"
    },
    "behavioral_matrices": "json_agent_algorithm_specifications",
    "chatmode_generator": "vscode_compliant_chatmode_creation",
    "basic_validation": "simple_quality_and_honesty_checking",
    "single_server_architecture": "all_functionality_in_one_mcp_server_process"
  },
  "single_machine_deployment": {
    "complexity_level": "minimal_essential_features_only",
    "coordination": "internal_tool_coordination_within_single_server",
    "maintenance": "straightforward_configuration_and_updates"
  },
  "preserved_core_capabilities": {
    "behavioral_consistency": "deterministic_agent_execution_patterns",
    "dual_mode_operation": "mcp_server_and_vscode_chatmode_deployment",
    "tool_integration": "internal_mcp_tool_registration_via_official_sdk",
    "quality_assurance": "basic_evidence_and_honesty_validation"
  }
}
```

## SIMPLIFIED_EXECUTION_PROTOCOLS

```json
{
  "basic_behavioral_processing": {
    "json_request_handling": {
      "input_format": "structured_behavioral_requests",
      "parameter_validation": "basic_schema_checking",
      "context_injection": "simple_parameter_mapping",
      "execution_determinism": "consistent_algorithm_processing"
    },
    "core_mcp_server_integration": {
      "thinking_server": "think_hard_integration",
      "memory_server": "knowledge_base_integration",
      "file_tools": "discrete_file_operation_tools",
      "coordination": "basic_cross_server_communication"
    },
    "response_generation": {
      "output_format": "structured_json_responses",
      "quality_validation": "basic_evidence_and_honesty_checking",
      "consistency_enforcement": "deterministic_result_generation"
    }
  },
  "simplified_behavioral_consistency": {
    "execution_determinism": "identical_inputs_produce_identical_outputs",
    "cross_mode_equivalence": "mcp_and_chatmode_behavioral_identity",
    "validation_uniformity": "consistent_evidence_and_honesty_requirements",
    "tool_coordination": "basic_mcp_server_interaction_patterns"
  }
}
```

## SIMPLE_ERROR_HANDLING

```json
{
  "basic_error_classification": {
    "error_categories": {
      "algorithmic_errors": {
        "step_execution_failure": {
          "error_code": "ALG_001",
          "detection": "step_result_validation_failure",
          "recovery": "step_rollback_and_alternative_execution"
        }
      },
      "context_injection_errors": {
        "parameter_mapping_failure": {
          "error_code": "CTX_001",
          "detection": "parameter_schema_validation_failure",
          "recovery": "parameter_reconstruction_from_available_context"
        }
      },
      "tool_execution_errors": {
        "tool_invocation_failure": {
          "error_code": "TOOL_001",
          "detection": "tool_response_timeout_or_error_status",
          "recovery": "alternative_tool_selection"
        }
      }
    }
  },
  "basic_error_recovery": {
    "step_level_recovery": {
      "algorithm": "simple_step_error_recovery",
      "steps": [
        {"action": "error_detection_and_classification"},
        {"action": "recovery_strategy_selection"},
        {"action": "recovery_execution"},
        {"action": "recovery_validation"}
      ]
    }
  }
}
```

## COMPLETE_IMPLEMENTATION_SPECIFICATIONS

### Centralized Embedded Architecture

The system now implements a centralized go:embed architecture to resolve relative path issues and ensure consistent resource loading across all packages. This architecture is detailed in `implementation/09-centralized-embedded-architecture.md`.

**Key Architecture Components:**
- **Centralized Embedded Package**: `internal/embedded/` contains all go:embed directives
- **Resource Categories**: Behavioral specifications, chatmode templates, and instruction files
- **Consumer Integration**: All packages import from centralized embedded package
- **Path Resolution**: Eliminates relative path issues with go:embed

**Implementation Status**: ✅ **COMPLETED** - Centralized embedded architecture is fully implemented and operational. All embedded resources are accessible via `internal/embedded` package.

```json
{
  "mcp_server_implementation_complete": {
    "golang_implementation_architecture": {
      "main_entry_point": {
        "file": "cmd/secondbrain-mcp/main.go",
        "implementation": {
          "mcp_server_initialization": "stdio_transport_setup_and_behavioral_engine_startup",
          "behavioral_matrix_loading": "centralized_embedded_resource_loading_via_internal_embedded_package",
          "tool_registration": "basic_agent_mcp_tool_registration",
          "error_handling_setup": "basic_error_handling_initialization"
        }
      },
      "behavioral_engine_core": {
        "file": "internal/behavioral/engine.go",
        "implementation": {
          "behavioral_matrix_processor": "json_behavioral_algorithm_execution_engine",
          "context_injection_engine": "basic_context_parameter_injection",
          "execution_state_manager": "simple_stateless_execution_management",
          "quality_validator": "basic_behavioral_output_quality_validation"
        }
      },
      "mcp_protocol_integration": {
        "file": "internal/mcp/tools.go",
        "implementation": {
          "tool_definition_registry": "behavioral_agent_mcp_tool_definition_and_registration",
          "request_processor": "mcp_tool_call_to_behavioral_execution_mapping",
          "response_formatter": "mcp_protocol_compliant_json_response_generation",
          "error_response_handler": "basic_mcp_protocol_error_response_generation"
        }
      }
    }
  },
  "chatmode_generation_implementation": {
    "template_engine": {
      "file": "internal/chatmode-generation/template-engine.go",
      "implementation": {
        "vscode_schema_compliance": "minimal_yaml_frontmatter_generation_with_description_and_tools_only",
        "behavioral_content": "json_behavioral_algorithm_integration_for_llm_consumption",
        "tool_mapping": "behavioral_matrix_tool_requirements_to_vscode_tools_mapping"
      }
    }
  }
}
```

## ESSENTIAL_MCP_SERVERS_INTEGRATION

```json
{
  "internal_mcp_tools": {
    "thinking_tools": {
      "tool_name": "think_hard",
      "purpose": "structured_critical_thinking_for_behavioral_agents",
      "core_functionality": "15_plus_thought_sequential_analysis_processing",
      "integration": "internal_mcp_tool_registration_within_single_server",
      "implementation": "internal/tools/thinking/thinking_tools.go"
    },
    "knowledge_tools": {
      "tool_names": ["create_entities", "search_nodes", "create_relations", "add_observations", "read_graph"],
      "purpose": "behavioral_context_and_knowledge_persistence",
      "core_functionality": "entity_relationship_knowledge_graph_management",
      "integration": "internal_mcp_tool_registration_within_single_server",
      "implementation": "internal/tools/knowledge/knowledge_tools.go"
    },
    "file_tools": {
      "tool_names": ["read_file", "replace_string_in_file", "create_file", "grep_search", "file_search", "list_dir"],
      "purpose": "file_operation_tools_for_behavioral_agents",
      "core_functionality": "discrete_file_tools_read_write_search_and_analysis",
      "integration": "internal_mcp_tool_registration_within_single_server",
      "implementation": "internal/tools/file/file_tools.go"
    }
  },
  "standalone_architecture": {
    "self_contained_operation": "single_mcp_server_with_all_tools_internal",
    "no_external_dependencies": "all_functionality_built_into_main_server",
    "unified_tool_registration": "all_tools_registered_via_official_mcp_sdk"
  }
}
```

## SIMPLE_CONTEXT_INJECTION

```json
{
  "basic_context_processing": {
    "simple_parameter_mapping": {
      "algorithm": "basic_parameter_extraction_and_injection",
      "steps": [
        {"action": "extract_parameters_from_request"},
        {"action": "validate_parameter_types"},
        {"action": "inject_into_behavioral_algorithm"},
        {"action": "verify_injection_success"}
      ]
    },
    "basic_context_validation": {
      "validation_steps": [
        {"action": "check_required_fields"},
        {"action": "validate_data_types"},
        {"action": "verify_basic_consistency"}
      ]
    }
  },
  "simple_context_management": {
    "basic_context_sharing": {
      "sharing_methods": [
        {"method": "parameter_passing"},
        {"method": "context_inheritance"}
      ]
    }
  }
}
```

## SIMPLE_TOOL_INTEGRATION

```json
{
  "basic_tool_selection": {
    "simple_tool_matching": {
      "algorithm": "basic_tool_capability_matching",
      "selection_criteria": [
        {"criterion": "tool_capability_match", "weight": 60},
        {"criterion": "tool_availability", "weight": 30},
        {"criterion": "tool_reliability", "weight": 10}
      ]
    }
  },
  "simple_tool_coordination": {
    "sequential_tool_execution": {
      "algorithm": "basic_sequential_tool_execution",
      "coordination_method": "simple_tool_result_passing"
    },
    "basic_tool_output_processing": {
      "processing_steps": [
        {"step": "collect_tool_outputs"},
        {"step": "validate_output_format"},
        {"step": "combine_results"}
      ]
    }
  }
}
```


