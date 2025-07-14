/**
 * Execution Types for Idyllic Document Engine
 * 
 * Defines all types related to document execution, including
 * execution state, results, context, and tool definitions.
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

// Backward compatibility
export type BlockExecutionResult = NodeExecutionResult;

export interface NodeExecutionError {
  message: string;
  code?: string;
  details?: unknown;
}

// Backward compatibility
export type BlockExecutionError = NodeExecutionError;

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
 * Context provided to tools during execution
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

// Backward compatibility
export type BlockExecutionContext = NodeExecutionContext;

// ============================================
// Custom Tool Execution
// ============================================

/**
 * Report returned from custom tool execution
 */
export interface ToolExecutionReport {
  /** All resolved variables */
  variables: Map<string, string>;
  
  /** All node execution results in order */
  nodes: Map<string, NodeExecutionResult>;
  
  /** Execution metadata */
  metadata: {
    toolName: string;
    duration: number;
    nodesExecuted: number;
    nodesSucceeded: number;
    nodesFailed: number;
  };
  
  /** The tool definition for reference */
  toolDefinition: any; // Will be ToolNode when we add it to AST
}

// ============================================
// Tool Definitions
// ============================================

/**
 * Tool executor function signature
 */
export type ToolExecutor<TParams = any, TApi = any> = (
  params: TParams,
  content: string,
  context: NodeExecutionContext & { api?: TApi }
) => Promise<unknown> | unknown;

/**
 * Tool definition with schema and executor
 */
export interface ToolDefinition<TParams = any, TApi = any> {
  /** Zod schema for parameter validation */
  schema: z.ZodSchema<TParams>;
  
  /** Function that executes the tool */
  execute: ToolExecutor<TParams, TApi>;
  
  /** Optional description for documentation */
  description?: string;
}

/**
 * Registry of tools available for execution
 */
export type ToolRegistry<TApi = any> = Record<string, ToolDefinition<any, TApi>>;

// ============================================
// Execution Options
// ============================================

/**
 * Options for document execution
 */
export interface ExecutionOptions<TApi = any> {
  /** Tools available for execution */
  tools: ToolRegistry<TApi>;
  
  /** Optional API/services to inject into tool context */
  api?: TApi;
  
  /** Whether to stop on first error (default: false) */
  stopOnError?: boolean;
  
  /** Maximum execution time per node in ms (default: 30000) */
  timeout?: number;
  
  /** Optional callback for execution progress */
  onProgress?: (nodeId: string, index: number, total: number) => void;
}

// ============================================
// Execution Modes
// ============================================

export type ExecutionMode = 'single' | 'document';

export interface SingleNodeExecutionRequest {
  mode: 'single';
  document: IdyllDocument;
  nodeId?: string;
  blockId?: string; // Backward compatibility
  options: ExecutionOptions;
}

// Backward compatibility
export type SingleBlockExecutionRequest = SingleNodeExecutionRequest;

export interface DocumentExecutionRequest {
  mode: 'document';
  document: IdyllDocument;
  options: ExecutionOptions;
}

export type ExecutionRequest = SingleNodeExecutionRequest | DocumentExecutionRequest;