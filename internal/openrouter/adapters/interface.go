package adapters

import (
	"github.com/sashabaranov/go-openai"
)

// ModelConfigRecommendations contains adapter-specific configuration recommendations
type ModelConfigRecommendations struct {
	// ChatTemplateKwargs contains chat template parameters for vLLM/compatible services
	ChatTemplateKwargs map[string]interface{}
	// ParallelToolCalls enables/disables parallel tool calling
	ParallelToolCalls *bool
	// TopP sampling parameter optimization
	TopP *float32
	// DebugMessage contains information about applied optimizations
	DebugMessage string
	// HasOptimizations indicates if this adapter provides specific optimizations
	HasOptimizations bool
}

// ModelAdapter defines the interface for model-specific response parsing
type ModelAdapter interface {
	// GetName returns the name of this adapter
	GetName() string
	
	// CanHandle determines if this adapter can handle the given model
	CanHandle(modelName string) bool
	
	// ParseToolCalls extracts tool calls from the model response content
	// Returns tool calls in OpenAI format, or nil if no tool calls found
	ParseToolCalls(content string) ([]openai.ToolCall, error)
	
	// ShouldFallbackToStandard indicates whether to try standard OpenAI parsing
	// if this adapter's parsing fails
	ShouldFallbackToStandard() bool
	
	// GetConfigRecommendations returns model-specific configuration recommendations
	GetConfigRecommendations(modelName string) ModelConfigRecommendations
}

// AdapterRegistry manages model adapters
type AdapterRegistry struct {
	adapters []ModelAdapter
}

// NewAdapterRegistry creates a new adapter registry with default adapters
func NewAdapterRegistry() *AdapterRegistry {
	registry := &AdapterRegistry{
		adapters: make([]ModelAdapter, 0),
	}
	
	// Register adapters in order of priority
	registry.RegisterAdapter(NewQwenAdapter())
	
	return registry
}

// RegisterAdapter adds a new adapter to the registry
func (r *AdapterRegistry) RegisterAdapter(adapter ModelAdapter) {
	r.adapters = append(r.adapters, adapter)
}

// GetAdapter returns the first adapter that can handle the given model
func (r *AdapterRegistry) GetAdapter(modelName string) ModelAdapter {
	for _, adapter := range r.adapters {
		if adapter.CanHandle(modelName) {
			return adapter
		}
	}
	
	// Return nil if no adapter found
	return nil
}

// GetConfigRecommendations returns configuration recommendations for a model
func (r *AdapterRegistry) GetConfigRecommendations(modelName string) ModelConfigRecommendations {
	adapter := r.GetAdapter(modelName)
	if adapter != nil {
		return adapter.GetConfigRecommendations(modelName)
	}
	
	// Return empty recommendations if no adapter found
	return ModelConfigRecommendations{
		HasOptimizations: false,
	}
}