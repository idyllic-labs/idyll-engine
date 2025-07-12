/**
 * AI-based variable resolution for agent custom tools
 * 
 * Uses an AI model to intelligently resolve variables based on context
 */

import { generateText } from 'ai';
import { getModel } from './model-provider';
import { VariableDefinition, VariableResolutionContext, VariableResolutionResult } from '../document/variable-resolution';

/**
 * Resolve variables using AI
 */
export async function resolveVariablesWithAI(
  definitions: VariableDefinition[],
  context: VariableResolutionContext
): Promise<VariableResolutionResult> {
  console.log('🔮 AI Variable Resolution Starting');
  console.log('📊 Definitions:', definitions);
  console.log('🌍 Context:', context);
  
  if (definitions.length === 0) {
    return { variables: new Map() };
  }
  
  const variables = new Map<string, string>();
  const errors: Array<{ variable: string; error: string }> = [];
  
  // Build a prompt for the AI to resolve all variables at once
  const prompt = buildVariableResolutionPrompt(definitions, context);
  console.log('📝 Built prompt:', prompt);
  
  try {
    const result = await generateText({
      model: getModel('gpt-4.1'),
      temperature: 0.3, // Lower temperature for more consistent resolution
      system: `You are a helpful assistant that resolves variable values based on context.
Given the context and variable descriptions, provide appropriate values for each variable.
Return ONLY a JSON object with variable names as keys and their resolved values as values.
Do not include any markdown formatting or explanation.`,
      prompt: `${prompt}

Return a JSON object like: {"variableName": "resolvedValue", ...}`,
    });
    
    console.log('🤖 AI Response:', result.text);
    
    // Parse the AI response
    try {
      const resolved = JSON.parse(result.text);
      console.log('✅ Parsed JSON:', resolved);
      
      // Validate and store resolved values
      for (const def of definitions) {
        if (def.name in resolved) {
          const value = String(resolved[def.name]);
          variables.set(def.name, value);
          console.log(`💎 Resolved ${def.name} = "${value}"`);
        } else {
          // AI didn't resolve this variable
          variables.set(def.name, def.name); // Fallback to variable name
          console.log(`⚠️ AI didn't resolve ${def.name}, using fallback`);
        }
      }
    } catch (parseError) {
      // If AI response isn't valid JSON, fall back to simple extraction
      console.warn('Failed to parse AI response as JSON, using fallback resolution');
      
      // Try to extract values from the text response
      for (const def of definitions) {
        const pattern = new RegExp(`${def.name}[: ]+"?([^"]+)"?`, 'i');
        const match = result.text.match(pattern);
        if (match) {
          variables.set(def.name, match[1].trim());
        } else {
          variables.set(def.name, def.name); // Fallback
        }
      }
    }
  } catch (error) {
    // If AI call fails, add all variables as errors
    for (const def of definitions) {
      errors.push({
        variable: def.name,
        error: error instanceof Error ? error.message : 'AI resolution failed',
      });
      // Provide fallback value
      variables.set(def.name, `[${def.name}]`);
    }
  }
  
  return { variables, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Build prompt for variable resolution
 */
function buildVariableResolutionPrompt(
  definitions: VariableDefinition[],
  context: VariableResolutionContext
): string {
  const parts: string[] = [];
  
  // Add agent context (the primary context for custom tools)
  if (context.agentContext) {
    parts.push(`Context: ${context.agentContext}`);
  }
  
  // Add document context if available
  if (context.documentContext) {
    parts.push(`Document context: ${context.documentContext}`);
  }
  
  // Add inherited context if available
  if (context.inheritedContext && Object.keys(context.inheritedContext).length > 0) {
    parts.push(`Additional context: ${JSON.stringify(context.inheritedContext)}`);
  }
  
  // Add variables to resolve
  parts.push('\nVariables to resolve:');
  for (const def of definitions) {
    if (def.prompt) {
      parts.push(`- ${def.name}: ${def.prompt}`);
    } else {
      parts.push(`- ${def.name} (no prompt provided)`);
    }
  }
  
  parts.push('\nProvide a JSON object with resolved values for each variable based on the context.');
  
  return parts.join('\n');
}