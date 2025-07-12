/**
 * Tests for the Idyll Engine
 * 
 * This demonstrates the core functionality without any Remix dependencies
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseXML,
  serializeToXML,
  validateDocument,
  DocumentExecutor,
  type ToolResolver,
  type ToolExecutor,
  type ToolDefinition,
  type ToolResult,
  type ValidationContext,
  type DocumentExecutionContext,
} from '../index';

describe('Idyll Engine', () => {
  describe('XML Parsing', () => {
    it('should parse basic document structure', () => {
      const xml = `
        <document id="test-doc">
          <p>Hello world</p>
          <h1>This is a heading</h1>
        </document>
      `;

      const doc = parseXML(xml);
      
      expect(doc.id).toBe('test-doc');
      expect(doc.blocks).toHaveLength(2);
      expect(doc.blocks[0].type).toBe('paragraph');
      expect(doc.blocks[1].type).toBe('heading');
    });

    it('should parse function call blocks', () => {
      const xml = `
        <document>
          <fncall idyll-tool="test:hello" enabled="true">
            <params><![CDATA[{"name": "World"}]]></params>
            <content>Say hello to the world</content>
          </fncall>
        </document>
      `;

      const doc = parseXML(xml);
      const block = doc.blocks[0];
      
      expect(block.type).toBe('function_call');
      if (block.type === 'function_call') {
        expect(block.tool).toBe('test:hello');
        expect(block.parameters).toEqual({ name: 'World' });
        expect(block.instructions?.[0]).toMatchObject({
          type: 'text',
          text: 'Say hello to the world'
        });
      }
    });

    it('should parse trigger blocks', () => {
      const xml = `
        <document>
          <trigger idyll-trigger="time:schedule" enabled="true">
            <params><![CDATA[{"cronExpression": "0 9 * * *"}]]></params>
            <content>Daily morning task</content>
          </trigger>
        </document>
      `;

      const doc = parseXML(xml);
      const block = doc.blocks[0];
      
      expect(block.type).toBe('trigger');
      if (block.type === 'trigger') {
        expect(block.tool).toBe('time:schedule');
        expect(block.parameters).toEqual({ cronExpression: '0 9 * * *' });
        expect(block.metadata?.enabled).toBe(true);
      }
    });

    it('should handle rich text content', () => {
      const xml = `
        <document>
          <p>
            This is <strong>bold</strong> and <em>italic</em> text.
            <link href="https://example.com">A link</link>
            <mention id="user-123" type="user" label="@alice"/>
            <variable name="currentDate" type="date"/>
          </p>
        </document>
      `;

      const doc = parseXML(xml);
      const paragraph = doc.blocks[0];
      
      if (paragraph.type === 'paragraph') {
        const content = paragraph.content;
        expect(content).toHaveLength(8); // text, bold, text, italic, text, link, mention, variable
        
        // Check bold
        expect(content[1]).toMatchObject({
          type: 'text',
          text: 'bold',
          styles: { bold: true }
        });
        
        // Check mention
        expect(content[5]).toMatchObject({
          type: 'mention',
          id: 'user-123',
          mentionType: 'user',
          label: '@alice'
        });
        
        // Check variable
        expect(content[6]).toMatchObject({
          type: 'variable',
          name: 'currentDate',
          variableType: 'date'
        });
      }
    });
  });

  describe('XML Serialization', () => {
    it('should serialize document back to XML', () => {
      const doc = {
        id: 'test-doc',
        blocks: [
          {
            id: 'p1',
            type: 'paragraph' as const,
            content: [
              { type: 'text' as const, text: 'Hello ' },
              { type: 'text' as const, text: 'world', styles: { bold: true } }
            ]
          },
          {
            id: 'f1',
            type: 'function_call' as const,
            tool: 'test:greet',
            parameters: { name: 'Alice' },
            instructions: [{ type: 'text' as const, text: 'Greet the user' }]
          }
        ]
      };

      const xml = serializeToXML(doc);
      
      expect(xml).toContain('<document id="test-doc">');
      expect(xml).toContain('<p>Hello <strong>world</strong></p>');
      expect(xml).toContain('<fncall idyll-tool="test:greet">');
      expect(xml).toContain('<params><![CDATA[{"name":"Alice"}]]></params>');
      expect(xml).toContain('<content>Greet the user</content>');
    });
  });

  describe('Document Validation', () => {
    it('should validate document structure', async () => {
      const doc = parseXML(`
        <document>
          <p>Valid paragraph</p>
          <fncall idyll-tool="test:hello">
            <params><![CDATA[{"name": "World"}]]></params>
          </fncall>
        </document>
      `);

      const result = await validateDocument(doc);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate tool references when context provided', async () => {
      const doc = parseXML(`
        <document>
          <fncall idyll-tool="unknown:tool">
            <params><![CDATA[{}]]></params>
          </fncall>
        </document>
      `);

      const context: ValidationContext = {
        validateTool: (name) => name === 'test:hello' // Only test:hello exists
      };

      const result = await validateDocument(doc, context);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unknown tool: unknown:tool');
    });

    it('should validate mentions and variables', async () => {
      const doc = parseXML(`
        <document>
          <p>
            Hello <mention id="invalid-user" type="user" label="@unknown"/>
            The date is <variable name="invalidVar" type="date"/>
          </p>
        </document>
      `);

      const context: ValidationContext = {
        validateMention: (mention) => mention.id === 'user-123',
        validateVariable: (variable) => ({ 
          valid: variable.name === 'currentDate',
          value: new Date()
        })
      };

      const result = await validateDocument(doc, context);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('Invalid mention');
      expect(result.errors[1].message).toContain('Invalid variable');
    });
  });

  describe('Document Execution', () => {
    it('should execute function call blocks', async () => {
      // Create mock tool resolver and executor
      const mockTools: Record<string, ToolDefinition> = {
        'test:greet': {
          name: 'test:greet',
          title: 'Greet User',
          contentRequirement: 'optional',
          validate: (params) => {
            const p = params as any;
            if (!p.name) {
              return { success: false, errors: ['name is required'] };
            }
            return { success: true };
          }
        }
      };

      const toolResolver: ToolResolver = {
        resolve: (name) => mockTools[name] || null,
        list: () => Object.keys(mockTools)
      };

      const toolExecutor: ToolExecutor = {
        execute: async (tool, params, context) => {
          if (tool === 'test:greet') {
            const { name } = params as any;
            return {
              success: true,
              data: { greeting: `Hello, ${name}!` }
            };
          }
          return {
            success: false,
            error: { code: 'UNKNOWN_TOOL', message: 'Unknown tool' }
          };
        }
      };

      // Parse and execute document
      const doc = parseXML(`
        <document>
          <p>Let me greet you</p>
          <fncall idyll-tool="test:greet">
            <params><![CDATA[{"name": "Alice"}]]></params>
            <content>Greet the user named Alice</content>
          </fncall>
        </document>
      `);

      const executor = new DocumentExecutor(toolResolver, toolExecutor);
      const context: DocumentExecutionContext = {
        documentId: 'test-doc',
        user: { id: 'user-123', name: 'Test User' },
        canEdit: true,
        variables: {}
      };

      const result = await executor.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.executions).toHaveLength(1);
      expect(result.executions[0]).toMatchObject({
        blockId: doc.blocks[1].id,
        tool: 'test:greet',
        success: true,
        data: { greeting: 'Hello, Alice!' }
      });
    });

    it('should handle execution errors gracefully', async () => {
      const toolResolver: ToolResolver = {
        resolve: (name) => ({
          name,
          title: 'Test Tool',
          contentRequirement: 'disabled',
          validate: () => ({ success: true })
        }),
        list: () => ['test:fail']
      };

      const toolExecutor: ToolExecutor = {
        execute: async () => {
          throw new Error('Tool execution failed');
        }
      };

      const doc = parseXML(`
        <document>
          <fncall idyll-tool="test:fail">
            <params><![CDATA[{}]]></params>
          </fncall>
        </document>
      `);

      const executor = new DocumentExecutor(toolResolver, toolExecutor);
      const context: DocumentExecutionContext = {
        documentId: 'test-doc',
        user: { id: 'user-123' },
        canEdit: true,
        variables: {}
      };

      const result = await executor.execute(doc, context);
      
      expect(result.success).toBe(false);
      expect(result.executions[0].success).toBe(false);
      expect(result.executions[0].error?.message).toContain('Tool execution failed');
    });
  });

  describe('Complex Document Scenarios', () => {
    it('should handle nested blocks and multiple executions', async () => {
      const xml = `
        <document id="complex-doc">
          <h1>Document Processing Example</h1>
          <p>This document has multiple executable blocks.</p>
          
          <fncall idyll-tool="data:fetch">
            <params><![CDATA[{"source": "api", "limit": 10}]]></params>
            <content>Fetch latest data from API</content>
          </fncall>
          
          <list>
            <listItem>First item</listItem>
            <listItem>
              Nested content with 
              <fncall idyll-tool="ai:summarize">
                <params><![CDATA[{"maxLength": 100}]]></params>
                <content>Summarize the fetched data</content>
              </fncall>
            </listItem>
          </list>
          
          <trigger idyll-trigger="webhook:receive" enabled="false">
            <params><![CDATA[{"endpoint": "/api/hook"}]]></params>
            <content>Process incoming webhooks</content>
          </trigger>
        </document>
      `;

      const doc = parseXML(xml);
      
      // Verify structure
      expect(doc.id).toBe('complex-doc');
      expect(doc.blocks).toHaveLength(5); // h1, p, fncall, list, trigger
      
      // Check nested list structure
      const list = doc.blocks[3];
      if (list.type === 'list' && list.children) {
        expect(list.children).toHaveLength(2);
        const nestedItem = list.children[1];
        if (nestedItem.type === 'listItem' && nestedItem.content) {
          // Should have text and nested fncall
          expect(nestedItem.content.some(c => 
            c.type === 'text' && c.text.includes('Nested content')
          )).toBe(true);
        }
      }
      
      // Check disabled trigger
      const trigger = doc.blocks[4];
      if (trigger.type === 'trigger') {
        expect(trigger.metadata?.enabled).toBe(false);
      }
    });
  });
});