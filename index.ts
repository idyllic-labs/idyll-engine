/**
 * @idyllic-labs/idyll-engine
 * 
 * Document execution engine for Idyllic
 */

// Document AST types
export * from './document/ast';

// Document parsing and serialization
export { parseXmlToAst, serializeAstToXml } from './document/parser-grammar';

// Document execution
export { DocumentExecutor } from './document/executor';
export * from './document/execution-types';
export { createToolRegistry, defineTool, mergeToolRegistries, createSimpleRegistry } from './document/tool-registry';

// Tool naming utilities
export { 
  toAzureFunctionName, 
  fromAzureFunctionName, 
  validateToolName, 
  parseToolName, 
  buildToolName 
} from './document/tool-naming';

// Document validation
export { validateDocument, formatValidationIssues } from './document/validator';

// Legacy types (for backward compatibility)
export { 
  type ValidationContext,
  type ExecutionContext,
  type ToolResult,
  type ToolResolver,
  type ToolExecutor as LegacyToolExecutor,
  type ToolDefinition as LegacyToolDefinition,
} from './types';

// Grammar system (for advanced usage)
export { GRAMMAR } from './document/grammar';
export { GrammarCompiler } from './document/grammar-compiler';

// Variable resolution system
export * from './document/variable-resolution';

// Custom tool execution
export * from './document/custom-tool-executor';

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