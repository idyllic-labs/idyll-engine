#!/usr/bin/env bun
/**
 * Test the BlockNote to Idyllic conversion with functionCall blocks and empty content
 */

import { blockNoteToIdyllic, idyllicToBlockNote } from '../document/blocknote-converter';
import type { BlockNoteBlock } from '../document/blocknote-converter';

async function main() {
  console.log('🔄 Testing functionCall block with empty content\n');

  // Test case: functionCall block with empty content array
  const testBlocks: BlockNoteBlock[] = [
    {
      id: 'test-function-1',
      type: 'functionCall',
      props: {
        tool: 'ai:generateText',
        params: '{"prompt": "Hello world"}',
        response: '',
        error: '',
        modelId: 'gpt-4'
      },
      content: [
        { type: 'text', text: 'Generate greeting', styles: {} }
      ],
      children: []
    },
    {
      id: 'empty-paragraph-1',
      type: 'paragraph',
      props: {
        textColor: 'default',
        textAlignment: 'left',
        backgroundColor: 'default'
      },
      content: [], // Empty content array - this was causing the issue
      children: []
    },
    {
      id: 'test-function-2',
      type: 'functionCall',
      props: {
        tool: 'data:fetch',
        params: '{}',
        response: '',
        error: '',
        modelId: ''
      },
      content: [], // Empty content array in functionCall
      children: []
    }
  ];

  console.log('📥 Testing with:', testBlocks.length, 'blocks');
  console.log('- 2 functionCall blocks (one with content, one without)');
  console.log('- 1 empty paragraph block\n');

  // Convert to Idyllic
  console.log('→ Converting to Idyllic...');
  const idyllicBlocks = blockNoteToIdyllic(testBlocks);
  console.log('✅ Created', idyllicBlocks.length, 'Idyllic blocks');

  // Convert back to BlockNote
  console.log('\n↔️  Converting back to BlockNote...');
  const roundTripped = idyllicToBlockNote(idyllicBlocks);
  console.log('✅ Converted back to', roundTripped.length, 'BlockNote blocks');

  // Verify empty content arrays are handled
  console.log('\n🔍 Verifying content arrays:');
  roundTripped.forEach((block, index) => {
    const hasContent = Array.isArray(block.content) && block.content.length > 0;
    console.log(`  Block ${index + 1} (${block.type}): ${hasContent ? 'has content' : 'EMPTY (should have been fixed)'}`);
    
    if (!hasContent) {
      console.error('❌ ERROR: Block still has empty content array!');
      console.error('Block details:', JSON.stringify(block, null, 2));
      console.error('\nIdyllic block was:', JSON.stringify(idyllicBlocks[index], null, 2));
      process.exit(1);
    }
  });

  console.log('\n✅ All blocks have valid content arrays!');
  
  // Print the round-tripped blocks
  console.log('\n📄 Round-tripped blocks:');
  console.log(JSON.stringify(roundTripped, null, 2));
}

main().catch(console.error);