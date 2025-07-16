# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.3.1] - 2025-01-16

### Fixed
- **CRITICAL**: Downgraded Zod from 3.25.67 to 3.24.1 for compatibility and stability
- Updated agent to use proper AI SDK v4 `tool()` function instead of object format
- Fixed function execution and instrumentation logging in agent system
- Improved error handling and debug output throughout agent execution

### Added
- Comprehensive test coverage for agent functionality
- Demo runner scripts (`run-all-demos.sh` and `run-working-demos.sh`) for showcasing features
- Enhanced agent function registry integration with proper schema validation

### Changed
- Agent tools now properly use AI SDK v4 tool creation pattern
- Improved function execution context and result processing

## [4.3.0] - 2025-01-16

### ⚠️ DEPRECATED
**This version contains critical compatibility issues with Zod 3.25.67. Please upgrade to 4.3.1 immediately.**

### Changed
- Upgraded Zod to 3.25.67 (caused compatibility issues)

## [4.2.1] - 2025-01-16

### ⚠️ DEPRECATED
**This version may contain Zod compatibility issues. Please upgrade to 4.3.1 for stability.**

### Fixed
- Improved GitHub Actions workflows for automated publishing and tagging

## [4.2.0] - 2025-01-16

### ⚠️ DEPRECATED
**This version contains Zod compatibility issues. Please upgrade to 4.3.1 for stability.**

### Added
- Comprehensive Zod validation system integrated into XML parsing pipeline
- Runtime validation for all AST types, edit operations, and document structures
- Zod schemas for IdyllDocument, AgentDocument, DiffDocument, and all node types
- Safe validation functions with detailed error reporting

### Changed
- **BREAKING**: Reorganized entire codebase to use `src/` directory structure
- Moved grammar system from `document/grammars/` to `grammar/` with improved organization
- Moved Zod validation from `document/validation.ts` to `grammar/validation.ts`
- Updated TypeScript configuration for `src/` structure (`rootDir`, `include` paths)
- Updated build configuration (tsup) and package.json scripts for new structure
- Parser now validates documents with Zod after XML parsing
- All import paths updated to work with new `src/` organization

### Fixed
- TypeScript compilation errors in example files
- ZodError property access (`error.errors` → `error.issues`)
- Type assertions for function node property access in examples
- Build process now completes without TypeScript errors

### Removed
- Legacy grammar wrapper files and duplicate validation code
- Old validation files from `document/` directory after reorganization

## [4.1.0] - 2024-01-15

### Added
- Open sourced under Apache 2.0 License
- Comprehensive documentation including philosophy and manifesto
- Centralized execution hooks in AbstractFunctionExecutor base class
- Instrumentation examples showing function timing
- Augmented strings documentation with mentions and annotations
- Context combinators for intelligence construction
- GitHub Actions workflows for CI/CD and npm publishing

### Changed
- Renamed FunctionExecutor type to FunctionImpl throughout codebase
- Renamed CustomFunctionExecutor to AgentCustomFunctionExecutor
- Updated README with professional open source documentation
- Improved grammar documentation with EBNF notation

### Removed
- All BlockNote-related examples (engine-only focus)
- GitHub Packages registry configuration (now publishes to npm)

## [4.0.0] - 2024-01-14

### Changed
- Complete refactor from "tools" to "functions" terminology
- Breaking API changes for consistency

## [3.1.0] - 2024-01-13

### Added
- Unified content field
- Auto-trimming functionality
- Cleaner XML serialization

## [3.0.0] - 2024-01-12

### Changed
- Removed all backward compatibility
- Clean API implementation

### Fixed
- Build errors from missing type imports