/**
 * Response compression for verbose tool outputs
 * 
 * Uses a mini model to intelligently extract relevant information
 * from complex tool execution contexts.
 */

import { generateText } from 'ai';
import { getModel } from './model-provider';
import { Message } from 'ai';
import { ToolExecutionContext } from '../document/execution-types';

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
  
  const result = await generateText({
    model: getModel('gpt-4.1-mini'),
    temperature: 0, // Deterministic extraction
    system: 'You are a response compressor. Extract only the most relevant information from tool responses. Return ONLY a clean JSON object with the essential findings.',
    prompt: `Tool: ${context.toolName}
Parameters: ${JSON.stringify(context.toolParams, null, 2)}
${context.toolContent ? `Content: ${context.toolContent}` : ''}

Recent conversation:
${conversationContext}

Verbose tool response:
${responseStr}

Extract the key findings, results, and conclusions. Return as a clean JSON object.`,
  });
  
  const originalSize = JSON.stringify(context.rawResponse).length;
  const compressedSize = result.text.length;
  const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
  
  console.log(`✅ Response compressed: ${originalSize} → ${compressedSize} chars (${ratio}% reduction)`);
  
  try {
    const parsed = JSON.parse(result.text);
    console.log(`📋 Compressed result:`, parsed);
    return parsed;
  } catch {
    // If parsing fails, return the text response
    console.log(`📋 Compressed result (text):`, result.text);
    return result.text;
  }
}

/**
 * Check if a response is complex enough to need compression
 */
function isComplexResponse(response: unknown): boolean {
  // ToolExecutionContext is always complex
  if (response && typeof response === 'object') {
    if ('variables' in response && 'blocks' in response && 'metadata' in response) {
      return true;
    }
  }
  
  // Large responses need compression
  const size = JSON.stringify(response).length;
  return size > 1000;
}

/**
 * Format response for AI consumption
 */
function formatResponse(response: unknown): string {
  // Special handling for ToolExecutionContext
  if (response && typeof response === 'object' && 'blocks' in response) {
    const ctx = response as ToolExecutionContext;
    const parts: string[] = [];
    
    // Variables
    if (ctx.variables.size > 0) {
      parts.push('Variables resolved:');
      ctx.variables.forEach((value, key) => {
        parts.push(`  ${key}: ${value}`);
      });
    }
    
    // Block results
    if (ctx.blocks.size > 0) {
      parts.push('\nBlock executions:');
      ctx.blocks.forEach((result, blockId) => {
        if (result.success) {
          parts.push(`  ✓ ${blockId}: ${JSON.stringify(result.data)}`);
        } else {
          parts.push(`  ✗ ${blockId}: ${result.error}`);
        }
      });
    }
    
    // Metadata
    if (ctx.metadata) {
      parts.push(`\nExecution summary:`);
      parts.push(`  Tool: ${ctx.metadata.toolName}`);
      parts.push(`  Blocks executed: ${ctx.metadata.blocksExecuted}`);
      parts.push(`  Succeeded: ${ctx.metadata.blocksSucceeded}`);
      parts.push(`  Failed: ${ctx.metadata.blocksFailed}`);
    }
    
    return parts.join('\n');
  }
  
  // Default formatting
  return JSON.stringify(response, null, 2);
}