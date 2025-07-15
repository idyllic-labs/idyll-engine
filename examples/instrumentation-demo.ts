#!/usr/bin/env bun
/**
 * Instrumentation Demo - Shows execution hooks with timing
 */

import { DocumentExecutor, createFunctionRegistry, defineFunction, parseXmlToAst, ExecutionHooks } from '../index';
import { z } from 'zod';

// Create some demo functions with artificial delays
const functions = createFunctionRegistry({
  "demo:fast": defineFunction({
    schema: z.object({
      message: z.string()
    }),
    description: "A fast function",
    execute: async (params, content, context) => {
      // Small delay to simulate work
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        message: `Fast execution: ${params.message}`,
        processed: content.toUpperCase()
      };
    }
  }),

  "demo:slow": defineFunction({
    schema: z.object({
      delay: z.number().default(200)
    }),
    description: "A slow function",
    execute: async (params, content, context) => {
      // Simulate slow work
      await new Promise(resolve => setTimeout(resolve, params.delay));
      return {
        message: `Slow execution completed after ${params.delay}ms`,
        content: content
      };
    }
  }),

  "demo:calc": defineFunction({
    schema: z.object({
      operation: z.enum(['add', 'multiply']),
      a: z.number(),
      b: z.number()
    }),
    description: "A calculation function",
    execute: async (params, content, context) => {
      // Tiny delay to simulate calculation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = params.operation === 'add' 
        ? params.a + params.b 
        : params.a * params.b;
      
      return {
        operation: params.operation,
        inputs: [params.a, params.b],
        result: result,
        equation: `${params.a} ${params.operation === 'add' ? '+' : '×'} ${params.b} = ${result}`
      };
    }
  })
});

// Create instrumentation hooks
const hooks: ExecutionHooks = {
  beforeExecution: async (functionName, params, context) => {
    console.log(`🔧 Starting: ${functionName}`);
    console.log(`   Node ID: ${context.currentNodeId.slice(0, 8)}...`);
    console.log(`   Params: ${JSON.stringify(params)}`);
  },
  
  afterExecution: async (functionName, result, duration) => {
    console.log(`✅ Completed: ${functionName} -- duration: ${duration.toFixed(2)}ms`);
    console.log(`   Result: ${JSON.stringify(result)}`);
    console.log('');
  },
  
  onError: async (functionName, error, duration) => {
    console.log(`❌ Failed: ${functionName} -- duration: ${duration.toFixed(2)}ms`);
    console.log(`   Error: ${error instanceof Error ? error.message : error}`);
    console.log('');
  }
};

// Test document with multiple function calls
const xmlDocument = `<?xml version="1.0" encoding="UTF-8"?>
<document id="instrumentation-test">
  <h1>Instrumentation Demo</h1>
  
  <p>This document demonstrates function execution timing.</p>
  
  <fncall idyll-fn="demo:fast">
    <params>{"message": "Hello World"}</params>
    <content>process this text</content>
  </fncall>
  
  <fncall idyll-fn="demo:calc">
    <params>{"operation": "add", "a": 42, "b": 8}</params>
    <content>Addition operation</content>
  </fncall>
  
  <fncall idyll-fn="demo:slow">
    <params>{"delay": 150}</params>
    <content>This will take a while...</content>
  </fncall>
  
  <fncall idyll-fn="demo:calc">
    <params>{"operation": "multiply", "a": 7, "b": 6}</params>
    <content>Multiplication operation</content>
  </fncall>
  
  <fncall idyll-fn="demo:fast">
    <params>{"message": "Final call"}</params>
    <content>last execution</content>
  </fncall>
</document>`;

async function main() {
  console.log('🚀 Function Execution Instrumentation Demo\n');
  
  // Parse the document
  const document = parseXmlToAst(xmlDocument);
  
  // Type assertion since we know it's a document from the XML
  const idyllDoc = document as IdyllDocument;
  console.log(`📄 Document parsed: ${idyllDoc.nodes.length} nodes total\n`);
  
  // Create executor with hooks
  const executor = new DocumentExecutor({
    functions,
    hooks,
    onProgress: (nodeId, current, total) => {
      console.log(`📊 Progress: [${current}/${total}] Executing node ${nodeId.slice(0, 8)}...`);
    }
  });
  
  console.log('🔄 Executing document with instrumentation...\n');
  
  const startTime = Date.now();
  
  // Execute the document
  const report = await executor.execute({
    mode: 'document',
    document: idyllDoc,
    options: { functions, hooks }
  });
  
  const totalTime = Date.now() - startTime;
  
  console.log('━'.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('━'.repeat(60));
  console.log(`Total execution time: ${totalTime}ms`);
  console.log(`Nodes executed: ${report.metadata.nodesExecuted}`);
  console.log(`Successful: ${report.metadata.nodesSucceeded} ✅`);
  console.log(`Failed: ${report.metadata.nodesFailed} ❌`);
  console.log(`Average per node: ${(report.metadata.totalDuration / report.metadata.nodesExecuted).toFixed(2)}ms`);
  
  console.log('\n🔍 Individual timings:');
  let index = 1;
  for (const [nodeId, result] of report.nodes) {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${index}. Node ${nodeId.slice(0, 8)}... ${status} ${result.duration.toFixed(2)}ms`);
    index++;
  }
}

main().catch(console.error);