/**
 * Execution Types for Idyllic Document Engine
 * 
 * Defines all types related to document execution, including
 * execution state, results, context, and function definitions.
 */

import { z } from 'zod';
import type { IdyllDocument, Node, ExecutableNode } from './ast';

// ============================================
// Execution Results
// ============================================

export interface NodeExecutionResult {
  success: boolean;
  data?: unknown;
  error?: NodeExecutionError;
  duration: number;
  timestamp: Date;
}


export interface NodeExecutionError {
  message: string;
  code?: string;
  details?: unknown;
}


// ============================================
// Execution State
// ============================================

/**
 * Execution state maintains results as nodes are executed.
 * Using Map to preserve insertion order.
 */
export type ExecutionState = Map<string, NodeExecutionResult>;

export interface ExecutionReport {
  /** Ordered map of node IDs to their execution results */
  nodes: ExecutionState;
  
  /** Overall execution metadata */
  metadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  nodesExecuted: number;
  nodesSucceeded: number;
  nodesFailed: number;
}

// ============================================
// Execution Context
// ============================================

/**
 * Context provided to functions during execution
 */
export interface NodeExecutionContext {
  /** ID of the currently executing node */
  currentNodeId: string;
  
  /** Results from all previously executed nodes */
  previousResults: ExecutionState;
  
  /** Read-only reference to the document */
  document: IdyllDocument;
  
  /** Optional host-provided API/services */
  api?: unknown;
}


// ============================================
// Custom Function Execution
// ============================================

/**
 * Report returned from custom function execution
 */
export interface FunctionExecutionReport {
  /** All resolved variables */
  variables: Map<string, string>;
  
  /** All node execution results in order */
  nodes: Map<string, NodeExecutionResult>;
  
  /** Execution metadata */
  metadata: {
    functionName: string;
    duration: number;
    nodesExecuted: number;
    nodesSucceeded: number;
    nodesFailed: number;
  };
  
  /** The function definition for reference */
  functionDefinition: any; // Will be FunctionNode when we add it to AST
}

// ============================================
// Execution Hooks
// ============================================

/**
 * Hooks for function execution instrumentation
 */
export interface ExecutionHooks {
  beforeExecution?: (functionName: string, params: any, context: NodeExecutionContext) => Promise<void> | void;
  afterExecution?: (functionName: string, result: unknown, duration: number) => Promise<void> | void;
  onError?: (functionName: string, error: unknown, duration: number) => Promise<void> | void;
}

// ============================================
// Function Definitions
// ============================================

/**
 * Function implementation signature
 */
export type FunctionImpl<TParams = any, TApi = any> = (
  params: TParams,
  content: string,
  context: NodeExecutionContext & { api?: TApi }
) => Promise<unknown> | unknown;

/**
 * Function definition with schema and executor
 */
export interface FunctionDefinition<TParams = any, TApi = any> {
  /** Zod schema for parameter validation */
  schema: z.ZodSchema<TParams>;
  
  /** Function that executes the function */
  execute: FunctionImpl<TParams, TApi>;
  
  /** Optional description for documentation */
  description?: string;
}

/**
 * Registry of functions available for execution
 */
export type FunctionRegistry<TApi = any> = Record<string, FunctionDefinition<any, TApi>>;


// ============================================
// Execution Options
// ============================================

/**
 * Options for document execution
 */
export interface ExecutionOptions<TApi = any> {
  /** Functions available for execution */
  functions: FunctionRegistry<TApi>;
  
  /** Optional API/services to inject into function context */
  api?: TApi;
  
  /** Whether to stop on first error (default: false) */
  stopOnError?: boolean;
  
  /** Maximum execution time per node in ms (default: 30000) */
  timeout?: number;
  
  /** Optional callback for execution progress */
  onProgress?: (nodeId: string, index: number, total: number) => void;
  
  /** Optional execution hooks for instrumentation */
  hooks?: ExecutionHooks;
}

// ============================================
// Execution Modes
// ============================================

export type ExecutionMode = 'single' | 'document';

export interface SingleNodeExecutionRequest {
  mode: 'single';
  document: IdyllDocument;
  nodeId?: string;
  options: ExecutionOptions;
}


export interface DocumentExecutionRequest {
  mode: 'document';
  document: IdyllDocument;
  options: ExecutionOptions;
}

export type ExecutionRequest = SingleNodeExecutionRequest | DocumentExecutionRequest;