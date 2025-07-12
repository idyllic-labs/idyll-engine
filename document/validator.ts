/**
 * Document validation logic
 */

import {
  Block,
  IdyllDocument,
  isExecutableBlock,
  extractMentions,
  extractVariables,
  traverseBlocks,
} from './ast';
import { ValidationContext, ValidationError } from '../types';

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  blockId?: string;
  path?: string[];
}

// ============================================
// Main Validation Function
// ============================================

/**
 * Validate a document structure and optionally its references
 */
export async function validateDocument(
  document: IdyllDocument,
  context?: ValidationContext
): Promise<ValidationResult> {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  
  // Phase 1: Structure validation
  validateStructure(document, errors, warnings);
  
  // Phase 2: Reference validation (if context provided)
  if (context) {
    await validateReferences(document, context, errors, warnings);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Structure Validation
// ============================================

/**
 * Validate document structure
 */
function validateStructure(
  document: IdyllDocument,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  // Validate document has an ID
  if (!document.id) {
    errors.push({
      type: 'error',
      code: 'MISSING_DOCUMENT_ID',
      message: 'Document must have an ID',
    });
  }
  
  // Validate document has blocks
  if (!document.blocks || document.blocks.length === 0) {
    warnings.push({
      type: 'warning',
      code: 'EMPTY_DOCUMENT',
      message: 'Document has no content blocks',
    });
  }
  
  // Validate each block
  const blockIds = new Set<string>();
  for (const block of traverseBlocks(document.blocks)) {
    validateBlock(block, blockIds, errors, warnings);
  }
}

/**
 * Validate a single block
 */
function validateBlock(
  block: Block,
  blockIds: Set<string>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  const blockId = block.id || 'unknown';
  
  // Check for duplicate IDs
  if (block.id && blockIds.has(block.id)) {
    errors.push({
      type: 'error',
      code: 'DUPLICATE_BLOCK_ID',
      message: `Duplicate block ID: ${block.id}`,
      blockId: block.id,
    });
  }
  if (block.id) {
    blockIds.add(block.id);
  }
  
  // Validate block has required fields
  if (!block.id) {
    errors.push({
      type: 'error',
      code: 'MISSING_BLOCK_ID',
      message: 'Block must have an ID',
    });
  }
  
  if (!block.type) {
    errors.push({
      type: 'error',
      code: 'MISSING_BLOCK_TYPE',
      message: 'Block must have a type',
      blockId,
    });
    return; // Can't validate further without type
  }
  
  // Validate executable blocks
  if (isExecutableBlock(block)) {
    if (!block.tool) {
      errors.push({
        type: 'error',
        code: 'MISSING_TOOL',
        message: 'Executable block must specify a tool',
        blockId,
      });
    }
    
    if (!block.parameters) {
      warnings.push({
        type: 'warning',
        code: 'MISSING_PARAMETERS',
        message: 'Executable block has no parameters',
        blockId,
      });
    }
  }
}

// ============================================
// Reference Validation
// ============================================

/**
 * Validate document references (mentions, variables, tools)
 */
async function validateReferences(
  document: IdyllDocument,
  context: ValidationContext,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): Promise<void> {
  // Validate mentions
  if (context.validateMention) {
    const mentions = extractMentions(document.blocks);
    for (const mention of mentions) {
      if (!context.validateMention(mention)) {
        errors.push({
          type: 'error',
          code: 'INVALID_MENTION',
          message: `Invalid ${mention.mentionType} mention: ${mention.id}`,
        });
      }
    }
  }
  
  // Validate variables
  if (context.validateVariable) {
    const variables = extractVariables(document.blocks);
    for (const variable of variables) {
      const result = context.validateVariable(variable);
      if (!result.valid) {
        errors.push({
          type: 'error',
          code: 'INVALID_VARIABLE',
          message: `Invalid variable: ${variable.name}`,
        });
      }
    }
  }
  
  // Validate tools
  if (context.validateTool) {
    for (const block of traverseBlocks(document.blocks)) {
      if (isExecutableBlock(block) && block.tool) {
        if (!context.validateTool(block.tool)) {
          errors.push({
            type: 'error',
            code: 'INVALID_TOOL',
            message: `Tool not found: ${block.tool}`,
            blockId: block.id || 'unknown',
          });
        }
      }
    }
  }
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Create a validation error from issues
 */
export function createValidationError(result: ValidationResult): ValidationError {
  const errorMessages = result.errors.map(e => e.message);
  return new ValidationError(
    `Document validation failed with ${result.errors.length} error(s)`,
    errorMessages,
    { issues: result.errors }
  );
}

/**
 * Format validation issues for display
 */
export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues
    .map(issue => {
      const prefix = issue.type === 'error' ? '❌' : '⚠️';
      const location = issue.blockId ? ` (block: ${issue.blockId})` : '';
      return `${prefix} ${issue.message}${location}`;
    })
    .join('\n');
}