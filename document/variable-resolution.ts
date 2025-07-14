/**
 * Variable Resolution System for Idyllic Engine
 * 
 * Handles the resolution of variables in custom tools using AI interpolation
 */

import type { Node, RichContent, VariableElement } from './ast';
import { isVariable, traverseNodes } from './ast';

/**
 * Variable with metadata for resolution
 */
export interface VariableDefinition {
  name: string;
  prompt?: string;
  firstOccurrenceBlockId: string;
  firstOccurrenceIndex: number;
}

/**
 * Context for variable resolution
 */
export interface VariableResolutionContext {
  /** Agent-provided context (rich content) */
  agentContext: string;
  
  /** Document context (surrounding blocks) */
  documentContext?: string;
  
  /** Inherited agent context/personality */
  inheritedContext?: Record<string, unknown>;
}

/**
 * Variable resolution result
 */
export interface VariableResolutionResult {
  /** Resolved variable values */
  variables: Map<string, string>;
  
  /** Any errors during resolution */
  errors?: Array<{ variable: string; error: string }>;
}

/**
 * Extract all unique variables from blocks
 * Follows declare-once, use-many pattern
 */
export function extractVariableDefinitions(nodes: Node[]): VariableDefinition[] {
  const definitions = new Map<string, VariableDefinition>();
  const seenNames = new Set<string>();
  
  let globalIndex = 0;
  
  for (const node of traverseNodes(nodes)) {
    if ('content' in node && Array.isArray(node.content)) {
      processContent(node.content, node.id);
    }
    
    // Check executable node instructions
    if ('instructions' in node && node.instructions) {
      processContent(node.instructions, node.id);
    }
  }
  
  function processContent(content: RichContent[], blockId: string) {
    for (const item of content) {
      if (isVariable(item)) {
        // First occurrence declares the variable
        if (!seenNames.has(item.name)) {
          seenNames.add(item.name);
          definitions.set(item.name, {
            name: item.name,
            prompt: item.prompt,
            firstOccurrenceBlockId: blockId,
            firstOccurrenceIndex: globalIndex++,
          });
        }
      } else if ('content' in item && Array.isArray(item.content)) {
        // Recurse into nested content
        processContent(item.content, blockId);
      }
    }
  }
  
  return Array.from(definitions.values());
}

/**
 * Check for variable redeclaration errors
 */
export function checkVariableRedeclaration(nodes: Node[]): Array<{ name: string; error: string }> {
  const errors: Array<{ name: string; error: string }> = [];
  const declarations = new Map<string, { nodeId: string; prompt?: string }>();
  
  for (const node of traverseNodes(nodes)) {
    const variables = extractVariablesFromNode(node);
    
    for (const variable of variables) {
      const existing = declarations.get(variable.name);
      
      if (existing) {
        // Check if it's a redeclaration (different prompt)
        if (variable.prompt && existing.prompt !== variable.prompt) {
          errors.push({
            name: variable.name,
            error: `Variable "${variable.name}" redeclared with different prompt. Original: "${existing.prompt}", New: "${variable.prompt}"`,
          });
        }
      } else if (variable.prompt) {
        // First declaration with prompt
        declarations.set(variable.name, {
          nodeId: node.id,
          prompt: variable.prompt,
        });
      }
    }
  }
  
  return errors;
}

/**
 * Extract variables from a single block
 */
function extractVariablesFromNode(node: Node): VariableElement[] {
  const variables: VariableElement[] = [];
  
  function extractFromContent(content: RichContent[]) {
    for (const item of content) {
      if (isVariable(item)) {
        variables.push(item);
      } else if ('content' in item && Array.isArray(item.content)) {
        extractFromContent(item.content);
      }
    }
  }
  
  if ('content' in node && Array.isArray(node.content)) {
    extractFromContent(node.content);
  }
  
  if ('instructions' in node && node.instructions) {
    extractFromContent(node.instructions);
  }
  
  return variables;
}

/**
 * Resolve variables using AI interpolation or fallback to mock
 */
export async function resolveVariables(
  definitions: VariableDefinition[],
  context: VariableResolutionContext
): Promise<VariableResolutionResult> {
  // Use mock resolution (AI resolution removed - model should be provided externally if needed)
  const variables = new Map<string, string>();
  const errors: Array<{ variable: string; error: string }> = [];
  
  for (const def of definitions) {
    try {
      const resolvedValue = await mockResolveVariable(def, context);
      variables.set(def.name, resolvedValue);
    } catch (error) {
      errors.push({
        variable: def.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return { variables, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Mock variable resolution for testing
 * Replace with actual AI implementation
 */
async function mockResolveVariable(
  definition: VariableDefinition,
  context: VariableResolutionContext
): Promise<string> {
  // Simulate AI resolution based on variable name and context
  const contextLower = context.agentContext.toLowerCase();
  
  switch (definition.name) {
    case 'searchQuery':
      if (contextLower.includes('ai breakthroughs')) {
        return 'AI breakthroughs 2024';
      }
      if (contextLower.includes('machine learning')) {
        return 'machine learning advances';
      }
      return 'technology news';
      
    case 'timeframe':
      if (contextLower.includes('past month') || contextLower.includes('last month')) {
        return 'past month';
      }
      if (contextLower.includes('past week') || contextLower.includes('last week')) {
        return 'past week';
      }
      return 'recent';
      
    case 'focusArea':
      if (contextLower.includes('practical')) {
        return 'practical applications';
      }
      if (contextLower.includes('research')) {
        return 'research developments';
      }
      return 'general overview';
      
    default:
      // Use prompt as hint for resolution
      if (definition.prompt) {
        return `Resolved: ${definition.name} (${definition.prompt})`;
      }
      return `Resolved: ${definition.name}`;
  }
}

/**
 * Apply resolved variable values to nodes
 * Updates variable elements with resolvedValue
 */
export function applyResolvedVariables(
  nodes: Node[],
  resolvedVariables: Map<string, string>
): Node[] {
  // Deep clone nodes to avoid mutation
  const clonedNodes = JSON.parse(JSON.stringify(nodes)) as Node[];
  
  for (const node of traverseNodes(clonedNodes)) {
    if ('content' in node && Array.isArray(node.content)) {
      node.content = applyToContent(node.content);
    }
    
    if ('instructions' in node && node.instructions) {
      node.instructions = applyToContent(node.instructions);
    }
  }
  
  function applyToContent(content: RichContent[]): RichContent[] {
    return content.map(item => {
      if (isVariable(item)) {
        const resolvedValue = resolvedVariables.get(item.name);
        if (resolvedValue !== undefined) {
          return {
            ...item,
            resolvedValue,
          } as VariableElement;
        }
      } else if ('content' in item && Array.isArray(item.content)) {
        return {
          ...item,
          content: applyToContent(item.content),
        };
      }
      return item;
    });
  }
  
  return clonedNodes;
}

/**
 * Get interpolated text content with variables replaced
 */
export function interpolateContent(
  content: RichContent[],
  resolvedVariables: Map<string, string>
): string {
  let result = '';
  
  for (const item of content) {
    if (item.type === 'text') {
      result += item.text;
    } else if (isVariable(item)) {
      const value = resolvedVariables.get(item.name);
      result += value || `{{${item.name}}}`;
    } else if ('content' in item && Array.isArray(item.content)) {
      result += interpolateContent(item.content, resolvedVariables);
    }
  }
  
  return result;
}