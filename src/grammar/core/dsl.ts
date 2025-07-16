/**
 * Grammar DSL Types and Builder Functions
 * 
 * Provides the core types and helper functions for building grammars.
 */

// ============================================
// DSL Types
// ============================================

export type Rule = 
  | TerminalRule
  | SequenceRule
  | ChoiceRule
  | RepeatRule
  | OptionalRule
  | RefRule;

interface TerminalRule {
  type: 'terminal';
  element: string;
  attributes?: Record<string, AttributeDef>;
  content?: 'text' | 'rich' | 'json' | 'none';
}

interface SequenceRule {
  type: 'sequence';
  rules: Rule[];
}

interface ChoiceRule {
  type: 'choice';
  rules: Rule[];
}

interface RepeatRule {
  type: 'repeat';
  rule: Rule;
  min: number;
  max: number | null; // null = unbounded
}

interface OptionalRule {
  type: 'optional';
  rule: Rule;
}

interface RefRule {
  type: 'ref';
  name: string;
}

export interface AttributeDef {
  type: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  values?: readonly string[];
  pattern?: RegExp;
  validate?: (value: unknown) => string | null;
  default?: any;
}

// ============================================
// DSL Builder Functions
// ============================================

export function terminal(element: string, attrs?: Record<string, AttributeDef>, content?: 'text' | 'rich' | 'json' | 'none'): TerminalRule {
  return { type: 'terminal', element, attributes: attrs, content };
}

export function seq(...rules: (Rule | string)[]): SequenceRule {
  return { 
    type: 'sequence', 
    rules: rules.map(r => typeof r === 'string' ? ref(r) : r)
  };
}

export function choice(...rules: (Rule | string)[]): ChoiceRule {
  return { 
    type: 'choice', 
    rules: rules.map(r => typeof r === 'string' ? ref(r) : r)
  };
}

export function repeat(rule: Rule | string, min = 0, max: number | null = null): RepeatRule {
  return { 
    type: 'repeat', 
    rule: typeof rule === 'string' ? ref(rule) : rule,
    min, 
    max 
  };
}

export function optional(rule: Rule | string): OptionalRule {
  return { 
    type: 'optional', 
    rule: typeof rule === 'string' ? ref(rule) : rule
  };
}

export function ref(name: string): RefRule {
  return { type: 'ref', name };
}

// Shorthand helpers
export const zeroOrMore = (rule: Rule | string) => repeat(rule, 0, null);
export const oneOrMore = (rule: Rule | string) => repeat(rule, 1, null);
export const zeroOrOne = optional;