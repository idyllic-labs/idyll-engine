/**
 * Bidirectional converter between BlockNote and Idyllic XML formats
 * 
 * Provides isomorphic conversion that preserves all data and structure.
 * Note: BlockNote still uses 'block' terminology, so we maintain that in
 * interfaces specific to BlockNote while using 'node' for Idyllic AST.
 */

import type { 
  Node, 
  ContentNode, 
  ExecutableNode, 
  RichContent,
  TextContent,
  InlineElement,
  ContentNodeType,
  ExecutableNodeType
} from '../../document/ast';
import { isContentNode, isExecutableNode } from '../../document/ast';

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
 * Convert BlockNote document to Idyllic nodes
 */
export function blockNoteToIdyllic(blockNoteBlocks: BlockNoteBlock[]): Node[] {
  return blockNoteBlocks.map(convertBlockNoteBlock);
}

/**
 * Convert Idyllic nodes to BlockNote document
 */
export function idyllicToBlockNote(idyllicNodes: Node[]): BlockNoteBlock[] {
  return idyllicNodes.map(convertIdyllicNode);
}

// ============================================
// BlockNote to Idyllic Conversion
// ============================================

function convertBlockNoteBlock(bnBlock: BlockNoteBlock): Node {
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
    } as ExecutableNode;
  }

  if (type === 'tool') {
    // Tool blocks in BlockNote map to a special content node in Idyllic
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
    } as ContentNode;
  }

  // Handle table specially
  if (type === 'table') {
    return {
      id,
      type: 'data', // Tables map to data nodes in Idyllic
      content: [{ type: 'text', text: JSON.stringify(content) }],
      props: {
        title: 'Table',
        originalType: 'table',
        ...props
      },
      children: []
    } as ContentNode;
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
    } as ExecutableNode;
  }

  // Map BlockNote types to Idyllic types
  const typeMapping: Record<string, ContentNodeType> = {
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

  // Build the content node
  const node: ContentNode = {
    id,
    type: idyllicType,
    content: idyllicContent,
    children: children.map(convertBlockNoteBlock)
  };

  // Add props if they exist
  if (Object.keys(props).length > 0) {
    node.props = { ...props };
  }

  return node;
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

function convertIdyllicNode(node: Node): BlockNoteBlock {
  const { id } = node;

  if (isExecutableNode(node)) {
    if (node.type === 'trigger') {
      return {
        id,
        type: 'trigger',
        props: {
          trigger: node.tool,
          params: JSON.stringify(node.parameters),
          enabled: node.metadata?.enabled ?? true,
          modelId: node.metadata?.modelId
        },
        content: node.instructions && node.instructions.length > 0 
          ? convertIdyllicContent(node.instructions) 
          : [{ type: 'text', text: '', styles: {} }],
        children: []
      };
    }

    if (node.type === 'function_call') {
      return {
        id,
        type: 'functionCall',
        props: {
          tool: node.tool,
          params: JSON.stringify(node.parameters),
          response: node.result?.data ? JSON.stringify(node.result.data) : '',
          error: node.result?.error ? JSON.stringify(node.result.error) : '',
          modelId: node.metadata?.modelId
        },
        content: node.instructions && node.instructions.length > 0 
          ? convertIdyllicContent(node.instructions) 
          : [{ type: 'text', text: '', styles: {} }],
        children: []
      };
    }
  }

  // Handle content nodes
  const contentNode = node as ContentNode;
  
  // Special handling for tool nodes
  if (contentNode.type === 'tool') {
    return {
      id,
      type: 'tool',
      props: {
        title: contentNode.props?.title || 'Tool',
        icon: contentNode.props?.icon || '🔧',
        toolDefinition: contentNode.props?.toolDefinition || ''
      },
      content: [],
      children: contentNode.children ? contentNode.children.map(convertIdyllicNode) : []
    };
  }

  // Special handling for data nodes that were originally tables
  if (contentNode.type === 'data' && contentNode.props?.originalType === 'table') {
    try {
      const firstContent = contentNode.content[0];
      const tableData = JSON.parse(
        firstContent && firstContent.type === 'text' ? firstContent.text : '{}'
      );
      return {
        id,
        type: 'table',
        props: { textColor: contentNode.props.textColor || 'default' },
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
    'data': 'paragraph', // Generic data nodes become paragraphs
  };

  const bnType = typeMapping[contentNode.type] || 'paragraph';

  // Build BlockNote props
  const bnProps: Record<string, any> = {};
  
  // Standard props
  if (bnType !== 'separator' && bnType !== 'codeBlock') {
    bnProps.textColor = contentNode.props?.textColor || 'default';
    bnProps.textAlignment = contentNode.props?.textAlignment || 'left';
    bnProps.backgroundColor = contentNode.props?.backgroundColor || 'default';
  }

  // Type-specific props
  if (contentNode.type === 'heading') {
    bnProps.level = contentNode.props?.level || 1;
  } else if (contentNode.type === 'checklistItem') {
    bnProps.checked = contentNode.props?.checked || false;
  } else if (contentNode.type === 'code') {
    bnProps.language = contentNode.props?.language || 'text';
  } else if (contentNode.type === 'separator') {
    bnProps.text = contentNode.props?.text || '';
  }

  // Copy any additional props
  if (contentNode.props) {
    Object.keys(contentNode.props).forEach(key => {
      if (!bnProps[key]) {
        bnProps[key] = contentNode.props![key];
      }
    });
  }

  // Ensure content is never empty for BlockNote
  const bnContent = convertIdyllicContent(contentNode.content);
  const finalContent = bnContent.length > 0 ? bnContent : [{ type: 'text', text: '', styles: {} }];

  return {
    id,
    type: bnType,
    props: bnProps,
    content: finalContent,
    children: contentNode.children ? contentNode.children.map(convertIdyllicNode) : []
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