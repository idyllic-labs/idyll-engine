/**
 * Response Pipeline System
 * 
 * Provides middleware-based processing of function execution results
 * before they are returned to the agent conversation loop.
 */

import { Message } from 'ai';

/**
 * Context provided to middleware for processing function results
 */
export interface MiddlewareContext {
  /** Name of the function that was executed */
  functionName: string;
  
  /** Parameters passed to the function */
  params: any;
  
  /** The raw result from function execution */
  result: any;
  
  /** Recent conversation messages for context-aware processing */
  messages?: Message[];
}

/**
 * Middleware interface for processing function results
 */
export interface ResponseMiddleware {
  /** Unique name for the middleware */
  name: string;
  
  /** Process the function result and return the modified result */
  process(context: MiddlewareContext): Promise<any>;
}

/**
 * Pipeline that processes function results through a chain of middleware
 */
export class ResponsePipeline {
  private middleware: ResponseMiddleware[] = [];
  
  /**
   * Add middleware to the pipeline
   */
  use(middleware: ResponseMiddleware): void {
    this.middleware.push(middleware);
  }
  
  /**
   * Process a function result through all middleware in order
   */
  async process(context: MiddlewareContext): Promise<any> {
    let result = context.result;
    
    // Process through each middleware sequentially
    for (const mw of this.middleware) {
      try {
        // Update the context with the current result for the next middleware
        const updatedContext = { ...context, result };
        result = await mw.process(updatedContext);
      } catch (error) {
        console.error(`[ResponsePipeline] Error in middleware ${mw.name}:`, error);
        // Continue with the current result if middleware fails
      }
    }
    
    return result;
  }
  
  /**
   * Check if any middleware is configured
   */
  hasMiddleware(): boolean {
    return this.middleware.length > 0;
  }
  
  /**
   * Get list of configured middleware names
   */
  getMiddlewareNames(): string[] {
    return this.middleware.map(mw => mw.name);
  }
}