# Changelog

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