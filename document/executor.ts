/**
 * Document Executor for Idyllic Engine
 * 
 * Handles execution of executable nodes within documents,
 * maintaining execution state and providing context to functions.
 */

import { z } from 'zod';
import type { 
  IdyllDocument, 
  Node, 
  ExecutableNode, 
  RichContent 
} from './ast';
import type {
  ExecutionState,
  ExecutionReport,
  ExecutionOptions,
  NodeExecutionResult,
  NodeExecutionContext,
  NodeExecutionError,
  ExecutionMetadata,
  ExecutionRequest,
  ExecutionHooks,
} from './execution-types';
import { AbstractFunctionExecutor } from './abstract-function-executor';

export class DocumentExecutor<TApi = any> extends AbstractFunctionExecutor {
  private options: ExecutionOptions<TApi>;
  
  constructor(options: ExecutionOptions<TApi>) {
    super(options.hooks);
    this.options = {
      stopOnError: false,
      timeout: 30000,
      ...options,
    };
  }
  
  /**
   * Execute a single node or entire document
   */
  async execute(request: ExecutionRequest): Promise<ExecutionReport> {
    if (request.mode === 'single') {
      return this.executeSingleNode(request.document, (request as any).nodeId!);
    } else {
      return this.executeDocument(request.document);
    }
  }
  
  /**
   * Execute all executable nodes in a document
   */
  async executeDocument(document: IdyllDocument): Promise<ExecutionReport> {
    const startTime = new Date();
    const state: ExecutionState = new Map();
    
    // Find all executable nodes
    const executableNodes = this.findExecutableNodes(document.nodes);
    const total = executableNodes.length;
    
    // Execute nodes sequentially
    for (let i = 0; i < executableNodes.length; i++) {
      const node = executableNodes[i];
      
      // Progress callback
      this.options.onProgress?.(node.id, i + 1, total);
      
      // Create context for this node
      const context: NodeExecutionContext & { api?: TApi } = {
        currentNodeId: node.id,
        previousResults: new Map(state), // Copy current state
        document,
        api: this.options.api,
      };
      
      // Execute the node using shared execution logic
      const func = this.options.functions[node.fn];
      if (!func) {
        const errorResult: NodeExecutionResult = {
          success: false,
          error: {
            message: `Function not found: ${node.fn}`,
            code: 'FUNCTION_NOT_FOUND',
            details: { functionName: node.fn }
          },
          duration: 0,
          timestamp: new Date(),
        };
        state.set(node.id, errorResult);
        continue;
      }
      
      // Validate parameters
      let validatedParams: any;
      try {
        validatedParams = func.schema.parse(node.parameters);
      } catch (error) {
        const errorResult: NodeExecutionResult = {
          success: false,
          error: {
            message: error instanceof z.ZodError 
              ? `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`
              : 'Parameter validation failed',
            code: 'INVALID_PARAMETERS',
            details: error
          },
          duration: 0,
          timestamp: new Date(),
        };
        state.set(node.id, errorResult);
        continue;
      }
      
      // Extract content as string
      const content = this.extractContent(node.content);
      
      // Execute using shared logic with hooks
      const result = await this.executeFunction(node.fn, func, validatedParams, content, context);
      state.set(node.id, result);
      
      // Stop on error if requested
      if (!result.success && this.options.stopOnError) {
        break;
      }
    }
    
    const endTime = new Date();
    
    // Calculate metadata
    const metadata: ExecutionMetadata = {
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      nodesExecuted: state.size,
      nodesSucceeded: Array.from(state.values()).filter(r => r.success).length,
      nodesFailed: Array.from(state.values()).filter(r => !r.success).length,
    };
    
    return { nodes: state, metadata };
  }
  
  /**
   * Execute a single node by ID
   */
  async executeSingleNode(
    document: IdyllDocument, 
    nodeId: string
  ): Promise<ExecutionReport> {
    const startTime = new Date();
    const state: ExecutionState = new Map();
    
    // Find the node
    const node = this.findNodeById(document.nodes || (document as any).blocks, nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    
    if (!this.isExecutableNode(node)) {
      throw new Error(`Node ${nodeId} is not executable`);
    }
    
    // Build context with previous results (all nodes before this one)
    const previousResults = this.getPreviousResults(document, nodeId);
    
    const context: NodeExecutionContext & { api?: TApi } = {
      currentNodeId: nodeId,
      previousResults,
      document,
      api: this.options.api,
    };
    
    // Execute the node using shared execution logic
    const executableNode = node as ExecutableNode;
    const func = this.options.functions[executableNode.fn];
    if (!func) {
      throw new Error(`Function not found: ${executableNode.fn}`);
    }
    
    // Validate parameters
    let validatedParams: any;
    try {
      validatedParams = func.schema.parse(executableNode.parameters);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
    
    // Extract content as string
    const content = this.extractContent(executableNode.content);
    
    // Execute using shared logic with hooks
    const result = await this.executeFunction(executableNode.fn, func, validatedParams, content, context);
    state.set(nodeId, result);
    
    const endTime = new Date();
    
    const metadata: ExecutionMetadata = {
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      nodesExecuted: 1,
      nodesSucceeded: result.success ? 1 : 0,
      nodesFailed: result.success ? 0 : 1,
    };
    
    return { nodes: state, metadata };
  }
  
  
  /**
   * Find all executable nodes in document
   */
  private findExecutableNodes(nodes: Node[]): ExecutableNode[] {
    const executable: ExecutableNode[] = [];
    
    for (const node of nodes) {
      if (this.isExecutableNode(node)) {
        executable.push(node as ExecutableNode);
      }
      
      // Check children recursively
      if ('children' in node && node.children) {
        executable.push(...this.findExecutableNodes(node.children));
      }
    }
    
    return executable;
  }
  
  /**
   * Find a node by ID
   */
  private findNodeById(nodes: Node[], id: string): Node | null {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      
      // Check children
      if ('children' in node && node.children) {
        const found = this.findNodeById(node.children, id);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Get results from all nodes before the given node
   */
  private getPreviousResults(document: IdyllDocument, beforeNodeId: string): ExecutionState {
    const results: ExecutionState = new Map();
    const executableNodes = this.findExecutableNodes(document.nodes);
    
    // Find all nodes before the target node
    for (const node of executableNodes) {
      if (node.id === beforeNodeId) {
        break;
      }
      // Note: We don't have actual results in this case, 
      // this would be populated from prior execution
      // For now, return empty state
    }
    
    return results;
  }
  
  /**
   * Check if a node is executable
   */
  private isExecutableNode(node: Node): boolean {
    return node.type === 'function_call' || node.type === 'trigger';
  }
  
  /**
   * Extract text content from rich content
   */
  private extractContent(content?: RichContent[]): string {
    if (!content) return '';
    
    return content
      .map(item => {
        if ('text' in item) {
          return item.text;
        }
        return '';
      })
      .join('');
  }
}