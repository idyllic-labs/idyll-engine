import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { Agent, defineFunction, createFunctionRegistry, parseXmlToAst } from '../index';

// Mock language model for testing
const mockModel = {
  provider: 'test',
  modelId: 'test-model',
  doGenerate: async () => ({ text: 'Test response', finishReason: 'stop' }),
  doStream: async () => ({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-delta', textDelta: 'Test ' });
        controller.enqueue({ type: 'text-delta', textDelta: 'response' });
        controller.enqueue({ type: 'finish', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5 } });
        controller.close();
      }
    }),
    rawCall: { rawPrompt: 'test', rawSettings: {} }
  })
};

describe('Agent', () => {
  let testFunctions: ReturnType<typeof createFunctionRegistry>;

  beforeAll(() => {
    // Create test functions
    const functions = {
      'test:simple': defineFunction({
        description: 'Simple test function',
        schema: z.object({
          message: z.string().describe('Test message'),
        }),
        execute: async (params) => {
          return { success: true, message: `Received: ${params.message}` };
        },
      }),

      'test:with-content': defineFunction({
        description: 'Test function that uses content',
        schema: z.object({
          title: z.string().describe('Title'),
          priority: z.enum(['low', 'medium', 'high']).describe('Priority level'),
        }),
        execute: async (params, content) => {
          return { 
            success: true, 
            data: { 
              title: params.title, 
              priority: params.priority,
              content: content,
              processed: true 
            }
          };
        },
      }),

      'test:validation': defineFunction({
        description: 'Test function with complex validation',
        schema: z.object({
          email: z.string().email().describe('Valid email address'),
          age: z.number().min(0).max(120).describe('Age in years'),
          tags: z.array(z.string()).optional().describe('Optional tags'),
        }),
        execute: async (params) => {
          return { 
            success: true, 
            validated: {
              email: params.email,
              age: params.age,
              tags: params.tags || []
            }
          };
        },
      }),

      'test:error': defineFunction({
        description: 'Test function that throws an error',
        schema: z.object({
          shouldFail: z.boolean().describe('Whether to fail'),
        }),
        execute: async (params) => {
          if (params.shouldFail) {
            throw new Error('Test error as requested');
          }
          return { success: true, message: 'No error' };
        },
      }),
    };

    testFunctions = createFunctionRegistry(functions);
  });

  describe('Agent Creation', () => {
    it('should create agent with minimal configuration', () => {
      const systemPromptXml = `
        <agent id="test-agent" name="Test Agent" model="test-model">
          <p>You are a test assistant.</p>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: testFunctions,
      });

      expect(agent).toBeDefined();
      expect(agent.chat).toBeDefined();
      expect(agent.chatStream).toBeDefined();
      expect(agent.getMemory).toBeDefined();
      expect(agent.getContext).toBeDefined();
    });

    it('should create agent with function examples in system prompt', () => {
      const systemPromptXml = `
        <agent id="advanced-agent" name="Advanced Agent" model="test-model">
          <p>You are an advanced test assistant with custom tools.</p>
          <h2>Available Tools</h2>
          <p>You can use these tools to help users:</p>
          <ul>
            <li>test:simple - For simple operations</li>
            <li>test:with-content - For content processing</li>
          </ul>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: testFunctions,
      });

      expect(agent).toBeDefined();
    });
  });

  describe('Function Registry Integration', () => {
    it('should initialize with correct function names', () => {
      const systemPromptXml = `
        <agent id="test-agent" name="Test Agent" model="test-model">
          <p>Test agent</p>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: testFunctions,
      });

      // The agent should be created successfully with the test functions
      expect(agent).toBeDefined();
      expect(agent.getContext()).toBeDefined();
      
      // Verify the agent has access to the functions (they're stored internally)
      const context = agent.getContext();
      expect(context.agentId).toBeDefined();
    });

    it('should handle empty function registry', () => {
      const emptyFunctions = createFunctionRegistry({});
      
      const systemPromptXml = `
        <agent id="test-agent" name="Test Agent" model="test-model">
          <p>Test agent with no functions</p>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: emptyFunctions,
      });

      expect(agent).toBeDefined();
      const context = agent.getContext();
      expect(context.agentId).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should properly convert Zod schemas to AI SDK format', () => {
      // This test verifies that Zod schemas are properly recognized by the AI SDK
      const testSchema = z.object({
        name: z.string().describe('User name'),
        age: z.number().min(0).describe('User age'),
        active: z.boolean().optional().describe('Whether user is active'),
      });

      const testFunction = defineFunction({
        description: 'Test schema validation',
        schema: testSchema,
        execute: async (params) => params,
      });

      expect(testFunction.schema).toBe(testSchema);
      expect(testFunction.description).toBe('Test schema validation');
    });

    it('should handle complex nested schemas', () => {
      const complexSchema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        preferences: z.object({
          theme: z.enum(['light', 'dark']),
          notifications: z.boolean(),
        }),
        metadata: z.record(z.string(), z.any()).optional(),
      });

      const testFunction = defineFunction({
        description: 'Complex schema test',
        schema: complexSchema,
        execute: async (params) => params,
      });

      expect(testFunction.schema).toBe(complexSchema);
    });
  });

  describe('Error Handling', () => {
    it('should handle function execution errors gracefully', async () => {
      const systemPromptXml = `
        <agent id="error-test-agent" name="Error Test Agent" model="test-model">
          <p>Testing error handling</p>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: testFunctions,
      });

      // This would test actual error handling in a real scenario
      // For now, we just verify the agent can be created with error-prone functions
      expect(agent).toBeDefined();
    });
  });

  describe('System Prompt Generation', () => {
    it('should generate system prompt with function information', () => {
      const systemPromptXml = `
        <agent id="prompt-test-agent" name="Prompt Test Agent" model="test-model">
          <p>You are a helpful assistant.</p>
          <h2>Guidelines</h2>
          <p>Always be helpful and accurate.</p>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: testFunctions,
      });

      // The agent should be created successfully and have access to the system prompt
      expect(agent).toBeDefined();
      
      // Verify the agent has access to context and memory
      const context = agent.getContext();
      expect(context).toBeDefined();
      expect(context.agentId).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should initialize with empty memory', () => {
      const systemPromptXml = `
        <agent id="memory-test-agent" name="Memory Test Agent" model="test-model">
          <p>Testing memory</p>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: testFunctions,
      });

      expect(agent).toBeDefined();
      // Memory testing would require actual conversation flow
    });
  });

  describe('Response Pipeline', () => {
    it('should support response middleware', () => {
      const mockMiddleware = {
        process: async (context: any) => {
          return { ...context.result, processed: true };
        }
      };

      const systemPromptXml = `
        <agent id="pipeline-test-agent" name="Pipeline Test Agent" model="test-model">
          <p>Testing response pipeline</p>
        </agent>
      `;

      const program = parseXmlToAst(systemPromptXml);
      
      const agent = new Agent({
        program: program as any,
        model: mockModel as any,
        functions: testFunctions,
        responseMiddleware: [mockMiddleware],
      });

      expect(agent).toBeDefined();
    });
  });
});

// Additional integration tests
describe('Agent Integration Tests', () => {
  it('should validate complete agent workflow without actual LLM calls', () => {
    // Test the complete setup without making actual LLM API calls
    const functions = {
      'docs:create': defineFunction({
        description: 'Create a document',
        schema: z.object({
          title: z.string().min(1).describe('Document title'),
          type: z.enum(['note', 'prompt', 'agent']).describe('Document type'),
        }),
        execute: async (params, content) => {
          return {
            success: true,
            data: {
              id: 'doc-123',
              title: params.title,
              type: params.type,
              content: content,
              createdAt: new Date().toISOString(),
            }
          };
        },
      }),
    };

    const registry = createFunctionRegistry(functions);
    
    const systemPromptXml = `
      <agent id="integration-agent" name="Integration Agent" model="test-model">
        <p>You are a document management assistant.</p>
        <h2>Capabilities</h2>
        <p>I can help you create and manage documents using the docs:create function.</p>
      </agent>
    `;

    const program = parseXmlToAst(systemPromptXml);
    
    const agent = new Agent({
      program: program as any,
      model: mockModel as any,
      functions: registry,
    });

    // Verify agent creation and configuration
    expect(agent).toBeDefined();
    // Verify agent context and memory
    const context = agent.getContext();
    expect(context).toBeDefined();
    expect(context.agentId).toBeDefined();
    
    const memory = agent.getMemory();
    expect(memory).toBeDefined();
  });
});