#!/usr/bin/env bun
/**
 * Idyll Engine CLI
 * 
 * Commands:
 * - parse <file>: Parse and validate an XML document
 * - execute <file>: Execute an XML document (with mock tools)
 * - validate <file>: Validate document structure
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { parseXmlToAst, serializeAstToXml, validateDocument } from '../index';
import type { FunctionResolver, FunctionImpl, FunctionResult, ValidationContext, DocumentExecutionContext } from '../types';

// Mock function resolver for testing
const mockFunctionResolver: FunctionResolver = {
  resolve(name: string) {
    const mockFunctions = ['test:echo', 'test:fail', 'test:delay'];
    if (!mockFunctions.includes(name)) return null;
    
    return {
      name,
      title: `Mock ${name}`,
      description: `Mock function for testing`,
      contentRequirement: 'optional',
      validate: () => ({ success: true }),
    };
  },
  list() {
    return ['test:echo', 'test:fail', 'test:delay'];
  }
};

// Mock function executor for testing
const mockFunctionExecutor: FunctionImpl = {
  async execute(functionName: string, params: Record<string, unknown>, context: any) {
    console.log(chalk.blue(`Executing function: ${functionName}`));
    console.log(chalk.gray('Parameters:'), params);
    
    switch (functionName) {
      case 'test:echo':
        return {
          success: true,
          data: { message: params.message || context.instructions || 'No message' },
          message: 'Echo successful'
        };
      
      case 'test:fail':
        return {
          success: false,
          error: {
            code: 'TEST_ERROR',
            message: 'This function always fails for testing',
            details: params
          }
        };
      
      case 'test:delay':
        const delay = Number(params.delay) || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return {
          success: true,
          data: { delayed: delay },
          message: `Delayed for ${delay}ms`
        };
      
      default:
        return {
          success: false,
          error: {
            code: 'UNKNOWN_TOOL',
            message: `Unknown function: ${functionName}`
          }
        };
    }
  }
};

// Mock validation context
const mockValidationContext: ValidationContext = {
  validateFunction(functionName: string) {
    return mockFunctionResolver.resolve(functionName) !== null;
  },
  validateMention() {
    return true; // Accept all mentions for testing
  },
  validateVariable() {
    return { valid: true, value: 'mock-value' };
  }
};

async function parseCommand(filePath: string) {
  try {
    const content = readFileSync(resolve(filePath), 'utf-8');
    console.log(chalk.blue('Parsing document...'));
    
    const document = parseXmlToAst(content);
    console.log(chalk.green('✓ Document parsed successfully'));
    
    // Detect and display document type
    if ('type' in document) {
      if (document.type === 'agent') {
        console.log(chalk.cyan('📤 Agent Document'));
        console.log(chalk.gray(`  Name: ${document.name || 'Unnamed'}`));
        console.log(chalk.gray(`  Model: ${document.model || 'Default'}`));
      } else if (document.type === 'diff') {
        console.log(chalk.yellow('📝 Diff Document'));
        console.log(chalk.gray(`  Target: ${document.targetDocument || 'Any'}`));
        console.log(chalk.gray(`  Operations: ${document.operations.length}`));
      }
    } else {
      console.log(chalk.green('📄 Regular Document'));
      console.log(chalk.gray(`  Nodes: ${document.nodes.length}`));
    }
    
    console.log(chalk.blue('\nDocument Structure:'));
    console.log(JSON.stringify(document, null, 2));
    
    console.log(chalk.blue('\nSerializing back to XML:'));
    const xml = serializeAstToXml(document);
    console.log(xml);
    
  } catch (error) {
    console.error(chalk.red('Parse error:'), error);
    process.exit(1);
  }
}

async function validateCommand(filePath: string) {
  try {
    const content = readFileSync(resolve(filePath), 'utf-8');
    console.log(chalk.blue('Validating document...'));
    
    const parsed = parseXmlToAst(content);
    
    // Only validate regular documents and agent documents
    if ('type' in parsed && parsed.type === 'diff') {
      console.log(chalk.yellow('⚠️  Diff documents contain operations, not content to validate'));
      console.log(chalk.gray(`  Operations: ${parsed.operations.length}`));
      return;
    }
    
    const document = parsed as any; // IdyllDocument or AgentDocument
    const result = await validateDocument(document, mockValidationContext);
    
    if (result.valid) {
      console.log(chalk.green('✓ Document is valid'));
    } else {
      console.log(chalk.red('✗ Document validation failed'));
      console.log(chalk.red('Errors:'));
      result.errors.forEach(error => {
        console.log(chalk.red(`  - ${error.message} (${error.path})`));
      });
    }
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`  - ${warning.message} (${warning.path})`));
      });
    }
    
  } catch (error) {
    console.error(chalk.red('Validation error:'), error);
    process.exit(1);
  }
}

async function executeCommand(filePath: string) {
  try {
    const content = readFileSync(resolve(filePath), 'utf-8');
    console.log(chalk.blue('Executing document...'));
    
    const parsed = parseXmlToAst(content);
    
    // Only execute regular documents and agent documents
    if ('type' in parsed && parsed.type === 'diff') {
      console.log(chalk.yellow('⚠️  Diff documents contain operations to apply, not content to execute'));
      console.log(chalk.gray('  Use a diff processor to apply these operations to a target document'));
      return;
    }
    
    const document = parsed as any; // IdyllDocument or AgentDocument
    
    // Validate first
    const validationResult = await validateDocument(document, mockValidationContext);
    if (!validationResult.valid) {
      console.log(chalk.red('Cannot execute - document is invalid'));
      validationResult.errors.forEach(error => {
        console.log(chalk.red(`  - ${error.message} (${error.path})`));
      });
      process.exit(1);
    }
    
    // Create execution context
    const context: DocumentExecutionContext = {
      documentId: 'test-doc',
      canEdit: true,
      user: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com'
      },
      variables: {
        testVar: 'test value',
        timestamp: new Date().toISOString()
      }
    };
    
    // Execute - OLD API, needs updating
    console.log(chalk.yellow('\n⚠️  Execute command uses old API and needs updating'));
    console.log(chalk.gray('   Use the DocumentExecutor class instead'));
    return;
    
    /*
    const result = await executeDocument(document, context, {
      functionResolver: mockFunctionResolver,
      functionExecutor: mockFunctionExecutor,
    });
    
    console.log(chalk.blue('\nExecution Summary:'));
    console.log(chalk.gray(`  Total blocks: ${result.summary.totalBlocks}`));
    console.log(chalk.gray(`  Executed blocks: ${result.summary.executedBlocks}`));
    console.log(chalk.green(`  Successful: ${result.summary.successfulBlocks}`));
    if (result.summary.failedBlocks > 0) {
      console.log(chalk.red(`  Failed: ${result.summary.failedBlocks}`));
    }
    
    if (result.summary.errors.length > 0) {
      console.log(chalk.red('\nErrors:'));
      result.summary.errors.forEach(({ blockId, error }: any) => {
        console.log(chalk.red(`  Block ${blockId}: ${error.message}`));
      });
    }
    
    console.log(chalk.blue('\nUpdated document:'));
    const xml = serializeAstToXml(result.document);
    */
    // console.log(xml);
    
  } catch (error) {
    console.error(chalk.red('Execution error:'), error);
    process.exit(1);
  }
}

// Main CLI
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(chalk.blue('Idyll Engine CLI'));
    console.log('\nUsage:');
    console.log('  idyll-cli parse <file>    - Parse and display document structure');
    console.log('  idyll-cli validate <file> - Validate document');
    console.log('  idyll-cli execute <file>  - Execute document with mock tools');
    console.log('\nMock tools available:');
    console.log('  test:echo   - Echoes back the message');
    console.log('  test:fail   - Always fails (for testing)');
    console.log('  test:delay  - Delays execution');
    process.exit(1);
  }
  
  const [command, filePath] = args;
  
  switch (command) {
    case 'parse':
      await parseCommand(filePath);
      break;
    
    case 'validate':
      await validateCommand(filePath);
      break;
    
    case 'execute':
      await executeCommand(filePath);
      break;
    
    default:
      console.error(chalk.red(`Unknown command: ${command}`));
      process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});