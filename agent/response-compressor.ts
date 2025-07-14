/**
 * Response compression for verbose tool outputs
 * 
 * Uses a mini model to intelligently extract relevant information
 * from complex tool execution contexts.
 */

import { Message } from 'ai';
import { ToolExecutionReport } from '../document/execution-types';

export interface CompressionContext {
  toolName: string;
  toolParams: Record<string, any>;
  toolContent?: string;
  rawResponse: any;
  recentMessages: Message[];
}

/**
 * Compress verbose tool responses using AI
 */
export async function compressToolResponse(
  context: CompressionContext
): Promise<any> {
  // For non-complex responses, return as-is
  if (!isComplexResponse(context.rawResponse)) {
    console.log(`📦 Response compressor: ${context.toolName} - No compression needed (simple response)`);
    return context.rawResponse;
  }
  
  console.log(`🗜️  Response compressor: ${context.toolName} - Compressing verbose response...`);
  
  // Build context summary
  const conversationContext = context.recentMessages
    .slice(-3) // Last 3 messages
    .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n');
  
  // Format the raw response for the AI
  const responseStr = formatResponse(context.rawResponse);
  
  // For now, just do simple truncation/summarization without AI calls
  // This prevents the double response issue
  const originalSize = JSON.stringify(context.rawResponse).length;
  
  if (typeof context.rawResponse === 'string') {
    // Check if this looks like a conversational response
    const isConversational = context.rawResponse.includes('?') || 
                             context.rawResponse.includes('I') ||
                             context.rawResponse.includes('you') ||
                             context.rawResponse.length > 50;
    
    if (isConversational) {
      // For conversational responses, just return them as-is
      // The AI should understand this is the complete response
      const response = context.rawResponse.length > 1000 
        ? context.rawResponse.substring(0, 1000) + '... [truncated]'
        : context.rawResponse;
      
      console.log(`✅ Conversational response detected: ${originalSize} chars`);
      return response;
    }
    
    // Regular compression for non-conversational strings
    const compressed = context.rawResponse.length > 1000 
      ? context.rawResponse.substring(0, 1000) + '... [truncated]'
      : context.rawResponse;
    
    console.log(`✅ Response compressed: ${originalSize} → ${compressed.length} chars`);
    return compressed;
  }
  
  if (context.rawResponse && typeof context.rawResponse === 'object') {
    // For objects, extract key fields or summarize
    if ('variables' in context.rawResponse && 'nodes' in context.rawResponse) {
      // ToolExecutionReport - use basic summarizing strategy
      const ctx = context.rawResponse as ToolExecutionReport;
      
      // Generate a human-readable message for the LLM
      const toolName = ctx.metadata?.toolName || 'Custom tool';
      const nodesExecuted = ctx.metadata?.nodesExecuted || 0;
      const nodesSucceeded = ctx.metadata?.nodesSucceeded || 0;
      const nodesFailed = ctx.metadata?.nodesFailed || 0;
      
      // Build the summary message
      let message = `${toolName} executed successfully.`;
      
      if (nodesExecuted > 0) {
        message += ` Completed ${nodesExecuted} operations`;
        if (nodesFailed > 0) {
          message += ` (${nodesFailed} failed)`;
        }
        message += '.';
      }
      
      // Add variable context if available
      if (ctx.variables && ctx.variables.size > 0) {
        const varsText = Array.from(ctx.variables.entries())
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        message += ` Variables resolved: ${varsText}.`;
      }
      
      // Get the final result for additional context
      const results = Array.from(ctx.nodes.values());
      const lastSuccess = results.reverse().find(r => r.success);
      
      if (lastSuccess?.data) {
        // Try to extract meaningful info from the result
        if (typeof lastSuccess.data === 'object' && lastSuccess.data !== null) {
          const data = lastSuccess.data as any;
          if (data.message) {
            message += ` Result: ${data.message}`;
          } else if (data.results && Array.isArray(data.results)) {
            message += ` Found ${data.results.length} results.`;
          }
        }
      }
      
      const summary = {
        message,
        success: nodesSucceeded > 0,
        metadata: {
          nodesExecuted,
          nodesSucceeded,
          nodesFailed,
          variables: ctx.variables ? Object.fromEntries(ctx.variables) : {},
          toolName
        }
      };
      
      console.log(`✅ Response compressed (basic summarizing): ${originalSize} → ${JSON.stringify(summary).length} chars`);
      return summary;
    }
    
    // For other objects, return as-is but log
    console.log(`✅ Response kept as-is: ${originalSize} chars (not complex enough)`);
    return context.rawResponse;
  }
  
  // Default: return as-is
  return context.rawResponse;
}

/**
 * Check if a response is complex enough to need compression
 */
function isComplexResponse(response: unknown): boolean {
  // Simple strings don't need compression
  if (typeof response === 'string') {
    return response.length > 2000; // Only compress very long strings
  }
  
  // ToolExecutionContext is always complex
  if (response && typeof response === 'object') {
    if ('variables' in response && 'nodes' in response && 'metadata' in response) {
      return true;
    }
  }
  
  // Large responses need compression
  const size = JSON.stringify(response).length;
  return size > 2000; // Increased threshold to avoid compressing simple responses
}

/**
 * Format response for AI consumption
 */
function formatResponse(response: unknown): string {
  // Special handling for ToolExecutionContext
  if (response && typeof response === 'object' && 'nodes' in response) {
    const ctx = response as ToolExecutionContext;
    const parts: string[] = [];
    
    // Variables
    if (ctx.variables.size > 0) {
      parts.push('Variables resolved:');
      ctx.variables.forEach((value, key) => {
        parts.push(`  ${key}: ${value}`);
      });
    }
    
    // Node results
    if (ctx.nodes.size > 0) {
      parts.push('\nNode executions:');
      ctx.nodes.forEach((result, nodeId) => {
        if (result.success) {
          parts.push(`  ✓ ${nodeId}: ${JSON.stringify(result.data)}`);
        } else {
          parts.push(`  ✗ ${nodeId}: ${result.error}`);
        }
      });
    }
    
    // Metadata
    if (ctx.metadata) {
      parts.push(`\nExecution summary:`);
      parts.push(`  Tool: ${ctx.metadata.toolName}`);
      parts.push(`  Nodes executed: ${ctx.metadata.nodesExecuted}`);
      parts.push(`  Succeeded: ${ctx.metadata.nodesSucceeded}`);
      parts.push(`  Failed: ${ctx.metadata.nodesFailed}`);
    }
    
    return parts.join('\n');
  }
  
  // Default formatting
  return JSON.stringify(response, null, 2);
}