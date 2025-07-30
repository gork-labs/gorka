package fetch

import (
	"testing"
	"net/http"
	"net/http/httptest"
	"encoding/json"
)

func TestFetchTools_ExecuteFetch(t *testing.T) {
	// Create a test server
	testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "Hello, World!", "status": "success"}`))
	}))
	defer testServer.Close()

	// Create fetch tools instance
	ft := NewFetchTools()

	// Test parameters
	params := map[string]interface{}{
		"url":    testServer.URL,
		"method": "GET",
	}

	// Execute fetch
	result, err := ft.ExecuteFetch(params)
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	// Parse the result
	var response FetchResponse
	if err := json.Unmarshal([]byte(result), &response); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	// Verify the response
	if !response.Success {
		t.Errorf("Expected success=true, got: %v", response.Success)
	}

	if response.StatusCode != 200 {
		t.Errorf("Expected status code 200, got: %d", response.StatusCode)
	}

	if response.Body != `{"message": "Hello, World!", "status": "success"}` {
		t.Errorf("Unexpected response body: %s", response.Body)
	}

	if response.URL != testServer.URL {
		t.Errorf("Expected URL %s, got: %s", testServer.URL, response.URL)
	}
}

func TestFetchTools_ExecuteFetch_InvalidURL(t *testing.T) {
	ft := NewFetchTools()

	params := map[string]interface{}{
		"url": "invalid-url",
	}

	_, err := ft.ExecuteFetch(params)
	if err == nil {
		t.Error("Expected error for invalid URL, got nil")
	}
}

func TestFetchTools_ExecuteFetch_MissingURL(t *testing.T) {
	ft := NewFetchTools()

	params := map[string]interface{}{
		"method": "GET",
	}

	_, err := ft.ExecuteFetch(params)
	if err == nil {
		t.Error("Expected error for missing URL, got nil")
	}
}