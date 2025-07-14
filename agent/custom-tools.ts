/**
 * Custom tool extraction and execution for agents
 * 
 * Extracts tool definitions from agent system prompts and
 * creates executable tools that use the custom tool executor.
 */

import { z } from 'zod';
import { AgentDocument, Node, ContentNode } from '../document/ast';
import { ToolDefinition, ToolRegistry } from '../document/tool-registry';
import { executeCustomTool, parseCustomTool } from '../document/custom-tool-executor';
import { parseXmlToAst } from '../document/parser-grammar';

/**
 * Extract custom tools from agent document
 */
export function extractCustomTools(
  agentDoc: AgentDocument,
  baseTools: ToolRegistry,
  getAgentContext?: () => string
): ToolRegistry {
  const customTools: ToolRegistry = {};
  
  console.log('🔍 Extracting custom tools from agent document...');
  
  // Find all tool blocks
  for (const block of agentDoc.nodes) {
    if (block.type === 'tool' && 'props' in block) {
      console.log('📦 Found tool block:', JSON.stringify(block, null, 2));
      const title = block.props?.title as string || 'Untitled Tool';
      const icon = block.props?.icon as string;
      
      // Extract description from content
      const description = extractTextContent(block);
      
      // Extract tool definition blocks from children
      const definitionBlocks = extractToolDefinitionBlocks(block);
      
      if (definitionBlocks.length === 0) {
        console.warn(`Tool "${title}" has no definition blocks`);
        continue;
      }
      
      // Convert title to valid tool name (snake_case)
      const toolName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      
      // Create the custom tool
      customTools[`custom:${toolName}`] = {
        description: description || `Custom tool: ${title}`,
        schema: z.object({
          context: z.string()
            .describe('Relevant context to help resolve any variables in the tool')
            .optional(),
        }),
        execute: async (params, content, context) => {
          console.log(`🛠️ Executing custom tool: ${title}`);
          
          // Create a virtual document with the tool definition
          const toolDoc = {
            id: `custom-tool-${toolName}`,
            nodes: definitionBlocks,
          };
          
          // Create custom tool block for execution
          const customToolBlock: ContentNode = {
            id: context.currentNodeId || 'custom-tool-exec',
            type: 'tool',
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
            agentContext = `Tool invoked: ${title}`;
          }
          
          console.log(`📝 Agent context for variable resolution: "${agentContext}"`);
          console.log(`📦 Params:`, params);
          console.log(`📄 Content:`, content);
          console.log(`🔍 GetAgentContext available:`, !!getAgentContext);
          
          try {
            // Execute the custom tool
            const executionContext = await executeCustomTool(customToolBlock, {
              tools: baseTools,
              agentContext: agentContext,
            });
            
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
              console.log(`📦 Returning full ToolExecutionContext for compression`);
              return executionContext;
            }
            
            // If everything failed, throw the last error
            if (lastResult && !lastResult.success) {
              const errorMsg = typeof lastResult.error === 'string' 
                ? lastResult.error 
                : JSON.stringify(lastResult.error) || 'Tool execution failed';
              throw new Error(errorMsg);
            }
            
            // Fallback
            return executionContext;
          } catch (error) {
            console.error(`❌ Custom tool "${title}" failed:`, error);
            throw error;
          }
        },
      };
    }
  }
  
  return customTools;
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
 * Extract tool definition blocks from a tool block
 * 
 * Tool blocks have a structure like:
 * <tool>
 *   <tool:description>text content</tool:description>
 *   <tool:definition>
 *     <p>...</p>
 *     <fncall>...</fncall>
 *   </tool:definition>
 * </tool>
 */
function extractToolDefinitionBlocks(toolBlock: Node): Node[] {
  if (!('children' in toolBlock) || !toolBlock.children) {
    return [];
  }
  
  const definitionBlocks: Node[] = [];
  
  for (const child of toolBlock.children) {
    // Look for blocks with specific types from our parser
    if ('type' in child) {
      // The parser converts <tool:definition> to a block with type 'tool:definition'
      // But we need to check the actual parsed structure
      if (child.type === 'paragraph' || child.type === 'function_call') {
        definitionBlocks.push(child);
      } else if ('children' in child && child.children) {
        // Recursively extract from nested structures
        definitionBlocks.push(...extractToolDefinitionBlocks(child));
      }
    }
  }
  
  return definitionBlocks;
}