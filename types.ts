/**
 * Consolidated type definitions for Idyll Engine
 */

import type { MentionElement, VariableElement } from './document/ast';

// ============================================
// Validation Context
// ============================================

/**
 * Context for validating document references
 */
export interface ValidationContext {
  /**
   * Validate that a mention reference exists
   * @param mention The mention to validate
   * @returns True if valid, false otherwise
   */
  validateMention?(mention: MentionElement): boolean;
  
  /**
   * Validate that a variable exists and optionally get its value
   * @param variable The variable to validate
   * @returns Validation result with optional value
   */
  validateVariable?(variable: VariableElement): {
    valid: boolean;
    value?: unknown;
  };
  
  /**
   * Validate that a tool exists
   * @param toolName The tool name to validate
   * @returns True if tool exists, false otherwise
   */
  validateTool?(toolName: string): boolean;
}

// ============================================
// Execution Context
// ============================================

/**
 * Runtime context for document/agent execution
 */
export interface ExecutionContext {
  /**
   * User performing the execution
   */
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  
  /**
   * Available variables during execution
   */
  variables: Record<string, unknown>;
  
  /**
   * Resolve a mention to its value
   * @param mention The mention to resolve
   * @returns The resolved value or undefined
   */
  resolveMention?(mention: MentionElement): unknown;
  
  /**
   * Resolve a variable to its value
   * @param variable The variable to resolve
   * @returns The resolved value or undefined
   */
  resolveVariable?(variable: VariableElement): unknown;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Context specific to document execution
 */
export interface DocumentExecutionContext extends ExecutionContext {
  /**
   * Document being executed
   */
  documentId: string;
  
  /**
   * Whether the user can edit the document
   */
  canEdit: boolean;
}

/**
 * Context specific to agent execution
 */
export interface AgentExecutionContext extends ExecutionContext {
  /**
   * Agent performing the execution
   */
  agentId: string;
  
  /**
   * Thread ID if in a conversation
   */
  threadId?: string;
  
  /**
   * Conversation history if available
   */
  messages?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

// ============================================
// Tool Definition
// ============================================

/**
 * Definition of a tool that can be executed
 */
export interface ToolDefinition {
  /**
   * Unique tool identifier (e.g., "documents:create")
   */
  name: string;
  
  /**
   * Human-readable title
   */
  title?: string;
  
  /**
   * Tool description
   */
  description?: string;
  
  /**
   * Whether the tool requires content/instructions
   */
  contentRequirement?: 'required' | 'optional' | 'disabled';
  
  /**
   * Validate parameters before execution
   * @param params The parameters to validate
   * @returns Validation result
   */
  validate(params: unknown): ToolValidationResult;
}

export type ToolValidationResult = 
  | { success: true }
  | { success: false; errors: string[] };

// ============================================
// Tool Resolution & Execution
// ============================================

/**
 * Interface for resolving tool definitions
 */
export interface ToolResolver {
  /**
   * Resolve a tool by name
   * @param name Tool identifier
   * @returns Tool definition or null if not found
   */
  resolve(name: string): ToolDefinition | null;
  
  /**
   * List all available tools
   * @returns Array of tool names
   */
  list?(): string[];
}

/**
 * Interface for executing tools
 */
export interface ToolExecutor {
  /**
   * Execute a tool with given parameters
   * @param tool Tool name
   * @param params Tool parameters (already validated)
   * @param context Execution context
   * @returns Tool execution result
   */
  execute(
    tool: string, 
    params: Record<string, unknown>, 
    context: ToolExecutionContext
  ): Promise<ToolResult>;
}

/**
 * Context provided during tool execution
 */
export interface ToolExecutionContext {
  /**
   * Execution mode - where the tool is being executed from
   */
  mode: 'document' | 'agent';
  
  /**
   * User executing the tool
   */
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  
  /**
   * Instructions/content provided with the tool call
   */
  instructions?: string;
  
  /**
   * Document-specific context
   */
  document?: {
    id: string;
    nodeId: string;
  };
  
  /**
   * Agent-specific context
   */
  agent?: {
    id: string;
    threadId?: string;
  };
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

// ============================================
// Tool Results
// ============================================

/**
 * Result from tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: ToolError;
  /**
   * Human-readable message about the result
   */
  message?: string;
}

export interface ToolError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Helper class for creating tool results
 */
export class ToolResponse {
  static success(data: unknown, message?: string): ToolResult {
    return {
      success: true,
      data,
      message,
    };
  }
  
  static error(error: string | ToolError, details?: unknown): ToolResult {
    if (typeof error === 'string') {
      return {
        success: false,
        error: {
          code: 'TOOL_ERROR',
          message: error,
          details,
        },
      };
    }
    return {
      success: false,
      error,
    };
  }
  
  static empty(): ToolResult {
    return {
      success: true,
    };
  }
}

// ============================================
// Error Types
// ============================================

/**
 * Base error class for all engine errors
 */
export class IdyllEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'IdyllEngineError';
  }
}

/**
 * Error during document parsing
 */
export class ParseError extends IdyllEngineError {
  constructor(message: string, details?: unknown) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}

/**
 * Error during document validation
 */
export class ValidationError extends IdyllEngineError {
  constructor(
    message: string,
    public errors: string[],
    details?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Error during tool execution
 */
export class ToolExecutionError extends IdyllEngineError {
  constructor(
    message: string,
    public toolName: string,
    public nodeId?: string,
    details?: unknown
  ) {
    super(message, 'TOOL_EXECUTION_ERROR', details);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Error when a tool is not found
 */
export class ToolNotFoundError extends IdyllEngineError {
  constructor(toolName: string) {
    super(`Tool not found: ${toolName}`, 'TOOL_NOT_FOUND', { toolName });
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Error during agent execution
 */
export class AgentExecutionError extends IdyllEngineError {
  constructor(
    message: string,
    public agentId: string,
    details?: unknown
  ) {
    super(message, 'AGENT_EXECUTION_ERROR', details);
    this.name = 'AgentExecutionError';
  }
}

// ============================================
// Error Utilities
// ============================================

/**
 * Check if an error is an engine error
 */
export function isIdyllEngineError(error: unknown): error is IdyllEngineError {
  return error instanceof IdyllEngineError;
}

/**
 * Format error for display
 */
export function formatError(error: unknown): string {
  if (isIdyllEngineError(error)) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}