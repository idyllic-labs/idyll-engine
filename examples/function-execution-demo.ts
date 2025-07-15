#!/usr/bin/env bun
/**
 * Function Execution Demo
 *
 * This script demonstrates custom function execution with variables in the Idyll engine.
 * It shows:
 * 1. Defining custom functions with multiple steps
 * 2. Using variables that get resolved at runtime
 * 3. Function execution returning full context
 * 4. How agents would use custom functions
 *
 * Run with: bun run examples/function-execution-demo.ts
 */

import { z } from "zod";
import { parseXmlToAst } from "../document/parser-grammar";
import { createFunctionRegistry, defineFunction } from "../document/function-registry";
import { executeCustomFunction, parseCustomFunction } from "../document/custom-function-executor";

// =============================================================================
// STEP 1: Define base functions that custom functions will use
// =============================================================================

const baseFunctions = createFunctionRegistry({
  "web:search": defineFunction({
    schema: z.object({
      maxResults: z.number().default(10),
    }),
    description: "Searches the web for information",
    execute: async (params, content) => {
      console.log(`🔍 Searching for: "${content}"`);
      
      // Simulate web search
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        query: content,
        results: [
          { title: "AI Breakthroughs 2024", url: "https://example.com/ai-2024", snippet: "Latest developments in AI..." },
          { title: "Machine Learning Advances", url: "https://example.com/ml", snippet: "Recent ML research shows..." },
          { title: "Neural Networks Update", url: "https://example.com/nn", snippet: "New architectures for..." },
        ].slice(0, params.maxResults),
        totalFound: 42,
      };
    },
  }),

  "ai:summarize": defineFunction({
    schema: z.object({
      style: z.enum(["brief", "detailed", "bullet-points"]).default("brief"),
    }),
    description: "Summarizes content using AI",
    execute: async (params, content, context) => {
      console.log(`📝 Summarizing with style: ${params.style}`);
      
      // In real implementation, this would call an AI model
      // For demo, we'll check previous results
      const previousCount = context.previousResults.size;
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (params.style === "bullet-points") {
        return {
          summary: [
            `• Processed ${previousCount} previous results`,
            "• Topics cover AI breakthroughs and ML advances",
            "• Focus on neural network architectures",
            `• ${content}`,
          ].join("\n"),
        };
      }
      
      return {
        summary: `Based on the search results about "${content}", the latest developments include AI breakthroughs, ML advances, and new neural network architectures.`,
      };
    },
  }),

  "data:format": defineFunction({
    schema: z.object({
      format: z.enum(["json", "markdown", "plain"]).default("markdown"),
    }),
    description: "Formats data for output",
    execute: async (params, content, context) => {
      console.log(`🎨 Formatting as: ${params.format}`);
      
      // Get all previous results
      const results = Array.from(context.previousResults.values())
        .filter(r => r.success)
        .map(r => r.data);
      
      if (params.format === "json") {
        return { formatted: JSON.stringify(results, null, 2) };
      }
      
      if (params.format === "markdown") {
        return {
          formatted: `# Results\n\n${content}\n\n## Data\n\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\``,
        };
      }
      
      return { formatted: String(results) };
    },
  }),
});


// =============================================================================
// STEP 3: Demo custom function with variables
// =============================================================================

const customFunctionXML = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <function title="Research Assistant" icon="🔬">
    <function:description>
      Searches for information and provides a formatted summary
    </function:description>
    <function:definition>
      <!-- Step 1: Search the web -->
      <fncall idyll-fn="web:search">
        <params><![CDATA[{"maxResults": 5}]]></params>
        <content>Search for <variable name="searchQuery" prompt="What to search for" /> 
                 from <variable name="timeframe" prompt="Time period (e.g., past month)" /></content>
      </fncall>
      
      <!-- Step 2: Summarize results -->
      <fncall idyll-fn="ai:summarize">
        <params><![CDATA[{"style": "bullet-points"}]]></params>
        <content>Summarize the search results focusing on <variable name="focusArea" prompt="What aspect to focus on" /></content>
      </fncall>
      
      <!-- Step 3: Format output -->
      <fncall idyll-fn="data:format">
        <params><![CDATA[{"format": "markdown"}]]></params>
        <content>Research summary for <variable name="searchQuery" /></content>
      </fncall>
    </function:definition>
  </function>
</document>`;

// =============================================================================
// STEP 4: Main demo showing agent using custom function
// =============================================================================

async function main() {
  console.log("🤖 Custom Function Execution Demo\n");
  console.log("This demonstrates how an agent would use a custom function with variables.\n");
  
  // -----------------------------
  // Agent decides to use function
  // -----------------------------
  console.log("1️⃣  Agent receives request and decides to use custom function");
  
  // Agent provides context (would come from function call in real scenario)
  const agentContext = `
    The user wants to know about recent AI breakthroughs,
    especially practical applications from the last month.
    Focus on <mention:topic>AI breakthroughs</mention:topic>
    in <mention:timeRange>the past month</mention:timeRange>.
  `;
  
  console.log(`   Agent context: "${agentContext.trim()}"`);
  
  // -----------------------------
  // Execute custom function
  // -----------------------------
  console.log("\n2️⃣  Executing custom function with variable resolution");
  
  // Parse the function definition
  const parsed = parseXmlToAst(customFunctionXML);
  if (!("nodes" in parsed)) {
    throw new Error("Invalid function definition");
  }
  
  const functionBlock = parseCustomFunction(parsed);
  if (!functionBlock) {
    throw new Error("No function block found");
  }
  
  const executionContext = await executeCustomFunction(
    functionBlock,
    { 
      functions: baseFunctions,
      agentContext,
    }
  );
  
  console.log("\n✅ Function execution complete!");
  console.log(`   Total duration: ${executionContext.metadata.duration}ms`);
  
  // -----------------------------
  // Process results
  // -----------------------------
  console.log("\n3️⃣  Execution Context Results:");
  console.log("━".repeat(50));
  
  console.log("\n📊 Metadata:");
  console.log(`   Function: ${executionContext.metadata.functionName}`);
  console.log(`   Nodes executed: ${executionContext.metadata.nodesExecuted}`);
  console.log(`   Successful: ${executionContext.metadata.nodesSucceeded}`);
  console.log(`   Failed: ${executionContext.metadata.nodesFailed}`);
  
  console.log("\n🔤 Resolved Variables:");
  executionContext.variables.forEach((value, name) => {
    console.log(`   ${name} = "${value}"`);
  });
  
  console.log("\n📦 Node Results:");
  let stepNum = 1;
  for (const [nodeId, result] of executionContext.nodes) {
    console.log(`\n   Step ${stepNum}: ${nodeId.slice(0, 8)}...`);
    console.log(`   Success: ${result.success ? "✅" : "❌"}`);
    if (result.success) {
      console.log(`   Result:`, JSON.stringify(result.data, null, 2).split('\n').join('\n   '));
    }
    stepNum++;
  }
  
  // -----------------------------
  // Extract relevant result
  // -----------------------------
  console.log("\n4️⃣  Extracting relevant result for agent response");
  
  // In subprocess model, this extraction would happen in isolation
  // and only the relevant part would return to main agent
  const lastResult = Array.from(executionContext.nodes.values()).pop();
  if (lastResult?.success) {
    const data = lastResult.data as any;
    if (data?.formatted) {
      console.log("\n📄 Final formatted result:");
      console.log("─".repeat(50));
      console.log(data.formatted);
      console.log("─".repeat(50));
    }
  }
  
  console.log("\n💡 Key Insights:");
  console.log("━".repeat(50));
  console.log("• Variables were resolved based on agent context");
  console.log("• Function steps executed in sequence with context flow");
  console.log("• Full execution context available for debugging");
  console.log("• Only relevant result needs to return to agent");
  console.log("• Subprocess isolation would prevent token bloat");
}

// Run the demo
main().catch(console.error);