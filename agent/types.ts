/**
 * Agent types for the idyll-engine
 */

import { Message, CoreTool, LanguageModelUsage } from 'ai';
import { AgentDocument } from '../document/ast';
import type { ToolRegistry } from '../document/tool-registry';

/**
 * Agent configuration
 */
export interface AgentConfig {
  document?: AgentDocument;
  systemPrompt?: string; // XML string alternative to document
  agentId?: string; // Required when using systemPrompt
  agentName?: string; // Required when using systemPrompt
  model?: string; // Required when using systemPrompt
  tools: ToolRegistry;
  memoryLimit?: number;
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