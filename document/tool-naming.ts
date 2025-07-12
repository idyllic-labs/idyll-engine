/**
 * Tool naming utilities for Idyll Engine
 * 
 * Handles transformation between Idyll tool names (module:function) 
 * and external platform requirements.
 */

/**
 * Transform Idyll tool name to Azure function name
 * "module:function" → "module--function"
 * "function" → "function" (no module)
 */
export function toAzureFunctionName(idyllToolName: string): string {
  return idyllToolName.replace(':', '--');
}

/**
 * Transform Azure function name back to Idyll tool name
 * "module--function" → "module:function"
 * "function" → "function" (no module)
 */
export function fromAzureFunctionName(azureFunctionName: string): string {
  // Double hyphen is our separator
  if (azureFunctionName.includes('--')) {
    return azureFunctionName.replace('--', ':');
  }
  // No separator means no module namespace
  return azureFunctionName;
}

/**
 * Validate that a tool name follows Idyll conventions
 * Must be valid JS identifiers: [module:]function
 */
export function validateToolName(toolName: string): { valid: boolean; error?: string } {
  const pattern = /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  
  if (!pattern.test(toolName)) {
    return {
      valid: false,
      error: 'Tool name must be valid JS identifiers in format "module:function" or "function"'
    };
  }
  
  return { valid: true };
}

/**
 * Parse a tool name into module and function parts
 */
export function parseToolName(toolName: string): { module?: string; function: string } {
  const colonIndex = toolName.indexOf(':');
  
  if (colonIndex === -1) {
    return { function: toolName };
  }
  
  return {
    module: toolName.substring(0, colonIndex),
    function: toolName.substring(colonIndex + 1)
  };
}

/**
 * Build a tool name from module and function parts
 */
export function buildToolName(module: string | undefined, functionName: string): string {
  return module ? `${module}:${functionName}` : functionName;
}