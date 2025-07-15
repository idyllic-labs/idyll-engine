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
   * Validate that a function exists
   * @param functionName The function name to validate
   * @returns True if function exists, false otherwise
   */
  validateFunction?(functionName: string): boolean;
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
// Function Definition
// ============================================

/**
 * Definition of a function that can be executed
 */
export interface FunctionDefinition {
  /**
   * Unique function identifier (e.g., "documents:create")
   */
  name: string;
  
  /**
   * Human-readable title
   */
  title?: string;
  
  /**
   * Function description
   */
  description?: string;
  
  /**
   * Whether the function requires content/instructions
   */
  contentRequirement?: 'required' | 'optional' | 'disabled';
  
  /**
   * Validate parameters before execution
   * @param params The parameters to validate
   * @returns Validation result
   */
  validate(params: unknown): FunctionValidationResult;
}

export type FunctionValidationResult = 
  | { success: true }
  | { success: false; errors: string[] };

// ============================================
// Function Resolution & Execution
// ============================================

/**
 * Interface for resolving function definitions
 */
export interface FunctionResolver {
  /**
   * Resolve a function by name
   * @param name Function identifier
   * @returns Function definition or null if not found
   */
  resolve(name: string): FunctionDefinition | null;
  
  /**
   * List all available functions
   * @returns Array of function names
   */
  list?(): string[];
}

/**
 * Interface for executing functions
 */
export interface FunctionExecutor {
  /**
   * Execute a function with given parameters
   * @param functionName Function name
   * @param params Function parameters (already validated)
   * @param context Execution context
   * @returns Function execution result
   */
  execute(
    functionName: string, 
    params: Record<string, unknown>, 
    context: FunctionExecutionContext
  ): Promise<FunctionResult>;
}

/**
 * Context provided during function execution
 */
export interface FunctionExecutionContext {
  /**
   * Execution mode - where the function is being executed from
   */
  mode: 'document' | 'agent';
  
  /**
   * User executing the function
   */
  user: {
    id: string;
    name?: string;
    email?: string;
  };
  
  /**
   * Instructions/content provided with the function call
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
// Function Results
// ============================================

/**
 * Result from function execution
 */
export interface FunctionResult {
  success: boolean;
  data?: unknown;
  error?: FunctionError;
  /**
   * Human-readable message about the result
   */
  message?: string;
}

export interface FunctionError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Helper class for creating function results
 */
export class FunctionResponse {
  static success(data: unknown, message?: string): FunctionResult {
    return {
      success: true,
      data,
      message,
    };
  }
  
  static error(error: string | FunctionError, details?: unknown): FunctionResult {
    if (typeof error === 'string') {
      return {
        success: false,
        error: {
          code: 'FUNCTION_ERROR',
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
  
  static empty(): FunctionResult {
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
 * Error during function execution
 */
export class FunctionExecutionError extends IdyllEngineError {
  constructor(
    message: string,
    public functionName: string,
    public nodeId?: string,
    details?: unknown
  ) {
    super(message, 'FUNCTION_EXECUTION_ERROR', details);
    this.name = 'FunctionExecutionError';
  }
}

/**
 * Error when a function is not found
 */
export class FunctionNotFoundError extends IdyllEngineError {
  constructor(functionName: string) {
    super(`Function not found: ${functionName}`, 'FUNCTION_NOT_FOUND', { functionName });
    this.name = 'FunctionNotFoundError';
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