#!/usr/bin/env bun
/**
 * Standalone Execution Demo
 *
 * This script demonstrates the complete flow of using the Idyll engine:
 * 1. Creating functions with Zod schemas
 * 2. Defining a document with executable blocks
 * 3. Parsing the XML document
 * 4. Setting up the execution engine
 * 5. Executing the document
 * 6. Processing the results
 *
 * Run with: bun run examples/standalone-execution-demo.ts
 */

import { z } from "zod";
import { parseXmlToAst, serializeAstToXml } from "../grammar/parser";
import { DocumentExecutor } from "../document/executor";
import { createFunctionRegistry, defineFunction } from "../document/function-registry";
import type { NodeExecutionContext } from "../document/execution-types";
import type { IdyllDocument } from "../document/ast";
import { generateText } from "ai";

// =============================================================================
// STEP 1: Define our functions
// =============================================================================

/**
 * Functions are callable units that can be executed from within documents.
 * Each function has:
 * - A Zod schema for parameter validation
 * - An execute function that receives (params, content, context)
 * - An optional description
 */
const functions = createFunctionRegistry({
  // Simple echo function - returns what you send it
  "demo:echo": defineFunction({
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
        nodeId: context.currentNodeId,
      };
    },
  }),

  "demo:generateText": defineFunction({
    schema: z.object({}),
    description: "Generates text based on a prompt",
    execute: async (params, content, context) => {
      console.log(context);
      // Model should be provided externally
      throw new Error('AI model not configured - pass a model when using AI features');
    },
  }),

  // Math function - performs arithmetic operations
  "demo:add": defineFunction({
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

  // Function that uses previous results
  "demo:summarize": defineFunction({
    schema: z.object({
      format: z.enum(["json", "text"]).default("text"),
    }),
    description: "Summarizes all previous execution results",
    execute: async (params, content, context: NodeExecutionContext) => {
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
              `${i + 1}. Node ${id.slice(0, 8)}... - ${r.success ? "✓" : "✗"}`
          ),
        ];
        return {
          summary: lines.join("\n"),
        };
      }
    },
  }),

  // Tool that can fail (for testing error handling)
  "demo:divide": defineFunction({
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
  
  <fncall idyll-fn="demo:echo">
    <params><![CDATA[{"prefix": "👋 ", "shout": false}]]></params>
    <content>Hello from the execution engine!</content>
  </fncall>
  
  <h2>Math Operations</h2>
  
  <p>Now let's do some math:</p>
  
  <fncall idyll-fn="demo:add">
    <params><![CDATA[{"numbers": [10, 20, 30, 40]}]]></params>
    <content>Adding multiple numbers together</content>
  </fncall>
  
  <p>And another calculation:</p>
  
  <fncall idyll-fn="demo:add">
    <params><![CDATA[{"numbers": [1.5, 2.5, 3.5]}]]></params>
    <content>Adding decimal numbers</content>
  </fncall>
  
  <h2>Error Handling</h2>
  
  <p>This node will fail (division by zero):</p>
  
  <fncall idyll-fn="demo:divide">
    <params><![CDATA[{"numerator": 100, "denominator": 0}]]></params>
    <content>Attempting division by zero</content>
  </fncall>
  
  <p>But this one will succeed:</p>
  
  <fncall idyll-fn="demo:divide">
    <params><![CDATA[{"numerator": 100, "denominator": 4}]]></params>
    <content>Normal division</content>
  </fncall>
  
  <h2>Context-Aware Execution</h2>
  
  <p>This function can see all previous results:</p>
  
  <fncall idyll-fn="demo:summarize">
    <params><![CDATA[{"format": "text"}]]></params>
    <content>Summarize all previous executions</content>
  </fncall>

  <fncall idyll-fn="demo:generateText">
    <params><![CDATA[{}]]></params>
    <content>Generate a short story about a cat</content>
  </fncall>

  <fncall idyll-fn="demo:generateText">
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
  const document = parseXmlToAst(documentXML);

  // Type guard to ensure we have a regular document
  if ("type" in document && document.type === "agent") {
    console.error("❌ Expected a regular document");
    return;
  }

  console.log("✅ Document parsed successfully");
  console.log(`   - ID: ${(document as any).id}`);
  console.log(`   - Nodes: ${(document as any).nodes?.length || 0}`);
  console.log("");

  // -----------------------------
  // Create the execution engine
  // -----------------------------
  console.log("2️⃣  Creating execution engine...");

  /**
   * The DocumentExecutor is initialized with:
   * - functions: The registry of available functions
   * - onProgress: Optional callback for execution progress
   * - stopOnError: Whether to halt on first error (default: false)
   * - timeout: Max time per function execution (default: 30s)
   */
  const executor = new DocumentExecutor({
    functions,
    onProgress: (nodeId, current, total) => {
      console.log(
        `   ⏳ [${current}/${total}] Executing node ${nodeId.slice(0, 8)}...`
      );
    },
    stopOnError: false, // Continue even if a node fails
  });

  console.log("✅ Engine created with", Object.keys(functions).length, "functions");
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
    document: document as IdyllDocument,
    options: { functions }, // Tools are passed again here for the execution context
  });

  console.log("\n✅ Execution complete!\n");

  // -----------------------------
  // Process the results
  // -----------------------------
  console.log("4️⃣  Execution Report:");
  console.log("━".repeat(50));
  console.log(`Total duration: ${report.metadata.totalDuration}ms`);
  console.log(`Nodes executed: ${report.metadata.nodesExecuted}`);
  console.log(`Successful: ${report.metadata.nodesSucceeded} ✅`);
  console.log(`Failed: ${report.metadata.nodesFailed} ❌`);
  console.log("");

  // Show individual results
  console.log("5️⃣  Individual Results:");
  console.log("━".repeat(50));

  let resultIndex = 1;
  for (const [nodeId, result] of report.nodes) {
    console.log(`\n${resultIndex}. Node: ${nodeId}`);
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
   * This updates the <result> elements within each <fncall> node.
   */
  const updatedDocument = applyResultsToDocument(document, report);

  // Serialize back to XML
  const updatedXML = serializeAstToXml(updatedDocument);

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

  function updateNodes(nodes: any[]): void {
    for (const node of nodes) {
      // Check if this is an executable node with results
      if (node.type === "function_call" && report.nodes.has(node.id)) {
        const result = report.nodes.get(node.id);

        // Add the result to the node
        node.result = {
          success: result.success,
          data: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error,
        };
      }

      // Recurse into children
      if (node.children) {
        updateNodes(node.children);
      }
    }
  }

  updateNodes(updated.nodes);
  return updated;
}

// Run the demo
main().catch(console.error);
