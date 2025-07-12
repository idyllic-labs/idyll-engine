/**
 * Lightweight Agent implementation for idyll-engine
 *
 * This is a clean implementation inspired by the app's Agent class
 * but without the database dependencies and app-specific logic.
 */

import { generateText, streamText, Message, CoreTool } from "ai";
import {
  AgentConfig,
  AgentContext,
  AgentExecuteOptions,
  AgentExecuteResult,
  AgentActivity,
} from "./types";
import { ActivityMemory } from "./memory";
import { ToolRegistry } from "../document/tool-registry";
import { BlockExecutionContext } from "../document/execution-types";
import { v4 as uuidv4 } from "uuid";
import { buildDetailedSystemPrompt } from "./system-prompt";
import { getModel } from "./model-provider";
import { extractCustomTools } from "./custom-tools";
import { mergeToolRegistries } from "../document/tool-registry";
import { compressToolResponse } from "./response-compressor";
import {
  toAzureFunctionName,
  fromAzureFunctionName,
} from "../document/tool-naming";

/**
 * Agent class for executing conversations with tools
 */
export class Agent {
  private config: AgentConfig;
  private memory: ActivityMemory;
  private context: AgentContext;
  private aiTools: Record<string, CoreTool> = {};
  private currentMessages: Message[] = [];

  constructor(config: AgentConfig) {
    // Handle XML string system prompt if provided
    if (config.systemPrompt && !config.document) {
      // Parse XML to create document blocks
      const { parseXML } = require('../document/parser-grammar');
      try {
        const parsedDoc = parseXML(config.systemPrompt);
        // Create a minimal AgentDocument with required fields
        config.document = {
          type: 'agent',
          id: config.agentId || 'agent-' + Date.now(),
          name: config.agentName || 'Assistant',
          model: config.model || 'gpt-4',
          blocks: parsedDoc.blocks || []
        } as AgentDocument;
      } catch (error) {
        throw new Error(`Failed to parse system prompt XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    if (!config.document) {
      throw new Error('Either document or systemPrompt must be provided');
    }

    this.config = config;
    this.memory = new ActivityMemory(config.memoryLimit);
    this.context = {
      agentId: config.document.id,
      agentName: config.document.name,
      model: config.document.model,
      activities: [],
    };

    // Initialize AI tools from registry
    this.initializeTools();
  }

  /**
   * Initialize tools for AI SDK
   */
  private initializeTools() {
    // Extract custom tools from agent document
    const customTools = extractCustomTools(
      this.config.document,
      this.config.tools,
      () => {
        // Get the last user message as agent context
        const lastUserMessage = this.currentMessages
          .filter((m) => m.role === "user")
          .pop();
        return typeof lastUserMessage?.content === "string"
          ? lastUserMessage.content
          : JSON.stringify(lastUserMessage?.content || "");
      }
    );

    // Merge base tools with custom tools
    const allTools = mergeToolRegistries(this.config.tools, customTools);

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
          const context: BlockExecutionContext = {
            currentBlockId: uuidv4(),
            previousResults: new Map(),
            document: this.config.document,
          };

          try {
            // Execute tool
            const content = params.content || "";
            delete params.content; // Remove content from params

            const result = await tool.execute(params, content, context);

            // Compress response for custom tools
            const isCustomTool = name.startsWith("custom:");
            const finalResult = isCustomTool
              ? await compressToolResponse({
                  toolName: name,
                  toolParams: params,
                  toolContent: content,
                  rawResponse: result,
                  recentMessages: this.currentMessages.slice(-3),
                })
              : result;

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

    return buildDetailedSystemPrompt(
      this.config.document,
      toolNames,
      memoryContext
    );
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
        model: getModel(this.config.document.model!),
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
  async chatStream(
    messages: Message[],
    options?: AgentExecuteOptions & {
      onChunk?: (chunk: string) => void;
      onToolCall?: (toolName: string, args: any) => void;
    }
  ) {
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
        model: getModel(this.config.document.model!),
        system: this.getSystemPrompt(),
        messages,
        tools: this.aiTools,
        maxSteps: options?.maxSteps ?? 10,
        temperature: options?.temperature ?? 0.7,
        onChunk: async ({ chunk }) => {
          if (chunk.type === "text-delta" && options?.onChunk) {
            options.onChunk(chunk.textDelta);
          }
          if (chunk.type === "tool-call" && options?.onToolCall) {
            // Transform tool name back from AI format to original format
            const originalToolName = fromAzureFunctionName(chunk.toolName);
            options.onToolCall(originalToolName, chunk.args);
          }
        },
        onFinish: async ({ text, toolCalls }) => {
          // Update activity when stream finishes
          activity.assistantMessage = text;
          if (toolCalls && toolCalls.length > 0) {
            activity.toolCalls = toolCalls.map((tc) => ({
              name: fromAzureFunctionName(tc.toolName),
              args: tc.args,
            }));
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
