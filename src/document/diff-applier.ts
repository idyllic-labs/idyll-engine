/**
 * Diff Application Logic for Idyll Documents
 * 
 * Applies edit operations to document nodes with proper error handling.
 */

import { 
  Node, 
  RichContent,
  EditOperation, 
  EditAttrOperation,
  EditContentOperation,
  EditParamsOperation,
  EditIdOperation,
  InsertOperation,
  DeleteOperation,
  ReplaceOperation,
  MoveOperation
} from './ast';
import { 
  validateEditOperations, 
  validateNodes,
  safeValidateEditOperation 
} from '../grammar/validation';
import { v4 as uuidv4 } from 'uuid';

export interface DiffResult {
  success: boolean;
  nodes?: Node[];
  error?: string;
  validationErrors?: string[];
}

/**
 * Apply a list of edit operations to document nodes with validation
 */
export function applyDiff(nodes: Node[], operations: EditOperation[]): DiffResult {
  try {
    // Validate input nodes
    validateNodes(nodes);
    
    // Validate all operations before applying any
    validateEditOperations(operations);
    
    let result = [...nodes];

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

    // Validate the final result
    validateNodes(result);
    
    return { success: true, nodes: result };
  } catch (error) {
    return { 
      success: false, 
      nodes,
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Safe version of applyDiff that returns detailed validation errors
 */
export function safeApplyDiff(nodes: Node[], operations: EditOperation[]): DiffResult {
  const validationErrors: string[] = [];
  
  try {
    // Validate input nodes
    validateNodes(nodes);
  } catch (error) {
    validationErrors.push(`Invalid input nodes: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Validate each operation individually for detailed error reporting
  for (let i = 0; i < operations.length; i++) {
    const validation = safeValidateEditOperation(operations[i]);
    if (!validation.success) {
      validationErrors.push(`Operation ${i}: ${validation.error.message}`);
    }
  }
  
  if (validationErrors.length > 0) {
    return {
      success: false,
      nodes,
      validationErrors
    };
  }
  
  // If validation passes, apply the diff normally
  return applyDiff(nodes, operations);
}

// ============================================
// Operation Application Functions
// ============================================

function applyEditAttr(nodes: Node[], op: EditAttrOperation): Node[] {
  let found = false;
  
  const result = nodes.map(node => {
    if (node.id === op.blockId) {
      found = true;
      return { 
        ...node, 
        props: { ...((node as any).props || {}), [op.name]: op.value } 
      };
    }
    
    // Search in children for nested nodes (even though we prefer flat structure)
    if ('children' in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditAttr(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    
    return node;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyEditContent(nodes: Node[], op: EditContentOperation): Node[] {
  let found = false;
  
  const result = nodes.map(node => {
    if (node.id === op.blockId) {
      found = true;
      
      // Both ContentNode and ExecutableNode use the content field
      if ('content' in node) {
        // Trim whitespace from text content
        const trimmedContent = trimContent(op.content);
        return { ...node, content: trimmedContent };
      }
      // Node does not have editable content
      else {
        throw new Error(`Block ${op.blockId} does not have editable content`);
      }
    }
    
    if ('children' in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditContent(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    
    return node;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyEditParams(nodes: Node[], op: EditParamsOperation): Node[] {
  let found = false;
  
  const result = nodes.map(node => {
    if (node.id === op.blockId) {
      found = true;
      // Only executable nodes have parameters
      if ('parameters' in node) {
        return { ...node, parameters: op.params };
      } else {
        throw new Error(`Block ${op.blockId} is not an executable node`);
      }
    }
    
    if ('children' in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditParams(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    
    return node;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyEditId(nodes: Node[], op: EditIdOperation): Node[] {
  let found = false;
  
  const result = nodes.map(node => {
    if (node.id === op.blockId) {
      found = true;
      return { ...node, id: op.newId };
    }
    
    if ('children' in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditId(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    
    return node;
  });
  
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  
  return result;
}

function applyInsert(nodes: Node[], op: InsertOperation): Node[] {
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
    return [...blocksToInsert, ...nodes];
  }

  if (op.atEnd) {
    return [...nodes, ...blocksToInsert];
  }

  const result: Node[] = [];
  let inserted = false;

  for (const node of nodes) {
    if (op.beforeBlockId && node.id === op.beforeBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }

    result.push(node);

    if (op.afterBlockId && node.id === op.afterBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }
  }

  if (!inserted) {
    throw new Error(`Could not find anchor block for insert operation`);
  }

  return result;
}

function applyDelete(nodes: Node[], op: DeleteOperation): Node[] {
  // Remove from top level and recursively from children
  return nodes
    .filter(node => node.id !== op.blockId)
    .map(node => {
      if ('children' in node && node.children && node.children.length > 0) {
        return { ...node, children: applyDelete(node.children, op) };
      }
      return node;
    });
}

function applyReplace(nodes: Node[], op: ReplaceOperation): Node[] {
  // When replacing with a single block, preserve the original ID
  const replacementBlocks = op.blocks.map((block, index) => {
    const newId = op.blocks.length === 1 && index === 0 ? op.blockId : (block.id || uuidv4());
    return {
      ...block,
      id: newId,
    };
  });

  const result: Node[] = [];
  let replaced = false;

  for (const node of nodes) {
    if (node.id === op.blockId) {
      result.push(...replacementBlocks);
      replaced = true;
    } else {
      result.push(node);
    }
  }

  if (!replaced) {
    throw new Error(`Could not find block ${op.blockId} to replace`);
  }

  return result;
}

function applyMove(nodes: Node[], op: MoveOperation): Node[] {
  // Determine what blocks to move
  let blocksToMove: Node[] = [];
  let remainingNodes: Node[] = [];

  if (op.blockId) {
    // Single block move
    const blockToMove = findNodeById(nodes, op.blockId);
    if (!blockToMove) {
      throw new Error(`Block not found: ${op.blockId}`);
    }
    blocksToMove = [blockToMove];
    remainingNodes = nodes.filter(n => n.id !== op.blockId);
  } else if (op.blockIds) {
    // Multiple blocks move
    for (const id of op.blockIds) {
      const block = findNodeById(nodes, id);
      if (!block) {
        throw new Error(`Block not found: ${id}`);
      }
      blocksToMove.push(block);
    }
    remainingNodes = nodes.filter(n => !op.blockIds!.includes(n.id));
  } else if (op.fromBlockId && op.toBlockId) {
    // Range move
    const fromIndex = nodes.findIndex(n => n.id === op.fromBlockId);
    const toIndex = nodes.findIndex(n => n.id === op.toBlockId);
    
    if (fromIndex === -1) {
      throw new Error(`Block not found: ${op.fromBlockId}`);
    }
    if (toIndex === -1) {
      throw new Error(`Block not found: ${op.toBlockId}`);
    }
    
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    
    blocksToMove = nodes.slice(startIndex, endIndex + 1);
    remainingNodes = [
      ...nodes.slice(0, startIndex),
      ...nodes.slice(endIndex + 1)
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

  return applyInsert(remainingNodes, insertOp);
}

// ============================================
// Helper Functions
// ============================================

function findNodeById(nodes: Node[], id: string): Node | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    
    if ('children' in node && node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Trim whitespace from RichContent array
 */
function trimContent(content: RichContent[]): RichContent[] {
  if (!content || content.length === 0) {
    return content || [];
  }
  
  const result = content
    .filter(item => item != null) // Filter out null/undefined items
    .map(item => {
      if (!item || typeof item !== 'object') {
        console.warn('Invalid content item:', item);
        return null;
      }
      
      if (item.type === 'text' && 'text' in item) {
        // Ensure text property exists and is a string
        const text = String(item.text || '').trim();
        return {
          ...item,
          text
        };
      }
      return item;
    })
    .filter(item => item != null); // Remove any nulls from invalid items
  
  // Remove empty text items after trimming
  return result.filter(item => {
    if (item && item.type === 'text') {
      return item.text && item.text.length > 0;
    }
    return true;
  });
}

// Re-export types for convenience
export type { EditOperation } from './ast';