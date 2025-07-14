/**
 * Lightweight Agent implementation for idyll-engine
 *
 * This is a clean implementation inspired by the app's Agent class
 * but without the database dependencies and app-specific logic.
 */

import { generateText, streamText, Message, CoreTool, LanguageModel } from "ai";
import {
  AgentConfig,
  AgentDefinition,
  AgentContext,
  AgentExecuteOptions,
  AgentExecuteResult,
  AgentActivity,
} from "./types";
import type { AgentDocument } from "../document/ast";
import { ActivityMemory } from "./memory";
import { ToolRegistry } from "../document/tool-registry";
import {
  NodeExecutionContext,
  BlockExecutionContext,
} from "../document/execution-types";
import { v4 as uuidv4 } from "uuid";
import { buildDetailedSystemPrompt } from "./system-prompt";
import { extractCustomTools } from "./custom-tools";
import { mergeToolRegistries } from "../document/tool-registry";
import { ResponsePipeline, ResponseMiddleware } from "./response-pipeline";
import {
  toAzureFunctionName,
  fromAzureFunctionName,
} from "../document/tool-naming";

/**
 * Agent class for executing conversations with tools
 */
export class Agent {
  private program: AgentDefinition;
  private model: LanguageModel;
  private tools: ToolRegistry;
  private memory: ActivityMemory;
  private context: AgentContext;
  private aiTools: Record<string, CoreTool> = {};
  private currentMessages: Message[] = [];
  private responsePipeline: ResponsePipeline;

  constructor(config: AgentConfig) {
    this.program = config.program;
    this.model = config.model;
    this.tools = config.tools;

    this.memory = new ActivityMemory();
    this.context = {
      agentId: this.program.id,
      activities: [],
    };

    // Initialize response pipeline
    this.responsePipeline = new ResponsePipeline();
    if (config.responseMiddleware) {
      config.responseMiddleware.forEach((mw) => this.responsePipeline.use(mw));
    }

    // Initialize AI tools from registry
    this.initializeTools();
  }

  /**
   * Initialize tools for AI SDK
   */
  private initializeTools() {
    // Extract custom tools from agent program
    const customTools = extractCustomTools(this.program, this.tools, () => {
      // Get the last user message as agent context
      const lastUserMessage = this.currentMessages
        .filter((m) => m.role === "user")
        .pop();
      return typeof lastUserMessage?.content === "string"
        ? lastUserMessage.content
        : JSON.stringify(lastUserMessage?.content || "");
    });

    // Merge base tools with custom tools
    const allTools = mergeToolRegistries(this.tools, customTools);

    // Convert all tools to AI SDK format
    for (const [name, tool] of Object.entries(allTools)) {
      // Transform tool name to be OpenAI-compatible using Azure adapter pattern
      const aiToolName = toAzureFunctionName(name);

      // Create AI SDK tool wrapper
      this.aiTools[aiToolName] = {
        description: tool.description,
        parameters: tool.schema,
        execute: async (params: any) => {
          console.log(`🔧 Executing tool: ${name}`);

          // Create execution context
          const context: NodeExecutionContext = {
            currentNodeId: uuidv4(),
            previousResults: new Map(),
            document: { id: this.program.id, nodes: this.program.nodes } as any,
          };

          try {
            // Execute tool
            const content = params.content || "";
            delete params.content; // Remove content from params

            const result = await tool.execute(params, content, context);

            // Process response through middleware pipeline
            const finalResult = await this.responsePipeline.process({
              toolName: name,
              params: params,
              result: result,
              messages: this.currentMessages.slice(-3),
            });

            const isCustomTool = name.startsWith("custom:");
            if (isCustomTool) {
              console.log(`🎯 Custom tool ${name} executed and compressed`);
            }

            // Track tool call
            this.memory.add({
              type: "tool",
              toolCalls: [
                {
                  name,
                  args: params,
                  result: finalResult,
                },
              ],
            });

            return finalResult;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";

            // Track error
            this.memory.add({
              type: "tool",
              toolCalls: [
                {
                  name,
                  args: params,
                },
              ],
              error: errorMessage,
            });

            throw error;
          }
        },
      };
    }
  }

  /**
   * Get the system prompt with memory injection
   */
  private getSystemPrompt(): string {
    const memoryContext = this.memory.formatForPrompt();
    const toolNames = Object.keys(this.aiTools);

    const systemPrompt = buildDetailedSystemPrompt(
      this.program,
      toolNames,
      memoryContext
    );

    console.log(
      `[Agent] 📝 System prompt generated (${systemPrompt.length} chars)`
    );
    console.log(
      `[Agent] 📝 System prompt contains response_guidelines: ${systemPrompt.includes("response_guidelines")}`
    );

    return systemPrompt;
  }

  /**
   * Execute a chat message (non-streaming)
   */
  async chat(
    messages: Message[],
    options?: AgentExecuteOptions
  ): Promise<AgentExecuteResult> {
    // Store current messages for context
    this.currentMessages = messages;

    const userMessage = messages[messages.length - 1]?.content;

    try {
      // Add to memory
      const activity = this.memory.add({
        type: "chat",
        userMessage:
          typeof userMessage === "string"
            ? userMessage
            : JSON.stringify(userMessage),
      });

      const result = await generateText({
        model: this.model,
        system: this.getSystemPrompt(),
        messages,
        tools: this.aiTools,
        toolChoice: "auto",
        maxSteps: options?.maxSteps ?? 10,
        temperature: options?.temperature ?? 0.7,
      });

      // Update activity with response
      activity.assistantMessage = result.text;
      activity.usage = result.usage;
      if (result.toolCalls && result.toolCalls.length > 0) {
        activity.toolCalls = result.toolCalls.map((tc) => ({
          name: tc.toolName,
          args: tc.args as Record<string, any>,
        }));
      }

      return {
        message: {
          id: uuidv4(),
          role: "assistant",
          content: result.text,
          createdAt: new Date(),
        },
        usage: result.usage,
        finishReason: result.finishReason,
      };
    } catch (error) {
      // Track error
      this.memory.add({
        type: "chat",
        userMessage:
          typeof userMessage === "string"
            ? userMessage
            : JSON.stringify(userMessage),
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Execute a chat message (streaming)
   * Returns streamText result that can be used with toDataStreamResponse()
   */
  async chatStream(messages: Message[], options?: AgentExecuteOptions) {
    const userMessage = messages[messages.length - 1]?.content;

    try {
      // Add to memory
      const activity = this.memory.add({
        type: "chat",
        userMessage:
          typeof userMessage === "string"
            ? userMessage
            : JSON.stringify(userMessage),
      });

      const result = await streamText({
        model: this.model,
        system: this.getSystemPrompt(),
        messages,
        tools: this.aiTools,
        toolChoice: "auto",
        maxSteps: options?.maxSteps ?? 10,
        temperature: options?.temperature ?? 0.7,
        onFinish: async ({ text, toolCalls, usage, finishReason }) => {
          console.log(
            `[Agent] 🎯 Final finish - reason: ${finishReason}, text length: ${text.length}, toolCalls: ${toolCalls?.length || 0}`
          );

          // Update activity when stream finishes
          activity.assistantMessage = text;
          if (toolCalls && toolCalls.length > 0) {
            activity.toolCalls = toolCalls.map((tc) => ({
              name: fromAzureFunctionName(tc.toolName),
              args: tc.args,
            }));
          }

          // Call the external onFinish callback if provided
          if (options?.onFinish) {
            await options.onFinish({
              text,
              toolCalls: toolCalls?.map((tc) => ({
                ...tc,
                toolName: fromAzureFunctionName(tc.toolName),
              })),
              usage,
              finishReason,
            });
          }
        },
      });

      return result;
    } catch (error) {
      // Track error
      this.memory.add({
        type: "chat",
        userMessage:
          typeof userMessage === "string"
            ? userMessage
            : JSON.stringify(userMessage),
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Get memory/activity history
   */
  getMemory(): ActivityMemory {
    return this.memory;
  }

  /**
   * Get agent context
   */
  getContext(): AgentContext {
    return {
      ...this.context,
      activities: this.memory.toJSON(),
    };
  }

  /**
   * Clear memory
   */
  clearMemory(): void {
    this.memory.clear();
  }
}
