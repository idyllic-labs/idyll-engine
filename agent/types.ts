/**
 * Agent types for the idyll-engine
 */

import { Message, CoreTool, LanguageModelUsage, LanguageModel } from 'ai';
import { AgentDocument } from '../document/ast';
import type { ToolRegistry } from '../document/tool-registry';
import type { ResponseMiddleware } from './response-pipeline';

/**
 * Agent definition - the parsed AST of an <agent> document
 */
export type AgentDefinition = AgentDocument;

/**
 * Agent configuration - elegant and focused
 */
export interface AgentConfig {
  program: AgentDefinition;  // The agent program
  model: LanguageModel;      // AI runtime
  tools: ToolRegistry;       // Tool runtime
  responseMiddleware?: ResponseMiddleware[]; // Optional response processing middleware
}

/**
 * Activity record for agent memory
 */
export interface AgentActivity {
  id: string;
  timestamp: Date;
  type: 'chat' | 'trigger' | 'tool';
  userMessage?: string;
  assistantMessage?: string;
  toolCalls?: Array<{
    name: string;
    args: Record<string, any>;
    result?: any;
  }>;
  error?: string;
  usage?: LanguageModelUsage;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  agentId: string;
  agentName?: string;
  model?: string;
  userId?: string;
  threadId?: string;
  activities: AgentActivity[];
}

/**
 * Agent execution options
 */
export interface AgentExecuteOptions {
  temperature?: number;
  maxSteps?: number;
  stream?: boolean;
  onFinish?: (result: {
    text: string;
    toolCalls?: Array<{
      toolName: string;
      args: any;
      result?: any;
    }>;
    usage?: any;
    finishReason?: string;
  }) => Promise<void> | void;
}

/**
 * Agent execution result
 */
export interface AgentExecuteResult {
  message: Message;
  usage?: LanguageModelUsage;
  finishReason?: string;
}