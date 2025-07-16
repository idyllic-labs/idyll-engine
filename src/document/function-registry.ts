/**
 * Function Registry for Idyllic Engine
 * 
 * Provides utilities for managing and creating function registries
 * with proper type safety and validation.
 */

import { z } from 'zod';
import type { FunctionRegistry, FunctionDefinition, NodeExecutionContext } from './execution-types';

// Re-export types for external use
export type { FunctionRegistry, FunctionDefinition } from './execution-types';

/**
 * Create a type-safe function registry
 */
export function createFunctionRegistry<TApi = any>(
  functions: FunctionRegistry<TApi>
): FunctionRegistry<TApi> {
  return functions;
}

/**
 * Define a single function with type inference
 */
export function defineFunction<TParams = any, TApi = any>(
  definition: {
    schema: z.ZodSchema<TParams>;
    execute: (params: TParams, content: string, context: NodeExecutionContext & { api?: TApi }) => Promise<any> | any;
    description?: string;
  }
): FunctionDefinition<TParams, TApi> {
  return definition;
}

/**
 * Merge multiple function registries
 */
export function mergeFunctionRegistries<TApi = any>(
  ...registries: FunctionRegistry<TApi>[]
): FunctionRegistry<TApi> {
  return registries.reduce((merged, registry) => {
    return { ...merged, ...registry };
  }, {} as FunctionRegistry<TApi>);
}

/**
 * Create a function registry from a simple function map
 * (for quick testing without schemas)
 */
export function createSimpleRegistry<TApi = any>(
  functions: Record<string, (params: any, content: string, context?: NodeExecutionContext & { api?: TApi }) => any>
): FunctionRegistry<TApi> {
  const registry: FunctionRegistry<TApi> = {};
  
  for (const [name, fn] of Object.entries(functions)) {
    registry[name] = {
      schema: z.any(), // Accept any params
      execute: (params, content, context) => fn(params, content, context),
    };
  }
  
  return registry;
}