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
- **Function Support**: Agents can execute functions from the registry
- **Custom Functions**: Define functions in agent system prompts
- **Variable Resolution**: AI-powered variable interpolation (coming soon)

## CLI Commands

- `/help` - Show available commands
- `/load <path>` - Load an agent from XML file
- `/reload` - Reload the current agent
- `/clear` - Clear conversation history
- `/memory` - Show agent memory/activities
- `/context` - Show agent context (JSON)
- `/functions` - List available functions
- `/exit`, `/quit` - Exit the CLI

## Agent Definition Format

Agents are defined using the `<agent>` XML format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<agent id="my-agent" name="My Assistant" model="gpt-4" description="A helpful assistant">
  <h1>Instructions</h1>
  <p>You are a friendly assistant...</p>
  
  <function title="Custom Function">
    <function:description>Does something custom</function:description>
    <function:definition>
      <fncall idyll-fn="demo:echo">
        <params><![CDATA[{"message": "Hello"}]]></params>
        <content>Echo a greeting</content>
      </fncall>
    </function:definition>
  </function>
</agent>
```

## Architecture

The agent system consists of:

- **Agent**: Core execution engine with function execution support
- **ActivityMemory**: In-memory tracking of interactions
- **System Prompt Builder**: Converts agent documents to prompts
- **Model Provider**: Handles AI model selection
- **CLI**: REPL interface for testing

## Testing Custom Functions

The agent system integrates with custom function execution:

1. Define functions in your agent's system prompt
2. Functions can use variables that get resolved at runtime
3. Full execution context is tracked for debugging

## API Usage

```typescript
import { Agent } from '@idyllic-labs/idyll-engine';
import { parseXML } from '@idyllic-labs/idyll-engine';
import { createFunctionRegistry } from '@idyllic-labs/idyll-engine';

// Parse agent document
const agentDoc = parseXML(xmlString);

// Create agent
const agent = new Agent({
  document: agentDoc,
  functions: createFunctionRegistry({ /* your functions */ }),
  memoryLimit: 20,
});

// Chat
const result = await agent.chat(messages, {
  temperature: 0.7,
  maxSteps: 10,
});
```