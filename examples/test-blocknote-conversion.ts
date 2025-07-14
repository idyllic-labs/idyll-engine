#!/usr/bin/env bun
/**
 * Test the BlockNote to Idyllic conversion with the kitchen sink document
 */

import { readFile, writeFile } from 'fs/promises';
import { blockNoteToIdyllic, idyllicToBlockNote, testIsomorphism } from '../integrations/blocknote';
import { serializeToXML } from '../document/parser-grammar';
import type { IdyllDocument } from '../document/ast';

async function main() {
  console.log('🔄 Testing BlockNote ↔ Idyllic Conversion\n');

  // Load the kitchen sink BlockNote document
  const blockNoteJson = await readFile('./examples/kitchen-sink-blocknote.json', 'utf-8');
  const blockNoteBlocks = JSON.parse(blockNoteJson);

  console.log(`📥 Loaded ${blockNoteBlocks.length} BlockNote blocks`);

  // Convert to Idyllic
  console.log('\n→ Converting to Idyllic...');
  const idyllicBlocks = blockNoteToIdyllic(blockNoteBlocks);
  console.log(`✅ Created ${idyllicBlocks.length} Idyllic blocks`);

  // Create an Idyllic document
  const idyllicDoc: IdyllDocument = {
    id: 'kitchen-sink',
    blocks: idyllicBlocks,
    metadata: {
      created: new Date(),
      version: '1.0',
      source: 'blocknote-converter'
    }
  };

  // Serialize to XML
  const xml = serializeToXML(idyllicDoc);
  await writeFile('./examples/kitchen-sink-idyllic.xml', xml);
  console.log('📄 Saved Idyllic XML to examples/kitchen-sink-idyllic.xml');

  // Test round-trip conversion
  console.log('\n↔️  Testing round-trip conversion...');
  const roundTripped = idyllicToBlockNote(idyllicBlocks);
  console.log(`✅ Converted back to ${roundTripped.length} BlockNote blocks`);

  // Save the round-tripped version
  await writeFile(
    './examples/kitchen-sink-roundtrip.json', 
    JSON.stringify(roundTripped, null, 2)
  );
  console.log('📄 Saved round-trip to examples/kitchen-sink-roundtrip.json');

  // Test isomorphism
  console.log('\n🔍 Testing isomorphism...');
  const { isIsomorphic, differences } = testIsomorphism(blockNoteBlocks);
  
  if (isIsomorphic) {
    console.log('✅ Conversion is isomorphic!');
  } else {
    console.log('❌ Conversion has differences:');
    differences?.forEach(diff => console.log(`  - ${diff}`));
  }

  // Print some statistics
  console.log('\n📊 Conversion Statistics:');
  
  // Count block types
  const blockTypeCounts: Record<string, number> = {};
  blockNoteBlocks.forEach((block: any) => {
    blockTypeCounts[block.type] = (blockTypeCounts[block.type] || 0) + 1;
  });
  
  console.log('\nBlock types found:');
  Object.entries(blockTypeCounts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Check for nested structures
  let maxDepth = 0;
  function checkDepth(blocks: any[], depth: number = 0) {
    maxDepth = Math.max(maxDepth, depth);
    blocks.forEach((block: any) => {
      if (block.children && block.children.length > 0) {
        checkDepth(block.children, depth + 1);
      }
    });
  }
  checkDepth(blockNoteBlocks);
  console.log(`\nMax nesting depth: ${maxDepth}`);

  // Check content types
  const contentTypes = new Set<string>();
  function collectContentTypes(blocks: any[]) {
    blocks.forEach((block: any) => {
      if (Array.isArray(block.content)) {
        block.content.forEach((item: any) => {
          contentTypes.add(item.type);
        });
      }
      if (block.children) {
        collectContentTypes(block.children);
      }
    });
  }
  collectContentTypes(blockNoteBlocks);
  console.log(`\nContent types found: ${Array.from(contentTypes).join(', ')}`);

  console.log('\n✅ Conversion test complete!');
}

main().catch(console.error);