/**
 * Diff Grammar for Idyll Document Transformations
 * 
 * Defines the structure for diff operations that modify documents.
 */

import { Rule, terminal, seq, oneOrMore, choice, ref } from './grammar-dsl';

export const DIFF_GRAMMAR: Record<string, Rule> = {
  // Diff operations root
  diff: seq(
    terminal('diff', {
      targetDocument: { type: 'string', required: false },
      timestamp: { type: 'string', required: false }
    }),
    oneOrMore('edit-operation')
  ),

  // Edit operations
  'edit-operation': choice(
    'edit-attr',
    'edit-content',
    'edit-params',
    'edit-id',
    'insert',
    'delete',
    'replace',
    'move'
  ),

  'edit-attr': terminal('edit:attr', {
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

  'edit-params': seq(
    terminal('edit:params', {
      'block-id': { type: 'string', required: true }
    }),
    ref('json-content')
  ),

  'edit-id': terminal('edit:id', {
    'block-id': { type: 'string', required: true },
    value: { type: 'string', required: true }
  }, 'none'),

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
  ),

  move: terminal('move', {
    'block-id': { type: 'string', required: false },
    'block-ids': { type: 'string', required: false },
    'from-block-id': { type: 'string', required: false },
    'to-block-id': { type: 'string', required: false },
    'after-block-id': { type: 'string', required: false },
    'before-block-id': { type: 'string', required: false },
    'at-start': { type: 'boolean', required: false },
    'at-end': { type: 'boolean', required: false }
  }, 'none')
};

// Note: Diff grammar references 'rich-content', 'json-content', and 'block' 
// from document grammar. These will be resolved when grammars are combined