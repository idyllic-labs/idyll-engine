<div align="center">
  <img src="https://idyllic.so/idyll-engine-banner.png" alt="Idyll Engine" width="100%" />
</div>

# Idyll Engine

> A context-building execution engine for AI-native programming

<div align="center">

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-18.0+-green.svg)](https://nodejs.org/)

</div>

Idyll Engine reimagines programming for the AI era. Instead of functions that transform data and produce side effects, Idyll functions build context that AI interprets to determine relevance. This paradigm shift enables a new form of programming where execution is exploration and results are contextual understanding.

**[Read our Manifesto →](MANIFESTO.md)**

## Table of Contents

- [Philosophy: Context-Driven Computation](#philosophy-context-driven-computation)
  - [The Paradigm Shift](#the-paradigm-shift)
  - [Homoiconicity: Code as Living Documents](#homoiconicity-code-as-living-documents)
- [Computational Insights](#computational-insights)
- [How This Changes AI Programming](#how-this-changes-ai-programming)
  - [The String-Based Intelligence Model](#the-string-based-intelligence-model)
  - [Why This Isn't Another Automation Tool](#why-this-isnt-another-automation-tool)
- [Core Features](#core-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Context-Building Example](#context-building-example)
  - [AI Agent with Custom Functions](#ai-agent-with-custom-functions)
- [Why This Matters](#why-this-matters)
- [Grammar and Language Design](#grammar-and-language-design)
  - [Why XML?](#why-xml)
  - [The Execution Layer](#the-execution-layer)
  - [Grammar Structure (EBNF-style)](#grammar-structure-ebnf-style)
  - [Key Grammar Insights](#key-grammar-insights)
- [Technical Details](#technical-details)
  - [Function Naming](#function-naming)
- [CLI Usage](#cli-usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Development](#development)
- [Documentation](#documentation)
- [The Vision: Community-Driven Intelligence Construction](#the-vision-community-driven-intelligence-construction)
- [Community](#community)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Citation](#citation)

## Philosophy: Context-Driven Computation

The Idyll language fundamentally reimagines programming for the AI era. Instead of functions that transform data and produce side effects, Idyll functions **build context** that AI interprets to determine relevance.

### The Paradigm Shift

**Traditional Programming**: Execute → Transform → Return  
**Idyllic Programming**: Execute → Augment Context → AI Interprets

In Idyllic, function calls don't just compute—they accumulate context. The AI model becomes the interpreter of this context, extracting what matters for the task at hand. This mirrors how human intelligence works: we gather information, build understanding, and extract meaning based on intent.

### Homoiconicity: Code as Living Documents

Idyllic embraces true homoiconicity—programs are documents, documents are programs. An `<agent>` definition isn't just configuration, it's executable context. Custom functions aren't subroutines, they're documented patterns of context accumulation. The XML structure is both human-readable documentation and machine-executable code.

## Computational Insights

### 1. **Context Accumulation Over Direct Returns**
Functions contribute to an ever-growing context rather than producing isolated results. Each function call enriches the computational environment.

### 2. **Linear Execution as Feature**
No recursion, no complex control flow—just sequential context building. This maps perfectly to how transformer models process information.

### 3. **Variables as Context Queries**
Variables aren't memory locations but prompts for context-aware resolution. `<variable name="topic" prompt="What to search for" />` asks the AI to resolve based on accumulated context.

### 4. **Response Pipeline as Intelligence Layer**
The middleware system acts as a compression layer, distilling verbose execution results into what the AI actually needs—solving the context window problem elegantly.

## How This Changes AI Programming

### From Tools to Context Providers
Traditional: "Call function X to get result Y"  
Idyllic: "Call function X to add context, let AI determine relevance"

### From State to Flow
Traditional: Manage state across function calls  
Idyllic: State IS the accumulated context flow

### From Explicit to Emergent
Traditional: Explicitly handle every case  
Idyllic: Patterns emerge from context interpretation

### From Imperative to Declarative Intent
Traditional: "How to compute"  
Idyllic: "What context to build"

### The String-Based Intelligence Model

Just as humans resolve everything into the visual domain in working memory, Idyllic resolves all values into rich, composable strings with references and pointers. The context becomes the working memory.

#### Augmented Strings: Beyond Plain Text

Our strings aren't just text - they're **augmented with semantic markers**:

```xml
<content>
  Analyze <mention:document id="doc123">the architecture doc</mention:document>
  and compare with <mention:user id="usr456">John's</mention:user> proposal
  focusing on <variable name="aspect" prompt="What aspect to analyze"/> 
  <annotation confidence="0.8">This seems related to last week's discussion</annotation>
</content>
```

These augmentations create a **rich semantic graph** within the text:
- **Mentions** create explicit references to entities (documents, users, agents)
- **Variables** are prompts for contextual resolution, not static values
- **Annotations** add metadata and confidence layers
- **Links** preserve external references while maintaining readability

#### The Execution Engine: Context-Driven Semantics

We layer a lightweight execution engine on top of XML that adds **context-driven semantics**:

1. **Sequential Context Building** - Each function call adds to accumulated context
2. **Variable Resolution** - AI resolves variables based on accumulated context, not static scope
3. **Error Resilience** - Failed functions still contribute partial context
4. **Semantic Preservation** - The meaning is in the text + augmentations, not in types

#### Combinators for Intelligence

The real power comes from **functional combinators** that work with context:

```xml
<!-- Combinator: Sequential exploration -->
<function title="Deep Analysis">
  <fncall fn="explore:surface">Initial exploration</fncall>
  <fncall fn="explore:patterns">Find patterns in previous context</fncall>
  <fncall fn="explore:anomalies">What doesn't fit the patterns?</fncall>
</function>

<!-- Combinator: Parallel perspectives -->
<function title="Multi-Perspective Analysis">
  <fncall fn="analyze:technical">Technical implications</fncall>
  <fncall fn="analyze:business">Business impact</fncall>
  <fncall fn="analyze:user">User experience angle</fncall>
  <fncall fn="synthesize:perspectives">Combine all viewpoints</fncall>
</function>
```

These aren't traditional function compositions - they're **context combinators** that build understanding.

This design choice is fundamental:
- **Variables in natural language** rather than rigid JSON schemas
- **Intent expression** through string interpolation: `"Find breakthroughs in <variable name='field'/>"`
- **Context accumulation** means programs move forward even through errors
- **Non-brittle by design** - unlike automation tools, this is an experimental programming paradigm

We deliberately chose expressiveness over efficiency. JSON schemas are faster but they cage intelligence. String interpolation with variables lets you experiment with AI capabilities at the speed of thought. You can always optimize later once patterns emerge.

### Why This Isn't Another Automation Tool

Traditional automation breaks at the first unexpected input. Idyllic embraces the messiness of intelligence:
- Functions that error still contribute context
- Partial results are valid results 
- The AI interprets accumulated context to recover and continue
- Each execution teaches you something about the problem space

This isn't about building reliable workflows - it's about **constructing intelligence** through experimentation.

## Core Features

- **Context-Building Functions**: Functions accumulate context rather than just returning values
- **Homoiconic Documents**: XML documents that are simultaneously code, data, and documentation
- **AI-Native Variables**: Variables resolved through context interpretation, not memory lookup
- **Response Pipeline**: Intelligent middleware that compresses execution context for AI consumption
- **Linear Execution Model**: Sequential context accumulation perfectly aligned with transformer architectures
- **Custom Functions**: Reusable patterns of context accumulation, not traditional subroutines
- **Instrumentation Hooks**: Complete observability into context building with timing and result tracking

## Installation

```bash
# npm
npm install @idyllic-labs/idyll-engine

# yarn
yarn add @idyllic-labs/idyll-engine

# pnpm
pnpm add @idyllic-labs/idyll-engine

# bun
bun add @idyllic-labs/idyll-engine
```

## Quick Start

### Context-Building Example

```typescript
import { parseXmlToAst, DocumentExecutor, createFunctionRegistry, defineFunction } from '@idyllic-labs/idyll-engine';

// Functions that build context, not just transform data
const functions = createFunctionRegistry({
  'search:web': defineFunction({
    schema: z.object({ query: z.string() }),
    description: 'Add search results to context',
    execute: async (params, content, context) => ({
      results: ['result1', 'result2'],
      searchedFor: params.query,
      // This becomes part of the accumulated context
    }),
  }),
  'ai:summarize': defineFunction({
    schema: z.object({ style: z.string() }),
    description: 'Summarize accumulated context',
    execute: async (params, content, context) => ({
      // Access previous results from context
      summary: `Summarized ${context.previousResults.size} previous operations`,
      basedOn: Array.from(context.previousResults.keys()),
    }),
  }),
});

// Documents are programs - homoiconicity in action
const document = parseXmlToAst(`
  <document>
    <p>Research Task</p>
    <fncall idyll-fn="search:web">
      <params>{"query": "AI breakthroughs"}</params>
      <content>Search for latest developments</content>
    </fncall>
    <fncall idyll-fn="ai:summarize">
      <params>{"style": "bullet-points"}</params>
      <content>Summarize the findings</content>
    </fncall>
  </document>
`);

// Execute with instrumentation to observe context building
const executor = new DocumentExecutor({ 
  functions,
  hooks: {
    afterExecution: (fn, result, duration) => {
      console.log(`Context augmented by ${fn} in ${duration}ms`);
    }
  }
});
const report = await executor.execute({ 
  mode: 'document',
  document,
  options: { functions }
});
```

### AI Agent with Custom Functions

```typescript
import { Agent, parseXmlToAst } from '@idyllic-labs/idyll-engine';

// Agents are documents - code and documentation unified
const agentProgram = parseXmlToAst(`
  <agent name="Research Assistant">
    <p>I help with research by building context through function calls.</p>
    
    <!-- Custom function: a reusable pattern of context accumulation -->
    <function title="Deep Research" icon="🔬">
      <function:definition>
        <fncall idyll-fn="search:web">
          <params>{"maxResults": 10}</params>
          <content>Search for <variable name="topic" prompt="Research topic" /></content>
        </fncall>
        <fncall idyll-fn="analyze:relevance">
          <params>{}</params>
          <content>Filter for <variable name="criteria" prompt="Relevance criteria" /></content>
        </fncall>
        <fncall idyll-fn="format:report">
          <params>{}</params>
          <content>Format findings</content>
        </fncall>
      </function:definition>
    </function>
  </agent>
`);

// The agent interprets accumulated context
const agent = new Agent({
  program: agentProgram,
  model: aiModel,
  functions: contextBuildingFunctions,
  responseMiddleware: [
    // Compress verbose context into what matters
    contextCompressionMiddleware
  ]
});

// Variables are resolved through context, not assignment
const result = await agent.chat([
  { role: 'user', content: 'Research quantum computing breakthroughs' }
]);
```

## Why This Matters

Idyllic represents a fundamental shift in how we think about programming in the AI era. By treating computation as context accumulation rather than data transformation, we align programming with how AI models naturally process information. 

The homoiconic nature means every program is simultaneously:
- **Executable code** that builds context
- **Living documentation** that explains intent  
- **AI-readable structure** that guides interpretation

This isn't just a new syntax—it's a new computational philosophy where meaning emerges from context, intelligence interprets accumulation, and programming becomes a conversation between human intent and AI understanding.

## Grammar and Language Design

### Why XML?

The choice of XML is deliberate and strategic:

1. **Ease of Parsing** - Well-established parsers, no ambiguity in structure
2. **Tooling Ecosystem** - XPath, XSLT, schema validation, editor support
3. **LLM Familiarity** - Extensive XML in training data means AI models understand it intuitively
4. **Extensible Markup** - Literally designed for interweaving text with structure
5. **Homoiconicity** - Natural representation where code structure mirrors data structure

### The Execution Layer

Idyllic adds a light execution layer with context-driven semantics on top of XML. This enables:

- **Explorative Context Engineering** - Build up context iteratively through function calls
- **Intelligence Design** - Create patterns of context accumulation that guide AI behavior  
- **Semantic Clarity** - Each element has clear meaning in the context-building process
- **Augmented Strings** - Text enriched with mentions, variables, and annotations
- **Context Combinators** - Functions that compose to build understanding, not just transform data

### Grammar Structure (EBNF-style)

```ebnf
(* Root Elements *)
document        ::= <document [id] [version]> block* </document>
agent           ::= <agent [id] [name] [model]> block* </agent>
diff            ::= <diff> operation+ </diff>

(* Blocks - The Core Building Units *)
block           ::= content-block | executable-block | function-block

(* Content Blocks - Rich Text and Structure *)
content-block   ::= paragraph | heading | list-item | code | quote | separator | data
paragraph       ::= <p> rich-content </p>
heading         ::= <h[1-6]> rich-content </h[1-6]>
list-item       ::= <bulletlistitem> rich-content </bulletlistitem>
                  | <numberedlistitem> rich-content </numberedlistitem>
                  | <checklistitem checked> rich-content </checklistitem>
code            ::= <code [language]> text </code>
quote           ::= <quote [author] [source]> rich-content </quote>
separator       ::= <separator/>
data            ::= <data [title]> text </data>

(* Executable Blocks - Context Building *)
executable-block ::= function-call | trigger
function-call    ::= <fncall idyll-fn="module:function">
                       [<params> json </params>]
                       [<content> rich-content </content>]
                     </fncall>
trigger          ::= <trigger event="string" [debounce]>
                       [<params> json </params>]
                     </trigger>

(* Function Blocks - Custom Context Patterns *)
function-block   ::= <function title="string" [icon]>
                       [<function:description> text </function:description>]
                       <function:definition>
                         (content-block | executable-block)+
                       </function:definition>
                     </function>

(* Rich Content - Inline Elements *)
rich-content    ::= (text | styled-text | mention | variable | link | annotation)*
styled-text     ::= <strong> rich-content </strong>
                  | <em> rich-content </em>
                  | <code> rich-content </code>
                  | <u> rich-content </u>
                  | <s> rich-content </s>
mention         ::= <mention:[type] id [label]> text </mention:[type]>
variable        ::= <variable name [prompt]> [text] </variable>
link            ::= <a href> rich-content </a>
annotation      ::= <annotation [title] [comment]> rich-content </annotation>

(* Function Naming Convention *)
function-name   ::= [module ":"] identifier
module          ::= js-identifier
identifier      ::= js-identifier
js-identifier   ::= /[a-zA-Z_$][a-zA-Z0-9_$]*/
```

### Key Grammar Insights

1. **Flat Structure** - No deeply nested containers, promoting linear context flow
2. **Rich Content Everywhere** - Text can contain variables, mentions, and styling
3. **Function Calls as First-Class** - `<fncall>` blocks are primary building units
4. **Custom Functions** - Define reusable context-building patterns inline
5. **Variables in Content** - Not separate from text but embedded within it

The grammar enforces the philosophy: programs are documents, execution builds context, and meaning emerges from accumulation.

## Technical Details

### Function Naming

All functions follow the `module:function` pattern with JavaScript identifier constraints:

```typescript
import { validateFunctionName, toAzureFunctionName } from '@idyllic-labs/idyll-engine';

// Valid function names
'demo:echo'        // ✅
'ai:analyzeText'   // ✅ 
'processData'      // ✅ (no module)

// Invalid (no longer supported)
'ai:analyze-text'  // ❌ kebab-case not allowed

// Azure Functions compatibility
toAzureFunctionName('demo:echo') // → 'demo--echo'
```

## CLI Usage

```bash
# Parse a document
bun run cli parse examples/document-simple.xml

# Validate a document  
bun run cli validate examples/agent-simple.xml

# Execute a document
bun run cli execute examples/executable-demo.xml

# Run agent CLI
bun run agent examples/demo-agent.xml
```

## API Reference

### Core Functions

- `parseXML(xml: string)` - Parse Idyllic XML to AST
- `validateDocument(document, context?)` - Validate document structure
- `createFunctionRegistry(functions)` - Create a function registry
- `defineFunction(config)` - Define a function with schema and executor

### Agent System API

- `Agent` - AI agent with function execution and memory
- `ActivityMemory` - Memory management for agent interactions
- `getModel(modelId)` - Get AI model instance

### Function Naming API

- `toAzureFunctionName(functionName)` - Convert to Azure-compatible names
- `validateFunctionName(functionName)` - Validate function name format
- `parseFunctionName(functionName)` - Parse module and function parts

## Examples

Explore our comprehensive examples:

### Basic Examples

- `document-simple.xml` - Basic document structure
- `executable-demo.xml` - Document with function calls
- `agent-simple.xml` - Simple agent definition
- `demo-agent.xml` - Agent with custom functions

### Advanced Examples

- `instrumentation-demo.ts` - Execution hooks and timing
- `custom-function-instrumentation-demo.ts` - Multi-level context building
- `recursion-test.ts` - Understanding linear execution model
- `function-execution-demo.ts` - Direct function execution

Run any TypeScript example:

```bash
bun run examples/instrumentation-demo.ts
```

## Development

```bash
# Install dependencies
bun install

# Build the package
bun run build

# Run type checking
bun run typecheck

# Run tests
bun run test

# Start agent CLI
bun run agent
```

## Documentation

- [Manifesto](./MANIFESTO.md) - Our philosophy and vision for AI programming
- [Document Execution Specification](./DOCUMENT_EXECUTION_SPEC.md) - Complete execution model
- [Agent System](./agent/README.md) - Agent architecture details

## The Vision: Community-Driven Intelligence Construction

Imagine a world where complex AI capabilities emerge from a community-contributed registry of context-building functions:

```text
community-functions/
├── analysis/
│   ├── code-understanding    # Analyze codebases through context
│   ├── sentiment-evolution   # Track sentiment across context
│   └── causal-extraction    # Extract cause-effect relationships
├── synthesis/
│   ├── cross-domain-insights # Connect ideas across domains
│   ├── analogy-discovery    # Find patterns in different contexts
│   └── thesis-construction  # Build arguments from evidence
└── specialized/
    ├── legal-precedent-analysis
    ├── medical-differential-diagnosis
    └── architecture-migration-planning
```

The key insight: **You're not building agents - you're constructing intelligence** by giving AI composable context-building blocks.

Traditional approach to complex task: Breaks. Too brittle. Too many edge cases.

Idyllic approach: AI naturally composes functions to build understanding:

- Each function adds context
- AI determines relevance and relationships
- Complex intelligence emerges from simple primitives
- No fragile control flow needed

This is the future we're building towards.

## Community

- **Website**: [idyllic.so](https://idyllic.so) - SaaS version of the engine
- **Blog**: [idyllic.so/blog](https://idyllic.so/blog)
- **Discord**: [Join our community](https://discord.gg/idyllic-labs)
- **Twitter**: [@idylliclabs](https://twitter.com/idylliclabs)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```text
Copyright 2024 Idyllic Labs

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Acknowledgments

- Built with [Bun](https://bun.sh) for blazing fast development
- Inspired by the pioneers of homoiconic languages (Lisp, Mathematica)
- Special thanks to the AI/ML community for pushing the boundaries of what's possible

### Inspirations

- **[Wordware](https://www.wordware.ai/)** - For demonstrating the power of context and documents as programming substrate
- **[Notion](https://www.notion.so/)** - Pioneered block-based documents that inspired our execution model
- **[BlockNote](https://www.blocknotejs.org/)** - Our grammar structure is based on their schema design
- **[Paul Graham](http://www.paulgraham.com/)** - For his foundational work on Lisp and homoiconicity
- **[LangChain](https://www.langchain.com/)** - Demonstrated the importance of composability in AI systems
- **[Claude Code](https://claude.ai/code)** - Our collaborative AI partner in designing this language

## Citation

If you use Idyll Engine in your research, please cite:

```bibtex
@software{idyll-engine,
  author = {Idyllic Labs},
  title = {Idyll Engine: A Context-Building Execution Engine for AI-Native Programming},
  year = {2024},
  url = {https://github.com/idyllic-labs/idyll-engine},
  note = {Available at: \url{https://idyllic.so}}
}
```
