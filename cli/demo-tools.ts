/**
 * Demo Functions for CLI Testing
 * 
 * Provides a set of simple functions for testing document execution
 * without requiring external dependencies.
 */

import { z } from 'zod';
import { createFunctionRegistry, defineFunction } from '../document/function-registry';
import type { NodeExecutionContext } from '../document/execution-types';

export function createDemoTools() {
  return createFunctionRegistry({
    'demo:echo': defineFunction({
      schema: z.object({
        message: z.string().optional(),
        uppercase: z.boolean().optional().default(false),
      }),
      description: 'Echoes back the message or content',
      execute: async (params, content, context) => {
        const text = params.message || content || 'No message provided';
        return {
          message: params.uppercase ? text.toUpperCase() : text,
          nodeId: context.currentNodeId,
          timestamp: new Date().toISOString(),
        };
      },
    }),
    
    'demo:math': defineFunction({
      schema: z.object({
        operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
        a: z.number(),
        b: z.number(),
      }),
      description: 'Performs basic math operations',
      execute: async (params) => {
        let result: number;
        switch (params.operation) {
          case 'add':
            result = params.a + params.b;
            break;
          case 'subtract':
            result = params.a - params.b;
            break;
          case 'multiply':
            result = params.a * params.b;
            break;
          case 'divide':
            if (params.b === 0) {
              throw new Error('Division by zero');
            }
            result = params.a / params.b;
            break;
        }
        
        return {
          operation: params.operation,
          a: params.a,
          b: params.b,
          result,
          expression: `${params.a} ${params.operation} ${params.b} = ${result}`,
        };
      },
    }),
    
    'demo:random': defineFunction({
      schema: z.object({
        min: z.number().default(0),
        max: z.number().default(100),
        count: z.number().int().positive().default(1),
      }),
      description: 'Generates random numbers',
      execute: async (params) => {
        const numbers: number[] = [];
        const count = params.count ?? 1;
        const min = params.min ?? 1;
        const max = params.max ?? 100;
        for (let i = 0; i < count; i++) {
          numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        
        return {
          numbers,
          min,
          max,
          count,
        };
      },
    }),
    
    'demo:delay': defineFunction({
      schema: z.object({
        milliseconds: z.number().positive().default(1000),
      }),
      description: 'Delays execution for testing',
      execute: async (params) => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, params.milliseconds));
        const end = Date.now();
        
        return {
          requested: params.milliseconds,
          actual: end - start,
          message: `Delayed for ${end - start}ms`,
        };
      },
    }),
    
    'demo:fail': defineFunction({
      schema: z.object({
        message: z.string().default('This function always fails'),
        code: z.string().default('DEMO_ERROR'),
      }),
      description: 'Always fails for testing error handling',
      execute: async (params) => {
        throw new Error(params.message);
      },
    }),
    
    'demo:context': defineFunction({
      schema: z.object({}),
      description: 'Shows execution context information',
      execute: async (_, content, context: NodeExecutionContext) => {
        // Count previous results
        const previousCount = context.previousResults.size;
        const previousSuccess = Array.from(context.previousResults.values())
          .filter(r => r.success).length;
        const previousFailed = previousCount - previousSuccess;
        
        return {
          currentNode: context.currentNodeId,
          documentNodes: context.document.nodes.length,
          previousExecutions: {
            total: previousCount,
            success: previousSuccess,
            failed: previousFailed,
          },
          content: content || 'No content provided',
        };
      },
    }),
    
    'demo:aggregate': defineFunction({
      schema: z.object({
        operation: z.enum(['sum', 'average', 'concat']).default('sum'),
      }),
      description: 'Aggregates results from previous executions',
      execute: async (params, content, context: NodeExecutionContext) => {
        const previousResults = Array.from(context.previousResults.values())
          .filter(r => r.success)
          .map(r => r.data);
        
        if (previousResults.length === 0) {
          return {
            operation: params.operation,
            message: 'No previous successful results to aggregate',
            result: null,
          };
        }
        
        switch (params.operation) {
          case 'sum': {
            // Try to sum numeric values from previous results
            const numbers = previousResults.flatMap(data => {
              if (typeof data === 'number') return [data];
              if (typeof data === 'object' && data !== null) {
                return Object.values(data).filter(v => typeof v === 'number');
              }
              return [];
            });
            
            return {
              operation: 'sum',
              values: numbers,
              result: numbers.reduce((a, b) => a + b, 0),
            };
          }
          
          case 'average': {
            // Calculate average of numeric values
            const numbers = previousResults.flatMap(data => {
              if (typeof data === 'number') return [data];
              if (typeof data === 'object' && data !== null) {
                return Object.values(data).filter(v => typeof v === 'number');
              }
              return [];
            });
            
            const sum = numbers.reduce((a, b) => a + b, 0);
            return {
              operation: 'average',
              values: numbers,
              sum,
              count: numbers.length,
              result: numbers.length > 0 ? sum / numbers.length : 0,
            };
          }
          
          case 'concat': {
            // Concatenate string values
            const strings = previousResults.flatMap(data => {
              if (typeof data === 'string') return [data];
              if (typeof data === 'object' && data !== null) {
                return Object.values(data).filter(v => typeof v === 'string');
              }
              return [];
            });
            
            return {
              operation: 'concat',
              values: strings,
              result: strings.join(' '),
            };
          }
        }
      },
    }),
    
    'demo:condition': defineFunction({
      schema: z.object({
        check: z.enum(['has-errors', 'all-success', 'count-gt', 'count-lt']),
        value: z.number().optional(),
      }),
      description: 'Conditional execution based on previous results',
      execute: async (params, content, context: NodeExecutionContext) => {
        const previousResults = Array.from(context.previousResults.values());
        const hasErrors = previousResults.some(r => !r.success);
        const allSuccess = previousResults.every(r => r.success);
        const count = previousResults.length;
        
        let conditionMet = false;
        let reason = '';
        
        switch (params.check) {
          case 'has-errors':
            conditionMet = hasErrors;
            reason = `Previous executions ${hasErrors ? 'had' : 'had no'} errors`;
            break;
            
          case 'all-success':
            conditionMet = allSuccess;
            reason = `Previous executions ${allSuccess ? 'were all' : 'were not all'} successful`;
            break;
            
          case 'count-gt':
            conditionMet = count > (params.value || 0);
            reason = `Previous execution count (${count}) ${conditionMet ? 'is greater than' : 'is not greater than'} ${params.value || 0}`;
            break;
            
          case 'count-lt':
            conditionMet = count < (params.value || 0);
            reason = `Previous execution count (${count}) ${conditionMet ? 'is less than' : 'is not less than'} ${params.value || 0}`;
            break;
        }
        
        return {
          check: params.check,
          conditionMet,
          reason,
          previousCount: count,
          message: conditionMet ? 'Condition met!' : 'Condition not met',
        };
      },
    }),
  });
}