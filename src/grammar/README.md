# Grammar System

This directory contains the reorganized grammar system for Idyllic Engine, providing a clean separation of concerns and improved maintainability.

## Directory Structure

```
grammar/
├── core/                    # Core DSL and compilation logic
│   ├── dsl.ts              # Grammar DSL types and builder functions
│   ├── compiler.ts         # Grammar compiler (validation, type generation)
│   └── index.ts            # Core exports
├── schemas/                 # Grammar definitions by document type
│   ├── document.ts         # Content document grammar rules
│   ├── agent.ts            # Agent system prompt grammar rules  
│   ├── diff.ts             # Document diff operation grammar rules
│   └── index.ts            # Combined schema exports
└── index.ts                # Main grammar system export
```

## Architecture

### Core (`./core/`)
Contains the fundamental grammar DSL and compilation infrastructure:
- **`dsl.ts`**: Core grammar rule types (`terminal`, `sequence`, `choice`, etc.) and builder functions
- **`compiler.ts`**: Transforms grammar definitions into validation functions and type mappings

### Schemas (`./schemas/`)
Contains actual grammar definitions for different document types:
- **`document.ts`**: Defines content blocks (paragraphs, headings, functions, etc.) and rich text elements
- **`agent.ts`**: Defines agent document structure for system prompts
- **`diff.ts`**: Defines edit operations for document transformations

## Usage

### Basic Usage
```typescript
import { GRAMMAR } from './grammar';
// Access combined grammar rules from all schemas
```

### Advanced Usage
```typescript
import { GrammarCompiler } from './grammar/core/compiler';
import { DOCUMENT_GRAMMAR } from './grammar/schemas/document';

const compiler = new GrammarCompiler(DOCUMENT_GRAMMAR);
const compiled = compiler.compile();
```

### Schema-Specific Usage
```typescript
import { DOCUMENT_GRAMMAR } from './grammar/schemas/document';
import { AGENT_GRAMMAR } from './grammar/schemas/agent';
import { DIFF_GRAMMAR } from './grammar/schemas/diff';
```

## Migration from Old Structure

The grammar system was reorganized from:
```
document/grammars/ → grammar/schemas/
document/grammar-dsl.ts → grammar/core/dsl.ts  
document/grammar-compiler.ts → grammar/core/compiler.ts
```

Legacy imports are still supported through re-exports in `document/grammar.ts`.

## Features

- **Type Safety**: Full TypeScript integration with AST type generation
- **Validation**: Runtime validation of document structure and attributes
- **Modularity**: Clean separation between DSL, compilation, and schema definitions
- **Extensibility**: Easy to add new document types and validation rules
- **Performance**: Compiled validation functions for fast runtime checking

## Development

When adding new grammar rules:
1. Define rules in the appropriate schema file (`schemas/*.ts`)
2. Use the DSL builder functions from `core/dsl.ts`
3. Reference shared rules using `ref()` for cross-schema dependencies
4. Test with the grammar compiler to ensure proper validation

The grammar system supports complex validation including:
- Attribute validation with custom validators
- Content type constraints (text, rich text, JSON, none)
- Cross-reference validation between grammar rules
- Hierarchical block structures with proper nesting rules