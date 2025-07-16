# Using BlockNote ↔ Idyllic Converter Externally

## Installation

First, install the idyll-engine package in your project:

```bash
# Using npm
npm install @idyllic-labs/idyll-engine

# Using bun
bun add @idyllic-labs/idyll-engine

# Or if you've linked it locally
bun link @idyllic-labs/idyll-engine
```

## Basic Usage

```typescript
import { 
  blockNoteToIdyllic, 
  idyllicToBlockNote,
  parseXML,
  serializeToXML,
  applyDiff
} from '@idyllic-labs/idyll-engine';
import type { 
  Block, 
  IdyllDocument, 
  EditOperation 
} from '@idyllic-labs/idyll-engine';

// Your BlockNote blocks from the editor
const blockNoteBlocks = [
  {
    id: '1',
    type: 'heading',
    props: { level: 1 },
    content: [{ type: 'text', text: 'Hello World', styles: {} }],
    children: []
  }
];

// Convert to Idyllic
const idyllicBlocks = blockNoteToIdyllic(blockNoteBlocks);

// Create a document and serialize to XML
const doc: IdyllDocument = {
  id: 'my-doc',
  blocks: idyllicBlocks
};
const xml = serializeToXML(doc);

// Convert back to BlockNote
const backToBlockNote = idyllicToBlockNote(idyllicBlocks);
```

## React/Next.js Integration Example

```tsx
// components/DocumentEditor.tsx
import { useState } from 'react';
import { BlockNoteEditor } from '@blocknote/react';
import { 
  blockNoteToIdyllic, 
  idyllicToBlockNote,
  serializeToXML,
  parseXML,
  applyDiff
} from '@idyllic-labs/idyll-engine';

export function DocumentEditor() {
  const [blocks, setBlocks] = useState([]);

  // Save document as XML
  const handleSave = async () => {
    const idyllicBlocks = blockNoteToIdyllic(blocks);
    const doc = {
      id: 'doc-1',
      blocks: idyllicBlocks,
      metadata: { 
        created: new Date(),
        version: '1.0'
      }
    };
    
    const xml = serializeToXML(doc);
    
    // Send to your API
    await fetch('/api/documents', {
      method: 'POST',
      body: xml,
      headers: { 'Content-Type': 'application/xml' }
    });
  };

  // Load document from XML
  const handleLoad = async (docId: string) => {
    const response = await fetch(`/api/documents/${docId}`);
    const xml = await response.text();
    
    const doc = parseXML(xml);
    const blockNoteBlocks = idyllicToBlockNote(doc.blocks);
    setBlocks(blockNoteBlocks);
  };

  // Apply collaborative edits
  const handleApplyEdits = (operations: EditOperation[]) => {
    const idyllicBlocks = blockNoteToIdyllic(blocks);
    const result = applyDiff(idyllicBlocks, operations);
    
    if (result.success && result.blocks) {
      const updated = idyllicToBlockNote(result.blocks);
      setBlocks(updated);
    }
  };

  return (
    <BlockNoteEditor
      blocks={blocks}
      onChange={setBlocks}
    />
  );
}
```

## Node.js API Example

```typescript
// server/document-service.ts
import { 
  blockNoteToIdyllic,
  idyllicToBlockNote,
  parseXML,
  serializeToXML,
  applyDiff,
  DocumentExecutor,
  createToolRegistry
} from '@idyllic-labs/idyll-engine';

class DocumentService {
  // Convert and store BlockNote document
  async saveDocument(blockNoteData: any[]) {
    const idyllicBlocks = blockNoteToIdyllic(blockNoteData);
    
    const doc = {
      id: generateId(),
      blocks: idyllicBlocks,
      metadata: {
        created: new Date(),
        version: '1.0'
      }
    };
    
    const xml = serializeToXML(doc);
    
    // Store in database
    await db.documents.create({
      id: doc.id,
      content: xml,
      format: 'idyllic-xml'
    });
    
    return doc.id;
  }

  // Load and convert to BlockNote
  async loadForEditor(docId: string) {
    const record = await db.documents.findById(docId);
    const doc = parseXML(record.content);
    
    return idyllicToBlockNote(doc.blocks);
  }

  // Execute document (if it has triggers/functions)
  async executeDocument(docId: string) {
    const record = await db.documents.findById(docId);
    const doc = parseXML(record.content);
    
    const executor = new DocumentExecutor({
      document: doc,
      tools: createToolRegistry({
        // Your custom tools
      })
    });
    
    return await executor.execute();
  }

  // Apply collaborative edits
  async applyEdits(docId: string, operations: EditOperation[]) {
    const record = await db.documents.findById(docId);
    const doc = parseXML(record.content);
    
    const result = applyDiff(doc.blocks, operations);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    // Save updated document
    doc.blocks = result.blocks!;
    const updatedXml = serializeToXML(doc);
    
    await db.documents.update(docId, {
      content: updatedXml,
      modified: new Date()
    });
    
    // Return BlockNote format for editor
    return idyllicToBlockNote(result.blocks!);
  }
}
```

## Remix Action Example

```typescript
// app/routes/documents.$id.tsx
import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { 
  blockNoteToIdyllic,
  idyllicToBlockNote,
  parseXML,
  serializeToXML,
  applyDiff
} from '@idyllic-labs/idyll-engine';

export async function action({ request, params }: ActionFunctionArgs) {
  const { id } = params;
  const formData = await request.formData();
  const action = formData.get('action');

  switch (action) {
    case 'save': {
      const blocks = JSON.parse(formData.get('blocks') as string);
      const idyllicBlocks = blockNoteToIdyllic(blocks);
      
      const doc = {
        id,
        blocks: idyllicBlocks,
        metadata: { 
          modified: new Date() 
        }
      };
      
      const xml = serializeToXML(doc);
      await saveToDatabase(id, xml);
      
      return json({ success: true });
    }

    case 'load': {
      const xml = await loadFromDatabase(id);
      const doc = parseXML(xml);
      const blocks = idyllicToBlockNote(doc.blocks);
      
      return json({ blocks });
    }

    case 'apply-diff': {
      const operations = JSON.parse(formData.get('operations') as string);
      const xml = await loadFromDatabase(id);
      const doc = parseXML(xml);
      
      const result = applyDiff(doc.blocks, operations);
      
      if (result.success && result.blocks) {
        doc.blocks = result.blocks;
        await saveToDatabase(id, serializeToXML(doc));
        
        const updatedBlocks = idyllicToBlockNote(result.blocks);
        return json({ blocks: updatedBlocks });
      }
      
      return json({ error: result.error }, { status: 400 });
    }
  }
}
```

## Type Safety

```typescript
// types.ts
import type { 
  Block as IdyllicBlock,
  EditOperation,
  DiffResult
} from '@idyllic-labs/idyll-engine';

// Define your BlockNote types
interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, any>;
  content: Array<{
    type: string;
    text?: string;
    styles?: Record<string, boolean>;
  }>;
  children: BlockNoteBlock[];
}

// Type-safe converter wrapper
export class DocumentConverter {
  static toIdyllic(blocks: BlockNoteBlock[]): IdyllicBlock[] {
    return blockNoteToIdyllic(blocks);
  }

  static toBlockNote(blocks: IdyllicBlock[]): BlockNoteBlock[] {
    return idyllicToBlockNote(blocks);
  }

  static applyEdits(
    blocks: BlockNoteBlock[], 
    ops: EditOperation[]
  ): { success: boolean; blocks?: BlockNoteBlock[]; error?: string } {
    const idyllic = blockNoteToIdyllic(blocks);
    const result = applyDiff(idyllic, ops);
    
    if (result.success && result.blocks) {
      return {
        success: true,
        blocks: idyllicToBlockNote(result.blocks)
      };
    }
    
    return { success: false, error: result.error };
  }
}
```

## Common Patterns

### 1. Auto-save with Debouncing
```typescript
const debouncedSave = useMemo(
  () => debounce(async (blocks: BlockNoteBlock[]) => {
    const idyllic = blockNoteToIdyllic(blocks);
    const xml = serializeToXML({ id: docId, blocks: idyllic });
    await saveDocument(xml);
  }, 1000),
  [docId]
);
```

### 2. Collaborative Editing
```typescript
// Listen for edits from other users
socket.on('document:edit', (operations: EditOperation[]) => {
  const idyllic = blockNoteToIdyllic(currentBlocks);
  const result = applyDiff(idyllic, operations);
  
  if (result.success && result.blocks) {
    const updated = idyllicToBlockNote(result.blocks);
    setBlocks(updated);
  }
});
```

### 3. Version History
```typescript
// Save each version as XML
const saveVersion = async (blocks: BlockNoteBlock[], message: string) => {
  const idyllic = blockNoteToIdyllic(blocks);
  const xml = serializeToXML({ 
    id: docId, 
    blocks: idyllic,
    metadata: { version: Date.now(), message }
  });
  
  await db.versions.create({
    documentId: docId,
    content: xml,
    message,
    timestamp: new Date()
  });
};
```

## Error Handling

```typescript
try {
  const idyllicBlocks = blockNoteToIdyllic(blocks);
  const xml = serializeToXML({ id: 'doc', blocks: idyllicBlocks });
  // Process XML...
} catch (error) {
  console.error('Conversion failed:', error);
  // Handle gracefully - maybe show user an error
}
```

## Testing

```typescript
import { blockNoteToIdyllic, idyllicToBlockNote } from '@idyllic-labs/idyll-engine';

describe('Document Conversion', () => {
  it('should round-trip without data loss', () => {
    const original = [
      {
        id: '1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Test', styles: {} }],
        children: []
      }
    ];
    
    const idyllic = blockNoteToIdyllic(original);
    const roundTrip = idyllicToBlockNote(idyllic);
    
    expect(roundTrip).toEqual(original);
  });
});
```