# Document Execution Specification

This document captures the complete execution model for the Idyllic document engine, as defined through the interview process.

## Overview

Document execution is the process of running executable blocks (`<fncall>` elements) within Idyllic documents. The engine provides a host-agnostic execution framework that can be used in different environments (CLI, SaaS, etc.).

## Execution Contexts

There are two primary execution contexts:

1. **Document Context**: Executing blocks within a document editor
2. **Tool Context**: When tools are invoked programmatically

*Note: Agent mode is a special case where the agent system prompt is the document, but the document contents are considered like a prompt. This relationship to regular document execution needs further clarification.*

## Execution Triggers

- **Single Block**: User clicks "Run" on a specific block in the editor
- **Full Document**: User clicks "Run" on the document, executing all executable blocks in linear sequence
- **Note**: No cycles or branches are supported currently - execution is strictly linear

## Execution Behavior

### Result Storage

When executing in the editor:
- Results are stored in the `<result>` element within the `<fncall>` block
- The document structure is updated with execution results
- However, the document isn't necessarily "modified" from a persistence standpoint
- It's possible to run a document without modifying it (keeping results separate)

### Execution State

The engine maintains execution state externally rather than modifying the document in-place:
- Document remains immutable during execution
- Execution state accumulates results from each block
- Host environment decides whether to merge execution state back into the document

**Execution State Structure**:
```typescript
{
  blocks: OrderedMap<blockId, {
    result?: any,
    error?: Error,
    duration?: number,
    // other per-block metadata
  }>,
  metadata: {
    totalDuration: number,
    blocksExecuted: number,
    // other execution-level metadata
  }
}
```

## Tool Execution

### Tool Input

When a tool executes, it receives:
1. **Parameters**: From the `<params>` element
2. **Content**: From the `<content>` element as instructions
3. **Execution Context**: Access to previous block results and document state

### Block Context Access

- Execution is sequential with linearly accruing context
- Tools can access previous blocks' results through the execution context
- The engine maintains awareness of the document structure
- No non-linear references between blocks - purely sequential accumulation

### Execution Context Interface

```typescript
interface BlockExecutionContext {
  currentBlockId: string;
  previousResults: OrderedMap<blockId, ExecutionResult>; // All results so far
  document: IdyllDocument; // Read-only reference
}
```

## Tool Resolution

The engine requires a way to resolve tool identifiers (e.g., `ai:generate-text`):
- Host environment provides tool implementations
- Engine stays agnostic to specific tool implementations
- Designed for convenient local testing without the complex module system

### Tool Registration

Minimal tool registration interface with Zod schema validation:

```typescript
const engine = new Engine({
  tools: {
    'echo': {
      schema: z.object({
        message: z.string()
      }),
      execute: (params, content, context) => {
        return { message: params.message };
      }
    },
    'ai:generate': {
      schema: z.object({
        prompt: z.string(),
        temperature: z.number().optional()
      }),
      execute: async (params, content, context) => {
        // Implementation
      }
    }
  }
});
```

## Error Handling

- When a block fails during execution, the engine continues executing remaining blocks
- Errors are stored in the execution state for that block
- Host environment can decide how to handle errors based on context
- Errors from one block can provide context for subsequent blocks

## Host/Engine Separation

### Engine Responsibilities (Generic)
- Manages document execution flow
- Accumulates results in ordered map
- Provides block context to tools
- Returns execution report
- Validates parameters against schemas

### Host Responsibilities (Specific)
- Provides tool implementations
- Injects dependencies (database, file system, auth, etc.)
- Decides what to do with execution results
- Handles environment-specific concerns
- Maps SaaS module system to simple execute functions

### Tool Signature

From the engine's perspective, tools are simple functions:
```typescript
type ToolExecutor = (
  params: any,           // Validated against schema
  content: string,       // From <content> element
  context: BlockExecutionContext & { api?: TApi }
) => Promise<Result>;
```

The host environment handles creating these functions with whatever dependencies they need (database access, API clients, etc.). The engine does not need to know about these implementation details.

## Design Principles

1. **Linear Execution**: Blocks execute in document order, no branching
2. **Immutable Documents**: Original document is never modified during execution
3. **External State**: Execution state is maintained separately from the document
4. **Host Agnostic**: Engine has no knowledge of host-specific services
5. **Simple Testing**: Easy to create tools programmatically for local testing
6. **Type Safety**: Zod schemas provide static validation and type inference

## Custom Tool Execution

### Overview

Custom tools are user-defined tools created with `<tool>` blocks within documents. These tools can contain:
- Multiple `<fncall>` blocks that execute in sequence
- Variables that are resolved at runtime using AI interpolation
- Rich content with inline elements (mentions, links, etc.)

### Custom Tool Definition

```xml
<tool title="Search The Web" icon="🔍">
  <tool:description>Searches for information on the web about a topic</tool:description>
  <tool:definition>
    <fncall idyll-tool="web:search">
      <content>Search for <variable name="searchQuery" prompt="What to search for" /> 
               from <variable name="timeframe" prompt="Time period (optional)" /></content>
    </fncall>
    <fncall idyll-tool="ai:summarize">
      <content>Summarize the search results focusing on <variable name="focusArea" /></content>
    </fncall>
  </tool:definition>
</tool>
```

### Agent Integration

When agents use custom tools:

1. **Tool Visibility**: Agents see only the tool name and description, not the internal definition
2. **Tool Matching**: Tools are matched probabilistically by name ("Search The Web" matches the tool above)
3. **Context Provision**: Agents provide context as rich inline content when invoking tools

### Variable System

#### Variable Resolution

Variables are "AI-native parameters" - loosely typed strings resolved at runtime using AI interpolation.

**Resolution Context**:
- **Agent hints**: The inline content the agent provides when calling the tool
- **Document context**: Surrounding blocks/content where the tool is executed
- **Variable prompts**: The prompt strings defined on each variable
- **Inherited context**: All context from the parent agent (by default)

#### Variable Declaration/Usage Model

Variables follow a declare-once, use-many pattern:

```xml
<tool:definition>
  <!-- First occurrence declares and resolves the variable -->
  <fncall idyll-tool="web:search">
    <content>Search for <variable name="topic" prompt="Main search topic" /></content>
  </fncall>
  
  <!-- Subsequent uses reference the already-resolved value -->
  <fncall idyll-tool="ai:summarize">
    <content>Summarize results about <variable name="topic" /></content>
  </fncall>
</tool:definition>
```

**Rules**:
- First occurrence with a name declares the variable
- The AI interpolation happens only on first declaration
- Subsequent uses reference the resolved value
- Redeclaration (same name, different prompt) is an error
- Variables are scoped to the tool execution context

#### Variable Interpolation Flow

1. **Agent invokes tool** with context:
   ```typescript
   {
     tool: "Search The Web",
     content: "Find information about <mention:topic>AI breakthroughs</mention:topic> from last month"
   }
   ```

2. **System extracts variables** from tool definition:
   - `searchQuery` (prompt: "What to search for")
   - `timeframe` (prompt: "Time period (optional)")
   - `focusArea` (no prompt provided)

3. **AI interpolation** resolves variables using all available context:
   - Parses agent's rich content
   - Considers variable prompts
   - Uses document/execution context
   - Inherits agent personality/context

4. **Execution** proceeds with resolved values:
   - `searchQuery` → "AI breakthroughs"
   - `timeframe` → "last month"
   - `focusArea` → "recent developments and innovations"

#### Context Inheritance

By default, custom tools inherit all context from the invoking agent:
- Agent personality and tone
- Current conversation context
- Document being processed
- Previous tool execution results

This creates a "class/method" pattern where the agent is like a class and tool invocations are method calls that have access to the instance context.

### Design Principles

1. **AI-First**: Variables use natural language prompts, not rigid schemas
2. **Loosely Coupled**: String-based with AI handling type coercion
3. **Progressive Enhancement**: Works with plain text, better with rich mentions
4. **Context-Aware**: Full context inheritance by default
5. **Runtime Resolution**: Variables resolved at execution time, not definition time

### Tool Execution Return Value

When a custom tool executes, the engine returns a complete execution context rather than a single result:

```typescript
interface ToolExecutionContext {
  // All resolved variables
  variables: Map<string, string>;
  
  // All block execution results in order
  blocks: Map<blockId, BlockExecutionResult>;
  
  // Execution metadata
  metadata: {
    toolName: string;
    duration: number;
    blocksExecuted: number;
    blocksSucceeded: number;
    blocksFailed: number;
  };
  
  // The tool definition for reference
  toolDefinition: ToolBlock;
}
```

This structure:
- Can be efficiently stored in a database
- Provides full execution transparency
- Allows the caller to extract what they need
- Maintains complete audit trail

### Subprocess Execution Model (Future)

For agent integration, custom tool execution will use an agentic subprocess pattern:

1. **Main agent** receives request to use custom tool
2. **Subprocess spawned** with isolated context
3. **Subprocess**:
   - Loads necessary resources (e.g., full documents with IDs)
   - Executes the tool in isolation
   - Returns only relevant results
4. **Main agent** continues with subprocess results

Benefits:
- Isolated execution contexts
- No pollution of main conversation thread
- Proper resource loading and ID resolution
- Cost-effective (subprocess context doesn't accumulate in main thread)

**Cost Efficiency Example**: Consider a complex "Research Assistant" tool that makes 10 different web searches, calls multiple AI summarizers, and processes results. If all these inner tool calls were added to the main agent's context:
- Every subsequent user message would include all 10+ tool call histories
- Token costs would compound exponentially in long conversations
- Most of that context would be irrelevant to future interactions

With subprocess isolation:
- The 10+ inner calls happen in the subprocess
- Only the final extracted result returns to main thread
- Main conversation stays lean and focused
- One extra AI call to extract relevant results saves hundreds of redundant tokens

### Implementation Notes

- Variable interpolation should be a core part of the engine
- The system should parse tool definitions to identify variables
- Agents should be informed which variables a tool uses (but not how)
- Variables are essentially "inline content generators" - like inline `ai:generateText` with ambient context
- Future enhancement: optional variable types/schemas for more control

## Tool Naming Conventions

Idyll tools use a `module:function` naming pattern where both parts MUST be valid JavaScript identifiers. This ensures clean, unambiguous transformations when deploying to platforms like Azure Functions.

### Naming Pattern

```
module:function
```

- **Module**: Optional namespace (e.g., `demo`, `ai`, `search`)
- **Function**: Required function name (e.g., `echo`, `analyzeText`)
- **Separator**: Colon (`:`) character

### JavaScript Identifiers Only

All module and function names MUST be valid JavaScript identifiers:

```xml
<fncall idyll-tool="demo:echo" />
<fncall idyll-tool="ai:analyzeText" />
<fncall idyll-tool="search:findDocuments" />
<fncall idyll-tool="webhook:githubPush" />
```

**Invalid** (No Longer Supported):
```xml
<!-- ❌ Kebab-case is NOT allowed -->
<fncall idyll-tool="ai:analyze-text" />
<fncall idyll-tool="data:process-csv" />
```

**Root-Level Functions** (without module namespace):
```xml
<fncall idyll-tool="echo" />
<fncall idyll-tool="processData" />
```

### Azure Functions Transformation

For Azure compatibility, we transform the colon to double hyphens:

| Idyll Format | Azure Format | Notes |
|--------------|--------------|-------|
| `demo:echo` | `demo--echo` | Clean transformation |
| `ai:analyzeText` | `ai--analyzeText` | Unambiguous |
| `echo` | `echo` | No transformation needed |

The double hyphen (`--`) separator is unambiguous because:
1. It's not a valid character in JavaScript identifiers
2. It clearly separates module from function name
3. The transformation is reversible

### Grammar Enforcement

The grammar enforces valid JavaScript identifiers:

```typescript
// Strict JS identifier pattern
pattern: /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/
```

This ensures:
- Clean Azure transformations
- No ambiguity in naming
- Compatibility with JavaScript tooling
- Clear module boundaries

## Open Questions

1. How agent mode execution relates to regular document execution
2. Specific metadata fields needed in execution results
3. Whether execution state needs additional flexibility beyond current design