# Prompt Storage MCP Server

A Model Context Protocol (MCP) server that saves text prompts to a Supabase database.

## Features

- Save text prompts to Supabase database
- Optional metadata storage
- Automatic timestamp tracking
- Error handling and validation

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Database Setup**: Create a table called `prompts` with the following schema:

```sql
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Installation

```bash
cd counter
npm install
```

## Configuration

1. Copy your Supabase project URL and anon key from your Supabase dashboard
2. Update the `.env` file with your credentials:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

## Usage

### As an MCP Server

The server can be used with any MCP-compatible client by adding it to your configuration:

```json
{
  "mcpServers": {
    "prompt-storage": {
      "command": "node",
      "args": ["path/to/counter/index.js"]
    }
  }
}
```

### Development

```bash
# Start the server
npm start

# Start with auto-reload during development
npm run dev
```

## Tool: save_prompt

Saves a text prompt to your Supabase database with optional metadata.

### Parameters

- `text` (required): The text prompt to save to the database
- `metadata` (optional): Additional data to store with the prompt (as JSON object)

### Example Usage

```javascript
// Save a simple prompt
await mcp.callTool("save_prompt", { 
  text: "What is the meaning of life?" 
});
// Returns: "Successfully saved prompt to database with ID: abc123..."

// Save a prompt with metadata
await mcp.callTool("save_prompt", { 
  text: "Generate a Python function", 
  metadata: { 
    category: "coding", 
    language: "python",
    difficulty: "intermediate"
  }
});
// Returns: "Successfully saved prompt to database with ID: def456..."
```

## Response Format

The tool returns a success message with the database ID of the saved prompt, or an error message if the operation fails.

## Database Schema

The `prompts` table contains:
- `id`: UUID primary key (auto-generated)
- `text`: The prompt text (required)
- `metadata`: Optional JSON data
- `created_at`: Timestamp (auto-generated)

## Error Handling

The server handles various error scenarios:
- Missing environment variables
- Database connection issues
- Invalid data insertion
- Supabase API errors

All errors are returned as descriptive messages to help with debugging.