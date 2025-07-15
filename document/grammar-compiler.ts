/**
 * Grammar Compiler - Transforms grammar into usable structures
 * 
 * This compiler takes our EBNF-style grammar and generates:
 * 1. Element-to-type mappings
 * 2. Validation functions
 * 3. AST type definitions
 * 4. Schema for backward compatibility
 */

import type { Rule, AttributeDef } from './grammar';

// Define types locally since we removed schema.ts
export interface ElementSchema {
  element: string;
  type?: string;
  block: boolean;
  content?: 'text' | 'rich' | 'json' | 'none';
  attributes?: Record<string, AttributeDef>;
}

export interface ValidationError {
  type: 'attribute' | 'content' | 'structure';
  message: string;
  path?: string;
}

export interface CompiledGrammar {
  // Element name -> AST type mapping
  elementToType: Record<string, string>;
  
  // AST type -> element name(s) mapping
  typeToElements: Record<string, string[]>;
  
  // Element name -> schema mapping (for compatibility)
  elementSchemas: Record<string, ElementSchema>;
  
  // Validation functions
  isValidElement: (element: string) => boolean;
  isValidChild: (parentType: string, childElement: string) => boolean;
  validateAttributes: (element: string, attrs: Record<string, unknown>) => ValidationError[];
  
  // Type information
  blockTypes: Set<string>;
  inlineElements: Set<string>;
}

export class GrammarCompiler {
  private grammar: Record<string, Rule>;
  private compiled: CompiledGrammar | null = null;

  constructor(grammar: Record<string, Rule>) {
    this.grammar = grammar;
  }

  /**
   * Compile the grammar into usable structures
   */
  compile(): CompiledGrammar {
    if (this.compiled) return this.compiled;

    const elementToType: Record<string, string> = {};
    const typeToElements: Record<string, string[]> = {};
    const elementSchemas: Record<string, ElementSchema> = {};
    const blockTypes = new Set<string>();
    const inlineElements = new Set<string>();

    // First pass: collect all terminals and their types
    const terminals = this.collectTerminals();
    
    // Build element mappings
    for (const [ruleName, terminal] of terminals) {
      const element = terminal.element;
      if (element.startsWith('_')) continue; // Skip pseudo-elements

      // Determine AST type
      const astType = this.inferAstType(element, ruleName);
      
      // Element -> Type mapping
      elementToType[element] = astType;
      
      // Type -> Elements mapping
      if (!typeToElements[astType]) {
        typeToElements[astType] = [];
      }
      typeToElements[astType].push(element);

      // Build schema
      elementSchemas[element] = {
        element: element,
        type: astType,
        block: this.isBlockRule(ruleName),
        attributes: terminal.attributes,
        content: terminal.content as 'text' | 'rich' | 'json' | 'none' | undefined,
      };

      // Classify as block or inline
      if (this.isBlockRule(ruleName)) {
        blockTypes.add(astType);
      } else if (this.isInlineRule(ruleName)) {
        inlineElements.add(element);
      }
    }

    // Build validation functions
    const isValidElement = (element: string) => element in elementToType;
    
    const isValidChild = (parentType: string, childElement: string) => {
      // Find rules that define valid children for this parent type
      const rule = this.findRuleByType(parentType);
      if (!rule) return false;
      
      return this.isValidInContext(rule, childElement);
    };

    const validateAttributes = (element: string, attrs: Record<string, unknown>) => {
      const schema = elementSchemas[element];
      if (!schema || !schema.attributes) return [];
      
      return this.validateAttrs(attrs, schema.attributes, element);
    };

    this.compiled = {
      elementToType,
      typeToElements,
      elementSchemas,
      isValidElement,
      isValidChild,
      validateAttributes,
      blockTypes,
      inlineElements,
    };

    return this.compiled;
  }

  /**
   * Collect all terminal rules with their contexts
   */
  private collectTerminals(): Map<string, { element: string; attributes?: Record<string, AttributeDef>; content?: string }> {
    const terminals = new Map();
    const visited = new Set<string>();

    const visit = (ruleName: string, rule: Rule) => {
      // Avoid infinite recursion
      const key = `${ruleName}:${JSON.stringify(rule)}`;
      if (visited.has(key)) return;
      visited.add(key);

      switch (rule.type) {
        case 'terminal':
          terminals.set(ruleName, {
            element: rule.element,
            attributes: rule.attributes,
            content: rule.content,
          });
          break;

        case 'choice':
        case 'sequence':
          rule.rules.forEach((r, i) => {
            if (r.type === 'ref') {
              visit(r.name, this.grammar[r.name]);
            } else {
              visit(`${ruleName}[${i}]`, r);
            }
          });
          break;

        case 'repeat':
        case 'optional':
          if (rule.rule.type === 'ref') {
            visit(rule.rule.name, this.grammar[rule.rule.name]);
          } else {
            visit(`${ruleName}:inner`, rule.rule);
          }
          break;

        case 'ref':
          if (this.grammar[rule.name]) {
            visit(rule.name, this.grammar[rule.name]);
          }
          break;
      }
    };

    // Start from all top-level rules
    for (const [name, rule] of Object.entries(this.grammar)) {
      visit(name, rule);
    }

    return terminals;
  }

  /**
   * Infer AST type from element name and rule context
   */
  private inferAstType(element: string, ruleName: string): string {
    // Special cases
    const typeMap: Record<string, string> = {
      'p': 'paragraph',
      'paragraph': 'paragraph',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
      'heading': 'heading',
      'fncall': 'function_call',
      'bulletlistitem': 'bulletListItem',
      'numberedlistitem': 'numberedListItem',
      'checklistitem': 'checklistItem',
      'function:description': '_function_description',
      'function:definition': '_function_definition',
    };

    return typeMap[element] || element.replace(/[:-]/g, '_');
  }

  /**
   * Check if a rule represents a block element
   */
  private isBlockRule(ruleName: string): boolean {
    // Check if this rule is referenced by block-level rules
    return ruleName.includes('block') || 
           ruleName === 'paragraph' ||
           ruleName === 'heading' ||
           ruleName === 'list' ||
           ruleName === 'code' ||
           ruleName === 'quote' ||
           ruleName === 'separator' ||
           ruleName === 'function-block';
  }

  /**
   * Check if a rule represents an inline element
   */
  private isInlineRule(ruleName: string): boolean {
    return ruleName.includes('styled-text') ||
           ruleName === 'mention' ||
           ruleName === 'variable' ||
           ruleName === 'link' ||
           ruleName === 'text';
  }

  /**
   * Find a rule that produces the given AST type
   */
  private findRuleByType(astType: string): Rule | null {
    // This is a simplified version - in practice we'd need a more
    // sophisticated mapping from AST types back to grammar rules
    const ruleMap: Record<string, string> = {
      'function': 'function-block',
      'list': 'list',
      'function_call': 'function-call',
      'trigger': 'trigger',
    };

    const ruleName = ruleMap[astType];
    return ruleName ? this.grammar[ruleName] : null;
  }

  /**
   * Check if an element is valid in a given context
   */
  private isValidInContext(rule: Rule, element: string): boolean {
    switch (rule.type) {
      case 'terminal':
        return rule.element === element;

      case 'choice':
        return rule.rules.some(r => this.isValidInContext(r, element));

      case 'sequence':
        // Check all parts of sequence
        return rule.rules.some(r => this.isValidInContext(r, element));

      case 'repeat':
      case 'optional':
        return this.isValidInContext(rule.rule, element);

      case 'ref':
        const referenced = this.grammar[rule.name];
        return referenced ? this.isValidInContext(referenced, element) : false;

      default:
        return false;
    }
  }

  /**
   * Validate attributes against schema
   */
  private validateAttrs(
    attrs: Record<string, unknown>,
    schema: Record<string, AttributeDef>,
    element: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required attributes
    for (const [name, def] of Object.entries(schema)) {
      if (def.required && !(name in attrs)) {
        errors.push({
          type: 'attribute',
          path: `${element}@${name}`,
          message: `Required attribute missing: ${name}`,
        });
      }
    }

    // Validate present attributes
    for (const [name, value] of Object.entries(attrs)) {
      const def = schema[name];
      if (!def) continue; // Unknown attributes allowed

      // Type validation
      if (def.type === 'enum' && def.values && !def.values.includes(value as string)) {
        errors.push({
          type: 'attribute',
          path: `${element}@${name}`,
          message: `Invalid value: must be one of ${def.values.join(', ')}`,
        });
      }

      // Pattern validation
      if (def.pattern && typeof value === 'string' && !def.pattern.test(value)) {
        errors.push({
          type: 'attribute',
          path: `${element}@${name}`,
          message: `Invalid format for ${name}`,
        });
      }

      // Custom validation
      if (def.validate) {
        const error = def.validate(value);
        if (error) {
          errors.push({
            type: 'attribute',
            path: `${element}@${name}`,
            message: error,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Generate TypeScript AST types from grammar
   */
  generateTypes(): string {
    const compiled = this.compile();
    const types: string[] = [];

    // Generate block type union
    const blockTypeNames = Array.from(compiled.blockTypes)
      .map(t => `'${t}'`)
      .join(' | ');
    types.push(`export type BlockType = ${blockTypeNames};`);

    // Generate element mappings
    types.push('\nexport const ELEMENT_TO_TYPE = {');
    for (const [element, type] of Object.entries(compiled.elementToType)) {
      types.push(`  '${element}': '${type}',`);
    }
    types.push('} as const;');

    return types.join('\n');
  }
}