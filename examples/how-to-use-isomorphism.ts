#!/usr/bin/env bun
/**
 * How to use the BlockNote ↔ Idyllic isomorphism
 */

import { blockNoteToIdyllic, idyllicToBlockNote } from '../document/blocknote-converter';
import { serializeToXML, parseXML } from '../document/parser-grammar';
import { applyDiff } from '../document/diff-applier';
import type { Block, EditOperation, IdyllDocument } from '../document/ast';

// Example 1: Convert BlockNote → Idyllic XML
console.log('📝 Example 1: BlockNote → Idyllic XML\n');

const blockNoteDoc = [
  {
    id: '1',
    type: 'heading',
    props: { level: 1 },
    content: [{ type: 'text', text: 'My Document', styles: {} }],
    children: []
  },
  {
    id: '2',
    type: 'paragraph',
    props: {},
    content: [
      { type: 'text', text: 'Hello ', styles: {} },
      { type: 'text', text: 'world', styles: { bold: true } },
      { type: 'text', text: '!', styles: {} }
    ],
    children: []
  }
];

// Convert to Idyllic blocks
const idyllicBlocks = blockNoteToIdyllic(blockNoteDoc);
console.log('Idyllic blocks:', JSON.stringify(idyllicBlocks, null, 2));

// Create document and serialize to XML
const idyllicDoc: IdyllDocument = {
  id: 'example-doc',
  blocks: idyllicBlocks
};

const xml = serializeToXML(idyllicDoc);
console.log('\nGenerated XML:');
console.log(xml);

// Example 2: Idyllic XML → BlockNote
console.log('\n\n📝 Example 2: Idyllic XML → BlockNote\n');

const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<document id="test">
  <h1>Test Document</h1>
  <p>This is a <strong>test</strong> paragraph.</p>
  <bulletlistitem>Item 1</bulletlistitem>
  <bulletlistitem>Item 2</bulletlistitem>
</document>`;

// Parse XML to Idyllic document
const parsedDoc = parseXML(xmlString) as IdyllDocument;
console.log('Parsed blocks:', parsedDoc.blocks.length);

// Convert to BlockNote
const blockNoteBlocks = idyllicToBlockNote(parsedDoc.blocks);
console.log('\nBlockNote format:');
console.log(JSON.stringify(blockNoteBlocks, null, 2));

// Example 3: Edit workflow
console.log('\n\n📝 Example 3: Edit Workflow (BlockNote → Edit → BlockNote)\n');

// Start with BlockNote document
const originalBlockNote = [
  {
    id: 'para1',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Original text', styles: {} }],
    children: []
  }
];

// Convert to Idyllic for editing
const editableBlocks = blockNoteToIdyllic(originalBlockNote);

// Apply some edits using diff operations
const editOps: EditOperation[] = [
  {
    type: 'edit:content',
    blockId: 'para1',
    content: [
      { type: 'text', text: 'Updated ' },
      { type: 'text', text: 'text', styles: ['bold'] },
      { type: 'text', text: ' with ' },
      { type: 'text', text: 'styles', styles: ['italic'] }
    ]
  },
  {
    type: 'insert',
    afterBlockId: 'para1',
    blocks: [{
      id: 'new1',
      type: 'paragraph',
      content: [{ type: 'text', text: 'Added paragraph' }]
    } as Block]
  }
];

// Apply the edits
const editResult = applyDiff(editableBlocks, editOps);
if (editResult.success && editResult.blocks) {
  console.log('Edits applied successfully!');
  
  // Convert back to BlockNote
  const updatedBlockNote = idyllicToBlockNote(editResult.blocks);
  console.log('\nUpdated BlockNote document:');
  console.log(JSON.stringify(updatedBlockNote, null, 2));
}

// Example 4: Practical use case - Rich text editor integration
console.log('\n\n📝 Example 4: Rich Text Editor Integration\n');

class DocumentConverter {
  // Convert from BlockNote editor to storable XML
  static toXML(blockNoteBlocks: any[]): string {
    const idyllicBlocks = blockNoteToIdyllic(blockNoteBlocks);
    const doc: IdyllDocument = {
      id: crypto.randomUUID(),
      blocks: idyllicBlocks,
      metadata: {
        created: new Date(),
        version: '1.0'
      }
    };
    return serializeToXML(doc);
  }

  // Load XML and convert to BlockNote for editor
  static fromXML(xml: string): any[] {
    const doc = parseXML(xml) as IdyllDocument;
    return idyllicToBlockNote(doc.blocks);
  }

  // Apply server-side edits and return updated BlockNote blocks
  static applyEdits(blockNoteBlocks: any[], operations: EditOperation[]): any[] {
    // Convert to Idyllic
    const idyllicBlocks = blockNoteToIdyllic(blockNoteBlocks);
    
    // Apply edits
    const result = applyDiff(idyllicBlocks, operations);
    
    if (!result.success || !result.blocks) {
      throw new Error(result.error || 'Edit failed');
    }
    
    // Convert back
    return idyllicToBlockNote(result.blocks);
  }
}

// Demonstrate the class
const editorBlocks = [
  {
    id: 'title',
    type: 'heading',
    props: { level: 1 },
    content: [{ type: 'text', text: 'My Blog Post', styles: {} }],
    children: []
  }
];

// Save to database
const xmlToStore = DocumentConverter.toXML(editorBlocks);
console.log('XML to store in database:');
console.log(xmlToStore);

// Load from database
const loadedBlocks = DocumentConverter.fromXML(xmlToStore);
console.log('\nLoaded back to editor:', loadedBlocks.length, 'blocks');

// Apply collaborative edit
const editedBlocks = DocumentConverter.applyEdits(loadedBlocks, [
  {
    type: 'edit:attr',
    blockId: 'title',
    name: 'level',
    value: '2'
  }
]);
console.log('After edit - heading level:', editedBlocks[0].props.level);

console.log('\n✅ All examples complete!');