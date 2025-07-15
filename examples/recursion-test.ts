#!/usr/bin/env bun
/**
 * Recursion Test - Let's see what happens! 😈
 */

import { 
  createFunctionRegistry, 
  defineFunction, 
  parseXmlToAst, 
  executeCustomFunction,
  AgentCustomFunctionExecutionOptions,
  ExecutionHooks,
  IdyllDocument
} from '../index';
import { z } from 'zod';

// Base function that can call other functions
const baseFunctions = createFunctionRegistry({
  "recursive:call": defineFunction({
    schema: z.object({
      depth: z.number(),
      maxDepth: z.number().default(3)
    }),
    description: "A function that might call itself recursively",
    execute: async (params, content, context) => {
      console.log(`🔄 Recursive call at depth ${params.depth}`);
      
      if (params.depth >= (params.maxDepth ?? 3)) {
        return {
          depth: params.depth,
          message: `Base case reached at depth ${params.depth}`,
          content: content
        };
      }
      
      // This would be the recursive call - but custom functions can't call themselves directly
      // because they're not in the function registry
      return {
        depth: params.depth,
        message: `Continuing at depth ${params.depth}`,
        content: content,
        nextDepth: params.depth + 1
      };
    }
  }),

  "test:counter": defineFunction({
    schema: z.object({
      count: z.number().default(0),
      max: z.number().default(5)
    }),
    description: "A simple counter function",
    execute: async (params, content, context) => {
      console.log(`📊 Counter: ${params.count}/${params.max}`);
      
      return {
        count: params.count,
        max: params.max,
        done: (params.count ?? 0) >= (params.max ?? 5),
        message: `Count is ${params.count}, max is ${params.max}`
      };
    }
  })
});

// Instrumentation to track what's happening
const hooks: ExecutionHooks = {
  beforeExecution: async (functionName, params, context) => {
    console.log(`🔧 [DEPTH ${context.previousResults.size}] Starting: ${functionName}`);
    console.log(`   📝 Params: ${JSON.stringify(params)}`);
  },
  
  afterExecution: async (functionName, result, duration) => {
    console.log(`✅ [${functionName}] Completed -- duration: ${duration.toFixed(2)}ms`);
    console.log(`   📤 Result: ${JSON.stringify(result).slice(0, 100)}...`);
    console.log('');
  },
  
  onError: async (functionName, error, duration) => {
    console.log(`❌ [${functionName}] Failed -- duration: ${duration.toFixed(2)}ms`);
    console.log(`   🚨 Error: ${error instanceof Error ? error.message : error}`);
    console.log('');
  }
};

// Test document with potential recursion scenarios
const xmlDocument = `<?xml version="1.0" encoding="UTF-8"?>
<document id="recursion-test">
  <h1>Recursion Test</h1>
  
  <!-- Scenario 1: Simple iteration (not recursion) -->
  <function title="Counter Function" icon="🔢">
    <function:definition>
      <fncall idyll-fn="test:counter">
        <params>{"count": 1, "max": 3}</params>
        <content>First count</content>
      </fncall>
      <fncall idyll-fn="test:counter">
        <params>{"count": 2, "max": 3}</params>
        <content>Second count</content>
      </fncall>
      <fncall idyll-fn="test:counter">
        <params>{"count": 3, "max": 3}</params>
        <content>Third count</content>
      </fncall>
    </function:definition>
  </function>
  
  <!-- Scenario 2: Calling recursive function -->
  <function title="Recursive Attempt" icon="🌀">
    <function:definition>
      <fncall idyll-fn="recursive:call">
        <params>{"depth": 1, "maxDepth": 3}</params>
        <content>Level 1</content>
      </fncall>
      <fncall idyll-fn="recursive:call">
        <params>{"depth": 2, "maxDepth": 3}</params>
        <content>Level 2</content>
      </fncall>
      <fncall idyll-fn="recursive:call">
        <params>{"depth": 3, "maxDepth": 3}</params>
        <content>Level 3 (should be base case)</content>
      </fncall>
    </function:definition>
  </function>
</document>`;

async function testRecursion() {
  console.log('🧪 Testing Recursion in Idyll Engine\n');
  
  const document = parseXmlToAst(xmlDocument);
  if ('type' in document && document.type !== 'document') {
    console.error('Expected a document, got:', document.type);
    return;
  }
  
  // Type assertion since we know it's a document from the XML
  const idyllDoc = document as IdyllDocument;
  const customFunctions = idyllDoc.nodes.filter((node: any) => node.type === 'function');
  
  console.log(`🔍 Found ${customFunctions.length} custom functions to test\n`);
  
  for (let i = 0; i < customFunctions.length; i++) {
    const customFunction = customFunctions[i];
    console.log(`\n[${i + 1}/${customFunctions.length}] Testing: ${customFunction.title}`);
    console.log('═'.repeat(60));
    
    const agentContext = `Testing recursion scenario ${i + 1}`;
    
    try {
      const options: AgentCustomFunctionExecutionOptions = {
        functions: baseFunctions,
        hooks: hooks,
        agentContext: agentContext
      };
      
      const result = await executeCustomFunction(customFunction, options);
      
      console.log(`✅ Custom function completed: ${customFunction.title}`);
      console.log(`   ⏱️  Total duration: ${result.metadata.duration.toFixed(2)}ms`);
      console.log(`   📊 Nodes executed: ${result.metadata.nodesExecuted}`);
      console.log(`   ✅ Successful: ${result.metadata.nodesSucceeded}`);
      console.log(`   ❌ Failed: ${result.metadata.nodesFailed}`);
      
    } catch (error) {
      console.log(`❌ Function failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  
  console.log('\n🤔 Analysis:');
  console.log('━'.repeat(60));
  console.log('• True recursion (function calling itself) is not possible because:');
  console.log('  - Custom functions are not in the function registry');
  console.log('  - Functions can only call registered functions');
  console.log('  - No mechanism for self-reference in current architecture');
  console.log('• However, you can simulate recursion with:');
  console.log('  - Multiple sequential calls with increasing/decreasing parameters');
  console.log('  - Base functions that track depth/state');
  console.log('  - Conditional logic based on previous results');
  
  console.log('\n💡 To enable true recursion, you would need:');
  console.log('━'.repeat(60));
  console.log('• Custom functions registered in the function registry');
  console.log('• Cycle detection to prevent infinite loops');
  console.log('• Stack depth limits');
  console.log('• Proper tail call optimization');
}

async function main() {
  await testRecursion();
}

main().catch(console.error);