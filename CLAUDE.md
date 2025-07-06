# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Run development server with hot reload using tsx watch
- `npm run build` - Build TypeScript to JavaScript using tsc
- `npm run start` - Run the production server
- `npm test` - Test the server by running the binary

### Testing the MCP Server
- `tsx bin.js` - Direct test of the MCP server functionality (stdio mode)
- `npm run start` - Start the server in stdio mode
- `npm run dev` - Start the server in development mode with hot reload
- `MCP_TRANSPORT=sse npm run start` - Start the server in SSE mode
- `MCP_TRANSPORT=sse MCP_PORT=4000 npm run start` - Start the server in SSE mode on port 4000
- Use with MCP clients like Claude Desktop, Cursor, or Windsurf for integration testing

## Architecture Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to interact with Google Cloud Logging. The architecture consists of:

### Core Components

**index.ts** - Main MCP server implementation
- Implements MCP protocol using `@modelcontextprotocol/sdk`
- Handles tool registration and execution
- Manages GCP authentication and project selection
- Provides 3 specialized tools for logging operations

**bin.js** - Entry point executable
- Simple Node.js wrapper that loads tsx and runs index.ts
- Used for npm package distribution

### Key Architecture Patterns

**Transport Flexibility**: The server supports both stdio and SSE (Server-Sent Events) transport modes:
- **stdio mode** (default): Direct integration with MCP clients using standard input/output
- **SSE mode**: HTTP-based transport for web integrations, controlled by environment variables or command-line arguments

**Query-Based Log Filtering**: The server provides flexible log querying through the `get-logs` tool, allowing users to specify filtering criteria directly in their queries (severity, time range, resource type, etc.) rather than requiring separate filtering tools.

**State Management**: The server maintains session state for:
- `selectedProject` - Currently selected GCP project
- `selectedProjectCredentials` - Authentication credentials
- `selectedRegion` - Default region (us-central1)

**Client Library Integration**: Pre-configured clients for logging operations:
- Cloud Logging (`Logging`)
- Resource Manager (`ProjectsClient`)

**Error Handling**: Comprehensive retry logic with exponential backoff, graceful error handling for API failures, and user-friendly error messages.

## GCP Integration

### Authentication
Uses Google Auth Library with cloud-platform scope. Expects application default credentials to be configured (`gcloud auth application-default login`).

### Project Selection Workflow
1. User lists available projects with `list-projects`
2. User selects project with `select-project`
3. All subsequent logging operations use the selected project

### Available Tools
- `list-projects` - List all accessible GCP projects
- `select-project` - Select a project for logging operations
- `get-logs` - Query and retrieve logs with flexible filtering capabilities

## Log Querying

The `get-logs` tool provides flexible log querying capabilities with:
- Support for Cloud Logging filter syntax
- Time range filtering (e.g., "timestamp >= '2023-01-01T00:00:00Z'")
- Severity filtering (e.g., "severity >= ERROR")
- Resource type filtering (e.g., "resource.type = 'gce_instance'")
- Full-text search in log messages
- Structured field queries
- Configurable result limits and ordering

## Error Patterns

Common error scenarios handled:
- Authentication failures (code 7) - suggests enabling APIs
- Missing project selection - prompts for project selection
- API not enabled - provides specific enablement guidance
- Network timeouts - automatic retries with backoff
- Permission errors - clear IAM guidance

## Transport Configuration

The server supports both stdio and SSE transport modes:

### Environment Variables
- `MCP_TRANSPORT`: "stdio" (default) or "sse"
- `MCP_PORT`: Port for SSE mode (default: 3000)

### Command Line Arguments
- `--sse`: Enable SSE mode
- `--port=3000`: Set port for SSE mode

### Examples
```bash
# stdio mode (default)
npm run start

# SSE mode with default port 3000
MCP_TRANSPORT=sse npm run start

# SSE mode with custom port
MCP_TRANSPORT=sse MCP_PORT=4000 npm run start

# Using command line arguments
tsx index.ts --sse --port=4000
```

## Development Notes

- TypeScript compilation target: ES2020 with CommonJS modules
- Uses tsx for development and production execution
- Comprehensive error logging to stderr for debugging
- MCP protocol compliance for tool discovery and execution
- Focused on Google Cloud Logging operations with streamlined dependencies
- Supports both stdio and SSE transport modes for maximum compatibility

## Log Query Examples

### Basic Queries
```
severity >= ERROR
```

### Time-based Queries
```
timestamp >= "2023-01-01T00:00:00Z" AND timestamp <= "2023-01-02T00:00:00Z"
```

### Resource-specific Queries
```
resource.type = "gce_instance" AND resource.labels.instance_id = "my-instance"
```

### Combined Queries
```
severity >= WARNING AND resource.type = "cloud_function" AND timestamp >= "2023-01-01T00:00:00Z"
```

## Integration

This MCP server is designed to work with:
- Claude Desktop
- Cursor IDE
- Windsurf
- Any MCP-compatible client

The server provides seamless integration with Google Cloud Logging, allowing AI assistants to query, analyze, and retrieve logs from your GCP projects efficiently.