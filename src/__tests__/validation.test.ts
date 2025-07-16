#!/usr/bin/env bun
/**
 * Test suite for Zod validation schemas
 */

import { describe, test, expect } from 'bun:test';
import {
  validateDocument,
  validateNode,
  validateRichContent,
  validateEditOperation,
  safeValidateDocument,
  safeValidateEditOperation
} from '../grammar/validation';
import { safeApplyDiff } from '../document/diff-applier';
import type { IdyllDocument, Node, ContentNode, ExecutableNode, EditOperation } from '../document/ast';

describe('AST Validation', () => {
  describe('Document Validation', () => {
    test('should validate valid document', () => {
      const validDoc: IdyllDocument = {
        id: 'test-doc',
        nodes: [
          {
            id: 'node1',
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello world' }]
          }
        ]
      };

      expect(() => validateDocument(validDoc)).not.toThrow();
    });

    test('should reject document with invalid node', () => {
      const invalidDoc = {
        id: 'test-doc',
        nodes: [
          {
            id: 'node1',
            type: 'invalid-type', // Invalid type
            content: [{ type: 'text', text: 'Hello world' }]
          }
        ]
      };

      expect(() => validateDocument(invalidDoc)).toThrow();
    });

    test('should use safe validation for detailed errors', () => {
      const invalidDoc = {
        id: '', // Invalid empty ID
        nodes: []
      };

      const result = safeValidateDocument(invalidDoc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toBeDefined();
      }
    });
  });

  describe('Node Validation', () => {
    test('should validate ContentNode', () => {
      const contentNode: ContentNode = {
        id: 'content1',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Regular text' },
          { type: 'text', text: 'Bold text', styles: ['bold'] }
        ]
      };

      expect(() => validateNode(contentNode)).not.toThrow();
    });

    test('should validate ExecutableNode', () => {
      const executableNode: ExecutableNode = {
        id: 'exec1',
        type: 'function_call',
        fn: 'demo:echo',
        parameters: { message: 'test' }
      };

      expect(() => validateNode(executableNode)).not.toThrow();
    });

    test('should reject ExecutableNode with invalid function name', () => {
      const invalidNode = {
        id: 'exec1',
        type: 'function_call',
        fn: 'invalid-function-name', // Should be namespace:function
        parameters: {}
      };

      expect(() => validateNode(invalidNode)).toThrow();
    });
  });

  describe('RichContent Validation', () => {
    test('should validate text content', () => {
      const textContent = {
        type: 'text',
        text: 'Hello world',
        styles: ['bold', 'italic']
      };

      expect(() => validateRichContent(textContent)).not.toThrow();
    });

    test('should validate variable element', () => {
      const variableElement = {
        type: 'variable',
        name: 'userName',
        prompt: 'Enter your name'
      };

      expect(() => validateRichContent(variableElement)).not.toThrow();
    });

    test('should validate mention element', () => {
      const mentionElement = {
        type: 'mention',
        mentionType: 'user',
        id: 'user123',
        label: 'John Doe'
      };

      expect(() => validateRichContent(mentionElement)).not.toThrow();
    });

    test('should validate link element', () => {
      const linkElement = {
        type: 'link',
        href: 'https://example.com',
        content: [{ type: 'text', text: 'Click here' }]
      };

      expect(() => validateRichContent(linkElement)).not.toThrow();
    });

    test('should reject link with invalid URL', () => {
      const invalidLink = {
        type: 'link',
        href: 'not-a-url',
        content: [{ type: 'text', text: 'Click here' }]
      };

      expect(() => validateRichContent(invalidLink)).toThrow();
    });
  });

  describe('EditOperation Validation', () => {
    test('should validate edit:attr operation', () => {
      const editAttr: EditOperation = {
        type: 'edit:attr',
        blockId: 'block1',
        name: 'className',
        value: 'highlight'
      };

      expect(() => validateEditOperation(editAttr)).not.toThrow();
    });

    test('should validate insert operation', () => {
      const insertOp: EditOperation = {
        type: 'insert',
        atEnd: true,
        blocks: [{
          id: 'new-block',
          type: 'paragraph',
          content: [{ type: 'text', text: 'New content' }]
        }]
      };

      expect(() => validateEditOperation(insertOp)).not.toThrow();
    });

    test('should reject insert operation with multiple positions', () => {
      const invalidInsert = {
        type: 'insert',
        atStart: true,
        atEnd: true, // Can't specify both
        blocks: []
      };

      expect(() => validateEditOperation(invalidInsert)).toThrow();
    });

    test('should validate move operation', () => {
      const moveOp: EditOperation = {
        type: 'move',
        blockId: 'block1',
        afterBlockId: 'block2'
      };

      expect(() => validateEditOperation(moveOp)).not.toThrow();
    });

    test('should reject move operation with no source specified', () => {
      const invalidMove = {
        type: 'move',
        atEnd: true
        // No blockId, blockIds, or fromBlockId/toBlockId
      };

      expect(() => validateEditOperation(invalidMove)).toThrow();
    });
  });

  describe('Diff Application with Validation', () => {
    test('should apply valid operations', () => {
      const nodes: Node[] = [
        {
          id: 'block1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Original' }]
        }
      ];

      const operations: EditOperation[] = [
        {
          type: 'edit:content',
          blockId: 'block1',
          content: [{ type: 'text', text: 'Updated' }]
        }
      ];

      const result = safeApplyDiff(nodes, operations);
      expect(result.success).toBe(true);
      expect(result.nodes).toBeDefined();
    });

    test('should reject invalid operations', () => {
      const nodes: Node[] = [
        {
          id: 'block1',
          type: 'paragraph',
          content: [{ type: 'text', text: 'Original' }]
        }
      ];

      const invalidOperations = [
        {
          type: 'edit:content',
          blockId: '', // Invalid empty ID
          content: []
        }
      ];

      const result = safeApplyDiff(nodes, invalidOperations as EditOperation[]);
      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    });

    test('should reject operations on invalid input nodes', () => {
      const invalidNodes = [
        {
          id: 'block1',
          type: 'invalid-type', // Invalid node type
          content: []
        }
      ];

      const operations: EditOperation[] = [
        {
          type: 'edit:attr',
          blockId: 'block1',
          name: 'test',
          value: 'value'
        }
      ];

      const result = safeApplyDiff(invalidNodes as Node[], operations);
      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors![0]).toContain('Invalid input nodes');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content arrays', () => {
      const nodeWithEmptyContent: ContentNode = {
        id: 'empty-content',
        type: 'paragraph',
        content: []
      };

      expect(() => validateNode(nodeWithEmptyContent)).not.toThrow();
    });

    test('should handle optional properties', () => {
      const minimalExecutableNode: ExecutableNode = {
        id: 'minimal',
        type: 'function_call',
        fn: 'test:minimal',
        parameters: {}
      };

      expect(() => validateNode(minimalExecutableNode)).not.toThrow();
    });

    test('should validate nested content in links', () => {
      const nestedLink = {
        type: 'link',
        href: 'https://example.com',
        content: [
          { type: 'text', text: 'Visit ' },
          { type: 'text', text: 'our site', styles: ['bold'] }
        ]
      };

      expect(() => validateRichContent(nestedLink)).not.toThrow();
    });

    test('should validate complex document structure', () => {
      const complexDoc: IdyllDocument = {
        id: 'complex-doc',
        nodes: [
          {
            id: 'heading',
            type: 'heading',
            content: [{ type: 'text', text: 'Document Title' }],
            props: { level: 1 }
          },
          {
            id: 'paragraph',
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This paragraph mentions ' },
              { type: 'mention', mentionType: 'user', id: 'user1', label: 'John' },
              { type: 'text', text: ' and has a ' },
              { type: 'variable', name: 'dynamicValue', prompt: 'Enter value' }
            ]
          },
          {
            id: 'function',
            type: 'function_call',
            fn: 'ai:generate-text',
            parameters: { prompt: 'Generate a summary' },
            content: [{ type: 'text', text: 'Generate a summary of the above content' }]
          }
        ],
        metadata: {
          version: '1.0',
          created: new Date(),
          modified: new Date()
        }
      };

      expect(() => validateDocument(complexDoc)).not.toThrow();
    });
  });
});