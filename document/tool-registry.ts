/**
 * Tool Registry for Idyllic Engine
 * 
 * Provides utilities for managing and creating tool registries
 * with proper type safety and validation.
 */

import { z } from 'zod';
import type { ToolRegistry, ToolDefinition, BlockExecutionContext } from './execution-types';

/**
 * Create a type-safe tool registry
 */
export function createToolRegistry<TApi = any>(
  tools: ToolRegistry<TApi>
): ToolRegistry<TApi> {
  return tools;
}

/**
 * Define a single tool with type inference
 */
export function defineTool<TParams = any, TApi = any>(
  definition: {
    schema: z.ZodSchema<TParams>;
    execute: (params: TParams, content: string, context: BlockExecutionContext & { api?: TApi }) => Promise<any> | any;
    description?: string;
  }
): ToolDefinition<TParams, TApi> {
  return definition;
}

/**
 * Merge multiple tool registries
 */
export function mergeToolRegistries<TApi = any>(
  ...registries: ToolRegistry<TApi>[]
): ToolRegistry<TApi> {
  return registries.reduce((merged, registry) => {
    return { ...merged, ...registry };
  }, {} as ToolRegistry<TApi>);
}

/**
 * Create a tool registry from a simple function map
 * (for quick testing without schemas)
 */
export function createSimpleRegistry<TApi = any>(
  tools: Record<string, (params: any, content: string, context?: BlockExecutionContext & { api?: TApi }) => any>
): ToolRegistry<TApi> {
  const registry: ToolRegistry<TApi> = {};
  
  for (const [name, fn] of Object.entries(tools)) {
    registry[name] = {
      schema: z.any(), // Accept any params
      execute: (params, content, context) => fn(params, content, context),
    };
  }
  
  return registry;
}