#!/bin/bash

# Run all demos for idyll-engine
# This script executes all demo files to showcase the various features

set -e  # Exit on error

echo "=========================================="
echo "Running Idyll Engine Demos"
echo "=========================================="
echo ""

# TypeScript Demos
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

echo "→ Running agent with model demo..."
bun run src/examples/agent-with-model.ts
echo ""

# XML Document Demos via CLI
echo "2. Running XML Document Demos"
echo "------------------------------------------"

echo "→ Parsing simple document..."
bun run cli parse src/examples/document-simple.xml
echo ""

echo "→ Validating simple agent..."
bun run cli validate src/examples/agent-simple.xml
echo ""

echo "→ Executing demo document..."
bun run cli execute src/examples/executable-demo.xml
echo ""

echo "→ Running demo agent..."
bun run cli agent src/examples/demo-agent.xml
echo ""

echo "=========================================="
echo "All demos completed successfully!"
echo "=========================================="