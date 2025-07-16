/**
 * Zod validation schemas for Idyllic AST types
 * 
 * Provides runtime validation that complements TypeScript compile-time types.
 * These schemas validate:
 * - XML parser output → AST transformation
 * - Diff operations before application
 * - Function execution inputs/outputs
 * - Serialization roundtrip verification
 */

import { z } from 'zod';
import type {
  IdyllDocument,
  AgentDocument,
  DiffDocument,
  Node,
  ContentNode,
  ExecutableNode,
  RichContent,
  TextContent,
  InlineElement,
  MentionElement,
  VariableElement,
  LinkElement,
  AnnotationElement,
  EditOperation,
  ExecutionResult,
  ExecutionError,
  ExecutableMetadata,
  DocumentMetadata
} from '../document/ast';

// ============================================
// Base Type Schemas
// ============================================

// UUID validation (though we allow any string IDs for flexibility)
const IdSchema = z.string().min(1);

// Function name validation (namespace:function pattern)
const FunctionNameSchema = z.string().regex(
  /^[\w-]+:[\w-]+$/,
  'Function name must follow "namespace:function" pattern'
);

// ============================================
// Rich Content Schemas
// ============================================

const TextStyleSchema = z.enum([
  'bold',
  'italic', 
  'underline',
  'strikethrough',
  'code'
]);

const TextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  styles: z.array(TextStyleSchema).optional()
});

const MentionElementSchema = z.object({
  type: z.literal('mention'),
  mentionType: z.enum(['user', 'document', 'agent', 'custom']),
  id: IdSchema,
  label: z.string().optional()
});

const VariableElementSchema = z.object({
  type: z.literal('variable'),
  name: z.string().min(1),
  prompt: z.string().optional(),
  value: z.string().optional()
});

// Simplified LinkElement schema (allowing any content for now)
const LinkElementSchema = z.object({
  type: z.literal('link'),
  href: z.string().url(),
  content: z.array(z.any()) // Simplified to avoid circular reference
});

// Simplified AnnotationElement schema
const AnnotationElementSchema = z.object({
  type: z.literal('annotation'),
  content: z.array(z.any()), // Simplified to avoid circular reference
  annotation: z.object({
    title: z.string().optional(),
    comment: z.string().optional(),
    confidence: z.number().min(0).max(1).optional()
  }).catchall(z.any())
});

const InlineElementSchema = z.union([
  MentionElementSchema,
  VariableElementSchema,
  LinkElementSchema,
  AnnotationElementSchema
]);

const RichContentSchema = z.union([
  TextContentSchema,
  MentionElementSchema,
  VariableElementSchema,
  LinkElementSchema,
  AnnotationElementSchema
]);

// ============================================
// Execution Result Schemas  
// ============================================

const ExecutionErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional()
});

const ExecutionResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: ExecutionErrorSchema.optional(),
  timestamp: z.date().optional()
});

const ExecutableMetadataSchema = z.object({
  enabled: z.boolean().optional(),
  modelId: z.string().optional()
}).catchall(z.any());

// ============================================
// Node Schemas
// ============================================

const ContentNodeTypeSchema = z.enum([
  'paragraph',
  'heading', 
  'bulletListItem',
  'numberedListItem',
  'checklistItem',
  'code',
  'quote',
  'separator',
  'data',
  'function'
]);

const ExecutableNodeTypeSchema = z.enum([
  'function_call',
  'trigger'
]);

// Simplified ContentNode schema (children validation will be limited)
const ContentNodeSchema = z.object({
  id: IdSchema,
  type: ContentNodeTypeSchema,
  content: z.array(RichContentSchema),
  children: z.array(z.any()).optional(), // Simplified to avoid circular reference
  props: z.object({}).passthrough().optional()
});

const ExecutableNodeSchema = z.object({
  id: IdSchema,
  type: ExecutableNodeTypeSchema,
  fn: FunctionNameSchema,
  parameters: z.object({}).passthrough(),
  content: z.array(RichContentSchema).optional(),
  result: ExecutionResultSchema.optional(),
  metadata: ExecutableMetadataSchema.optional(),
  props: z.object({}).passthrough().optional()
});

const NodeSchema = z.union([
  ContentNodeSchema,
  ExecutableNodeSchema
]);

// ============================================
// Edit Operation Schemas
// ============================================

const EditAttrOperationSchema = z.object({
  type: z.literal('edit:attr'),
  blockId: IdSchema,
  name: z.string().min(1),
  value: z.string()
});

const EditContentOperationSchema = z.object({
  type: z.literal('edit:content'),
  blockId: IdSchema,
  content: z.array(RichContentSchema)
});

const EditParamsOperationSchema = z.object({
  type: z.literal('edit:params'),
  blockId: IdSchema,
  params: z.object({}).passthrough()
});

const EditIdOperationSchema = z.object({
  type: z.literal('edit:id'),
  blockId: IdSchema,
  newId: IdSchema
});

const InsertOperationSchema = z.object({
  type: z.literal('insert'),
  afterBlockId: IdSchema.optional(),
  beforeBlockId: IdSchema.optional(),
  atStart: z.boolean().optional(),
  atEnd: z.boolean().optional(),
  blocks: z.array(NodeSchema)
}).refine(
  (data) => {
    // Exactly one position must be specified
    const positionCount = [
      data.afterBlockId,
      data.beforeBlockId,
      data.atStart,
      data.atEnd
    ].filter(Boolean).length;
    return positionCount === 1;
  },
  {
    message: 'Insert operation must specify exactly one position'
  }
);

const DeleteOperationSchema = z.object({
  type: z.literal('delete'),
  blockId: IdSchema
});

const ReplaceOperationSchema = z.object({
  type: z.literal('replace'),
  blockId: IdSchema,
  blocks: z.array(NodeSchema)
});

const MoveOperationSchema = z.object({
  type: z.literal('move'),
  blockId: IdSchema.optional(),
  blockIds: z.array(IdSchema).optional(),
  fromBlockId: IdSchema.optional(),
  toBlockId: IdSchema.optional(),
  afterBlockId: IdSchema.optional(),
  beforeBlockId: IdSchema.optional(),
  atStart: z.boolean().optional(),
  atEnd: z.boolean().optional()
}).refine(
  (data) => {
    // Must specify what to move
    const sourceCount = [
      data.blockId,
      data.blockIds,
      data.fromBlockId && data.toBlockId
    ].filter(Boolean).length;
    
    // Must specify where to move to
    const targetCount = [
      data.afterBlockId,
      data.beforeBlockId,
      data.atStart,
      data.atEnd
    ].filter(Boolean).length;
    
    return sourceCount === 1 && targetCount === 1;
  },
  {
    message: 'Move operation must specify exactly one source and one target'
  }
);

const EditOperationSchema = z.union([
  EditAttrOperationSchema,
  EditContentOperationSchema,
  EditParamsOperationSchema,
  EditIdOperationSchema,
  InsertOperationSchema,
  DeleteOperationSchema,
  ReplaceOperationSchema,
  MoveOperationSchema
]);

// ============================================
// Document Schemas
// ============================================

const DocumentMetadataSchema = z.object({
  version: z.string().optional(),
  created: z.date().optional(),
  modified: z.date().optional()
}).catchall(z.any());

const IdyllDocumentSchema = z.object({
  id: IdSchema,
  nodes: z.array(NodeSchema),
  metadata: DocumentMetadataSchema.optional()
});

const AgentDocumentSchema = z.object({
  type: z.literal('agent'),
  id: IdSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  model: z.string().optional(),
  nodes: z.array(NodeSchema)
});

const DiffDocumentSchema = z.object({
  type: z.literal('diff'),
  targetDocument: z.string().optional(),
  timestamp: z.date(),
  operations: z.array(EditOperationSchema)
});

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a complete Idyll document
 */
export function validateDocument(data: unknown): IdyllDocument {
  return IdyllDocumentSchema.parse(data);
}

/**
 * Validate an agent document
 */
export function validateAgentDocument(data: unknown): AgentDocument {
  return AgentDocumentSchema.parse(data);
}

/**
 * Validate a diff document
 */
export function validateDiffDocument(data: unknown): DiffDocument {
  return DiffDocumentSchema.parse(data);
}

/**
 * Validate a single node
 */
export function validateNode(data: unknown): Node {
  return NodeSchema.parse(data);
}

/**
 * Validate an array of nodes
 */
export function validateNodes(data: unknown): Node[] {
  return z.array(NodeSchema).parse(data);
}

/**
 * Validate rich content
 */
export function validateRichContent(data: unknown): RichContent {
  return RichContentSchema.parse(data);
}

/**
 * Validate an edit operation
 */
export function validateEditOperation(data: unknown): EditOperation {
  return EditOperationSchema.parse(data);
}

/**
 * Validate an array of edit operations
 */
export function validateEditOperations(data: unknown): EditOperation[] {
  return z.array(EditOperationSchema).parse(data);
}

/**
 * Safe validation that returns result with error information
 */
export function safeValidateDocument(data: unknown): {
  success: true;
  data: IdyllDocument;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = IdyllDocumentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Safe validation for edit operations
 */
export function safeValidateEditOperation(data: unknown): {
  success: true;
  data: EditOperation;
} | {
  success: false;
  error: z.ZodError;
} {
  const result = EditOperationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

// Export all schemas for external use
export {
  IdyllDocumentSchema,
  AgentDocumentSchema,
  DiffDocumentSchema,
  NodeSchema,
  ContentNodeSchema,
  ExecutableNodeSchema,
  RichContentSchema,
  TextContentSchema,
  InlineElementSchema,
  EditOperationSchema,
  DocumentMetadataSchema
};