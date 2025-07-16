/**
 * Grammar System - Main Export
 * 
 * Provides a clean, organized interface to the grammar system.
 * Maintains backward compatibility while providing improved organization.
 */

// Core DSL and compiler
export * from './core';

// Grammar schemas
export * from './schemas';

// Zod validation
export * from './validation';

// Backward compatibility - re-export everything as it was before
export { GRAMMAR } from './schemas';