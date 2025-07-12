/**
 * Agent types for the idyll-engine
 */

import { Message, CoreTool, LanguageModelUsage } from 'ai';
import { AgentDocument } from '../document/ast';
import { ToolRegistry } from '../document/tool-registry';

/**
 * Agent configuration
 */
export interface AgentConfig {
  document: AgentDocument;
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
}

/**
 * Agent execution result
 */
export interface AgentExecuteResult {
  message: Message;
  usage?: LanguageModelUsage;
  finishReason?: string;
}