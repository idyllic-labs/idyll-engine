/**
 * Diff Application Logic for Idyll Documents
 * 
 * Applies edit operations to document blocks with proper error handling.
 */

import { 
  Block, 
  EditOperation, 
  EditAttrOperation,
  EditContentOperation,
  EditParamsOperation,
  EditIdOperation,
  InsertOperation,
  DeleteOperation,
  ReplaceOperation,
  MoveOperation,
  RichContent 
} from './ast';
import { v4 as uuidv4 } from 'uuid';

export interface DiffResult {
  success: boolean;
  blocks?: Block[];
  error?: string;
}

/**
 * Apply a list of edit operations to document blocks
 */
export function applyDiff(blocks: Block[], operations: EditOperation[]): DiffResult {
  try {
    let result = [...blocks];

    for (const operation of operations) {
      switch (operation.type) {
        case 'edit:attr':
          result = applyEditAttr(result, operation);
          break;

        case 'edit:content':
          result = applyEditContent(result, operation);
          break;

        case 'edit:params':
          result = applyEditParams(result, operation);
          break;

        case 'edit:id':
          result = applyEditId(result, operation);
          break;

        case 'insert':
          result = applyInsert(result, operation);
          break;

        case 'delete':
          result = applyDelete(result, operation);
          break;

        case 'replace':
          result = applyReplace(result, operation);
          break;

        case 'move':
          result = applyMove(result, operation);
          break;

        default:
          throw new Error(`Unknown operation type: ${(operation as any).type}`);
      }
    }

    return { success: true, blocks: result };
  } catch (error) {
    return { 
      success: false, 
      blocks,
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// ============================================
// Operation Application Functions
// ============================================

function applyEditAttr(blocks: Block[], op: EditAttrOperation): Block[] {
  let found = false;
  
  const result = blocks.map(block => {
    if (block.id === op.blockId) {
      found = true;
      return { 
        ...block, 
        props: { ...((block as any).props || {}), [op.name]: op.value } 
      };
    }
    
    // Search in children for nested blocks (even though we prefer flat structure)
    if ('children' in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditAttr(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    
    return block;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyEditContent(blocks: Block[], op: EditContentOperation): Block[] {
  let found = false;
  
  const result = blocks.map(block => {
    if (block.id === op.blockId) {
      found = true;
      // Only content blocks have content property
      if ('content' in block) {
        return { ...block, content: op.content };
      } else {
        throw new Error(`Block ${op.blockId} is not a content block`);
      }
    }
    
    if ('children' in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditContent(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    
    return block;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyEditParams(blocks: Block[], op: EditParamsOperation): Block[] {
  let found = false;
  
  const result = blocks.map(block => {
    if (block.id === op.blockId) {
      found = true;
      // Only executable blocks have parameters
      if ('parameters' in block) {
        return { ...block, parameters: op.params };
      } else {
        throw new Error(`Block ${op.blockId} is not an executable block`);
      }
    }
    
    if ('children' in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditParams(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    
    return block;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyEditId(blocks: Block[], op: EditIdOperation): Block[] {
  let found = false;
  
  const result = blocks.map(block => {
    if (block.id === op.blockId) {
      found = true;
      return { ...block, id: op.newId };
    }
    
    if ('children' in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditId(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    
    return block;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyInsert(blocks: Block[], op: InsertOperation): Block[] {
  // Validate position specification
  const positionCount = [op.atStart, op.atEnd, op.afterBlockId, op.beforeBlockId]
    .filter(Boolean).length;
  
  if (positionCount !== 1) {
    throw new Error('Insert operation must specify exactly one position');
  }
  
  // Ensure all inserted blocks have IDs
  const blocksToInsert = op.blocks.map(block => ({
    ...block,
    id: block.id || uuidv4(),
  }));

  if (op.atStart) {
    return [...blocksToInsert, ...blocks];
  }

  if (op.atEnd) {
    return [...blocks, ...blocksToInsert];
  }

  const result: Block[] = [];
  let inserted = false;

  for (const block of blocks) {
    if (op.beforeBlockId && block.id === op.beforeBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }

    result.push(block);

    if (op.afterBlockId && block.id === op.afterBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }
  }

  if (!inserted) {
    throw new Error(`Could not find anchor block for insert operation`);
  }

  return result;
}

function applyDelete(blocks: Block[], op: DeleteOperation): Block[] {
  // Remove from top level and recursively from children
  return blocks
    .filter(block => block.id !== op.blockId)
    .map(block => {
      if ('children' in block && block.children && block.children.length > 0) {
        return { ...block, children: applyDelete(block.children, op) };
      }
      return block;
    });
}

function applyReplace(blocks: Block[], op: ReplaceOperation): Block[] {
  // When replacing with a single block, preserve the original ID
  const replacementBlocks = op.blocks.map((block, index) => {
    const newId = op.blocks.length === 1 && index === 0 ? op.blockId : (block.id || uuidv4());
    return {
      ...block,
      id: newId,
    };
  });

  const result: Block[] = [];
  let replaced = false;

  for (const block of blocks) {
    if (block.id === op.blockId) {
      result.push(...replacementBlocks);
      replaced = true;
    } else {
      result.push(block);
    }
  }

  if (!replaced) {
    throw new Error(`Could not find block ${op.blockId} to replace`);
  }

  return result;
}

function applyMove(blocks: Block[], op: MoveOperation): Block[] {
  // Determine what blocks to move
  let blocksToMove: Block[] = [];
  let remainingBlocks: Block[] = [];

  if (op.blockId) {
    // Single block move
    const blockToMove = findBlockById(blocks, op.blockId);
    if (!blockToMove) {
      throw new Error(`Block not found: ${op.blockId}`);
    }
    blocksToMove = [blockToMove];
    remainingBlocks = blocks.filter(b => b.id !== op.blockId);
  } else if (op.blockIds) {
    // Multiple blocks move
    const ids = op.blockIds;
    for (const id of ids) {
      const block = findBlockById(blocks, id);
      if (!block) {
        throw new Error(`Block not found: ${id}`);
      }
      blocksToMove.push(block);
    }
    remainingBlocks = blocks.filter(b => !ids.includes(b.id));
  } else if (op.fromBlockId && op.toBlockId) {
    // Range move
    const fromIndex = blocks.findIndex(b => b.id === op.fromBlockId);
    const toIndex = blocks.findIndex(b => b.id === op.toBlockId);
    
    if (fromIndex === -1) {
      throw new Error(`Block not found: ${op.fromBlockId}`);
    }
    if (toIndex === -1) {
      throw new Error(`Block not found: ${op.toBlockId}`);
    }
    
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    blocksToMove = blocks.slice(startIndex, endIndex + 1);
    remainingBlocks = [
      ...blocks.slice(0, startIndex),
      ...blocks.slice(endIndex + 1)
    ];
  } else {
    throw new Error('Move operation must specify blockId, blockIds, or fromBlockId/toBlockId');
  }

  // Now insert the moved blocks at the new position
  const insertOp: InsertOperation = {
    type: 'insert',
    afterBlockId: op.afterBlockId,
    beforeBlockId: op.beforeBlockId,
    atStart: op.atStart,
    atEnd: op.atEnd,
    blocks: blocksToMove
  };

  return applyInsert(remainingBlocks, insertOp);
}

// ============================================
// Helper Functions
// ============================================

function findBlockById(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) {
      return block;
    }
    
    if ('children' in block && block.children) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
  }
  
  return null;
}

// Re-export types for convenience
export type { EditOperation } from './ast';