#!/usr/bin/env bun
/**
 * Quick test script for the new diff implementation
 */

import { applyDiff } from '../document/diff-applier';
import type { Node, EditOperation, ContentNode, ExecutableNode } from '../document/ast';
import { isContentNode, isExecutableNode } from '../document/ast';

// Sample document blocks
const sampleNodes: Node[] = [
  {
    id: 'block1',
    type: 'paragraph',
    content: [{ type: 'text', text: 'Hello world' }],
    props: { className: 'intro' }
  } as ContentNode,
  {
    id: 'block2', 
    type: 'heading',
    content: [{ type: 'text', text: 'Section 1' }],
    props: { level: 2 }
  } as ContentNode,
  {
    id: 'fn1',
    type: 'function_call',
    fn: 'demo:echo',
    parameters: { message: 'original message' },
    instructions: [{ type: 'text', text: 'Echo this message' }]
  } as ExecutableNode
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

const result1 = applyDiff(sampleNodes, [editAttrOp]);
console.log('Success:', result1.success);
if (result1.success) {
  const updatedBlock = result1.nodes?.find(b => b.id === 'block1');
  if (updatedBlock && isContentNode(updatedBlock)) {
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

const result2 = applyDiff(result1.nodes || sampleNodes, [editContentOp]);
console.log('Success:', result2.success);
if (result2.success) {
  const updatedBlock = result2.nodes?.find(b => b.id === 'block2');
  if (updatedBlock && isContentNode(updatedBlock)) {
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

const result3 = applyDiff(result2.nodes || sampleNodes, [editParamsOp]);
console.log('Success:', result3.success);
if (result3.success) {
  const updatedBlock = result3.nodes?.find(b => b.id === 'fn1');
  if (updatedBlock && isExecutableNode(updatedBlock)) {
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

const result4 = applyDiff(result3.nodes || sampleNodes, [insertOp]);
console.log('Success:', result4.success);
if (result4.success) {
  console.log('Block count after insert:', result4.nodes?.length);
  console.log('Block IDs:', result4.nodes?.map(b => b.id));
}
console.log();

// Test 5: Move block
console.log('Test 5: Move Block');
const moveOp: EditOperation = {
  type: 'move',
  blockId: 'fn1',
  atStart: true
};

const result5 = applyDiff(result4.nodes || sampleNodes, [moveOp]);
console.log('Success:', result5.success);
if (result5.success) {
  console.log('Block order after move:', result5.nodes?.map(b => b.id));
}
console.log();

// Test 6: Delete block
console.log('Test 6: Delete Block');
const deleteOp: EditOperation = {
  type: 'delete',
  blockId: 'new-block'
};

const result6 = applyDiff(result5.nodes || sampleNodes, [deleteOp]);
console.log('Success:', result6.success);
if (result6.success) {
  console.log('Final block count:', result6.nodes?.length);
  console.log('Final block IDs:', result6.nodes?.map(b => b.id));
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

const errorResult = applyDiff(result6.nodes || sampleNodes, [badOp]);
console.log('Success:', errorResult.success);
console.log('Error:', errorResult.error);
console.log();

console.log('✅ All tests completed!');