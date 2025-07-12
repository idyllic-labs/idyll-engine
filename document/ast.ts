/**
 * Core AST types for Idyllic documents
 * 
 * This defines the semantic model for documents, independent of:
 * - BlockNote editor representation
 * - XML serialization format
 * - Specific tool implementations
 */

// ============================================
// Core Document Types
// ============================================

/**
 * The root document structure
 */
export interface IdyllDocument {
  id: string;
  blocks: Block[];
  metadata?: DocumentMetadata;
}

/**
 * Agent system prompt document
 */
export interface AgentDocument {
  type: 'agent';
  id: string;
  name?: string;
  description?: string;
  model?: string;
  blocks: Block[];
}

/**
 * Diff document for edit operations
 */
export interface DiffDocument {
  type: 'diff';
  targetDocument?: string;
  timestamp: Date;
  operations: EditOperation[];
}

/**
 * Edit operation types
 */
export type EditOperation = 
  | EditAttrOperation
  | EditContentOperation
  | EditParamsOperation
  | EditIdOperation
  | InsertOperation
  | DeleteOperation
  | ReplaceOperation
  | MoveOperation;

export interface EditAttrOperation {
  type: 'edit:attr';
  blockId: string;
  name: string;
  value: string;
}

export interface EditContentOperation {
  type: 'edit:content';
  blockId: string;
  content: RichContent[];
}

export interface EditParamsOperation {
  type: 'edit:params';
  blockId: string;
  params: Record<string, unknown>;
}

export interface EditIdOperation {
  type: 'edit:id';
  blockId: string;
  newId: string;
}

export interface InsertOperation {
  type: 'insert';
  afterBlockId?: string;
  beforeBlockId?: string;
  atStart?: boolean;
  atEnd?: boolean;
  blocks: Block[];
}

export interface DeleteOperation {
  type: 'delete';
  blockId: string;
}

export interface ReplaceOperation {
  type: 'replace';
  blockId: string;
  blocks: Block[];
}

export interface MoveOperation {
  type: 'move';
  blockId?: string;
  blockIds?: string[];
  fromBlockId?: string;
  toBlockId?: string;
  afterBlockId?: string;
  beforeBlockId?: string;
  atStart?: boolean;
  atEnd?: boolean;
}

export interface DocumentMetadata {
  version?: string;
  created?: Date;
  modified?: Date;
  [key: string]: unknown;
}

/**
 * A block can be either content (text, headings, etc) or executable
 */
export type Block = ContentBlock | ExecutableBlock;

// ============================================
// Content Blocks
// ============================================

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: RichContent[];
  children?: Block[];
  props?: Record<string, unknown>;
}

// Define block types directly
export type BlockType = 
  | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'ul' | 'ol' | 'li'
  | 'blockquote' | 'code' | 'pre'
  | 'hr' | 'br'
  | 'function_call' | 'trigger' | '_params' | '_content' | '_result'
  | 'heading' | 'paragraph';  // Added for compatibility

// ContentBlockType includes all content-related types
export type ContentBlockType = 
  | 'paragraph' | 'heading'
  | 'bulletListItem' | 'numberedListItem' | 'checklistItem'
  | 'code' | 'quote' | 'separator' | 'data' | 'tool';

// ============================================
// Executable Blocks
// ============================================

export interface ExecutableBlock {
  id: string;
  type: ExecutableBlockType;
  tool: string; // e.g., "documents:create", "ai:generate-text"
  parameters: Record<string, unknown>;
  instructions?: RichContent[]; // Natural language instructions
  result?: ExecutionResult;
  metadata?: ExecutableMetadata;
}

export type ExecutableBlockType = 'function_call' | 'trigger';

export interface ExecutableMetadata {
  enabled?: boolean; // For triggers
  modelId?: string; // For AI operations
  [key: string]: unknown;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: ExecutionError;
  timestamp?: Date;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: unknown;
}

// ============================================
// Rich Content Types
// ============================================

/**
 * Rich content represents inline formatted text and elements
 */
export type RichContent = TextContent | InlineElement;

export interface TextContent {
  type: 'text';
  text: string;
  styles?: TextStyle[];
}

export type TextStyle = 
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code';

export type InlineElement = 
  | MentionElement
  | VariableElement
  | LinkElement
  | AnnotationElement;

export interface MentionElement {
  type: 'mention';
  mentionType: 'user' | 'document' | 'agent' | 'custom';
  id: string;
  label?: string;
}

export interface VariableElement {
  type: 'variable';
  name: string; // e.g., "previousResult", "currentDate"
  prompt?: string; // Optional prompt for user input
  value?: string; // Optional resolved value
}

export interface LinkElement {
  type: 'link';
  href: string;
  content: RichContent[];
}

export interface AnnotationElement {
  type: 'annotation';
  content: RichContent[];
  annotation: {
    title?: string;
    comment?: string;
    confidence?: number;
    [key: string]: unknown;
  };
}

// ============================================
// Utility Types
// ============================================

/**
 * Type guards for runtime type checking
 */
export function isContentBlock(block: Block): block is ContentBlock {
  return !isExecutableBlock(block);
}

export function isExecutableBlock(block: Block): block is ExecutableBlock {
  return block.type === 'function_call' || block.type === 'trigger';
}

export function isTextContent(content: RichContent): content is TextContent {
  return content.type === 'text';
}

export function isMention(content: RichContent): content is MentionElement {
  return content.type === 'mention';
}

export function isVariable(content: RichContent): content is VariableElement {
  return content.type === 'variable';
}

// ============================================
// Document Traversal Utilities
// ============================================

/**
 * Traverse all blocks in a document (including nested children)
 */
export function* traverseBlocks(blocks: Block[]): Generator<Block> {
  for (const block of blocks) {
    yield block;
    if ('children' in block && block.children) {
      yield* traverseBlocks(block.children);
    }
  }
}

/**
 * Find a block by ID
 */
export function findBlock(blocks: Block[], id: string): Block | undefined {
  for (const block of traverseBlocks(blocks)) {
    if (block.id === id) {
      return block;
    }
  }
  return undefined;
}

/**
 * Get all executable blocks
 */
export function getExecutableBlocks(blocks: Block[]): ExecutableBlock[] {
  const executable: ExecutableBlock[] = [];
  for (const block of traverseBlocks(blocks)) {
    if (isExecutableBlock(block)) {
      executable.push(block);
    }
  }
  return executable;
}

/**
 * Extract all mentions from a document
 */
export function extractMentions(blocks: Block[]): MentionElement[] {
  const mentions: MentionElement[] = [];
  
  function extractFromContent(content: RichContent[]) {
    for (const item of content) {
      if (isMention(item)) {
        mentions.push(item);
      } else if ('content' in item && Array.isArray(item.content)) {
        extractFromContent(item.content);
      }
    }
  }
  
  for (const block of traverseBlocks(blocks)) {
    if ('content' in block && Array.isArray(block.content)) {
      extractFromContent(block.content);
    }
    if (isExecutableBlock(block) && block.instructions) {
      extractFromContent(block.instructions);
    }
  }
  
  return mentions;
}

/**
 * Extract all variables from a document
 */
export function extractVariables(blocks: Block[]): VariableElement[] {
  const variables: VariableElement[] = [];
  
  function extractFromContent(content: RichContent[]) {
    for (const item of content) {
      if (isVariable(item)) {
        variables.push(item);
      } else if ('content' in item && Array.isArray(item.content)) {
        extractFromContent(item.content);
      }
    }
  }
  
  for (const block of traverseBlocks(blocks)) {
    if ('content' in block && Array.isArray(block.content)) {
      extractFromContent(block.content);
    }
    if (isExecutableBlock(block) && block.instructions) {
      extractFromContent(block.instructions);
    }
  }
  
  return variables;
}