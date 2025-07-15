# @idyllic-labs/idyll-engine

A lightweight document execution engine and agent system for the Idyllic language.

## Features

- **Document Execution**: Parse and execute Idyllic XML documents with `<fncall>` blocks
- **Agent System**: AI-powered agents with custom function definitions and variable resolution
- **Function Registry**: Extensible function system with Azure Functions compatibility
- **Variable Resolution**: AI-based parameter interpolation for dynamic function execution
- **Response Compression**: Intelligent compression of verbose function outputs
- **Memory System**: Activity tracking and context management for agents

## Installation

```bash
npm install @idyllic-labs/idyll-engine
```

## Quick Start

### Document Execution

```typescript
import { parseXML, DocumentExecutor, createFunctionRegistry, defineFunction } from '@idyllic-labs/idyll-engine';

// Create a function registry
const functions = createFunctionRegistry({
  'demo:echo': defineFunction({
    schema: z.object({ message: z.string() }),
    description: 'Echo a message',
    execute: async (params) => ({ echoed: params.message }),
  }),
});

// Parse and execute a document
const document = parseXML(`
  <document>
    <fncall idyll-fn="demo:echo">
      <params>{"message": "Hello World"}</params>
    </fncall>
  </document>
`);

const executor = new DocumentExecutor({ functions });
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
  functions: myFunctionRegistry,
  memoryLimit: 20,
});

// Chat with the agent
const result = await agent.chat([
  { role: 'user', content: 'Hello!', id: '1', createdAt: new Date() }
]);

console.log(result.message.content);
```

## Function Naming

All functions follow the `module:function` pattern with JavaScript identifier constraints:

```typescript
import { validateFunctionName, toAzureFunctionName } from '@idyllic-labs/idyll-engine';

// Valid function names
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
- `createFunctionRegistry(functions)` - Create a function registry
- `defineFunction(config)` - Define a function with schema and executor

### Agent System API

- `Agent` - AI agent with function execution and memory
- `ActivityMemory` - Memory management for agent interactions
- `getModel(modelId)` - Get AI model instance

### Function Naming API

- `toAzureFunctionName(functionName)` - Convert to Azure-compatible names
- `validateFunctionName(functionName)` - Validate function name format
- `parseFunctionName(functionName)` - Parse module and function parts

## Examples

See the `examples/` directory for:

- `document-simple.xml` - Basic document structure
- `executable-demo.xml` - Document with function calls
- `agent-simple.xml` - Simple agent definition
- `demo-agent.xml` - Agent with custom functions

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
