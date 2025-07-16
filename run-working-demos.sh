#!/bin/bash

# Run working demos for idyll-engine
# This script executes only the demos that don't require external API configuration

set -e  # Exit on error

echo "=========================================="
echo "Running Working Idyll Engine Demos"
echo "=========================================="
echo ""

# TypeScript Demos that work without external APIs
echo "1. Running TypeScript Demos"
echo "------------------------------------------"

echo "→ Running standalone execution demo..."
bun run src/examples/standalone-execution-demo.ts
echo ""

echo "→ Running function execution demo..."
bun run src/examples/function-execution-demo.ts
echo ""

echo "→ Running instrumentation demo..."
bun run src/examples/instrumentation-demo.ts
echo ""

echo "→ Running custom function instrumentation demo..."
bun run src/examples/custom-function-instrumentation-demo.ts
echo ""

echo "→ Running recursion test..."
bun run src/examples/recursion-test.ts
echo ""

# Skip agent-with-model.ts as it requires API configuration

# XML Document Demos via CLI
echo "2. Running XML Document Demos"
echo "------------------------------------------"

echo "→ Parsing simple document..."
bun run cli parse src/examples/document-simple.xml || echo "Parse demo encountered an issue"
echo ""

echo "→ Validating simple agent..."
bun run cli validate src/examples/agent-simple.xml || echo "Validate demo encountered an issue"
echo ""

# Skip execute and agent commands as they may require more setup

echo "=========================================="
echo "Working demos completed!"
echo "=========================================="
echo ""
echo "Note: Some demos were skipped because they require:"
echo "- AI model API configuration (agent-with-model.ts)"
echo "- Proper XML schema setup (some CLI commands)"
echo ""