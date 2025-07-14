/**
 * Custom Tool Executor for Idyllic Engine
 * 
 * Executes custom tools defined with <tool> blocks, handling
 * variable resolution and multi-step execution
 */

import type { 
  Node,
  ContentNode,
  ExecutableNode,
  IdyllDocument 
} from './ast';
import { isExecutableNode, getExecutableNodes } from './ast';
import type { 
  ToolExecutionContext, 
  ExecutionOptions,
  NodeExecutionResult,
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
 * Execute a custom tool defined as a ContentNode
 */
export async function executeCustomTool<TApi = any>(
  toolNode: ContentNode,
  options: CustomToolExecutionOptions<TApi>
): Promise<ToolExecutionContext> {
  const startTime = Date.now();
  
  // Validate it's a tool node
  if (toolNode.type !== 'tool') {
    throw new Error('Node is not a tool');
  }
  
  const toolName = (toolNode.props?.title as string) || 'Unnamed Tool';
  
  // Get tool definition nodes (children)
  const definitionNodes = toolNode.children || [];
  
  // Check for variable redeclaration errors
  const redeclarationErrors = checkVariableRedeclaration(definitionNodes);
  if (redeclarationErrors.length > 0) {
    throw new Error(
      `Variable redeclaration errors: ${redeclarationErrors.map(e => e.error).join('; ')}`
    );
  }
  
  // Extract variable definitions
  const variableDefinitions = extractVariableDefinitions(definitionNodes);
  
  // Resolve variables
  const resolutionContext: VariableResolutionContext = {
    agentContext: options.agentContext,
    inheritedContext: options.inheritedContext,
  };
  
  const resolutionResult = await resolveVariables(variableDefinitions, resolutionContext);
  
  if (resolutionResult.errors) {
    console.warn('Variable resolution errors:', resolutionResult.errors);
  }
  
  // Apply resolved variables to nodes
  const nodesWithVariables = applyResolvedVariables(
    definitionNodes,
    resolutionResult.variables
  );
  
  // Interpolate content in executable nodes
  const interpolatedNodes = interpolateExecutableNodes(
    nodesWithVariables,
    resolutionResult.variables
  );
  
  // Create a document for execution
  const executionDocument: IdyllDocument = {
    id: `tool-exec-${Date.now()}`,
    nodes: interpolatedNodes,
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
    nodes: report.nodes,
    metadata: {
      toolName,
      duration: Date.now() - startTime,
      nodesExecuted: report.metadata.nodesExecuted,
      nodesSucceeded: report.metadata.nodesSucceeded,
      nodesFailed: report.metadata.nodesFailed,
    },
    toolDefinition: toolNode,
  };
  
  return executionContext;
}

/**
 * Interpolate variables in executable node content
 */
function interpolateExecutableNodes(
  nodes: Node[],
  resolvedVariables: Map<string, string>
): Node[] {
  return nodes.map(node => {
    if (isExecutableNode(node) && node.content) {
      // Interpolate the content to create the content string
      const interpolatedContent = interpolateContent(
        node.content,
        resolvedVariables
      );
      
      // Return a modified node with interpolated content
      // Note: We're modifying the content to be a simple text content
      // In a real implementation, we might want to preserve the structure
      return {
        ...node,
        content: [{
          type: 'text',
          text: interpolatedContent,
        }],
      } as ExecutableNode;
    }
    
    // Recursively handle children
    if ('children' in node && node.children) {
      return {
        ...node,
        children: interpolateExecutableNodes(node.children, resolvedVariables),
      };
    }
    
    return node;
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
  const results = Array.from(context.nodes.values());
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
export function parseCustomTool(document: IdyllDocument): ContentNode | null {
  for (const node of document.nodes) {
    if ('type' in node && node.type === 'tool') {
      return node as ContentNode;
    }
  }
  return null;
}