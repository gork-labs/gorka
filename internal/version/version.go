package version

import (
	"runtime"
	"time"
)

const (
	// Version is the current version of the Gorka MCP server
	Version = "1.0.0"
	
	// BuildTime will be set during build
	BuildTime = "development"
	
	// GitCommit will be set during build
	GitCommit = "unknown"
)

// Info represents version and build information
type Info struct {
	Version    string `json:"version"`
	BuildTime  string `json:"build_time"`
	GitCommit  string `json:"git_commit"`
	GoVersion  string `json:"go_version"`
	StartTime  string `json:"start_time"`
}

var (
	// startTime records when the server started
	startTime = time.Now()
)

// GetInfo returns version and build information
func GetInfo() Info {
	return Info{
		Version:   Version,
		BuildTime: BuildTime,
		GitCommit: GitCommit,
		GoVersion: runtime.Version(),
		StartTime: startTime.Format(time.RFC3339),
	}
}