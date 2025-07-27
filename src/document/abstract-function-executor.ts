/**
 * Abstract Function Executor
 * 
 * Base class for all function execution strategies, providing
 * shared execution logic with hooks and instrumentation.
 */

import { 
  NodeExecutionContext, 
  ExecutionHooks, 
  FunctionDefinition,
  NodeExecutionResult
} from './execution-types';

/**
 * Abstract base class for function execution with hooks and instrumentation
 */
export abstract class AbstractFunctionExecutor {
  protected hooks: ExecutionHooks;
  
  constructor(hooks?: ExecutionHooks) {
    this.hooks = hooks || {};
  }
  
  /**
   * Execute a function with shared hooks and instrumentation
   */
  protected async executeFunction(
    functionName: string,
    fndef: FunctionDefinition,
    params: any,
    content: string,
    context: NodeExecutionContext
  ): Promise<NodeExecutionResult> {
    // Pre-execution hooks
    await this.hooks.beforeExecution?.(functionName, params, context);
    
    const startTime = performance.now();
    
    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(fndef.execute, params, content, context);
      
      const duration = performance.now() - startTime;
      
      // Post-execution hooks
      await this.hooks.afterExecution?.(functionName, result, duration, context);
      
      return {
        success: true,
        data: result,
        duration,
        timestamp: new Date()
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Error hooks
      await this.hooks.onError?.(functionName, error, duration, context);
      
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
          details: error
        },
        duration,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Execute function implementation with timeout
   */
  private async executeWithTimeout(
    impl: FunctionDefinition['execute'],
    params: any,
    content: string,
    context: NodeExecutionContext,
    timeout: number = 30000
  ): Promise<unknown> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Function execution timed out after ${timeout}ms`));
      }, timeout);
      
      try {
        const result = await impl(params, content, context);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * Abstract method for specific execution strategies
   */
  abstract execute(request: any): Promise<any>;
}