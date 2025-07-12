#!/usr/bin/env bun
/**
 * Standalone Execution Demo
 *
 * This script demonstrates the complete flow of using the Idyll engine:
 * 1. Creating tools with Zod schemas
 * 2. Defining a document with executable blocks
 * 3. Parsing the XML document
 * 4. Setting up the execution engine
 * 5. Executing the document
 * 6. Processing the results
 *
 * Run with: bun run examples/standalone-execution-demo.ts
 */

import { z } from "zod";
import { parseXML, serializeToXML } from "../document/parser-grammar";
import { DocumentExecutor } from "../document/executor";
import { createToolRegistry, defineTool } from "../document/tool-registry";
import type { BlockExecutionContext } from "../document/execution-types";
import { generateText } from "ai";
import { gpt_4_1 } from "../../../app/lib/ai/vercel-ai";

// =============================================================================
// STEP 1: Define our tools
// =============================================================================

/**
 * Tools are functions that can be called from within documents.
 * Each tool has:
 * - A Zod schema for parameter validation
 * - An execute function that receives (params, content, context)
 * - An optional description
 */
const tools = createToolRegistry({
  // Simple echo tool - returns what you send it
  "demo:echo": defineTool({
    schema: z.object({
      prefix: z.string().optional().default("Echo: "),
      shout: z.boolean().optional().default(false),
    }),
    description: "Echoes back the content with optional prefix",
    execute: async (params, content, context) => {
      const message = params.prefix + content;
      return {
        message: params.shout ? message.toUpperCase() : message,
        executedAt: new Date().toISOString(),
        blockId: context.currentBlockId,
      };
    },
  }),

  "demo:generateText": defineTool({
    schema: z.object({}),
    description: "Generates text based on a prompt",
    execute: async (params, content, context) => {
      console.log(context);
      const result = await generateText({
        model: gpt_4_1,
        prompt: content,
      });
      return {
        text: result.text,
      };
    },
  }),

  // Math tool - performs arithmetic operations
  "demo:add": defineTool({
    schema: z.object({
      numbers: z.array(z.number()).min(2),
    }),
    description: "Adds multiple numbers together",
    execute: async (params, content) => {
      const sum = params.numbers.reduce((a, b) => a + b, 0);
      return {
        input: params.numbers,
        sum,
        equation: params.numbers.join(" + ") + " = " + sum,
      };
    },
  }),

  // Tool that uses previous results
  "demo:summarize": defineTool({
    schema: z.object({
      format: z.enum(["json", "text"]).default("text"),
    }),
    description: "Summarizes all previous execution results",
    execute: async (params, content, context: BlockExecutionContext) => {
      const results = Array.from(context.previousResults.entries());

      if (params.format === "json") {
        return {
          totalExecutions: results.length,
          successful: results.filter(([_, r]) => r.success).length,
          failed: results.filter(([_, r]) => !r.success).length,
          results: results.map(([id, r]) => ({
            blockId: id,
            success: r.success,
            data: r.success ? r.data : r.error,
          })),
        };
      } else {
        const lines = [
          `Total executions: ${results.length}`,
          `Successful: ${results.filter(([_, r]) => r.success).length}`,
          `Failed: ${results.filter(([_, r]) => !r.success).length}`,
          "",
          "Results:",
          ...results.map(
            ([id, r], i) =>
              `${i + 1}. Block ${id.slice(0, 8)}... - ${r.success ? "✓" : "✗"}`
          ),
        ];
        return {
          summary: lines.join("\n"),
        };
      }
    },
  }),

  // Tool that can fail (for testing error handling)
  "demo:divide": defineTool({
    schema: z.object({
      numerator: z.number(),
      denominator: z.number(),
    }),
    description: "Divides two numbers (can fail on division by zero)",
    execute: async (params) => {
      if (params.denominator === 0) {
        throw new Error("Division by zero is not allowed");
      }
      return {
        result: params.numerator / params.denominator,
        equation: `${params.numerator} ÷ ${params.denominator} = ${
          params.numerator / params.denominator
        }`,
      };
    },
  }),
});

// =============================================================================
// STEP 2: Define our document as XML
// =============================================================================

/**
 * This is an Idyllic document with:
 * - Regular content blocks (headings, paragraphs)
 * - Executable blocks (fncall elements)
 *
 * The document is stored as a string here, but could come from:
 * - A file on disk
 * - A database
 * - User input
 * - API response
 */
const documentXML = `<?xml version="1.0" encoding="UTF-8"?>
<document id="demo-doc">
  <h1>Execution Engine Demo</h1>
  
  <p>This document demonstrates how the Idyllic execution engine works. 
     Below are several executable blocks that will be run in sequence.</p>
  
  <separator />
  
  <h2>Basic Echo Test</h2>
  
  <p>Let's start with a simple echo:</p>
  
  <fncall idyll-tool="demo:echo">
    <params><![CDATA[{"prefix": "👋 ", "shout": false}]]></params>
    <content>Hello from the execution engine!</content>
  </fncall>
  
  <h2>Math Operations</h2>
  
  <p>Now let's do some math:</p>
  
  <fncall idyll-tool="demo:add">
    <params><![CDATA[{"numbers": [10, 20, 30, 40]}]]></params>
    <content>Adding multiple numbers together</content>
  </fncall>
  
  <p>And another calculation:</p>
  
  <fncall idyll-tool="demo:add">
    <params><![CDATA[{"numbers": [1.5, 2.5, 3.5]}]]></params>
    <content>Adding decimal numbers</content>
  </fncall>
  
  <h2>Error Handling</h2>
  
  <p>This block will fail (division by zero):</p>
  
  <fncall idyll-tool="demo:divide">
    <params><![CDATA[{"numerator": 100, "denominator": 0}]]></params>
    <content>Attempting division by zero</content>
  </fncall>
  
  <p>But this one will succeed:</p>
  
  <fncall idyll-tool="demo:divide">
    <params><![CDATA[{"numerator": 100, "denominator": 4}]]></params>
    <content>Normal division</content>
  </fncall>
  
  <h2>Context-Aware Execution</h2>
  
  <p>This tool can see all previous results:</p>
  
  <fncall idyll-tool="demo:summarize">
    <params><![CDATA[{"format": "text"}]]></params>
    <content>Summarize all previous executions</content>
  </fncall>

  <fncall idyll-tool="demo:generateText">
    <params><![CDATA[{}]]></params>
    <content>Generate a short story about a cat</content>
  </fncall>

  <fncall idyll-tool="demo:generateText">
    <params><![CDATA[{}]]></params>
    <content>Generate what you see above.</content>
  </fncall>

  <separator />
  
  <p><em>End of demo document</em></p>
</document>`;

// =============================================================================
// STEP 3: Main execution flow
// =============================================================================

async function main() {
  console.log("🚀 Idyllic Execution Engine Demo\n");

  // -----------------------------
  // Parse the XML document
  // -----------------------------
  console.log("1️⃣  Parsing XML document...");

  /**
   * The parser converts XML into an AST (Abstract Syntax Tree).
   * This AST is what the engine works with internally.
   */
  const document = parseXML(documentXML);

  // Type guard to ensure we have a regular document
  if ("type" in document && document.type !== "document") {
    console.error("❌ Expected a regular document");
    return;
  }

  console.log("✅ Document parsed successfully");
  console.log(`   - ID: ${document.id}`);
  console.log(`   - Blocks: ${document.blocks.length}`);
  console.log("");

  // -----------------------------
  // Create the execution engine
  // -----------------------------
  console.log("2️⃣  Creating execution engine...");

  /**
   * The DocumentExecutor is initialized with:
   * - tools: The registry of available tools
   * - onProgress: Optional callback for execution progress
   * - stopOnError: Whether to halt on first error (default: false)
   * - timeout: Max time per tool execution (default: 30s)
   */
  const executor = new DocumentExecutor({
    tools,
    onProgress: (blockId, current, total) => {
      console.log(
        `   ⏳ [${current}/${total}] Executing block ${blockId.slice(0, 8)}...`
      );
    },
    stopOnError: false, // Continue even if a block fails
  });

  console.log("✅ Engine created with", Object.keys(tools).length, "tools");
  console.log("");

  // -----------------------------
  // Execute the document
  // -----------------------------
  console.log("3️⃣  Executing document...\n");

  /**
   * The execute method runs all executable blocks in sequence.
   * It returns an ExecutionReport with:
   * - blocks: Map of blockId -> result
   * - metadata: Overall execution statistics
   */
  const report = await executor.execute({
    mode: "document",
    document,
    options: { tools }, // Tools are passed again here for the execution context
  });

  console.log("\n✅ Execution complete!\n");

  // -----------------------------
  // Process the results
  // -----------------------------
  console.log("4️⃣  Execution Report:");
  console.log("━".repeat(50));
  console.log(`Total duration: ${report.metadata.totalDuration}ms`);
  console.log(`Blocks executed: ${report.metadata.blocksExecuted}`);
  console.log(`Successful: ${report.metadata.blocksSucceeded} ✅`);
  console.log(`Failed: ${report.metadata.blocksFailed} ❌`);
  console.log("");

  // Show individual results
  console.log("5️⃣  Individual Results:");
  console.log("━".repeat(50));

  let resultIndex = 1;
  for (const [blockId, result] of report.blocks) {
    console.log(`\n${resultIndex}. Block: ${blockId}`);
    console.log(`   Status: ${result.success ? "✅ Success" : "❌ Failed"}`);
    console.log(`   Duration: ${result.duration}ms`);

    if (result.success) {
      console.log(
        "   Result:",
        JSON.stringify(result.data, null, 2).split("\n").join("\n   ")
      );
    } else {
      console.log("   Error:", result.error?.message);
    }

    resultIndex++;
  }

  // -----------------------------
  // Optional: Apply results back to document
  // -----------------------------
  console.log("\n\n6️⃣  Applying Results to Document...");

  /**
   * We can merge the execution results back into the document.
   * This updates the <result> elements within each <fncall> block.
   */
  const updatedDocument = applyResultsToDocument(document, report);

  // Serialize back to XML
  const updatedXML = serializeToXML(updatedDocument);

  console.log("✅ Results applied to document");
  console.log("\n📄 First 500 chars of updated XML:");
  console.log(updatedXML.slice(0, 500) + "...\n");

  // -----------------------------
  // Key insights
  // -----------------------------
  console.log("💡 Key Insights:");
  console.log("━".repeat(50));
  console.log("• The document and engine are separate - document is just data");
  console.log("• Tools are provided to the engine via dependency injection");
  console.log("• Execution maintains state that flows between blocks");
  console.log("• Results can be applied back to the document or kept separate");
  console.log("• The engine is host-agnostic - works anywhere JavaScript runs");
}

/**
 * Helper function to apply execution results back to the document.
 * This modifies the AST to include <result> elements.
 */
function applyResultsToDocument(document: any, report: any): any {
  // Deep clone to avoid mutating the original
  const updated = JSON.parse(JSON.stringify(document));

  function updateBlocks(blocks: any[]): void {
    for (const block of blocks) {
      // Check if this is an executable block with results
      if (block.type === "function_call" && report.blocks.has(block.id)) {
        const result = report.blocks.get(block.id);

        // Add the result to the block
        block.result = {
          success: result.success,
          data: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
        };
      }

      // Recurse into children
      if (block.children) {
        updateBlocks(block.children);
      }
    }
  }

  updateBlocks(updated.blocks);
  return updated;
}

// Run the demo
main().catch(console.error);
