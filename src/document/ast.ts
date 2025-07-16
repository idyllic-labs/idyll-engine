/**
 * Core AST types for Idyllic documents
 * 
 * This defines the semantic model for documents, independent of:
 * - BlockNote editor representation
 * - XML serialization format
 * - Specific function implementations
 */

// ============================================
// Core Document Types
// ============================================

/**
 * The root document structure
 */
export interface IdyllDocument {
  id: string;
  nodes: Node[];
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
  nodes: Node[];
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
  blocks: Node[];
}

export interface DeleteOperation {
  type: 'delete';
  blockId: string;
}

export interface ReplaceOperation {
  type: 'replace';
  blockId: string;
  blocks: Node[];
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
 * A node can be either content (text, headings, etc) or executable
 */
export type Node = ContentNode | ExecutableNode;


// ============================================
// Content Nodes
// ============================================

export interface ContentNode {
  id: string;
  type: ContentNodeType;
  content: RichContent[];
  children?: Node[];
  props?: Record<string, unknown>;
}

// Define node types directly
export type NodeType = 
  | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'ul' | 'ol' | 'li'
  | 'blockquote' | 'code' | 'pre'
  | 'hr' | 'br'
  | 'function_call' | 'trigger' | '_params' | '_content' | '_result'
  | 'heading' | 'paragraph';  // Added for compatibility

// ContentNodeType includes all content-related types
export type ContentNodeType = 
  | 'paragraph' | 'heading'
  | 'bulletListItem' | 'numberedListItem' | 'checklistItem'
  | 'code' | 'quote' | 'separator' | 'data' | 'function';

// ============================================
// Executable Nodes
// ============================================

export interface ExecutableNode {
  id: string;
  type: ExecutableNodeType;
  fn: string; // e.g., "documents:create", "ai:generate-text"
  parameters: Record<string, unknown>;
  content?: RichContent[]; // Natural language content/instructions
  result?: ExecutionResult;
  metadata?: ExecutableMetadata;
  props?: Record<string, unknown>; // Additional properties for compatibility
}

export type ExecutableNodeType = 'function_call' | 'trigger';


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
export function isContentNode(node: Node): node is ContentNode {
  return !isExecutableNode(node);
}


export function isExecutableNode(node: Node): node is ExecutableNode {
  return node.type === 'function_call' || node.type === 'trigger';
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
 * Traverse all nodes in a document (including nested children)
 */
export function* traverseNodes(nodes: Node[]): Generator<Node> {
  for (const node of nodes) {
    yield node;
    if ('children' in node && node.children) {
      yield* traverseNodes(node.children);
    }
  }
}


/**
 * Find a node by ID
 */
export function findNode(nodes: Node[], id: string): Node | undefined {
  for (const node of traverseNodes(nodes)) {
    if (node.id === id) {
      return node;
    }
  }
  return undefined;
}


/**
 * Get all executable nodes
 */
export function getExecutableNodes(nodes: Node[]): ExecutableNode[] {
  const executable: ExecutableNode[] = [];
  for (const node of traverseNodes(nodes)) {
    if (isExecutableNode(node)) {
      executable.push(node);
    }
  }
  return executable;
}


/**
 * Extract all mentions from a document
 */
export function extractMentions(nodes: Node[]): MentionElement[] {
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
  
  for (const node of traverseNodes(nodes)) {
    if ('content' in node && Array.isArray(node.content)) {
      extractFromContent(node.content);
    }
    if (isExecutableNode(node) && node.content) {
      extractFromContent(node.content);
    }
  }
  
  return mentions;
}

/**
 * Extract all variables from a document
 */
export function extractVariables(nodes: Node[]): VariableElement[] {
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
  
  for (const node of traverseNodes(nodes)) {
    if ('content' in node && Array.isArray(node.content)) {
      extractFromContent(node.content);
    }
    if (isExecutableNode(node) && node.content) {
      extractFromContent(node.content);
    }
  }
  
  return variables;
}