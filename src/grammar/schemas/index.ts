/**
 * Grammar Schemas - Combined Export
 * 
 * Exports all grammar definitions for different document types.
 */

// Re-export individual grammars
export { DOCUMENT_GRAMMAR } from './document';
export { AGENT_GRAMMAR } from './agent';
export { DIFF_GRAMMAR } from './diff';

// Combine all grammars into a single object (matches the current structure)
import { DOCUMENT_GRAMMAR } from './document';
import { AGENT_GRAMMAR } from './agent';
import { DIFF_GRAMMAR } from './diff';

export const GRAMMAR = {
  ...DOCUMENT_GRAMMAR,
  ...AGENT_GRAMMAR,
  ...DIFF_GRAMMAR,
};