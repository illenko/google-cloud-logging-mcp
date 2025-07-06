# Google Cloud Logging MCP

A Model Context Protocol (MCP) server that enables AI assistants like Claude to interact with Google Cloud Logging. This allows for natural language querying and analysis of your GCP logs during conversations.

## Features

* 🔍 Query Google Cloud Logs using natural language
* ☁️ Support for multiple GCP projects
* 🔐 Secure credential handling (no credentials are exposed to external services)
* 🏃‍♂️ Local execution with your GCP credentials
* 🔄 Automatic retries for improved reliability
* 📊 Flexible log filtering by severity, time range, resource type, and more
* 🔎 Full-text search capabilities across log entries

## Prerequisites

* Node.js
* Claude Desktop/Cursor/Windsurf
* GCP credentials configured locally (application default credentials)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/illenko/google-cloud-logging-mcp
cd google-cloud-logging-mcp
```

2. Install dependencies:
```bash
npm install
```

## Configuration

### Claude Desktop

1. Open Claude desktop app and go to Settings -> Developer -> Edit Config

2. Add the following entry to your `claude_desktop_config.json`:

via npm:
```json
{
  "mcpServers": {
    "google-cloud-logging": {
      "command": "sh",
      "args": ["-c", "npx -y google-cloud-logging-mcp"]
    }
  }
}
```

If you installed from source:
```json
{
  "mcpServers": {
    "google-cloud-logging": {
      "command": "npm",
      "args": [
        "--silent",
        "--prefix",
        "/path/to/google-cloud-logging-mcp",
        "start"
      ]
    }
  }
}
```

Replace `/path/to/google-cloud-logging-mcp` with the actual path to your project directory if using source installation.

### Cursor

1. Open Cursor and go to Settings (⌘,)
2. Navigate to AI -> Model Context Protocol
3. Add a new MCP configuration:
```json
{
  "google-cloud-logging": {
    "command": "npx -y google-cloud-logging-mcp"
  }
}
```

### Windsurf

1. Open `~/.windsurf/config.json` (create if it doesn't exist)
2. Add the MCP configuration:
```json
{
  "mcpServers": {
    "google-cloud-logging": {
      "command": "npx -y google-cloud-logging-mcp"
    }
  }
}
```

### GCP Setup

1. Set up GCP credentials:
   - Set up application default credentials using `gcloud auth application-default login`

2. Refresh your AI assistant (Claude Desktop/Cursor/Windsurf)

## Usage

Start by selecting a project or asking questions like:
* "List all GCP projects I have access to"
* "Show me the logs from my Cloud Run services"
* "Find all ERROR level logs from the last hour"
* "Show me logs from my Compute Engine instances"
* "Find logs containing 'timeout' in the message"
* "Show me all WARNING and ERROR logs from today"
* "Get logs from a specific resource type"
* "Show me the most recent 50 log entries"

## Available Tools

1. `list-projects`: List all accessible GCP projects
2. `select-project`: Select a GCP project for subsequent operations
3. `get-logs`: Get Cloud Logging entries with flexible filtering capabilities

## Example Interactions

1. List available projects:
```
List all GCP projects I have access to
```

2. Select a project:
```
Use project my-project-id
```

3. Query logs with filters:
```
Show me all ERROR logs from the last hour
```

4. Search logs by content:
```
Find logs containing "database connection" in the message
```

5. Get logs from specific resources:
```
Show me logs from my Cloud Run services with severity WARNING or higher
```

## Log Query Capabilities

* **Severity Filtering**: Filter by log levels (DEBUG, INFO, NOTICE, WARNING, ERROR, CRITICAL, ALERT, EMERGENCY)
* **Time Range Filtering**: Query logs within specific time ranges
* **Resource Type Filtering**: Filter by GCP resource types (gce_instance, cloud_function, cloud_run_revision, etc.)
* **Full-text Search**: Search within log messages and structured fields
* **Advanced Queries**: Combine multiple filters using Cloud Logging filter syntax
* **Flexible Limits**: Control the number of results returned

## Troubleshooting

To see logs:
```bash
tail -n 50 -f ~/Library/Logs/Claude/mcp-server-google-cloud-logging.log
```

Common issues:
1. Authentication errors: Ensure you've run `gcloud auth application-default login`
2. Permission errors: Check IAM roles for your account (you need `roles/logging.viewer` or higher)
3. API errors: Verify that the Cloud Logging API is enabled in your project

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 

## License

MIT 