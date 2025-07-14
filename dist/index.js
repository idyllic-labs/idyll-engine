// document/ast.ts
function isContentNode(node) {
  return !isExecutableNode(node);
}
function isExecutableNode(node) {
  return node.type === "function_call" || node.type === "trigger";
}
function isTextContent(content) {
  return content.type === "text";
}
function isMention(content) {
  return content.type === "mention";
}
function isVariable(content) {
  return content.type === "variable";
}
function* traverseNodes(nodes) {
  for (const node of nodes) {
    yield node;
    if ("children" in node && node.children) {
      yield* traverseNodes(node.children);
    }
  }
}
function findNode(nodes, id) {
  for (const node of traverseNodes(nodes)) {
    if (node.id === id) {
      return node;
    }
  }
  return void 0;
}
function getExecutableNodes(nodes) {
  const executable = [];
  for (const node of traverseNodes(nodes)) {
    if (isExecutableNode(node)) {
      executable.push(node);
    }
  }
  return executable;
}
function extractMentions(nodes) {
  const mentions = [];
  function extractFromContent(content) {
    for (const item of content) {
      if (isMention(item)) {
        mentions.push(item);
      } else if ("content" in item && Array.isArray(item.content)) {
        extractFromContent(item.content);
      }
    }
  }
  for (const node of traverseNodes(nodes)) {
    if ("content" in node && Array.isArray(node.content)) {
      extractFromContent(node.content);
    }
    if (isExecutableNode(node) && node.content) {
      extractFromContent(node.content);
    }
  }
  return mentions;
}
function extractVariables(nodes) {
  const variables = [];
  function extractFromContent(content) {
    for (const item of content) {
      if (isVariable(item)) {
        variables.push(item);
      } else if ("content" in item && Array.isArray(item.content)) {
        extractFromContent(item.content);
      }
    }
  }
  for (const node of traverseNodes(nodes)) {
    if ("content" in node && Array.isArray(node.content)) {
      extractFromContent(node.content);
    }
    if (isExecutableNode(node) && node.content) {
      extractFromContent(node.content);
    }
  }
  return variables;
}

// document/parser-grammar.ts
import * as xml2js from "xml-js";
import { v4 as uuidv4 } from "uuid";

// types.ts
var IdyllEngineError = class extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = "IdyllEngineError";
  }
};
var ParseError = class extends IdyllEngineError {
  constructor(message, details) {
    super(message, "PARSE_ERROR", details);
    this.name = "ParseError";
  }
};

// document/grammars/grammar-dsl.ts
function terminal(element, attrs, content) {
  return { type: "terminal", element, attributes: attrs, content };
}
function seq(...rules) {
  return {
    type: "sequence",
    rules: rules.map((r) => typeof r === "string" ? ref(r) : r)
  };
}
function choice(...rules) {
  return {
    type: "choice",
    rules: rules.map((r) => typeof r === "string" ? ref(r) : r)
  };
}
function repeat(rule, min = 0, max = null) {
  return {
    type: "repeat",
    rule: typeof rule === "string" ? ref(rule) : rule,
    min,
    max
  };
}
function optional(rule) {
  return {
    type: "optional",
    rule: typeof rule === "string" ? ref(rule) : rule
  };
}
function ref(name) {
  return { type: "ref", name };
}
var zeroOrMore = (rule) => repeat(rule, 0, null);
var oneOrMore = (rule) => repeat(rule, 1, null);

// document/grammars/document-grammar.ts
var DOCUMENT_GRAMMAR = {
  // Document root
  document: seq(
    terminal("document", {
      id: { type: "string", required: false },
      version: { type: "string", required: false },
      created: { type: "string", required: false },
      modified: { type: "string", required: false }
    }),
    zeroOrMore("block")
  ),
  // Blocks
  block: choice(
    "content-block",
    "executable-block",
    "tool-block"
  ),
  "content-block": choice(
    "paragraph",
    "heading",
    "bullet-list-item",
    "numbered-list-item",
    "checklist-item",
    "code",
    "quote",
    "separator",
    "data"
  ),
  "executable-block": choice(
    "function-call",
    "trigger"
  ),
  // Content blocks
  paragraph: choice(
    terminal("p", {}, "rich"),
    terminal("paragraph", {}, "rich")
    // legacy support
  ),
  heading: choice(
    terminal("h1", {}, "rich"),
    terminal("h2", {}, "rich"),
    terminal("h3", {}, "rich"),
    terminal("h4", {}, "rich"),
    terminal("h5", {}, "rich"),
    terminal("h6", {}, "rich"),
    terminal("heading", {
      // legacy support
      level: { type: "number", required: true, validate: (v) => {
        const num = Number(v);
        return num >= 1 && num <= 6 ? null : "Level must be 1-6";
      } }
    }, "rich")
  ),
  // List items (individual blocks, no containers)
  "bullet-list-item": terminal("bulletlistitem", {}, "rich"),
  "numbered-list-item": terminal("numberedlistitem", {}, "rich"),
  "checklist-item": terminal("checklistitem", {
    checked: { type: "boolean", required: true }
  }, "rich"),
  code: terminal("code", {
    language: { type: "string", required: false }
  }, "text"),
  quote: terminal("quote", {
    author: { type: "string", required: false },
    source: { type: "string", required: false }
  }, "rich"),
  separator: terminal("separator", {}, "none"),
  data: terminal("data", {
    title: { type: "string", required: false }
  }, "text"),
  // Executable blocks
  "function-call": seq(
    terminal("fncall", {
      "idyll-tool": {
        type: "string",
        required: true,
        // Format: \"module:function\" or just \"function\" (e.g., \"demo:echo\", \"ai:analyzeText\", \"echo\")
        // Module and function names MUST be valid JS identifiers
        // For Azure Functions compatibility, transform at adapter layer:
        // \"module:function\" → \"module--function\" (double hyphen separator)
        pattern: /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/
      },
      modelId: { type: "string", required: false }
    }),
    optional("params"),
    optional("content"),
    optional("result")
  ),
  trigger: seq(
    terminal("trigger", {
      "idyll-trigger": {
        type: "string",
        required: true,
        // Format: \"module:trigger\" or just \"trigger\" (e.g., \"time:schedule\", \"webhook:receive\", \"daily\")
        // Module and trigger names MUST be valid JS identifiers
        // For Azure Functions compatibility, transform at adapter layer:
        // \"module:trigger\" → \"module--trigger\" (double hyphen separator)
        pattern: /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/
      },
      enabled: { type: "boolean", default: true }
    }),
    optional("params"),
    optional("content")
  ),
  // Tool blocks
  "tool-block": seq(
    terminal("tool", {
      title: { type: "string", required: true },
      icon: { type: "string", required: false }
    }),
    ref("tool-description"),
    ref("tool-definition")
  ),
  "tool-description": terminal("tool:description", {}, "text"),
  "tool-definition": seq(
    terminal("tool:definition"),
    zeroOrMore(choice("content-block", "executable-block"))
    // no nested tools!
  ),
  // Function call children
  params: seq(
    terminal("params"),
    ref("json-content")
  ),
  content: seq(
    terminal("content"),
    ref("rich-content")
  ),
  result: seq(
    terminal("result"),
    ref("json-content")
  ),
  // Content types
  "rich-content": zeroOrMore(choice(
    "text",
    "styled-text",
    "mention",
    "variable",
    "link",
    "annotation",
    "annotated-text",
    "ai-edit-response"
  )),
  "text-content": terminal("_text", {}, "text"),
  // pseudo-element for plain text
  "json-content": terminal("_json", {}, "json"),
  // pseudo-element for JSON
  // Inline elements
  "styled-text": choice(
    seq(choice(terminal("strong"), terminal("b")), ref("rich-content")),
    seq(choice(terminal("em"), terminal("i")), ref("rich-content")),
    seq(choice(terminal("u"), terminal("underline")), ref("rich-content")),
    seq(choice(terminal("s"), terminal("strike"), terminal("del")), ref("rich-content")),
    seq(choice(terminal("code"), terminal("tt")), ref("rich-content"))
  ),
  annotation: seq(
    terminal("annotation", {
      title: { type: "string", required: false },
      comment: { type: "string", required: false },
      confidence: { type: "number", required: false }
    }),
    ref("rich-content")
  ),
  mention: choice(
    terminal("mention:user", {
      id: { type: "string", required: true },
      label: { type: "string", required: false }
    }, "text"),
    terminal("mention:document", {
      id: { type: "string", required: true },
      label: { type: "string", required: false }
    }, "text"),
    terminal("mention:agent", {
      id: { type: "string", required: true },
      label: { type: "string", required: false }
    }, "text"),
    terminal("mention:custom", {
      id: { type: "string", required: true },
      type: { type: "string", required: true },
      label: { type: "string", required: false }
    }, "text")
  ),
  variable: terminal("variable", {
    name: { type: "string", required: true },
    prompt: { type: "string", required: false },
    value: { type: "string", required: false }
  }, "none"),
  link: seq(
    terminal("a", {
      href: { type: "string", required: true, pattern: /^https?:\/\/.+/ }
    }),
    ref("rich-content")
  ),
  "annotated-text": seq(
    terminal("annotatedtext", {
      annotation: { type: "string", required: true }
    }),
    ref("rich-content")
  ),
  "ai-edit-response": seq(
    terminal("aieditresponse", {
      status: { type: "enum", values: ["pending", "accepted", "rejected"], required: true }
    }),
    ref("rich-content")
  ),
  text: terminal("_text", {}, "text")
  // Raw text node
};

// document/grammars/agent-grammar.ts
var AGENT_GRAMMAR = {
  // Agent system prompt root
  agent: seq(
    terminal("agent", {
      id: { type: "string", required: false },
      name: { type: "string", required: false },
      description: { type: "string", required: false },
      model: { type: "string", required: false }
    }),
    zeroOrMore("block")
  )
};

// document/grammars/diff-grammar.ts
var DIFF_GRAMMAR = {
  // Diff operations root
  diff: seq(
    terminal("diff", {
      targetDocument: { type: "string", required: false },
      timestamp: { type: "string", required: false }
    }),
    oneOrMore("edit-operation")
  ),
  // Edit operations
  "edit-operation": choice(
    "edit-attr",
    "edit-content",
    "edit-params",
    "edit-id",
    "insert",
    "delete",
    "replace",
    "move"
  ),
  "edit-attr": terminal("edit:attr", {
    "block-id": { type: "string", required: true },
    name: { type: "string", required: true },
    value: { type: "string", required: true }
  }, "none"),
  "edit-content": seq(
    terminal("edit:content", {
      "block-id": { type: "string", required: true }
    }),
    ref("rich-content")
  ),
  "edit-params": seq(
    terminal("edit:params", {
      "block-id": { type: "string", required: true }
    }),
    ref("json-content")
  ),
  "edit-id": terminal("edit:id", {
    "block-id": { type: "string", required: true },
    value: { type: "string", required: true }
  }, "none"),
  insert: seq(
    terminal("insert", {
      "after-block-id": { type: "string", required: false },
      "before-block-id": { type: "string", required: false },
      "at-start": { type: "boolean", required: false },
      "at-end": { type: "boolean", required: false }
    }),
    oneOrMore("block")
  ),
  delete: terminal("delete", {
    "block-id": { type: "string", required: true }
  }, "none"),
  replace: seq(
    terminal("replace", {
      "block-id": { type: "string", required: true }
    }),
    oneOrMore("block")
  ),
  move: terminal("move", {
    "block-id": { type: "string", required: false },
    "block-ids": { type: "string", required: false },
    "from-block-id": { type: "string", required: false },
    "to-block-id": { type: "string", required: false },
    "after-block-id": { type: "string", required: false },
    "before-block-id": { type: "string", required: false },
    "at-start": { type: "boolean", required: false },
    "at-end": { type: "boolean", required: false }
  }, "none")
};

// document/grammars/index.ts
var GRAMMAR = {
  // Root types
  root: choice(
    "document",
    "agent",
    "diff"
  ),
  // Merge all grammar rules
  ...DOCUMENT_GRAMMAR,
  ...AGENT_GRAMMAR,
  ...DIFF_GRAMMAR
};

// document/grammar-compiler.ts
var GrammarCompiler = class {
  grammar;
  compiled = null;
  constructor(grammar) {
    this.grammar = grammar;
  }
  /**
   * Compile the grammar into usable structures
   */
  compile() {
    if (this.compiled) return this.compiled;
    const elementToType = {};
    const typeToElements = {};
    const elementSchemas = {};
    const blockTypes = /* @__PURE__ */ new Set();
    const inlineElements = /* @__PURE__ */ new Set();
    const terminals = this.collectTerminals();
    for (const [ruleName, terminal2] of terminals) {
      const element = terminal2.element;
      if (element.startsWith("_")) continue;
      const astType = this.inferAstType(element, ruleName);
      elementToType[element] = astType;
      if (!typeToElements[astType]) {
        typeToElements[astType] = [];
      }
      typeToElements[astType].push(element);
      elementSchemas[element] = {
        element,
        type: astType,
        block: this.isBlockRule(ruleName),
        attributes: terminal2.attributes,
        content: terminal2.content
      };
      if (this.isBlockRule(ruleName)) {
        blockTypes.add(astType);
      } else if (this.isInlineRule(ruleName)) {
        inlineElements.add(element);
      }
    }
    const isValidElement = (element) => element in elementToType;
    const isValidChild = (parentType, childElement) => {
      const rule = this.findRuleByType(parentType);
      if (!rule) return false;
      return this.isValidInContext(rule, childElement);
    };
    const validateAttributes = (element, attrs) => {
      const schema = elementSchemas[element];
      if (!schema || !schema.attributes) return [];
      return this.validateAttrs(attrs, schema.attributes, element);
    };
    this.compiled = {
      elementToType,
      typeToElements,
      elementSchemas,
      isValidElement,
      isValidChild,
      validateAttributes,
      blockTypes,
      inlineElements
    };
    return this.compiled;
  }
  /**
   * Collect all terminal rules with their contexts
   */
  collectTerminals() {
    const terminals = /* @__PURE__ */ new Map();
    const visited = /* @__PURE__ */ new Set();
    const visit = (ruleName, rule) => {
      const key = `${ruleName}:${JSON.stringify(rule)}`;
      if (visited.has(key)) return;
      visited.add(key);
      switch (rule.type) {
        case "terminal":
          terminals.set(ruleName, {
            element: rule.element,
            attributes: rule.attributes,
            content: rule.content
          });
          break;
        case "choice":
        case "sequence":
          rule.rules.forEach((r, i) => {
            if (r.type === "ref") {
              visit(r.name, this.grammar[r.name]);
            } else {
              visit(`${ruleName}[${i}]`, r);
            }
          });
          break;
        case "repeat":
        case "optional":
          if (rule.rule.type === "ref") {
            visit(rule.rule.name, this.grammar[rule.rule.name]);
          } else {
            visit(`${ruleName}:inner`, rule.rule);
          }
          break;
        case "ref":
          if (this.grammar[rule.name]) {
            visit(rule.name, this.grammar[rule.name]);
          }
          break;
      }
    };
    for (const [name, rule] of Object.entries(this.grammar)) {
      visit(name, rule);
    }
    return terminals;
  }
  /**
   * Infer AST type from element name and rule context
   */
  inferAstType(element, ruleName) {
    const typeMap = {
      "p": "paragraph",
      "paragraph": "paragraph",
      "h1": "heading",
      "h2": "heading",
      "h3": "heading",
      "h4": "heading",
      "h5": "heading",
      "h6": "heading",
      "heading": "heading",
      "fncall": "function_call",
      "bulletlistitem": "bulletListItem",
      "numberedlistitem": "numberedListItem",
      "checklistitem": "checklistItem",
      "tool:description": "_tool_description",
      "tool:definition": "_tool_definition"
    };
    return typeMap[element] || element.replace(/[:-]/g, "_");
  }
  /**
   * Check if a rule represents a block element
   */
  isBlockRule(ruleName) {
    return ruleName.includes("block") || ruleName === "paragraph" || ruleName === "heading" || ruleName === "list" || ruleName === "code" || ruleName === "quote" || ruleName === "separator" || ruleName === "tool-block";
  }
  /**
   * Check if a rule represents an inline element
   */
  isInlineRule(ruleName) {
    return ruleName.includes("styled-text") || ruleName === "mention" || ruleName === "variable" || ruleName === "link" || ruleName === "text";
  }
  /**
   * Find a rule that produces the given AST type
   */
  findRuleByType(astType) {
    const ruleMap = {
      "tool": "tool-block",
      "list": "list",
      "function_call": "function-call",
      "trigger": "trigger"
    };
    const ruleName = ruleMap[astType];
    return ruleName ? this.grammar[ruleName] : null;
  }
  /**
   * Check if an element is valid in a given context
   */
  isValidInContext(rule, element) {
    switch (rule.type) {
      case "terminal":
        return rule.element === element;
      case "choice":
        return rule.rules.some((r) => this.isValidInContext(r, element));
      case "sequence":
        return rule.rules.some((r) => this.isValidInContext(r, element));
      case "repeat":
      case "optional":
        return this.isValidInContext(rule.rule, element);
      case "ref":
        const referenced = this.grammar[rule.name];
        return referenced ? this.isValidInContext(referenced, element) : false;
      default:
        return false;
    }
  }
  /**
   * Validate attributes against schema
   */
  validateAttrs(attrs, schema, element) {
    const errors = [];
    for (const [name, def] of Object.entries(schema)) {
      if (def.required && !(name in attrs)) {
        errors.push({
          type: "attribute",
          path: `${element}@${name}`,
          message: `Required attribute missing: ${name}`
        });
      }
    }
    for (const [name, value] of Object.entries(attrs)) {
      const def = schema[name];
      if (!def) continue;
      if (def.type === "enum" && def.values && !def.values.includes(value)) {
        errors.push({
          type: "attribute",
          path: `${element}@${name}`,
          message: `Invalid value: must be one of ${def.values.join(", ")}`
        });
      }
      if (def.pattern && typeof value === "string" && !def.pattern.test(value)) {
        errors.push({
          type: "attribute",
          path: `${element}@${name}`,
          message: `Invalid format for ${name}`
        });
      }
      if (def.validate) {
        const error = def.validate(value);
        if (error) {
          errors.push({
            type: "attribute",
            path: `${element}@${name}`,
            message: error
          });
        }
      }
    }
    return errors;
  }
  /**
   * Generate TypeScript AST types from grammar
   */
  generateTypes() {
    const compiled2 = this.compile();
    const types = [];
    const blockTypeNames = Array.from(compiled2.blockTypes).map((t) => `'${t}'`).join(" | ");
    types.push(`export type BlockType = ${blockTypeNames};`);
    types.push("\nexport const ELEMENT_TO_TYPE = {");
    for (const [element, type] of Object.entries(compiled2.elementToType)) {
      types.push(`  '${element}': '${type}',`);
    }
    types.push("} as const;");
    return types.join("\n");
  }
};

// document/parser-grammar.ts
var compiler = new GrammarCompiler(GRAMMAR);
var compiled = compiler.compile();
function parseXmlToAst(xmlString) {
  if (!xmlString || !xmlString.trim()) {
    throw new ParseError("Empty XML content provided");
  }
  const options = {
    compact: false,
    textKey: "text",
    ignoreDeclaration: true,
    ignoreInstruction: true,
    ignoreComment: true,
    ignoreDoctype: true,
    ignoreText: false,
    trim: false,
    sanitize: false,
    nativeType: false
  };
  let result;
  try {
    result = xml2js.xml2js(xmlString, options);
  } catch (error) {
    throw new ParseError(
      `Invalid XML format: ${error instanceof Error ? error.message : "Failed to parse XML"}`
    );
  }
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
function parseDocument(documentElement) {
  const attrs = documentElement.attributes || {};
  const validationErrors = compiled.validateAttributes("document", attrs);
  if (validationErrors.length > 0) {
    throw new ParseError(
      `Document validation failed: ${validationErrors[0].message}`
    );
  }
  const documentId = attrs.id || uuidv4();
  const nodes = [];
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
    metadata: extractMetadata(attrs)
  };
}
function parseAgent(agentElement) {
  const attrs = agentElement.attributes || {};
  const validationErrors = compiled.validateAttributes("agent", attrs);
  if (validationErrors.length > 0) {
    throw new ParseError(
      `Agent validation failed: ${validationErrors[0].message}`
    );
  }
  const agentId = attrs.id || uuidv4();
  const nodes = [];
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
    name: attrs.name,
    description: attrs.description,
    model: attrs.model,
    nodes
  };
}
function parseDiff(diffElement) {
  const attrs = diffElement.attributes || {};
  const validationErrors = compiled.validateAttributes("diff", attrs);
  if (validationErrors.length > 0) {
    throw new ParseError(
      `Diff validation failed: ${validationErrors[0].message}`
    );
  }
  const operations = [];
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
    targetDocument: attrs.targetDocument,
    timestamp: attrs.timestamp ? new Date(attrs.timestamp) : /* @__PURE__ */ new Date(),
    operations
  };
}
function parseEditOperation(element) {
  if (!element.name) return null;
  const attrs = element.attributes || {};
  switch (element.name) {
    case "edit:prop":
      return {
        type: "edit:attr",
        blockId: attrs["block-id"],
        name: attrs.name,
        value: attrs.value
      };
    case "edit:content":
      return {
        type: "edit:content",
        blockId: attrs["block-id"],
        content: parseRichContent(element)
      };
    case "insert":
      const insertNodes = [];
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
        afterBlockId: attrs["after-block-id"],
        beforeBlockId: attrs["before-block-id"],
        atStart: attrs["at-start"] === "true",
        atEnd: attrs["at-end"] === "true",
        blocks: insertNodes
      };
    case "delete":
      return {
        type: "delete",
        blockId: attrs["block-id"]
      };
    case "replace":
      const replaceNodes = [];
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
        blockId: attrs["block-id"],
        blocks: replaceNodes
      };
    default:
      console.warn(`Unknown edit operation: ${element.name}`);
      return null;
  }
}
function parseNode(element) {
  if (!element.name) return null;
  const elementType = compiled.elementToType[element.name];
  if (!elementType) {
    return null;
  }
  const id = element.attributes?.id || uuidv4();
  const attrs = element.attributes || {};
  const errors = compiled.validateAttributes(element.name, attrs);
  if (errors.length > 0) {
    throw new ParseError(
      `Invalid attributes for ${element.name}: ${errors[0].message}`
    );
  }
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
function parseFunctionCall(element, id, attrs) {
  const tool = attrs["idyll-tool"];
  let parameters = {};
  let content = [];
  let result;
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
          content = parseRichContent(child);
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
    content: content.length > 0 ? content : void 0,
    result: result ? { success: true, data: result } : void 0,
    metadata: {
      modelId: attrs.modelId
    }
  };
}
function parseTrigger(element, id, attrs) {
  const tool = attrs["idyll-trigger"];
  const enabled = attrs.enabled !== false;
  let parameters = {};
  let content = [];
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
          content = parseRichContent(child);
          break;
      }
    }
  }
  return {
    id,
    type: "trigger",
    tool,
    parameters,
    content: content.length > 0 ? content : void 0,
    metadata: { enabled }
  };
}
function parseTool(element, id, attrs) {
  const title = attrs.title;
  const icon = attrs.icon;
  let description = "";
  let definition = [];
  for (const child of element.elements || []) {
    if (child.type === "element" && child.name) {
      switch (child.name) {
        case "tool:description":
          description = extractTextContent(child);
          break;
        case "tool:definition":
          for (const defChild of child.elements || []) {
            if (defChild.type === "element" && defChild.name) {
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
    type: "tool",
    content: [{ type: "text", text: description }],
    children: definition.length > 0 ? definition : void 0,
    props: { title, icon }
  };
}
function parseContentNode(element, id, attrs, blockType) {
  const content = parseRichContent(element);
  const children = [];
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
  if (blockType === "heading") {
    if (element.name === "heading") {
    } else if (element.name) {
      const match = element.name.match(/^h(\d)$/);
      if (match) {
        attrs.level = parseInt(match[1], 10);
      }
    }
  }
  return {
    id,
    type: blockType,
    content,
    children: children.length > 0 ? children : void 0,
    props: attrs
  };
}
function parseRichContent(element) {
  const content = [];
  if (!element.elements) return content;
  for (const child of element.elements) {
    if (child.type === "text" && child.text) {
      content.push({
        type: "text",
        text: child.text
      });
    } else if (child.type === "element" && child.name) {
      const inlineElement = parseInlineElement(child);
      if (inlineElement) {
        if (Array.isArray(inlineElement)) {
          content.push(...inlineElement.filter((item) => item != null));
        } else {
          content.push(inlineElement);
        }
      }
    }
  }
  return content;
}
function parseInlineElement(element) {
  if (!element.name) return null;
  if (element.name.startsWith("mention:")) {
    const mentionType = element.name.substring(8);
    const id = element.attributes?.id;
    const label = element.attributes?.label || extractTextContent(element);
    return {
      type: "mention",
      mentionType,
      id,
      label
    };
  }
  if (element.name === "variable") {
    const name = element.attributes?.name;
    const prompt = element.attributes?.prompt;
    const value = element.attributes?.value;
    if (!name) {
      console.warn('Variable element missing required "name" attribute');
      return null;
    }
    return {
      type: "variable",
      name,
      ...prompt && { prompt },
      ...value && { value }
    };
  }
  if (element.name === "a") {
    const href = element.attributes?.href;
    return {
      type: "link",
      href,
      content: parseRichContent(element)
    };
  }
  if (element.name === "annotation") {
    return {
      type: "annotation",
      content: parseRichContent(element),
      annotation: element.attributes || {}
    };
  }
  if (element.name === "annotatedtext") {
    const annotation = element.attributes?.annotation;
    return {
      type: "annotation",
      content: parseRichContent(element),
      annotation: { title: annotation }
    };
  }
  if (element.name === "aieditresponse") {
    const status = element.attributes?.status;
    return {
      type: "annotation",
      content: parseRichContent(element),
      annotation: { type: "ai-edit", status }
    };
  }
  const styleMap = {
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
    tt: "code"
  };
  const style = styleMap[element.name];
  if (style) {
    const innerContent = parseRichContent(element);
    return innerContent.map((item) => {
      if (isTextContent(item)) {
        return {
          ...item,
          styles: [...item.styles || [], style]
        };
      }
      return item;
    });
  }
  return null;
}
function serializeAstToXml(document) {
  let root;
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
  const options = {
    compact: false,
    spaces: 2,
    textKey: "text"
  };
  const wrapped = {
    elements: [root]
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
${xml2js.js2xml(
    wrapped,
    options
  )}`;
}
function serializeIdyllDocument(document) {
  return {
    type: "element",
    name: "document",
    attributes: {
      id: document.id,
      ...serializeMetadata(document.metadata)
    },
    elements: document.nodes.map(serializeNode)
  };
}
function serializeAgentDocument(document) {
  return {
    type: "element",
    name: "agent",
    attributes: {
      id: document.id,
      ...document.name && { name: document.name },
      ...document.description && { description: document.description },
      ...document.model && { model: document.model }
    },
    elements: document.nodes.map(serializeNode)
  };
}
function serializeDiffDocument(document) {
  return {
    type: "element",
    name: "diff",
    attributes: {
      ...document.targetDocument && {
        targetDocument: document.targetDocument
      },
      timestamp: document.timestamp.toISOString()
    },
    elements: document.operations.map(serializeEditOperation)
  };
}
function serializeNode(node) {
  if (isExecutableNode(node)) {
    return serializeExecutableNode(node);
  }
  if (node.type === "tool") {
    return serializeToolNode(node);
  }
  return serializeContentNode(node);
}
function serializeExecutableNode(node) {
  const elements = [];
  if (Object.keys(node.parameters).length > 0) {
    elements.push({
      type: "element",
      name: "params",
      elements: [
        {
          type: "cdata",
          cdata: JSON.stringify(node.parameters)
        }
      ]
    });
  }
  if (node.content && node.content.length > 0) {
    elements.push({
      type: "element",
      name: "content",
      elements: serializeRichContent(node.content)
    });
  }
  if (node.type === "function_call") {
    if (node.result) {
      elements.push({
        type: "element",
        name: "result",
        elements: [
          {
            type: "cdata",
            cdata: JSON.stringify(node.result.data || node.result)
          }
        ]
      });
    }
    return {
      type: "element",
      name: "fncall",
      attributes: {
        id: node.id,
        "idyll-tool": node.tool,
        ...node.metadata?.modelId && { modelId: node.metadata.modelId }
      },
      elements
    };
  } else {
    return {
      type: "element",
      name: "trigger",
      attributes: {
        id: node.id,
        "idyll-trigger": node.tool,
        enabled: String(node.metadata?.enabled !== false)
      },
      elements
    };
  }
}
function serializeToolNode(node) {
  const elements = [];
  const description = node.content.map((c) => isTextContent(c) ? c.text : "").join("");
  elements.push({
    type: "element",
    name: "tool:description",
    elements: [{ type: "text", text: description }]
  });
  if (node.children && node.children.length > 0) {
    elements.push({
      type: "element",
      name: "tool:definition",
      elements: node.children.map(serializeNode)
    });
  }
  const attributes = {
    id: node.id,
    title: node.props?.title
  };
  if (node.props?.icon) {
    attributes.icon = node.props.icon;
  }
  return {
    type: "element",
    name: "tool",
    attributes,
    elements
  };
}
function serializeContentNode(node) {
  const elements = [
    ...serializeRichContent(node.content),
    ...(node.children || []).map(serializeNode)
  ];
  const typeToElement = Object.entries(compiled.elementToType).reduce(
    (acc, [elem, type]) => {
      if (!acc[type]) acc[type] = [];
      acc[type].push(elem);
      return acc;
    },
    {}
  );
  let elementName = typeToElement[node.type]?.[0] || "p";
  if (node.type === "heading" && node.props?.level) {
    elementName = `h${node.props.level}`;
  }
  return {
    type: "element",
    name: elementName,
    attributes: {
      id: node.id,
      ...cleanProps(node.props)
    },
    elements: elements.length > 0 ? elements : void 0
  };
}
function serializeRichContent(content) {
  return content.map((item) => {
    if (isTextContent(item)) {
      if (item.styles && item.styles.length > 0) {
        const styleToElement = {
          bold: "strong",
          italic: "em",
          underline: "u",
          strikethrough: "s",
          code: "code"
        };
        let element = {
          type: "element",
          name: styleToElement[item.styles[0]],
          elements: [{ type: "text", text: item.text }]
        };
        for (let i = 1; i < item.styles.length; i++) {
          element = {
            type: "element",
            name: styleToElement[item.styles[i]],
            elements: [element]
          };
        }
        return element;
      }
      return { type: "text", text: item.text };
    }
    switch (item.type) {
      case "mention":
        return {
          type: "element",
          name: `mention:${item.mentionType}`,
          attributes: {
            id: item.id,
            ...item.label && { label: item.label }
          },
          elements: item.label ? void 0 : [{ type: "text", text: item.label || "" }]
        };
      case "variable":
        return {
          type: "element",
          name: "variable",
          attributes: {
            name: item.name,
            ...item.prompt && { prompt: item.prompt },
            ...item.value && { value: item.value }
          }
        };
      case "link":
        return {
          type: "element",
          name: "a",
          attributes: { href: item.href },
          elements: serializeRichContent(item.content)
        };
      case "annotation":
        return {
          type: "element",
          name: "annotation",
          attributes: {
            ...item.annotation.title && { title: String(item.annotation.title) },
            ...item.annotation.comment && { comment: String(item.annotation.comment) },
            ...item.annotation.confidence !== void 0 && { confidence: String(item.annotation.confidence) }
          },
          elements: serializeRichContent(item.content)
        };
      default:
        return { type: "text", text: "" };
    }
  });
}
function extractTextContent(element) {
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
function createEmptyParagraph() {
  return {
    id: uuidv4(),
    type: "paragraph",
    content: []
  };
}
function extractMetadata(attrs) {
  const metadata = {};
  if (attrs.version) metadata.version = attrs.version;
  if (attrs.created) metadata.created = new Date(attrs.created);
  if (attrs.modified) metadata.modified = new Date(attrs.modified);
  return Object.keys(metadata).length > 0 ? metadata : void 0;
}
function serializeMetadata(metadata) {
  if (!metadata) return {};
  const result = {};
  if (metadata.version) result.version = String(metadata.version);
  if (metadata.created instanceof Date)
    result.created = metadata.created.toISOString();
  if (metadata.modified instanceof Date)
    result.modified = metadata.modified.toISOString();
  return result;
}
function cleanProps(props) {
  if (!props) return {};
  const cleaned = {};
  const defaultValues = /* @__PURE__ */ new Set([
    "default",
    "left",
    // default text alignment
    "normal",
    // default font weight, etc.
    "",
    // empty strings
    null,
    void 0
  ]);
  for (const [key, value] of Object.entries(props)) {
    if (defaultValues.has(value)) {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    if (value && typeof value === "object" && Object.keys(value).length === 0) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}
function serializeEditOperation(operation) {
  switch (operation.type) {
    case "edit:attr":
      return {
        type: "element",
        name: "edit:prop",
        attributes: {
          "block-id": operation.blockId,
          name: operation.name,
          value: operation.value
        }
      };
    case "edit:content":
      return {
        type: "element",
        name: "edit:content",
        attributes: {
          "block-id": operation.blockId
        },
        elements: serializeRichContent(operation.content)
      };
    case "insert":
      return {
        type: "element",
        name: "insert",
        attributes: {
          ...operation.afterBlockId && {
            "after-block-id": operation.afterBlockId
          },
          ...operation.beforeBlockId && {
            "before-block-id": operation.beforeBlockId
          },
          ...operation.atStart && { "at-start": "true" },
          ...operation.atEnd && { "at-end": "true" }
        },
        elements: operation.blocks.map(serializeNode)
      };
    case "delete":
      return {
        type: "element",
        name: "delete",
        attributes: {
          "block-id": operation.blockId
        }
      };
    case "replace":
      return {
        type: "element",
        name: "replace",
        attributes: {
          "block-id": operation.blockId
        },
        elements: operation.blocks.map(serializeNode)
      };
    default:
      throw new Error(`Unknown operation type`);
  }
}

// document/executor.ts
import { z } from "zod";
var DocumentExecutor = class {
  options;
  constructor(options) {
    this.options = {
      stopOnError: false,
      timeout: 3e4,
      ...options
    };
  }
  /**
   * Execute a single node or entire document
   */
  async execute(request) {
    if (request.mode === "single") {
      return this.executeSingleNode(request.document, request.nodeId || request.blockId);
    } else {
      return this.executeDocument(request.document);
    }
  }
  /**
   * Execute all executable nodes in a document
   */
  async executeDocument(document) {
    const startTime = /* @__PURE__ */ new Date();
    const state = /* @__PURE__ */ new Map();
    const executableNodes = this.findExecutableNodes(document.nodes || document.blocks);
    const total = executableNodes.length;
    for (let i = 0; i < executableNodes.length; i++) {
      const node = executableNodes[i];
      this.options.onProgress?.(node.id, i + 1, total);
      const context = {
        currentNodeId: node.id,
        previousResults: new Map(state),
        // Copy current state
        document,
        api: this.options.api
      };
      const result = await this.executeNode(node, context);
      state.set(node.id, result);
      if (!result.success && this.options.stopOnError) {
        break;
      }
    }
    const endTime = /* @__PURE__ */ new Date();
    const metadata = {
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      nodesExecuted: state.size,
      nodesSucceeded: Array.from(state.values()).filter((r) => r.success).length,
      nodesFailed: Array.from(state.values()).filter((r) => !r.success).length
    };
    return { nodes: state, metadata };
  }
  /**
   * Execute a single node by ID
   */
  async executeSingleNode(document, nodeId) {
    const startTime = /* @__PURE__ */ new Date();
    const state = /* @__PURE__ */ new Map();
    const node = this.findNodeById(document.nodes || document.blocks, nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    if (!this.isExecutableNode(node)) {
      throw new Error(`Node ${nodeId} is not executable`);
    }
    const previousResults = this.getPreviousResults(document, nodeId);
    const context = {
      currentNodeId: nodeId,
      previousResults,
      document,
      api: this.options.api
    };
    const result = await this.executeNode(node, context);
    state.set(nodeId, result);
    const endTime = /* @__PURE__ */ new Date();
    const metadata = {
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      nodesExecuted: 1,
      nodesSucceeded: result.success ? 1 : 0,
      nodesFailed: result.success ? 0 : 1
    };
    return { nodes: state, metadata };
  }
  /**
   * Execute a single executable node
   */
  async executeNode(node, context) {
    const startTime = Date.now();
    try {
      const tool = this.options.tools[node.tool];
      if (!tool) {
        throw new Error(`Tool not found: ${node.tool}`);
      }
      let validatedParams;
      try {
        validatedParams = tool.schema.parse(node.parameters);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid parameters: ${error.errors.map((e) => e.message).join(", ")}`);
        }
        throw error;
      }
      const content = this.extractContent(node.content);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Execution timeout")), this.options.timeout);
      });
      const data = await Promise.race([
        tool.execute(validatedParams, content, context),
        timeoutPromise
      ]);
      return {
        success: true,
        data,
        duration: Date.now() - startTime,
        timestamp: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      const errorObj = {
        message: error instanceof Error ? error.message : String(error),
        code: "EXECUTION_ERROR",
        details: error
      };
      return {
        success: false,
        error: errorObj,
        duration: Date.now() - startTime,
        timestamp: /* @__PURE__ */ new Date()
      };
    }
  }
  /**
   * Find all executable nodes in document
   */
  findExecutableNodes(nodes) {
    const executable = [];
    for (const node of nodes) {
      if (this.isExecutableNode(node)) {
        executable.push(node);
      }
      if ("children" in node && node.children) {
        executable.push(...this.findExecutableNodes(node.children));
      }
    }
    return executable;
  }
  /**
   * Find a node by ID
   */
  findNodeById(nodes, id) {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if ("children" in node && node.children) {
        const found = this.findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }
  /**
   * Get results from all nodes before the given node
   */
  getPreviousResults(document, beforeNodeId) {
    const results = /* @__PURE__ */ new Map();
    const executableNodes = this.findExecutableNodes(document.nodes || document.blocks);
    for (const node of executableNodes) {
      if (node.id === beforeNodeId) {
        break;
      }
    }
    return results;
  }
  /**
   * Check if a node is executable
   */
  isExecutableNode(node) {
    return node.type === "function_call" || node.type === "trigger";
  }
  /**
   * Extract text content from rich content
   */
  extractContent(content) {
    if (!content) return "";
    return content.map((item) => {
      if ("text" in item) {
        return item.text;
      }
      return "";
    }).join("");
  }
};

// document/tool-registry.ts
import { z as z2 } from "zod";
function createToolRegistry(tools) {
  return tools;
}
function defineTool(definition) {
  return definition;
}
function mergeToolRegistries(...registries) {
  return registries.reduce((merged, registry) => {
    return { ...merged, ...registry };
  }, {});
}
function createSimpleRegistry(tools) {
  const registry = {};
  for (const [name, fn] of Object.entries(tools)) {
    registry[name] = {
      schema: z2.any(),
      // Accept any params
      execute: (params, content, context) => fn(params, content, context)
    };
  }
  return registry;
}

// document/tool-naming.ts
function toAzureFunctionName(idyllToolName) {
  return idyllToolName.replace(":", "--");
}
function fromAzureFunctionName(azureFunctionName) {
  if (azureFunctionName.includes("--")) {
    return azureFunctionName.replace("--", ":");
  }
  return azureFunctionName;
}
function validateToolName(toolName) {
  const pattern = /^([a-zA-Z_$][a-zA-Z0-9_$]*:)?[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  if (!pattern.test(toolName)) {
    return {
      valid: false,
      error: 'Tool name must be valid JS identifiers in format "module:function" or "function"'
    };
  }
  return { valid: true };
}
function parseToolName(toolName) {
  const colonIndex = toolName.indexOf(":");
  if (colonIndex === -1) {
    return { function: toolName };
  }
  return {
    module: toolName.substring(0, colonIndex),
    function: toolName.substring(colonIndex + 1)
  };
}
function buildToolName(module, functionName) {
  return module ? `${module}:${functionName}` : functionName;
}

// document/validator.ts
async function validateDocument(document, context) {
  const errors = [];
  const warnings = [];
  validateStructure(document, errors, warnings);
  if (context) {
    await validateReferences(document, context, errors, warnings);
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
function validateStructure(document, errors, warnings) {
  if (!document.id) {
    errors.push({
      type: "error",
      code: "MISSING_DOCUMENT_ID",
      message: "Document must have an ID"
    });
  }
  if (!document.nodes || document.nodes.length === 0) {
    warnings.push({
      type: "warning",
      code: "EMPTY_DOCUMENT",
      message: "Document has no content nodes"
    });
  }
  const nodeIds = /* @__PURE__ */ new Set();
  for (const node of traverseNodes(document.nodes)) {
    validateNode(node, nodeIds, errors, warnings);
  }
}
function validateNode(node, nodeIds, errors, warnings) {
  const nodeId = node.id || "unknown";
  if (node.id && nodeIds.has(node.id)) {
    errors.push({
      type: "error",
      code: "DUPLICATE_NODE_ID",
      message: `Duplicate node ID: ${node.id}`,
      nodeId: node.id
    });
  }
  if (node.id) {
    nodeIds.add(node.id);
  }
  if (!node.id) {
    errors.push({
      type: "error",
      code: "MISSING_NODE_ID",
      message: "Node must have an ID"
    });
  }
  if (!node.type) {
    errors.push({
      type: "error",
      code: "MISSING_NODE_TYPE",
      message: "Node must have a type",
      nodeId
    });
    return;
  }
  if (isExecutableNode(node)) {
    if (!node.tool) {
      errors.push({
        type: "error",
        code: "MISSING_TOOL",
        message: "Executable node must specify a tool",
        nodeId
      });
    }
    if (!node.parameters) {
      warnings.push({
        type: "warning",
        code: "MISSING_PARAMETERS",
        message: "Executable node has no parameters",
        nodeId
      });
    }
  }
}
async function validateReferences(document, context, errors, warnings) {
  if (context.validateMention) {
    const mentions = extractMentions(document.nodes);
    for (const mention of mentions) {
      if (!context.validateMention(mention)) {
        errors.push({
          type: "error",
          code: "INVALID_MENTION",
          message: `Invalid ${mention.mentionType} mention: ${mention.id}`
        });
      }
    }
  }
  if (context.validateVariable) {
    const variables = extractVariables(document.nodes);
    for (const variable of variables) {
      const result = context.validateVariable(variable);
      if (!result.valid) {
        errors.push({
          type: "error",
          code: "INVALID_VARIABLE",
          message: `Invalid variable: ${variable.name}`
        });
      }
    }
  }
  if (context.validateTool) {
    for (const node of traverseNodes(document.nodes)) {
      if (isExecutableNode(node) && node.tool) {
        if (!context.validateTool(node.tool)) {
          errors.push({
            type: "error",
            code: "INVALID_TOOL",
            message: `Tool not found: ${node.tool}`,
            nodeId: node.id || "unknown"
          });
        }
      }
    }
  }
}
function formatValidationIssues(issues) {
  return issues.map((issue) => {
    const prefix = issue.type === "error" ? "\u274C" : "\u26A0\uFE0F";
    const location = issue.nodeId ? ` (node: ${issue.nodeId})` : "";
    return `${prefix} ${issue.message}${location}`;
  }).join("\n");
}

// document/variable-resolution.ts
function extractVariableDefinitions(nodes) {
  const definitions = /* @__PURE__ */ new Map();
  const seenNames = /* @__PURE__ */ new Set();
  let globalIndex = 0;
  for (const node of traverseNodes(nodes)) {
    if ("content" in node && Array.isArray(node.content)) {
      processContent(node.content, node.id);
    }
    if ("content" in node && node.content) {
      processContent(node.content, node.id);
    }
  }
  function processContent(content, blockId) {
    for (const item of content) {
      if (isVariable(item)) {
        if (!seenNames.has(item.name)) {
          seenNames.add(item.name);
          definitions.set(item.name, {
            name: item.name,
            prompt: item.prompt,
            firstOccurrenceBlockId: blockId,
            firstOccurrenceIndex: globalIndex++
          });
        }
      } else if ("content" in item && Array.isArray(item.content)) {
        processContent(item.content, blockId);
      }
    }
  }
  return Array.from(definitions.values());
}
function checkVariableRedeclaration(nodes) {
  const errors = [];
  const declarations = /* @__PURE__ */ new Map();
  for (const node of traverseNodes(nodes)) {
    const variables = extractVariablesFromNode(node);
    for (const variable of variables) {
      const existing = declarations.get(variable.name);
      if (existing) {
        if (variable.prompt && existing.prompt !== variable.prompt) {
          errors.push({
            name: variable.name,
            error: `Variable "${variable.name}" redeclared with different prompt. Original: "${existing.prompt}", New: "${variable.prompt}"`
          });
        }
      } else if (variable.prompt) {
        declarations.set(variable.name, {
          nodeId: node.id,
          prompt: variable.prompt
        });
      }
    }
  }
  return errors;
}
function extractVariablesFromNode(node) {
  const variables = [];
  function extractFromContent(content) {
    for (const item of content) {
      if (isVariable(item)) {
        variables.push(item);
      } else if ("content" in item && Array.isArray(item.content)) {
        extractFromContent(item.content);
      }
    }
  }
  if ("content" in node && Array.isArray(node.content)) {
    extractFromContent(node.content);
  }
  if ("content" in node && node.content) {
    extractFromContent(node.content);
  }
  return variables;
}
async function resolveVariables(definitions, context) {
  const variables = /* @__PURE__ */ new Map();
  const errors = [];
  for (const def of definitions) {
    try {
      const resolvedValue = await mockResolveVariable(def, context);
      variables.set(def.name, resolvedValue);
    } catch (error) {
      errors.push({
        variable: def.name,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  return { variables, errors: errors.length > 0 ? errors : void 0 };
}
async function mockResolveVariable(definition, context) {
  const contextLower = context.agentContext.toLowerCase();
  switch (definition.name) {
    case "searchQuery":
      if (contextLower.includes("ai breakthroughs")) {
        return "AI breakthroughs 2024";
      }
      if (contextLower.includes("machine learning")) {
        return "machine learning advances";
      }
      return "technology news";
    case "timeframe":
      if (contextLower.includes("past month") || contextLower.includes("last month")) {
        return "past month";
      }
      if (contextLower.includes("past week") || contextLower.includes("last week")) {
        return "past week";
      }
      return "recent";
    case "focusArea":
      if (contextLower.includes("practical")) {
        return "practical applications";
      }
      if (contextLower.includes("research")) {
        return "research developments";
      }
      return "general overview";
    default:
      if (definition.prompt) {
        return `Resolved: ${definition.name} (${definition.prompt})`;
      }
      return `Resolved: ${definition.name}`;
  }
}
function applyResolvedVariables(nodes, resolvedVariables) {
  const clonedNodes = JSON.parse(JSON.stringify(nodes));
  for (const node of traverseNodes(clonedNodes)) {
    if ("content" in node && Array.isArray(node.content)) {
      node.content = applyToContent(node.content);
    }
    if ("content" in node && node.content) {
      node.content = applyToContent(node.content);
    }
  }
  function applyToContent(content) {
    return content.map((item) => {
      if (isVariable(item)) {
        const resolvedValue = resolvedVariables.get(item.name);
        if (resolvedValue !== void 0) {
          return {
            ...item,
            resolvedValue
          };
        }
      } else if ("content" in item && Array.isArray(item.content)) {
        return {
          ...item,
          content: applyToContent(item.content)
        };
      }
      return item;
    });
  }
  return clonedNodes;
}
function interpolateContent(content, resolvedVariables) {
  let result = "";
  for (const item of content) {
    if (item.type === "text") {
      result += item.text;
    } else if (isVariable(item)) {
      const value = resolvedVariables.get(item.name);
      result += value || `{{${item.name}}}`;
    } else if ("content" in item && Array.isArray(item.content)) {
      result += interpolateContent(item.content, resolvedVariables);
    }
  }
  return result;
}

// document/custom-tool-executor.ts
async function executeCustomTool(toolNode, options) {
  const startTime = Date.now();
  if (toolNode.type !== "tool") {
    throw new Error("Node is not a tool");
  }
  const toolName = toolNode.props?.title || "Unnamed Tool";
  const definitionNodes = toolNode.children || [];
  const redeclarationErrors = checkVariableRedeclaration(definitionNodes);
  if (redeclarationErrors.length > 0) {
    throw new Error(
      `Variable redeclaration errors: ${redeclarationErrors.map((e) => e.error).join("; ")}`
    );
  }
  const variableDefinitions = extractVariableDefinitions(definitionNodes);
  const resolutionContext = {
    agentContext: options.agentContext,
    inheritedContext: options.inheritedContext
  };
  const resolutionResult = await resolveVariables(variableDefinitions, resolutionContext);
  if (resolutionResult.errors) {
    console.warn("Variable resolution errors:", resolutionResult.errors);
  }
  const nodesWithVariables = applyResolvedVariables(
    definitionNodes,
    resolutionResult.variables
  );
  const interpolatedNodes = interpolateExecutableNodes(
    nodesWithVariables,
    resolutionResult.variables
  );
  const executionDocument = {
    id: `tool-exec-${Date.now()}`,
    nodes: interpolatedNodes
  };
  const executor = new DocumentExecutor(options);
  const report = await executor.execute({
    mode: "document",
    document: executionDocument,
    options
  });
  const executionContext = {
    variables: resolutionResult.variables,
    nodes: report.nodes,
    metadata: {
      toolName,
      duration: Date.now() - startTime,
      nodesExecuted: report.metadata.nodesExecuted,
      nodesSucceeded: report.metadata.nodesSucceeded,
      nodesFailed: report.metadata.nodesFailed
    },
    toolDefinition: toolNode
  };
  return executionContext;
}
function interpolateExecutableNodes(nodes, resolvedVariables) {
  return nodes.map((node) => {
    if (isExecutableNode(node) && node.content) {
      const interpolatedContent = interpolateContent(
        node.content,
        resolvedVariables
      );
      return {
        ...node,
        content: [{
          type: "text",
          text: interpolatedContent
        }]
      };
    }
    if ("children" in node && node.children) {
      return {
        ...node,
        children: interpolateExecutableNodes(node.children, resolvedVariables)
      };
    }
    return node;
  });
}
function extractRelevantResult(context, extractionHint) {
  const results = Array.from(context.nodes.values());
  const lastSuccess = results.reverse().find((r) => r.success);
  if (lastSuccess) {
    return lastSuccess.data;
  }
  const errors = results.filter((r) => !r.success).map((r) => r.error?.message || "Unknown error");
  return {
    success: false,
    errors,
    toolName: context.metadata.toolName
  };
}
function parseCustomTool(document) {
  for (const node of document.nodes) {
    if ("type" in node && node.type === "tool") {
      return node;
    }
  }
  return null;
}

// document/diff-applier.ts
import { v4 as uuidv42 } from "uuid";
function applyDiff(nodes, operations) {
  try {
    let result = [...nodes];
    for (const operation of operations) {
      switch (operation.type) {
        case "edit:attr":
          result = applyEditAttr(result, operation);
          break;
        case "edit:content":
          result = applyEditContent(result, operation);
          break;
        case "edit:params":
          result = applyEditParams(result, operation);
          break;
        case "edit:id":
          result = applyEditId(result, operation);
          break;
        case "insert":
          result = applyInsert(result, operation);
          break;
        case "delete":
          result = applyDelete(result, operation);
          break;
        case "replace":
          result = applyReplace(result, operation);
          break;
        case "move":
          result = applyMove(result, operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    }
    return { success: true, nodes: result };
  } catch (error) {
    return {
      success: false,
      nodes,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function applyEditAttr(nodes, op) {
  let found = false;
  const result = nodes.map((node) => {
    if (node.id === op.blockId) {
      found = true;
      return {
        ...node,
        props: { ...node.props || {}, [op.name]: op.value }
      };
    }
    if ("children" in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditAttr(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    return node;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyEditContent(nodes, op) {
  let found = false;
  const result = nodes.map((node) => {
    if (node.id === op.blockId) {
      found = true;
      if ("content" in node) {
        const trimmedContent = trimContent(op.content);
        return { ...node, content: trimmedContent };
      } else {
        throw new Error(`Block ${op.blockId} does not have editable content`);
      }
    }
    if ("children" in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditContent(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    return node;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyEditParams(nodes, op) {
  let found = false;
  const result = nodes.map((node) => {
    if (node.id === op.blockId) {
      found = true;
      if ("parameters" in node) {
        return { ...node, parameters: op.params };
      } else {
        throw new Error(`Block ${op.blockId} is not an executable node`);
      }
    }
    if ("children" in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditParams(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    return node;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyEditId(nodes, op) {
  let found = false;
  const result = nodes.map((node) => {
    if (node.id === op.blockId) {
      found = true;
      return { ...node, id: op.newId };
    }
    if ("children" in node && node.children && node.children.length > 0) {
      const updatedChildren = applyEditId(node.children, op);
      if (!found && updatedChildren !== node.children) {
        found = true;
      }
      return { ...node, children: updatedChildren };
    }
    return node;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyInsert(nodes, op) {
  const positionCount = [op.atStart, op.atEnd, op.afterBlockId, op.beforeBlockId].filter(Boolean).length;
  if (positionCount !== 1) {
    throw new Error("Insert operation must specify exactly one position");
  }
  const blocksToInsert = op.blocks.map((block) => ({
    ...block,
    id: block.id || uuidv42()
  }));
  if (op.atStart) {
    return [...blocksToInsert, ...nodes];
  }
  if (op.atEnd) {
    return [...nodes, ...blocksToInsert];
  }
  const result = [];
  let inserted = false;
  for (const node of nodes) {
    if (op.beforeBlockId && node.id === op.beforeBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }
    result.push(node);
    if (op.afterBlockId && node.id === op.afterBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }
  }
  if (!inserted) {
    throw new Error(`Could not find anchor block for insert operation`);
  }
  return result;
}
function applyDelete(nodes, op) {
  return nodes.filter((node) => node.id !== op.blockId).map((node) => {
    if ("children" in node && node.children && node.children.length > 0) {
      return { ...node, children: applyDelete(node.children, op) };
    }
    return node;
  });
}
function applyReplace(nodes, op) {
  const replacementBlocks = op.blocks.map((block, index) => {
    const newId = op.blocks.length === 1 && index === 0 ? op.blockId : block.id || uuidv42();
    return {
      ...block,
      id: newId
    };
  });
  const result = [];
  let replaced = false;
  for (const node of nodes) {
    if (node.id === op.blockId) {
      result.push(...replacementBlocks);
      replaced = true;
    } else {
      result.push(node);
    }
  }
  if (!replaced) {
    throw new Error(`Could not find block ${op.blockId} to replace`);
  }
  return result;
}
function applyMove(nodes, op) {
  let blocksToMove = [];
  let remainingNodes = [];
  if (op.blockId) {
    const blockToMove = findNodeById(nodes, op.blockId);
    if (!blockToMove) {
      throw new Error(`Block not found: ${op.blockId}`);
    }
    blocksToMove = [blockToMove];
    remainingNodes = nodes.filter((n) => n.id !== op.blockId);
  } else if (op.blockIds) {
    for (const id of op.blockIds) {
      const block = findNodeById(nodes, id);
      if (!block) {
        throw new Error(`Block not found: ${id}`);
      }
      blocksToMove.push(block);
    }
    remainingNodes = nodes.filter((n) => !op.blockIds.includes(n.id));
  } else if (op.fromBlockId && op.toBlockId) {
    const fromIndex = nodes.findIndex((n) => n.id === op.fromBlockId);
    const toIndex = nodes.findIndex((n) => n.id === op.toBlockId);
    if (fromIndex === -1) {
      throw new Error(`Block not found: ${op.fromBlockId}`);
    }
    if (toIndex === -1) {
      throw new Error(`Block not found: ${op.toBlockId}`);
    }
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    blocksToMove = nodes.slice(startIndex, endIndex + 1);
    remainingNodes = [
      ...nodes.slice(0, startIndex),
      ...nodes.slice(endIndex + 1)
    ];
  } else {
    throw new Error("Move operation must specify blockId, blockIds, or fromBlockId/toBlockId");
  }
  const insertOp = {
    type: "insert",
    afterBlockId: op.afterBlockId,
    beforeBlockId: op.beforeBlockId,
    atStart: op.atStart,
    atEnd: op.atEnd,
    blocks: blocksToMove
  };
  return applyInsert(remainingNodes, insertOp);
}
function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    if ("children" in node && node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
function trimContent(content) {
  if (!content || content.length === 0) {
    return content || [];
  }
  const result = content.filter((item) => item != null).map((item) => {
    if (!item || typeof item !== "object") {
      console.warn("Invalid content item:", item);
      return null;
    }
    if (item.type === "text" && "text" in item) {
      const text = String(item.text || "").trim();
      return {
        ...item,
        text
      };
    }
    return item;
  }).filter((item) => item != null);
  return result.filter((item) => {
    if (item && item.type === "text") {
      return item.text && item.text.length > 0;
    }
    return true;
  });
}

// agent/agent.ts
import { generateText, streamText } from "ai";

// agent/memory.ts
import { formatDistanceToNow } from "date-fns";
var ActivityMemory = class {
  activities = [];
  maxSize;
  constructor(maxSize = 20) {
    this.maxSize = maxSize;
  }
  /**
   * Add an activity record
   */
  add(activity) {
    const record = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date()
    };
    this.activities.unshift(record);
    if (this.activities.length > this.maxSize) {
      this.activities = this.activities.slice(0, this.maxSize);
    }
    return record;
  }
  /**
   * Get recent activities
   */
  getRecent(limit) {
    return limit ? this.activities.slice(0, limit) : this.activities;
  }
  /**
   * Clear all activities
   */
  clear() {
    this.activities = [];
  }
  /**
   * Format activities as memory context for agent
   */
  formatForPrompt(limit = 10) {
    const recent = this.getRecent(limit);
    if (recent.length === 0) {
      return "";
    }
    const formatted = recent.map((activity) => {
      const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });
      const parts = [`[${timeAgo}] ${activity.type}`];
      if (activity.userMessage) {
        parts.push(`User: "${activity.userMessage.substring(0, 100)}${activity.userMessage.length > 100 ? "..." : ""}"`);
      }
      if (activity.assistantMessage) {
        parts.push(`Assistant: "${activity.assistantMessage.substring(0, 100)}${activity.assistantMessage.length > 100 ? "..." : ""}"`);
      }
      if (activity.toolCalls && activity.toolCalls.length > 0) {
        parts.push(`Tools: ${activity.toolCalls.map((tc) => tc.name).join(", ")}`);
      }
      if (activity.error) {
        parts.push(`Error: ${activity.error}`);
      }
      return parts.join(" | ");
    }).join("\n");
    return `<recent_activity>
${formatted}
</recent_activity>`;
  }
  /**
   * Get activities as JSON
   */
  toJSON() {
    return this.activities;
  }
};

// agent/agent.ts
import { v4 as uuidv43 } from "uuid";

// agent/system-prompt.ts
function buildSystemPrompt(agent, availableTools) {
  const sections = [];
  sections.push(`You are ${agent.name || "an AI assistant"}.`);
  if (agent.description) {
    sections.push(agent.description);
  }
  sections.push(`
Model: ${agent.model || "default"}`);
  if (availableTools.length > 0) {
    sections.push(`
Available tools:
${availableTools.map((t) => `- ${t}`).join("\n")}`);
  }
  const instructions = [];
  const customTools = [];
  const triggers = [];
  for (const node of agent.nodes) {
    if (node.type === "tool") {
      const title = node.props?.title || "Untitled Tool";
      customTools.push(`Custom tool: ${title}`);
    } else if (node.type === "trigger") {
      const trigger = node.props?.trigger;
      if (trigger) {
        triggers.push(`Trigger: ${trigger}`);
      }
    } else if ("content" in node && node.content) {
      const text = extractTextFromBlock(node);
      if (text) {
        instructions.push(text);
      }
    }
  }
  if (customTools.length > 0) {
    sections.push(`
Custom tools defined:
${customTools.join("\n")}`);
  }
  if (triggers.length > 0) {
    sections.push(`
Triggers configured:
${triggers.join("\n")}`);
  }
  if (instructions.length > 0) {
    sections.push(`
Instructions:
${instructions.join("\n\n")}`);
  }
  sections.push(`
When working with documents, use the Idyllic XML format.`);
  return sections.join("\n");
}
function extractTextFromBlock(node) {
  if (!("content" in node) || !node.content) {
    return "";
  }
  const texts = [];
  for (const content of node.content) {
    if (isTextContent(content)) {
      texts.push(content.text);
    }
  }
  return texts.join("");
}
function buildDetailedSystemPrompt(agent, availableTools, includeMemory) {
  let prompt = buildSystemPrompt(agent, availableTools);
  if (includeMemory) {
    prompt = `${prompt}

${includeMemory}`;
  }
  prompt += `

<document_format>
Documents are structured using XML with blocks like:
- <p> for paragraphs
- <h1>, <h2>, etc. for headings
- <fncall idyll-tool="..."> for tool execution
- <variable name="..." /> for variables
- <mention:type id="...">label</mention:type> for references
</document_format>`;
  return prompt;
}

// agent/custom-tools.ts
import { z as z3 } from "zod";
function extractCustomTools(agentDoc, baseTools, getAgentContext) {
  const customTools = {};
  console.log("\u{1F50D} Extracting custom tools from agent document...");
  for (const block of agentDoc.nodes) {
    if (block.type === "tool" && "props" in block) {
      console.log("\u{1F4E6} Found tool block:", JSON.stringify(block, null, 2));
      const title = block.props?.title || "Untitled Tool";
      const icon = block.props?.icon;
      const description = extractTextContent2(block);
      const definitionBlocks = extractToolDefinitionBlocks(block);
      if (definitionBlocks.length === 0) {
        console.warn(`Tool "${title}" has no definition blocks`);
        continue;
      }
      const toolName = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      customTools[`custom:${toolName}`] = {
        description: description || `Custom tool: ${title}`,
        schema: z3.object({
          context: z3.string().describe("Relevant context to help resolve any variables in the tool").optional()
        }),
        execute: async (params, content, context) => {
          console.log(`\u{1F6E0}\uFE0F Executing custom tool: ${title}`);
          const toolDoc = {
            id: `custom-tool-${toolName}`,
            nodes: definitionBlocks
          };
          const customToolBlock = {
            id: context.currentNodeId || "custom-tool-exec",
            type: "tool",
            content: [],
            children: definitionBlocks,
            props: { title, icon }
          };
          let agentContext = "";
          if (params.context) {
            agentContext = params.context;
          } else if (content) {
            agentContext = content;
          } else if (getAgentContext) {
            agentContext = getAgentContext();
          } else {
            agentContext = `Tool invoked: ${title}`;
          }
          console.log(`\u{1F4DD} Agent context for variable resolution: "${agentContext}"`);
          console.log(`\u{1F4E6} Params:`, params);
          console.log(`\u{1F4C4} Content:`, content);
          console.log(`\u{1F50D} GetAgentContext available:`, !!getAgentContext);
          try {
            const executionContext = await executeCustomTool(customToolBlock, {
              tools: baseTools,
              agentContext
            });
            const lastNodeId = Array.from(executionContext.nodes.keys()).pop();
            const lastResult = lastNodeId ? executionContext.nodes.get(lastNodeId) : void 0;
            console.log(`\u{1F50D} Execution complete. Last node ID: ${lastNodeId}`);
            console.log(`\u{1F4CB} Last result:`, lastResult);
            console.log(`\u{1F4CA} All nodes:`, Array.from(executionContext.nodes.entries()));
            const results = Array.from(executionContext.nodes.values());
            const successfulResults = results.filter((r) => r.success);
            const failedResults = results.filter((r) => !r.success);
            console.log(`\u{1F4CA} Execution summary: ${successfulResults.length} successful, ${failedResults.length} failed`);
            if (successfulResults.length > 0) {
              console.log(`\u{1F4E6} Returning full ToolExecutionContext for compression`);
              return executionContext;
            }
            if (lastResult && !lastResult.success) {
              const errorMsg = typeof lastResult.error === "string" ? lastResult.error : JSON.stringify(lastResult.error) || "Tool execution failed";
              throw new Error(errorMsg);
            }
            return executionContext;
          } catch (error) {
            console.error(`\u274C Custom tool "${title}" failed:`, error);
            throw error;
          }
        }
      };
    }
  }
  return customTools;
}
function extractTextContent2(block) {
  if (!("content" in block) || !block.content) {
    return "";
  }
  const texts = [];
  for (const content of block.content) {
    if (content.type === "text") {
      texts.push(content.text);
    }
  }
  return texts.join("").trim();
}
function extractToolDefinitionBlocks(toolBlock) {
  if (!("children" in toolBlock) || !toolBlock.children) {
    return [];
  }
  const definitionBlocks = [];
  for (const child of toolBlock.children) {
    if ("type" in child) {
      if (child.type === "paragraph" || child.type === "function_call") {
        definitionBlocks.push(child);
      } else if ("children" in child && child.children) {
        definitionBlocks.push(...extractToolDefinitionBlocks(child));
      }
    }
  }
  return definitionBlocks;
}

// agent/response-compressor.ts
async function compressToolResponse(context) {
  if (!isComplexResponse(context.rawResponse)) {
    console.log(`\u{1F4E6} Response compressor: ${context.toolName} - No compression needed (simple response)`);
    return context.rawResponse;
  }
  console.log(`\u{1F5DC}\uFE0F  Response compressor: ${context.toolName} - Compressing verbose response...`);
  const conversationContext = context.recentMessages.slice(-3).map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n");
  const responseStr = formatResponse(context.rawResponse);
  const originalSize = JSON.stringify(context.rawResponse).length;
  if (typeof context.rawResponse === "string") {
    const isConversational = context.rawResponse.includes("?") || context.rawResponse.includes("I") || context.rawResponse.includes("you") || context.rawResponse.length > 50;
    if (isConversational) {
      const response = context.rawResponse.length > 1e3 ? context.rawResponse.substring(0, 1e3) + "... [truncated]" : context.rawResponse;
      console.log(`\u2705 Conversational response detected: ${originalSize} chars`);
      return response;
    }
    const compressed = context.rawResponse.length > 1e3 ? context.rawResponse.substring(0, 1e3) + "... [truncated]" : context.rawResponse;
    console.log(`\u2705 Response compressed: ${originalSize} \u2192 ${compressed.length} chars`);
    return compressed;
  }
  if (context.rawResponse && typeof context.rawResponse === "object") {
    if ("variables" in context.rawResponse && "nodes" in context.rawResponse) {
      const ctx = context.rawResponse;
      const summary = {
        success: ctx.metadata?.nodesSucceeded > 0,
        nodesExecuted: ctx.metadata?.nodesExecuted || 0,
        variables: Object.fromEntries(ctx.variables || /* @__PURE__ */ new Map()),
        errors: ctx.metadata?.nodesFailed > 0 ? "Some nodes failed" : null
      };
      console.log(`\u2705 Response compressed: ${originalSize} \u2192 ${JSON.stringify(summary).length} chars`);
      return summary;
    }
    console.log(`\u2705 Response kept as-is: ${originalSize} chars (not complex enough)`);
    return context.rawResponse;
  }
  return context.rawResponse;
}
function isComplexResponse(response) {
  if (typeof response === "string") {
    return response.length > 2e3;
  }
  if (response && typeof response === "object") {
    if ("variables" in response && "nodes" in response && "metadata" in response) {
      return true;
    }
  }
  const size = JSON.stringify(response).length;
  return size > 2e3;
}
function formatResponse(response) {
  if (response && typeof response === "object" && "nodes" in response) {
    const ctx = response;
    const parts = [];
    if (ctx.variables.size > 0) {
      parts.push("Variables resolved:");
      ctx.variables.forEach((value, key) => {
        parts.push(`  ${key}: ${value}`);
      });
    }
    if (ctx.nodes.size > 0) {
      parts.push("\nNode executions:");
      ctx.nodes.forEach((result, nodeId) => {
        if (result.success) {
          parts.push(`  \u2713 ${nodeId}: ${JSON.stringify(result.data)}`);
        } else {
          parts.push(`  \u2717 ${nodeId}: ${result.error}`);
        }
      });
    }
    if (ctx.metadata) {
      parts.push(`
Execution summary:`);
      parts.push(`  Tool: ${ctx.metadata.toolName}`);
      parts.push(`  Nodes executed: ${ctx.metadata.nodesExecuted}`);
      parts.push(`  Succeeded: ${ctx.metadata.nodesSucceeded}`);
      parts.push(`  Failed: ${ctx.metadata.nodesFailed}`);
    }
    return parts.join("\n");
  }
  return JSON.stringify(response, null, 2);
}

// agent/agent.ts
var Agent = class {
  program;
  model;
  tools;
  memory;
  context;
  aiTools = {};
  currentMessages = [];
  constructor(config) {
    this.program = config.program;
    this.model = config.model;
    this.tools = config.tools;
    this.memory = new ActivityMemory();
    this.context = {
      agentId: this.program.id,
      activities: []
    };
    this.initializeTools();
  }
  /**
   * Initialize tools for AI SDK
   */
  initializeTools() {
    const customTools = extractCustomTools(
      this.program,
      this.tools,
      () => {
        const lastUserMessage = this.currentMessages.filter((m) => m.role === "user").pop();
        return typeof lastUserMessage?.content === "string" ? lastUserMessage.content : JSON.stringify(lastUserMessage?.content || "");
      }
    );
    const allTools = mergeToolRegistries(this.tools, customTools);
    for (const [name, tool] of Object.entries(allTools)) {
      const aiToolName = toAzureFunctionName(name);
      this.aiTools[aiToolName] = {
        description: tool.description,
        parameters: tool.schema,
        execute: async (params) => {
          console.log(`\u{1F527} Executing tool: ${name}`);
          const context = {
            currentNodeId: uuidv43(),
            previousResults: /* @__PURE__ */ new Map(),
            document: { id: this.program.id, nodes: this.program.nodes }
          };
          try {
            const content = params.content || "";
            delete params.content;
            const result = await tool.execute(params, content, context);
            const isCustomTool = name.startsWith("custom:");
            const finalResult = isCustomTool ? await compressToolResponse({
              toolName: name,
              toolParams: params,
              toolContent: content,
              rawResponse: result,
              recentMessages: this.currentMessages.slice(-3)
            }) : result;
            if (isCustomTool) {
              console.log(`\u{1F3AF} Custom tool ${name} executed and compressed`);
            }
            this.memory.add({
              type: "tool",
              toolCalls: [
                {
                  name,
                  args: params,
                  result: finalResult
                }
              ]
            });
            return finalResult;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            this.memory.add({
              type: "tool",
              toolCalls: [
                {
                  name,
                  args: params
                }
              ],
              error: errorMessage
            });
            throw error;
          }
        }
      };
    }
  }
  /**
   * Get the system prompt with memory injection
   */
  getSystemPrompt() {
    const memoryContext = this.memory.formatForPrompt();
    const toolNames = Object.keys(this.aiTools);
    return buildDetailedSystemPrompt(
      this.program,
      toolNames,
      memoryContext
    );
  }
  /**
   * Execute a chat message (non-streaming)
   */
  async chat(messages, options) {
    this.currentMessages = messages;
    const userMessage = messages[messages.length - 1]?.content;
    try {
      const activity = this.memory.add({
        type: "chat",
        userMessage: typeof userMessage === "string" ? userMessage : JSON.stringify(userMessage)
      });
      const result = await generateText({
        model: this.model,
        system: this.getSystemPrompt(),
        messages,
        tools: this.aiTools,
        toolChoice: "auto",
        maxSteps: options?.maxSteps ?? 10,
        temperature: options?.temperature ?? 0.7
      });
      activity.assistantMessage = result.text;
      activity.usage = result.usage;
      if (result.toolCalls && result.toolCalls.length > 0) {
        activity.toolCalls = result.toolCalls.map((tc) => ({
          name: tc.toolName,
          args: tc.args
        }));
      }
      return {
        message: {
          id: uuidv43(),
          role: "assistant",
          content: result.text,
          createdAt: /* @__PURE__ */ new Date()
        },
        usage: result.usage,
        finishReason: result.finishReason
      };
    } catch (error) {
      this.memory.add({
        type: "chat",
        userMessage: typeof userMessage === "string" ? userMessage : JSON.stringify(userMessage),
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Execute a chat message (streaming)
   * Returns streamText result that can be used with toDataStreamResponse()
   */
  async chatStream(messages, options) {
    const userMessage = messages[messages.length - 1]?.content;
    try {
      const activity = this.memory.add({
        type: "chat",
        userMessage: typeof userMessage === "string" ? userMessage : JSON.stringify(userMessage)
      });
      const result = await streamText({
        model: this.model,
        system: this.getSystemPrompt(),
        messages,
        tools: this.aiTools,
        maxSteps: options?.maxSteps ?? 10,
        temperature: options?.temperature ?? 0.7,
        onChunk: async ({ chunk }) => {
          if (chunk.type === "text-delta" && options?.onChunk) {
            options.onChunk(chunk.textDelta);
          }
          if (chunk.type === "tool-call" && options?.onToolCall) {
            const originalToolName = fromAzureFunctionName(chunk.toolName);
            options.onToolCall(originalToolName, chunk.args);
          }
        },
        onFinish: async ({ text, toolCalls, usage, finishReason }) => {
          activity.assistantMessage = text;
          if (toolCalls && toolCalls.length > 0) {
            activity.toolCalls = toolCalls.map((tc) => ({
              name: fromAzureFunctionName(tc.toolName),
              args: tc.args
            }));
          }
          if (options?.onFinish) {
            await options.onFinish({
              text,
              toolCalls: toolCalls?.map((tc) => ({
                ...tc,
                toolName: fromAzureFunctionName(tc.toolName)
              })),
              usage,
              finishReason
            });
          }
        }
      });
      return result;
    } catch (error) {
      this.memory.add({
        type: "chat",
        userMessage: typeof userMessage === "string" ? userMessage : JSON.stringify(userMessage),
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  /**
   * Get memory/activity history
   */
  getMemory() {
    return this.memory;
  }
  /**
   * Get agent context
   */
  getContext() {
    return {
      ...this.context,
      activities: this.memory.toJSON()
    };
  }
  /**
   * Clear memory
   */
  clearMemory() {
    this.memory.clear();
  }
};
export {
  ActivityMemory,
  Agent,
  DocumentExecutor,
  GRAMMAR,
  GrammarCompiler,
  applyDiff,
  applyResolvedVariables,
  buildDetailedSystemPrompt,
  buildSystemPrompt,
  buildToolName,
  checkVariableRedeclaration,
  createSimpleRegistry,
  createToolRegistry,
  defineTool,
  executeCustomTool,
  extractMentions,
  extractRelevantResult,
  extractVariableDefinitions,
  extractVariables,
  findNode,
  formatValidationIssues,
  fromAzureFunctionName,
  getExecutableNodes,
  interpolateContent,
  isContentNode,
  isExecutableNode,
  isMention,
  isTextContent,
  isVariable,
  mergeToolRegistries,
  parseCustomTool,
  parseToolName,
  parseXmlToAst,
  resolveVariables,
  serializeAstToXml,
  toAzureFunctionName,
  traverseNodes,
  validateDocument,
  validateToolName
};
//# sourceMappingURL=index.js.map