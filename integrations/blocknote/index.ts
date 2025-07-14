/**
 * BlockNote Integration for Idyllic Engine
 * 
 * This module provides bidirectional conversion between BlockNote editor format
 * and Idyllic AST. It's kept separate to maintain the core engine's independence
 * from any specific editor implementation.
 * 
 * @module integrations/blocknote
 */

export { 
  blockNoteToIdyllic, 
  idyllicToBlockNote, 
  testIsomorphism 
} from './converter';

export type { 
  BlockNoteBlock, 
  BlockNoteContent, 
  BlockNoteTableContent 
} from './converter';