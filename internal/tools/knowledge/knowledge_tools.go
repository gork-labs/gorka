package knowledge

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type KnowledgeTools struct {
	storageDir string
	graph      *KnowledgeGraph
}

type KnowledgeGraph struct {
	Entities  map[string]*Entity   `json:"entities"`
	Relations map[string]*Relation `json:"relations"`
	Updated   time.Time            `json:"updated"`
}

type Entity struct {
	Name         string    `json:"name"`
	EntityType   string    `json:"entityType"`
	Observations []string  `json:"observations"`
	Created      time.Time `json:"created"`
	Updated      time.Time `json:"updated"`
}

type Relation struct {
	ID           string    `json:"id"`
	From         string    `json:"from"`
	To           string    `json:"to"`
	RelationType string    `json:"relationType"`
	Created      time.Time `json:"created"`
}

type CreateEntitiesRequest struct {
	Entities []EntityData `json:"entities"`
}

type EntityData struct {
	Name         string   `json:"name"`
	EntityType   string   `json:"entityType"`
	Observations []string `json:"observations"`
}

type CreateEntitiesResponse struct {
	Success     bool     `json:"success"`
	Created     []string `json:"created"`
	Updated     []string `json:"updated"`
	EntityCount int      `json:"entityCount"`
}

type SearchNodesRequest struct {
	Query string `json:"query"`
}

type SearchNodesResponse struct {
	Entities []Entity `json:"entities"`
	Query    string   `json:"query"`
	Found    int      `json:"found"`
}

type CreateRelationsRequest struct {
	Relations []RelationData `json:"relations"`
}

type RelationData struct {
	From         string `json:"from"`
	To           string `json:"to"`
	RelationType string `json:"relationType"`
}

type CreateRelationsResponse struct {
	Success   bool     `json:"success"`
	Created   []string `json:"created"`
	Relations int      `json:"relations"`
}

type AddObservationsRequest struct {
	Observations []ObservationData `json:"observations"`
}

type ObservationData struct {
	EntityName string   `json:"entityName"`
	Contents   []string `json:"contents"`
}

type AddObservationsResponse struct {
	Success bool     `json:"success"`
	Updated []string `json:"updated"`
}

type ReadGraphResponse struct {
	Graph         *KnowledgeGraph `json:"graph"`
	EntityCount   int             `json:"entityCount"`
	RelationCount int             `json:"relationCount"`
}

func NewKnowledgeTools(storageDir string) *KnowledgeTools {
	kt := &KnowledgeTools{
		storageDir: storageDir,
		graph: &KnowledgeGraph{
			Entities:  make(map[string]*Entity),
			Relations: make(map[string]*Relation),
			Updated:   time.Now(),
		},
	}

	if err := os.MkdirAll(storageDir, 0755); err != nil {
		fmt.Printf("Failed to create storage directory: %v\n", err)
	}

	kt.loadGraph()
	return kt
}

func (kt *KnowledgeTools) getGraphPath() string {
	return filepath.Join(kt.storageDir, "knowledge_graph.json")
}

func (kt *KnowledgeTools) loadGraph() error {
	graphPath := kt.getGraphPath()

	if _, err := os.Stat(graphPath); os.IsNotExist(err) {
		return nil // No existing graph
	}

	data, err := os.ReadFile(graphPath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, kt.graph)
}

func (kt *KnowledgeTools) saveGraph() error {
	kt.graph.Updated = time.Now()

	data, err := json.MarshalIndent(kt.graph, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(kt.getGraphPath(), data, 0644)
}

func (kt *KnowledgeTools) CreateEntities(req CreateEntitiesRequest) (*CreateEntitiesResponse, error) {
	var created, updated []string

	for _, entityData := range req.Entities {
		if existing, exists := kt.graph.Entities[entityData.Name]; exists {
			// Update existing entity
			existing.Observations = append(existing.Observations, entityData.Observations...)
			existing.Updated = time.Now()
			updated = append(updated, entityData.Name)
		} else {
			// Create new entity
			entity := &Entity{
				Name:         entityData.Name,
				EntityType:   entityData.EntityType,
				Observations: entityData.Observations,
				Created:      time.Now(),
				Updated:      time.Now(),
			}
			kt.graph.Entities[entityData.Name] = entity
			created = append(created, entityData.Name)
		}
	}

	if err := kt.saveGraph(); err != nil {
		return nil, err
	}

	return &CreateEntitiesResponse{
		Success:     true,
		Created:     created,
		Updated:     updated,
		EntityCount: len(kt.graph.Entities),
	}, nil
}

func (kt *KnowledgeTools) SearchNodes(req SearchNodesRequest) (*SearchNodesResponse, error) {
	var entities []Entity
	query := strings.ToLower(req.Query)

	for _, entity := range kt.graph.Entities {
		// Search in entity name
		if strings.Contains(strings.ToLower(entity.Name), query) {
			entities = append(entities, *entity)
			continue
		}

		// Search in entity type
		if strings.Contains(strings.ToLower(entity.EntityType), query) {
			entities = append(entities, *entity)
			continue
		}

		// Search in observations
		for _, observation := range entity.Observations {
			if strings.Contains(strings.ToLower(observation), query) {
				entities = append(entities, *entity)
				break
			}
		}
	}

	return &SearchNodesResponse{
		Entities: entities,
		Query:    req.Query,
		Found:    len(entities),
	}, nil
}

func (kt *KnowledgeTools) CreateRelations(req CreateRelationsRequest) (*CreateRelationsResponse, error) {
	var created []string

	for _, relationData := range req.Relations {
		// Verify entities exist
		if _, exists := kt.graph.Entities[relationData.From]; !exists {
			return nil, fmt.Errorf("entity not found: %s", relationData.From)
		}
		if _, exists := kt.graph.Entities[relationData.To]; !exists {
			return nil, fmt.Errorf("entity not found: %s", relationData.To)
		}

		// Create relation ID
		relationID := fmt.Sprintf("%s|%s|%s", relationData.From, relationData.RelationType, relationData.To)

		// Create relation
		relation := &Relation{
			ID:           relationID,
			From:         relationData.From,
			To:           relationData.To,
			RelationType: relationData.RelationType,
			Created:      time.Now(),
		}

		kt.graph.Relations[relationID] = relation
		created = append(created, relationID)
	}

	if err := kt.saveGraph(); err != nil {
		return nil, err
	}

	return &CreateRelationsResponse{
		Success:   true,
		Created:   created,
		Relations: len(kt.graph.Relations),
	}, nil
}

func (kt *KnowledgeTools) AddObservations(req AddObservationsRequest) (*AddObservationsResponse, error) {
	var updated []string

	for _, obsData := range req.Observations {
		if entity, exists := kt.graph.Entities[obsData.EntityName]; exists {
			entity.Observations = append(entity.Observations, obsData.Contents...)
			entity.Updated = time.Now()
			updated = append(updated, obsData.EntityName)
		} else {
			return nil, fmt.Errorf("entity not found: %s", obsData.EntityName)
		}
	}

	if err := kt.saveGraph(); err != nil {
		return nil, err
	}

	return &AddObservationsResponse{
		Success: true,
		Updated: updated,
	}, nil
}

func (kt *KnowledgeTools) ReadGraph() (*ReadGraphResponse, error) {
	return &ReadGraphResponse{
		Graph:         kt.graph,
		EntityCount:   len(kt.graph.Entities),
		RelationCount: len(kt.graph.Relations),
	}, nil
}

func (kt *KnowledgeTools) CreateCreateEntitiesHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req CreateEntitiesRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}
		
		result, err := kt.CreateEntities(req)
		if err != nil {
			return nil, err
		}
		
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("Created %d entities, updated %d entities. Total entities: %d", 
						len(result.Created), len(result.Updated), result.EntityCount),
				},
			},
			IsError: false,
		}, nil
	}
}

func (kt *KnowledgeTools) CreateSearchNodesHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req SearchNodesRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}
		
		result, err := kt.SearchNodes(req)
		if err != nil {
			return nil, err
		}
		
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("Found %d entities matching query '%s'", result.Found, result.Query),
				},
			},
			IsError: false,
		}, nil
	}
}

func (kt *KnowledgeTools) CreateCreateRelationsHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req CreateRelationsRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}
		
		result, err := kt.CreateRelations(req)
		if err != nil {
			return nil, err
		}
		
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("Created %d relations. Total relations: %d", 
						len(result.Created), result.Relations),
				},
			},
			IsError: false,
		}, nil
	}
}

func (kt *KnowledgeTools) CreateAddObservationsHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		var req AddObservationsRequest
		if err := mapToStruct(params.Arguments, &req); err != nil {
			return nil, err
		}
		
		result, err := kt.AddObservations(req)
		if err != nil {
			return nil, err
		}
		
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("Added observations to %d entities", len(result.Updated)),
				},
			},
			IsError: false,
		}, nil
	}
}

func (kt *KnowledgeTools) CreateReadGraphHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		result, err := kt.ReadGraph()
		if err != nil {
			return nil, err
		}
		
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: fmt.Sprintf("Knowledge graph contains %d entities and %d relations", 
						result.EntityCount, result.RelationCount),
				},
			},
			IsError: false,
		}, nil
	}
}

func mapToStruct(m map[string]any, v interface{}) error {
	data, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, v)
}
