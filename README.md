# Prompt Storage MCP Server

A Model Context Protocol (MCP) server that saves text prompts to a Supabase database.

## Features

- Save text prompts to Supabase database
- Optional metadata storage
- Automatic timestamp tracking
- Error handling and validation

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Database Setup**: Create the required tables with the following schemas:

```sql
-- Main prompts table
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  metadata JSONB,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table for aliases (optional - for dashboard use)
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY,
  alias TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
- `session_id` (optional): UUID to group related prompts from the same chat session

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

### Prompts Table
The `prompts` table contains:
- `id`: UUID primary key (auto-generated)
- `text`: The prompt text (required)
- `metadata`: Optional JSON data
- `session_id`: Optional UUID to group related prompts
- `created_at`: Timestamp (auto-generated)

### Sessions Table (Optional)
The `sessions` table enables human-readable session aliases:
- `session_id`: UUID primary key (matches session_id in prompts)
- `alias`: Human-readable name for the session (e.g., "Bug Fix Session")
- `created_at`: Timestamp (auto-generated)
- `updated_at`: Timestamp (auto-generated)

### Dashboard Queries
Example queries for displaying sessions with aliases:

```sql
-- Get sessions with prompt counts
SELECT s.session_id, 
       COALESCE(s.alias, s.session_id::text) as display_name,
       COUNT(p.id) as prompt_count
FROM sessions s 
LEFT JOIN prompts p ON s.session_id = p.session_id 
GROUP BY s.session_id, s.alias;

-- Get prompts with session display names
SELECT p.*, 
       COALESCE(s.alias, p.session_id::text) as session_name
FROM prompts p 
LEFT JOIN sessions s ON p.session_id = s.session_id
ORDER BY p.created_at DESC;
```

## Error Handling

The server handles various error scenarios:
- Missing environment variables
- Database connection issues
- Invalid data insertion
- Supabase API errors

All errors are returned as descriptive messages to help with debugging.