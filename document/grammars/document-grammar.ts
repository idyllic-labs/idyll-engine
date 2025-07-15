/**
 * Document Grammar for Idyll Documents
 * 
 * Defines the structure for content documents with blocks and rich text.
 */

import { Rule, terminal, seq, choice, repeat, optional, ref, oneOrMore, zeroOrMore } from './grammar-dsl';

export const DOCUMENT_GRAMMAR: Record<string, Rule> = {
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

  // Blocks
  block: choice(
    'content-block',
    'executable-block', 
    'function-block'
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
      'idyll-fn': {
        type: 'string',
        required: true,
        // Format: \"module:function\" or just \"function\" (e.g., \"demo:echo\", \"ai:analyzeText\", \"echo\")
        // Module and function names MUST be valid JS identifiers
        // For Azure Functions compatibility, transform at adapter layer:
        // \"module:function\" → \"module--function\" (double hyphen separator)
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
        // Format: \"module:trigger\" or just \"trigger\" (e.g., \"time:schedule\", \"webhook:receive\", \"daily\")
        // Module and trigger names MUST be valid JS identifiers
        // For Azure Functions compatibility, transform at adapter layer:
        // \"module:trigger\" → \"module--trigger\" (double hyphen separator)
        pattern: /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/
      },
      enabled: { type: 'boolean', default: true }
    }),
    optional('params'),
    optional('content')
  ),

  // Function blocks (custom function definitions)
  'function-block': seq(
    terminal('function', {
      title: { type: 'string', required: true },
      icon: { type: 'string', required: false }
    }),
    ref('function-description'),
    ref('function-definition')
  ),

  'function-description': terminal('function:description', {}, 'text'),

  'function-definition': seq(
    terminal('function:definition'),
    zeroOrMore(choice('content-block', 'executable-block')) // no nested function blocks!
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
};