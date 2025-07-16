import { describe, it, expect } from 'bun:test';
import { parseXmlToAst, serializeAstToXml } from '../grammar/parser';
import {
  extractVariableDefinitions,
  checkVariableRedeclaration,
  resolveVariables,
  applyResolvedVariables,
  interpolateContent,
} from '../document/variable-resolution';

describe('Variable Resolution', () => {
  describe('Variable Parsing', () => {
    it('should parse variables in content', () => {
      const xml = `
        <document>
          <p>Search for <variable name="topic" prompt="What to search for" /> today</p>
        </document>
      `;
      
      const doc = parseXmlToAst(xml);
      expect('nodes' in doc).toBe(true);
      
      if ('blocks' in doc) {
        const variables = extractVariableDefinitions(doc.nodes);
        expect(variables).toHaveLength(1);
        expect(variables[0].name).toBe('topic');
        expect(variables[0].prompt).toBe('What to search for');
      }
    });
    
    it('should handle multiple variables', () => {
      const xml = `
        <document>
          <p>Search for <variable name="topic" /> from <variable name="timeframe" prompt="Time period" /></p>
        </document>
      `;
      
      const doc = parseXmlToAst(xml);
      if ('blocks' in doc) {
        const variables = extractVariableDefinitions(doc.nodes);
        expect(variables).toHaveLength(2);
        expect(variables.map(v => v.name)).toEqual(['topic', 'timeframe']);
      }
    });
    
    it('should follow declare-once, use-many pattern', () => {
      const xml = `
        <document>
          <p>First: <variable name="topic" prompt="Main topic" /></p>
          <p>Second: <variable name="topic" /></p>
          <p>Third: <variable name="topic" /></p>
        </document>
      `;
      
      const doc = parseXmlToAst(xml);
      if ('blocks' in doc) {
        const variables = extractVariableDefinitions(doc.nodes);
        expect(variables).toHaveLength(1);
        expect(variables[0].prompt).toBe('Main topic');
      }
    });
  });
  
  describe('Variable Redeclaration', () => {
    it('should detect redeclaration with different prompt', () => {
      const xml = `
        <document>
          <p>First: <variable name="topic" prompt="Main topic" /></p>
          <p>Error: <variable name="topic" prompt="Different prompt" /></p>
        </document>
      `;
      
      const doc = parseXmlToAst(xml);
      if ('blocks' in doc) {
        const errors = checkVariableRedeclaration(doc.nodes);
        expect(errors).toHaveLength(1);
        expect(errors[0].name).toBe('topic');
        expect(errors[0].error).toContain('redeclared with different prompt');
      }
    });
    
    it('should allow usage without prompt after declaration', () => {
      const xml = `
        <document>
          <p>First: <variable name="topic" prompt="Main topic" /></p>
          <p>OK: <variable name="topic" /></p>
        </document>
      `;
      
      const doc = parseXmlToAst(xml);
      if ('blocks' in doc) {
        const errors = checkVariableRedeclaration(doc.nodes);
        expect(errors).toHaveLength(0);
      }
    });
  });
  
  describe('Variable Resolution', () => {
    it('should resolve variables based on context', async () => {
      const definitions = [
        { name: 'topic', prompt: 'Search topic', firstOccurrenceBlockId: '1', firstOccurrenceIndex: 0 },
        { name: 'timeframe', prompt: 'Time period', firstOccurrenceBlockId: '1', firstOccurrenceIndex: 1 },
      ];
      
      const result = await resolveVariables(definitions, {
        agentContext: 'Find information about AI breakthroughs from the past month',
      });
      
      expect(result.variables.has('topic')).toBe(true);
      expect(result.variables.has('timeframe')).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });
  
  describe('Variable Application', () => {
    it('should apply resolved variables to blocks', () => {
      const xml = `
        <document>
          <p id="p1">Search for <variable name="topic" /></p>
        </document>
      `;
      
      const doc = parseXmlToAst(xml);
      if ('blocks' in doc) {
        const resolved = new Map([['topic', 'AI breakthroughs']]);
        const applied = applyResolvedVariables(doc.nodes, resolved);
        
        // Check that the variable has resolvedValue
        const block = applied[0];
        if ('content' in block) {
          const variable = block.content.find(c => c.type === 'variable');
          expect(variable).toBeDefined();
          if (variable && 'resolvedValue' in variable) {
            expect(variable.resolvedValue).toBe('AI breakthroughs');
          }
        }
      }
    });
  });
  
  describe('Content Interpolation', () => {
    it('should interpolate variables in content', () => {
      const content = [
        { type: 'text', text: 'Search for ' },
        { type: 'variable', name: 'topic' },
        { type: 'text', text: ' from ' },
        { type: 'variable', name: 'timeframe' },
      ];
      
      const resolved = new Map([
        ['topic', 'AI breakthroughs'],
        ['timeframe', 'past month'],
      ]);
      
      const interpolated = interpolateContent(content as any, resolved);
      expect(interpolated).toBe('Search for AI breakthroughs from past month');
    });
    
    it('should handle unresolved variables', () => {
      const content = [
        { type: 'text', text: 'Search for ' },
        { type: 'variable', name: 'topic' },
      ];
      
      const resolved = new Map();
      const interpolated = interpolateContent(content as any, resolved);
      expect(interpolated).toBe('Search for {{topic}}');
    });
  });
  
  describe('XML Roundtrip', () => {
    it('should preserve variables through parse/serialize', () => {
      const originalXml = `<document id="test">
  <p>Search for <variable name="topic" prompt="What to search" /> in <variable name="location" /></p>
</document>`;
      
      const doc = parseXmlToAst(originalXml);
      expect('nodes' in doc).toBe(true);
      console.log('Parsed doc:', JSON.stringify(doc, null, 2));
      
      const serialized = serializeAstToXml(doc);
      console.log('Full serialized output:', serialized);
      
      // The serialized output includes XML declaration, so we need to parse it
      expect(serialized).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(serialized).toContain('<document');
      expect(serialized).toContain('<variable name="topic"');
      expect(serialized).toContain('<variable name="location"');
      
      // Parse again to verify
      const doc2 = parseXmlToAst(serialized);
      if ('blocks' in doc2) {
        const variables = extractVariableDefinitions(doc2.nodes);
        expect(variables).toHaveLength(2);
        expect(variables[0].name).toBe('topic');
        expect(variables[0].prompt).toBe('What to search');
        expect(variables[1].name).toBe('location');
        expect(variables[1].prompt).toBeUndefined();
      }
    });
  });
});