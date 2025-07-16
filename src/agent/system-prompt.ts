/**
 * System prompt builder for agents
 * 
 * Converts AgentDocument to a proper system prompt with:
 * - Background context
 * - Tool definitions
 * - Custom instructions from nodes
 */

import { AgentDocument, Node, isExecutableNode, isTextContent } from '../document/ast';
import { serializeAstToXml } from '../grammar/parser';

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
  
  // Available functions (shown as tools to the AI)
  if (availableTools.length > 0) {
    sections.push(`\nAvailable tools:\n${availableTools.map(t => `- ${t}`).join('\n')}`);
  }
  
  // Process blocks for custom instructions and function definitions
  const instructions: string[] = [];
  const customTools: string[] = [];
  const triggers: string[] = [];
  
  for (const node of agent.nodes) {
    if (node.type === 'function') {
      // Extract function definition
      const title = node.props?.title as string || 'Untitled Function';
      // Convert title to the actual function name used in the registry
      const functionName = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      // The actual callable name uses -- instead of :
      const callableName = `custom--${functionName}`;
      customTools.push(`- ${callableName} (Custom function: "${title}")`);
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
  
  // Add custom functions section
  if (customTools.length > 0) {
    sections.push(`\nCustom functions defined:\n${customTools.join('\n')}\n\nIMPORTANT: When the user asks you to use a custom function by name, find the matching function in the available tools list and call it. Custom function names use double hyphens (--) instead of colons (:) when calling them.`);
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
- <fncall idyll-fn="..."> for function execution
- <variable name="..." /> for variables
- <mention:type id="...">label</mention:type> for references
</document_format>

<response_guidelines>
When responding to user queries:
1. If you need to call functions, call them first
2. After function calls complete, provide ONE clear, comprehensive response
3. Do not repeat or rephrase the same information multiple times
4. Only continue with additional steps if you need to call different functions or perform distinct reasoning
5. Avoid generating multiple similar responses about the same topic
</response_guidelines>`;
  
  return prompt;
}