/**
 * Grammar-based XML parser for Idyllic documents
 *
 * This parser uses the grammar as the single source of truth
 * for parsing, validation, and AST construction
 */

import * as xml2js from "xml-js";
import { v4 as uuidv4 } from "uuid";
import {
  IdyllDocument,
  AgentDocument,
  DiffDocument,
  EditOperation,
  Node,
  Block,
  ContentNode,
  ContentBlock,
  ExecutableNode,
  ExecutableBlock,
  RichContent,
  TextContent,
  TextStyle,
  MentionElement,
  VariableElement,
  LinkElement,
  AnnotationElement,
  ContentBlockType,
  isExecutableNode,
  isTextContent,
} from "./ast";
import { ParseError } from "../types";
import { GRAMMAR } from "./grammar";
import { GrammarCompiler } from "./grammar-compiler";

// Initialize grammar compiler
const compiler = new GrammarCompiler(GRAMMAR);
const compiled = compiler.compile();

// ============================================
// XML to AST Parsing
// ============================================

/**
 * Parse XML string into AST - determines document type automatically
 */
export function parseXmlToAst(
  xmlString: string
): IdyllDocument | AgentDocument | DiffDocument {
  if (!xmlString || !xmlString.trim()) {
    throw new ParseError("Empty XML content provided");
  }

  // Parse XML
  const options: xml2js.Options.XML2JS = {
    compact: false,
    textKey: "text",
    ignoreDeclaration: true,
    ignoreInstruction: true,
    ignoreComment: true,
    ignoreDoctype: true,
    ignoreText: false,
    trim: false,
    sanitize: false,
    nativeType: false,
  };

  let result: xml2js.Element;
  try {
    result = xml2js.xml2js(xmlString, options) as xml2js.Element;
  } catch (error) {
    throw new ParseError(
      `Invalid XML format: ${
        error instanceof Error ? error.message : "Failed to parse XML"
      }`
    );
  }

  // Determine root type and parse accordingly
  const rootElement = result.elements?.[0];
  if (!rootElement || rootElement.type !== "element") {
    throw new ParseError("No root element found");
  }

  switch (rootElement.name) {
    case "document":
      return parseDocument(rootElement);
    case "agent":
      return parseAgent(rootElement);
    case "diff":
      return parseDiff(rootElement);
    default:
      throw new ParseError(
        `Unknown root element: ${rootElement.name}. Expected: document, agent, or diff`
      );
  }
}

/**
 * Parse document root
 */
function parseDocument(documentElement: xml2js.Element): IdyllDocument {
  // Validate document element
  const attrs = documentElement.attributes || {};
  const validationErrors = compiled.validateAttributes("document", attrs);
  if (validationErrors.length > 0) {
    throw new ParseError(
      `Document validation failed: ${validationErrors[0].message}`
    );
  }

  const documentId = (attrs.id as string) || uuidv4();

  // Parse nodes
  const nodes: Node[] = [];
  const childElements = documentElement.elements || [];

  for (const element of childElements) {
    if (element.type === "element" && element.name) {
      const node = parseNode(element);
      if (node) {
        nodes.push(node);
      }
    }
  }

  return {
    id: documentId,
    nodes: nodes.length > 0 ? nodes : [createEmptyParagraph()],
    metadata: extractMetadata(attrs),
  };
}

/**
 * Parse agent root
 */
function parseAgent(agentElement: xml2js.Element): AgentDocument {
  const attrs = agentElement.attributes || {};
  const validationErrors = compiled.validateAttributes("agent", attrs);
  if (validationErrors.length > 0) {
    throw new ParseError(
      `Agent validation failed: ${validationErrors[0].message}`
    );
  }

  const agentId = (attrs.id as string) || uuidv4();

  // Parse nodes (same as document)
  const nodes: Node[] = [];
  const childElements = agentElement.elements || [];

  for (const element of childElements) {
    if (element.type === "element" && element.name) {
      const node = parseNode(element);
      if (node) {
        nodes.push(node);
      }
    }
  }

  return {
    type: "agent",
    id: agentId,
    name: attrs.name as string,
    description: attrs.description as string,
    model: attrs.model as string,
    nodes,
  };
}

/**
 * Parse diff root
 */
function parseDiff(diffElement: xml2js.Element): DiffDocument {
  const attrs = diffElement.attributes || {};
  const validationErrors = compiled.validateAttributes("diff", attrs);
  if (validationErrors.length > 0) {
    throw new ParseError(
      `Diff validation failed: ${validationErrors[0].message}`
    );
  }

  // Parse edit operations
  const operations: EditOperation[] = [];
  const childElements = diffElement.elements || [];

  for (const element of childElements) {
    if (element.type === "element" && element.name) {
      const operation = parseEditOperation(element);
      if (operation) {
        operations.push(operation);
      }
    }
  }

  return {
    type: "diff",
    targetDocument: attrs.targetDocument as string,
    timestamp: attrs.timestamp
      ? new Date(attrs.timestamp as string)
      : new Date(),
    operations,
  };
}

/**
 * Parse edit operation
 */
function parseEditOperation(element: xml2js.Element): EditOperation | null {
  if (!element.name) return null;

  const attrs = element.attributes || {};

  switch (element.name) {
    case "edit:prop":
      return {
        type: "edit:attr",
        blockId: attrs["block-id"] as string,
        name: attrs.name as string,
        value: attrs.value as string,
      };

    case "edit:content":
      return {
        type: "edit:content",
        blockId: attrs["block-id"] as string,
        content: parseRichContent(element),
      };

    case "insert":
      const insertNodes: Node[] = [];
      for (const child of element.elements || []) {
        if (child.type === "element" && child.name) {
          const node = parseNode(child);
          if (node) {
            insertNodes.push(node);
          }
        }
      }
      return {
        type: "insert",
        afterBlockId: attrs["after-block-id"] as string,
        beforeBlockId: attrs["before-block-id"] as string,
        atStart: attrs["at-start"] === "true",
        atEnd: attrs["at-end"] === "true",
        blocks: insertNodes,
      };

    case "delete":
      return {
        type: "delete",
        blockId: attrs["block-id"] as string,
      };

    case "replace":
      const replaceNodes: Node[] = [];
      for (const child of element.elements || []) {
        if (child.type === "element" && child.name) {
          const node = parseNode(child);
          if (node) {
            replaceNodes.push(node);
          }
        }
      }
      return {
        type: "replace",
        blockId: attrs["block-id"] as string,
        blocks: replaceNodes,
      };

    default:
      console.warn(`Unknown edit operation: ${element.name}`);
      return null;
  }
}

/**
 * Parse a node element using grammar rules
 */
function parseNode(element: xml2js.Element): Node | null {
  if (!element.name) return null;

  const elementType = compiled.elementToType[element.name];
  if (!elementType) {
    return null;
  }

  const id = (element.attributes?.id as string) || uuidv4();
  const attrs = element.attributes || {};

  // Validate attributes
  const errors = compiled.validateAttributes(element.name, attrs);
  if (errors.length > 0) {
    throw new ParseError(
      `Invalid attributes for ${element.name}: ${errors[0].message}`
    );
  }

  // Route based on element type
  switch (elementType) {
    case "function_call":
      return parseFunctionCall(element, id, attrs);
    case "trigger":
      return parseTrigger(element, id, attrs);
    case "tool":
      return parseTool(element, id, attrs);
    default:
      return parseContentNode(element, id, attrs, elementType);
  }
}

/**
 * Parse function call block
 */
function parseFunctionCall(
  element: xml2js.Element,
  id: string,
  attrs: Record<string, unknown>
): ExecutableBlock {
  const tool = attrs["idyll-tool"] as string;

  let parameters: Record<string, unknown> = {};
  let instructions: RichContent[] = [];
  let result: unknown;

  // Parse child elements according to grammar
  for (const child of element.elements || []) {
    if (child.type === "element" && child.name) {
      switch (child.name) {
        case "params":
          const paramsText = extractTextContent(child);
          if (paramsText) {
            try {
              parameters = JSON.parse(paramsText);
            } catch {
              throw new ParseError(`Invalid JSON in params: ${paramsText}`);
            }
          }
          break;

        case "content":
          instructions = parseRichContent(child);
          break;

        case "result":
          const resultText = extractTextContent(child);
          if (resultText) {
            try {
              result = JSON.parse(resultText);
            } catch {
              result = resultText;
            }
          }
          break;
      }
    }
  }

  return {
    id,
    type: "function_call",
    tool,
    parameters,
    instructions: instructions.length > 0 ? instructions : undefined,
    result: result ? { success: true, data: result } : undefined,
    metadata: {
      modelId: attrs.modelId as string,
    },
  };
}

/**
 * Parse trigger block
 */
function parseTrigger(
  element: xml2js.Element,
  id: string,
  attrs: Record<string, unknown>
): ExecutableBlock {
  const tool = attrs["idyll-trigger"] as string;
  const enabled = attrs.enabled !== false;

  let parameters: Record<string, unknown> = {};
  let instructions: RichContent[] = [];

  for (const child of element.elements || []) {
    if (child.type === "element" && child.name) {
      switch (child.name) {
        case "params":
          const paramsText = extractTextContent(child);
          if (paramsText) {
            try {
              parameters = JSON.parse(paramsText);
            } catch {
              throw new ParseError(`Invalid JSON in params: ${paramsText}`);
            }
          }
          break;

        case "content":
          instructions = parseRichContent(child);
          break;
      }
    }
  }

  return {
    id,
    type: "trigger",
    tool,
    parameters,
    instructions: instructions.length > 0 ? instructions : undefined,
    metadata: { enabled },
  };
}

/**
 * Parse tool block
 */
function parseTool(
  element: xml2js.Element,
  id: string,
  attrs: Record<string, unknown>
): ContentBlock {
  // Tools are stored as content blocks with special props
  const title = attrs.title as string;
  const icon = attrs.icon as string;

  let description = "";
  let definition: Block[] = [];

  for (const child of element.elements || []) {
    if (child.type === "element" && child.name) {
      switch (child.name) {
        case "tool:description":
          description = extractTextContent(child);
          break;

        case "tool:definition":
          // Parse blocks within tool definition
          for (const defChild of child.elements || []) {
            if (defChild.type === "element" && defChild.name) {
              // Check that it's not another tool (grammar constraint)
              if (compiled.elementToType[defChild.name] === "tool") {
                throw new ParseError("Tools cannot contain other tools");
              }

              const node = parseNode(defChild);
              if (node) {
                definition.push(node);
              }
            }
          }
          break;
      }
    }
  }

  return {
    id,
    type: "tool" as ContentBlockType,
    content: [{ type: "text", text: description }],
    children: definition.length > 0 ? definition : undefined,
    props: { title, icon },
  };
}

/**
 * Parse content block
 */
function parseContentNode(
  element: xml2js.Element,
  id: string,
  attrs: Record<string, unknown>,
  blockType: string
): ContentBlock {
  const content = parseRichContent(element);

  // Parse children for nested blocks
  const children: Block[] = [];
  for (const child of element.elements || []) {
    if (child.type === "element" && child.name) {
      const childType = compiled.elementToType[child.name];
      if (childType && compiled.blockTypes.has(childType)) {
        const childNode = parseNode(child);
        if (childNode) {
          children.push(childNode);
        }
      }
    }
  }

  // Handle heading level
  if (blockType === "heading") {
    if (element.name === "heading") {
      // Already has level attribute
    } else if (element.name) {
      const match = element.name.match(/^h(\d)$/);
      if (match) {
        attrs.level = parseInt(match[1], 10);
      }
    }
  }

  return {
    id,
    type: blockType as ContentBlockType,
    content,
    children: children.length > 0 ? children : undefined,
    props: attrs,
  };
}

/**
 * Parse rich content using grammar rules
 */
function parseRichContent(element: xml2js.Element): RichContent[] {
  const content: RichContent[] = [];

  if (!element.elements) return content;

  for (const child of element.elements) {
    if (child.type === "text" && child.text) {
      content.push({
        type: "text",
        text: child.text as string,
      });
    } else if (child.type === "element" && child.name) {
      const inlineElement = parseInlineElement(child);
      if (inlineElement) {
        if (Array.isArray(inlineElement)) {
          content.push(...inlineElement);
        } else {
          content.push(inlineElement);
        }
      }
    }
  }

  return content;
}

/**
 * Parse inline element
 */
function parseInlineElement(
  element: xml2js.Element
): RichContent | RichContent[] | null {
  if (!element.name) return null;

  // Check if it's a mention
  if (element.name.startsWith("mention:")) {
    const mentionType = element.name.substring(8) as any;
    const id = element.attributes?.id as string;
    const label =
      (element.attributes?.label as string) || extractTextContent(element);

    return {
      type: "mention",
      mentionType,
      id,
      label,
    } as MentionElement;
  }

  // Check if it's a variable
  if (element.name === "variable") {
    const name = element.attributes?.name as string;
    const prompt = element.attributes?.prompt as string;
    const value = element.attributes?.value as string;
    return {
      type: "variable",
      name,
      ...(prompt && { prompt }),
      ...(value && { value }),
    } as VariableElement;
  }

  // Check if it's a link
  if (element.name === "a") {
    const href = element.attributes?.href as string;
    return {
      type: "link",
      href,
      content: parseRichContent(element),
    } as LinkElement;
  }

  // Check if it's an annotation
  if (element.name === "annotation") {
    return {
      type: "annotation",
      content: parseRichContent(element),
      annotation: (element.attributes as any) || {},
    } as AnnotationElement;
  }

  // Check if it's annotated text
  if (element.name === "annotatedtext") {
    const annotation = element.attributes?.annotation as string;
    return {
      type: "annotation",
      content: parseRichContent(element),
      annotation: { title: annotation },
    } as AnnotationElement;
  }

  // Check if it's AI edit response
  if (element.name === "aieditresponse") {
    const status = element.attributes?.status as string;
    return {
      type: "annotation",
      content: parseRichContent(element),
      annotation: { type: "ai-edit", status },
    } as AnnotationElement;
  }

  // Check if it's a style element
  const styleMap: Record<string, TextStyle> = {
    strong: "bold",
    b: "bold",
    em: "italic",
    i: "italic",
    u: "underline",
    underline: "underline",
    s: "strikethrough",
    strike: "strikethrough",
    del: "strikethrough",
    code: "code",
    tt: "code",
  };

  const style = styleMap[element.name];
  if (style) {
    const innerContent = parseRichContent(element);
    return innerContent.map((item) => {
      if (isTextContent(item)) {
        return {
          ...item,
          styles: [...(item.styles || []), style],
        } as TextContent;
      }
      return item;
    });
  }

  return null;
}

// ============================================
// AST to XML Serialization
// ============================================

/**
 * Serialize AST document to XML string
 */
export function serializeAstToXml(
  document: IdyllDocument | AgentDocument | DiffDocument
): string {
  let root: xml2js.Element;

  if ("type" in document) {
    if (document.type === "agent") {
      root = serializeAgentDocument(document);
    } else if (document.type === "diff") {
      root = serializeDiffDocument(document);
    } else {
      throw new Error(`Unknown document type`);
    }
  } else {
    root = serializeIdyllDocument(document);
  }

  const options: xml2js.Options.JS2XML = {
    compact: false,
    spaces: 2,
    textKey: "text",
  };

  // xml2js expects the root element to be wrapped in an object with elements array
  const wrapped = {
    elements: [root]
  };

  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml2js.js2xml(
    wrapped,
    options
  )}`;
}

/**
 * Serialize IdyllDocument
 */
function serializeIdyllDocument(document: IdyllDocument): xml2js.Element {
  return {
    type: "element",
    name: "document",
    attributes: {
      id: document.id,
      ...serializeMetadata(document.metadata),
    },
    elements: document.nodes.map(serializeNode),
  };
}

/**
 * Serialize AgentDocument
 */
function serializeAgentDocument(document: AgentDocument): xml2js.Element {
  return {
    type: "element",
    name: "agent",
    attributes: {
      id: document.id,
      ...(document.name && { name: document.name }),
      ...(document.description && { description: document.description }),
      ...(document.model && { model: document.model }),
    },
    elements: document.nodes.map(serializeNode),
  };
}

/**
 * Serialize DiffDocument
 */
function serializeDiffDocument(document: DiffDocument): xml2js.Element {
  return {
    type: "element",
    name: "diff",
    attributes: {
      ...(document.targetDocument && {
        targetDocument: document.targetDocument,
      }),
      timestamp: document.timestamp.toISOString(),
    },
    elements: document.operations.map(serializeEditOperation),
  };
}

/**
 * Serialize a block to XML element
 */
function serializeNode(node: Node): xml2js.Element {
  if (isExecutableNode(node)) {
    return serializeExecutableNode(node);
  }

  // Special handling for tool nodes
  if (node.type === "tool") {
    return serializeToolNode(node);
  }

  return serializeContentNode(node);
}

/**
 * Serialize executable block
 */
function serializeExecutableNode(node: ExecutableNode): xml2js.Element {
  const elements: xml2js.Element[] = [];

  // Add params
  if (Object.keys(node.parameters).length > 0) {
    elements.push({
      type: "element",
      name: "params",
      elements: [
        {
          type: "cdata",
          cdata: JSON.stringify(node.parameters),
        },
      ],
    });
  }

  // Add content
  if (node.instructions && node.instructions.length > 0) {
    elements.push({
      type: "element",
      name: "content",
      elements: serializeRichContent(node.instructions),
    });
  }

  if (node.type === "function_call") {
    // Add result
    if (node.result) {
      elements.push({
        type: "element",
        name: "result",
        elements: [
          {
            type: "cdata",
            cdata: JSON.stringify(node.result.data || node.result),
          },
        ],
      });
    }

    return {
      type: "element",
      name: "fncall",
      attributes: {
        id: node.id,
        "idyll-tool": node.tool,
        ...(node.metadata?.modelId && { modelId: node.metadata.modelId }),
      },
      elements,
    };
  } else {
    return {
      type: "element",
      name: "trigger",
      attributes: {
        id: node.id,
        "idyll-trigger": node.tool,
        enabled: String(node.metadata?.enabled !== false),
      },
      elements,
    };
  }
}

/**
 * Serialize tool block
 */
function serializeToolNode(node: ContentNode): xml2js.Element {
  const elements: xml2js.Element[] = [];

  // Add description
  const description = node.content
    .map((c) => (isTextContent(c) ? c.text : ""))
    .join("");

  elements.push({
    type: "element",
    name: "tool:description",
    elements: [{ type: "text", text: description }],
  });

  // Add definition
  if (node.children && node.children.length > 0) {
    elements.push({
      type: "element",
      name: "tool:definition",
      elements: node.children.map(serializeNode),
    });
  }

  const attributes: Record<string, string> = {
    id: node.id,
    title: node.props?.title as string,
  };

  if (node.props?.icon) {
    attributes.icon = node.props.icon as string;
  }

  return {
    type: "element",
    name: "tool",
    attributes,
    elements,
  };
}

/**
 * Serialize content block
 */
function serializeContentNode(node: ContentNode): xml2js.Element {
  const elements = [
    ...serializeRichContent(node.content),
    ...(node.children || []).map(serializeNode),
  ];

  // Get element name from type
  const typeToElement = Object.entries(compiled.elementToType).reduce(
    (acc, [elem, type]) => {
      if (!acc[type]) acc[type] = [];
      acc[type].push(elem);
      return acc;
    },
    {} as Record<string, string[]>
  );

  let elementName = typeToElement[node.type]?.[0] || "p";

  // Special handling for headings
  if (node.type === "heading" && node.props?.level) {
    elementName = `h${node.props.level}`;
  }

  return {
    type: "element",
    name: elementName,
    attributes: {
      id: node.id,
      ...node.props,
    },
    elements: elements.length > 0 ? elements : undefined,
  };
}

/**
 * Serialize rich content
 */
function serializeRichContent(
  content: RichContent[]
): (xml2js.Element | { type: "text"; text: string })[] {
  return content.map((item) => {
    if (isTextContent(item)) {
      if (item.styles && item.styles.length > 0) {
        // Map styles to elements
        const styleToElement: Record<TextStyle, string> = {
          bold: "strong",
          italic: "em",
          underline: "u",
          strikethrough: "s",
          code: "code",
        };

        // Wrap in style elements
        let element: xml2js.Element = {
          type: "element",
          name: styleToElement[item.styles[0]],
          elements: [{ type: "text", text: item.text }],
        };

        // Nest additional styles
        for (let i = 1; i < item.styles.length; i++) {
          element = {
            type: "element",
            name: styleToElement[item.styles[i]],
            elements: [element],
          };
        }

        return element;
      }
      return { type: "text", text: item.text };
    }

    // Handle other inline elements
    switch (item.type) {
      case "mention":
        return {
          type: "element",
          name: `mention:${item.mentionType}`,
          attributes: {
            id: item.id,
            ...(item.label && { label: item.label }),
          },
          elements: item.label
            ? undefined
            : [{ type: "text", text: item.label || "" }],
        };

      case "variable":
        return {
          type: "element",
          name: "variable",
          attributes: {
            name: item.name,
            ...(item.prompt && { prompt: item.prompt }),
            ...(item.value && { value: item.value }),
          },
        };

      case "link":
        return {
          type: "element",
          name: "a",
          attributes: { href: item.href },
          elements: serializeRichContent(item.content),
        };

      case "annotation":
        return {
          type: "element",
          name: "annotation",
          attributes: {
            ...(item.annotation.title && { title: String(item.annotation.title) }),
            ...(item.annotation.comment && { comment: String(item.annotation.comment) }),
            ...(item.annotation.confidence !== undefined && { confidence: String(item.annotation.confidence) }),
          },
          elements: serializeRichContent(item.content),
        };

      default:
        return { type: "text", text: "" };
    }
  });
}

// ============================================
// Utility Functions
// ============================================

function extractTextContent(element: xml2js.Element): string {
  let text = "";

  if (element.elements) {
    for (const child of element.elements) {
      if (child.type === "text" && child.text) {
        text += child.text;
      } else if (child.type === "cdata" && child.cdata) {
        text += child.cdata;
      } else if (child.type === "element") {
        text += extractTextContent(child);
      }
    }
  }

  return text;
}

function createEmptyParagraph(): ContentNode {
  return {
    id: uuidv4(),
    type: "paragraph",
    content: [],
  };
}

function extractMetadata(
  attrs: Record<string, unknown>
): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {};

  if (attrs.version) metadata.version = attrs.version;
  if (attrs.created) metadata.created = new Date(attrs.created as string);
  if (attrs.modified) metadata.modified = new Date(attrs.modified as string);

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function serializeMetadata(
  metadata?: Record<string, unknown>
): Record<string, string> {
  if (!metadata) return {};

  const result: Record<string, string> = {};

  if (metadata.version) result.version = String(metadata.version);
  if (metadata.created instanceof Date)
    result.created = metadata.created.toISOString();
  if (metadata.modified instanceof Date)
    result.modified = metadata.modified.toISOString();

  return result;
}

/**
 * Serialize edit operation
 */
function serializeEditOperation(operation: EditOperation): xml2js.Element {
  switch (operation.type) {
    case "edit:attr":
      return {
        type: "element",
        name: "edit:prop",
        attributes: {
          "block-id": operation.blockId,
          name: operation.name,
          value: operation.value,
        },
      };

    case "edit:content":
      return {
        type: "element",
        name: "edit:content",
        attributes: {
          "block-id": operation.blockId,
        },
        elements: serializeRichContent(operation.content),
      };

    case "insert":
      return {
        type: "element",
        name: "insert",
        attributes: {
          ...(operation.afterBlockId && {
            "after-block-id": operation.afterBlockId,
          }),
          ...(operation.beforeBlockId && {
            "before-block-id": operation.beforeBlockId,
          }),
          ...(operation.atStart && { "at-start": "true" }),
          ...(operation.atEnd && { "at-end": "true" }),
        },
        elements: operation.blocks.map(serializeNode),
      };

    case "delete":
      return {
        type: "element",
        name: "delete",
        attributes: {
          "block-id": operation.blockId,
        },
      };

    case "replace":
      return {
        type: "element",
        name: "replace",
        attributes: {
          "block-id": operation.blockId,
        },
        elements: operation.blocks.map(serializeNode),
      };

    default:
      throw new Error(`Unknown operation type`);
  }
}

