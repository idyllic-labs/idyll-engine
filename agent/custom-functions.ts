/**
 * Custom function extraction for agents
 * 
 * Extracts custom function definitions from agent documents
 * and converts them into tools that agents can call.
 */

import { z } from 'zod';
import { AgentDocument, Node, ContentNode } from '../document/ast';
import { FunctionDefinition, FunctionRegistry } from '../document/function-registry';
import { executeCustomFunction, parseCustomFunction, AgentCustomFunctionExecutionOptions } from '../document/custom-function-executor';
import { parseXmlToAst } from '../document/parser-grammar';

/**
 * Extract custom functions from agent document and convert them to tools
 */
export function extractCustomFunctions(
  agentDoc: AgentDocument,
  baseFunctions: FunctionRegistry,
  getAgentContext?: () => string
): FunctionRegistry {
  const customFunctions: FunctionRegistry = {};
  
  console.log('🔍 Extracting custom functions from agent document...');
  
  // Find all function blocks
  for (const block of agentDoc.nodes) {
    if (block.type === 'function' && 'props' in block) {
      console.log('📦 Found function block:', JSON.stringify(block, null, 2));
      const title = block.props?.title as string || 'Untitled Function';
      const icon = block.props?.icon as string;
      
      // Extract description from content
      const description = extractTextContent(block);
      
      // Extract function definition blocks from children
      const definitionBlocks = extractFunctionDefinitionBlocks(block);
      
      if (definitionBlocks.length === 0) {
        console.warn(`Function "${title}" has no definition blocks`);
        continue;
      }
      
      // Convert title to valid function name (snake_case)
      const functionName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      
      // Create the tool from this custom function
      customFunctions[`custom:${functionName}`] = {
        description: description || `Custom function: ${title}`,
        schema: z.object({
          context: z.string()
            .describe('Relevant context to help resolve any variables in the function')
            .optional(),
        }),
        execute: async (params, content, context) => {
          console.log(`🛠️ Executing custom function: ${title}`);
          
          // Create a virtual document with the function definition
          const functionDoc = {
            id: `custom-function-${functionName}`,
            nodes: definitionBlocks,
          };
          
          // Create custom function block for execution
          const customFunctionBlock: ContentNode = {
            id: context.currentNodeId || 'custom-function-exec',
            type: 'function',
            content: [],
            children: definitionBlocks,
            props: { title, icon },
          };
          
          // Build agent context from params and content
          // The AI typically passes context in params.context or uses content
          let agentContext = '';
          if (params.context) {
            agentContext = params.context;
          } else if (content) {
            agentContext = content;
          } else if (getAgentContext) {
            // Use the agent context getter if provided
            agentContext = getAgentContext();
          } else {
            // Try to infer from the execution context
            agentContext = `Function invoked: ${title}`;
          }
          
          console.log(`📝 Agent context for variable resolution: "${agentContext}"`);
          console.log(`📦 Params:`, params);
          console.log(`📄 Content:`, content);
          console.log(`🔍 GetAgentContext available:`, !!getAgentContext);
          
          try {
            // Execute the custom function
            const executionOptions: AgentCustomFunctionExecutionOptions = {
              functions: baseFunctions,
              agentContext: agentContext,
            };
            const executionContext = await executeCustomFunction(customFunctionBlock, executionOptions);
            
            // Extract the final result
            const lastNodeId = Array.from(executionContext.nodes.keys()).pop();
            const lastResult = lastNodeId ? executionContext.nodes.get(lastNodeId) : undefined;
            
            console.log(`🔍 Execution complete. Last node ID: ${lastNodeId}`);
            console.log(`📋 Last result:`, lastResult);
            console.log(`📊 All nodes:`, Array.from(executionContext.nodes.entries()));
            
            // Check if we have any successful results
            const results = Array.from(executionContext.nodes.values());
            const successfulResults = results.filter(r => r.success);
            const failedResults = results.filter(r => !r.success);
            
            console.log(`📊 Execution summary: ${successfulResults.length} successful, ${failedResults.length} failed`);
            
            // If we have successful results, return the full context for compression
            if (successfulResults.length > 0) {
              console.log(`📦 Returning full FunctionExecutionReport for compression`);
              return executionContext;
            }
            
            // If everything failed, throw the last error
            if (lastResult && !lastResult.success) {
              const errorMsg = typeof lastResult.error === 'string' 
                ? lastResult.error 
                : JSON.stringify(lastResult.error) || 'Function execution failed';
              throw new Error(errorMsg);
            }
            
            // Fallback
            return executionContext;
          } catch (error) {
            console.error(`❌ Custom function "${title}" failed:`, error);
            throw error;
          }
        },
      };
    }
  }
  
  return customFunctions;
}

/**
 * Extract text content from a block
 */
function extractTextContent(block: Node): string {
  if (!('content' in block) || !block.content) {
    return '';
  }
  
  const texts: string[] = [];
  for (const content of block.content) {
    if (content.type === 'text') {
      texts.push(content.text);
    }
  }
  
  return texts.join('').trim();
}

/**
 * Extract function definition blocks from a function block
 * 
 * Function blocks have a structure like:
 * <function>
 *   <function:description>text content</function:description>
 *   <function:definition>
 *     <p>...</p>
 *     <fncall>...</fncall>
 *   </function:definition>
 * </function>
 */
function extractFunctionDefinitionBlocks(functionBlock: Node): Node[] {
  if (!('children' in functionBlock) || !functionBlock.children) {
    return [];
  }
  
  const definitionBlocks: Node[] = [];
  
  for (const child of functionBlock.children) {
    // Look for blocks with specific types from our parser
    if ('type' in child) {
      // The parser converts <function:definition> to a block with type 'function:definition'
      // But we need to check the actual parsed structure
      if (child.type === 'paragraph' || child.type === 'function_call') {
        definitionBlocks.push(child);
      } else if ('children' in child && child.children) {
        // Recursively extract from nested structures
        definitionBlocks.push(...extractFunctionDefinitionBlocks(child));
      }
    }
  }
  
  return definitionBlocks;
}