# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Run development server with hot reload using tsx watch
- `npm run build` - Build TypeScript to JavaScript using tsc
- `npm run start` - Run the production server
- `npm test` - Test the server by running the binary

### Testing the MCP Server
- `tsx bin.js` - Direct test of the MCP server functionality
- Use with MCP clients like Claude Desktop, Cursor, or Windsurf for integration testing

## Architecture Overview

This is a Model Context Protocol (MCP) server that enables AI assistants to interact with Google Cloud Platform resources. The architecture consists of:

### Core Components

**index.ts** - Main MCP server implementation
- Implements MCP protocol using `@modelcontextprotocol/sdk`
- Handles tool registration and execution
- Manages GCP authentication and project selection
- Provides 9 specialized tools for GCP operations

**bin.js** - Entry point executable
- Simple Node.js wrapper that loads tsx and runs index.ts
- Used for npm package distribution

### Key Architecture Patterns

**Dynamic Code Execution**: The server allows users to write TypeScript code that gets executed in a sandboxed context with access to GCP client libraries. The `run-gcp-code` tool uses ts-morph to analyze and wrap user code, automatically adding return statements to expression statements.

**State Management**: The server maintains session state for:
- `selectedProject` - Currently selected GCP project
- `selectedProjectCredentials` - Authentication credentials
- `selectedRegion` - Default region (us-central1)

**Client Library Integration**: Pre-configured clients for major GCP services:
- Compute Engine (`InstancesClient`)
- Cloud Storage (`Storage`)
- Cloud Functions (`CloudFunctionsServiceClient`)
- Cloud Run (`ServicesClient`)
- BigQuery (`BigQuery`)
- Resource Manager (`ProjectsClient`)
- GKE (`ClusterManagerClient`)
- Cloud Logging (`Logging`)
- Cloud SQL (`SqlInstancesServiceClient`)
- Cloud Billing (`CloudBillingClient`, `BudgetServiceClient`)

**Error Handling**: Comprehensive retry logic with exponential backoff, graceful error handling for API failures, and user-friendly error messages.

## GCP Integration

### Authentication
Uses Google Auth Library with cloud-platform scope. Expects application default credentials to be configured (`gcloud auth application-default login`).

### Project Selection Workflow
1. User lists available projects with `list-projects`
2. User selects project with `select-project`
3. All subsequent operations use the selected project

### Supported GCP Services
- Compute Engine (VM instances)
- Cloud Storage (buckets and objects)
- Cloud Functions (serverless functions)
- Cloud Run (containerized applications)
- BigQuery (data warehouse)
- Cloud SQL (managed databases)
- GKE (Kubernetes clusters)
- Cloud Logging (centralized logging)
- Cloud Billing (cost management)
- Resource Manager (project management)

## Code Execution Context

The `run-gcp-code` tool provides a sandboxed environment with:
- All GCP client libraries pre-instantiated
- Helper functions like `retry()` for robust API calls
- Access to `selectedProject`, `selectedRegion` variables
- Automatic code wrapping to handle return statements
- Documentation via `help()` function

## Error Patterns

Common error scenarios handled:
- Authentication failures (code 7) - suggests enabling APIs
- Missing project selection - prompts for project selection
- API not enabled - provides specific enablement guidance
- Network timeouts - automatic retries with backoff
- Permission errors - clear IAM guidance

## Development Notes

- TypeScript compilation target: ES2020 with CommonJS modules
- Uses tsx for development and production execution
- Fallback to HTTP/1.1 for Cloud SQL API (gRPC issues)
- Comprehensive error logging to stderr for debugging
- MCP protocol compliance for tool discovery and execution