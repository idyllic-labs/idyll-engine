/**
 * Combined Grammar Index
 * 
 * Exports all grammars and provides a unified grammar for parsing.
 */

import { Rule, choice } from './grammar-dsl';
import { DOCUMENT_GRAMMAR } from './document-grammar';
import { AGENT_GRAMMAR } from './agent-grammar';
import { DIFF_GRAMMAR } from './diff-grammar';

// Combined grammar with all rules
export const GRAMMAR: Record<string, Rule> = {
  // Root types
  root: choice(
    'document',
    'agent', 
    'diff'
  ),

  // Merge all grammar rules
  ...DOCUMENT_GRAMMAR,
  ...AGENT_GRAMMAR,
  ...DIFF_GRAMMAR
};

// Export individual grammars
export { DOCUMENT_GRAMMAR } from './document-grammar';
export { AGENT_GRAMMAR } from './agent-grammar';
export { DIFF_GRAMMAR } from './diff-grammar';

// Export DSL
export * from './grammar-dsl';