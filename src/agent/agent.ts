/**
 * Lightweight Agent implementation for idyll-engine
 *
 * This is a clean implementation inspired by the app's Agent class
 * but without the database dependencies and app-specific logic.
 */

import {
  generateText,
  streamText,
  Message,
  CoreTool,
  LanguageModel,
  tool,
} from "ai";
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
import { FunctionRegistry } from "../document/function-registry";
import { NodeExecutionContext } from "../document/execution-types";
import { v4 as uuidv4 } from "uuid";
import { buildDetailedSystemPrompt } from "./system-prompt";
import { extractCustomFunctions } from "./custom-functions";
import { mergeFunctionRegistries } from "../document/function-registry";
import { ResponsePipeline, ResponseMiddleware } from "./response-pipeline";
import {
  toAzureFunctionName,
  fromAzureFunctionName,
} from "../document/function-naming";

type GenerateTextOptions = Parameters<typeof generateText>[0];
type StreamTextOptions = Parameters<typeof streamText>[0];

/**
 * Agent class for executing conversations with tools
 */
export class Agent {
  private program: AgentDefinition;
  private model: LanguageModel;
  private functions: FunctionRegistry;
  private memory: ActivityMemory;
  private context: AgentContext;
  private aiTools: Record<string, CoreTool> = {};
  private currentMessages: Message[] = [];
  private responsePipeline: ResponsePipeline;

  constructor(config: AgentConfig) {
    this.program = config.program;
    this.model = config.model;
    this.functions = config.functions;

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

    // Initialize AI tools from function registry
    this.initializeTools();
  }

  /**
   * Initialize tools for AI SDK (converts functions to AI tools)
   */
  private initializeTools() {
    // Extract custom functions from agent program
    console.log(
      "[Agent] Initializing tools, agent program has nodes:",
      this.program.nodes.length
    );
    console.log(
      "[Agent] Node types:",
      this.program.nodes.map((n) => n.type)
    );
    const customTools = extractCustomFunctions(
      this.program,
      this.functions,
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

    // Merge base functions with custom functions
    console.log("[Agent] Custom tools extracted:", Object.keys(customTools));
    const allTools = mergeFunctionRegistries(this.functions, customTools);
    console.log(
      "[Agent] All tools after merge:",
      Object.keys(allTools).length,
      Object.keys(allTools)
    );

    // Convert all functions to AI SDK tool format
    for (const [name, functionDef] of Object.entries(allTools)) {
      // Transform function name to be OpenAI-compatible using Azure adapter pattern
      const aiToolName = toAzureFunctionName(name);

      
      // Create AI SDK tool wrapper for the function
      const createdTool = tool({
        description: functionDef.description || "",
        parameters: functionDef.schema,
        execute: async (params: any) => {
          console.log(`🔧 Executing function: ${name}`);

          // Create execution context
          const context: NodeExecutionContext = {
            currentNodeId: uuidv4(),
            previousResults: new Map(),
            document: { id: this.program.id, nodes: this.program.nodes } as any,
          };

          try {
            // Execute function
            const content = params.content || "";
            delete params.content; // Remove content from params

            const result = await functionDef.execute(params, content, context);

            // Process response through middleware pipeline
            const finalResult = await this.responsePipeline.process({
              functionName: name,
              params: params,
              result: result,
              messages: this.currentMessages.slice(-3),
            });

            const isCustomFunction = name.startsWith("custom:");
            if (isCustomFunction) {
              console.log(`🎯 Custom function ${name} executed and compressed`);
            }

            // Track function call in activity memory
            this.memory.add({
              type: "tool",
              functionCalls: [
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
              functionCalls: [
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
      });
      
      if (name === 'documents:create') {
        console.log('[Agent] Created tool:', createdTool);
        console.log('[Agent] Tool parameters:', createdTool.parameters);
      }
      
      this.aiTools[aiToolName] = createdTool;
    }
  }

  /**
   * Get the system prompt with memory injection
   */
  private getSystemPrompt(): string {
    const memoryContext = this.memory.formatForPrompt();
    const functionNames = Object.keys(this.aiTools);

    const systemPrompt = buildDetailedSystemPrompt(
      this.program,
      functionNames,
      memoryContext
    );

    console.log(
      `[Agent] 📝 System prompt generated (${systemPrompt.length} chars)`
    );
    console.log(
      `[Agent] 📝 System prompt contains response_guidelines: ${systemPrompt.includes("response_guidelines")}`
    );
    console.log(
      `[Agent] 📝 Available functions in system prompt: ${functionNames.filter((name) => name.startsWith("custom")).join(", ")}`
    );

    return systemPrompt;
  }

  /**
   * Execute a chat message (non-streaming)
   */
  async chat(
    messages: Message[],
    options?: GenerateTextOptions
  ): Promise<AgentExecuteResult> {
    // Store current messages for context
    this.currentMessages = messages;

    const userMessage = messages[messages.length - 1]?.content;

    // Debug: Check if options contains tools
    if (options && 'tools' in options) {
      console.log('[Agent] WARNING: chat() received options with tools property!', options.tools);
    }

    try {
      // Add to memory
      const activity = this.memory.add({
        type: "chat",
        userMessage:
          typeof userMessage === "string"
            ? userMessage
            : JSON.stringify(userMessage),
      });

      // Debug: Log what we're passing to generateText
      console.log('[Agent] About to call generateText with tools:', Object.keys(this.aiTools));
      if (this.aiTools['documents--create']) {
        console.log('[Agent] documents--create tool in generateText:', this.aiTools['documents--create']);
      }
      
      const result = await generateText({
        ...options,
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
        activity.functionCalls = result.toolCalls.map((tc) => ({
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
  async chatStream(messages: Message[], options?: StreamTextOptions) {
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

      // Debug tools before calling streamText
      console.log('[Agent] About to call streamText with tools:', Object.keys(this.aiTools));
      if (this.aiTools['documents--create']) {
        console.log('[Agent] documents--create tool:', this.aiTools['documents--create']);
        console.log('[Agent] documents--create parameters:', this.aiTools['documents--create'].parameters);
      }
      
      const result = await streamText({
        ...options,
        model: this.model,
        system: this.getSystemPrompt(),
        messages,
        tools: this.aiTools,
        toolChoice: "auto",
        maxSteps: options?.maxSteps ?? 10,
        temperature: options?.temperature ?? 0.7,
        onFinish: async ({ text, toolCalls, usage, finishReason }) => {
          console.log(
            `[Agent] 🎯 Final finish - reason: ${finishReason}, text length: ${text.length}, functionCalls: ${toolCalls?.length || 0}`
          );

          // Update activity when stream finishes
          activity.assistantMessage = text;
          if (toolCalls && toolCalls.length > 0) {
            activity.functionCalls = toolCalls.map((tc) => ({
              name: fromAzureFunctionName(tc.toolName),
              args: tc.args,
            }));
          }

          // Call the external onFinish callback if provided
          if (options?.onFinish) {
            await options.onFinish({
              text,
              // @ts-ignore
              functionCalls: toolCalls?.map((tc) => ({
                ...tc,
                functionName: fromAzureFunctionName(tc.toolName),
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
