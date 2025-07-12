/**
 * Document Executor for Idyllic Engine
 * 
 * Handles execution of executable blocks within documents,
 * maintaining execution state and providing context to tools.
 */

import { z } from 'zod';
import type { 
  IdyllDocument, 
  Block, 
  ExecutableBlock, 
  RichContent 
} from './ast';
import type {
  ExecutionState,
  ExecutionReport,
  ExecutionOptions,
  BlockExecutionResult,
  BlockExecutionContext,
  BlockExecutionError,
  ExecutionMetadata,
  ExecutionRequest,
} from './execution-types';

export class DocumentExecutor<TApi = any> {
  private options: ExecutionOptions<TApi>;
  
  constructor(options: ExecutionOptions<TApi>) {
    this.options = {
      stopOnError: false,
      timeout: 30000,
      ...options,
    };
  }
  
  /**
   * Execute a single block or entire document
   */
  async execute(request: ExecutionRequest): Promise<ExecutionReport> {
    if (request.mode === 'single') {
      return this.executeSingleBlock(request.document, request.blockId);
    } else {
      return this.executeDocument(request.document);
    }
  }
  
  /**
   * Execute all executable blocks in a document
   */
  async executeDocument(document: IdyllDocument): Promise<ExecutionReport> {
    const startTime = new Date();
    const state: ExecutionState = new Map();
    
    // Find all executable blocks
    const executableBlocks = this.findExecutableBlocks(document.blocks);
    const total = executableBlocks.length;
    
    // Execute blocks sequentially
    for (let i = 0; i < executableBlocks.length; i++) {
      const block = executableBlocks[i];
      
      // Progress callback
      this.options.onProgress?.(block.id, i + 1, total);
      
      // Create context for this block
      const context: BlockExecutionContext & { api?: TApi } = {
        currentBlockId: block.id,
        previousResults: new Map(state), // Copy current state
        document,
        api: this.options.api,
      };
      
      // Execute the block
      const result = await this.executeBlock(block, context);
      state.set(block.id, result);
      
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
      blocksExecuted: state.size,
      blocksSucceeded: Array.from(state.values()).filter(r => r.success).length,
      blocksFailed: Array.from(state.values()).filter(r => !r.success).length,
    };
    
    return { blocks: state, metadata };
  }
  
  /**
   * Execute a single block by ID
   */
  async executeSingleBlock(
    document: IdyllDocument, 
    blockId: string
  ): Promise<ExecutionReport> {
    const startTime = new Date();
    const state: ExecutionState = new Map();
    
    // Find the block
    const block = this.findBlockById(document.blocks, blockId);
    if (!block) {
      throw new Error(`Block with ID ${blockId} not found`);
    }
    
    if (!this.isExecutableBlock(block)) {
      throw new Error(`Block ${blockId} is not executable`);
    }
    
    // Build context with previous results (all blocks before this one)
    const previousResults = this.getPreviousResults(document, blockId);
    
    const context: BlockExecutionContext & { api?: TApi } = {
      currentBlockId: blockId,
      previousResults,
      document,
      api: this.options.api,
    };
    
    // Execute the block
    const result = await this.executeBlock(block as ExecutableBlock, context);
    state.set(blockId, result);
    
    const endTime = new Date();
    
    const metadata: ExecutionMetadata = {
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      blocksExecuted: 1,
      blocksSucceeded: result.success ? 1 : 0,
      blocksFailed: result.success ? 0 : 1,
    };
    
    return { blocks: state, metadata };
  }
  
  /**
   * Execute a single executable block
   */
  private async executeBlock(
    block: ExecutableBlock,
    context: BlockExecutionContext & { api?: TApi }
  ): Promise<BlockExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Resolve the tool
      const tool = this.options.tools[block.tool];
      if (!tool) {
        throw new Error(`Tool not found: ${block.tool}`);
      }
      
      // Validate parameters
      let validatedParams: any;
      try {
        validatedParams = tool.schema.parse(block.parameters);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
      }
      
      // Extract content as string
      const content = this.extractContent(block.instructions);
      
      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), this.options.timeout);
      });
      
      const data = await Promise.race([
        tool.execute(validatedParams, content, context),
        timeoutPromise,
      ]);
      
      return {
        success: true,
        data,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
      
    } catch (error) {
      const errorObj: BlockExecutionError = {
        message: error instanceof Error ? error.message : String(error),
        code: 'EXECUTION_ERROR',
        details: error,
      };
      
      return {
        success: false,
        error: errorObj,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }
  
  /**
   * Find all executable blocks in document
   */
  private findExecutableBlocks(blocks: Block[]): ExecutableBlock[] {
    const executable: ExecutableBlock[] = [];
    
    for (const block of blocks) {
      if (this.isExecutableBlock(block)) {
        executable.push(block as ExecutableBlock);
      }
      
      // Check children recursively
      if ('children' in block && block.children) {
        executable.push(...this.findExecutableBlocks(block.children));
      }
    }
    
    return executable;
  }
  
  /**
   * Find a block by ID
   */
  private findBlockById(blocks: Block[], id: string): Block | null {
    for (const block of blocks) {
      if (block.id === id) {
        return block;
      }
      
      // Check children
      if ('children' in block && block.children) {
        const found = this.findBlockById(block.children, id);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Get results from all blocks before the given block
   */
  private getPreviousResults(document: IdyllDocument, beforeBlockId: string): ExecutionState {
    const results: ExecutionState = new Map();
    const executableBlocks = this.findExecutableBlocks(document.blocks);
    
    // Find all blocks before the target block
    for (const block of executableBlocks) {
      if (block.id === beforeBlockId) {
        break;
      }
      // Note: We don't have actual results in this case, 
      // this would be populated from prior execution
      // For now, return empty state
    }
    
    return results;
  }
  
  /**
   * Check if a block is executable
   */
  private isExecutableBlock(block: Block): boolean {
    return block.type === 'function_call' || block.type === 'trigger';
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