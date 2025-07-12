#!/usr/bin/env bun
/**
 * Interactive Agent CLI with Blessed UI
 * 
 * A better terminal UI for testing agents with proper areas for:
 * - Chat history
 * - User input
 * - Tool execution logs
 * - Status information
 */

import blessed from 'blessed';
import { parseXML } from '../document/parser-grammar';
import { AgentDocument } from '../document/ast';
import { Agent } from '../agent/agent';
import { createToolRegistry, defineTool } from '../document/tool-registry';
import { Message } from 'ai';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { checkModelConfig } from '../agent/model-provider';

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Idyll Agent CLI',
});

// Chat history area (top)
const chatBox = blessed.box({
  label: ' Chat History ',
  top: 0,
  left: 0,
  width: '100%',
  height: '70%',
  border: {
    type: 'line',
  },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  style: {
    fg: 'white',
    border: {
      fg: 'cyan',
    },
  },
});

// Tool logs area (bottom right)
const toolBox = blessed.box({
  label: ' Tool Execution ',
  top: '70%',
  left: '50%',
  width: '50%',
  height: '20%',
  border: {
    type: 'line',
  },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  style: {
    fg: 'gray',
    border: {
      fg: 'yellow',
    },
  },
});

// Status area (bottom left)
const statusBox = blessed.box({
  label: ' Status ',
  top: '70%',
  left: 0,
  width: '50%',
  height: '20%',
  border: {
    type: 'line',
  },
  style: {
    fg: 'green',
    border: {
      fg: 'green',
    },
  },
});

// Input area (very bottom)
const inputBox = blessed.textbox({
  label: ' Message (Ctrl+C to exit, Enter to send) ',
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  inputOnFocus: true,
  border: {
    type: 'line',
  },
  style: {
    fg: 'white',
    border: {
      fg: 'blue',
    },
    focus: {
      border: {
        fg: 'white',
      },
    },
  },
});

// Add all boxes to screen
screen.append(chatBox);
screen.append(toolBox);
screen.append(statusBox);
screen.append(inputBox);

// State
let currentAgent: Agent | null = null;
let messages: Message[] = [];
let isProcessing = false;

// Demo tools registry
function createDemoTools() {
  return createToolRegistry({
    'demo:echo': defineTool({
      schema: z.object({
        message: z.string().describe('Message to echo'),
      }),
      description: 'Echoes back the provided message',
      execute: async (params) => {
        appendToToolLog(`Echo: ${params.message}`);
        return { echoed: params.message };
      },
    }),
    
    'demo:calculate': defineTool({
      schema: z.object({
        expression: z.string().describe('Math expression to evaluate'),
      }),
      description: 'Evaluates a simple math expression',
      execute: async (params) => {
        appendToToolLog(`Calculate: ${params.expression}`);
        try {
          const result = eval(params.expression);
          appendToToolLog(`Result: ${result}`);
          return { result, expression: params.expression };
        } catch (error) {
          appendToToolLog(`Error: Invalid expression`);
          return { error: 'Invalid expression' };
        }
      },
    }),
    
    'demo:time': defineTool({
      schema: z.object({}),
      description: 'Gets the current time',
      execute: async () => {
        const now = new Date();
        appendToToolLog(`Time: ${now.toTimeString()}`);
        return { 
          time: now.toTimeString(),
          date: now.toDateString(),
          iso: now.toISOString(),
        };
      },
    }),
  });
}

// Helper functions
function appendToChat(text: string, style?: { fg?: string; bold?: boolean }) {
  const styledText = style ? blessed.parseTags(`{${style.fg || 'white'}-fg}${style.bold ? '{bold}' : ''}${text}{/}`) : text;
  chatBox.pushLine(styledText);
  chatBox.setScrollPerc(100);
  screen.render();
}

function appendToToolLog(text: string) {
  toolBox.pushLine(text);
  toolBox.setScrollPerc(100);
  screen.render();
}

function updateStatus(text: string, style?: { fg?: string }) {
  statusBox.setContent(blessed.parseTags(`{${style?.fg || 'green'}-fg}${text}{/}`));
  screen.render();
}

async function loadAgent(agentPath: string) {
  try {
    updateStatus('Loading agent...', { fg: 'yellow' });
    
    const xml = await fs.readFile(agentPath, 'utf-8');
    const parsed = parseXML(xml);
    
    if (!('type' in parsed) || parsed.type !== 'agent') {
      throw new Error('File does not contain an agent document');
    }
    
    const agentDoc = parsed as AgentDocument;
    
    // Check model configuration
    const modelCheck = checkModelConfig(agentDoc.model);
    if (!modelCheck.valid) {
      appendToChat(`⚠️  ${modelCheck.message}`, { fg: 'yellow' });
    }
    
    // Create agent with demo tools
    currentAgent = new Agent({
      document: agentDoc,
      tools: createDemoTools(),
      memoryLimit: 20,
    });
    
    messages = []; // Reset conversation
    chatBox.setContent(''); // Clear chat
    toolBox.setContent(''); // Clear tools
    
    updateStatus(`Agent: ${agentDoc.name || 'Unnamed'} | Model: ${agentDoc.model || 'default'}`);
    appendToChat(`Loaded: ${agentDoc.name || 'Unnamed Agent'}`, { fg: 'green', bold: true });
    if (agentDoc.description) {
      appendToChat(agentDoc.description, { fg: 'gray' });
    }
    appendToChat(''); // Empty line
  } catch (error) {
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, { fg: 'red' });
  }
}

async function processMessage(text: string) {
  if (!currentAgent) {
    appendToChat('No agent loaded. Pass an agent file as argument.', { fg: 'red' });
    return;
  }
  
  if (isProcessing) return;
  isProcessing = true;
  
  // Add user message to chat
  appendToChat(`You: ${text}`, { fg: 'blue', bold: true });
  
  // Add to messages
  messages.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    createdAt: new Date(),
  });
  
  try {
    updateStatus('Agent is thinking...', { fg: 'yellow' });
    
    let responseText = '';
    let toolCallCount = 0;
    
    // Get response with streaming
    const response = await currentAgent.chatStream(messages, {
      temperature: 0.7,
      maxSteps: 10,
      onChunk: (chunk) => {
        responseText += chunk;
        // Update the last line with the accumulated response
        const lines = chatBox.getLines();
        const lastLineIndex = lines.length - 1;
        if (lastLineIndex >= 0 && lines[lastLineIndex].startsWith('Assistant: ')) {
          chatBox.deleteLine(lastLineIndex);
        }
        appendToChat(`Assistant: ${responseText}`, { fg: 'green' });
      },
      onToolCall: (toolName, args) => {
        toolCallCount++;
        appendToToolLog(`🔧 ${toolName}: ${JSON.stringify(args)}`);
        updateStatus(`Executing tool: ${toolName}`, { fg: 'cyan' });
      },
    });
    
    // Add assistant message
    messages.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.text,
      createdAt: new Date(),
    });
    
    // Update status
    if (response.usage) {
      updateStatus(
        `Ready | Tokens: ${response.usage.totalTokens} | Tools: ${toolCallCount}`,
        { fg: 'green' }
      );
    } else {
      updateStatus('Ready', { fg: 'green' });
    }
  } catch (error) {
    appendToChat(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { fg: 'red' });
    updateStatus('Error occurred', { fg: 'red' });
  } finally {
    isProcessing = false;
  }
}

// Input handling
inputBox.on('submit', async (text) => {
  if (text.trim()) {
    inputBox.clearValue();
    inputBox.focus();
    await processMessage(text);
  }
});

// Always keep input focused
inputBox.focus();

// Keyboard shortcuts
screen.key(['C-c', 'escape'], () => {
  process.exit(0);
});

// Mouse support for scrolling
chatBox.on('wheeldown', () => {
  chatBox.scroll(1);
  screen.render();
});

chatBox.on('wheelup', () => {
  chatBox.scroll(-1);
  screen.render();
});

toolBox.on('wheeldown', () => {
  toolBox.scroll(1);
  screen.render();
});

toolBox.on('wheelup', () => {
  toolBox.scroll(-1);
  screen.render();
});

// Initial render
screen.render();

// Load agent from command line
const agentFile = process.argv[2];
if (agentFile) {
  loadAgent(agentFile).then(() => {
    inputBox.focus();
  });
} else {
  updateStatus('No agent loaded. Pass agent file as argument.', { fg: 'yellow' });
  appendToChat('Usage: bun agent-blessed <agent.xml>', { fg: 'yellow' });
}

// Handle process exit
process.on('exit', () => {
  screen.destroy();
});