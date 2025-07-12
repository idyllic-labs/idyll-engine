/**
 * Agent Grammar for Idyll System Prompts
 * 
 * Defines the structure for agent documents containing system prompts.
 */

import { Rule, terminal, seq, zeroOrMore } from './grammar-dsl';

export const AGENT_GRAMMAR: Record<string, Rule> = {
  // Agent system prompt root
  agent: seq(
    terminal('agent', {
      id: { type: 'string', required: false },
      name: { type: 'string', required: false },
      description: { type: 'string', required: false },
      model: { type: 'string', required: false }
    }),
    zeroOrMore('block')
  )
};

// Note: Agent grammar references 'block' from document grammar
// This will be resolved when grammars are combined