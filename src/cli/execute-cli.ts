#!/usr/bin/env bun

import { parseArgs } from 'util';
import { readFileSync, writeFileSync } from 'fs';
import { parseXmlToAst, serializeAstToXml } from '../grammar/parser';
import type { IdyllDocument, AgentDocument, DiffDocument } from '../document/ast';
import { DocumentExecutor } from '../document/executor';
import { createDemoTools } from './demo-tools';
import pc from 'picocolors';

const COMMANDS = ['parse', 'validate', 'execute'] as const;
type Command = typeof COMMANDS[number];

function showHelp(): void {
  console.log(pc.cyan('Idyll Engine CLI'));
  console.log('\nUsage: idyll-cli <command> <file>');
  console.log('\nCommands:');
  console.log('  parse <file>       Parse and display an Idyllic XML document');
  console.log('  validate <file>    Validate an Idyllic XML document');
  console.log('  execute <file>     Execute function calls in a document');
  console.log('\nOptions:');
  console.log('  --help, -h         Show this help message');
  console.log('  --block-id <id>    Execute only a specific block (with execute command)');
  console.log('  --save-results     Save execution results back to document (with execute command)');
}

// Parse arguments
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: {
      type: 'boolean',
      short: 'h',
    },
    'block-id': {
      type: 'string',
    },
    'save-results': {
      type: 'boolean',
    },
  },
  allowPositionals: true,
});

// Show help if requested
if (values.help || positionals.length === 0) {
  showHelp();
  process.exit(0);
}

// Validate command
const [command, filePath] = positionals;
if (!command || !COMMANDS.includes(command as Command)) {
  console.error(pc.red('Error: Invalid command'));
  showHelp();
  process.exit(1);
}

if (!filePath) {
  console.error(pc.red('Error: File path required'));
  showHelp();
  process.exit(1);
}

// Execute command
try {
  switch (command as Command) {
    case 'parse':
      parseDocument(filePath);
      break;
      
    case 'validate':
      validateDocument(filePath);
      break;
      
    case 'execute':
      await executeDocument(filePath, {
        blockId: values['block-id'] as string | undefined,
        saveResults: values['save-results'] === true,
      });
      break;
  }
} catch (error) {
  console.error(pc.red('Error:'), error instanceof Error ? error.message : String(error));
  process.exit(1);
}

/**
 * Parse and display a document
 */
function parseDocument(filePath: string): void {
  console.log(pc.cyan('Parsing document...'));
  
  const content = readFileSync(filePath, 'utf-8');
  const document = parseXmlToAst(content);
  
  console.log(pc.green('✓ Document parsed successfully'));
  
  // Display document info
  if ('type' in document) {
    switch (document.type) {
      case 'agent':
        console.log(pc.yellow('🤖 Agent Document'));
        if (document.name) console.log(`  Name: ${document.name}`);
        if (document.model) console.log(`  Model: ${document.model}`);
        break;
      case 'diff':
        console.log(pc.yellow('📝 Diff Document'));
        console.log(`  Operations: ${document.operations.length}`);
        break;
      default:
        console.log(pc.blue('📄 Regular Document'));
        if ('blocks' in document) {
          console.log(`  Nodes: ${(document as IdyllDocument).nodes.length}`);
        }
    }
  }
  
  console.log('\nDocument Structure:');
  console.log(JSON.stringify(document, null, 2));
  
  console.log('\nSerializing back to XML:');
  console.log(serializeAstToXml(document));
}

/**
 * Validate a document
 */
function validateDocument(filePath: string): void {
  console.log(pc.cyan('Validating document...'));
  
  const content = readFileSync(filePath, 'utf-8');
  
  try {
    parseXmlToAst(content);
    console.log(pc.green('✓ Document is valid'));
  } catch (error) {
    console.log(pc.red('✗ Document is invalid'));
    if (error instanceof Error) {
      console.log(pc.red('  Error:'), error.message);
    }
    process.exit(1);
  }
}

/**
 * Execute a document or specific block
 */
async function executeDocument(
  filePath: string, 
  options: { blockId?: string; saveResults?: boolean }
): Promise<void> {
  console.log(pc.cyan('Executing document...'));
  
  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseXmlToAst(content);
  
  // Check if it's a regular document
  if ('type' in parsed && parsed.type === 'diff') {
    console.error(pc.red('Error: Only regular documents can be executed'));
    process.exit(1);
  }
  
  const document = parsed as IdyllDocument;
  
  // Create executor with demo tools
  const executor = new DocumentExecutor({
    functions: createDemoTools(),
    onProgress: (blockId, current, total) => {
      console.log(pc.gray(`  [${current}/${total}] Executing block ${blockId}...`));
    },
  });
  
  // Execute
  const request = options.blockId
    ? { mode: 'single' as const, document, nodeId: options.blockId, options: { functions: createDemoTools() } }
    : { mode: 'document' as const, document, options: { functions: createDemoTools() } };
    
  const report = await executor.execute(request);
  
  // Display results
  console.log('\n' + pc.green('Execution Complete'));
  console.log(pc.gray('─'.repeat(50)));
  console.log(`Total duration: ${pc.yellow(report.metadata.totalDuration + 'ms')}`);
  console.log(`Nodes executed: ${pc.yellow(report.metadata.nodesExecuted.toString())}`);
  console.log(`Succeeded: ${pc.green(report.metadata.nodesSucceeded.toString())}`);
  console.log(`Failed: ${pc.red(report.metadata.nodesFailed.toString())}`);
  
  console.log('\n' + pc.cyan('Results:'));
  console.log(pc.gray('─'.repeat(50)));
  
  for (const [nodeId, result] of report.nodes) {
    console.log(`\n${pc.blue('Node:')} ${nodeId}`);
    if (result.success) {
      console.log(`${pc.green('✓ Success')} (${result.duration}ms)`);
      console.log('Result:', JSON.stringify(result.data, null, 2));
    } else {
      console.log(`${pc.red('✗ Failed')} (${result.duration}ms)`);
      console.log('Error:', result.error?.message);
    }
  }
  
  // Save results if requested
  if (options.saveResults && !options.blockId) {
    console.log('\n' + pc.cyan('Saving results...'));
    
    // Apply results to document
    const updatedDocument = applyExecutionResults(document, report);
    const updatedXml = serializeAstToXml(updatedDocument);
    
    // Save to new file
    const outputPath = filePath.replace(/\.xml$/, '-executed.xml');
    writeFileSync(outputPath, updatedXml, 'utf-8');
    console.log(pc.green('✓ Results saved to:'), outputPath);
  }
}

/**
 * Apply execution results back to document
 */
function applyExecutionResults(document: IdyllDocument, report: any): IdyllDocument {
  // Deep clone the document
  const updated = JSON.parse(JSON.stringify(document));
  
  // Apply results to executable blocks
  function applyToBlocks(blocks: any[]): void {
    for (const block of blocks) {
      if ((block.type === 'function_call' || block.type === 'trigger') && report.nodes.has(block.id)) {
        const result = report.nodes.get(block.id);
        if (result.success) {
          block.result = {
            success: true,
            data: result.data,
          };
        } else {
          block.result = {
            success: false,
            error: result.error,
          };
        }
      }
      
      // Recurse into children
      if (block.children) {
        applyToBlocks(block.children);
      }
    }
  }
  
  applyToBlocks(updated.nodes);
  return updated;
}