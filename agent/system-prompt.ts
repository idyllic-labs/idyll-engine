/**
 * System prompt builder for agents
 * 
 * Converts AgentDocument to a proper system prompt with:
 * - Background context
 * - Tool definitions
 * - Custom instructions from nodes
 */

import { AgentDocument, Node, isExecutableNode, isTextContent } from '../document/ast';
import { serializeAstToXml } from '../document/parser-grammar';

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
  
  for (const node of agent.nodes) {
    if (node.type === 'tool') {
      // Extract tool definition
      const title = node.props?.title as string || 'Untitled Tool';
      customTools.push(`Custom tool: ${title}`);
    } else if (node.type === 'trigger') {
      // Note triggers
      const trigger = node.props?.trigger as string;
      if (trigger) {
        triggers.push(`Trigger: ${trigger}`);
      }
    } else if ('content' in node && node.content) {
      // Extract text content as instructions
      const text = extractTextFromBlock(node);
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
 * Extract plain text from a node
 */
function extractTextFromBlock(node: Node): string {
  if (!('content' in node) || !node.content) {
    return '';
  }
  
  const texts: string[] = [];
  
  for (const content of node.content) {
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
</document_format>

<response_guidelines>
When responding to user queries:
1. If you need to call tools, call them first
2. After tool calls complete, provide ONE clear, comprehensive response
3. Do not repeat or rephrase the same information multiple times
4. Only continue with additional steps if you need to call different tools or perform distinct reasoning
5. Avoid generating multiple similar responses about the same topic
</response_guidelines>`;
  
  return prompt;
}