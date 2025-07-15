# Changelog

## [4.0.0] - 2025-07-15

### 💥 BREAKING: Tool → Function Terminology Refactor

This major release completes the terminology refactor from "tools" to "functions" throughout the codebase, establishing a clear separation between Idyll document functions and AI agent tools.

#### Breaking Changes

**🔥 All Tool-related APIs Renamed:**
- `createToolRegistry()` → `createFunctionRegistry()`
- `defineFunction()` replaces `defineTool()`
- `ToolDefinition` → `FunctionDefinition`
- `ToolExecutor` → `FunctionExecutor`
- `ToolResult` → `FunctionResult`
- `ToolRegistry` → `FunctionRegistry`
- `validateToolName()` → `validateFunctionName()`
- `toAzureToolName()` → `toAzureFunctionName()`
- `fromAzureToolName()` → `fromAzureFunctionName()`

**📁 File Renames:**
- `document/tool-registry.ts` → `document/function-registry.ts`
- `document/tool-naming.ts` → `document/function-naming.ts`
- `document/custom-tool-executor.ts` → `document/custom-function-executor.ts`
- `agent/custom-tools.ts` → `agent/custom-functions.ts`

**🏷️ XML Attribute Changes:**
- `<fncall idyll-tool="...">` → `<fncall idyll-fn="...">`
- `<tool>` blocks → `<function>` blocks
- `<tool:description>` → `<function:description>`
- `<tool:definition>` → `<function:definition>`

**🔧 AST Changes:**
- `ExecutableNode.function` → `ExecutableNode.fn` (avoids JS keyword conflict)
- All references to `.function` property now use `.fn`

#### Conceptual Separation

**Functions** (Idyll Document Level):
- Executable units within documents
- Defined with `defineFunction()` and registered in `FunctionRegistry`
- Called via `<fncall idyll-fn="...">` blocks
- Pure document execution concept

**Tools** (AI Agent Level):
- AI model capabilities exposed through Vercel AI SDK
- Functions are converted TO tools for AI agents
- Agent system uses "tools" terminology for AI SDK compatibility
- Clear adapter pattern: functions → tools for agents

#### Migration Guide

1. **Update imports:**
   ```typescript
   // Before
   import { createToolRegistry, defineTool } from '@idyllic/idyll-engine';
   
   // After
   import { createFunctionRegistry, defineFunction } from '@idyllic/idyll-engine';
   ```

2. **Update function definitions:**
   ```typescript
   // Before
   const tools = createToolRegistry({
     'demo:echo': defineTool({ ... })
   });
   
   // After
   const functions = createFunctionRegistry({
     'demo:echo': defineFunction({ ... })
   });
   ```

3. **Update XML attributes:**
   ```xml
   <!-- Before -->
   <fncall idyll-tool="demo:echo">
   
   <!-- After -->
   <fncall idyll-fn="demo:echo">
   ```

4. **Update custom function blocks:**
   ```xml
   <!-- Before -->
   <tool title="My Tool">
     <tool:description>...</tool:description>
     <tool:definition>...</tool:definition>
   </tool>
   
   <!-- After -->
   <function title="My Function">
     <function:description>...</function:description>
     <function:definition>...</function:definition>
   </function>
   ```

5. **Update AST property access:**
   ```typescript
   // Before
   if (node.type === 'function_call') {
     console.log(node.function);
   }
   
   // After
   if (node.type === 'function_call') {
     console.log(node.fn);
   }
   ```

#### Why This Change?

The terminology was causing confusion between:
- Document-level executable functions (what we call)
- AI-level tool calling (how agents interact)

This refactor creates a clean separation where "functions" are the pure concept in Idyll documents, and "tools" are specifically the AI agent capability exposed through the Vercel AI SDK.

## [3.1.0] - 2025-07-14

### ✨ Features

**Unified Content Field:**
- **BREAKING**: ExecutableNode now uses `content` field instead of `instructions` for consistency with ContentNode
- `edit:content` operation now works uniformly on both ContentNode and ExecutableNode types

**Content Trimming:**
- Automatic whitespace trimming in `edit:content` operations
- Empty text items are removed after trimming
- Rich content elements (variables, mentions, etc.) are preserved

**Cleaner XML Serialization:**
- Default prop values are now filtered out during serialization (e.g., `textColor="default"`)
- Significantly reduces XML verbosity and file size
- Only non-default, meaningful props are included in output

**Improved Error Handling:**
- More robust handling of null/undefined content items
- Better validation for variable elements
- Defensive programming for edge cases

### 🐛 Bug Fixes

- Fixed `edit:content` to work on ExecutableNode (trigger/function_call blocks)
- Fixed test failures related to `instructions` → `content` migration
- Fixed TypeScript errors in blocknote converter

### 🔧 Internal Improvements

- Consistent API across all node types
- Better code maintainability with unified content handling
- Comprehensive test coverage for all new features

## [3.0.0] - 2025-07-14

### 💥 BREAKING: Complete API Cleanup - Backward Compatibility Removed

**All backward compatibility has been removed as requested. This is a major breaking release that requires migration.**

#### Breaking Changes

**🔥 Backward Compatibility Removed:**
- Removed all `Block*` type aliases (`Block`, `ContentBlock`, `ExecutableBlock`)
- Removed deprecated function exports (`parseXML`, `serializeToXML`)
- Removed deprecated function names (`isContentBlock`, `isExecutableBlock`, `traverseBlocks`, etc.)
- Removed `DiffResultCompat` interface with dual `.blocks`/`.nodes` support
- Removed `IdyllDocumentCompat` interface

**📝 Required Migration:**
```typescript
// Before (❌ No longer works)
import { Block, ContentBlock, parseXML, isContentBlock } from '@idyllic-labs/idyll-engine';
const doc = parseXML(xml);
const blocks = doc.blocks;
if (isContentBlock(block)) { /* ... */ }

// After (✅ New API)
import { Node, ContentNode, parseXmlToAst, isContentNode } from '@idyllic-labs/idyll-engine';
const doc = parseXmlToAst(xml);
const nodes = doc.nodes;
if (isContentNode(node)) { /* ... */ }
```

**🏗️ Diff Operations Cleaned:**
- Removed all `(op as any).nodeId || (op as any).blockId` fallback code
- Operations now use `op.blockId` directly (consistent with targeting block-level elements)
- Error messages updated to use "Block not found" for diff operations
- `DiffResult` now returns only `.nodes` property (no `.blocks` compatibility)

**📊 Execution Metadata Updates:**
- `blocksExecuted` → `nodesExecuted`
- `blocksSucceeded` → `nodesSucceeded` 
- `blocksFailed` → `nodesFailed`
- `result.blocks` → `result.nodes` in execution results

**🎯 Consistent Terminology:**
- AST elements: "nodes" (Node, ContentNode, ExecutableNode)
- Diff targets: "blocks" (blockId in operations - they target block-level elements)
- Document structure: `.nodes` property everywhere
- Functions: `traverseNodes`, `isContentNode`, etc.

#### What Stayed the Same

**✅ Edit Operations Still Use blockId:**
- `EditAttrOperation.blockId`, `DeleteOperation.blockId`, etc.
- This is correct - they target block-level elements in the document
- XML attributes remain `block-id="..."` for consistency

**✅ Core Functionality Unchanged:**
- Same parsing and serialization capabilities
- Same diff operation types and behavior
- Same agent system functionality
- Same function execution system

#### Migration Guide

1. **Update Type Imports:**
   - `Block` → `Node`
   - `ContentBlock` → `ContentNode` 
   - `ExecutableBlock` → `ExecutableNode`

2. **Update Function Calls:**
   - `parseXML()` → `parseXmlToAst()`
   - `serializeToXML()` → `serializeAstToXml()`
   - `isContentBlock()` → `isContentNode()`
   - `isExecutableBlock()` → `isExecutableNode()`
   - `traverseBlocks()` → `traverseNodes()`

3. **Update Property Access:**
   - `document.blocks` → `document.nodes`
   - `result.blocks` → `result.nodes`

4. **Update Execution Metadata:**
   - `metadata.blocksExecuted` → `metadata.nodesExecuted`
   - `metadata.blocksSucceeded` → `metadata.nodesSucceeded`
   - `metadata.blocksFailed` → `metadata.nodesFailed`

#### Test Results
- ✅ All 21 tests passing after migration
- ✅ Complete backward compatibility removal successful
- ✅ API is now clean and consistent

---

## [2.1.0] - 2025-07-14

### Changed

- **BlockNote integration is now optional** - Moved to `integrations/blocknote`
  - Core engine is now editor-agnostic
  - Import from `@idyllic-labs/idyll-engine/integrations/blocknote` instead of main package
  - Reduces bundle size for users who don't need BlockNote
  - No breaking changes for existing imports if using the integration path

### Project Structure

- Created `/integrations` directory for optional third-party integrations
- BlockNote converter moved from `/document/blocknote-converter.ts` to `/integrations/blocknote/converter.ts`
- Added documentation for integration architecture

## [0.2.0] - 2025-07-14

### 🔄 Comprehensive Block→Node Terminology Refactoring

**All references to "block" have been systematically updated to "node" throughout the codebase to align with modern AST conventions.**

#### Breaking Changes

**Type Renames:**
- `Block` → `Node` (with backward compatibility alias)
- `ContentBlock` → `ContentNode`
- `ExecutableBlock` → `ExecutableNode`
- `BlockExecutionResult` → `NodeExecutionResult`
- `BlockExecutionContext` → `NodeExecutionContext`
- `ContentBlockType` → `ContentNodeType`
- `ExecutableBlockType` → `ExecutableNodeType`

**Property Renames:**
- `IdyllDocument.blocks` → `IdyllDocument.nodes`
- `AgentDocument.blocks` → `AgentDocument.nodes`
- Edit operations: `blockId` → `nodeId`
- Insert operations: `afterBlockId` → `afterNodeId`, `beforeBlockId` → `beforeNodeId`
- Execution metadata: `blocksExecuted` → `nodesExecuted`, etc.

**Function Renames:**
- `isContentBlock()` → `isContentNode()`
- `isExecutableBlock()` → `isExecutableNode()`
- `traverseBlocks()` → `traverseNodes()`
- `findBlock()` → `findNode()`
- `getExecutableBlocks()` → `getExecutableNodes()`

#### Backward Compatibility

Most types have backward compatibility aliases to ease migration:
- `type Block = Node`
- `type ContentBlock = ContentNode`
- `type ExecutableBlock = ExecutableNode`
- `type BlockExecutionContext = NodeExecutionContext`

Legacy functions are also provided that delegate to new implementations.

#### Migration Guide

1. Update imports to use new type names
2. Update property accesses from `.blocks` to `.nodes`
3. Update function calls to use new names
4. For edit operations, update field names from `blockId` to `nodeId`

## [2.0.0] - 2025-07-13

### 🚀 Complete API Redesign - Breaking Changes

**The Agent API has been completely redesigned for elegance and conceptual clarity.**

#### New Elegant API

```typescript
// v2.0.0 - Clean and conceptually clear
const agent = new Agent({
  program: AgentDefinition,  // The agent program
  model: LanguageModel,      // AI runtime  
  tools: ToolRegistry       // Tool runtime
});
```

#### What Changed

**REMOVED (Breaking Changes):**
- ❌ All legacy constructor options (`agentId`, `agentName`, `memoryLimit`, `document`, `systemPrompt`)
- ❌ Factory methods (`Agent.fromXML`, `Agent.fromBlocks`)
- ❌ Functional API (`executeChat`, `executeChatStream`)
- ❌ Backward compatibility with v1.x APIs

**NEW:**
- ✅ `program: AgentDefinition` - The parsed AST of an `<agent>` document
- ✅ `model: LanguageModel` - AI model instance (not string ID)
- ✅ `tools: ToolRegistry` - Tool registry for execution
- ✅ Perfect conceptual separation: program (what) vs runtime (how)

### Fixed

- Updated all tests to work with new v2.0.0 API
- DocumentExecutor now uses ExecutionReport with blocks Map and metadata
- CLI fully compatible with new Agent constructor

#### Migration from v1.x

**Before (v1.x):**

```typescript
const agent = new Agent({
  document: agentDoc,           // or systemPrompt: xmlString
  agentId: 'my-agent',         // Platform concern
  agentName: 'Assistant',      // Platform concern  
  model: 'gpt-4',              // String ID
  tools: toolRegistry,
  memoryLimit: 100,            // Platform concern
});
```

**After (v2.0.0):**

```typescript
import { parseXML } from '@idyllic-labs/idyll-engine';
import { openai } from '@ai-sdk/openai';

const program = parseXML('<agent>...</agent>');
const model = openai('gpt-4');

const agent = new Agent({
  program,  // What the agent does
  model,    // AI runtime
  tools,    // Tool runtime
});
```

#### Philosophy

v2.0.0 optimizes for:

- **Elegance over compatibility** - Clean break for perfect API
- **Conceptual clarity** - Program vs runtime separation
- **Cognitive consistency** - No redundant or confusing fields
- **Simplicity** - Just the essentials, nothing more

#### Breaking Change Rationale

This is a major version bump because:

1. All v1.x Agent constructor calls will break
2. API surface area significantly reduced
3. Conceptual model changed (program + runtime)
4. No migration path - clean rewrite required

---

## [1.1.0] - 2025-07-13

### Added

- New clean Agent API alongside legacy API
- Deprecation warnings for legacy usage
- Functional API for stateless execution

### Deprecated

- Legacy Agent constructor with platform concerns

---

## [1.0.1] - 2025-07-13

### Changed

- Agent API now requires external model providers
- Removed internal AI SDK dependencies

---

## [1.0.0] - 2025-07-13

### Initial Release

- Initial stable release
- Agent system with model provider support
- Document execution engine
- Tool registry system
- BlockNote converter