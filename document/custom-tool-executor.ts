/**
 * Custom Tool Executor for Idyllic Engine
 * 
 * Executes custom tools defined with <tool> blocks, handling
 * variable resolution and multi-step execution
 */

import type { 
  Block, 
  ContentBlock, 
  ExecutableBlock, 
  IdyllDocument 
} from './ast';
import { isExecutableBlock, getExecutableBlocks } from './ast';
import type { 
  ToolExecutionContext, 
  ExecutionOptions,
  BlockExecutionResult 
} from './execution-types';
import { DocumentExecutor } from './executor';
import {
  extractVariableDefinitions,
  checkVariableRedeclaration,
  resolveVariables,
  applyResolvedVariables,
  interpolateContent,
  type VariableResolutionContext,
} from './variable-resolution';

/**
 * Options for custom tool execution
 */
export interface CustomToolExecutionOptions<TApi = any> extends ExecutionOptions<TApi> {
  /** Agent context provided when invoking the tool */
  agentContext: string;
  
  /** Inherited context from agent */
  inheritedContext?: Record<string, unknown>;
}

/**
 * Execute a custom tool defined as a ContentBlock
 */
export async function executeCustomTool<TApi = any>(
  toolBlock: ContentBlock,
  options: CustomToolExecutionOptions<TApi>
): Promise<ToolExecutionContext> {
  const startTime = Date.now();
  
  // Validate it's a tool block
  if (toolBlock.type !== 'tool') {
    throw new Error('Block is not a tool');
  }
  
  const toolName = (toolBlock.props?.title as string) || 'Unnamed Tool';
  
  // Get tool definition blocks (children)
  const definitionBlocks = toolBlock.children || [];
  
  // Check for variable redeclaration errors
  const redeclarationErrors = checkVariableRedeclaration(definitionBlocks);
  if (redeclarationErrors.length > 0) {
    throw new Error(
      `Variable redeclaration errors: ${redeclarationErrors.map(e => e.error).join('; ')}`
    );
  }
  
  // Extract variable definitions
  const variableDefinitions = extractVariableDefinitions(definitionBlocks);
  
  // Resolve variables
  const resolutionContext: VariableResolutionContext = {
    agentContext: options.agentContext,
    inheritedContext: options.inheritedContext,
  };
  
  const resolutionResult = await resolveVariables(variableDefinitions, resolutionContext);
  
  if (resolutionResult.errors) {
    console.warn('Variable resolution errors:', resolutionResult.errors);
  }
  
  // Apply resolved variables to blocks
  const blocksWithVariables = applyResolvedVariables(
    definitionBlocks,
    resolutionResult.variables
  );
  
  // Interpolate content in executable blocks
  const interpolatedBlocks = interpolateExecutableBlocks(
    blocksWithVariables,
    resolutionResult.variables
  );
  
  // Create a document for execution
  const executionDocument: IdyllDocument = {
    id: `tool-exec-${Date.now()}`,
    blocks: interpolatedBlocks,
  };
  
  // Execute using DocumentExecutor
  const executor = new DocumentExecutor(options);
  const report = await executor.execute({
    mode: 'document',
    document: executionDocument,
    options,
  });
  
  // Build execution context
  const executionContext: ToolExecutionContext = {
    variables: resolutionResult.variables,
    blocks: report.blocks,
    metadata: {
      toolName,
      duration: Date.now() - startTime,
      blocksExecuted: report.metadata.blocksExecuted,
      blocksSucceeded: report.metadata.blocksSucceeded,
      blocksFailed: report.metadata.blocksFailed,
    },
    toolDefinition: toolBlock,
  };
  
  return executionContext;
}

/**
 * Interpolate variables in executable block content
 */
function interpolateExecutableBlocks(
  blocks: Block[],
  resolvedVariables: Map<string, string>
): Block[] {
  return blocks.map(block => {
    if (isExecutableBlock(block) && block.instructions) {
      // Interpolate the instructions to create the content string
      const interpolatedContent = interpolateContent(
        block.instructions,
        resolvedVariables
      );
      
      // Return a modified block with interpolated content
      // Note: We're modifying the instructions to be a simple text content
      // In a real implementation, we might want to preserve the structure
      return {
        ...block,
        instructions: [{
          type: 'text',
          text: interpolatedContent,
        }],
      } as ExecutableBlock;
    }
    
    // Recursively handle children
    if ('children' in block && block.children) {
      return {
        ...block,
        children: interpolateExecutableBlocks(block.children, resolvedVariables),
      };
    }
    
    return block;
  });
}

/**
 * Extract relevant result from tool execution context
 * This would be used by the subprocess to return only what's needed
 */
export function extractRelevantResult(
  context: ToolExecutionContext,
  extractionHint?: string
): unknown {
  // Get the last successful result by default
  const results = Array.from(context.blocks.values());
  const lastSuccess = results
    .reverse()
    .find(r => r.success);
  
  if (lastSuccess) {
    return lastSuccess.data;
  }
  
  // If no successful results, return error summary
  const errors = results
    .filter(r => !r.success)
    .map(r => r.error?.message || 'Unknown error');
  
  return {
    success: false,
    errors,
    toolName: context.metadata.toolName,
  };
}

/**
 * Parse custom tool from document
 */
export function parseCustomTool(document: IdyllDocument): ContentBlock | null {
  for (const block of document.blocks) {
    if ('type' in block && block.type === 'tool') {
      return block as ContentBlock;
    }
  }
  return null;
}