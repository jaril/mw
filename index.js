#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Prompt Storage MCP Server
 * 
 * Provides a tool to save text prompts to Supabase database.
 */

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY");
  console.error("Please update your .env file with valid Supabase credentials");
  process.exit(1);
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || supabaseUrl === 'your_supabase_project_url') {
  console.error("Invalid SUPABASE_URL: Please provide a valid Supabase project URL");
  process.exit(1);
}

if (supabaseKey === 'your_supabase_anon_key') {
  console.error("Invalid SUPABASE_ANON_KEY: Please provide a valid Supabase anon key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const server = new Server(
  {
    name: "prompt-storage-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "save_prompt",
        description: "Save a text prompt to Supabase database",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text prompt to save to database",
            },
            metadata: {
              type: "object",
              description: "Optional metadata to store with the prompt",
              properties: {},
              additionalProperties: true,
            },
          },
          required: ["text"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "save_prompt") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { text, metadata } = request.params.arguments;

  try {
    // Insert the prompt into the database
    const { data, error } = await supabase
      .from('prompts')
      .insert([
        {
          text: text,
          metadata: metadata || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return {
      content: [
        {
          type: "text",
          text: `Successfully saved prompt to database with ID: ${data[0].id}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error saving prompt: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Prompt Storage MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 