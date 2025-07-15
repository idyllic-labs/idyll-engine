#!/usr/bin/env bun
/**
 * Custom Function Instrumentation Demo
 * Shows how instrumentation works when custom functions make function calls
 */

import { 
  DocumentExecutor, 
  createFunctionRegistry, 
  defineFunction, 
  parseXmlToAst, 
  ExecutionHooks,
  executeCustomFunction,
  AgentCustomFunctionExecutionOptions
} from '../index';
import { z } from 'zod';

// Create base functions that will be called by custom functions
const baseFunctions = createFunctionRegistry({
  "search:web": defineFunction({
    schema: z.object({
      query: z.string(),
      maxResults: z.number().default(5)
    }),
    description: "Search the web",
    execute: async (params, content, context) => {
      // Simulate web search delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        query: params.query,
        results: [
          { title: `Result 1 for "${params.query}"`, url: "https://example.com/1", snippet: "First result..." },
          { title: `Result 2 for "${params.query}"`, url: "https://example.com/2", snippet: "Second result..." },
          { title: `Result 3 for "${params.query}"`, url: "https://example.com/3", snippet: "Third result..." }
        ],
        totalFound: params.maxResults
      };
    }
  }),

  "ai:summarize": defineFunction({
    schema: z.object({
      style: z.enum(['bullet-points', 'paragraph', 'brief']).default('paragraph'),
      focus: z.string().optional()
    }),
    description: "AI summarization",
    execute: async (params, content, context) => {
      // Simulate AI processing delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const previousResults = Array.from(context.previousResults.values())
        .filter(r => r.success)
        .map(r => r.data);
      
      return {
        style: params.style,
        focus: params.focus,
        summary: `${params.style} summary of ${previousResults.length} previous results: ${content}`,
        processedResults: previousResults.length
      };
    }
  }),

  "format:markdown": defineFunction({
    schema: z.object({
      includeMetadata: z.boolean().default(true)
    }),
    description: "Format as markdown",
    execute: async (params, content, context) => {
      // Simulate formatting delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const previousResults = Array.from(context.previousResults.values())
        .filter(r => r.success);
      
      return {
        formatted: `# Research Results\n\n${content}\n\n## Data\n\n\`\`\`json\n${JSON.stringify(previousResults, null, 2)}\n\`\`\``,
        metadata: params.includeMetadata ? { generated: new Date().toISOString() } : undefined
      };
    }
  })
});

// Create instrumentation hooks
const hooks: ExecutionHooks = {
  beforeExecution: async (functionName, params, context) => {
    console.log(`🔧 [${functionName}] Starting execution`);
    console.log(`   📍 Node: ${context.currentNodeId.slice(0, 8)}...`);
    console.log(`   📝 Params: ${JSON.stringify(params)}`);
    console.log(`   📊 Previous results: ${context.previousResults.size}`);
  },
  
  afterExecution: async (functionName, result, duration) => {
    console.log(`✅ [${functionName}] Completed -- duration: ${duration.toFixed(2)}ms`);
    const resultPreview = JSON.stringify(result).slice(0, 100);
    console.log(`   📤 Result: ${resultPreview}${JSON.stringify(result).length > 100 ? '...' : ''}`);
    console.log('');
  },
  
  onError: async (functionName, error, duration) => {
    console.log(`❌ [${functionName}] Failed -- duration: ${duration.toFixed(2)}ms`);
    console.log(`   🚨 Error: ${error instanceof Error ? error.message : error}`);
    console.log('');
  }
};

// Test document with custom functions
const xmlDocument = `<?xml version="1.0" encoding="UTF-8"?>
<document id="custom-function-instrumentation-test">
  <h1>Custom Function Instrumentation Demo</h1>
  
  <p>This document demonstrates custom functions with instrumentation.</p>
  
  <!-- Custom function 1: Research Assistant -->
  <function title="Research Assistant" icon="🔬">
    <function:definition>
      <fncall idyll-fn="search:web">
        <params>{"query": "AI breakthroughs 2024", "maxResults": 3}</params>
        <content>Search for <variable name="searchTopic" prompt="What to search for" /></content>
      </fncall>
      <fncall idyll-fn="ai:summarize">
        <params>{"style": "bullet-points", "focus": "practical applications"}</params>
        <content>Summarize results focusing on <variable name="focusArea" prompt="What area to focus on" /></content>
      </fncall>
    </function:definition>
  </function>
  
  <!-- Custom function 2: Report Generator -->
  <function title="Report Generator" icon="📊">
    <function:definition>
      <fncall idyll-fn="search:web">
        <params>{"query": "machine learning trends", "maxResults": 5}</params>
        <content>Search for <variable name="reportTopic" prompt="Report topic" /></content>
      </fncall>
      <fncall idyll-fn="ai:summarize">
        <params>{"style": "paragraph"}</params>
        <content>Create comprehensive summary for <variable name="audience" prompt="Target audience" /></content>
      </fncall>
      <fncall idyll-fn="format:markdown">
        <params>{"includeMetadata": true}</params>
        <content>Format final report for <variable name="audience" /></content>
      </fncall>
    </function:definition>
  </function>
  
  <!-- Regular function call -->
  <fncall idyll-fn="search:web">
    <params>{"query": "direct search query", "maxResults": 2}</params>
    <content>Direct search without custom function</content>
  </fncall>
</document>`;

async function executeCustomFunctionWithInstrumentation(functionNode: any, agentContext: string) {
  console.log(`🎯 Executing custom function: ${functionNode.title}`);
  console.log(`   🤖 Agent context: ${agentContext}`);
  console.log('');
  
  const options: AgentCustomFunctionExecutionOptions = {
    functions: baseFunctions,
    hooks: hooks, // Enable instrumentation for custom function execution
    agentContext: agentContext
  };
  
  const result = await executeCustomFunction(functionNode, options);
  
  console.log(`🏁 Custom function completed: ${functionNode.title}`);
  console.log(`   ⏱️  Total duration: ${result.metadata.duration.toFixed(2)}ms`);
  console.log(`   📊 Nodes executed: ${result.metadata.nodesExecuted}`);
  console.log(`   ✅ Successful: ${result.metadata.nodesSucceeded}`);
  console.log(`   ❌ Failed: ${result.metadata.nodesFailed}`);
  console.log('');
  
  return result;
}

async function main() {
  console.log('🚀 Custom Function Instrumentation Demo\n');
  
  // Parse the document
  const document = parseXmlToAst(xmlDocument);
  
  // Type assertion since we know it's a document from the XML
  const idyllDoc = document as IdyllDocument;
  console.log(`📄 Document parsed: ${idyllDoc.nodes.length} nodes total\n`);
  
  // Find custom functions in the document
  const customFunctions = idyllDoc.nodes.filter((node: any) => node.type === 'function');
  const regularFunctions = idyllDoc.nodes.filter((node: any) => node.type === 'function_call');
  
  console.log(`🔍 Found ${customFunctions.length} custom functions and ${regularFunctions.length} regular function calls\n`);
  
  console.log('═'.repeat(80));
  console.log('🎯 EXECUTING CUSTOM FUNCTIONS');
  console.log('═'.repeat(80));
  
  // Execute custom functions manually to show instrumentation
  for (let i = 0; i < customFunctions.length; i++) {
    const customFunction = customFunctions[i];
    console.log(`\n[${ i + 1}/${customFunctions.length}] Custom Function: ${customFunction.title}`);
    console.log('─'.repeat(60));
    
    // Simulate agent context for variable resolution
    const agentContext = i === 0 
      ? "User wants to research AI breakthroughs focusing on practical applications"
      : "User needs a comprehensive report on ML trends for technical audience";
    
    await executeCustomFunctionWithInstrumentation(customFunction, agentContext);
  }
  
  console.log('═'.repeat(80));
  console.log('🔧 EXECUTING REGULAR FUNCTIONS');
  console.log('═'.repeat(80));
  
  // Now execute the regular functions using DocumentExecutor
  const executor = new DocumentExecutor({
    functions: baseFunctions,
    hooks: hooks
  });
  
  // Create a minimal document with just the regular function calls
  const regularDocument = {
    id: 'regular-functions',
    nodes: regularFunctions
  };
  
  if (regularFunctions.length > 0) {
    console.log('\n🔄 Executing regular function calls...\n');
    
    const report = await executor.execute({
      mode: 'document',
      document: regularDocument,
      options: { functions: baseFunctions, hooks }
    });
    
    console.log('📊 Regular function execution summary:');
    console.log(`   Total time: ${report.metadata.totalDuration}ms`);
    console.log(`   Nodes executed: ${report.metadata.nodesExecuted}`);
    console.log(`   Success rate: ${report.metadata.nodesSucceeded}/${report.metadata.nodesExecuted}`);
  }
  
  console.log('\n💡 Key Observations:');
  console.log('━'.repeat(60));
  console.log('• Custom functions execute their internal function calls with instrumentation');
  console.log('• Each function call (custom or regular) shows timing and results');
  console.log('• Variable resolution happens before function execution');
  console.log('• Context flows between function calls within custom functions');
  console.log('• Both execution paths use the same instrumentation hooks');
}

main().catch(console.error);