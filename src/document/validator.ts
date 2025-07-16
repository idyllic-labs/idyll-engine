/**
 * Document validation logic
 */

import {
  Node,
  IdyllDocument,
  isExecutableNode,
  extractMentions,
  extractVariables,
  traverseNodes,
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
  nodeId?: string;
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
  
  // Validate document has nodes
  if (!document.nodes || document.nodes.length === 0) {
    warnings.push({
      type: 'warning',
      code: 'EMPTY_DOCUMENT',
      message: 'Document has no content nodes',
    });
  }
  
  // Validate each node
  const nodeIds = new Set<string>();
  for (const node of traverseNodes(document.nodes)) {
    validateNode(node, nodeIds, errors, warnings);
  }
}

/**
 * Validate a single node
 */
function validateNode(
  node: Node,
  nodeIds: Set<string>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[]
): void {
  const nodeId = node.id || 'unknown';
  
  // Check for duplicate IDs
  if (node.id && nodeIds.has(node.id)) {
    errors.push({
      type: 'error',
      code: 'DUPLICATE_NODE_ID',
      message: `Duplicate node ID: ${node.id}`,
      nodeId: node.id,
    });
  }
  if (node.id) {
    nodeIds.add(node.id);
  }
  
  // Validate node has required fields
  if (!node.id) {
    errors.push({
      type: 'error',
      code: 'MISSING_NODE_ID',
      message: 'Node must have an ID',
    });
  }
  
  if (!node.type) {
    errors.push({
      type: 'error',
      code: 'MISSING_NODE_TYPE',
      message: 'Node must have a type',
      nodeId,
    });
    return; // Can't validate further without type
  }
  
  // Validate executable nodes
  if (isExecutableNode(node)) {
    if (!node.fn) {
      errors.push({
        type: 'error',
        code: 'MISSING_FUNCTION',
        message: 'Executable node must specify a function',
        nodeId,
      });
    }
    
    if (!node.parameters) {
      warnings.push({
        type: 'warning',
        code: 'MISSING_PARAMETERS',
        message: 'Executable node has no parameters',
        nodeId,
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
    const mentions = extractMentions(document.nodes);
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
    const variables = extractVariables(document.nodes);
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
  
  // Validate functions
  if (context.validateFunction) {
    for (const node of traverseNodes(document.nodes)) {
      if (isExecutableNode(node) && node.fn) {
        if (!context.validateFunction(node.fn)) {
          errors.push({
            type: 'error',
            code: 'INVALID_FUNCTION',
            message: `Function not found: ${node.fn}`,
            nodeId: node.id || 'unknown',
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
      const location = issue.nodeId ? ` (node: ${issue.nodeId})` : '';
      return `${prefix} ${issue.message}${location}`;
    })
    .join('\n');
}