#!/usr/bin/env bun
/**
 * Tool Execution Demo
 *
 * This script demonstrates custom tool execution with variables in the Idyll engine.
 * It shows:
 * 1. Defining custom tools with multiple steps
 * 2. Using variables that get resolved at runtime
 * 3. Tool execution returning full context
 * 4. How agents would use custom tools
 *
 * Run with: bun run examples/tool-execution-demo.ts
 */

import { z } from "zod";
import { parseXML } from "../document/parser-grammar";
import { createToolRegistry, defineTool } from "../document/tool-registry";
import { executeCustomTool, parseCustomTool } from "../document/custom-tool-executor";

// =============================================================================
// STEP 1: Define base tools that custom tools will use
// =============================================================================

const baseTools = createToolRegistry({
  "web:search": defineTool({
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

  "ai:summarize": defineTool({
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

  "data:format": defineTool({
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
// STEP 3: Demo custom tool with variables
// =============================================================================

const customToolXML = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <tool title="Research Assistant" icon="🔬">
    <tool:description>
      Searches for information and provides a formatted summary
    </tool:description>
    <tool:definition>
      <!-- Step 1: Search the web -->
      <fncall idyll-tool="web:search">
        <params><![CDATA[{"maxResults": 5}]]></params>
        <content>Search for <variable name="searchQuery" prompt="What to search for" /> 
                 from <variable name="timeframe" prompt="Time period (e.g., past month)" /></content>
      </fncall>
      
      <!-- Step 2: Summarize results -->
      <fncall idyll-tool="ai:summarize">
        <params><![CDATA[{"style": "bullet-points"}]]></params>
        <content>Summarize the search results focusing on <variable name="focusArea" prompt="What aspect to focus on" /></content>
      </fncall>
      
      <!-- Step 3: Format output -->
      <fncall idyll-tool="data:format">
        <params><![CDATA[{"format": "markdown"}]]></params>
        <content>Research summary for <variable name="searchQuery" /></content>
      </fncall>
    </tool:definition>
  </tool>
</document>`;

// =============================================================================
// STEP 4: Main demo showing agent using custom tool
// =============================================================================

async function main() {
  console.log("🤖 Custom Tool Execution Demo\n");
  console.log("This demonstrates how an agent would use a custom tool with variables.\n");
  
  // -----------------------------
  // Agent decides to use tool
  // -----------------------------
  console.log("1️⃣  Agent receives request and decides to use custom tool");
  
  // Agent provides context (would come from tool call in real scenario)
  const agentContext = `
    The user wants to know about recent AI breakthroughs,
    especially practical applications from the last month.
    Focus on <mention:topic>AI breakthroughs</mention:topic>
    in <mention:timeRange>the past month</mention:timeRange>.
  `;
  
  console.log(`   Agent context: "${agentContext.trim()}"`);
  
  // -----------------------------
  // Execute custom tool
  // -----------------------------
  console.log("\n2️⃣  Executing custom tool with variable resolution");
  
  // Parse the tool definition
  const parsed = parseXML(customToolXML);
  if (!("blocks" in parsed)) {
    throw new Error("Invalid tool definition");
  }
  
  const toolBlock = parseCustomTool(parsed);
  if (!toolBlock) {
    throw new Error("No tool block found");
  }
  
  const executionContext = await executeCustomTool(
    toolBlock,
    { 
      tools: baseTools,
      agentContext,
    }
  );
  
  console.log("\n✅ Tool execution complete!");
  console.log(`   Total duration: ${executionContext.metadata.duration}ms`);
  
  // -----------------------------
  // Process results
  // -----------------------------
  console.log("\n3️⃣  Execution Context Results:");
  console.log("━".repeat(50));
  
  console.log("\n📊 Metadata:");
  console.log(`   Tool: ${executionContext.metadata.toolName}`);
  console.log(`   Blocks executed: ${executionContext.metadata.blocksExecuted}`);
  console.log(`   Successful: ${executionContext.metadata.blocksSucceeded}`);
  console.log(`   Failed: ${executionContext.metadata.blocksFailed}`);
  
  console.log("\n🔤 Resolved Variables:");
  executionContext.variables.forEach((value, name) => {
    console.log(`   ${name} = "${value}"`);
  });
  
  console.log("\n📦 Block Results:");
  let stepNum = 1;
  for (const [blockId, result] of executionContext.blocks) {
    console.log(`\n   Step ${stepNum}: ${blockId.slice(0, 8)}...`);
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
  const lastResult = Array.from(executionContext.blocks.values()).pop();
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
  console.log("• Tool steps executed in sequence with context flow");
  console.log("• Full execution context available for debugging");
  console.log("• Only relevant result needs to return to agent");
  console.log("• Subprocess isolation would prevent token bloat");
}

// Run the demo
main().catch(console.error);