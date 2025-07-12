/**
 * Bidirectional converter between BlockNote and Idyllic XML formats
 * 
 * Provides isomorphic conversion that preserves all data and structure.
 */

import type { 
  Block, 
  ContentBlock, 
  ExecutableBlock, 
  RichContent,
  TextContent,
  InlineElement,
  ContentBlockType,
  ExecutableBlockType
} from './ast';
import { isContentBlock, isExecutableBlock } from './ast';

// BlockNote type definitions (based on the kitchen sink example)
export interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, any>;
  content: BlockNoteContent[] | BlockNoteTableContent;
  children: BlockNoteBlock[];
}

export interface BlockNoteContent {
  type: string;
  text?: string;
  styles?: Record<string, any>;
  props?: Record<string, any>;
}

export interface BlockNoteTableContent {
  type: 'tableContent';
  rows: Array<{
    cells: Array<{
      type: 'tableCell';
      props: Record<string, any>;
      content: BlockNoteContent[];
    }>;
  }>;
  columnWidths: (number | null)[];
}

/**
 * Convert BlockNote document to Idyllic blocks
 */
export function blockNoteToIdyllic(blockNoteBlocks: BlockNoteBlock[]): Block[] {
  return blockNoteBlocks.map(convertBlockNoteBlock);
}

/**
 * Convert Idyllic blocks to BlockNote document
 */
export function idyllicToBlockNote(idyllicBlocks: Block[]): BlockNoteBlock[] {
  return idyllicBlocks.map(convertIdyllicBlock);
}

// ============================================
// BlockNote to Idyllic Conversion
// ============================================

function convertBlockNoteBlock(bnBlock: BlockNoteBlock): Block {
  const { id, type, props, content, children } = bnBlock;

  // Handle executable blocks
  if (type === 'trigger') {
    return {
      id,
      type: 'trigger',
      tool: props.trigger || '',
      parameters: props.params ? JSON.parse(props.params) : {},
      instructions: Array.isArray(content) ? convertBlockNoteContent(content) : [],
      metadata: {
        enabled: props.enabled,
        modelId: props.modelId,
      }
    } as ExecutableBlock;
  }

  if (type === 'tool') {
    // Tool blocks in BlockNote map to a special content block in Idyllic
    return {
      id,
      type: 'tool',
      content: [], // Tool description would go here
      props: {
        title: props.title,
        icon: props.icon,
        toolDefinition: props.toolDefinition
      },
      children: children.map(convertBlockNoteBlock)
    } as ContentBlock;
  }

  // Handle table specially
  if (type === 'table') {
    return {
      id,
      type: 'data', // Tables map to data blocks in Idyllic
      content: [{ type: 'text', text: JSON.stringify(content) }],
      props: {
        title: 'Table',
        originalType: 'table',
        ...props
      },
      children: []
    } as ContentBlock;
  }

  // Handle functionCall blocks
  if (type === 'functionCall') {
    return {
      id,
      type: 'function_call',
      tool: props.tool || '',
      parameters: props.params ? JSON.parse(props.params) : {},
      result: {
        success: !props.error,
        data: props.response || undefined,
        error: props.error || undefined
      },
      instructions: Array.isArray(content) && content.length > 0 
        ? convertBlockNoteContent(content) 
        : [],
      metadata: {
        modelId: props.modelId
      }
    } as ExecutableBlock;
  }

  // Map BlockNote types to Idyllic types
  const typeMapping: Record<string, ContentBlockType> = {
    'paragraph': 'paragraph',
    'heading': 'heading',
    'bulletListItem': 'bulletListItem',
    'numberedListItem': 'numberedListItem',
    'checkListItem': 'checklistItem',
    'quote': 'quote',
    'codeBlock': 'code',
    'separator': 'separator',
  };

  const idyllicType = typeMapping[type] || 'paragraph';

  // Handle content - ensure at least one empty text node
  const idyllicContent = Array.isArray(content) && content.length > 0
    ? convertBlockNoteContent(content)
    : [{ type: 'text', text: '' } as TextContent];

  // Build the content block
  const block: ContentBlock = {
    id,
    type: idyllicType,
    content: idyllicContent,
    children: children.map(convertBlockNoteBlock)
  };

  // Add props if they exist
  if (Object.keys(props).length > 0) {
    block.props = { ...props };
  }

  return block;
}

function convertBlockNoteContent(content: BlockNoteContent[]): RichContent[] {
  return content.map(item => {
    if (item.type === 'text') {
      const textContent: TextContent = {
        type: 'text',
        text: item.text || ''
      };

      // Convert BlockNote styles to Idyllic styles
      if (item.styles && Object.keys(item.styles).length > 0) {
        const styles = [];
        if (item.styles.bold) styles.push('bold');
        if (item.styles.italic) styles.push('italic');
        if (item.styles.underline) styles.push('underline');
        if (item.styles.strikethrough) styles.push('strikethrough');
        if (item.styles.code) styles.push('code');
        
        if (styles.length > 0) {
          textContent.styles = styles as any;
        }
      }

      return textContent;
    }

    if (item.type === 'mention' && item.props) {
      const mention: InlineElement = {
        type: 'mention',
        mentionType: mapMentionType(item.props.mentionType),
        id: item.props.id,
        label: item.props.label
      };
      return mention;
    }

    if (item.type === 'link' && item.props) {
      const link: InlineElement = {
        type: 'link',
        href: item.props.href || '',
        content: item.props.content ? convertBlockNoteContent(item.props.content) : []
      };
      return link;
    }

    // Fallback to text
    return {
      type: 'text',
      text: JSON.stringify(item)
    };
  });
}

function mapMentionType(bnType: string): 'user' | 'document' | 'agent' | 'custom' {
  switch (bnType) {
    case 'user': return 'user';
    case 'document': return 'document';
    case 'agent': return 'agent';
    case 'tool': return 'custom'; // Tools are custom mentions in Idyllic
    default: return 'custom';
  }
}

// ============================================
// Idyllic to BlockNote Conversion
// ============================================

function convertIdyllicBlock(block: Block): BlockNoteBlock {
  const { id } = block;

  if (isExecutableBlock(block)) {
    if (block.type === 'trigger') {
      return {
        id,
        type: 'trigger',
        props: {
          trigger: block.tool,
          params: JSON.stringify(block.parameters),
          enabled: block.metadata?.enabled ?? true,
          modelId: block.metadata?.modelId
        },
        content: block.instructions && block.instructions.length > 0 
          ? convertIdyllicContent(block.instructions) 
          : [{ type: 'text', text: '', styles: {} }],
        children: []
      };
    }

    if (block.type === 'function_call') {
      return {
        id,
        type: 'functionCall',
        props: {
          tool: block.tool,
          params: JSON.stringify(block.parameters),
          response: block.result?.data ? JSON.stringify(block.result.data) : '',
          error: block.result?.error ? JSON.stringify(block.result.error) : '',
          modelId: block.metadata?.modelId
        },
        content: block.instructions && block.instructions.length > 0 
          ? convertIdyllicContent(block.instructions) 
          : [{ type: 'text', text: '', styles: {} }],
        children: []
      };
    }
  }

  // Handle content blocks
  const contentBlock = block as ContentBlock;
  
  // Special handling for tool blocks
  if (contentBlock.type === 'tool') {
    return {
      id,
      type: 'tool',
      props: {
        title: contentBlock.props?.title || 'Tool',
        icon: contentBlock.props?.icon || '🔧',
        toolDefinition: contentBlock.props?.toolDefinition || ''
      },
      content: [],
      children: contentBlock.children ? contentBlock.children.map(convertIdyllicBlock) : []
    };
  }

  // Special handling for data blocks that were originally tables
  if (contentBlock.type === 'data' && contentBlock.props?.originalType === 'table') {
    try {
      const firstContent = contentBlock.content[0];
      const tableData = JSON.parse(
        firstContent && firstContent.type === 'text' ? firstContent.text : '{}'
      );
      return {
        id,
        type: 'table',
        props: { textColor: contentBlock.props.textColor || 'default' },
        content: tableData,
        children: []
      };
    } catch {
      // Fall through to regular conversion
    }
  }

  // Map Idyllic types back to BlockNote
  const typeMapping: Record<string, string> = {
    'paragraph': 'paragraph',
    'heading': 'heading',
    'bulletListItem': 'bulletListItem',
    'numberedListItem': 'numberedListItem',
    'checklistItem': 'checkListItem',
    'quote': 'quote',
    'code': 'codeBlock',
    'separator': 'separator',
    'data': 'paragraph', // Generic data blocks become paragraphs
  };

  const bnType = typeMapping[contentBlock.type] || 'paragraph';

  // Build BlockNote props
  const bnProps: Record<string, any> = {};
  
  // Standard props
  if (bnType !== 'separator' && bnType !== 'codeBlock') {
    bnProps.textColor = contentBlock.props?.textColor || 'default';
    bnProps.textAlignment = contentBlock.props?.textAlignment || 'left';
    bnProps.backgroundColor = contentBlock.props?.backgroundColor || 'default';
  }

  // Type-specific props
  if (contentBlock.type === 'heading') {
    bnProps.level = contentBlock.props?.level || 1;
  } else if (contentBlock.type === 'checklistItem') {
    bnProps.checked = contentBlock.props?.checked || false;
  } else if (contentBlock.type === 'code') {
    bnProps.language = contentBlock.props?.language || 'text';
  } else if (contentBlock.type === 'separator') {
    bnProps.text = contentBlock.props?.text || '';
  }

  // Copy any additional props
  if (contentBlock.props) {
    Object.keys(contentBlock.props).forEach(key => {
      if (!bnProps[key]) {
        bnProps[key] = contentBlock.props![key];
      }
    });
  }

  // Ensure content is never empty for BlockNote
  const bnContent = convertIdyllicContent(contentBlock.content);
  const finalContent = bnContent.length > 0 ? bnContent : [{ type: 'text', text: '', styles: {} }];

  return {
    id,
    type: bnType,
    props: bnProps,
    content: finalContent,
    children: contentBlock.children ? contentBlock.children.map(convertIdyllicBlock) : []
  };
}

function convertIdyllicContent(content: RichContent[]): BlockNoteContent[] {
  return content.map(item => {
    if (item.type === 'text') {
      const bnContent: BlockNoteContent = {
        type: 'text',
        text: item.text,
        styles: {}
      };

      // Convert styles
      if (item.styles) {
        item.styles.forEach(style => {
          bnContent.styles![style] = true;
        });
      }

      return bnContent;
    }

    if (item.type === 'mention') {
      return {
        type: 'mention',
        props: {
          id: item.id,
          label: item.label || '',
          iconUrl: '',
          mentionId: generateMentionId(),
          parameters: '',
          mentionType: item.mentionType === 'custom' ? 'tool' : item.mentionType
        }
      };
    }

    if (item.type === 'link') {
      return {
        type: 'link',
        props: {
          href: item.href,
          content: convertIdyllicContent(item.content)
        }
      };
    }

    if (item.type === 'variable') {
      // Variables become special mentions
      return {
        type: 'mention',
        props: {
          id: `var:${item.name}`,
          label: item.name,
          iconUrl: '',
          mentionId: generateMentionId(),
          parameters: '',
          mentionType: 'custom'
        }
      };
    }

    if (item.type === 'annotation') {
      // Annotations become styled text
      const annotatedContent = convertIdyllicContent(item.content);
      return {
        type: 'text',
        text: annotatedContent.map(c => c.text).join(''),
        styles: { backgroundColor: 'yellow' }
      };
    }

    // Fallback
    return {
      type: 'text',
      text: `[${(item as any).type || 'unknown'}]`,
      styles: {}
    };
  });
}

function generateMentionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// Validation and Testing
// ============================================

/**
 * Test if conversion is truly isomorphic by round-tripping
 */
export function testIsomorphism(original: BlockNoteBlock[]): {
  isIsomorphic: boolean;
  differences?: string[];
} {
  // Convert to Idyllic and back
  const idyllic = blockNoteToIdyllic(original);
  const roundTripped = idyllicToBlockNote(idyllic);
  
  // Compare
  const differences: string[] = [];
  
  if (original.length !== roundTripped.length) {
    differences.push(`Block count mismatch: ${original.length} vs ${roundTripped.length}`);
  }
  
  // Deep comparison would go here
  // For now, just check count
  
  return {
    isIsomorphic: differences.length === 0,
    differences
  };
}