package fetch

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"gorka/internal/interfaces"
	"github.com/modelcontextprotocol/go-sdk/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type FetchTools struct {
	client *http.Client
}

type FetchRequest struct {
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
	Timeout int               `json:"timeout"`
}

type FetchResponse struct {
	StatusCode int               `json:"status_code"`
	Status     string            `json:"status"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	URL        string            `json:"url"`
	Success    bool              `json:"success"`
	Error      string            `json:"error"`
}

func NewFetchTools() *FetchTools {
	return &FetchTools{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (ft *FetchTools) Register(registrar interfaces.ToolRegistrar) {
	// Register fetch tool
	fetchSchema := &jsonschema.Schema{
		Type: "object",
		Properties: map[string]*jsonschema.Schema{
			"url": {
				Type:        "string",
				Description: "URL to fetch",
			},
			"method": {
				Type:        "string",
				Description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
				Default:     json.RawMessage(`"GET"`),
			},
			"headers": {
				Type:        "object",
				Description: "HTTP headers to include",
				AdditionalProperties: &jsonschema.Schema{
					Type: "string",
				},
			},
			"body": {
				Type:        "string",
				Description: "Request body (for POST, PUT, etc.)",
			},
			"timeout": {
				Type:        "integer",
				Description: "Request timeout in seconds (default: 30)",
				Default:     json.RawMessage("30"),
				Minimum:     float64Ptr(1),
				Maximum:     float64Ptr(300),
			},
		},
		Required: []string{"url"},
	}

	registrar.RegisterMCPTool("fetch", "Fetch data from HTTP/HTTPS URLs", ft.CreateFetchHandler(), fetchSchema)
	registrar.RegisterOpenAITool("fetch", "Fetch data from HTTP/HTTPS URLs", fetchSchema, ft.ExecuteFetch)
}

func (ft *FetchTools) CreateFetchHandler() mcp.ToolHandler {
	return func(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[map[string]any]) (*mcp.CallToolResultFor[any], error) {
		result, err := ft.ExecuteFetch(params.Arguments)
		if err != nil {
			return nil, err
		}
		
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: result,
				},
			},
		}, nil
	}
}

func (ft *FetchTools) ExecuteFetch(params map[string]interface{}) (string, error) {
	var req FetchRequest
	
	// Parse URL (required)
	if urlVal, ok := params["url"].(string); ok {
		req.URL = urlVal
	} else {
		return "", fmt.Errorf("url parameter is required and must be a string")
	}
	
	// Validate URL
	parsedURL, err := url.Parse(req.URL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return "", fmt.Errorf("invalid URL: must include scheme (http/https) and host")
	}
	
	// Only allow HTTP and HTTPS
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return "", fmt.Errorf("unsupported URL scheme: %s (only http and https are supported)", parsedURL.Scheme)
	}
	
	// Parse method (optional, defaults to GET)
	if methodVal, ok := params["method"].(string); ok {
		req.Method = strings.ToUpper(methodVal)
	} else {
		req.Method = "GET"
	}
	
	// Parse headers (optional)
	if headersVal, ok := params["headers"].(map[string]interface{}); ok {
		req.Headers = make(map[string]string)
		for k, v := range headersVal {
			if strVal, ok := v.(string); ok {
				req.Headers[k] = strVal
			}
		}
	}
	
	// Parse body (optional)
	if bodyVal, ok := params["body"].(string); ok {
		req.Body = bodyVal
	}
	
	// Parse timeout (optional, defaults to 30)
	if timeoutVal, ok := params["timeout"]; ok {
		switch t := timeoutVal.(type) {
		case int:
			req.Timeout = t
		case float64:
			req.Timeout = int(t)
		default:
			req.Timeout = 30
		}
	} else {
		req.Timeout = 30
	}
	
	// Set custom timeout if specified
	if req.Timeout > 0 && req.Timeout <= 300 {
		ft.client.Timeout = time.Duration(req.Timeout) * time.Second
	}
	
	// Create HTTP request
	var bodyReader io.Reader
	if req.Body != "" {
		bodyReader = strings.NewReader(req.Body)
	}
	
	httpReq, err := http.NewRequest(req.Method, req.URL, bodyReader)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %v", err)
	}
	
	// Add headers
	if req.Headers != nil {
		for k, v := range req.Headers {
			httpReq.Header.Set(k, v)
		}
	}
	
	// Set default User-Agent if not provided
	if httpReq.Header.Get("User-Agent") == "" {
		httpReq.Header.Set("User-Agent", "Gorka-Agent/1.0")
	}
	
	// Perform request
	resp, err := ft.client.Do(httpReq)
	if err != nil {
		response := FetchResponse{
			URL:     req.URL,
			Success: false,
			Error:   err.Error(),
		}
		responseJSON, _ := json.Marshal(response)
		return string(responseJSON), nil
	}
	defer resp.Body.Close()
	
	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		response := FetchResponse{
			StatusCode: resp.StatusCode,
			Status:     resp.Status,
			URL:        req.URL,
			Success:    false,
			Error:      fmt.Sprintf("failed to read response body: %v", err),
		}
		responseJSON, _ := json.Marshal(response)
		return string(responseJSON), nil
	}
	
	// Extract response headers
	responseHeaders := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			responseHeaders[k] = v[0] // Take first value if multiple
		}
	}
	
	// Create response
	response := FetchResponse{
		StatusCode: resp.StatusCode,
		Status:     resp.Status,
		Headers:    responseHeaders,
		Body:       string(bodyBytes),
		URL:        req.URL,
		Success:    resp.StatusCode >= 200 && resp.StatusCode < 300,
	}
	
	responseJSON, err := json.Marshal(response)
	if err != nil {
		return "", fmt.Errorf("failed to marshal response: %v", err)
	}
	
	return string(responseJSON), nil
}

// intPtr returns a pointer to an integer
func intPtr(i int) *int {
	return &i
}

// float64Ptr returns a pointer to a float64
func float64Ptr(f float64) *float64 {
	return &f
}

// mapToStruct converts a map to a struct using JSON marshaling/unmarshaling
func mapToStruct(src map[string]any, dst interface{}) error {
	jsonBytes, err := json.Marshal(src)
	if err != nil {
		return err
	}
	return json.Unmarshal(jsonBytes, dst)
}