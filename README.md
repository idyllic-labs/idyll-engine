# @idyllic-labs/idyll-engine

A lightweight document execution engine and agent system for the Idyllic language.

## Features

- **Document Execution**: Parse and execute Idyllic XML documents with `<fncall>` blocks
- **Agent System**: AI-powered agents with custom tool definitions and variable resolution
- **Tool Registry**: Extensible tool system with Azure Functions compatibility
- **Variable Resolution**: AI-based parameter interpolation for dynamic tool execution
- **Response Compression**: Intelligent compression of verbose tool outputs
- **Memory System**: Activity tracking and context management for agents

## Installation

```bash
npm install @idyllic-labs/idyll-engine
```

## Quick Start

### Document Execution

```typescript
import { parseXML, DocumentExecutor, createToolRegistry, defineTool } from '@idyllic-labs/idyll-engine';

// Create a tool registry
const tools = createToolRegistry({
  'demo:echo': defineTool({
    schema: z.object({ message: z.string() }),
    description: 'Echo a message',
    execute: async (params) => ({ echoed: params.message }),
  }),
});

// Parse and execute a document
const document = parseXML(`
  <document>
    <fncall idyll-tool="demo:echo">
      <params>{"message": "Hello World"}</params>
    </fncall>
  </document>
`);

const executor = new DocumentExecutor({ tools });
const result = await executor.execute({ document });
```

### Agent System

```typescript
import { Agent, getModel } from '@idyllic-labs/idyll-engine';

// Create an agent
const agent = new Agent({
  document: {
    id: 'my-agent',
    name: 'Demo Agent',
    model: 'gpt-4.1',
    blocks: [/* agent system prompt blocks */],
  },
  tools: myToolRegistry,
  memoryLimit: 20,
});

// Chat with the agent
const result = await agent.chat([
  { role: 'user', content: 'Hello!', id: '1', createdAt: new Date() }
]);

console.log(result.message.content);
```

## Tool Naming

All tools follow the `module:function` pattern with JavaScript identifier constraints:

```typescript
import { validateToolName, toAzureFunctionName } from '@idyllic-labs/idyll-engine';

// Valid tool names
'demo:echo'        // ✅
'ai:analyzeText'   // ✅ 
'processData'      // ✅ (no module)

// Invalid (no longer supported)
'ai:analyze-text'  // ❌ kebab-case not allowed

// Azure Functions compatibility
toAzureFunctionName('demo:echo') // → 'demo--echo'
```

## CLI Usage

```bash
# Parse a document
bun run cli parse examples/document-simple.xml

# Validate a document  
bun run cli validate examples/agent-simple.xml

# Execute a document
bun run cli execute examples/executable-demo.xml

# Run agent CLI
bun run agent examples/demo-agent.xml
```

## API Reference

### Core Functions

- `parseXML(xml: string)` - Parse Idyllic XML to AST
- `validateDocument(document, context?)` - Validate document structure
- `createToolRegistry(tools)` - Create a tool registry
- `defineTool(config)` - Define a tool with schema and executor

### Agent System API

- `Agent` - AI agent with tool execution and memory
- `ActivityMemory` - Memory management for agent interactions
- `getModel(modelId)` - Get AI model instance

### Tool Naming API

- `toAzureFunctionName(toolName)` - Convert to Azure-compatible names
- `validateToolName(toolName)` - Validate tool name format
- `parseToolName(toolName)` - Parse module and function parts

## Examples

See the `examples/` directory for:

- `document-simple.xml` - Basic document structure
- `executable-demo.xml` - Document with tool calls
- `agent-simple.xml` - Simple agent definition
- `demo-agent.xml` - Agent with custom tools

## Development

```bash
# Install dependencies
bun install

# Build the package
bun run build

# Run type checking
bun run typecheck

# Run tests
bun run test

# Start agent CLI
bun run agent
```

## Documentation

- [Document Execution Specification](./DOCUMENT_EXECUTION_SPEC.md) - Complete execution model
- [Agent System](./agent/README.md) - Agent architecture details

## License

Private package for Idyllic Labs.
