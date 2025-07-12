#!/usr/bin/env bun
/**
 * Quick test script for the new diff implementation
 */

import { applyDiff } from '../document/diff-applier';
import type { Block, EditOperation, ContentBlock, ExecutableBlock } from '../document/ast';
import { isContentBlock, isExecutableBlock } from '../document/ast';

// Sample document blocks
const sampleBlocks: Block[] = [
  {
    id: 'block1',
    type: 'paragraph',
    content: [{ type: 'text', text: 'Hello world' }],
    props: { className: 'intro' }
  } as ContentBlock,
  {
    id: 'block2', 
    type: 'heading',
    content: [{ type: 'text', text: 'Section 1' }],
    props: { level: 2 }
  } as ContentBlock,
  {
    id: 'fn1',
    type: 'function_call',
    tool: 'demo:echo',
    parameters: { message: 'original message' },
    instructions: [{ type: 'text', text: 'Echo this message' }]
  } as ExecutableBlock
];

console.log('🧪 Testing Diff Implementation\n');

// Test 1: Edit attribute
console.log('Test 1: Edit Attribute');
const editAttrOp: EditOperation = {
  type: 'edit:attr',
  blockId: 'block1',
  name: 'className',
  value: 'updated-intro'
};

const result1 = applyDiff(sampleBlocks, [editAttrOp]);
console.log('Success:', result1.success);
if (result1.success) {
  const updatedBlock = result1.blocks?.find(b => b.id === 'block1');
  if (updatedBlock && isContentBlock(updatedBlock)) {
    console.log('Updated className:', updatedBlock.props?.className);
  }
}
console.log();

// Test 2: Edit content
console.log('Test 2: Edit Content');
const editContentOp: EditOperation = {
  type: 'edit:content',
  blockId: 'block2',
  content: [
    { type: 'text', text: 'Updated ' },
    { type: 'text', text: 'Section', styles: ['bold'] },
    { type: 'text', text: ' Title' }
  ]
};

const result2 = applyDiff(result1.blocks || sampleBlocks, [editContentOp]);
console.log('Success:', result2.success);
if (result2.success) {
  const updatedBlock = result2.blocks?.find(b => b.id === 'block2');
  if (updatedBlock && isContentBlock(updatedBlock)) {
    console.log('Updated content:', JSON.stringify(updatedBlock.content, null, 2));
  }
}
console.log();

// Test 3: Edit params
console.log('Test 3: Edit Params');
const editParamsOp: EditOperation = {
  type: 'edit:params',
  blockId: 'fn1',
  params: { message: 'updated message', count: 3 }
};

const result3 = applyDiff(result2.blocks || sampleBlocks, [editParamsOp]);
console.log('Success:', result3.success);
if (result3.success) {
  const updatedBlock = result3.blocks?.find(b => b.id === 'fn1');
  if (updatedBlock && isExecutableBlock(updatedBlock)) {
    console.log('Updated params:', updatedBlock.parameters);
  }
}
console.log();

// Test 4: Insert new block
console.log('Test 4: Insert Block');
const insertOp: EditOperation = {
  type: 'insert',
  afterBlockId: 'block1',
  blocks: [{
    id: 'new-block',
    type: 'paragraph',
    content: [{ type: 'text', text: 'Inserted paragraph' }]
  }]
};

const result4 = applyDiff(result3.blocks || sampleBlocks, [insertOp]);
console.log('Success:', result4.success);
if (result4.success) {
  console.log('Block count after insert:', result4.blocks?.length);
  console.log('Block IDs:', result4.blocks?.map(b => b.id));
}
console.log();

// Test 5: Move block
console.log('Test 5: Move Block');
const moveOp: EditOperation = {
  type: 'move',
  blockId: 'fn1',
  atStart: true
};

const result5 = applyDiff(result4.blocks || sampleBlocks, [moveOp]);
console.log('Success:', result5.success);
if (result5.success) {
  console.log('Block order after move:', result5.blocks?.map(b => b.id));
}
console.log();

// Test 6: Delete block
console.log('Test 6: Delete Block');
const deleteOp: EditOperation = {
  type: 'delete',
  blockId: 'new-block'
};

const result6 = applyDiff(result5.blocks || sampleBlocks, [deleteOp]);
console.log('Success:', result6.success);
if (result6.success) {
  console.log('Final block count:', result6.blocks?.length);
  console.log('Final block IDs:', result6.blocks?.map(b => b.id));
}
console.log();

// Test 7: Error handling
console.log('Test 7: Error Handling');
const badOp: EditOperation = {
  type: 'edit:attr',
  blockId: 'nonexistent',
  name: 'test',
  value: 'test'
};

const errorResult = applyDiff(result6.blocks || sampleBlocks, [badOp]);
console.log('Success:', errorResult.success);
console.log('Error:', errorResult.error);
console.log();

console.log('✅ All tests completed!');