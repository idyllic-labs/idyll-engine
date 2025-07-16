/**
 * Function naming utilities for Idyll Engine
 * 
 * Handles transformation between Idyll function names (module:function) 
 * and external platform requirements.
 */

/**
 * Transform Idyll function name to Azure function name
 * "module:function" → "module--function"
 * "function" → "function" (no module)
 */
export function toAzureFunctionName(idyllFunctionName: string): string {
  return idyllFunctionName.replace(':', '--');
}

/**
 * Transform Azure function name back to Idyll function name
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
 * Validate that a function name follows Idyll conventions
 * Must be valid JS identifiers: [module:]function
 */
export function validateFunctionName(functionName: string): { valid: boolean; error?: string } {
  const pattern = /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  
  if (!pattern.test(functionName)) {
    return {
      valid: false,
      error: 'Function name must be valid JS identifiers in format "module:function" or "function"'
    };
  }
  
  return { valid: true };
}

/**
 * Parse a function name into module and function parts
 */
export function parseFunctionName(functionName: string): { module?: string; function: string } {
  const colonIndex = functionName.indexOf(':');
  
  if (colonIndex === -1) {
    return { function: functionName };
  }
  
  return {
    module: functionName.substring(0, colonIndex),
    function: functionName.substring(colonIndex + 1)
  };
}

/**
 * Build a function name from module and function parts
 */
export function buildFunctionName(module: string | undefined, functionName: string): string {
  return module ? `${module}:${functionName}` : functionName;
}

