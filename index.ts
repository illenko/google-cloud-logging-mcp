import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest
} from "@modelcontextprotocol/sdk/types";
import { z } from "zod";
import { GoogleAuth } from 'google-auth-library';
import { ProjectsClient } from '@google-cloud/resource-manager';
import { Logging, Entry } from '@google-cloud/logging';
import { createServer } from 'http';
import { URL } from 'url';


// Add error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const server = new Server(
  {
    name: "google-cloud-logging-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let selectedProject: string | null = null;
let selectedProjectCredentials: any = null;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list-projects",
        description: "List all GCP projects accessible with current credentials",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "select-project",
        description: "Selects GCP project to use for subsequent logging operations",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "ID of the GCP project to select",
            },
          },
          required: ["projectId"],
        },
      },
      {
        name: "get-logs",
        description: "Get Cloud Logging entries for the current project",
        inputSchema: {
          type: "object",
          properties: {
            filter: {
              type: "string",
              description: "Filter for the log entries (see Cloud Logging query syntax)",
            },
            pageSize: {
              type: "number",
              description: "Maximum number of entries to return (default: 10)",
            }
          },
          required: [],
        },
      }
    ],
  };
});

const SelectProjectSchema = z.object({
  projectId: z.string(),
});

const GetLogsSchema = z.object({
  filter: z.string().optional(),
  pageSize: z.number().optional(),
});


// Add retry utility function
const retry = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.error(`Operation failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return retry(fn, retries - 1);
    }
    throw error;
  }
};

// Initialize auth client with retry
const initializeAuth = async () => {
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    return await retry(async () => await auth.getClient());
  } catch (error) {
    console.error('Failed to initialize authentication:', error);
    throw error;
  }
};

// Update project selection with better error handling
const selectProject = async (projectId: string) => {
  try {
    selectedProject = projectId;
    selectedProjectCredentials = await initializeAuth();
    return true;
  } catch (error) {
    console.error('Failed to select project:', error);
    selectedProject = null;
    selectedProjectCredentials = null;
    throw error;
  }
};

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    if (name === "list-projects") {
      const projects = await listAvailableProjects();
      return createTextResponse(JSON.stringify({ projects }));
    } else if (name === "select-project") {
      const { projectId } = SelectProjectSchema.parse(args);
      selectedProjectCredentials = await auth.getClient();
      selectedProject = projectId;
      return createTextResponse("Project selected successfully!");
    } else if (name === "get-logs") {
      const { filter, pageSize = 10 } = GetLogsSchema.parse(args);
      
      if (!selectedProject) {
        return createTextResponse("No project selected. Please select a project first.");
      }

      try {
        const logging = new Logging({
          projectId: selectedProject
        });
        const [entries] = await logging.getEntries({
          pageSize,
          filter: filter || undefined,
          orderBy: 'timestamp desc'
        });
        
        return createTextResponse(JSON.stringify({
          entries: entries.map((entry: Entry) => ({
            timestamp: entry.metadata.timestamp,
            severity: entry.metadata.severity,
            resource: entry.metadata.resource,
            textPayload: entry.data,
            jsonPayload: typeof entry.data === 'object' ? entry.data : null
          }))
        }, null, 2));
      } catch (error: any) {
        console.error('Error getting logs:', error);
        return createTextResponse(`Error getting logs: ${error.message}`);
      }
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error('Error:', error);
    return createTextResponse(`Error: ${error.message}`);
  }
});


async function listAvailableProjects(): Promise<string[]> {
  const projectsClient = new ProjectsClient();
  
  try {
    const [projects] = await projectsClient.searchProjects();
    return projects.map((p: any) => JSON.stringify(p));
  } catch (error) {
    console.error('Error listing projects:', error);
    return [];
  }
}

// Parse command line arguments and environment variables
const args = process.argv.slice(2);
const transportMode = process.env.MCP_TRANSPORT || 
                     (args.includes('--sse') ? 'sse' : 'stdio');
const port = process.env.MCP_PORT || args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000';

// Wrap server connection in async function for better error handling
async function startServer() {
  try {
    if (transportMode === 'sse') {
      await startSSEServer(parseInt(port));
    } else {
      await startStdioServer();
    }
  } catch (error) {
    console.error("Failed to start Google Cloud Logging MCP Server:", error);
    process.exit(1);
  }
}

async function startStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Cloud Logging MCP Server running on stdio");
}

async function startSSEServer(port: number) {
  const transports = new Map<string, SSEServerTransport>();
  
  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${port}`);
    
    if (url.pathname === '/sse') {
      // Handle SSE connection
      const transport = new SSEServerTransport('/message', res);
      
      // Store transport with its session ID for later message handling
      const sessionId = (transport as any)._sessionId;
      transports.set(sessionId, transport);
      
      // Clean up transport when connection closes
      transport.onclose = () => {
        transports.delete(sessionId);
      };
      
      await server.connect(transport);
      console.error(`Google Cloud Logging MCP Server running on SSE at http://localhost:${port}/sse`);
    } else if (url.pathname === '/message') {
      // Handle POST messages for SSE
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing sessionId');
        return;
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            const parsedBody = JSON.parse(body);
            const transport = transports.get(sessionId);
            if (transport) {
              await transport.handlePostMessage(req, res, parsedBody);
            } else {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Session not found');
            }
          } catch (error) {
            console.error('Error handling POST message:', error);
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON');
          }
        });
      } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });

  httpServer.listen(port, () => {
    console.error(`Google Cloud Logging MCP Server HTTP server listening on port ${port}`);
    console.error(`Connect to SSE at: http://localhost:${port}/sse`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

const createTextResponse = (text: string) => ({
  content: [{ type: "text", text }],
}); 