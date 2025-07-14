# Idyllic Engine Integrations

This directory contains optional integrations for the Idyllic Engine with various third-party tools and editors.

## Available Integrations

### BlockNote Editor (`/blocknote`)

Provides bidirectional conversion between BlockNote editor format and Idyllic AST.

**Installation:**
```typescript
// Instead of importing from main package:
// import { blockNoteToIdyllic } from '@idyllic-labs/idyll-engine';

// Import from integration path:
import { blockNoteToIdyllic, idyllicToBlockNote } from '@idyllic-labs/idyll-engine/integrations/blocknote';
```

**Features:**
- Convert BlockNote blocks to Idyllic nodes
- Convert Idyllic nodes back to BlockNote format
- Supports all BlockNote block types including triggers, function calls, and custom tools
- Preserves rich text formatting and inline elements

## Why Separate Integrations?

The core Idyllic Engine is designed to be editor-agnostic. By separating editor-specific code into optional integrations:

1. **Smaller bundle size** - Only include what you need
2. **No forced dependencies** - Don't need BlockNote? Don't import it
3. **Clean architecture** - Core engine remains focused on document execution
4. **Easier maintenance** - Editor-specific code can evolve independently

## Adding New Integrations

To add support for a new editor or tool:

1. Create a new directory under `/integrations`
2. Add an `index.ts` that exports the integration API
3. Keep all editor-specific types and logic contained
4. Document usage in this README
5. Consider adding example code in `/examples`