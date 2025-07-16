# Logging Configuration

The idyll-engine provides a configurable logging system that allows you to control the verbosity and format of log messages. This is particularly useful for production environments where you want to reduce noise or for debugging where you need detailed information.

## Quick Start

By default, the engine uses `LogLevel.WARN` which means only warnings and errors are logged. This keeps the output clean for production use.

```typescript
import { Agent, LogLevel } from '@idyllic-labs/idyll-engine';

// Create an agent with custom logging
const agent = new Agent({
  program: agentDoc,
  model,
  functions,
  logging: {
    level: LogLevel.DEBUG, // Show all logs
    enableColors: true,
    includeTimestamp: true,
  },
});
```

## Log Levels

The logging system supports the following levels:

- `LogLevel.DEBUG` (0) - Detailed debugging information
- `LogLevel.INFO` (1) - General information
- `LogLevel.WARN` (2) - Warning messages (default)
- `LogLevel.ERROR` (3) - Error messages only
- `LogLevel.SILENT` (4) - No logging

## Configuration Options

```typescript
interface LoggerConfig {
  level: LogLevel;           // Minimum log level to display
  enableColors: boolean;     // Use colored output (default: true)
  includeTimestamp: boolean; // Include timestamps (default: false)
  prefix?: string;          // Custom prefix for log messages
}
```

## Usage Examples

### Silent Mode (Production)

```typescript
const agent = new Agent({
  program: agentDoc,
  model,
  functions,
  logging: {
    level: LogLevel.SILENT, // No logs at all
  },
});
```

### Debug Mode (Development)

```typescript
const agent = new Agent({
  program: agentDoc,
  model,
  functions,
  logging: {
    level: LogLevel.DEBUG,
    enableColors: true,
    includeTimestamp: true,
  },
});
```

### Custom Logger

You can also create your own logger instance:

```typescript
import { createLogger, LogLevel } from '@idyllic-labs/idyll-engine';

const logger = createLogger('MyComponent', LogLevel.INFO);
logger.info('This is an info message');
logger.warn('This is a warning');
logger.error('This is an error');
```

## Migration from Console Logs

If you're upgrading from a previous version that used console.log, the new logging system is backward compatible. However, console logs from the library are now controlled by the logging configuration:

**Before (always logged):**
```
[Agent] Initializing tools, agent program has nodes: 3
[Agent] Custom tools extracted: custom:search, custom:format
```

**After (only logged at DEBUG level):**
```
DEBUG: Initializing tools, agent program has nodes: 3
DEBUG: Custom tools extracted: custom:search, custom:format
```

## Environment Variables

You can also set the default log level using environment variables:

```bash
# Set to DEBUG for development
IDYLL_LOG_LEVEL=DEBUG

# Set to SILENT for production
IDYLL_LOG_LEVEL=SILENT
```

## Best Practices

1. **Production**: Use `LogLevel.WARN` or `LogLevel.ERROR` to keep output clean
2. **Development**: Use `LogLevel.DEBUG` to see detailed execution information
3. **CI/CD**: Use `LogLevel.SILENT` to avoid cluttering build logs
4. **Testing**: Use `LogLevel.ERROR` to only see actual failures

## Common Patterns

### Conditional Logging

```typescript
// Only enable debug logging in development
const agent = new Agent({
  program: agentDoc,
  model,
  functions,
  logging: {
    level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
  },
});
```

### Library Usage

If you're using idyll-engine in a library, respect your users' logging preferences:

```typescript
// Allow users to configure logging
export function createMyAgent(config: { logging?: LoggerConfig }) {
  return new Agent({
    program: agentDoc,
    model,
    functions,
    logging: config.logging || { level: LogLevel.WARN }, // Default to quiet
  });
}
```