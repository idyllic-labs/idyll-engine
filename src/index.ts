/**
 * @idyllic-labs/idyll-engine
 * 
 * Document execution engine for Idyllic
 */

// Document AST types
export * from './document/ast';

// Document parsing and serialization
export { parseXmlToAst, serializeAstToXml } from './grammar/parser';

// Document execution
export { DocumentExecutor } from './document/executor';
export { AbstractFunctionExecutor } from './document/abstract-function-executor';
export * from './document/execution-types';
export { 
  createFunctionRegistry, 
  defineFunction, 
  mergeFunctionRegistries, 
  createSimpleRegistry
} from './document/function-registry';

// Function naming utilities
export { 
  toAzureFunctionName, 
  fromAzureFunctionName, 
  validateFunctionName, 
  parseFunctionName, 
  buildFunctionName
} from './document/function-naming';

// Document validation
export { validateDocument, formatValidationIssues } from './document/validator';

// Core types
export { 
  type ValidationContext,
  type ExecutionContext,
  type FunctionResult,
  type FunctionResolver,
  type FunctionImpl,
  type FunctionDefinition as CoreFunctionDefinition,
} from './types';

// Grammar system (for advanced usage)
export { GRAMMAR } from './grammar';
export { GrammarCompiler } from './grammar/core/compiler';

// Variable resolution system
export * from './document/variable-resolution';

// Agent custom function execution
export * from './document/custom-function-executor';

// Diff system
export { applyDiff } from './document/diff-applier';
export type { DiffResult } from './document/diff-applier';

// BlockNote integration (optional - import from '@idyllic-labs/idyll-engine/integrations/blocknote')
// Removed from main exports to keep core engine editor-agnostic

// Agent system
export { Agent } from './agent/agent';
export { ActivityMemory } from './agent/memory';
export { buildSystemPrompt, buildDetailedSystemPrompt } from './agent/system-prompt';
export { ResponsePipeline, type MiddlewareContext, type ResponseMiddleware } from './agent/response-pipeline';
export type { 
  AgentConfig,
  AgentDefinition,
  AgentContext, 
  AgentActivity,
  AgentExecuteOptions,
  AgentExecuteResult 
} from './agent/types';