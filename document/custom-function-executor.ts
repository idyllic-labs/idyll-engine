/**
 * Custom Function Executor for Idyllic Engine
 * 
 * Executes custom functions defined with <function> blocks, handling
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
  FunctionExecutionReport, 
  ExecutionOptions,
  NodeExecutionResult
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
 * Options for custom function execution
 */
export interface CustomFunctionExecutionOptions<TApi = any> extends ExecutionOptions<TApi> {
  /** Agent context provided when invoking the function */
  agentContext: string;
  
  /** Inherited context from agent */
  inheritedContext?: Record<string, unknown>;
}

/**
 * Execute a custom function defined as a ContentNode
 */
export async function executeCustomFunction<TApi = any>(
  functionNode: ContentNode,
  options: CustomFunctionExecutionOptions<TApi>
): Promise<FunctionExecutionReport> {
  const startTime = Date.now();
  
  // Validate it's a function node
  if (functionNode.type !== 'function') {
    throw new Error('Node is not a function');
  }
  
  const functionName = (functionNode.props?.title as string) || 'Unnamed Function';
  
  // Get function definition nodes (children)
  const definitionNodes = functionNode.children || [];
  
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
    id: `function-exec-${Date.now()}`,
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
  const executionContext: FunctionExecutionReport = {
    variables: resolutionResult.variables,
    nodes: report.nodes,
    metadata: {
      functionName: functionName,
      duration: Date.now() - startTime,
      nodesExecuted: report.metadata.nodesExecuted,
      nodesSucceeded: report.metadata.nodesSucceeded,
      nodesFailed: report.metadata.nodesFailed,
    },
    functionDefinition: functionNode,
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
 * Extract relevant result from function execution context
 * This would be used by the subprocess to return only what's needed
 */
export function extractRelevantResult(
  context: FunctionExecutionReport,
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
    functionName: context.metadata.functionName,
  };
}

/**
 * Parse custom function from document
 */
export function parseCustomFunction(document: IdyllDocument): ContentNode | null {
  for (const node of document.nodes) {
    if ('type' in node && node.type === 'function') {
      return node as ContentNode;
    }
  }
  return null;
}