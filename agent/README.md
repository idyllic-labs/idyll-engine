# Idyll Agent System

A lightweight agent system for testing and experimentation with the idyll-engine.

## Quick Start

```bash
# Set up your API key
export OPENAI_API_KEY=your-api-key

# Run the agent CLI
bun agent

# Or load an agent directly
bun agent examples/demo-agent.xml
```

## Features

- **REPL Interface**: Interactive chat with agents
- **In-Memory Activity**: Track conversation history during session
- **Tool Support**: Agents can execute tools from the registry
- **Custom Tools**: Define tools in agent system prompts
- **Variable Resolution**: AI-powered variable interpolation (coming soon)

## CLI Commands

- `/help` - Show available commands
- `/load <path>` - Load an agent from XML file
- `/reload` - Reload the current agent
- `/clear` - Clear conversation history
- `/memory` - Show agent memory/activities
- `/context` - Show agent context (JSON)
- `/tools` - List available tools
- `/exit`, `/quit` - Exit the CLI

## Agent Definition Format

Agents are defined using the `<agent>` XML format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<agent id="my-agent" name="My Assistant" model="gpt-4" description="A helpful assistant">
  <h1>Instructions</h1>
  <p>You are a friendly assistant...</p>
  
  <tool title="Custom Tool">
    <tool:description>Does something custom</tool:description>
    <tool:definition>
      <fncall idyll-tool="demo:echo">
        <params><![CDATA[{"message": "Hello"}]]></params>
        <content>Echo a greeting</content>
      </fncall>
    </tool:definition>
  </tool>
</agent>
```

## Architecture

The agent system consists of:

- **Agent**: Core execution engine with tool support
- **ActivityMemory**: In-memory tracking of interactions
- **System Prompt Builder**: Converts agent documents to prompts
- **Model Provider**: Handles AI model selection
- **CLI**: REPL interface for testing

## Testing Custom Tools

The agent system integrates with custom tool execution:

1. Define tools in your agent's system prompt
2. Tools can use variables that get resolved at runtime
3. Full execution context is tracked for debugging

## API Usage

```typescript
import { Agent } from '@idyllic-labs/idyll-engine';
import { parseXML } from '@idyllic-labs/idyll-engine';
import { createToolRegistry } from '@idyllic-labs/idyll-engine';

// Parse agent document
const agentDoc = parseXML(xmlString);

// Create agent
const agent = new Agent({
  document: agentDoc,
  tools: createToolRegistry({ /* your tools */ }),
  memoryLimit: 20,
});

// Chat
const result = await agent.chat(messages, {
  temperature: 0.7,
  maxSteps: 10,
});
```