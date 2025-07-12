/**
 * EBNF-style Grammar DSL for Idyllic Documents
 * 
 * This provides a clean, readable grammar that generates:
 * - TypeScript types
 * - Parser rules
 * - Validation logic
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

// ============================================
// Grammar Definition
// ============================================

export const GRAMMAR: Record<string, Rule> = {
  // Root types
  root: choice(
    'document',
    'agent',
    'diff'
  ),

  // Document root
  document: seq(
    terminal('document', { 
      id: { type: 'string', required: false },
      version: { type: 'string', required: false },
      created: { type: 'string', required: false },
      modified: { type: 'string', required: false }
    }),
    zeroOrMore('block')
  ),

  // Agent system prompt root
  agent: seq(
    terminal('agent', {
      id: { type: 'string', required: false },
      name: { type: 'string', required: false },
      description: { type: 'string', required: false },
      model: { type: 'string', required: false }
    }),
    zeroOrMore('block')
  ),

  // Diff operations root
  diff: seq(
    terminal('diff', {
      targetDocument: { type: 'string', required: false },
      timestamp: { type: 'string', required: false }
    }),
    oneOrMore('edit-operation')
  ),

  // Blocks
  block: choice(
    'content-block',
    'executable-block', 
    'tool-block'
  ),

  'content-block': choice(
    'paragraph',
    'heading',
    'bullet-list-item',
    'numbered-list-item',
    'checklist-item',
    'code',
    'quote',
    'separator',
    'data'
  ),

  'executable-block': choice(
    'function-call',
    'trigger'
  ),

  // Content blocks
  paragraph: choice(
    terminal('p', {}, 'rich'),
    terminal('paragraph', {}, 'rich') // legacy support
  ),
  
  heading: choice(
    terminal('h1', {}, 'rich'),
    terminal('h2', {}, 'rich'),
    terminal('h3', {}, 'rich'),
    terminal('h4', {}, 'rich'),
    terminal('h5', {}, 'rich'),
    terminal('h6', {}, 'rich'),
    terminal('heading', { // legacy support
      level: { type: 'number', required: true, validate: (v: unknown) => {
        const num = Number(v);
        return num >= 1 && num <= 6 ? null : 'Level must be 1-6';
      }}
    }, 'rich')
  ),

  // List items (individual blocks, no containers)
  'bullet-list-item': terminal('bulletlistitem', {}, 'rich'),
  
  'numbered-list-item': terminal('numberedlistitem', {}, 'rich'),
  
  'checklist-item': terminal('checklistitem', {
    checked: { type: 'boolean', required: true }
  }, 'rich'),

  code: terminal('code', { 
    language: { type: 'string', required: false } 
  }, 'text'),

  quote: terminal('quote', {
    author: { type: 'string', required: false },
    source: { type: 'string', required: false }
  }, 'rich'),

  separator: terminal('separator', {}, 'none'),
  
  data: terminal('data', {
    title: { type: 'string', required: false }
  }, 'text'),

  // Executable blocks
  'function-call': seq(
    terminal('fncall', {
      'idyll-tool': {
        type: 'string',
        required: true,
        // Format: "module:function" or just "function" (e.g., "demo:echo", "ai:analyzeText", "echo")
        // Module and function names MUST be valid JS identifiers
        // For Azure Functions compatibility, transform at adapter layer:
        // "module:function" → "module--function" (double hyphen separator)
        pattern: /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/
      },
      modelId: { type: 'string', required: false }
    }),
    optional('params'),
    optional('content'),
    optional('result')
  ),

  trigger: seq(
    terminal('trigger', {
      'idyll-trigger': {
        type: 'string',
        required: true,
        // Format: "module:trigger" or just "trigger" (e.g., "time:schedule", "webhook:receive", "daily")
        // Module and trigger names MUST be valid JS identifiers
        // For Azure Functions compatibility, transform at adapter layer:
        // "module:trigger" → "module--trigger" (double hyphen separator)
        pattern: /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/
      },
      enabled: { type: 'boolean', default: true }
    }),
    optional('params'),
    optional('content')
  ),

  // Tool blocks
  'tool-block': seq(
    terminal('tool', {
      title: { type: 'string', required: true },
      icon: { type: 'string', required: false }
    }),
    ref('tool-description'),
    ref('tool-definition')
  ),

  'tool-description': terminal('tool:description', {}, 'text'),

  'tool-definition': seq(
    terminal('tool:definition'),
    zeroOrMore(choice('content-block', 'executable-block')) // no nested tools!
  ),

  // Function call children
  params: seq(
    terminal('params'),
    ref('json-content')
  ),

  content: seq(
    terminal('content'),
    ref('rich-content')
  ),

  result: seq(
    terminal('result'),
    ref('json-content')
  ),

  // Content types
  'rich-content': zeroOrMore(choice(
    'text',
    'styled-text',
    'mention',
    'variable',
    'link',
    'annotation',
    'annotated-text',
    'ai-edit-response'
  )),

  'text-content': terminal('_text', {}, 'text'), // pseudo-element for plain text
  'json-content': terminal('_json', {}, 'json'), // pseudo-element for JSON

  // Inline elements
  'styled-text': choice(
    seq(choice(terminal('strong'), terminal('b')), ref('rich-content')),
    seq(choice(terminal('em'), terminal('i')), ref('rich-content')),
    seq(choice(terminal('u'), terminal('underline')), ref('rich-content')),
    seq(choice(terminal('s'), terminal('strike'), terminal('del')), ref('rich-content')),
    seq(choice(terminal('code'), terminal('tt')), ref('rich-content'))
  ),
  
  annotation: seq(
    terminal('annotation', {
      title: { type: 'string', required: false },
      comment: { type: 'string', required: false },
      confidence: { type: 'number', required: false }
    }),
    ref('rich-content')
  ),

  mention: choice(
    terminal('mention:user', { 
      id: { type: 'string', required: true },
      label: { type: 'string', required: false }
    }, 'text'),
    terminal('mention:document', { 
      id: { type: 'string', required: true },
      label: { type: 'string', required: false }
    }, 'text'),
    terminal('mention:agent', { 
      id: { type: 'string', required: true },
      label: { type: 'string', required: false }
    }, 'text'),
    terminal('mention:custom', {
      id: { type: 'string', required: true },
      type: { type: 'string', required: true },
      label: { type: 'string', required: false }
    }, 'text')
  ),

  variable: terminal('variable', { 
    name: { type: 'string', required: true },
    prompt: { type: 'string', required: false },
    value: { type: 'string', required: false }
  }, 'none'),

  link: seq(
    terminal('a', { 
      href: { type: 'string', required: true, pattern: /^https?:\/\/.+/ } 
    }),
    ref('rich-content')
  ),
  
  'annotated-text': seq(
    terminal('annotatedtext', {
      annotation: { type: 'string', required: true }
    }),
    ref('rich-content')
  ),
  
  'ai-edit-response': seq(
    terminal('aieditresponse', {
      status: { type: 'enum', values: ['pending', 'accepted', 'rejected'] as const, required: true }
    }),
    ref('rich-content')
  ),

  text: terminal('_text', {}, 'text'), // Raw text node

  // Edit operations (for diff root)
  'edit-operation': choice(
    'edit-prop',
    'edit-content',
    'insert',
    'delete',
    'replace'
  ),

  'edit-prop': terminal('edit:prop', {
    'block-id': { type: 'string', required: true },
    name: { type: 'string', required: true },
    value: { type: 'string', required: true }
  }, 'none'),

  'edit-content': seq(
    terminal('edit:content', {
      'block-id': { type: 'string', required: true }
    }),
    ref('rich-content')
  ),

  insert: seq(
    terminal('insert', {
      'after-block-id': { type: 'string', required: false },
      'before-block-id': { type: 'string', required: false },
      'at-start': { type: 'boolean', required: false },
      'at-end': { type: 'boolean', required: false }
    }),
    oneOrMore('block')
  ),

  delete: terminal('delete', {
    'block-id': { type: 'string', required: true }
  }, 'none'),

  replace: seq(
    terminal('replace', {
      'block-id': { type: 'string', required: true }
    }),
    oneOrMore('block')
  )
};

// ============================================
// Grammar Compiler
// ============================================

export class GrammarCompiler {
  private rules: Record<string, Rule>;

  constructor(grammar: Record<string, Rule>) {
    this.rules = grammar;
  }

  /**
   * Validate an element matches a rule
   */
  validate(element: string, ruleName: string): boolean {
    const rule = this.rules[ruleName];
    if (!rule) throw new Error(`Unknown rule: ${ruleName}`);
    return this.matchesRule(element, rule);
  }

  private matchesRule(element: string, rule: Rule): boolean {
    switch (rule.type) {
      case 'terminal':
        return element === rule.element;
      
      case 'choice':
        return rule.rules.some(r => this.matchesRule(element, r));
      
      case 'ref':
        return this.matchesRule(element, this.rules[rule.name]);
      
      // Sequence, repeat, optional need full AST context
      default:
        return false;
    }
  }

  /**
   * Get all terminal elements from the grammar
   */
  getElements(): Set<string> {
    const elements = new Set<string>();
    
    const visit = (rule: Rule) => {
      switch (rule.type) {
        case 'terminal':
          if (!rule.element.startsWith('_')) { // Skip pseudo-elements
            elements.add(rule.element);
          }
          break;
        case 'sequence':
        case 'choice':
          rule.rules.forEach(visit);
          break;
        case 'repeat':
        case 'optional':
          visit(rule.rule);
          break;
        case 'ref':
          visit(this.rules[rule.name]);
          break;
      }
    };

    Object.values(this.rules).forEach(visit);
    return elements;
  }

  /**
   * Generate TypeScript types from grammar
   */
  generateTypes(): string {
    // This would generate the AST types from the grammar
    // For now, just a placeholder
    return `// Generated types from grammar`;
  }
}

// ============================================
// Exports
// ============================================

export const grammarCompiler = new GrammarCompiler(GRAMMAR);