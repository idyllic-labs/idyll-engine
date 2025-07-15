# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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