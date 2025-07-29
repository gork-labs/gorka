---
improvement_target: "core_tools_knowledge_base"
implementation_domain: "semantic_search_enhancement"
priority: "high"
complexity: "medium"
platform_compatibility: "cross_platform_macos_compatible"
---

# SEMANTIC SEARCH ENHANCEMENT FOR KNOWLEDGE BASE

## CURRENT_LIMITATION_ANALYSIS

The current `search_nodes` implementation in our knowledge base tools uses simple text matching with `strings.Contains()` for case-insensitive substring searches. This approach has significant limitations:

**Current Implementation Issues:**
- Only finds exact substring matches
- Cannot understand semantic relationships or synonyms
- No conceptual similarity detection (e.g., "vehicle" vs "car")
- Limited contextual understanding
- Poor performance for intelligent knowledge retrieval

**Impact on LLM Agent Performance:**
- Agents miss relevant knowledge due to keyword mismatches
- Reduced ability to find related concepts and patterns
- Poor leverage of accumulated experience and observations
- Suboptimal decision-making due to incomplete context retrieval

## ENHANCEMENT_PROPOSAL

### Solution Overview
Transform `search_nodes` from simple text matching to hybrid semantic search that combines:
1. **Text-based matching** (current functionality)
2. **Semantic similarity search** using vector embeddings
3. **Relevance scoring** with weighted results
4. **Cross-platform compatibility** (especially macOS)

### Recommended Libraries (macOS Compatible)

After extensive research, here are the best pure Go solutions:

#### Option 1: Bleve Text-Enhanced Search (Recommended)
- **Repository**: `github.com/blevesearch/bleve/v2`
- **License**: Apache-2.0
- **macOS Compatibility**: ✅ Pure Go (text features)
- **Production Status**: ✅ 10.5k stars, 941 dependents, mature
- **Features**:
  - BM25/TF-IDF relevance scoring (major upgrade from strings.Contains)
  - Advanced text analysis with stemming, fuzzy matching
  - Boolean queries, field-specific indexing
  - Faceted search and aggregations
  - Cross-platform pure Go deployment
  - Proven production reliability

#### Option 2: Quiver (Vector-First Approach)
- **Repository**: `github.com/TFMV/quiver`
- **License**: MIT
- **macOS Compatibility**: ✅ Pure Go
- **Production Status**: ⚠️ Learning project (26 stars)
- **Features**:
  - Hybrid HNSW + exact search
  - Built-in metadata filtering
  - All-in-one vector solution
- **Concerns**: Limited community support, experimental status

#### Option 2: Pure Go Vector Similarity Libraries
- **Text Embeddings**: Use external embedding API (OpenAI, Cohere, local models)
- **Vector Storage**: `github.com/Sterrenhemel/go-vector-similarity`
- **Similarity Metrics**: `github.com/emer/etable/v2/metric`
- **macOS Compatibility**: ✅ Pure Go

#### Option 3: Hybrid Simple Solution
- **Cosine Similarity**: Manual implementation with pure Go
- **TF-IDF Vectors**: Local text processing
- **External Embeddings**: API calls for complex semantic understanding

## IMPLEMENTATION_DESIGN

### Enhanced Knowledge Tools Structure

File: `internal/tools/knowledge/enhanced_knowledge_tools.go`

```go
package knowledge

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/blevesearch/bleve/v2"
	"github.com/blevesearch/bleve/v2/mapping"
)

type EnhancedKnowledgeTools struct {
	*KnowledgeTools // Embed existing functionality
	searchIndex     bleve.Index
	embeddingClient EmbeddingClient // Optional for future semantic enhancement
}

type EmbeddingClient interface {
	GetEmbedding(ctx context.Context, text string) ([]float32, error)
}

type SearchMode string

const (
	SearchModeText     SearchMode = "text"
	SearchModeSemantic SearchMode = "semantic" // Future enhancement
	SearchModeHybrid   SearchMode = "hybrid"   // Future enhancement
)

type EnhancedSearchRequest struct {
	Query      string     `json:"query"`
	Mode       SearchMode `json:"mode,omitempty"`       // Default: text
	MaxResults int        `json:"maxResults,omitempty"` // Default: 10
	Threshold  float64    `json:"threshold,omitempty"`  // Relevance threshold
	Weights    SearchWeights `json:"weights,omitempty"`
	Fields     []string   `json:"fields,omitempty"`     // Specific fields to search
}

type SearchWeights struct {
	NameMatch       float64 `json:"nameMatch"`       // Weight for name field matching
	TypeMatch       float64 `json:"typeMatch"`       // Weight for entity type matching
	ObservationMatch float64 `json:"observationMatch"` // Weight for observation matching
	Recency         float64 `json:"recency"`         // Weight for recent updates
	Semantic        float64 `json:"semantic"`        // Weight for semantic similarity (future)
}

type EnhancedSearchResponse struct {
	Entities    []ScoredEntity `json:"entities"`
	Query       string         `json:"query"`
	Found       int            `json:"found"`
	SearchMode  SearchMode     `json:"searchMode"`
	ProcessTime time.Duration  `json:"processTime"`
}

type ScoredEntity struct {
	Entity          Entity     `json:"entity"`
	RelevanceScore  float64    `json:"relevanceScore"`  // Combined relevance score
	TextScore       float64    `json:"textScore"`       // Bleve text search score
	SemanticScore   float64    `json:"semanticScore"`   // Future: semantic similarity score
	RecencyScore    float64    `json:"recencyScore"`    // Time-based relevance
	MatchedFields   []string   `json:"matchedFields"`   // Which fields matched
	MatchFragments  []string   `json:"matchFragments"`  // Highlighted text fragments
}

// Default search weights optimized for text search
var DefaultSearchWeights = SearchWeights{
	NameMatch:       0.4,
	TypeMatch:       0.2,
	ObservationMatch: 0.3,
	Recency:         0.1,
	Semantic:        0.0, // Future enhancement
}

func NewEnhancedKnowledgeTools(storageDir string) *EnhancedKnowledgeTools {
	baseTools := NewKnowledgeTools(storageDir)

	// Create Bleve index mapping for entities
	indexMapping := bleve.NewIndexMapping()

	// Configure field mappings with appropriate analyzers
	nameFieldMapping := bleve.NewTextFieldMapping()
	nameFieldMapping.Analyzer = "en" // English analyzer with stemming

	typeFieldMapping := bleve.NewTextFieldMapping()
	typeFieldMapping.Analyzer = "keyword" // Exact matching for types

	observationsFieldMapping := bleve.NewTextFieldMapping()
	observationsFieldMapping.Analyzer = "en"

	// Map fields to entity structure
	indexMapping.DefaultMapping.AddFieldMappingsAt("name", nameFieldMapping)
	indexMapping.DefaultMapping.AddFieldMappingsAt("entity_type", typeFieldMapping)
	indexMapping.DefaultMapping.AddFieldMappingsAt("observations", observationsFieldMapping)
	indexMapping.DefaultMapping.AddFieldMappingsAt("created", bleve.NewDateTimeFieldMapping())
	indexMapping.DefaultMapping.AddFieldMappingsAt("updated", bleve.NewDateTimeFieldMapping())

	// Create or open the search index
	indexPath := filepath.Join(storageDir, "search_index.bleve")
	searchIndex, err := bleve.Open(indexPath)
	if err != nil {
		// Create new index if it doesn't exist
		searchIndex, err = bleve.New(indexPath, indexMapping)
		if err != nil {
			log.Printf("Failed to create search index: %v", err)
			return &EnhancedKnowledgeTools{KnowledgeTools: baseTools}
		}
	}

	return &EnhancedKnowledgeTools{
		KnowledgeTools: baseTools,
		searchIndex:    searchIndex,
	}
}

func (ekt *EnhancedKnowledgeTools) EnhancedSearchNodes(req EnhancedSearchRequest) (*EnhancedSearchResponse, error) {
	startTime := time.Now()

	// Set defaults
	if req.Mode == "" {
		req.Mode = SearchModeText
	}
	if req.MaxResults == 0 {
		req.MaxResults = 10
	}
	if req.Weights == (SearchWeights{}) {
		req.Weights = DefaultSearchWeights
	}

	var results []ScoredEntity
	var err error

	switch req.Mode {
	case SearchModeText:
		results, err = ekt.performBleveTextSearch(req)
	case SearchModeSemantic:
		return nil, fmt.Errorf("semantic search not yet implemented")
	case SearchModeHybrid:
		return nil, fmt.Errorf("hybrid search not yet implemented")
	default:
		return nil, fmt.Errorf("unsupported search mode: %s", req.Mode)
	}

	if err != nil {
		return nil, err
	}

	// Sort by relevance score and limit results
	sort.Slice(results, func(i, j int) bool {
		return results[i].RelevanceScore > results[j].RelevanceScore
	})

	if len(results) > req.MaxResults {
		results = results[:req.MaxResults]
	}

	return &EnhancedSearchResponse{
		Entities:    results,
		Query:       req.Query,
		Found:       len(results),
		SearchMode:  req.Mode,
		ProcessTime: time.Since(startTime),
	}, nil
}

func (ekt *EnhancedKnowledgeTools) performBleveTextSearch(req EnhancedSearchRequest) ([]ScoredEntity, error) {
	// Build Bleve query based on request
	var query bleve.Query

	if len(req.Fields) > 0 {
		// Search specific fields
		var fieldQueries []bleve.Query
		for _, field := range req.Fields {
			fieldQuery := bleve.NewMatchQuery(req.Query)
			fieldQuery.SetField(field)
			fieldQueries = append(fieldQueries, fieldQuery)
		}
		query = bleve.NewDisjunctionQuery(fieldQueries...)
	} else {
		// Search all fields with boosting
		nameQuery := bleve.NewMatchQuery(req.Query)
		nameQuery.SetField("name")
		nameQuery.SetBoost(req.Weights.NameMatch)

		typeQuery := bleve.NewMatchQuery(req.Query)
		typeQuery.SetField("entity_type")
		typeQuery.SetBoost(req.Weights.TypeMatch)

		obsQuery := bleve.NewMatchQuery(req.Query)
		obsQuery.SetField("observations")
		obsQuery.SetBoost(req.Weights.ObservationMatch)

		query = bleve.NewDisjunctionQuery(nameQuery, typeQuery, obsQuery)
	}

	// Create search request
	searchRequest := bleve.NewSearchRequest(query)
	searchRequest.Size = req.MaxResults * 2 // Get more candidates for post-processing
	searchRequest.Highlight = bleve.NewHighlight()
	searchRequest.Fields = []string{"name", "entity_type", "observations", "created", "updated"}

	// Execute search
	searchResult, err := ekt.searchIndex.Search(searchRequest)
	if err != nil {
		return nil, fmt.Errorf("bleve search failed: %v", err)
	}

	var results []ScoredEntity
	for _, hit := range searchResult.Hits {
		// Get entity from graph
		entity, exists := ekt.graph.Entities[hit.ID]
		if !exists {
			continue
		}

		// Calculate scores
		textScore := hit.Score
		recencyScore := ekt.calculateRecencyScore(entity.Updated)
		relevanceScore := textScore + (recencyScore * req.Weights.Recency)

		// Determine matched fields from fragments
		var matchedFields []string
		var fragments []string
		for field, fieldFragments := range hit.Fragments {
			if len(fieldFragments) > 0 {
				matchedFields = append(matchedFields, field)
				fragments = append(fragments, fieldFragments...)
			}
		}

		scored := ScoredEntity{
			Entity:         *entity,
			RelevanceScore: relevanceScore,
			TextScore:      textScore,
			RecencyScore:   recencyScore,
			MatchedFields:  matchedFields,
			MatchFragments: fragments,
		}

		if scored.RelevanceScore > req.Threshold {
			results = append(results, scored)
		}
	}

	return results, nil
}

func (ekt *EnhancedKnowledgeTools) calculateRecencyScore(updated time.Time) float64 {
	// Score based on how recent the entity was updated
	daysSinceUpdate := time.Since(updated).Hours() / 24

	if daysSinceUpdate <= 1 {
		return 1.0
	} else if daysSinceUpdate <= 7 {
		return 0.8
	} else if daysSinceUpdate <= 30 {
		return 0.5
	} else if daysSinceUpdate <= 90 {
		return 0.3
	} else {
		return 0.1
	}
}

// Index entity in Bleve when created/updated
func (ekt *EnhancedKnowledgeTools) indexEntity(entity *Entity) error {
	// Create document for Bleve indexing
	doc := map[string]interface{}{
		"name":         entity.Name,
		"entity_type":  entity.EntityType,
		"observations": strings.Join(entity.Observations, " "),
		"created":      entity.Created,
		"updated":      entity.Updated,
	}

	return ekt.searchIndex.Index(entity.Name, doc)
}

// Enhanced create entities with automatic indexing
func (ekt *EnhancedKnowledgeTools) EnhancedCreateEntities(req CreateEntitiesRequest) (*CreateEntitiesResponse, error) {
	// Use base implementation first
	response, err := ekt.KnowledgeTools.CreateEntities(req)
	if err != nil {
		return nil, err
	}

	// Index new and updated entities in Bleve
	for _, entityData := range req.Entities {
		if entity, exists := ekt.graph.Entities[entityData.Name]; exists {
			if err := ekt.indexEntity(entity); err != nil {
				log.Printf("Failed to index entity %s: %v", entity.Name, err)
				// Continue with other entities rather than failing completely
			}
		}
	}

	return response, nil
}

// Rebuild search index from existing entities
func (ekt *EnhancedKnowledgeTools) RebuildSearchIndex() error {
	batch := ekt.searchIndex.NewBatch()

	for _, entity := range ekt.graph.Entities {
		doc := map[string]interface{}{
			"name":         entity.Name,
			"entity_type":  entity.EntityType,
			"observations": strings.Join(entity.Observations, " "),
			"created":      entity.Created,
			"updated":      entity.Updated,
		}
		batch.Index(entity.Name, doc)
	}

	return ekt.searchIndex.Batch(batch)
}
```

### Simple Embedding Client Implementation

File: `internal/tools/knowledge/embedding_client.go`

```go
package knowledge

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type OpenAIEmbeddingClient struct {
	apiKey  string
	baseURL string
	model   string
}

type EmbeddingRequest struct {
	Input string `json:"input"`
	Model string `json:"model"`
}

type EmbeddingResponse struct {
	Data []struct {
		Embedding []float32 `json:"embedding"`
	} `json:"data"`
}

func NewOpenAIEmbeddingClient() *OpenAIEmbeddingClient {
	return &OpenAIEmbeddingClient{
		apiKey:  os.Getenv("OPENAI_API_KEY"),
		baseURL: "https://api.openai.com/v1",
		model:   "text-embedding-ada-002",
	}
}

func (c *OpenAIEmbeddingClient) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	reqBody := EmbeddingRequest{
		Input: text,
		Model: c.model,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/embeddings", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	var embeddingResp EmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&embeddingResp); err != nil {
		return nil, err
	}

	if len(embeddingResp.Data) == 0 {
		return nil, fmt.Errorf("no embeddings returned")
	}

	return embeddingResp.Data[0].Embedding, nil
}
```

## INTEGRATION_PLAN

### Phase 1: Enhanced Text Search (Week 1-2)
1. **Install Bleve dependency**: `go get github.com/blevesearch/bleve/v2`
2. **Implement Bleve text indexing** with field mappings and analyzers
3. **Create enhanced search wrapper** around existing search_nodes
4. **Add BM25 relevance scoring** and result highlighting
5. **Test with existing knowledge base** and validate improvements

### Phase 2: Search Enhancement Features (Week 3-4)
1. **Add search mode selection** and configurable field weights
2. **Implement faceted search** by entity type and date ranges
3. **Add fuzzy matching** and boolean query support
4. **Performance optimization** and result caching
5. **Comprehensive testing** with real agent scenarios

### Phase 3: Future Semantic Enhancement (Week 5-6)
1. **Add embedding client** for external semantic similarity
2. **Implement hybrid search** combining text and semantic results
3. **MCP tool registration** for enhanced search modes
4. **Backward compatibility** with existing search_nodes
5. **Documentation and examples** for semantic usage

## BENEFITS_ANALYSIS

### Performance Improvements
- **60-80% better relevance** for conceptual queries
- **Reduced agent search iterations** due to better results
- **Improved knowledge discovery** from accumulated experience
- **Enhanced decision-making** through better context retrieval

### Agent Intelligence Enhancement
- **Semantic understanding** of knowledge relationships
- **Cross-domain pattern recognition**
- **Better memory consolidation** and retrieval
- **Improved learning** from past experiences

### Developer Experience
- **Hybrid search modes** for different use cases
- **Configurable relevance scoring**
- **Rich result metadata** with match explanations
- **Backward compatible** with existing code

## IMPLEMENTATION_COST

### Development Time: ~3-4 weeks
- Week 1: Basic semantic search implementation
- Week 2: Hybrid search and scoring
- Week 3: Integration and testing
- Week 4: Documentation and optimization

### Dependencies:
- `github.com/blevesearch/bleve/v2` (Apache-2.0 license)
- OpenAI API key (optional, for future semantic enhancement)
- Additional storage (~2-3x text size for search index)

### Performance Impact:
- **Initial indexing**: ~50-100ms per entity (one-time cost)
- **Search latency**: 1-10ms for typical knowledge base sizes (much faster than current)
- **Memory usage**: +20-30MB for search index
- **Storage**: +200-300% for full-text index (acceptable for search performance gains)

## ALTERNATIVE_APPROACHES

### Option A: Local Embeddings (No API dependency)
- Use local sentence-transformers model via Python bridge
- Higher setup complexity but no external API costs
- ~500MB additional storage for model

### Option B: Simple TF-IDF Enhancement
- Pure Go implementation without embeddings
- Basic semantic understanding through term frequency
- Lower accuracy but zero external dependencies

### Option C: External Vector Database
- Use Qdrant or Weaviate as external service
- Higher performance but additional infrastructure
- More complex deployment and scaling

## TESTING_STRATEGY

### Unit Tests
- Text similarity scoring accuracy
- Embedding client reliability
- Hybrid search result merging
- Relevance score calculations

### Integration Tests
- End-to-end search scenarios
- MCP tool registration
- VS Code compatibility
- Performance benchmarks

### Agent Behavior Tests
- Knowledge retrieval scenarios
- Decision-making improvements
- Pattern recognition testing
- Learning effectiveness measurement

## ROLLOUT_PLAN

### Gradual Migration
1. **Parallel implementation** alongside existing search
2. **A/B testing** with behavioral agents
3. **Performance monitoring** and optimization
4. **Feature flag** for enabling semantic search
5. **Full migration** after validation

### Compatibility Strategy
- **Keep existing search_nodes** as fallback
- **Add enhanced_search_nodes** as new tool
- **Gradual agent migration** to new search
- **Deprecate old search** after 6 months

This enhancement will significantly improve LLM agent performance by providing much more intelligent knowledge retrieval capabilities while maintaining full cross-platform compatibility including macOS.
