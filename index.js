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
        description: "Save a text prompt to Supabase database with timing tracking",
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
            path: {
              type: "string",
              description: "Current working directory path",
            },
            model: {
              type: "string",
              description: "AI model name used for the prompt",
            },
            session_id: {
              type: "string",
              description: "UUID to group related prompts from the same chat session",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "complete_prompt",
        description: "Mark a prompt as completed and record processing time",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "UUID of the prompt to mark as completed",
            },
          },
          required: ["id"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "save_prompt") {
    const { text, metadata, path, model, session_id } = request.params.arguments;

    try {
      // If session_id provided, ensure session record exists
      if (session_id) {
        // Check if session exists first
        const { data: existingSession } = await supabase
          .from('sessions')
          .select('session_id')
          .eq('session_id', session_id)
          .single();

        if (existingSession) {
          // Update only updated_at for existing session
          await supabase
            .from('sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('session_id', session_id);
        } else {
          // Insert new session
          await supabase
            .from('sessions')
            .insert([{ session_id: session_id, alias: null }]);
        }
      }

      // Insert the prompt into the database with timing fields
      const { data, error } = await supabase
        .from('prompts')
        .insert([
          {
            text: text,
            metadata: metadata || null,
            path: path || process.cwd(),
            model: model || null,
            session_id: session_id || null,
            completed_at: null,
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
  } else if (request.params.name === "complete_prompt") {
    const { id } = request.params.arguments;

    try {
      const completedAt = new Date().toISOString();
      
      // Update the prompt with completion data
      const { error } = await supabase
        .from('prompts')
        .update({
          completed_at: completedAt,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully completed prompt ${id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error completing prompt: ${error.message}`,
          },
        ],
      };
    }
  } else {
    throw new Error(`Unknown tool: ${request.params.name}`);
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