#!/usr/bin/env bun
/**
 * Example: Using Agent with External Model Provider
 * 
 * This example demonstrates how to use the idyll-engine Agent
 * with an external AI model provider (e.g., from Vercel AI SDK).
 */

import { Agent, createFunctionRegistry, defineFunction, parseXmlToAst, AgentDefinition } from '../index';
import { createAzure } from '@ai-sdk/azure';
// import { openai } from '@ai-sdk/openai'; // Uncomment if using OpenAI instead
import { Message } from 'ai';
import { z } from 'zod';

// Option 1: Azure OpenAI (recommended)
const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_INSTANCE_NAME!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  apiVersion: "2024-12-01-preview",
});
const model = azure('gpt-4') as any;

// Option 2: OpenAI
// const model = openai('gpt-4-turbo');

// Define some functions
const functions = createFunctionRegistry({
  'demo:greet': defineFunction({
    schema: z.object({
      name: z.string().describe('Name to greet'),
    }),
    description: 'Greets a person by name',
    execute: async (params) => {
      return `Hello, ${params.name}! 👋`;
    },
  }),
  
  'demo:calculate': defineFunction({
    schema: z.object({
      a: z.number(),
      b: z.number(),
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    }),
    description: 'Performs basic arithmetic',
    execute: async (params) => {
      switch (params.operation) {
        case 'add': return params.a + params.b;
        case 'subtract': return params.a - params.b;
        case 'multiply': return params.a * params.b;
        case 'divide': return params.a / params.b;
      }
    },
  }),
});

// Parse the agent program from XML
const program = parseXmlToAst(`
  <agent id="demo-agent" name="Demo Assistant">
    <p>You are a helpful assistant with access to greeting and calculation functions.</p>
  </agent>
`) as AgentDefinition;

// Create agent with the elegant v2 API
const agent = new Agent({
  program,  // The agent program
  model,    // AI runtime
  functions,    // Tool runtime
});

// Example usage
async function main() {
  const messages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hi! Can you greet Alice and then calculate 42 * 3?',
      createdAt: new Date(),
    },
  ];

  // Execute chat
  const result = await agent.chat(messages);
  console.log('Assistant:', result.message.content);
  
  // Stream chat
  const stream = await agent.chatStream(messages);
  
  // Use the stream
  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }
}

main().catch(console.error);