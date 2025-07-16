#!/usr/bin/env bun
/**
 * Extended test suite for diff implementation
 */

import { applyDiff } from '../document/diff-applier';
import type { Node, EditOperation, ContentNode, ExecutableNode } from '../document/ast';
import { isContentNode, isExecutableNode } from '../document/ast';

console.log('🧪 Extended Diff Implementation Tests\n');

// Helper to create test blocks
function createBlocks(count: number): Node[] {
  const blocks: Node[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 3 === 0) {
      blocks.push({
        id: `block${i}`,
        type: 'paragraph',
        content: [{ type: 'text', text: `Paragraph ${i}` }],
        props: { index: i }
      } as ContentNode);
    } else if (i % 3 === 1) {
      blocks.push({
        id: `block${i}`,
        type: 'heading',
        content: [{ type: 'text', text: `Heading ${i}` }],
        props: { level: (i % 6) + 1 }
      } as ContentNode);
    } else {
      blocks.push({
        id: `block${i}`,
        type: 'function_call',
        fn: `demo:tool${i}`,
        parameters: { value: i },
        content: [{ type: 'text', text: `Function ${i}` }]
      } as ExecutableNode);
    }
  }
  return blocks;
}

// Test 1: Move Operation Variants
console.log('=== Move Operation Variants ===\n');

// 1a: Bulk move
console.log('Test 1a: Bulk Move');
const blocks1 = createBlocks(10);
const bulkMoveOp: EditOperation = {
  type: 'move',
  blockIds: ['block1', 'block3', 'block5'],
  atEnd: true
};

const result1a = applyDiff(blocks1, [bulkMoveOp]);
console.log('Success:', result1a.success);
if (result1a.success) {
  const lastThree = result1a.nodes?.slice(-3).map(b => b.id);
  console.log('Last three blocks:', lastThree);
  console.log('Should be: [block1, block3, block5]');
}
console.log();

// 1b: Range move
console.log('Test 1b: Range Move');
const rangeMoveOp: EditOperation = {
  type: 'move',
  fromBlockId: 'block2',
  toBlockId: 'block4',
  atStart: true
};

const result1b = applyDiff(blocks1, [rangeMoveOp]);
console.log('Success:', result1b.success);
if (result1b.success) {
  const firstThree = result1b.nodes?.slice(0, 3).map(b => b.id);
  console.log('First three blocks:', firstThree);
  console.log('Should be: [block2, block3, block4]');
}
console.log();

// 1c: Move to same position (should be no-op)
console.log('Test 1c: Move to Same Position');
const noOpMoveOp: EditOperation = {
  type: 'move',
  blockId: 'block0',
  atStart: true
};

const result1c = applyDiff(blocks1, [noOpMoveOp]);
console.log('Success:', result1c.success);
if (result1c.success) {
  console.log('First block still:', result1c.nodes?.[0].id);
}
console.log();

// Test 2: Edge Cases
console.log('=== Edge Cases ===\n');

// 2a: Empty content
console.log('Test 2a: Empty Content');
const emptyContentOp: EditOperation = {
  type: 'edit:content',
  blockId: 'block0',
  content: []
};

const result2a = applyDiff(blocks1, [emptyContentOp]);
console.log('Success:', result2a.success);
if (result2a.success) {
  const block = result2a.nodes?.find(b => b.id === 'block0');
  if (block && isContentNode(block)) {
    console.log('Content is empty:', block.content.length === 0);
  }
}
console.log();

// 2b: Empty params
console.log('Test 2b: Empty Params');
const emptyParamsOp: EditOperation = {
  type: 'edit:params',
  blockId: 'block2', // function block
  params: {}
};

const result2b = applyDiff(blocks1, [emptyParamsOp]);
console.log('Success:', result2b.success);
if (result2b.success) {
  const block = result2b.nodes?.find(b => b.id === 'block2');
  if (block && isExecutableNode(block)) {
    console.log('Params are empty:', Object.keys(block.parameters).length === 0);
  }
}
console.log();

// 2c: Insert empty array
console.log('Test 2c: Insert Empty Array');
const emptyInsertOp: EditOperation = {
  type: 'insert',
  atEnd: true,
  blocks: []
};

const result2c = applyDiff(blocks1, [emptyInsertOp]);
console.log('Success:', result2c.success);
console.log('Block count unchanged:', result2c.nodes?.length === blocks1.length);
console.log();

// Test 3: Error Conditions
console.log('=== Error Conditions ===\n');

// 3a: Wrong block type for operation
console.log('Test 3a: Edit Params on Content Block');
const wrongTypeOp: EditOperation = {
  type: 'edit:params',
  blockId: 'block0', // This is a paragraph, not a function
  params: { invalid: true }
};

const result3a = applyDiff(blocks1, [wrongTypeOp]);
console.log('Success:', result3a.success);
console.log('Error:', result3a.error);
console.log();

// 3b: Multiple position specs
console.log('Test 3b: Multiple Position Specifications');
const multiPosOp: EditOperation = {
  type: 'insert',
  atStart: true,
  atEnd: true, // Both specified!
  blocks: [{ id: 'new', type: 'paragraph', content: [] } as ContentBlock]
};

const result3b = applyDiff(blocks1, [multiPosOp]);
console.log('Success:', result3b.success);
console.log('Error:', result3b.error);
console.log();

// 3c: Move with invalid combination
console.log('Test 3c: Move with Conflicting Specs');
const invalidMoveOp: EditOperation = {
  type: 'move',
  blockId: 'block1',
  blockIds: ['block2', 'block3'], // Both single and multiple!
  atEnd: true
};

const result3c = applyDiff(blocks1, [invalidMoveOp]);
console.log('Success:', result3c.success);
console.log('Should error or use blockId only');
console.log();

// Test 4: Complex Chains
console.log('=== Complex Operation Chains ===\n');

console.log('Test 4: Multiple Operations on Same Block');
const complexOps: EditOperation[] = [
  {
    type: 'edit:attr',
    blockId: 'block0',
    name: 'className',
    value: 'updated'
  },
  {
    type: 'edit:content',
    blockId: 'block0',
    content: [{ type: 'text', text: 'Updated text' }]
  },
  {
    type: 'move',
    blockId: 'block0',
    afterBlockId: 'block5'
  },
  {
    type: 'edit:id',
    blockId: 'block0',
    newId: 'block0-renamed'
  }
];

const result4 = applyDiff(blocks1, complexOps);
console.log('Success:', result4.success);
if (result4.success) {
  const renamedBlock = result4.nodes?.find(b => b.id === 'block0-renamed');
  console.log('Found renamed block:', !!renamedBlock);
  if (renamedBlock && isContentNode(renamedBlock)) {
    console.log('Has updated className:', renamedBlock.props?.className === 'updated');
    console.log('Has updated content:', renamedBlock.content[0]?.text === 'Updated text');
  }
  
  // Check position
  const blockIndex = result4.nodes?.findIndex(b => b.id === 'block0-renamed') ?? -1;
  const block5Index = result4.nodes?.findIndex(b => b.id === 'block5') ?? -1;
  console.log('Is after block5:', blockIndex === block5Index + 1);
}
console.log();

// Test 5: Performance
console.log('=== Performance Tests ===\n');

// 5a: Large document
console.log('Test 5a: Large Document (1000 blocks)');
const largeBlocks = createBlocks(1000);
const largeOps: EditOperation[] = [
  { type: 'edit:attr', blockId: 'block500', name: 'test', value: 'mid' },
  { type: 'move', blockId: 'block999', atStart: true },
  { type: 'delete', blockId: 'block100' }
];

const startTime1 = performance.now();
const result5a = applyDiff(largeBlocks, largeOps);
const endTime1 = performance.now();

console.log('Success:', result5a.success);
console.log(`Time taken: ${(endTime1 - startTime1).toFixed(2)}ms`);
console.log('Final block count:', result5a.nodes?.length);
console.log();

// 5b: Many operations
console.log('Test 5b: Many Operations (100 ops on 100 blocks)');
const mediumBlocks = createBlocks(100);
const manyOps: EditOperation[] = [];

// Generate 100 operations
for (let i = 0; i < 100; i++) {
  const opType = i % 4;
  const targetId = `block${i % 100}`;
  
  switch (opType) {
    case 0:
      manyOps.push({
        type: 'edit:attr',
        blockId: targetId,
        name: `prop${i}`,
        value: `value${i}`
      });
      break;
    case 1:
      manyOps.push({
        type: 'edit:content',
        blockId: targetId,
        content: [{ type: 'text', text: `Updated ${i}` }]
      });
      break;
    case 2:
      if (i < 50) { // Don't delete too many
        manyOps.push({
          type: 'move',
          blockId: targetId,
          afterBlockId: `block${(i + 10) % 100}`
        });
      }
      break;
    case 3:
      manyOps.push({
        type: 'insert',
        afterBlockId: targetId,
        blocks: [{
          id: `inserted${i}`,
          type: 'paragraph',
          content: [{ type: 'text', text: `Insert ${i}` }]
        } as ContentBlock]
      });
      break;
  }
}

const startTime2 = performance.now();
const result5b = applyDiff(mediumBlocks, manyOps);
const endTime2 = performance.now();

console.log('Success:', result5b.success);
console.log(`Time taken: ${(endTime2 - startTime2).toFixed(2)}ms`);
console.log('Final block count:', result5b.nodes?.length);
console.log(`Operations per millisecond: ${(100 / (endTime2 - startTime2)).toFixed(2)}`);
console.log();

// 5c: Worst case - nested searching
console.log('Test 5c: Deep Search Performance (finding last block)');
const deepBlocks = createBlocks(500);
const deepSearchOps: EditOperation[] = [];

// Operations targeting the last few blocks (worst case for search)
for (let i = 490; i < 500; i++) {
  deepSearchOps.push({
    type: 'edit:attr',
    blockId: `block${i}`,
    name: 'deep',
    value: 'found'
  });
}

const startTime3 = performance.now();
const result5c = applyDiff(deepBlocks, deepSearchOps);
const endTime3 = performance.now();

console.log('Success:', result5c.success);
console.log(`Time for 10 deep searches: ${(endTime3 - startTime3).toFixed(2)}ms`);
console.log(`Average per operation: ${((endTime3 - startTime3) / 10).toFixed(2)}ms`);

console.log('\n✅ Extended tests completed!');