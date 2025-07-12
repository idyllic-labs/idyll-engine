/**
 * System prompt builder for agents
 * 
 * Converts AgentDocument to a proper system prompt with:
 * - Background context
 * - Tool definitions
 * - Custom instructions from blocks
 */

import { AgentDocument, Block, isExecutableBlock, isTextContent } from '../document/ast';
import { serializeToXML } from '../document/parser-grammar';

/**
 * Build system prompt from agent document
 */
export function buildSystemPrompt(agent: AgentDocument, availableTools: string[]): string {
  const sections: string[] = [];
  
  // Agent identity
  sections.push(`You are ${agent.name || 'an AI assistant'}.`);
  if (agent.description) {
    sections.push(agent.description);
  }
  
  // Model info
  sections.push(`\nModel: ${agent.model || 'default'}`);
  
  // Available tools
  if (availableTools.length > 0) {
    sections.push(`\nAvailable tools:\n${availableTools.map(t => `- ${t}`).join('\n')}`);
  }
  
  // Process blocks for custom instructions and tool definitions
  const instructions: string[] = [];
  const customTools: string[] = [];
  const triggers: string[] = [];
  
  for (const block of agent.blocks) {
    if (block.type === 'tool') {
      // Extract tool definition
      const title = block.props?.title as string || 'Untitled Tool';
      customTools.push(`Custom tool: ${title}`);
    } else if (block.type === 'trigger') {
      // Note triggers
      const trigger = block.props?.trigger as string;
      if (trigger) {
        triggers.push(`Trigger: ${trigger}`);
      }
    } else if ('content' in block && block.content) {
      // Extract text content as instructions
      const text = extractTextFromBlock(block);
      if (text) {
        instructions.push(text);
      }
    }
  }
  
  // Add custom tools section
  if (customTools.length > 0) {
    sections.push(`\nCustom tools defined:\n${customTools.join('\n')}`);
  }
  
  // Add triggers section
  if (triggers.length > 0) {
    sections.push(`\nTriggers configured:\n${triggers.join('\n')}`);
  }
  
  // Add instructions
  if (instructions.length > 0) {
    sections.push(`\nInstructions:\n${instructions.join('\n\n')}`);
  }
  
  // Add XML context for understanding the format
  sections.push(`\nWhen working with documents, use the Idyllic XML format.`);
  
  return sections.join('\n');
}

/**
 * Extract plain text from a block
 */
function extractTextFromBlock(block: Block): string {
  if (!('content' in block) || !block.content) {
    return '';
  }
  
  const texts: string[] = [];
  
  for (const content of block.content) {
    if (isTextContent(content)) {
      texts.push(content.text);
    }
  }
  
  return texts.join('');
}

/**
 * Create a more detailed prompt with XML examples
 */
export function buildDetailedSystemPrompt(
  agent: AgentDocument, 
  availableTools: string[],
  includeMemory?: string
): string {
  let prompt = buildSystemPrompt(agent, availableTools);
  
  // Add memory if provided
  if (includeMemory) {
    prompt = `${prompt}\n\n${includeMemory}`;
  }
  
  // Add document structure explanation
  prompt += `\n\n<document_format>
Documents are structured using XML with blocks like:
- <p> for paragraphs
- <h1>, <h2>, etc. for headings
- <fncall idyll-tool="..."> for tool execution
- <variable name="..." /> for variables
- <mention:type id="...">label</mention:type> for references
</document_format>`;
  
  return prompt;
}