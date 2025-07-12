/**
 * Execution Types for Idyllic Document Engine
 * 
 * Defines all types related to document execution, including
 * execution state, results, context, and tool definitions.
 */

import { z } from 'zod';
import type { IdyllDocument, Block, ExecutableBlock } from './ast';

// ============================================
// Execution Results
// ============================================

export interface BlockExecutionResult {
  success: boolean;
  data?: unknown;
  error?: BlockExecutionError;
  duration: number;
  timestamp: Date;
}

export interface BlockExecutionError {
  message: string;
  code?: string;
  details?: unknown;
}

// ============================================
// Execution State
// ============================================

/**
 * Execution state maintains results as blocks are executed.
 * Using Map to preserve insertion order.
 */
export type ExecutionState = Map<string, BlockExecutionResult>;

export interface ExecutionReport {
  /** Ordered map of block IDs to their execution results */
  blocks: ExecutionState;
  
  /** Overall execution metadata */
  metadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  blocksExecuted: number;
  blocksSucceeded: number;
  blocksFailed: number;
}

// ============================================
// Execution Context
// ============================================

/**
 * Context provided to tools during execution
 */
export interface BlockExecutionContext {
  /** ID of the currently executing block */
  currentBlockId: string;
  
  /** Results from all previously executed blocks */
  previousResults: ExecutionState;
  
  /** Read-only reference to the document */
  document: IdyllDocument;
  
  /** Optional host-provided API/services */
  api?: unknown;
}

// ============================================
// Custom Tool Execution
// ============================================

/**
 * Context returned from custom tool execution
 */
export interface ToolExecutionContext {
  /** All resolved variables */
  variables: Map<string, string>;
  
  /** All block execution results in order */
  blocks: Map<string, BlockExecutionResult>;
  
  /** Execution metadata */
  metadata: {
    toolName: string;
    duration: number;
    blocksExecuted: number;
    blocksSucceeded: number;
    blocksFailed: number;
  };
  
  /** The tool definition for reference */
  toolDefinition: any; // Will be ToolBlock when we add it to AST
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
  context: BlockExecutionContext & { api?: TApi }
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
  
  /** Maximum execution time per block in ms (default: 30000) */
  timeout?: number;
  
  /** Optional callback for execution progress */
  onProgress?: (blockId: string, index: number, total: number) => void;
}

// ============================================
// Execution Modes
// ============================================

export type ExecutionMode = 'single' | 'document';

export interface SingleBlockExecutionRequest {
  mode: 'single';
  document: IdyllDocument;
  blockId: string;
  options: ExecutionOptions;
}

export interface DocumentExecutionRequest {
  mode: 'document';
  document: IdyllDocument;
  options: ExecutionOptions;
}

export type ExecutionRequest = SingleBlockExecutionRequest | DocumentExecutionRequest;