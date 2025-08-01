#!/usr/bin/env bun
/**
 * Interactive Agent CLI
 *
 * A REPL-style interface for testing agents with the idyll-engine.
 * Supports loading agent definitions, chatting, and special commands.
 */

import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import chalk from "chalk";
import { parseXmlToAst } from "../grammar/parser";
import { AgentDocument } from "../document/ast";
import { Agent } from "../agent/agent";
import { createFunctionRegistry, defineFunction } from "../document/function-registry";
import { Message } from "ai";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { createAzure } from "@ai-sdk/azure";
import { LogLevel } from "../utils/logger";

// Create readline interface
const rl = readline.createInterface({ input, output });

// State
let currentAgent: Agent | null = null;
let currentAgentPath: string | null = null;
let messages: Message[] = [];

// Demo tools registry
function createDemoTools() {
  return createFunctionRegistry({
    "demo:echo": defineFunction({
      schema: z.object({
        message: z.string().describe("Message to echo"),
      }),
      description: "Echoes back the provided message",
      execute: async (params, content) => {
        // Use content if provided, otherwise use params.message
        const textToEcho = content || params.message;
        console.log(chalk.gray(`[Tool: demo:echo] ${textToEcho}`));
        return { echoed: textToEcho, message: params.message };
      },
    }),

    "demo:calculate": defineFunction({
      schema: z.object({
        expression: z.string().describe("Math expression to evaluate"),
      }),
      description: "Evaluates a simple math expression",
      execute: async (params) => {
        console.log(chalk.gray(`[Tool: demo:calculate] ${params.expression}`));
        try {
          // Simple eval for demo - in production use a proper math parser
          const result = eval(params.expression);
          return { result, expression: params.expression };
        } catch (error) {
          return { error: "Invalid expression" };
        }
      },
    }),

    "demo:time": defineFunction({
      schema: z.object({}),
      description: "Gets the current time",
      execute: async () => {
        const now = new Date();
        console.log(chalk.gray(`[Tool: demo:time] ${now.toISOString()}`));
        return {
          time: now.toTimeString(),
          date: now.toDateString(),
          iso: now.toISOString(),
        };
      },
    }),
  });
}

// Commands
const commands = {
  "/help": () => {
    console.log(chalk.cyan("\nAvailable commands:"));
    console.log("  /help              - Show this help message");
    console.log("  /load <path>       - Load an agent from XML file");
    console.log("  /reload            - Reload the current agent");
    console.log("  /clear             - Clear conversation history");
    console.log("  /memory            - Show agent memory");
    console.log("  /context           - Show agent context");
    console.log("  /functions         - List available functions");
    console.log("  /tools             - (Alias for /functions)");
    console.log("  /exit, /quit       - Exit the CLI");
    console.log("\nJust type a message to chat with the agent!\n");
  },

  "/load": async (args: string[]) => {
    if (args.length === 0) {
      console.log(chalk.red("Usage: /load <path-to-agent.xml>"));
      return;
    }

    const agentPath = path.resolve(args[0]);

    try {
      const xml = await fs.readFile(agentPath, "utf-8");
      const parsed = parseXmlToAst(xml);

      if (!("type" in parsed) || parsed.type !== "agent") {
        console.log(
          chalk.red("Error: File does not contain an agent document")
        );
        return;
      }

      const agentDoc = parsed as AgentDocument;

      // Check for Azure configuration
      if (!process.env.AZURE_OPENAI_INSTANCE_NAME || !process.env.AZURE_OPENAI_API_KEY) {
        console.log(chalk.yellow('\n⚠️  Azure OpenAI Configuration Required'));
        console.log(chalk.gray('   Set your Azure OpenAI credentials:'));
        console.log(chalk.gray('   export AZURE_OPENAI_INSTANCE_NAME=your-instance'));
        console.log(chalk.gray('   export AZURE_OPENAI_API_KEY=your-key'));
        console.log(chalk.gray('   '));
        console.log(chalk.gray('   Agent loaded but cannot chat without Azure credentials.'));
        return;
      }

      // Create Azure instance
      const azure = createAzure({
        resourceName: process.env.AZURE_OPENAI_INSTANCE_NAME,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        apiVersion: "2024-12-01-preview",
      });

      // Create model instance (using dev dependency)
      const model = azure(agentDoc.model || 'gpt-4') as any;

      // Create agent with the elegant v2 API
      currentAgent = new Agent({
        program: agentDoc,
        model,
        functions: createDemoTools(),
        logging: {
          level: LogLevel.INFO, // CLI can be more verbose
          enableColors: true,
          includeTimestamp: false,
        },
      });

      currentAgentPath = agentPath;
      messages = []; // Reset conversation

      console.log(
        chalk.green(`✅ Loaded agent: ${agentDoc.name || "Unnamed Agent"}`)
      );
      if (agentDoc.description) {
        console.log(chalk.gray(`   ${agentDoc.description}`));
      }
      console.log(chalk.gray(`   Model: ${agentDoc.model || "default"}`));
    } catch (error) {
      console.log(
        chalk.red(
          `Error loading agent: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        )
      );
    }
  },

  "/reload": async () => {
    if (!currentAgentPath) {
      console.log(chalk.red("No agent loaded to reload"));
      return;
    }

    await commands["/load"]([currentAgentPath]);
  },

  "/clear": () => {
    messages = [];
    if (currentAgent) {
      currentAgent.clearMemory();
    }
    console.log(chalk.green("✅ Conversation cleared"));
  },

  "/memory": () => {
    if (!currentAgent) {
      console.log(chalk.red("No agent loaded"));
      return;
    }

    const memory = currentAgent.getMemory();
    const activities = memory.toJSON();

    if (activities.length === 0) {
      console.log(chalk.gray("No activities in memory"));
      return;
    }

    console.log(chalk.cyan("\nAgent Memory:"));
    activities.forEach((activity, i) => {
      console.log(
        chalk.gray(
          `\n[${i + 1}] ${activity.timestamp.toISOString()} - ${activity.type}`
        )
      );
      if (activity.userMessage) {
        console.log(
          `  User: ${activity.userMessage.substring(0, 80)}${
            activity.userMessage.length > 80 ? "..." : ""
          }`
        );
      }
      if (activity.assistantMessage) {
        console.log(
          `  Assistant: ${activity.assistantMessage.substring(0, 80)}${
            activity.assistantMessage.length > 80 ? "..." : ""
          }`
        );
      }
      if (activity.functionCalls) {
        console.log(
          `  Functions: ${activity.functionCalls.map((tc) => tc.name).join(", ")}`
        );
      }
      if (activity.error) {
        console.log(chalk.red(`  Error: ${activity.error}`));
      }
    });
  },

  "/context": () => {
    if (!currentAgent) {
      console.log(chalk.red("No agent loaded"));
      return;
    }

    const context = currentAgent.getContext();
    console.log(chalk.cyan("\nAgent Context:"));
    console.log(JSON.stringify(context, null, 2));
  },

  "/functions": () => {
    if (!currentAgent) {
      console.log(chalk.red("No agent loaded"));
      return;
    }

    const functions = createDemoTools();
    console.log(chalk.cyan("\nAvailable Functions:"));
    Object.entries(functions).forEach(([name, func]) => {
      console.log(
        `  ${chalk.green(name)} - ${func.description || "No description"}`
      );
    });
  },

  "/tools": () => commands["/functions"](),

  "/exit": () => {
    console.log(chalk.yellow("\nGoodbye! 👋"));
    process.exit(0);
  },

  "/quit": () => commands["/exit"](),
};

// Main chat loop
async function chat(input: string) {
  if (!currentAgent) {
    console.log(
      chalk.red("No agent loaded. Use /load <path> to load an agent.")
    );
    return;
  }

  // Add user message
  messages.push({
    id: crypto.randomUUID(),
    role: "user",
    content: input,
    createdAt: new Date(),
  });

  try {
    // Show thinking indicator
    console.log(chalk.gray("Thinking..."));

    // Get response (non-streaming)
    const result = await currentAgent.chat(messages, {
      temperature: 0.7,
      maxSteps: 10,
    } as any); // Type assertion for CLI compatibility

    // Add the assistant message
    messages.push(result.message);

    // Display the response
    console.log(chalk.green("Assistant: ") + result.message.content);

    // Show usage if available
    if (result.usage) {
      console.log(
        chalk.gray(
          `\n[Tokens: ${result.usage.totalTokens} (prompt: ${result.usage.promptTokens}, completion: ${result.usage.completionTokens})]`
        )
      );
    }
  } catch (error) {
    console.log(
      chalk.red(
        `\nError: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    );
  }
}

// Main function
async function main() {
  console.log(chalk.cyan.bold("\n🤖 Idyll Agent CLI"));
  console.log(
    chalk.gray("Type /help for commands or /load <path> to get started\n")
  );

  // Check for agent file argument
  const agentFile = process.argv[2];
  if (agentFile) {
    await commands["/load"]([agentFile]);
  }

  // Main loop
  while (true) {
    const input = await rl.question(chalk.blue("> "));

    if (input.startsWith("/")) {
      // Handle command
      const [cmd, ...args] = input.split(" ");
      const handler = commands[cmd as keyof typeof commands];

      if (handler) {
        if (cmd === "/load") {
          await (handler as any)(args);
        } else {
          await (handler as any)();
        }
      } else {
        console.log(chalk.red(`Unknown command: ${cmd}`));
      }
    } else if (input.trim()) {
      // Chat with agent
      await chat(input);
    }
  }
}

// Error handling
process.on("SIGINT", () => {
  console.log(chalk.yellow("\n\nInterrupted. Goodbye! 👋"));
  process.exit(0);
});

// Run the CLI
main().catch((error) => {
  console.error(chalk.red("Fatal error:", error));
  process.exit(1);
});
