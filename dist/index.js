var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name17 in all)
    __defProp(target, name17, { get: all[name17], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// document/ast.ts
function isContentBlock(block) {
  return !isExecutableBlock(block);
}
function isExecutableBlock(block) {
  return block.type === "function_call" || block.type === "trigger";
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
function* traverseBlocks(blocks) {
  for (const block of blocks) {
    yield block;
    if ("children" in block && block.children) {
      yield* traverseBlocks(block.children);
    }
  }
}
function findBlock(blocks, id) {
  for (const block of traverseBlocks(blocks)) {
    if (block.id === id) {
      return block;
    }
  }
  return void 0;
}
function getExecutableBlocks(blocks) {
  const executable = [];
  for (const block of traverseBlocks(blocks)) {
    if (isExecutableBlock(block)) {
      executable.push(block);
    }
  }
  return executable;
}
function extractMentions(blocks) {
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
  for (const block of traverseBlocks(blocks)) {
    if ("content" in block && Array.isArray(block.content)) {
      extractFromContent(block.content);
    }
    if (isExecutableBlock(block) && block.instructions) {
      extractFromContent(block.instructions);
    }
  }
  return mentions;
}
function extractVariables(blocks) {
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
  for (const block of traverseBlocks(blocks)) {
    if ("content" in block && Array.isArray(block.content)) {
      extractFromContent(block.content);
    }
    if (isExecutableBlock(block) && block.instructions) {
      extractFromContent(block.instructions);
    }
  }
  return variables;
}
var init_ast = __esm({
  "document/ast.ts"() {
    "use strict";
  }
});

// types.ts
var IdyllEngineError, ParseError;
var init_types = __esm({
  "types.ts"() {
    "use strict";
    IdyllEngineError = class extends Error {
      constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "IdyllEngineError";
      }
    };
    ParseError = class extends IdyllEngineError {
      constructor(message, details) {
        super(message, "PARSE_ERROR", details);
        this.name = "ParseError";
      }
    };
  }
});

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
function ref(name17) {
  return { type: "ref", name: name17 };
}
var zeroOrMore, oneOrMore;
var init_grammar_dsl = __esm({
  "document/grammars/grammar-dsl.ts"() {
    "use strict";
    zeroOrMore = (rule) => repeat(rule, 0, null);
    oneOrMore = (rule) => repeat(rule, 1, null);
  }
});

// document/grammars/document-grammar.ts
var DOCUMENT_GRAMMAR;
var init_document_grammar = __esm({
  "document/grammars/document-grammar.ts"() {
    "use strict";
    init_grammar_dsl();
    DOCUMENT_GRAMMAR = {
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
  }
});

// document/grammars/agent-grammar.ts
var AGENT_GRAMMAR;
var init_agent_grammar = __esm({
  "document/grammars/agent-grammar.ts"() {
    "use strict";
    init_grammar_dsl();
    AGENT_GRAMMAR = {
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
  }
});

// document/grammars/diff-grammar.ts
var DIFF_GRAMMAR;
var init_diff_grammar = __esm({
  "document/grammars/diff-grammar.ts"() {
    "use strict";
    init_grammar_dsl();
    DIFF_GRAMMAR = {
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
  }
});

// document/grammars/index.ts
var GRAMMAR;
var init_grammars = __esm({
  "document/grammars/index.ts"() {
    "use strict";
    init_grammar_dsl();
    init_document_grammar();
    init_agent_grammar();
    init_diff_grammar();
    init_document_grammar();
    init_agent_grammar();
    init_diff_grammar();
    init_grammar_dsl();
    GRAMMAR = {
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
  }
});

// document/grammar.ts
var init_grammar = __esm({
  "document/grammar.ts"() {
    "use strict";
    init_grammars();
  }
});

// document/grammar-compiler.ts
var GrammarCompiler;
var init_grammar_compiler = __esm({
  "document/grammar-compiler.ts"() {
    "use strict";
    GrammarCompiler = class {
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
        for (const [name17, rule] of Object.entries(this.grammar)) {
          visit(name17, rule);
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
        for (const [name17, def] of Object.entries(schema)) {
          if (def.required && !(name17 in attrs)) {
            errors.push({
              type: "attribute",
              path: `${element}@${name17}`,
              message: `Required attribute missing: ${name17}`
            });
          }
        }
        for (const [name17, value] of Object.entries(attrs)) {
          const def = schema[name17];
          if (!def) continue;
          if (def.type === "enum" && def.values && !def.values.includes(value)) {
            errors.push({
              type: "attribute",
              path: `${element}@${name17}`,
              message: `Invalid value: must be one of ${def.values.join(", ")}`
            });
          }
          if (def.pattern && typeof value === "string" && !def.pattern.test(value)) {
            errors.push({
              type: "attribute",
              path: `${element}@${name17}`,
              message: `Invalid format for ${name17}`
            });
          }
          if (def.validate) {
            const error = def.validate(value);
            if (error) {
              errors.push({
                type: "attribute",
                path: `${element}@${name17}`,
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
  }
});

// document/parser-grammar.ts
var parser_grammar_exports = {};
__export(parser_grammar_exports, {
  parseXML: () => parseXML,
  parseXmlToAst: () => parseXmlToAst,
  serializeAstToXml: () => serializeAstToXml,
  serializeToXML: () => serializeToXML
});
import * as xml2js from "xml-js";
import { v4 as uuidv4 } from "uuid";
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
  const blocks = [];
  const childElements = documentElement.elements || [];
  for (const element of childElements) {
    if (element.type === "element" && element.name) {
      const block = parseBlock(element);
      if (block) {
        blocks.push(block);
      }
    }
  }
  return {
    id: documentId,
    blocks: blocks.length > 0 ? blocks : [createEmptyParagraph()],
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
  const blocks = [];
  const childElements = agentElement.elements || [];
  for (const element of childElements) {
    if (element.type === "element" && element.name) {
      const block = parseBlock(element);
      if (block) {
        blocks.push(block);
      }
    }
  }
  return {
    type: "agent",
    id: agentId,
    name: attrs.name,
    description: attrs.description,
    model: attrs.model,
    blocks
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
      const insertBlocks = [];
      for (const child of element.elements || []) {
        if (child.type === "element" && child.name) {
          const block = parseBlock(child);
          if (block) {
            insertBlocks.push(block);
          }
        }
      }
      return {
        type: "insert",
        afterBlockId: attrs["after-block-id"],
        beforeBlockId: attrs["before-block-id"],
        atStart: attrs["at-start"] === "true",
        atEnd: attrs["at-end"] === "true",
        blocks: insertBlocks
      };
    case "delete":
      return {
        type: "delete",
        blockId: attrs["block-id"]
      };
    case "replace":
      const replaceBlocks = [];
      for (const child of element.elements || []) {
        if (child.type === "element" && child.name) {
          const block = parseBlock(child);
          if (block) {
            replaceBlocks.push(block);
          }
        }
      }
      return {
        type: "replace",
        blockId: attrs["block-id"],
        blocks: replaceBlocks
      };
    default:
      console.warn(`Unknown edit operation: ${element.name}`);
      return null;
  }
}
function parseBlock(element) {
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
      return parseContentBlock(element, id, attrs, elementType);
  }
}
function parseFunctionCall(element, id, attrs) {
  const tool = attrs["idyll-tool"];
  let parameters = {};
  let instructions = [];
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
    instructions: instructions.length > 0 ? instructions : void 0,
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
  let instructions = [];
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
    instructions: instructions.length > 0 ? instructions : void 0,
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
              const block = parseBlock(defChild);
              if (block) {
                definition.push(block);
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
function parseContentBlock(element, id, attrs, blockType) {
  const content = parseRichContent(element);
  const children = [];
  for (const child of element.elements || []) {
    if (child.type === "element" && child.name) {
      const childType = compiled.elementToType[child.name];
      if (childType && compiled.blockTypes.has(childType)) {
        const childBlock = parseBlock(child);
        if (childBlock) {
          children.push(childBlock);
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
          content.push(...inlineElement);
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
    const name17 = element.attributes?.name;
    const prompt = element.attributes?.prompt;
    const value = element.attributes?.value;
    return {
      type: "variable",
      name: name17,
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
    elements: document.blocks.map(serializeBlock)
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
    elements: document.blocks.map(serializeBlock)
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
function serializeBlock(block) {
  if (isExecutableBlock(block)) {
    return serializeExecutableBlock(block);
  }
  if (block.type === "tool") {
    return serializeToolBlock(block);
  }
  return serializeContentBlock(block);
}
function serializeExecutableBlock(block) {
  const elements = [];
  if (Object.keys(block.parameters).length > 0) {
    elements.push({
      type: "element",
      name: "params",
      elements: [
        {
          type: "cdata",
          cdata: JSON.stringify(block.parameters)
        }
      ]
    });
  }
  if (block.instructions && block.instructions.length > 0) {
    elements.push({
      type: "element",
      name: "content",
      elements: serializeRichContent(block.instructions)
    });
  }
  if (block.type === "function_call") {
    if (block.result) {
      elements.push({
        type: "element",
        name: "result",
        elements: [
          {
            type: "cdata",
            cdata: JSON.stringify(block.result.data || block.result)
          }
        ]
      });
    }
    return {
      type: "element",
      name: "fncall",
      attributes: {
        id: block.id,
        "idyll-tool": block.tool,
        ...block.metadata?.modelId && { modelId: block.metadata.modelId }
      },
      elements
    };
  } else {
    return {
      type: "element",
      name: "trigger",
      attributes: {
        id: block.id,
        "idyll-trigger": block.tool,
        enabled: String(block.metadata?.enabled !== false)
      },
      elements
    };
  }
}
function serializeToolBlock(block) {
  const elements = [];
  const description = block.content.map((c) => isTextContent(c) ? c.text : "").join("");
  elements.push({
    type: "element",
    name: "tool:description",
    elements: [{ type: "text", text: description }]
  });
  if (block.children && block.children.length > 0) {
    elements.push({
      type: "element",
      name: "tool:definition",
      elements: block.children.map(serializeBlock)
    });
  }
  const attributes = {
    id: block.id,
    title: block.props?.title
  };
  if (block.props?.icon) {
    attributes.icon = block.props.icon;
  }
  return {
    type: "element",
    name: "tool",
    attributes,
    elements
  };
}
function serializeContentBlock(block) {
  const elements = [
    ...serializeRichContent(block.content),
    ...(block.children || []).map(serializeBlock)
  ];
  const typeToElement = Object.entries(compiled.elementToType).reduce(
    (acc, [elem, type]) => {
      if (!acc[type]) acc[type] = [];
      acc[type].push(elem);
      return acc;
    },
    {}
  );
  let elementName = typeToElement[block.type]?.[0] || "p";
  if (block.type === "heading" && block.props?.level) {
    elementName = `h${block.props.level}`;
  }
  return {
    type: "element",
    name: elementName,
    attributes: {
      id: block.id,
      ...block.props
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
        elements: operation.blocks.map(serializeBlock)
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
        elements: operation.blocks.map(serializeBlock)
      };
    default:
      throw new Error(`Unknown operation type`);
  }
}
var compiler, compiled, parseXML, serializeToXML;
var init_parser_grammar = __esm({
  "document/parser-grammar.ts"() {
    "use strict";
    init_ast();
    init_types();
    init_grammar();
    init_grammar_compiler();
    compiler = new GrammarCompiler(GRAMMAR);
    compiled = compiler.compile();
    parseXML = parseXmlToAst;
    serializeToXML = serializeAstToXml;
  }
});

// node_modules/@ai-sdk/openai/node_modules/@ai-sdk/provider/dist/index.mjs
function getErrorMessage(error) {
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}
var marker, symbol, _a, _AISDKError, AISDKError, name, marker2, symbol2, _a2, APICallError, name2, marker3, symbol3, _a3, EmptyResponseBodyError, name3, marker4, symbol4, _a4, InvalidArgumentError, name4, marker5, symbol5, _a5, InvalidPromptError, name5, marker6, symbol6, _a6, InvalidResponseDataError, name6, marker7, symbol7, _a7, JSONParseError, name7, marker8, symbol8, _a8, name8, marker9, symbol9, _a9, name9, marker10, symbol10, _a10, name10, marker11, symbol11, _a11, name11, marker12, symbol12, _a12, TooManyEmbeddingValuesForCallError, name12, marker13, symbol13, _a13, _TypeValidationError, TypeValidationError, name13, marker14, symbol14, _a14, UnsupportedFunctionalityError;
var init_dist = __esm({
  "node_modules/@ai-sdk/openai/node_modules/@ai-sdk/provider/dist/index.mjs"() {
    "use strict";
    marker = "vercel.ai.error";
    symbol = Symbol.for(marker);
    _AISDKError = class _AISDKError2 extends Error {
      /**
       * Creates an AI SDK Error.
       *
       * @param {Object} params - The parameters for creating the error.
       * @param {string} params.name - The name of the error.
       * @param {string} params.message - The error message.
       * @param {unknown} [params.cause] - The underlying cause of the error.
       */
      constructor({
        name: name142,
        message,
        cause
      }) {
        super(message);
        this[_a] = true;
        this.name = name142;
        this.cause = cause;
      }
      /**
       * Checks if the given error is an AI SDK Error.
       * @param {unknown} error - The error to check.
       * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
       */
      static isInstance(error) {
        return _AISDKError2.hasMarker(error, marker);
      }
      static hasMarker(error, marker152) {
        const markerSymbol = Symbol.for(marker152);
        return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
      }
    };
    _a = symbol;
    AISDKError = _AISDKError;
    name = "AI_APICallError";
    marker2 = `vercel.ai.error.${name}`;
    symbol2 = Symbol.for(marker2);
    APICallError = class extends AISDKError {
      constructor({
        message,
        url,
        requestBodyValues,
        statusCode,
        responseHeaders,
        responseBody,
        cause,
        isRetryable = statusCode != null && (statusCode === 408 || // request timeout
        statusCode === 409 || // conflict
        statusCode === 429 || // too many requests
        statusCode >= 500),
        // server error
        data
      }) {
        super({ name, message, cause });
        this[_a2] = true;
        this.url = url;
        this.requestBodyValues = requestBodyValues;
        this.statusCode = statusCode;
        this.responseHeaders = responseHeaders;
        this.responseBody = responseBody;
        this.isRetryable = isRetryable;
        this.data = data;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker2);
      }
    };
    _a2 = symbol2;
    name2 = "AI_EmptyResponseBodyError";
    marker3 = `vercel.ai.error.${name2}`;
    symbol3 = Symbol.for(marker3);
    EmptyResponseBodyError = class extends AISDKError {
      // used in isInstance
      constructor({ message = "Empty response body" } = {}) {
        super({ name: name2, message });
        this[_a3] = true;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker3);
      }
    };
    _a3 = symbol3;
    name3 = "AI_InvalidArgumentError";
    marker4 = `vercel.ai.error.${name3}`;
    symbol4 = Symbol.for(marker4);
    InvalidArgumentError = class extends AISDKError {
      constructor({
        message,
        cause,
        argument
      }) {
        super({ name: name3, message, cause });
        this[_a4] = true;
        this.argument = argument;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker4);
      }
    };
    _a4 = symbol4;
    name4 = "AI_InvalidPromptError";
    marker5 = `vercel.ai.error.${name4}`;
    symbol5 = Symbol.for(marker5);
    InvalidPromptError = class extends AISDKError {
      constructor({
        prompt,
        message,
        cause
      }) {
        super({ name: name4, message: `Invalid prompt: ${message}`, cause });
        this[_a5] = true;
        this.prompt = prompt;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker5);
      }
    };
    _a5 = symbol5;
    name5 = "AI_InvalidResponseDataError";
    marker6 = `vercel.ai.error.${name5}`;
    symbol6 = Symbol.for(marker6);
    InvalidResponseDataError = class extends AISDKError {
      constructor({
        data,
        message = `Invalid response data: ${JSON.stringify(data)}.`
      }) {
        super({ name: name5, message });
        this[_a6] = true;
        this.data = data;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker6);
      }
    };
    _a6 = symbol6;
    name6 = "AI_JSONParseError";
    marker7 = `vercel.ai.error.${name6}`;
    symbol7 = Symbol.for(marker7);
    JSONParseError = class extends AISDKError {
      constructor({ text, cause }) {
        super({
          name: name6,
          message: `JSON parsing failed: Text: ${text}.
Error message: ${getErrorMessage(cause)}`,
          cause
        });
        this[_a7] = true;
        this.text = text;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker7);
      }
    };
    _a7 = symbol7;
    name7 = "AI_LoadAPIKeyError";
    marker8 = `vercel.ai.error.${name7}`;
    symbol8 = Symbol.for(marker8);
    _a8 = symbol8;
    name8 = "AI_LoadSettingError";
    marker9 = `vercel.ai.error.${name8}`;
    symbol9 = Symbol.for(marker9);
    _a9 = symbol9;
    name9 = "AI_NoContentGeneratedError";
    marker10 = `vercel.ai.error.${name9}`;
    symbol10 = Symbol.for(marker10);
    _a10 = symbol10;
    name10 = "AI_NoSuchModelError";
    marker11 = `vercel.ai.error.${name10}`;
    symbol11 = Symbol.for(marker11);
    _a11 = symbol11;
    name11 = "AI_TooManyEmbeddingValuesForCallError";
    marker12 = `vercel.ai.error.${name11}`;
    symbol12 = Symbol.for(marker12);
    TooManyEmbeddingValuesForCallError = class extends AISDKError {
      constructor(options) {
        super({
          name: name11,
          message: `Too many values for a single embedding call. The ${options.provider} model "${options.modelId}" can only embed up to ${options.maxEmbeddingsPerCall} values per call, but ${options.values.length} values were provided.`
        });
        this[_a12] = true;
        this.provider = options.provider;
        this.modelId = options.modelId;
        this.maxEmbeddingsPerCall = options.maxEmbeddingsPerCall;
        this.values = options.values;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker12);
      }
    };
    _a12 = symbol12;
    name12 = "AI_TypeValidationError";
    marker13 = `vercel.ai.error.${name12}`;
    symbol13 = Symbol.for(marker13);
    _TypeValidationError = class _TypeValidationError2 extends AISDKError {
      constructor({ value, cause }) {
        super({
          name: name12,
          message: `Type validation failed: Value: ${JSON.stringify(value)}.
Error message: ${getErrorMessage(cause)}`,
          cause
        });
        this[_a13] = true;
        this.value = value;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker13);
      }
      /**
       * Wraps an error into a TypeValidationError.
       * If the cause is already a TypeValidationError with the same value, it returns the cause.
       * Otherwise, it creates a new TypeValidationError.
       *
       * @param {Object} params - The parameters for wrapping the error.
       * @param {unknown} params.value - The value that failed validation.
       * @param {unknown} params.cause - The original error or cause of the validation failure.
       * @returns {TypeValidationError} A TypeValidationError instance.
       */
      static wrap({
        value,
        cause
      }) {
        return _TypeValidationError2.isInstance(cause) && cause.value === value ? cause : new _TypeValidationError2({ value, cause });
      }
    };
    _a13 = symbol13;
    TypeValidationError = _TypeValidationError;
    name13 = "AI_UnsupportedFunctionalityError";
    marker14 = `vercel.ai.error.${name13}`;
    symbol14 = Symbol.for(marker14);
    UnsupportedFunctionalityError = class extends AISDKError {
      constructor({
        functionality,
        message = `'${functionality}' functionality not supported.`
      }) {
        super({ name: name13, message });
        this[_a14] = true;
        this.functionality = functionality;
      }
      static isInstance(error) {
        return AISDKError.hasMarker(error, marker14);
      }
    };
    _a14 = symbol14;
  }
});

// node_modules/nanoid/non-secure/index.js
var customAlphabet;
var init_non_secure = __esm({
  "node_modules/nanoid/non-secure/index.js"() {
    "use strict";
    customAlphabet = (alphabet, defaultSize = 21) => {
      return (size = defaultSize) => {
        let id = "";
        let i = size | 0;
        while (i--) {
          id += alphabet[Math.random() * alphabet.length | 0];
        }
        return id;
      };
    };
  }
});

// node_modules/secure-json-parse/index.js
var require_secure_json_parse = __commonJS({
  "node_modules/secure-json-parse/index.js"(exports, module) {
    "use strict";
    var hasBuffer = typeof Buffer !== "undefined";
    var suspectProtoRx = /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/;
    var suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
    function _parse(text, reviver, options) {
      if (options == null) {
        if (reviver !== null && typeof reviver === "object") {
          options = reviver;
          reviver = void 0;
        }
      }
      if (hasBuffer && Buffer.isBuffer(text)) {
        text = text.toString();
      }
      if (text && text.charCodeAt(0) === 65279) {
        text = text.slice(1);
      }
      const obj = JSON.parse(text, reviver);
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      const protoAction = options && options.protoAction || "error";
      const constructorAction = options && options.constructorAction || "error";
      if (protoAction === "ignore" && constructorAction === "ignore") {
        return obj;
      }
      if (protoAction !== "ignore" && constructorAction !== "ignore") {
        if (suspectProtoRx.test(text) === false && suspectConstructorRx.test(text) === false) {
          return obj;
        }
      } else if (protoAction !== "ignore" && constructorAction === "ignore") {
        if (suspectProtoRx.test(text) === false) {
          return obj;
        }
      } else {
        if (suspectConstructorRx.test(text) === false) {
          return obj;
        }
      }
      return filter(obj, { protoAction, constructorAction, safe: options && options.safe });
    }
    function filter(obj, { protoAction = "error", constructorAction = "error", safe } = {}) {
      let next = [obj];
      while (next.length) {
        const nodes = next;
        next = [];
        for (const node of nodes) {
          if (protoAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "__proto__")) {
            if (safe === true) {
              return null;
            } else if (protoAction === "error") {
              throw new SyntaxError("Object contains forbidden prototype property");
            }
            delete node.__proto__;
          }
          if (constructorAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "constructor") && Object.prototype.hasOwnProperty.call(node.constructor, "prototype")) {
            if (safe === true) {
              return null;
            } else if (constructorAction === "error") {
              throw new SyntaxError("Object contains forbidden prototype property");
            }
            delete node.constructor;
          }
          for (const key in node) {
            const value = node[key];
            if (value && typeof value === "object") {
              next.push(value);
            }
          }
        }
      }
      return obj;
    }
    function parse(text, reviver, options) {
      const stackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = 0;
      try {
        return _parse(text, reviver, options);
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    function safeParse(text, reviver) {
      const stackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = 0;
      try {
        return _parse(text, reviver, { safe: true });
      } catch (_e) {
        return null;
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    module.exports = parse;
    module.exports.default = parse;
    module.exports.parse = parse;
    module.exports.safeParse = safeParse;
    module.exports.scan = filter;
  }
});

// node_modules/@ai-sdk/openai/node_modules/@ai-sdk/provider-utils/dist/index.mjs
function combineHeaders(...headers) {
  return headers.reduce(
    (combinedHeaders, currentHeaders) => ({
      ...combinedHeaders,
      ...currentHeaders != null ? currentHeaders : {}
    }),
    {}
  );
}
function createEventSourceParserStream() {
  let buffer = "";
  let event = void 0;
  let data = [];
  let lastEventId = void 0;
  let retry = void 0;
  function parseLine(line, controller) {
    if (line === "") {
      dispatchEvent(controller);
      return;
    }
    if (line.startsWith(":")) {
      return;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      handleField(line, "");
      return;
    }
    const field = line.slice(0, colonIndex);
    const valueStart = colonIndex + 1;
    const value = valueStart < line.length && line[valueStart] === " " ? line.slice(valueStart + 1) : line.slice(valueStart);
    handleField(field, value);
  }
  function dispatchEvent(controller) {
    if (data.length > 0) {
      controller.enqueue({
        event,
        data: data.join("\n"),
        id: lastEventId,
        retry
      });
      data = [];
      event = void 0;
      retry = void 0;
    }
  }
  function handleField(field, value) {
    switch (field) {
      case "event":
        event = value;
        break;
      case "data":
        data.push(value);
        break;
      case "id":
        lastEventId = value;
        break;
      case "retry":
        const parsedRetry = parseInt(value, 10);
        if (!isNaN(parsedRetry)) {
          retry = parsedRetry;
        }
        break;
    }
  }
  return new TransformStream({
    transform(chunk, controller) {
      const { lines, incompleteLine } = splitLines(buffer, chunk);
      buffer = incompleteLine;
      for (let i = 0; i < lines.length; i++) {
        parseLine(lines[i], controller);
      }
    },
    flush(controller) {
      parseLine(buffer, controller);
      dispatchEvent(controller);
    }
  });
}
function splitLines(buffer, chunk) {
  const lines = [];
  let currentLine = buffer;
  for (let i = 0; i < chunk.length; ) {
    const char = chunk[i++];
    if (char === "\n") {
      lines.push(currentLine);
      currentLine = "";
    } else if (char === "\r") {
      lines.push(currentLine);
      currentLine = "";
      if (chunk[i] === "\n") {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  return { lines, incompleteLine: currentLine };
}
function extractResponseHeaders(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}
function removeUndefinedEntries(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([_key, value]) => value != null)
  );
}
function isAbortError(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
function validator(validate) {
  return { [validatorSymbol]: true, validate };
}
function isValidator(value) {
  return typeof value === "object" && value !== null && validatorSymbol in value && value[validatorSymbol] === true && "validate" in value;
}
function asValidator(value) {
  return isValidator(value) ? value : zodValidator(value);
}
function zodValidator(zodSchema) {
  return validator((value) => {
    const result = zodSchema.safeParse(value);
    return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
  });
}
function validateTypes({
  value,
  schema: inputSchema
}) {
  const result = safeValidateTypes({ value, schema: inputSchema });
  if (!result.success) {
    throw TypeValidationError.wrap({ value, cause: result.error });
  }
  return result.value;
}
function safeValidateTypes({
  value,
  schema
}) {
  const validator22 = asValidator(schema);
  try {
    if (validator22.validate == null) {
      return { success: true, value };
    }
    const result = validator22.validate(value);
    if (result.success) {
      return result;
    }
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: result.error })
    };
  } catch (error) {
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: error })
    };
  }
}
function parseJSON({
  text,
  schema
}) {
  try {
    const value = import_secure_json_parse.default.parse(text);
    if (schema == null) {
      return value;
    }
    return validateTypes({ value, schema });
  } catch (error) {
    if (JSONParseError.isInstance(error) || TypeValidationError.isInstance(error)) {
      throw error;
    }
    throw new JSONParseError({ text, cause: error });
  }
}
function safeParseJSON({
  text,
  schema
}) {
  try {
    const value = import_secure_json_parse.default.parse(text);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    const validationResult = safeValidateTypes({ value, schema });
    return validationResult.success ? { ...validationResult, rawValue: value } : validationResult;
  } catch (error) {
    return {
      success: false,
      error: JSONParseError.isInstance(error) ? error : new JSONParseError({ text, cause: error })
    };
  }
}
function isParsableJson(input) {
  try {
    import_secure_json_parse.default.parse(input);
    return true;
  } catch (e) {
    return false;
  }
}
function parseProviderOptions({
  provider,
  providerOptions,
  schema
}) {
  if ((providerOptions == null ? void 0 : providerOptions[provider]) == null) {
    return void 0;
  }
  const parsedProviderOptions = safeValidateTypes({
    value: providerOptions[provider],
    schema
  });
  if (!parsedProviderOptions.success) {
    throw new InvalidArgumentError({
      argument: "providerOptions",
      message: `invalid ${provider} provider options`,
      cause: parsedProviderOptions.error
    });
  }
  return parsedProviderOptions.value;
}
function convertBase64ToUint8Array(base64String) {
  const base64Url = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const latin1string = atob(base64Url);
  return Uint8Array.from(latin1string, (byte) => byte.codePointAt(0));
}
function convertUint8ArrayToBase64(array) {
  let latin1string = "";
  for (let i = 0; i < array.length; i++) {
    latin1string += String.fromCodePoint(array[i]);
  }
  return btoa(latin1string);
}
var import_secure_json_parse, createIdGenerator, generateId, validatorSymbol, getOriginalFetch2, postJsonToApi, postFormDataToApi, postToApi, createJsonErrorResponseHandler, createEventSourceResponseHandler, createJsonResponseHandler, btoa, atob;
var init_dist2 = __esm({
  "node_modules/@ai-sdk/openai/node_modules/@ai-sdk/provider-utils/dist/index.mjs"() {
    "use strict";
    init_dist();
    init_non_secure();
    init_dist();
    import_secure_json_parse = __toESM(require_secure_json_parse(), 1);
    init_dist();
    init_dist();
    init_dist();
    init_dist();
    createIdGenerator = ({
      prefix,
      size: defaultSize = 16,
      alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      separator = "-"
    } = {}) => {
      const generator = customAlphabet(alphabet, defaultSize);
      if (prefix == null) {
        return generator;
      }
      if (alphabet.includes(separator)) {
        throw new InvalidArgumentError({
          argument: "separator",
          message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
        });
      }
      return (size) => `${prefix}${separator}${generator(size)}`;
    };
    generateId = createIdGenerator();
    validatorSymbol = Symbol.for("vercel.ai.validator");
    getOriginalFetch2 = () => globalThis.fetch;
    postJsonToApi = async ({
      url,
      headers,
      body,
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    }) => postToApi({
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: {
        content: JSON.stringify(body),
        values: body
      },
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    });
    postFormDataToApi = async ({
      url,
      headers,
      formData,
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    }) => postToApi({
      url,
      headers,
      body: {
        content: formData,
        values: Object.fromEntries(formData.entries())
      },
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    });
    postToApi = async ({
      url,
      headers = {},
      body,
      successfulResponseHandler,
      failedResponseHandler,
      abortSignal,
      fetch: fetch2 = getOriginalFetch2()
    }) => {
      try {
        const response = await fetch2(url, {
          method: "POST",
          headers: removeUndefinedEntries(headers),
          body: body.content,
          signal: abortSignal
        });
        const responseHeaders = extractResponseHeaders(response);
        if (!response.ok) {
          let errorInformation;
          try {
            errorInformation = await failedResponseHandler({
              response,
              url,
              requestBodyValues: body.values
            });
          } catch (error) {
            if (isAbortError(error) || APICallError.isInstance(error)) {
              throw error;
            }
            throw new APICallError({
              message: "Failed to process error response",
              cause: error,
              statusCode: response.status,
              url,
              responseHeaders,
              requestBodyValues: body.values
            });
          }
          throw errorInformation.value;
        }
        try {
          return await successfulResponseHandler({
            response,
            url,
            requestBodyValues: body.values
          });
        } catch (error) {
          if (error instanceof Error) {
            if (isAbortError(error) || APICallError.isInstance(error)) {
              throw error;
            }
          }
          throw new APICallError({
            message: "Failed to process successful response",
            cause: error,
            statusCode: response.status,
            url,
            responseHeaders,
            requestBodyValues: body.values
          });
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        if (error instanceof TypeError && error.message === "fetch failed") {
          const cause = error.cause;
          if (cause != null) {
            throw new APICallError({
              message: `Cannot connect to API: ${cause.message}`,
              cause,
              url,
              requestBodyValues: body.values,
              isRetryable: true
              // retry when network error
            });
          }
        }
        throw error;
      }
    };
    createJsonErrorResponseHandler = ({
      errorSchema,
      errorToMessage,
      isRetryable
    }) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await response.text();
      const responseHeaders = extractResponseHeaders(response);
      if (responseBody.trim() === "") {
        return {
          responseHeaders,
          value: new APICallError({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
      try {
        const parsedError = parseJSON({
          text: responseBody,
          schema: errorSchema
        });
        return {
          responseHeaders,
          value: new APICallError({
            message: errorToMessage(parsedError),
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            data: parsedError,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response, parsedError)
          })
        };
      } catch (parseError) {
        return {
          responseHeaders,
          value: new APICallError({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
    };
    createEventSourceResponseHandler = (chunkSchema2) => async ({ response }) => {
      const responseHeaders = extractResponseHeaders(response);
      if (response.body == null) {
        throw new EmptyResponseBodyError({});
      }
      return {
        responseHeaders,
        value: response.body.pipeThrough(new TextDecoderStream()).pipeThrough(createEventSourceParserStream()).pipeThrough(
          new TransformStream({
            transform({ data }, controller) {
              if (data === "[DONE]") {
                return;
              }
              controller.enqueue(
                safeParseJSON({
                  text: data,
                  schema: chunkSchema2
                })
              );
            }
          })
        )
      };
    };
    createJsonResponseHandler = (responseSchema2) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await response.text();
      const parsedResult = safeParseJSON({
        text: responseBody,
        schema: responseSchema2
      });
      const responseHeaders = extractResponseHeaders(response);
      if (!parsedResult.success) {
        throw new APICallError({
          message: "Invalid JSON response",
          cause: parsedResult.error,
          statusCode: response.status,
          responseHeaders,
          responseBody,
          url,
          requestBodyValues
        });
      }
      return {
        responseHeaders,
        value: parsedResult.value,
        rawValue: parsedResult.rawValue
      };
    };
    ({ btoa, atob } = globalThis);
  }
});

// node_modules/@ai-sdk/openai/internal/dist/index.mjs
import { z as z22 } from "zod";
import { z as z3 } from "zod";
import { z as z32 } from "zod";
import { z as z4 } from "zod";
import { z as z5 } from "zod";
import { z as z6 } from "zod";
import { z as z7 } from "zod";
import { z as z8 } from "zod";
function convertToOpenAIChatMessages({
  prompt,
  useLegacyFunctionCalling = false,
  systemMessageMode = "system"
}) {
  const messages = [];
  const warnings = [];
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        switch (systemMessageMode) {
          case "system": {
            messages.push({ role: "system", content });
            break;
          }
          case "developer": {
            messages.push({ role: "developer", content });
            break;
          }
          case "remove": {
            warnings.push({
              type: "other",
              message: "system messages are removed for this model"
            });
            break;
          }
          default: {
            const _exhaustiveCheck = systemMessageMode;
            throw new Error(
              `Unsupported system message mode: ${_exhaustiveCheck}`
            );
          }
        }
        break;
      }
      case "user": {
        if (content.length === 1 && content[0].type === "text") {
          messages.push({ role: "user", content: content[0].text });
          break;
        }
        messages.push({
          role: "user",
          content: content.map((part, index) => {
            var _a18, _b, _c, _d;
            switch (part.type) {
              case "text": {
                return { type: "text", text: part.text };
              }
              case "image": {
                return {
                  type: "image_url",
                  image_url: {
                    url: part.image instanceof URL ? part.image.toString() : `data:${(_a18 = part.mimeType) != null ? _a18 : "image/jpeg"};base64,${convertUint8ArrayToBase64(part.image)}`,
                    // OpenAI specific extension: image detail
                    detail: (_c = (_b = part.providerMetadata) == null ? void 0 : _b.openai) == null ? void 0 : _c.imageDetail
                  }
                };
              }
              case "file": {
                if (part.data instanceof URL) {
                  throw new UnsupportedFunctionalityError({
                    functionality: "'File content parts with URL data' functionality not supported."
                  });
                }
                switch (part.mimeType) {
                  case "audio/wav": {
                    return {
                      type: "input_audio",
                      input_audio: { data: part.data, format: "wav" }
                    };
                  }
                  case "audio/mp3":
                  case "audio/mpeg": {
                    return {
                      type: "input_audio",
                      input_audio: { data: part.data, format: "mp3" }
                    };
                  }
                  case "application/pdf": {
                    return {
                      type: "file",
                      file: {
                        filename: (_d = part.filename) != null ? _d : `part-${index}.pdf`,
                        file_data: `data:application/pdf;base64,${part.data}`
                      }
                    };
                  }
                  default: {
                    throw new UnsupportedFunctionalityError({
                      functionality: `File content part type ${part.mimeType} in user messages`
                    });
                  }
                }
              }
            }
          })
        });
        break;
      }
      case "assistant": {
        let text = "";
        const toolCalls = [];
        for (const part of content) {
          switch (part.type) {
            case "text": {
              text += part.text;
              break;
            }
            case "tool-call": {
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.args)
                }
              });
              break;
            }
          }
        }
        if (useLegacyFunctionCalling) {
          if (toolCalls.length > 1) {
            throw new UnsupportedFunctionalityError({
              functionality: "useLegacyFunctionCalling with multiple tool calls in one message"
            });
          }
          messages.push({
            role: "assistant",
            content: text,
            function_call: toolCalls.length > 0 ? toolCalls[0].function : void 0
          });
        } else {
          messages.push({
            role: "assistant",
            content: text,
            tool_calls: toolCalls.length > 0 ? toolCalls : void 0
          });
        }
        break;
      }
      case "tool": {
        for (const toolResponse of content) {
          if (useLegacyFunctionCalling) {
            messages.push({
              role: "function",
              name: toolResponse.toolName,
              content: JSON.stringify(toolResponse.result)
            });
          } else {
            messages.push({
              role: "tool",
              tool_call_id: toolResponse.toolCallId,
              content: JSON.stringify(toolResponse.result)
            });
          }
        }
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return { messages, warnings };
}
function mapOpenAIChatLogProbsOutput(logprobs) {
  var _a18, _b;
  return (_b = (_a18 = logprobs == null ? void 0 : logprobs.content) == null ? void 0 : _a18.map(({ token, logprob, top_logprobs }) => ({
    token,
    logprob,
    topLogprobs: top_logprobs ? top_logprobs.map(({ token: token2, logprob: logprob2 }) => ({
      token: token2,
      logprob: logprob2
    })) : []
  }))) != null ? _b : void 0;
}
function mapOpenAIFinishReason(finishReason) {
  switch (finishReason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content-filter";
    case "function_call":
    case "tool_calls":
      return "tool-calls";
    default:
      return "unknown";
  }
}
function getResponseMetadata({
  id,
  model,
  created
}) {
  return {
    id: id != null ? id : void 0,
    modelId: model != null ? model : void 0,
    timestamp: created != null ? new Date(created * 1e3) : void 0
  };
}
function prepareTools({
  mode,
  useLegacyFunctionCalling = false,
  structuredOutputs
}) {
  var _a18;
  const tools = ((_a18 = mode.tools) == null ? void 0 : _a18.length) ? mode.tools : void 0;
  const toolWarnings = [];
  if (tools == null) {
    return { tools: void 0, tool_choice: void 0, toolWarnings };
  }
  const toolChoice = mode.toolChoice;
  if (useLegacyFunctionCalling) {
    const openaiFunctions = [];
    for (const tool of tools) {
      if (tool.type === "provider-defined") {
        toolWarnings.push({ type: "unsupported-tool", tool });
      } else {
        openaiFunctions.push({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        });
      }
    }
    if (toolChoice == null) {
      return {
        functions: openaiFunctions,
        function_call: void 0,
        toolWarnings
      };
    }
    const type2 = toolChoice.type;
    switch (type2) {
      case "auto":
      case "none":
      case void 0:
        return {
          functions: openaiFunctions,
          function_call: void 0,
          toolWarnings
        };
      case "required":
        throw new UnsupportedFunctionalityError({
          functionality: "useLegacyFunctionCalling and toolChoice: required"
        });
      default:
        return {
          functions: openaiFunctions,
          function_call: { name: toolChoice.toolName },
          toolWarnings
        };
    }
  }
  const openaiTools = [];
  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      openaiTools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          strict: structuredOutputs ? true : void 0
        }
      });
    }
  }
  if (toolChoice == null) {
    return { tools: openaiTools, tool_choice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: openaiTools, tool_choice: type, toolWarnings };
    case "tool":
      return {
        tools: openaiTools,
        tool_choice: {
          type: "function",
          function: {
            name: toolChoice.toolName
          }
        },
        toolWarnings
      };
    default: {
      const _exhaustiveCheck = type;
      throw new UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}
function isReasoningModel(modelId) {
  return modelId.startsWith("o");
}
function isAudioModel(modelId) {
  return modelId.startsWith("gpt-4o-audio-preview");
}
function getSystemMessageMode(modelId) {
  var _a18, _b;
  if (!isReasoningModel(modelId)) {
    return "system";
  }
  return (_b = (_a18 = reasoningModels[modelId]) == null ? void 0 : _a18.systemMessageMode) != null ? _b : "developer";
}
function convertToOpenAICompletionPrompt({
  prompt,
  inputFormat,
  user = "user",
  assistant = "assistant"
}) {
  if (inputFormat === "prompt" && prompt.length === 1 && prompt[0].role === "user" && prompt[0].content.length === 1 && prompt[0].content[0].type === "text") {
    return { prompt: prompt[0].content[0].text };
  }
  let text = "";
  if (prompt[0].role === "system") {
    text += `${prompt[0].content}

`;
    prompt = prompt.slice(1);
  }
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        throw new InvalidPromptError({
          message: "Unexpected system message in prompt: ${content}",
          prompt
        });
      }
      case "user": {
        const userMessage = content.map((part) => {
          switch (part.type) {
            case "text": {
              return part.text;
            }
            case "image": {
              throw new UnsupportedFunctionalityError({
                functionality: "images"
              });
            }
          }
        }).join("");
        text += `${user}:
${userMessage}

`;
        break;
      }
      case "assistant": {
        const assistantMessage = content.map((part) => {
          switch (part.type) {
            case "text": {
              return part.text;
            }
            case "tool-call": {
              throw new UnsupportedFunctionalityError({
                functionality: "tool-call messages"
              });
            }
          }
        }).join("");
        text += `${assistant}:
${assistantMessage}

`;
        break;
      }
      case "tool": {
        throw new UnsupportedFunctionalityError({
          functionality: "tool messages"
        });
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  text += `${assistant}:
`;
  return {
    prompt: text,
    stopSequences: [`
${user}:`]
  };
}
function mapOpenAICompletionLogProbs(logprobs) {
  return logprobs == null ? void 0 : logprobs.tokens.map((token, index) => ({
    token,
    logprob: logprobs.token_logprobs[index],
    topLogprobs: logprobs.top_logprobs ? Object.entries(logprobs.top_logprobs[index]).map(
      ([token2, logprob]) => ({
        token: token2,
        logprob
      })
    ) : []
  }));
}
function convertToOpenAIResponsesMessages({
  prompt,
  systemMessageMode
}) {
  const messages = [];
  const warnings = [];
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        switch (systemMessageMode) {
          case "system": {
            messages.push({ role: "system", content });
            break;
          }
          case "developer": {
            messages.push({ role: "developer", content });
            break;
          }
          case "remove": {
            warnings.push({
              type: "other",
              message: "system messages are removed for this model"
            });
            break;
          }
          default: {
            const _exhaustiveCheck = systemMessageMode;
            throw new Error(
              `Unsupported system message mode: ${_exhaustiveCheck}`
            );
          }
        }
        break;
      }
      case "user": {
        messages.push({
          role: "user",
          content: content.map((part, index) => {
            var _a18, _b, _c, _d;
            switch (part.type) {
              case "text": {
                return { type: "input_text", text: part.text };
              }
              case "image": {
                return {
                  type: "input_image",
                  image_url: part.image instanceof URL ? part.image.toString() : `data:${(_a18 = part.mimeType) != null ? _a18 : "image/jpeg"};base64,${convertUint8ArrayToBase64(part.image)}`,
                  // OpenAI specific extension: image detail
                  detail: (_c = (_b = part.providerMetadata) == null ? void 0 : _b.openai) == null ? void 0 : _c.imageDetail
                };
              }
              case "file": {
                if (part.data instanceof URL) {
                  throw new UnsupportedFunctionalityError({
                    functionality: "File URLs in user messages"
                  });
                }
                switch (part.mimeType) {
                  case "application/pdf": {
                    return {
                      type: "input_file",
                      filename: (_d = part.filename) != null ? _d : `part-${index}.pdf`,
                      file_data: `data:application/pdf;base64,${part.data}`
                    };
                  }
                  default: {
                    throw new UnsupportedFunctionalityError({
                      functionality: "Only PDF files are supported in user messages"
                    });
                  }
                }
              }
            }
          })
        });
        break;
      }
      case "assistant": {
        for (const part of content) {
          switch (part.type) {
            case "text": {
              messages.push({
                role: "assistant",
                content: [{ type: "output_text", text: part.text }]
              });
              break;
            }
            case "tool-call": {
              messages.push({
                type: "function_call",
                call_id: part.toolCallId,
                name: part.toolName,
                arguments: JSON.stringify(part.args)
              });
              break;
            }
          }
        }
        break;
      }
      case "tool": {
        for (const part of content) {
          messages.push({
            type: "function_call_output",
            call_id: part.toolCallId,
            output: JSON.stringify(part.result)
          });
        }
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return { messages, warnings };
}
function mapOpenAIResponseFinishReason({
  finishReason,
  hasToolCalls
}) {
  switch (finishReason) {
    case void 0:
    case null:
      return hasToolCalls ? "tool-calls" : "stop";
    case "max_output_tokens":
      return "length";
    case "content_filter":
      return "content-filter";
    default:
      return hasToolCalls ? "tool-calls" : "unknown";
  }
}
function prepareResponsesTools({
  mode,
  strict
}) {
  var _a18;
  const tools = ((_a18 = mode.tools) == null ? void 0 : _a18.length) ? mode.tools : void 0;
  const toolWarnings = [];
  if (tools == null) {
    return { tools: void 0, tool_choice: void 0, toolWarnings };
  }
  const toolChoice = mode.toolChoice;
  const openaiTools = [];
  for (const tool of tools) {
    switch (tool.type) {
      case "function":
        openaiTools.push({
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          strict: strict ? true : void 0
        });
        break;
      case "provider-defined":
        switch (tool.id) {
          case "openai.web_search_preview":
            openaiTools.push({
              type: "web_search_preview",
              search_context_size: tool.args.searchContextSize,
              user_location: tool.args.userLocation
            });
            break;
          default:
            toolWarnings.push({ type: "unsupported-tool", tool });
            break;
        }
        break;
      default:
        toolWarnings.push({ type: "unsupported-tool", tool });
        break;
    }
  }
  if (toolChoice == null) {
    return { tools: openaiTools, tool_choice: void 0, toolWarnings };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
    case "none":
    case "required":
      return { tools: openaiTools, tool_choice: type, toolWarnings };
    case "tool": {
      if (toolChoice.toolName === "web_search_preview") {
        return {
          tools: openaiTools,
          tool_choice: {
            type: "web_search_preview"
          },
          toolWarnings
        };
      }
      return {
        tools: openaiTools,
        tool_choice: {
          type: "function",
          name: toolChoice.toolName
        },
        toolWarnings
      };
    }
    default: {
      const _exhaustiveCheck = type;
      throw new UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}
function isTextDeltaChunk(chunk) {
  return chunk.type === "response.output_text.delta";
}
function isResponseOutputItemDoneChunk(chunk) {
  return chunk.type === "response.output_item.done";
}
function isResponseFinishedChunk(chunk) {
  return chunk.type === "response.completed" || chunk.type === "response.incomplete";
}
function isResponseCreatedChunk(chunk) {
  return chunk.type === "response.created";
}
function isResponseFunctionCallArgumentsDeltaChunk(chunk) {
  return chunk.type === "response.function_call_arguments.delta";
}
function isResponseOutputItemAddedChunk(chunk) {
  return chunk.type === "response.output_item.added";
}
function isResponseAnnotationAddedChunk(chunk) {
  return chunk.type === "response.output_text.annotation.added";
}
function isResponseReasoningSummaryTextDeltaChunk(chunk) {
  return chunk.type === "response.reasoning_summary_text.delta";
}
function isErrorChunk(chunk) {
  return chunk.type === "error";
}
function getResponsesModelConfig(modelId) {
  if (modelId.startsWith("o")) {
    if (modelId.startsWith("o1-mini") || modelId.startsWith("o1-preview")) {
      return {
        isReasoningModel: true,
        systemMessageMode: "remove",
        requiredAutoTruncation: false
      };
    }
    return {
      isReasoningModel: true,
      systemMessageMode: "developer",
      requiredAutoTruncation: false
    };
  }
  return {
    isReasoningModel: false,
    systemMessageMode: "system",
    requiredAutoTruncation: false
  };
}
var openaiErrorDataSchema, openaiFailedResponseHandler, OpenAIChatLanguageModel, openaiTokenUsageSchema, openaiChatResponseSchema, openaiChatChunkSchema, reasoningModels, OpenAICompletionLanguageModel, openaiCompletionResponseSchema, openaiCompletionChunkSchema, OpenAIEmbeddingModel, openaiTextEmbeddingResponseSchema, modelMaxImagesPerCall, hasDefaultResponseFormat, OpenAIImageModel, openaiImageResponseSchema, openAIProviderOptionsSchema, languageMap, OpenAITranscriptionModel, openaiTranscriptionResponseSchema, OpenAIProviderOptionsSchema, OpenAIResponsesLanguageModel, usageSchema, textDeltaChunkSchema, responseFinishedChunkSchema, responseCreatedChunkSchema, responseOutputItemDoneSchema, responseFunctionCallArgumentsDeltaSchema, responseOutputItemAddedSchema, responseAnnotationAddedSchema, responseReasoningSummaryTextDeltaSchema, errorChunkSchema, openaiResponsesChunkSchema, openaiResponsesProviderOptionsSchema;
var init_dist3 = __esm({
  "node_modules/@ai-sdk/openai/internal/dist/index.mjs"() {
    "use strict";
    init_dist();
    init_dist2();
    init_dist();
    init_dist2();
    init_dist2();
    init_dist();
    init_dist();
    init_dist2();
    init_dist();
    init_dist();
    init_dist2();
    init_dist2();
    init_dist2();
    init_dist();
    init_dist2();
    init_dist();
    init_dist2();
    init_dist();
    openaiErrorDataSchema = z3.object({
      error: z3.object({
        message: z3.string(),
        // The additional information below is handled loosely to support
        // OpenAI-compatible providers that have slightly different error
        // responses:
        type: z3.string().nullish(),
        param: z3.any().nullish(),
        code: z3.union([z3.string(), z3.number()]).nullish()
      })
    });
    openaiFailedResponseHandler = createJsonErrorResponseHandler({
      errorSchema: openaiErrorDataSchema,
      errorToMessage: (data) => data.error.message
    });
    OpenAIChatLanguageModel = class {
      constructor(modelId, settings, config) {
        this.specificationVersion = "v1";
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
      }
      get supportsStructuredOutputs() {
        var _a18;
        return (_a18 = this.settings.structuredOutputs) != null ? _a18 : isReasoningModel(this.modelId);
      }
      get defaultObjectGenerationMode() {
        if (isAudioModel(this.modelId)) {
          return "tool";
        }
        return this.supportsStructuredOutputs ? "json" : "tool";
      }
      get provider() {
        return this.config.provider;
      }
      get supportsImageUrls() {
        return !this.settings.downloadImages;
      }
      getArgs({
        mode,
        prompt,
        maxTokens,
        temperature,
        topP,
        topK,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
        responseFormat,
        seed,
        providerMetadata
      }) {
        var _a18, _b, _c, _d, _e, _f, _g, _h;
        const type = mode.type;
        const warnings = [];
        if (topK != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "topK"
          });
        }
        if ((responseFormat == null ? void 0 : responseFormat.type) === "json" && responseFormat.schema != null && !this.supportsStructuredOutputs) {
          warnings.push({
            type: "unsupported-setting",
            setting: "responseFormat",
            details: "JSON response format schema is only supported with structuredOutputs"
          });
        }
        const useLegacyFunctionCalling = this.settings.useLegacyFunctionCalling;
        if (useLegacyFunctionCalling && this.settings.parallelToolCalls === true) {
          throw new UnsupportedFunctionalityError({
            functionality: "useLegacyFunctionCalling with parallelToolCalls"
          });
        }
        if (useLegacyFunctionCalling && this.supportsStructuredOutputs) {
          throw new UnsupportedFunctionalityError({
            functionality: "structuredOutputs with useLegacyFunctionCalling"
          });
        }
        const { messages, warnings: messageWarnings } = convertToOpenAIChatMessages(
          {
            prompt,
            useLegacyFunctionCalling,
            systemMessageMode: getSystemMessageMode(this.modelId)
          }
        );
        warnings.push(...messageWarnings);
        const baseArgs = {
          // model id:
          model: this.modelId,
          // model specific settings:
          logit_bias: this.settings.logitBias,
          logprobs: this.settings.logprobs === true || typeof this.settings.logprobs === "number" ? true : void 0,
          top_logprobs: typeof this.settings.logprobs === "number" ? this.settings.logprobs : typeof this.settings.logprobs === "boolean" ? this.settings.logprobs ? 0 : void 0 : void 0,
          user: this.settings.user,
          parallel_tool_calls: this.settings.parallelToolCalls,
          // standardized settings:
          max_tokens: maxTokens,
          temperature,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          response_format: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? this.supportsStructuredOutputs && responseFormat.schema != null ? {
            type: "json_schema",
            json_schema: {
              schema: responseFormat.schema,
              strict: true,
              name: (_a18 = responseFormat.name) != null ? _a18 : "response",
              description: responseFormat.description
            }
          } : { type: "json_object" } : void 0,
          stop: stopSequences,
          seed,
          // openai specific settings:
          // TODO remove in next major version; we auto-map maxTokens now
          max_completion_tokens: (_b = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _b.maxCompletionTokens,
          store: (_c = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _c.store,
          metadata: (_d = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _d.metadata,
          prediction: (_e = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _e.prediction,
          reasoning_effort: (_g = (_f = providerMetadata == null ? void 0 : providerMetadata.openai) == null ? void 0 : _f.reasoningEffort) != null ? _g : this.settings.reasoningEffort,
          // messages:
          messages
        };
        if (isReasoningModel(this.modelId)) {
          if (baseArgs.temperature != null) {
            baseArgs.temperature = void 0;
            warnings.push({
              type: "unsupported-setting",
              setting: "temperature",
              details: "temperature is not supported for reasoning models"
            });
          }
          if (baseArgs.top_p != null) {
            baseArgs.top_p = void 0;
            warnings.push({
              type: "unsupported-setting",
              setting: "topP",
              details: "topP is not supported for reasoning models"
            });
          }
          if (baseArgs.frequency_penalty != null) {
            baseArgs.frequency_penalty = void 0;
            warnings.push({
              type: "unsupported-setting",
              setting: "frequencyPenalty",
              details: "frequencyPenalty is not supported for reasoning models"
            });
          }
          if (baseArgs.presence_penalty != null) {
            baseArgs.presence_penalty = void 0;
            warnings.push({
              type: "unsupported-setting",
              setting: "presencePenalty",
              details: "presencePenalty is not supported for reasoning models"
            });
          }
          if (baseArgs.logit_bias != null) {
            baseArgs.logit_bias = void 0;
            warnings.push({
              type: "other",
              message: "logitBias is not supported for reasoning models"
            });
          }
          if (baseArgs.logprobs != null) {
            baseArgs.logprobs = void 0;
            warnings.push({
              type: "other",
              message: "logprobs is not supported for reasoning models"
            });
          }
          if (baseArgs.top_logprobs != null) {
            baseArgs.top_logprobs = void 0;
            warnings.push({
              type: "other",
              message: "topLogprobs is not supported for reasoning models"
            });
          }
          if (baseArgs.max_tokens != null) {
            if (baseArgs.max_completion_tokens == null) {
              baseArgs.max_completion_tokens = baseArgs.max_tokens;
            }
            baseArgs.max_tokens = void 0;
          }
        } else if (this.modelId.startsWith("gpt-4o-search-preview") || this.modelId.startsWith("gpt-4o-mini-search-preview")) {
          if (baseArgs.temperature != null) {
            baseArgs.temperature = void 0;
            warnings.push({
              type: "unsupported-setting",
              setting: "temperature",
              details: "temperature is not supported for the search preview models and has been removed."
            });
          }
        }
        switch (type) {
          case "regular": {
            const { tools, tool_choice, functions, function_call, toolWarnings } = prepareTools({
              mode,
              useLegacyFunctionCalling,
              structuredOutputs: this.supportsStructuredOutputs
            });
            return {
              args: {
                ...baseArgs,
                tools,
                tool_choice,
                functions,
                function_call
              },
              warnings: [...warnings, ...toolWarnings]
            };
          }
          case "object-json": {
            return {
              args: {
                ...baseArgs,
                response_format: this.supportsStructuredOutputs && mode.schema != null ? {
                  type: "json_schema",
                  json_schema: {
                    schema: mode.schema,
                    strict: true,
                    name: (_h = mode.name) != null ? _h : "response",
                    description: mode.description
                  }
                } : { type: "json_object" }
              },
              warnings
            };
          }
          case "object-tool": {
            return {
              args: useLegacyFunctionCalling ? {
                ...baseArgs,
                function_call: {
                  name: mode.tool.name
                },
                functions: [
                  {
                    name: mode.tool.name,
                    description: mode.tool.description,
                    parameters: mode.tool.parameters
                  }
                ]
              } : {
                ...baseArgs,
                tool_choice: {
                  type: "function",
                  function: { name: mode.tool.name }
                },
                tools: [
                  {
                    type: "function",
                    function: {
                      name: mode.tool.name,
                      description: mode.tool.description,
                      parameters: mode.tool.parameters,
                      strict: this.supportsStructuredOutputs ? true : void 0
                    }
                  }
                ]
              },
              warnings
            };
          }
          default: {
            const _exhaustiveCheck = type;
            throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
          }
        }
      }
      async doGenerate(options) {
        var _a18, _b, _c, _d, _e, _f, _g, _h;
        const { args: body, warnings } = this.getArgs(options);
        const {
          responseHeaders,
          value: response,
          rawValue: rawResponse
        } = await postJsonToApi({
          url: this.config.url({
            path: "/chat/completions",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), options.headers),
          body,
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler(
            openaiChatResponseSchema
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { messages: rawPrompt, ...rawSettings } = body;
        const choice2 = response.choices[0];
        const completionTokenDetails = (_a18 = response.usage) == null ? void 0 : _a18.completion_tokens_details;
        const promptTokenDetails = (_b = response.usage) == null ? void 0 : _b.prompt_tokens_details;
        const providerMetadata = { openai: {} };
        if ((completionTokenDetails == null ? void 0 : completionTokenDetails.reasoning_tokens) != null) {
          providerMetadata.openai.reasoningTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.reasoning_tokens;
        }
        if ((completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens) != null) {
          providerMetadata.openai.acceptedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.accepted_prediction_tokens;
        }
        if ((completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens) != null) {
          providerMetadata.openai.rejectedPredictionTokens = completionTokenDetails == null ? void 0 : completionTokenDetails.rejected_prediction_tokens;
        }
        if ((promptTokenDetails == null ? void 0 : promptTokenDetails.cached_tokens) != null) {
          providerMetadata.openai.cachedPromptTokens = promptTokenDetails == null ? void 0 : promptTokenDetails.cached_tokens;
        }
        return {
          text: (_c = choice2.message.content) != null ? _c : void 0,
          toolCalls: this.settings.useLegacyFunctionCalling && choice2.message.function_call ? [
            {
              toolCallType: "function",
              toolCallId: generateId(),
              toolName: choice2.message.function_call.name,
              args: choice2.message.function_call.arguments
            }
          ] : (_d = choice2.message.tool_calls) == null ? void 0 : _d.map((toolCall) => {
            var _a25;
            return {
              toolCallType: "function",
              toolCallId: (_a25 = toolCall.id) != null ? _a25 : generateId(),
              toolName: toolCall.function.name,
              args: toolCall.function.arguments
            };
          }),
          finishReason: mapOpenAIFinishReason(choice2.finish_reason),
          usage: {
            promptTokens: (_f = (_e = response.usage) == null ? void 0 : _e.prompt_tokens) != null ? _f : NaN,
            completionTokens: (_h = (_g = response.usage) == null ? void 0 : _g.completion_tokens) != null ? _h : NaN
          },
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders, body: rawResponse },
          request: { body: JSON.stringify(body) },
          response: getResponseMetadata(response),
          warnings,
          logprobs: mapOpenAIChatLogProbsOutput(choice2.logprobs),
          providerMetadata
        };
      }
      async doStream(options) {
        if (this.settings.simulateStreaming) {
          const result = await this.doGenerate(options);
          const simulatedStream = new ReadableStream({
            start(controller) {
              controller.enqueue({ type: "response-metadata", ...result.response });
              if (result.text) {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: result.text
                });
              }
              if (result.toolCalls) {
                for (const toolCall of result.toolCalls) {
                  controller.enqueue({
                    type: "tool-call-delta",
                    toolCallType: "function",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    argsTextDelta: toolCall.args
                  });
                  controller.enqueue({
                    type: "tool-call",
                    ...toolCall
                  });
                }
              }
              controller.enqueue({
                type: "finish",
                finishReason: result.finishReason,
                usage: result.usage,
                logprobs: result.logprobs,
                providerMetadata: result.providerMetadata
              });
              controller.close();
            }
          });
          return {
            stream: simulatedStream,
            rawCall: result.rawCall,
            rawResponse: result.rawResponse,
            warnings: result.warnings
          };
        }
        const { args, warnings } = this.getArgs(options);
        const body = {
          ...args,
          stream: true,
          // only include stream_options when in strict compatibility mode:
          stream_options: this.config.compatibility === "strict" ? { include_usage: true } : void 0
        };
        const { responseHeaders, value: response } = await postJsonToApi({
          url: this.config.url({
            path: "/chat/completions",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), options.headers),
          body,
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createEventSourceResponseHandler(
            openaiChatChunkSchema
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { messages: rawPrompt, ...rawSettings } = args;
        const toolCalls = [];
        let finishReason = "unknown";
        let usage = {
          promptTokens: void 0,
          completionTokens: void 0
        };
        let logprobs;
        let isFirstChunk = true;
        const { useLegacyFunctionCalling } = this.settings;
        const providerMetadata = { openai: {} };
        return {
          stream: response.pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                var _a18, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
                if (!chunk.success) {
                  finishReason = "error";
                  controller.enqueue({ type: "error", error: chunk.error });
                  return;
                }
                const value = chunk.value;
                if ("error" in value) {
                  finishReason = "error";
                  controller.enqueue({ type: "error", error: value.error });
                  return;
                }
                if (isFirstChunk) {
                  isFirstChunk = false;
                  controller.enqueue({
                    type: "response-metadata",
                    ...getResponseMetadata(value)
                  });
                }
                if (value.usage != null) {
                  const {
                    prompt_tokens,
                    completion_tokens,
                    prompt_tokens_details,
                    completion_tokens_details
                  } = value.usage;
                  usage = {
                    promptTokens: prompt_tokens != null ? prompt_tokens : void 0,
                    completionTokens: completion_tokens != null ? completion_tokens : void 0
                  };
                  if ((completion_tokens_details == null ? void 0 : completion_tokens_details.reasoning_tokens) != null) {
                    providerMetadata.openai.reasoningTokens = completion_tokens_details == null ? void 0 : completion_tokens_details.reasoning_tokens;
                  }
                  if ((completion_tokens_details == null ? void 0 : completion_tokens_details.accepted_prediction_tokens) != null) {
                    providerMetadata.openai.acceptedPredictionTokens = completion_tokens_details == null ? void 0 : completion_tokens_details.accepted_prediction_tokens;
                  }
                  if ((completion_tokens_details == null ? void 0 : completion_tokens_details.rejected_prediction_tokens) != null) {
                    providerMetadata.openai.rejectedPredictionTokens = completion_tokens_details == null ? void 0 : completion_tokens_details.rejected_prediction_tokens;
                  }
                  if ((prompt_tokens_details == null ? void 0 : prompt_tokens_details.cached_tokens) != null) {
                    providerMetadata.openai.cachedPromptTokens = prompt_tokens_details == null ? void 0 : prompt_tokens_details.cached_tokens;
                  }
                }
                const choice2 = value.choices[0];
                if ((choice2 == null ? void 0 : choice2.finish_reason) != null) {
                  finishReason = mapOpenAIFinishReason(choice2.finish_reason);
                }
                if ((choice2 == null ? void 0 : choice2.delta) == null) {
                  return;
                }
                const delta = choice2.delta;
                if (delta.content != null) {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: delta.content
                  });
                }
                const mappedLogprobs = mapOpenAIChatLogProbsOutput(
                  choice2 == null ? void 0 : choice2.logprobs
                );
                if (mappedLogprobs == null ? void 0 : mappedLogprobs.length) {
                  if (logprobs === void 0) logprobs = [];
                  logprobs.push(...mappedLogprobs);
                }
                const mappedToolCalls = useLegacyFunctionCalling && delta.function_call != null ? [
                  {
                    type: "function",
                    id: generateId(),
                    function: delta.function_call,
                    index: 0
                  }
                ] : delta.tool_calls;
                if (mappedToolCalls != null) {
                  for (const toolCallDelta of mappedToolCalls) {
                    const index = toolCallDelta.index;
                    if (toolCalls[index] == null) {
                      if (toolCallDelta.type !== "function") {
                        throw new InvalidResponseDataError({
                          data: toolCallDelta,
                          message: `Expected 'function' type.`
                        });
                      }
                      if (toolCallDelta.id == null) {
                        throw new InvalidResponseDataError({
                          data: toolCallDelta,
                          message: `Expected 'id' to be a string.`
                        });
                      }
                      if (((_a18 = toolCallDelta.function) == null ? void 0 : _a18.name) == null) {
                        throw new InvalidResponseDataError({
                          data: toolCallDelta,
                          message: `Expected 'function.name' to be a string.`
                        });
                      }
                      toolCalls[index] = {
                        id: toolCallDelta.id,
                        type: "function",
                        function: {
                          name: toolCallDelta.function.name,
                          arguments: (_b = toolCallDelta.function.arguments) != null ? _b : ""
                        },
                        hasFinished: false
                      };
                      const toolCall2 = toolCalls[index];
                      if (((_c = toolCall2.function) == null ? void 0 : _c.name) != null && ((_d = toolCall2.function) == null ? void 0 : _d.arguments) != null) {
                        if (toolCall2.function.arguments.length > 0) {
                          controller.enqueue({
                            type: "tool-call-delta",
                            toolCallType: "function",
                            toolCallId: toolCall2.id,
                            toolName: toolCall2.function.name,
                            argsTextDelta: toolCall2.function.arguments
                          });
                        }
                        if (isParsableJson(toolCall2.function.arguments)) {
                          controller.enqueue({
                            type: "tool-call",
                            toolCallType: "function",
                            toolCallId: (_e = toolCall2.id) != null ? _e : generateId(),
                            toolName: toolCall2.function.name,
                            args: toolCall2.function.arguments
                          });
                          toolCall2.hasFinished = true;
                        }
                      }
                      continue;
                    }
                    const toolCall = toolCalls[index];
                    if (toolCall.hasFinished) {
                      continue;
                    }
                    if (((_f = toolCallDelta.function) == null ? void 0 : _f.arguments) != null) {
                      toolCall.function.arguments += (_h = (_g = toolCallDelta.function) == null ? void 0 : _g.arguments) != null ? _h : "";
                    }
                    controller.enqueue({
                      type: "tool-call-delta",
                      toolCallType: "function",
                      toolCallId: toolCall.id,
                      toolName: toolCall.function.name,
                      argsTextDelta: (_i = toolCallDelta.function.arguments) != null ? _i : ""
                    });
                    if (((_j = toolCall.function) == null ? void 0 : _j.name) != null && ((_k = toolCall.function) == null ? void 0 : _k.arguments) != null && isParsableJson(toolCall.function.arguments)) {
                      controller.enqueue({
                        type: "tool-call",
                        toolCallType: "function",
                        toolCallId: (_l = toolCall.id) != null ? _l : generateId(),
                        toolName: toolCall.function.name,
                        args: toolCall.function.arguments
                      });
                      toolCall.hasFinished = true;
                    }
                  }
                }
              },
              flush(controller) {
                var _a18, _b;
                controller.enqueue({
                  type: "finish",
                  finishReason,
                  logprobs,
                  usage: {
                    promptTokens: (_a18 = usage.promptTokens) != null ? _a18 : NaN,
                    completionTokens: (_b = usage.completionTokens) != null ? _b : NaN
                  },
                  ...providerMetadata != null ? { providerMetadata } : {}
                });
              }
            })
          ),
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders },
          request: { body: JSON.stringify(body) },
          warnings
        };
      }
    };
    openaiTokenUsageSchema = z22.object({
      prompt_tokens: z22.number().nullish(),
      completion_tokens: z22.number().nullish(),
      prompt_tokens_details: z22.object({
        cached_tokens: z22.number().nullish()
      }).nullish(),
      completion_tokens_details: z22.object({
        reasoning_tokens: z22.number().nullish(),
        accepted_prediction_tokens: z22.number().nullish(),
        rejected_prediction_tokens: z22.number().nullish()
      }).nullish()
    }).nullish();
    openaiChatResponseSchema = z22.object({
      id: z22.string().nullish(),
      created: z22.number().nullish(),
      model: z22.string().nullish(),
      choices: z22.array(
        z22.object({
          message: z22.object({
            role: z22.literal("assistant").nullish(),
            content: z22.string().nullish(),
            function_call: z22.object({
              arguments: z22.string(),
              name: z22.string()
            }).nullish(),
            tool_calls: z22.array(
              z22.object({
                id: z22.string().nullish(),
                type: z22.literal("function"),
                function: z22.object({
                  name: z22.string(),
                  arguments: z22.string()
                })
              })
            ).nullish()
          }),
          index: z22.number(),
          logprobs: z22.object({
            content: z22.array(
              z22.object({
                token: z22.string(),
                logprob: z22.number(),
                top_logprobs: z22.array(
                  z22.object({
                    token: z22.string(),
                    logprob: z22.number()
                  })
                )
              })
            ).nullable()
          }).nullish(),
          finish_reason: z22.string().nullish()
        })
      ),
      usage: openaiTokenUsageSchema
    });
    openaiChatChunkSchema = z22.union([
      z22.object({
        id: z22.string().nullish(),
        created: z22.number().nullish(),
        model: z22.string().nullish(),
        choices: z22.array(
          z22.object({
            delta: z22.object({
              role: z22.enum(["assistant"]).nullish(),
              content: z22.string().nullish(),
              function_call: z22.object({
                name: z22.string().optional(),
                arguments: z22.string().optional()
              }).nullish(),
              tool_calls: z22.array(
                z22.object({
                  index: z22.number(),
                  id: z22.string().nullish(),
                  type: z22.literal("function").nullish(),
                  function: z22.object({
                    name: z22.string().nullish(),
                    arguments: z22.string().nullish()
                  })
                })
              ).nullish()
            }).nullish(),
            logprobs: z22.object({
              content: z22.array(
                z22.object({
                  token: z22.string(),
                  logprob: z22.number(),
                  top_logprobs: z22.array(
                    z22.object({
                      token: z22.string(),
                      logprob: z22.number()
                    })
                  )
                })
              ).nullable()
            }).nullish(),
            finish_reason: z22.string().nullish(),
            index: z22.number()
          })
        ),
        usage: openaiTokenUsageSchema
      }),
      openaiErrorDataSchema
    ]);
    reasoningModels = {
      "o1-mini": {
        systemMessageMode: "remove"
      },
      "o1-mini-2024-09-12": {
        systemMessageMode: "remove"
      },
      "o1-preview": {
        systemMessageMode: "remove"
      },
      "o1-preview-2024-09-12": {
        systemMessageMode: "remove"
      },
      o3: {
        systemMessageMode: "developer"
      },
      "o3-2025-04-16": {
        systemMessageMode: "developer"
      },
      "o3-mini": {
        systemMessageMode: "developer"
      },
      "o3-mini-2025-01-31": {
        systemMessageMode: "developer"
      },
      "o4-mini": {
        systemMessageMode: "developer"
      },
      "o4-mini-2025-04-16": {
        systemMessageMode: "developer"
      }
    };
    OpenAICompletionLanguageModel = class {
      constructor(modelId, settings, config) {
        this.specificationVersion = "v1";
        this.defaultObjectGenerationMode = void 0;
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
      }
      get provider() {
        return this.config.provider;
      }
      getArgs({
        mode,
        inputFormat,
        prompt,
        maxTokens,
        temperature,
        topP,
        topK,
        frequencyPenalty,
        presencePenalty,
        stopSequences: userStopSequences,
        responseFormat,
        seed
      }) {
        var _a18;
        const type = mode.type;
        const warnings = [];
        if (topK != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "topK"
          });
        }
        if (responseFormat != null && responseFormat.type !== "text") {
          warnings.push({
            type: "unsupported-setting",
            setting: "responseFormat",
            details: "JSON response format is not supported."
          });
        }
        const { prompt: completionPrompt, stopSequences } = convertToOpenAICompletionPrompt({ prompt, inputFormat });
        const stop = [...stopSequences != null ? stopSequences : [], ...userStopSequences != null ? userStopSequences : []];
        const baseArgs = {
          // model id:
          model: this.modelId,
          // model specific settings:
          echo: this.settings.echo,
          logit_bias: this.settings.logitBias,
          logprobs: typeof this.settings.logprobs === "number" ? this.settings.logprobs : typeof this.settings.logprobs === "boolean" ? this.settings.logprobs ? 0 : void 0 : void 0,
          suffix: this.settings.suffix,
          user: this.settings.user,
          // standardized settings:
          max_tokens: maxTokens,
          temperature,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          seed,
          // prompt:
          prompt: completionPrompt,
          // stop sequences:
          stop: stop.length > 0 ? stop : void 0
        };
        switch (type) {
          case "regular": {
            if ((_a18 = mode.tools) == null ? void 0 : _a18.length) {
              throw new UnsupportedFunctionalityError({
                functionality: "tools"
              });
            }
            if (mode.toolChoice) {
              throw new UnsupportedFunctionalityError({
                functionality: "toolChoice"
              });
            }
            return { args: baseArgs, warnings };
          }
          case "object-json": {
            throw new UnsupportedFunctionalityError({
              functionality: "object-json mode"
            });
          }
          case "object-tool": {
            throw new UnsupportedFunctionalityError({
              functionality: "object-tool mode"
            });
          }
          default: {
            const _exhaustiveCheck = type;
            throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
          }
        }
      }
      async doGenerate(options) {
        const { args, warnings } = this.getArgs(options);
        const {
          responseHeaders,
          value: response,
          rawValue: rawResponse
        } = await postJsonToApi({
          url: this.config.url({
            path: "/completions",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), options.headers),
          body: args,
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler(
            openaiCompletionResponseSchema
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { prompt: rawPrompt, ...rawSettings } = args;
        const choice2 = response.choices[0];
        return {
          text: choice2.text,
          usage: {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens
          },
          finishReason: mapOpenAIFinishReason(choice2.finish_reason),
          logprobs: mapOpenAICompletionLogProbs(choice2.logprobs),
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders, body: rawResponse },
          response: getResponseMetadata(response),
          warnings,
          request: { body: JSON.stringify(args) }
        };
      }
      async doStream(options) {
        const { args, warnings } = this.getArgs(options);
        const body = {
          ...args,
          stream: true,
          // only include stream_options when in strict compatibility mode:
          stream_options: this.config.compatibility === "strict" ? { include_usage: true } : void 0
        };
        const { responseHeaders, value: response } = await postJsonToApi({
          url: this.config.url({
            path: "/completions",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), options.headers),
          body,
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createEventSourceResponseHandler(
            openaiCompletionChunkSchema
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { prompt: rawPrompt, ...rawSettings } = args;
        let finishReason = "unknown";
        let usage = {
          promptTokens: Number.NaN,
          completionTokens: Number.NaN
        };
        let logprobs;
        let isFirstChunk = true;
        return {
          stream: response.pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                if (!chunk.success) {
                  finishReason = "error";
                  controller.enqueue({ type: "error", error: chunk.error });
                  return;
                }
                const value = chunk.value;
                if ("error" in value) {
                  finishReason = "error";
                  controller.enqueue({ type: "error", error: value.error });
                  return;
                }
                if (isFirstChunk) {
                  isFirstChunk = false;
                  controller.enqueue({
                    type: "response-metadata",
                    ...getResponseMetadata(value)
                  });
                }
                if (value.usage != null) {
                  usage = {
                    promptTokens: value.usage.prompt_tokens,
                    completionTokens: value.usage.completion_tokens
                  };
                }
                const choice2 = value.choices[0];
                if ((choice2 == null ? void 0 : choice2.finish_reason) != null) {
                  finishReason = mapOpenAIFinishReason(choice2.finish_reason);
                }
                if ((choice2 == null ? void 0 : choice2.text) != null) {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: choice2.text
                  });
                }
                const mappedLogprobs = mapOpenAICompletionLogProbs(
                  choice2 == null ? void 0 : choice2.logprobs
                );
                if (mappedLogprobs == null ? void 0 : mappedLogprobs.length) {
                  if (logprobs === void 0) logprobs = [];
                  logprobs.push(...mappedLogprobs);
                }
              },
              flush(controller) {
                controller.enqueue({
                  type: "finish",
                  finishReason,
                  logprobs,
                  usage
                });
              }
            })
          ),
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders },
          warnings,
          request: { body: JSON.stringify(body) }
        };
      }
    };
    openaiCompletionResponseSchema = z32.object({
      id: z32.string().nullish(),
      created: z32.number().nullish(),
      model: z32.string().nullish(),
      choices: z32.array(
        z32.object({
          text: z32.string(),
          finish_reason: z32.string(),
          logprobs: z32.object({
            tokens: z32.array(z32.string()),
            token_logprobs: z32.array(z32.number()),
            top_logprobs: z32.array(z32.record(z32.string(), z32.number())).nullable()
          }).nullish()
        })
      ),
      usage: z32.object({
        prompt_tokens: z32.number(),
        completion_tokens: z32.number()
      })
    });
    openaiCompletionChunkSchema = z32.union([
      z32.object({
        id: z32.string().nullish(),
        created: z32.number().nullish(),
        model: z32.string().nullish(),
        choices: z32.array(
          z32.object({
            text: z32.string(),
            finish_reason: z32.string().nullish(),
            index: z32.number(),
            logprobs: z32.object({
              tokens: z32.array(z32.string()),
              token_logprobs: z32.array(z32.number()),
              top_logprobs: z32.array(z32.record(z32.string(), z32.number())).nullable()
            }).nullish()
          })
        ),
        usage: z32.object({
          prompt_tokens: z32.number(),
          completion_tokens: z32.number()
        }).nullish()
      }),
      openaiErrorDataSchema
    ]);
    OpenAIEmbeddingModel = class {
      constructor(modelId, settings, config) {
        this.specificationVersion = "v1";
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
      }
      get provider() {
        return this.config.provider;
      }
      get maxEmbeddingsPerCall() {
        var _a18;
        return (_a18 = this.settings.maxEmbeddingsPerCall) != null ? _a18 : 2048;
      }
      get supportsParallelCalls() {
        var _a18;
        return (_a18 = this.settings.supportsParallelCalls) != null ? _a18 : true;
      }
      async doEmbed({
        values,
        headers,
        abortSignal
      }) {
        if (values.length > this.maxEmbeddingsPerCall) {
          throw new TooManyEmbeddingValuesForCallError({
            provider: this.provider,
            modelId: this.modelId,
            maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
            values
          });
        }
        const { responseHeaders, value: response } = await postJsonToApi({
          url: this.config.url({
            path: "/embeddings",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), headers),
          body: {
            model: this.modelId,
            input: values,
            encoding_format: "float",
            dimensions: this.settings.dimensions,
            user: this.settings.user
          },
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler(
            openaiTextEmbeddingResponseSchema
          ),
          abortSignal,
          fetch: this.config.fetch
        });
        return {
          embeddings: response.data.map((item) => item.embedding),
          usage: response.usage ? { tokens: response.usage.prompt_tokens } : void 0,
          rawResponse: { headers: responseHeaders }
        };
      }
    };
    openaiTextEmbeddingResponseSchema = z4.object({
      data: z4.array(z4.object({ embedding: z4.array(z4.number()) })),
      usage: z4.object({ prompt_tokens: z4.number() }).nullish()
    });
    modelMaxImagesPerCall = {
      "dall-e-3": 1,
      "dall-e-2": 10,
      "gpt-image-1": 10
    };
    hasDefaultResponseFormat = /* @__PURE__ */ new Set(["gpt-image-1"]);
    OpenAIImageModel = class {
      constructor(modelId, settings, config) {
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
        this.specificationVersion = "v1";
      }
      get maxImagesPerCall() {
        var _a18, _b;
        return (_b = (_a18 = this.settings.maxImagesPerCall) != null ? _a18 : modelMaxImagesPerCall[this.modelId]) != null ? _b : 1;
      }
      get provider() {
        return this.config.provider;
      }
      async doGenerate({
        prompt,
        n,
        size,
        aspectRatio,
        seed,
        providerOptions,
        headers,
        abortSignal
      }) {
        var _a18, _b, _c, _d;
        const warnings = [];
        if (aspectRatio != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "aspectRatio",
            details: "This model does not support aspect ratio. Use `size` instead."
          });
        }
        if (seed != null) {
          warnings.push({ type: "unsupported-setting", setting: "seed" });
        }
        const currentDate = (_c = (_b = (_a18 = this.config._internal) == null ? void 0 : _a18.currentDate) == null ? void 0 : _b.call(_a18)) != null ? _c : /* @__PURE__ */ new Date();
        const { value: response, responseHeaders } = await postJsonToApi({
          url: this.config.url({
            path: "/images/generations",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), headers),
          body: {
            model: this.modelId,
            prompt,
            n,
            size,
            ...(_d = providerOptions.openai) != null ? _d : {},
            ...!hasDefaultResponseFormat.has(this.modelId) ? { response_format: "b64_json" } : {}
          },
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler(
            openaiImageResponseSchema
          ),
          abortSignal,
          fetch: this.config.fetch
        });
        return {
          images: response.data.map((item) => item.b64_json),
          warnings,
          response: {
            timestamp: currentDate,
            modelId: this.modelId,
            headers: responseHeaders
          }
        };
      }
    };
    openaiImageResponseSchema = z5.object({
      data: z5.array(z5.object({ b64_json: z5.string() }))
    });
    openAIProviderOptionsSchema = z6.object({
      include: z6.array(z6.string()).nullish(),
      language: z6.string().nullish(),
      prompt: z6.string().nullish(),
      temperature: z6.number().min(0).max(1).nullish().default(0),
      timestampGranularities: z6.array(z6.enum(["word", "segment"])).nullish().default(["segment"])
    });
    languageMap = {
      afrikaans: "af",
      arabic: "ar",
      armenian: "hy",
      azerbaijani: "az",
      belarusian: "be",
      bosnian: "bs",
      bulgarian: "bg",
      catalan: "ca",
      chinese: "zh",
      croatian: "hr",
      czech: "cs",
      danish: "da",
      dutch: "nl",
      english: "en",
      estonian: "et",
      finnish: "fi",
      french: "fr",
      galician: "gl",
      german: "de",
      greek: "el",
      hebrew: "he",
      hindi: "hi",
      hungarian: "hu",
      icelandic: "is",
      indonesian: "id",
      italian: "it",
      japanese: "ja",
      kannada: "kn",
      kazakh: "kk",
      korean: "ko",
      latvian: "lv",
      lithuanian: "lt",
      macedonian: "mk",
      malay: "ms",
      marathi: "mr",
      maori: "mi",
      nepali: "ne",
      norwegian: "no",
      persian: "fa",
      polish: "pl",
      portuguese: "pt",
      romanian: "ro",
      russian: "ru",
      serbian: "sr",
      slovak: "sk",
      slovenian: "sl",
      spanish: "es",
      swahili: "sw",
      swedish: "sv",
      tagalog: "tl",
      tamil: "ta",
      thai: "th",
      turkish: "tr",
      ukrainian: "uk",
      urdu: "ur",
      vietnamese: "vi",
      welsh: "cy"
    };
    OpenAITranscriptionModel = class {
      constructor(modelId, config) {
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v1";
      }
      get provider() {
        return this.config.provider;
      }
      getArgs({
        audio,
        mediaType,
        providerOptions
      }) {
        var _a18, _b, _c, _d, _e;
        const warnings = [];
        const openAIOptions = parseProviderOptions({
          provider: "openai",
          providerOptions,
          schema: openAIProviderOptionsSchema
        });
        const formData = new FormData();
        const blob = audio instanceof Uint8Array ? new Blob([audio]) : new Blob([convertBase64ToUint8Array(audio)]);
        formData.append("model", this.modelId);
        formData.append("file", new File([blob], "audio", { type: mediaType }));
        if (openAIOptions) {
          const transcriptionModelOptions = {
            include: (_a18 = openAIOptions.include) != null ? _a18 : void 0,
            language: (_b = openAIOptions.language) != null ? _b : void 0,
            prompt: (_c = openAIOptions.prompt) != null ? _c : void 0,
            temperature: (_d = openAIOptions.temperature) != null ? _d : void 0,
            timestamp_granularities: (_e = openAIOptions.timestampGranularities) != null ? _e : void 0
          };
          for (const key in transcriptionModelOptions) {
            const value = transcriptionModelOptions[key];
            if (value !== void 0) {
              formData.append(key, String(value));
            }
          }
        }
        return {
          formData,
          warnings
        };
      }
      async doGenerate(options) {
        var _a18, _b, _c, _d, _e, _f;
        const currentDate = (_c = (_b = (_a18 = this.config._internal) == null ? void 0 : _a18.currentDate) == null ? void 0 : _b.call(_a18)) != null ? _c : /* @__PURE__ */ new Date();
        const { formData, warnings } = this.getArgs(options);
        const {
          value: response,
          responseHeaders,
          rawValue: rawResponse
        } = await postFormDataToApi({
          url: this.config.url({
            path: "/audio/transcriptions",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), options.headers),
          formData,
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler(
            openaiTranscriptionResponseSchema
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const language = response.language != null && response.language in languageMap ? languageMap[response.language] : void 0;
        return {
          text: response.text,
          segments: (_e = (_d = response.words) == null ? void 0 : _d.map((word) => ({
            text: word.word,
            startSecond: word.start,
            endSecond: word.end
          }))) != null ? _e : [],
          language,
          durationInSeconds: (_f = response.duration) != null ? _f : void 0,
          warnings,
          response: {
            timestamp: currentDate,
            modelId: this.modelId,
            headers: responseHeaders,
            body: rawResponse
          }
        };
      }
    };
    openaiTranscriptionResponseSchema = z6.object({
      text: z6.string(),
      language: z6.string().nullish(),
      duration: z6.number().nullish(),
      words: z6.array(
        z6.object({
          word: z6.string(),
          start: z6.number(),
          end: z6.number()
        })
      ).nullish()
    });
    OpenAIProviderOptionsSchema = z7.object({
      instructions: z7.string().nullish(),
      speed: z7.number().min(0.25).max(4).default(1).nullish()
    });
    OpenAIResponsesLanguageModel = class {
      constructor(modelId, config) {
        this.specificationVersion = "v1";
        this.defaultObjectGenerationMode = "json";
        this.supportsStructuredOutputs = true;
        this.modelId = modelId;
        this.config = config;
      }
      get provider() {
        return this.config.provider;
      }
      getArgs({
        mode,
        maxTokens,
        temperature,
        stopSequences,
        topP,
        topK,
        presencePenalty,
        frequencyPenalty,
        seed,
        prompt,
        providerMetadata,
        responseFormat
      }) {
        var _a18, _b, _c;
        const warnings = [];
        const modelConfig = getResponsesModelConfig(this.modelId);
        const type = mode.type;
        if (topK != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "topK"
          });
        }
        if (seed != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "seed"
          });
        }
        if (presencePenalty != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "presencePenalty"
          });
        }
        if (frequencyPenalty != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "frequencyPenalty"
          });
        }
        if (stopSequences != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "stopSequences"
          });
        }
        const { messages, warnings: messageWarnings } = convertToOpenAIResponsesMessages({
          prompt,
          systemMessageMode: modelConfig.systemMessageMode
        });
        warnings.push(...messageWarnings);
        const openaiOptions = parseProviderOptions({
          provider: "openai",
          providerOptions: providerMetadata,
          schema: openaiResponsesProviderOptionsSchema
        });
        const isStrict = (_a18 = openaiOptions == null ? void 0 : openaiOptions.strictSchemas) != null ? _a18 : true;
        const baseArgs = {
          model: this.modelId,
          input: messages,
          temperature,
          top_p: topP,
          max_output_tokens: maxTokens,
          ...(responseFormat == null ? void 0 : responseFormat.type) === "json" && {
            text: {
              format: responseFormat.schema != null ? {
                type: "json_schema",
                strict: isStrict,
                name: (_b = responseFormat.name) != null ? _b : "response",
                description: responseFormat.description,
                schema: responseFormat.schema
              } : { type: "json_object" }
            }
          },
          // provider options:
          metadata: openaiOptions == null ? void 0 : openaiOptions.metadata,
          parallel_tool_calls: openaiOptions == null ? void 0 : openaiOptions.parallelToolCalls,
          previous_response_id: openaiOptions == null ? void 0 : openaiOptions.previousResponseId,
          store: openaiOptions == null ? void 0 : openaiOptions.store,
          user: openaiOptions == null ? void 0 : openaiOptions.user,
          instructions: openaiOptions == null ? void 0 : openaiOptions.instructions,
          // model-specific settings:
          ...modelConfig.isReasoningModel && ((openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) != null || (openaiOptions == null ? void 0 : openaiOptions.reasoningSummary) != null) && {
            reasoning: {
              ...(openaiOptions == null ? void 0 : openaiOptions.reasoningEffort) != null && {
                effort: openaiOptions.reasoningEffort
              },
              ...(openaiOptions == null ? void 0 : openaiOptions.reasoningSummary) != null && {
                summary: openaiOptions.reasoningSummary
              }
            }
          },
          ...modelConfig.requiredAutoTruncation && {
            truncation: "auto"
          }
        };
        if (modelConfig.isReasoningModel) {
          if (baseArgs.temperature != null) {
            baseArgs.temperature = void 0;
            warnings.push({
              type: "unsupported-setting",
              setting: "temperature",
              details: "temperature is not supported for reasoning models"
            });
          }
          if (baseArgs.top_p != null) {
            baseArgs.top_p = void 0;
            warnings.push({
              type: "unsupported-setting",
              setting: "topP",
              details: "topP is not supported for reasoning models"
            });
          }
        }
        switch (type) {
          case "regular": {
            const { tools, tool_choice, toolWarnings } = prepareResponsesTools({
              mode,
              strict: isStrict
              // TODO support provider options on tools
            });
            return {
              args: {
                ...baseArgs,
                tools,
                tool_choice
              },
              warnings: [...warnings, ...toolWarnings]
            };
          }
          case "object-json": {
            return {
              args: {
                ...baseArgs,
                text: {
                  format: mode.schema != null ? {
                    type: "json_schema",
                    strict: isStrict,
                    name: (_c = mode.name) != null ? _c : "response",
                    description: mode.description,
                    schema: mode.schema
                  } : { type: "json_object" }
                }
              },
              warnings
            };
          }
          case "object-tool": {
            return {
              args: {
                ...baseArgs,
                tool_choice: { type: "function", name: mode.tool.name },
                tools: [
                  {
                    type: "function",
                    name: mode.tool.name,
                    description: mode.tool.description,
                    parameters: mode.tool.parameters,
                    strict: isStrict
                  }
                ]
              },
              warnings
            };
          }
          default: {
            const _exhaustiveCheck = type;
            throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
          }
        }
      }
      async doGenerate(options) {
        var _a18, _b, _c, _d, _e, _f, _g;
        const { args: body, warnings } = this.getArgs(options);
        const url = this.config.url({
          path: "/responses",
          modelId: this.modelId
        });
        const {
          responseHeaders,
          value: response,
          rawValue: rawResponse
        } = await postJsonToApi({
          url,
          headers: combineHeaders(this.config.headers(), options.headers),
          body,
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler(
            z8.object({
              id: z8.string(),
              created_at: z8.number(),
              error: z8.object({
                message: z8.string(),
                code: z8.string()
              }).nullish(),
              model: z8.string(),
              output: z8.array(
                z8.discriminatedUnion("type", [
                  z8.object({
                    type: z8.literal("message"),
                    role: z8.literal("assistant"),
                    content: z8.array(
                      z8.object({
                        type: z8.literal("output_text"),
                        text: z8.string(),
                        annotations: z8.array(
                          z8.object({
                            type: z8.literal("url_citation"),
                            start_index: z8.number(),
                            end_index: z8.number(),
                            url: z8.string(),
                            title: z8.string()
                          })
                        )
                      })
                    )
                  }),
                  z8.object({
                    type: z8.literal("function_call"),
                    call_id: z8.string(),
                    name: z8.string(),
                    arguments: z8.string()
                  }),
                  z8.object({
                    type: z8.literal("web_search_call")
                  }),
                  z8.object({
                    type: z8.literal("computer_call")
                  }),
                  z8.object({
                    type: z8.literal("reasoning"),
                    summary: z8.array(
                      z8.object({
                        type: z8.literal("summary_text"),
                        text: z8.string()
                      })
                    )
                  })
                ])
              ),
              incomplete_details: z8.object({ reason: z8.string() }).nullable(),
              usage: usageSchema
            })
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        if (response.error) {
          throw new APICallError({
            message: response.error.message,
            url,
            requestBodyValues: body,
            statusCode: 400,
            responseHeaders,
            responseBody: rawResponse,
            isRetryable: false
          });
        }
        const outputTextElements = response.output.filter((output) => output.type === "message").flatMap((output) => output.content).filter((content) => content.type === "output_text");
        const toolCalls = response.output.filter((output) => output.type === "function_call").map((output) => ({
          toolCallType: "function",
          toolCallId: output.call_id,
          toolName: output.name,
          args: output.arguments
        }));
        const reasoningSummary = (_b = (_a18 = response.output.find((item) => item.type === "reasoning")) == null ? void 0 : _a18.summary) != null ? _b : null;
        return {
          text: outputTextElements.map((content) => content.text).join("\n"),
          sources: outputTextElements.flatMap(
            (content) => content.annotations.map((annotation) => {
              var _a25, _b2, _c2;
              return {
                sourceType: "url",
                id: (_c2 = (_b2 = (_a25 = this.config).generateId) == null ? void 0 : _b2.call(_a25)) != null ? _c2 : generateId(),
                url: annotation.url,
                title: annotation.title
              };
            })
          ),
          finishReason: mapOpenAIResponseFinishReason({
            finishReason: (_c = response.incomplete_details) == null ? void 0 : _c.reason,
            hasToolCalls: toolCalls.length > 0
          }),
          toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
          reasoning: reasoningSummary ? reasoningSummary.map((summary) => ({
            type: "text",
            text: summary.text
          })) : void 0,
          usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens
          },
          rawCall: {
            rawPrompt: void 0,
            rawSettings: {}
          },
          rawResponse: {
            headers: responseHeaders,
            body: rawResponse
          },
          request: {
            body: JSON.stringify(body)
          },
          response: {
            id: response.id,
            timestamp: new Date(response.created_at * 1e3),
            modelId: response.model
          },
          providerMetadata: {
            openai: {
              responseId: response.id,
              cachedPromptTokens: (_e = (_d = response.usage.input_tokens_details) == null ? void 0 : _d.cached_tokens) != null ? _e : null,
              reasoningTokens: (_g = (_f = response.usage.output_tokens_details) == null ? void 0 : _f.reasoning_tokens) != null ? _g : null
            }
          },
          warnings
        };
      }
      async doStream(options) {
        const { args: body, warnings } = this.getArgs(options);
        const { responseHeaders, value: response } = await postJsonToApi({
          url: this.config.url({
            path: "/responses",
            modelId: this.modelId
          }),
          headers: combineHeaders(this.config.headers(), options.headers),
          body: {
            ...body,
            stream: true
          },
          failedResponseHandler: openaiFailedResponseHandler,
          successfulResponseHandler: createEventSourceResponseHandler(
            openaiResponsesChunkSchema
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const self = this;
        let finishReason = "unknown";
        let promptTokens = NaN;
        let completionTokens = NaN;
        let cachedPromptTokens = null;
        let reasoningTokens = null;
        let responseId = null;
        const ongoingToolCalls = {};
        let hasToolCalls = false;
        return {
          stream: response.pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                var _a18, _b, _c, _d, _e, _f, _g, _h;
                if (!chunk.success) {
                  finishReason = "error";
                  controller.enqueue({ type: "error", error: chunk.error });
                  return;
                }
                const value = chunk.value;
                if (isResponseOutputItemAddedChunk(value)) {
                  if (value.item.type === "function_call") {
                    ongoingToolCalls[value.output_index] = {
                      toolName: value.item.name,
                      toolCallId: value.item.call_id
                    };
                    controller.enqueue({
                      type: "tool-call-delta",
                      toolCallType: "function",
                      toolCallId: value.item.call_id,
                      toolName: value.item.name,
                      argsTextDelta: value.item.arguments
                    });
                  }
                } else if (isResponseFunctionCallArgumentsDeltaChunk(value)) {
                  const toolCall = ongoingToolCalls[value.output_index];
                  if (toolCall != null) {
                    controller.enqueue({
                      type: "tool-call-delta",
                      toolCallType: "function",
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      argsTextDelta: value.delta
                    });
                  }
                } else if (isResponseCreatedChunk(value)) {
                  responseId = value.response.id;
                  controller.enqueue({
                    type: "response-metadata",
                    id: value.response.id,
                    timestamp: new Date(value.response.created_at * 1e3),
                    modelId: value.response.model
                  });
                } else if (isTextDeltaChunk(value)) {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: value.delta
                  });
                } else if (isResponseReasoningSummaryTextDeltaChunk(value)) {
                  controller.enqueue({
                    type: "reasoning",
                    textDelta: value.delta
                  });
                } else if (isResponseOutputItemDoneChunk(value) && value.item.type === "function_call") {
                  ongoingToolCalls[value.output_index] = void 0;
                  hasToolCalls = true;
                  controller.enqueue({
                    type: "tool-call",
                    toolCallType: "function",
                    toolCallId: value.item.call_id,
                    toolName: value.item.name,
                    args: value.item.arguments
                  });
                } else if (isResponseFinishedChunk(value)) {
                  finishReason = mapOpenAIResponseFinishReason({
                    finishReason: (_a18 = value.response.incomplete_details) == null ? void 0 : _a18.reason,
                    hasToolCalls
                  });
                  promptTokens = value.response.usage.input_tokens;
                  completionTokens = value.response.usage.output_tokens;
                  cachedPromptTokens = (_c = (_b = value.response.usage.input_tokens_details) == null ? void 0 : _b.cached_tokens) != null ? _c : cachedPromptTokens;
                  reasoningTokens = (_e = (_d = value.response.usage.output_tokens_details) == null ? void 0 : _d.reasoning_tokens) != null ? _e : reasoningTokens;
                } else if (isResponseAnnotationAddedChunk(value)) {
                  controller.enqueue({
                    type: "source",
                    source: {
                      sourceType: "url",
                      id: (_h = (_g = (_f = self.config).generateId) == null ? void 0 : _g.call(_f)) != null ? _h : generateId(),
                      url: value.annotation.url,
                      title: value.annotation.title
                    }
                  });
                } else if (isErrorChunk(value)) {
                  controller.enqueue({ type: "error", error: value });
                }
              },
              flush(controller) {
                controller.enqueue({
                  type: "finish",
                  finishReason,
                  usage: { promptTokens, completionTokens },
                  ...(cachedPromptTokens != null || reasoningTokens != null) && {
                    providerMetadata: {
                      openai: {
                        responseId,
                        cachedPromptTokens,
                        reasoningTokens
                      }
                    }
                  }
                });
              }
            })
          ),
          rawCall: {
            rawPrompt: void 0,
            rawSettings: {}
          },
          rawResponse: { headers: responseHeaders },
          request: { body: JSON.stringify(body) },
          warnings
        };
      }
    };
    usageSchema = z8.object({
      input_tokens: z8.number(),
      input_tokens_details: z8.object({ cached_tokens: z8.number().nullish() }).nullish(),
      output_tokens: z8.number(),
      output_tokens_details: z8.object({ reasoning_tokens: z8.number().nullish() }).nullish()
    });
    textDeltaChunkSchema = z8.object({
      type: z8.literal("response.output_text.delta"),
      delta: z8.string()
    });
    responseFinishedChunkSchema = z8.object({
      type: z8.enum(["response.completed", "response.incomplete"]),
      response: z8.object({
        incomplete_details: z8.object({ reason: z8.string() }).nullish(),
        usage: usageSchema
      })
    });
    responseCreatedChunkSchema = z8.object({
      type: z8.literal("response.created"),
      response: z8.object({
        id: z8.string(),
        created_at: z8.number(),
        model: z8.string()
      })
    });
    responseOutputItemDoneSchema = z8.object({
      type: z8.literal("response.output_item.done"),
      output_index: z8.number(),
      item: z8.discriminatedUnion("type", [
        z8.object({
          type: z8.literal("message")
        }),
        z8.object({
          type: z8.literal("function_call"),
          id: z8.string(),
          call_id: z8.string(),
          name: z8.string(),
          arguments: z8.string(),
          status: z8.literal("completed")
        })
      ])
    });
    responseFunctionCallArgumentsDeltaSchema = z8.object({
      type: z8.literal("response.function_call_arguments.delta"),
      item_id: z8.string(),
      output_index: z8.number(),
      delta: z8.string()
    });
    responseOutputItemAddedSchema = z8.object({
      type: z8.literal("response.output_item.added"),
      output_index: z8.number(),
      item: z8.discriminatedUnion("type", [
        z8.object({
          type: z8.literal("message")
        }),
        z8.object({
          type: z8.literal("function_call"),
          id: z8.string(),
          call_id: z8.string(),
          name: z8.string(),
          arguments: z8.string()
        })
      ])
    });
    responseAnnotationAddedSchema = z8.object({
      type: z8.literal("response.output_text.annotation.added"),
      annotation: z8.object({
        type: z8.literal("url_citation"),
        url: z8.string(),
        title: z8.string()
      })
    });
    responseReasoningSummaryTextDeltaSchema = z8.object({
      type: z8.literal("response.reasoning_summary_text.delta"),
      item_id: z8.string(),
      output_index: z8.number(),
      summary_index: z8.number(),
      delta: z8.string()
    });
    errorChunkSchema = z8.object({
      type: z8.literal("error"),
      code: z8.string(),
      message: z8.string(),
      param: z8.string().nullish(),
      sequence_number: z8.number()
    });
    openaiResponsesChunkSchema = z8.union([
      textDeltaChunkSchema,
      responseFinishedChunkSchema,
      responseCreatedChunkSchema,
      responseOutputItemDoneSchema,
      responseFunctionCallArgumentsDeltaSchema,
      responseOutputItemAddedSchema,
      responseAnnotationAddedSchema,
      responseReasoningSummaryTextDeltaSchema,
      errorChunkSchema,
      z8.object({ type: z8.string() }).passthrough()
      // fallback for unknown chunks
    ]);
    openaiResponsesProviderOptionsSchema = z8.object({
      metadata: z8.any().nullish(),
      parallelToolCalls: z8.boolean().nullish(),
      previousResponseId: z8.string().nullish(),
      store: z8.boolean().nullish(),
      user: z8.string().nullish(),
      reasoningEffort: z8.string().nullish(),
      strictSchemas: z8.boolean().nullish(),
      instructions: z8.string().nullish(),
      reasoningSummary: z8.string().nullish()
    });
  }
});

// node_modules/@ai-sdk/azure/node_modules/@ai-sdk/provider/dist/index.mjs
var marker15, symbol15, _a15, _AISDKError3, AISDKError2, name14, marker22, symbol22, _a22, name22, marker32, symbol32, _a32, name32, marker42, symbol42, _a42, InvalidArgumentError2, name42, marker52, symbol52, _a52, name52, marker62, symbol62, _a62, name62, marker72, symbol72, _a72, name72, marker82, symbol82, _a82, LoadAPIKeyError, name82, marker92, symbol92, _a92, LoadSettingError, name92, marker102, symbol102, _a102, name102, marker112, symbol112, _a112, name112, marker122, symbol122, _a122, name122, marker132, symbol132, _a132, name132, marker142, symbol142, _a142;
var init_dist4 = __esm({
  "node_modules/@ai-sdk/azure/node_modules/@ai-sdk/provider/dist/index.mjs"() {
    "use strict";
    marker15 = "vercel.ai.error";
    symbol15 = Symbol.for(marker15);
    _AISDKError3 = class _AISDKError4 extends Error {
      /**
       * Creates an AI SDK Error.
       *
       * @param {Object} params - The parameters for creating the error.
       * @param {string} params.name - The name of the error.
       * @param {string} params.message - The error message.
       * @param {unknown} [params.cause] - The underlying cause of the error.
       */
      constructor({
        name: name142,
        message,
        cause
      }) {
        super(message);
        this[_a15] = true;
        this.name = name142;
        this.cause = cause;
      }
      /**
       * Checks if the given error is an AI SDK Error.
       * @param {unknown} error - The error to check.
       * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
       */
      static isInstance(error) {
        return _AISDKError4.hasMarker(error, marker15);
      }
      static hasMarker(error, marker152) {
        const markerSymbol = Symbol.for(marker152);
        return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
      }
    };
    _a15 = symbol15;
    AISDKError2 = _AISDKError3;
    name14 = "AI_APICallError";
    marker22 = `vercel.ai.error.${name14}`;
    symbol22 = Symbol.for(marker22);
    _a22 = symbol22;
    name22 = "AI_EmptyResponseBodyError";
    marker32 = `vercel.ai.error.${name22}`;
    symbol32 = Symbol.for(marker32);
    _a32 = symbol32;
    name32 = "AI_InvalidArgumentError";
    marker42 = `vercel.ai.error.${name32}`;
    symbol42 = Symbol.for(marker42);
    InvalidArgumentError2 = class extends AISDKError2 {
      constructor({
        message,
        cause,
        argument
      }) {
        super({ name: name32, message, cause });
        this[_a42] = true;
        this.argument = argument;
      }
      static isInstance(error) {
        return AISDKError2.hasMarker(error, marker42);
      }
    };
    _a42 = symbol42;
    name42 = "AI_InvalidPromptError";
    marker52 = `vercel.ai.error.${name42}`;
    symbol52 = Symbol.for(marker52);
    _a52 = symbol52;
    name52 = "AI_InvalidResponseDataError";
    marker62 = `vercel.ai.error.${name52}`;
    symbol62 = Symbol.for(marker62);
    _a62 = symbol62;
    name62 = "AI_JSONParseError";
    marker72 = `vercel.ai.error.${name62}`;
    symbol72 = Symbol.for(marker72);
    _a72 = symbol72;
    name72 = "AI_LoadAPIKeyError";
    marker82 = `vercel.ai.error.${name72}`;
    symbol82 = Symbol.for(marker82);
    LoadAPIKeyError = class extends AISDKError2 {
      // used in isInstance
      constructor({ message }) {
        super({ name: name72, message });
        this[_a82] = true;
      }
      static isInstance(error) {
        return AISDKError2.hasMarker(error, marker82);
      }
    };
    _a82 = symbol82;
    name82 = "AI_LoadSettingError";
    marker92 = `vercel.ai.error.${name82}`;
    symbol92 = Symbol.for(marker92);
    LoadSettingError = class extends AISDKError2 {
      // used in isInstance
      constructor({ message }) {
        super({ name: name82, message });
        this[_a92] = true;
      }
      static isInstance(error) {
        return AISDKError2.hasMarker(error, marker92);
      }
    };
    _a92 = symbol92;
    name92 = "AI_NoContentGeneratedError";
    marker102 = `vercel.ai.error.${name92}`;
    symbol102 = Symbol.for(marker102);
    _a102 = symbol102;
    name102 = "AI_NoSuchModelError";
    marker112 = `vercel.ai.error.${name102}`;
    symbol112 = Symbol.for(marker112);
    _a112 = symbol112;
    name112 = "AI_TooManyEmbeddingValuesForCallError";
    marker122 = `vercel.ai.error.${name112}`;
    symbol122 = Symbol.for(marker122);
    _a122 = symbol122;
    name122 = "AI_TypeValidationError";
    marker132 = `vercel.ai.error.${name122}`;
    symbol132 = Symbol.for(marker132);
    _a132 = symbol132;
    name132 = "AI_UnsupportedFunctionalityError";
    marker142 = `vercel.ai.error.${name132}`;
    symbol142 = Symbol.for(marker142);
    _a142 = symbol142;
  }
});

// node_modules/@ai-sdk/azure/node_modules/@ai-sdk/provider-utils/dist/index.mjs
function loadApiKey({
  apiKey,
  environmentVariableName,
  apiKeyParameterName = "apiKey",
  description
}) {
  if (typeof apiKey === "string") {
    return apiKey;
  }
  if (apiKey != null) {
    throw new LoadAPIKeyError({
      message: `${description} API key must be a string.`
    });
  }
  if (typeof process === "undefined") {
    throw new LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter. Environment variables is not supported in this environment.`
    });
  }
  apiKey = process.env[environmentVariableName];
  if (apiKey == null) {
    throw new LoadAPIKeyError({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter or the ${environmentVariableName} environment variable.`
    });
  }
  if (typeof apiKey !== "string") {
    throw new LoadAPIKeyError({
      message: `${description} API key must be a string. The value of the ${environmentVariableName} environment variable is not a string.`
    });
  }
  return apiKey;
}
function loadSetting({
  settingValue,
  environmentVariableName,
  settingName,
  description
}) {
  if (typeof settingValue === "string") {
    return settingValue;
  }
  if (settingValue != null) {
    throw new LoadSettingError({
      message: `${description} setting must be a string.`
    });
  }
  if (typeof process === "undefined") {
    throw new LoadSettingError({
      message: `${description} setting is missing. Pass it using the '${settingName}' parameter. Environment variables is not supported in this environment.`
    });
  }
  settingValue = process.env[environmentVariableName];
  if (settingValue == null) {
    throw new LoadSettingError({
      message: `${description} setting is missing. Pass it using the '${settingName}' parameter or the ${environmentVariableName} environment variable.`
    });
  }
  if (typeof settingValue !== "string") {
    throw new LoadSettingError({
      message: `${description} setting must be a string. The value of the ${environmentVariableName} environment variable is not a string.`
    });
  }
  return settingValue;
}
var import_secure_json_parse2, createIdGenerator2, generateId2, validatorSymbol2, btoa2, atob2;
var init_dist5 = __esm({
  "node_modules/@ai-sdk/azure/node_modules/@ai-sdk/provider-utils/dist/index.mjs"() {
    "use strict";
    init_dist4();
    init_non_secure();
    init_dist4();
    init_dist4();
    import_secure_json_parse2 = __toESM(require_secure_json_parse(), 1);
    createIdGenerator2 = ({
      prefix,
      size: defaultSize = 16,
      alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      separator = "-"
    } = {}) => {
      const generator = customAlphabet(alphabet, defaultSize);
      if (prefix == null) {
        return generator;
      }
      if (alphabet.includes(separator)) {
        throw new InvalidArgumentError2({
          argument: "separator",
          message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
        });
      }
      return (size) => `${prefix}${separator}${generator(size)}`;
    };
    generateId2 = createIdGenerator2();
    validatorSymbol2 = Symbol.for("vercel.ai.validator");
    ({ btoa: btoa2, atob: atob2 } = globalThis);
  }
});

// node_modules/@ai-sdk/azure/dist/index.mjs
function createAzure(options = {}) {
  var _a18;
  const getHeaders = () => ({
    "api-key": loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "AZURE_API_KEY",
      description: "Azure OpenAI"
    }),
    ...options.headers
  });
  const getResourceName = () => loadSetting({
    settingValue: options.resourceName,
    settingName: "resourceName",
    environmentVariableName: "AZURE_RESOURCE_NAME",
    description: "Azure OpenAI resource name"
  });
  const apiVersion = (_a18 = options.apiVersion) != null ? _a18 : "2025-03-01-preview";
  const url = ({ path, modelId }) => {
    if (path === "/responses") {
      return options.baseURL ? `${options.baseURL}${path}?api-version=${apiVersion}` : `https://${getResourceName()}.openai.azure.com/openai/responses?api-version=${apiVersion}`;
    }
    return options.baseURL ? `${options.baseURL}/${modelId}${path}?api-version=${apiVersion}` : `https://${getResourceName()}.openai.azure.com/openai/deployments/${modelId}${path}?api-version=${apiVersion}`;
  };
  const createChatModel = (deploymentName, settings = {}) => new OpenAIChatLanguageModel(deploymentName, settings, {
    provider: "azure-openai.chat",
    url,
    headers: getHeaders,
    compatibility: "strict",
    fetch: options.fetch
  });
  const createCompletionModel = (modelId, settings = {}) => new OpenAICompletionLanguageModel(modelId, settings, {
    provider: "azure-openai.completion",
    url,
    compatibility: "strict",
    headers: getHeaders,
    fetch: options.fetch
  });
  const createEmbeddingModel = (modelId, settings = {}) => new OpenAIEmbeddingModel(modelId, settings, {
    provider: "azure-openai.embeddings",
    headers: getHeaders,
    url,
    fetch: options.fetch
  });
  const createResponsesModel = (modelId) => new OpenAIResponsesLanguageModel(modelId, {
    provider: "azure-openai.responses",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createImageModel = (modelId, settings = {}) => new OpenAIImageModel(modelId, settings, {
    provider: "azure-openai.image",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createTranscriptionModel = (modelId) => new OpenAITranscriptionModel(modelId, {
    provider: "azure-openai.transcription",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const provider = function(deploymentId, settings) {
    if (new.target) {
      throw new Error(
        "The Azure OpenAI model function cannot be called with the new keyword."
      );
    }
    return createChatModel(deploymentId, settings);
  };
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;
  provider.embedding = createEmbeddingModel;
  provider.image = createImageModel;
  provider.imageModel = createImageModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.responses = createResponsesModel;
  provider.transcription = createTranscriptionModel;
  return provider;
}
var azure;
var init_dist6 = __esm({
  "node_modules/@ai-sdk/azure/dist/index.mjs"() {
    "use strict";
    init_dist3();
    init_dist5();
    azure = createAzure();
  }
});

// node_modules/@ai-sdk/amazon-bedrock/node_modules/@ai-sdk/provider/dist/index.mjs
function getErrorMessage2(error) {
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}
var marker16, symbol16, _a16, _AISDKError5, AISDKError3, name15, marker23, symbol23, _a23, APICallError2, name23, marker33, symbol33, _a33, EmptyResponseBodyError2, name33, marker43, symbol43, _a43, InvalidArgumentError3, name43, marker53, symbol53, _a53, name53, marker63, symbol63, _a63, name63, marker73, symbol73, _a73, JSONParseError2, name73, marker83, symbol83, _a83, name83, marker93, symbol93, _a93, LoadSettingError2, name93, marker103, symbol103, _a103, name103, marker113, symbol113, _a113, name113, marker123, symbol123, _a123, name123, marker133, symbol133, _a133, _TypeValidationError3, TypeValidationError2, name133, marker143, symbol143, _a143, UnsupportedFunctionalityError2;
var init_dist7 = __esm({
  "node_modules/@ai-sdk/amazon-bedrock/node_modules/@ai-sdk/provider/dist/index.mjs"() {
    "use strict";
    marker16 = "vercel.ai.error";
    symbol16 = Symbol.for(marker16);
    _AISDKError5 = class _AISDKError6 extends Error {
      /**
       * Creates an AI SDK Error.
       *
       * @param {Object} params - The parameters for creating the error.
       * @param {string} params.name - The name of the error.
       * @param {string} params.message - The error message.
       * @param {unknown} [params.cause] - The underlying cause of the error.
       */
      constructor({
        name: name142,
        message,
        cause
      }) {
        super(message);
        this[_a16] = true;
        this.name = name142;
        this.cause = cause;
      }
      /**
       * Checks if the given error is an AI SDK Error.
       * @param {unknown} error - The error to check.
       * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
       */
      static isInstance(error) {
        return _AISDKError6.hasMarker(error, marker16);
      }
      static hasMarker(error, marker152) {
        const markerSymbol = Symbol.for(marker152);
        return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
      }
    };
    _a16 = symbol16;
    AISDKError3 = _AISDKError5;
    name15 = "AI_APICallError";
    marker23 = `vercel.ai.error.${name15}`;
    symbol23 = Symbol.for(marker23);
    APICallError2 = class extends AISDKError3 {
      constructor({
        message,
        url,
        requestBodyValues,
        statusCode,
        responseHeaders,
        responseBody,
        cause,
        isRetryable = statusCode != null && (statusCode === 408 || // request timeout
        statusCode === 409 || // conflict
        statusCode === 429 || // too many requests
        statusCode >= 500),
        // server error
        data
      }) {
        super({ name: name15, message, cause });
        this[_a23] = true;
        this.url = url;
        this.requestBodyValues = requestBodyValues;
        this.statusCode = statusCode;
        this.responseHeaders = responseHeaders;
        this.responseBody = responseBody;
        this.isRetryable = isRetryable;
        this.data = data;
      }
      static isInstance(error) {
        return AISDKError3.hasMarker(error, marker23);
      }
    };
    _a23 = symbol23;
    name23 = "AI_EmptyResponseBodyError";
    marker33 = `vercel.ai.error.${name23}`;
    symbol33 = Symbol.for(marker33);
    EmptyResponseBodyError2 = class extends AISDKError3 {
      // used in isInstance
      constructor({ message = "Empty response body" } = {}) {
        super({ name: name23, message });
        this[_a33] = true;
      }
      static isInstance(error) {
        return AISDKError3.hasMarker(error, marker33);
      }
    };
    _a33 = symbol33;
    name33 = "AI_InvalidArgumentError";
    marker43 = `vercel.ai.error.${name33}`;
    symbol43 = Symbol.for(marker43);
    InvalidArgumentError3 = class extends AISDKError3 {
      constructor({
        message,
        cause,
        argument
      }) {
        super({ name: name33, message, cause });
        this[_a43] = true;
        this.argument = argument;
      }
      static isInstance(error) {
        return AISDKError3.hasMarker(error, marker43);
      }
    };
    _a43 = symbol43;
    name43 = "AI_InvalidPromptError";
    marker53 = `vercel.ai.error.${name43}`;
    symbol53 = Symbol.for(marker53);
    _a53 = symbol53;
    name53 = "AI_InvalidResponseDataError";
    marker63 = `vercel.ai.error.${name53}`;
    symbol63 = Symbol.for(marker63);
    _a63 = symbol63;
    name63 = "AI_JSONParseError";
    marker73 = `vercel.ai.error.${name63}`;
    symbol73 = Symbol.for(marker73);
    JSONParseError2 = class extends AISDKError3 {
      constructor({ text, cause }) {
        super({
          name: name63,
          message: `JSON parsing failed: Text: ${text}.
Error message: ${getErrorMessage2(cause)}`,
          cause
        });
        this[_a73] = true;
        this.text = text;
      }
      static isInstance(error) {
        return AISDKError3.hasMarker(error, marker73);
      }
    };
    _a73 = symbol73;
    name73 = "AI_LoadAPIKeyError";
    marker83 = `vercel.ai.error.${name73}`;
    symbol83 = Symbol.for(marker83);
    _a83 = symbol83;
    name83 = "AI_LoadSettingError";
    marker93 = `vercel.ai.error.${name83}`;
    symbol93 = Symbol.for(marker93);
    LoadSettingError2 = class extends AISDKError3 {
      // used in isInstance
      constructor({ message }) {
        super({ name: name83, message });
        this[_a93] = true;
      }
      static isInstance(error) {
        return AISDKError3.hasMarker(error, marker93);
      }
    };
    _a93 = symbol93;
    name93 = "AI_NoContentGeneratedError";
    marker103 = `vercel.ai.error.${name93}`;
    symbol103 = Symbol.for(marker103);
    _a103 = symbol103;
    name103 = "AI_NoSuchModelError";
    marker113 = `vercel.ai.error.${name103}`;
    symbol113 = Symbol.for(marker113);
    _a113 = symbol113;
    name113 = "AI_TooManyEmbeddingValuesForCallError";
    marker123 = `vercel.ai.error.${name113}`;
    symbol123 = Symbol.for(marker123);
    _a123 = symbol123;
    name123 = "AI_TypeValidationError";
    marker133 = `vercel.ai.error.${name123}`;
    symbol133 = Symbol.for(marker133);
    _TypeValidationError3 = class _TypeValidationError4 extends AISDKError3 {
      constructor({ value, cause }) {
        super({
          name: name123,
          message: `Type validation failed: Value: ${JSON.stringify(value)}.
Error message: ${getErrorMessage2(cause)}`,
          cause
        });
        this[_a133] = true;
        this.value = value;
      }
      static isInstance(error) {
        return AISDKError3.hasMarker(error, marker133);
      }
      /**
       * Wraps an error into a TypeValidationError.
       * If the cause is already a TypeValidationError with the same value, it returns the cause.
       * Otherwise, it creates a new TypeValidationError.
       *
       * @param {Object} params - The parameters for wrapping the error.
       * @param {unknown} params.value - The value that failed validation.
       * @param {unknown} params.cause - The original error or cause of the validation failure.
       * @returns {TypeValidationError} A TypeValidationError instance.
       */
      static wrap({
        value,
        cause
      }) {
        return _TypeValidationError4.isInstance(cause) && cause.value === value ? cause : new _TypeValidationError4({ value, cause });
      }
    };
    _a133 = symbol133;
    TypeValidationError2 = _TypeValidationError3;
    name133 = "AI_UnsupportedFunctionalityError";
    marker143 = `vercel.ai.error.${name133}`;
    symbol143 = Symbol.for(marker143);
    UnsupportedFunctionalityError2 = class extends AISDKError3 {
      constructor({
        functionality,
        message = `'${functionality}' functionality not supported.`
      }) {
        super({ name: name133, message });
        this[_a143] = true;
        this.functionality = functionality;
      }
      static isInstance(error) {
        return AISDKError3.hasMarker(error, marker143);
      }
    };
    _a143 = symbol143;
  }
});

// node_modules/@ai-sdk/amazon-bedrock/node_modules/@ai-sdk/provider-utils/dist/index.mjs
function combineHeaders2(...headers) {
  return headers.reduce(
    (combinedHeaders, currentHeaders) => ({
      ...combinedHeaders,
      ...currentHeaders != null ? currentHeaders : {}
    }),
    {}
  );
}
function extractResponseHeaders2(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}
function removeUndefinedEntries2(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([_key, value]) => value != null)
  );
}
function isAbortError2(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
function loadOptionalSetting({
  settingValue,
  environmentVariableName
}) {
  if (typeof settingValue === "string") {
    return settingValue;
  }
  if (settingValue != null || typeof process === "undefined") {
    return void 0;
  }
  settingValue = process.env[environmentVariableName];
  if (settingValue == null || typeof settingValue !== "string") {
    return void 0;
  }
  return settingValue;
}
function loadSetting2({
  settingValue,
  environmentVariableName,
  settingName,
  description
}) {
  if (typeof settingValue === "string") {
    return settingValue;
  }
  if (settingValue != null) {
    throw new LoadSettingError2({
      message: `${description} setting must be a string.`
    });
  }
  if (typeof process === "undefined") {
    throw new LoadSettingError2({
      message: `${description} setting is missing. Pass it using the '${settingName}' parameter. Environment variables is not supported in this environment.`
    });
  }
  settingValue = process.env[environmentVariableName];
  if (settingValue == null) {
    throw new LoadSettingError2({
      message: `${description} setting is missing. Pass it using the '${settingName}' parameter or the ${environmentVariableName} environment variable.`
    });
  }
  if (typeof settingValue !== "string") {
    throw new LoadSettingError2({
      message: `${description} setting must be a string. The value of the ${environmentVariableName} environment variable is not a string.`
    });
  }
  return settingValue;
}
function validator2(validate) {
  return { [validatorSymbol3]: true, validate };
}
function isValidator2(value) {
  return typeof value === "object" && value !== null && validatorSymbol3 in value && value[validatorSymbol3] === true && "validate" in value;
}
function asValidator2(value) {
  return isValidator2(value) ? value : zodValidator2(value);
}
function zodValidator2(zodSchema) {
  return validator2((value) => {
    const result = zodSchema.safeParse(value);
    return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
  });
}
function validateTypes2({
  value,
  schema: inputSchema
}) {
  const result = safeValidateTypes2({ value, schema: inputSchema });
  if (!result.success) {
    throw TypeValidationError2.wrap({ value, cause: result.error });
  }
  return result.value;
}
function safeValidateTypes2({
  value,
  schema
}) {
  const validator22 = asValidator2(schema);
  try {
    if (validator22.validate == null) {
      return { success: true, value };
    }
    const result = validator22.validate(value);
    if (result.success) {
      return result;
    }
    return {
      success: false,
      error: TypeValidationError2.wrap({ value, cause: result.error })
    };
  } catch (error) {
    return {
      success: false,
      error: TypeValidationError2.wrap({ value, cause: error })
    };
  }
}
function parseJSON2({
  text,
  schema
}) {
  try {
    const value = import_secure_json_parse3.default.parse(text);
    if (schema == null) {
      return value;
    }
    return validateTypes2({ value, schema });
  } catch (error) {
    if (JSONParseError2.isInstance(error) || TypeValidationError2.isInstance(error)) {
      throw error;
    }
    throw new JSONParseError2({ text, cause: error });
  }
}
function safeParseJSON2({
  text,
  schema
}) {
  try {
    const value = import_secure_json_parse3.default.parse(text);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    const validationResult = safeValidateTypes2({ value, schema });
    return validationResult.success ? { ...validationResult, rawValue: value } : validationResult;
  } catch (error) {
    return {
      success: false,
      error: JSONParseError2.isInstance(error) ? error : new JSONParseError2({ text, cause: error })
    };
  }
}
async function resolve(value) {
  if (typeof value === "function") {
    value = value();
  }
  return Promise.resolve(value);
}
function convertUint8ArrayToBase642(array) {
  let latin1string = "";
  for (let i = 0; i < array.length; i++) {
    latin1string += String.fromCodePoint(array[i]);
  }
  return btoa3(latin1string);
}
function withoutTrailingSlash(url) {
  return url == null ? void 0 : url.replace(/\/$/, "");
}
var import_secure_json_parse3, createIdGenerator3, generateId3, validatorSymbol3, getOriginalFetch22, postJsonToApi2, postToApi2, createJsonErrorResponseHandler2, createJsonResponseHandler2, btoa3, atob3;
var init_dist8 = __esm({
  "node_modules/@ai-sdk/amazon-bedrock/node_modules/@ai-sdk/provider-utils/dist/index.mjs"() {
    "use strict";
    init_dist7();
    init_non_secure();
    init_dist7();
    init_dist7();
    import_secure_json_parse3 = __toESM(require_secure_json_parse(), 1);
    init_dist7();
    init_dist7();
    init_dist7();
    createIdGenerator3 = ({
      prefix,
      size: defaultSize = 16,
      alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      separator = "-"
    } = {}) => {
      const generator = customAlphabet(alphabet, defaultSize);
      if (prefix == null) {
        return generator;
      }
      if (alphabet.includes(separator)) {
        throw new InvalidArgumentError3({
          argument: "separator",
          message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
        });
      }
      return (size) => `${prefix}${separator}${generator(size)}`;
    };
    generateId3 = createIdGenerator3();
    validatorSymbol3 = Symbol.for("vercel.ai.validator");
    getOriginalFetch22 = () => globalThis.fetch;
    postJsonToApi2 = async ({
      url,
      headers,
      body,
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    }) => postToApi2({
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: {
        content: JSON.stringify(body),
        values: body
      },
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    });
    postToApi2 = async ({
      url,
      headers = {},
      body,
      successfulResponseHandler,
      failedResponseHandler,
      abortSignal,
      fetch: fetch2 = getOriginalFetch22()
    }) => {
      try {
        const response = await fetch2(url, {
          method: "POST",
          headers: removeUndefinedEntries2(headers),
          body: body.content,
          signal: abortSignal
        });
        const responseHeaders = extractResponseHeaders2(response);
        if (!response.ok) {
          let errorInformation;
          try {
            errorInformation = await failedResponseHandler({
              response,
              url,
              requestBodyValues: body.values
            });
          } catch (error) {
            if (isAbortError2(error) || APICallError2.isInstance(error)) {
              throw error;
            }
            throw new APICallError2({
              message: "Failed to process error response",
              cause: error,
              statusCode: response.status,
              url,
              responseHeaders,
              requestBodyValues: body.values
            });
          }
          throw errorInformation.value;
        }
        try {
          return await successfulResponseHandler({
            response,
            url,
            requestBodyValues: body.values
          });
        } catch (error) {
          if (error instanceof Error) {
            if (isAbortError2(error) || APICallError2.isInstance(error)) {
              throw error;
            }
          }
          throw new APICallError2({
            message: "Failed to process successful response",
            cause: error,
            statusCode: response.status,
            url,
            responseHeaders,
            requestBodyValues: body.values
          });
        }
      } catch (error) {
        if (isAbortError2(error)) {
          throw error;
        }
        if (error instanceof TypeError && error.message === "fetch failed") {
          const cause = error.cause;
          if (cause != null) {
            throw new APICallError2({
              message: `Cannot connect to API: ${cause.message}`,
              cause,
              url,
              requestBodyValues: body.values,
              isRetryable: true
              // retry when network error
            });
          }
        }
        throw error;
      }
    };
    createJsonErrorResponseHandler2 = ({
      errorSchema,
      errorToMessage,
      isRetryable
    }) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await response.text();
      const responseHeaders = extractResponseHeaders2(response);
      if (responseBody.trim() === "") {
        return {
          responseHeaders,
          value: new APICallError2({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
      try {
        const parsedError = parseJSON2({
          text: responseBody,
          schema: errorSchema
        });
        return {
          responseHeaders,
          value: new APICallError2({
            message: errorToMessage(parsedError),
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            data: parsedError,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response, parsedError)
          })
        };
      } catch (parseError) {
        return {
          responseHeaders,
          value: new APICallError2({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
    };
    createJsonResponseHandler2 = (responseSchema2) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await response.text();
      const parsedResult = safeParseJSON2({
        text: responseBody,
        schema: responseSchema2
      });
      const responseHeaders = extractResponseHeaders2(response);
      if (!parsedResult.success) {
        throw new APICallError2({
          message: "Invalid JSON response",
          cause: parsedResult.error,
          statusCode: response.status,
          responseHeaders,
          responseBody,
          url,
          requestBodyValues
        });
      }
      return {
        responseHeaders,
        value: parsedResult.value,
        rawValue: parsedResult.rawValue
      };
    };
    ({ btoa: btoa3, atob: atob3 } = globalThis);
  }
});

// node_modules/tslib/tslib.es6.mjs
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve3) {
      resolve3(value);
    });
  }
  return new (P || (P = Promise))(function(resolve3, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve3(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _ = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
  return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() {
    return this;
  }), g;
  function verb(n) {
    return function(v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError("Generator is already executing.");
    while (g && (g = 0, op[0] && (_ = 0)), _) try {
      if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
      if (y = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _.label++;
          return { value: op[1], done: false };
        case 5:
          _.label++;
          y = op[1];
          op = [0];
          continue;
        case 7:
          op = _.ops.pop();
          _.trys.pop();
          continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _ = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _.label = op[1];
            break;
          }
          if (op[0] === 6 && _.label < t[1]) {
            _.label = t[1];
            t = op;
            break;
          }
          if (t && _.label < t[2]) {
            _.label = t[2];
            _.ops.push(op);
            break;
          }
          if (t[2]) _.ops.pop();
          _.trys.pop();
          continue;
      }
      op = body.call(thisArg, _);
    } catch (e) {
      op = [6, e];
      y = 0;
    } finally {
      f = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
var init_tslib_es6 = __esm({
  "node_modules/tslib/tslib.es6.mjs"() {
    "use strict";
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/node_modules/@smithy/util-buffer-from/node_modules/@smithy/is-array-buffer/dist-es/index.js
var init_dist_es = __esm({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/node_modules/@smithy/util-buffer-from/node_modules/@smithy/is-array-buffer/dist-es/index.js"() {
    "use strict";
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/node_modules/@smithy/util-buffer-from/dist-es/index.js
import { Buffer as Buffer2 } from "buffer";
var fromString;
var init_dist_es2 = __esm({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/node_modules/@smithy/util-buffer-from/dist-es/index.js"() {
    "use strict";
    init_dist_es();
    fromString = (input, encoding) => {
      if (typeof input !== "string") {
        throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
      }
      return encoding ? Buffer2.from(input, encoding) : Buffer2.from(input);
    };
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/fromUtf8.js
var fromUtf8;
var init_fromUtf8 = __esm({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/fromUtf8.js"() {
    "use strict";
    init_dist_es2();
    fromUtf8 = (input) => {
      const buf = fromString(input, "utf8");
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    };
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/toUint8Array.js
var init_toUint8Array = __esm({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/toUint8Array.js"() {
    "use strict";
    init_fromUtf8();
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/toUtf8.js
var init_toUtf8 = __esm({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/toUtf8.js"() {
    "use strict";
    init_dist_es2();
  }
});

// node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/index.js
var init_dist_es3 = __esm({
  "node_modules/@aws-crypto/util/node_modules/@smithy/util-utf8/dist-es/index.js"() {
    "use strict";
    init_fromUtf8();
    init_toUint8Array();
    init_toUtf8();
  }
});

// node_modules/@aws-crypto/util/build/module/convertToBuffer.js
function convertToBuffer(data) {
  if (data instanceof Uint8Array)
    return data;
  if (typeof data === "string") {
    return fromUtf82(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  }
  return new Uint8Array(data);
}
var fromUtf82;
var init_convertToBuffer = __esm({
  "node_modules/@aws-crypto/util/build/module/convertToBuffer.js"() {
    "use strict";
    init_dist_es3();
    fromUtf82 = typeof Buffer !== "undefined" && Buffer.from ? function(input) {
      return Buffer.from(input, "utf8");
    } : fromUtf8;
  }
});

// node_modules/@aws-crypto/util/build/module/isEmptyData.js
function isEmptyData(data) {
  if (typeof data === "string") {
    return data.length === 0;
  }
  return data.byteLength === 0;
}
var init_isEmptyData = __esm({
  "node_modules/@aws-crypto/util/build/module/isEmptyData.js"() {
    "use strict";
  }
});

// node_modules/@aws-crypto/util/build/module/numToUint8.js
function numToUint8(num) {
  return new Uint8Array([
    (num & 4278190080) >> 24,
    (num & 16711680) >> 16,
    (num & 65280) >> 8,
    num & 255
  ]);
}
var init_numToUint8 = __esm({
  "node_modules/@aws-crypto/util/build/module/numToUint8.js"() {
    "use strict";
  }
});

// node_modules/@aws-crypto/util/build/module/uint32ArrayFrom.js
function uint32ArrayFrom(a_lookUpTable2) {
  if (!Uint32Array.from) {
    var return_array = new Uint32Array(a_lookUpTable2.length);
    var a_index = 0;
    while (a_index < a_lookUpTable2.length) {
      return_array[a_index] = a_lookUpTable2[a_index];
      a_index += 1;
    }
    return return_array;
  }
  return Uint32Array.from(a_lookUpTable2);
}
var init_uint32ArrayFrom = __esm({
  "node_modules/@aws-crypto/util/build/module/uint32ArrayFrom.js"() {
    "use strict";
  }
});

// node_modules/@aws-crypto/util/build/module/index.js
var init_module = __esm({
  "node_modules/@aws-crypto/util/build/module/index.js"() {
    "use strict";
    init_convertToBuffer();
    init_isEmptyData();
    init_numToUint8();
    init_uint32ArrayFrom();
  }
});

// node_modules/@aws-crypto/crc32/build/module/aws_crc32.js
var AwsCrc32;
var init_aws_crc32 = __esm({
  "node_modules/@aws-crypto/crc32/build/module/aws_crc32.js"() {
    "use strict";
    init_tslib_es6();
    init_module();
    init_module2();
    AwsCrc32 = /** @class */
    function() {
      function AwsCrc322() {
        this.crc32 = new Crc32();
      }
      AwsCrc322.prototype.update = function(toHash) {
        if (isEmptyData(toHash))
          return;
        this.crc32.update(convertToBuffer(toHash));
      };
      AwsCrc322.prototype.digest = function() {
        return __awaiter(this, void 0, void 0, function() {
          return __generator(this, function(_a18) {
            return [2, numToUint8(this.crc32.digest())];
          });
        });
      };
      AwsCrc322.prototype.reset = function() {
        this.crc32 = new Crc32();
      };
      return AwsCrc322;
    }();
  }
});

// node_modules/@aws-crypto/crc32/build/module/index.js
var Crc32, a_lookUpTable, lookupTable;
var init_module2 = __esm({
  "node_modules/@aws-crypto/crc32/build/module/index.js"() {
    "use strict";
    init_tslib_es6();
    init_module();
    init_aws_crc32();
    Crc32 = /** @class */
    function() {
      function Crc322() {
        this.checksum = 4294967295;
      }
      Crc322.prototype.update = function(data) {
        var e_1, _a18;
        try {
          for (var data_1 = __values(data), data_1_1 = data_1.next(); !data_1_1.done; data_1_1 = data_1.next()) {
            var byte = data_1_1.value;
            this.checksum = this.checksum >>> 8 ^ lookupTable[(this.checksum ^ byte) & 255];
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (data_1_1 && !data_1_1.done && (_a18 = data_1.return)) _a18.call(data_1);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return this;
      };
      Crc322.prototype.digest = function() {
        return (this.checksum ^ 4294967295) >>> 0;
      };
      return Crc322;
    }();
    a_lookUpTable = [
      0,
      1996959894,
      3993919788,
      2567524794,
      124634137,
      1886057615,
      3915621685,
      2657392035,
      249268274,
      2044508324,
      3772115230,
      2547177864,
      162941995,
      2125561021,
      3887607047,
      2428444049,
      498536548,
      1789927666,
      4089016648,
      2227061214,
      450548861,
      1843258603,
      4107580753,
      2211677639,
      325883990,
      1684777152,
      4251122042,
      2321926636,
      335633487,
      1661365465,
      4195302755,
      2366115317,
      997073096,
      1281953886,
      3579855332,
      2724688242,
      1006888145,
      1258607687,
      3524101629,
      2768942443,
      901097722,
      1119000684,
      3686517206,
      2898065728,
      853044451,
      1172266101,
      3705015759,
      2882616665,
      651767980,
      1373503546,
      3369554304,
      3218104598,
      565507253,
      1454621731,
      3485111705,
      3099436303,
      671266974,
      1594198024,
      3322730930,
      2970347812,
      795835527,
      1483230225,
      3244367275,
      3060149565,
      1994146192,
      31158534,
      2563907772,
      4023717930,
      1907459465,
      112637215,
      2680153253,
      3904427059,
      2013776290,
      251722036,
      2517215374,
      3775830040,
      2137656763,
      141376813,
      2439277719,
      3865271297,
      1802195444,
      476864866,
      2238001368,
      4066508878,
      1812370925,
      453092731,
      2181625025,
      4111451223,
      1706088902,
      314042704,
      2344532202,
      4240017532,
      1658658271,
      366619977,
      2362670323,
      4224994405,
      1303535960,
      984961486,
      2747007092,
      3569037538,
      1256170817,
      1037604311,
      2765210733,
      3554079995,
      1131014506,
      879679996,
      2909243462,
      3663771856,
      1141124467,
      855842277,
      2852801631,
      3708648649,
      1342533948,
      654459306,
      3188396048,
      3373015174,
      1466479909,
      544179635,
      3110523913,
      3462522015,
      1591671054,
      702138776,
      2966460450,
      3352799412,
      1504918807,
      783551873,
      3082640443,
      3233442989,
      3988292384,
      2596254646,
      62317068,
      1957810842,
      3939845945,
      2647816111,
      81470997,
      1943803523,
      3814918930,
      2489596804,
      225274430,
      2053790376,
      3826175755,
      2466906013,
      167816743,
      2097651377,
      4027552580,
      2265490386,
      503444072,
      1762050814,
      4150417245,
      2154129355,
      426522225,
      1852507879,
      4275313526,
      2312317920,
      282753626,
      1742555852,
      4189708143,
      2394877945,
      397917763,
      1622183637,
      3604390888,
      2714866558,
      953729732,
      1340076626,
      3518719985,
      2797360999,
      1068828381,
      1219638859,
      3624741850,
      2936675148,
      906185462,
      1090812512,
      3747672003,
      2825379669,
      829329135,
      1181335161,
      3412177804,
      3160834842,
      628085408,
      1382605366,
      3423369109,
      3138078467,
      570562233,
      1426400815,
      3317316542,
      2998733608,
      733239954,
      1555261956,
      3268935591,
      3050360625,
      752459403,
      1541320221,
      2607071920,
      3965973030,
      1969922972,
      40735498,
      2617837225,
      3943577151,
      1913087877,
      83908371,
      2512341634,
      3803740692,
      2075208622,
      213261112,
      2463272603,
      3855990285,
      2094854071,
      198958881,
      2262029012,
      4057260610,
      1759359992,
      534414190,
      2176718541,
      4139329115,
      1873836001,
      414664567,
      2282248934,
      4279200368,
      1711684554,
      285281116,
      2405801727,
      4167216745,
      1634467795,
      376229701,
      2685067896,
      3608007406,
      1308918612,
      956543938,
      2808555105,
      3495958263,
      1231636301,
      1047427035,
      2932959818,
      3654703836,
      1088359270,
      936918e3,
      2847714899,
      3736837829,
      1202900863,
      817233897,
      3183342108,
      3401237130,
      1404277552,
      615818150,
      3134207493,
      3453421203,
      1423857449,
      601450431,
      3009837614,
      3294710456,
      1567103746,
      711928724,
      3020668471,
      3272380065,
      1510334235,
      755167117
    ];
    lookupTable = uint32ArrayFrom(a_lookUpTable);
  }
});

// node_modules/@smithy/util-hex-encoding/dist-es/index.js
function fromHex(encoded) {
  if (encoded.length % 2 !== 0) {
    throw new Error("Hex encoded strings must have an even number length");
  }
  const out = new Uint8Array(encoded.length / 2);
  for (let i = 0; i < encoded.length; i += 2) {
    const encodedByte = encoded.slice(i, i + 2).toLowerCase();
    if (encodedByte in HEX_TO_SHORT) {
      out[i / 2] = HEX_TO_SHORT[encodedByte];
    } else {
      throw new Error(`Cannot decode unrecognized sequence ${encodedByte} as hexadecimal`);
    }
  }
  return out;
}
function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    out += SHORT_TO_HEX[bytes[i]];
  }
  return out;
}
var SHORT_TO_HEX, HEX_TO_SHORT;
var init_dist_es4 = __esm({
  "node_modules/@smithy/util-hex-encoding/dist-es/index.js"() {
    "use strict";
    SHORT_TO_HEX = {};
    HEX_TO_SHORT = {};
    for (let i = 0; i < 256; i++) {
      let encodedByte = i.toString(16).toLowerCase();
      if (encodedByte.length === 1) {
        encodedByte = `0${encodedByte}`;
      }
      SHORT_TO_HEX[i] = encodedByte;
      HEX_TO_SHORT[encodedByte] = i;
    }
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/Int64.js
function negate(bytes) {
  for (let i = 0; i < 8; i++) {
    bytes[i] ^= 255;
  }
  for (let i = 7; i > -1; i--) {
    bytes[i]++;
    if (bytes[i] !== 0)
      break;
  }
}
var Int64;
var init_Int64 = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/Int64.js"() {
    "use strict";
    init_dist_es4();
    Int64 = class _Int64 {
      constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
          throw new Error("Int64 buffers must be exactly 8 bytes");
        }
      }
      static fromNumber(number) {
        if (number > 9223372036854776e3 || number < -9223372036854776e3) {
          throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256) {
          bytes[i] = remaining;
        }
        if (number < 0) {
          negate(bytes);
        }
        return new _Int64(bytes);
      }
      valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 128;
        if (negative) {
          negate(bytes);
        }
        return parseInt(toHex(bytes), 16) * (negative ? -1 : 1);
      }
      toString() {
        return String(this.valueOf());
      }
    };
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/HeaderMarshaller.js
var HeaderMarshaller, HEADER_VALUE_TYPE, BOOLEAN_TAG, BYTE_TAG, SHORT_TAG, INT_TAG, LONG_TAG, BINARY_TAG, STRING_TAG, TIMESTAMP_TAG, UUID_TAG, UUID_PATTERN;
var init_HeaderMarshaller = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/HeaderMarshaller.js"() {
    "use strict";
    init_dist_es4();
    init_Int64();
    HeaderMarshaller = class {
      constructor(toUtf82, fromUtf84) {
        this.toUtf8 = toUtf82;
        this.fromUtf8 = fromUtf84;
      }
      format(headers) {
        const chunks = [];
        for (const headerName of Object.keys(headers)) {
          const bytes = this.fromUtf8(headerName);
          chunks.push(Uint8Array.from([bytes.byteLength]), bytes, this.formatHeaderValue(headers[headerName]));
        }
        const out = new Uint8Array(chunks.reduce((carry, bytes) => carry + bytes.byteLength, 0));
        let position = 0;
        for (const chunk of chunks) {
          out.set(chunk, position);
          position += chunk.byteLength;
        }
        return out;
      }
      formatHeaderValue(header) {
        switch (header.type) {
          case "boolean":
            return Uint8Array.from([header.value ? 0 : 1]);
          case "byte":
            return Uint8Array.from([2, header.value]);
          case "short":
            const shortView = new DataView(new ArrayBuffer(3));
            shortView.setUint8(0, 3);
            shortView.setInt16(1, header.value, false);
            return new Uint8Array(shortView.buffer);
          case "integer":
            const intView = new DataView(new ArrayBuffer(5));
            intView.setUint8(0, 4);
            intView.setInt32(1, header.value, false);
            return new Uint8Array(intView.buffer);
          case "long":
            const longBytes = new Uint8Array(9);
            longBytes[0] = 5;
            longBytes.set(header.value.bytes, 1);
            return longBytes;
          case "binary":
            const binView = new DataView(new ArrayBuffer(3 + header.value.byteLength));
            binView.setUint8(0, 6);
            binView.setUint16(1, header.value.byteLength, false);
            const binBytes = new Uint8Array(binView.buffer);
            binBytes.set(header.value, 3);
            return binBytes;
          case "string":
            const utf8Bytes = this.fromUtf8(header.value);
            const strView = new DataView(new ArrayBuffer(3 + utf8Bytes.byteLength));
            strView.setUint8(0, 7);
            strView.setUint16(1, utf8Bytes.byteLength, false);
            const strBytes = new Uint8Array(strView.buffer);
            strBytes.set(utf8Bytes, 3);
            return strBytes;
          case "timestamp":
            const tsBytes = new Uint8Array(9);
            tsBytes[0] = 8;
            tsBytes.set(Int64.fromNumber(header.value.valueOf()).bytes, 1);
            return tsBytes;
          case "uuid":
            if (!UUID_PATTERN.test(header.value)) {
              throw new Error(`Invalid UUID received: ${header.value}`);
            }
            const uuidBytes = new Uint8Array(17);
            uuidBytes[0] = 9;
            uuidBytes.set(fromHex(header.value.replace(/\-/g, "")), 1);
            return uuidBytes;
        }
      }
      parse(headers) {
        const out = {};
        let position = 0;
        while (position < headers.byteLength) {
          const nameLength = headers.getUint8(position++);
          const name17 = this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, nameLength));
          position += nameLength;
          switch (headers.getUint8(position++)) {
            case 0:
              out[name17] = {
                type: BOOLEAN_TAG,
                value: true
              };
              break;
            case 1:
              out[name17] = {
                type: BOOLEAN_TAG,
                value: false
              };
              break;
            case 2:
              out[name17] = {
                type: BYTE_TAG,
                value: headers.getInt8(position++)
              };
              break;
            case 3:
              out[name17] = {
                type: SHORT_TAG,
                value: headers.getInt16(position, false)
              };
              position += 2;
              break;
            case 4:
              out[name17] = {
                type: INT_TAG,
                value: headers.getInt32(position, false)
              };
              position += 4;
              break;
            case 5:
              out[name17] = {
                type: LONG_TAG,
                value: new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8))
              };
              position += 8;
              break;
            case 6:
              const binaryLength = headers.getUint16(position, false);
              position += 2;
              out[name17] = {
                type: BINARY_TAG,
                value: new Uint8Array(headers.buffer, headers.byteOffset + position, binaryLength)
              };
              position += binaryLength;
              break;
            case 7:
              const stringLength = headers.getUint16(position, false);
              position += 2;
              out[name17] = {
                type: STRING_TAG,
                value: this.toUtf8(new Uint8Array(headers.buffer, headers.byteOffset + position, stringLength))
              };
              position += stringLength;
              break;
            case 8:
              out[name17] = {
                type: TIMESTAMP_TAG,
                value: new Date(new Int64(new Uint8Array(headers.buffer, headers.byteOffset + position, 8)).valueOf())
              };
              position += 8;
              break;
            case 9:
              const uuidBytes = new Uint8Array(headers.buffer, headers.byteOffset + position, 16);
              position += 16;
              out[name17] = {
                type: UUID_TAG,
                value: `${toHex(uuidBytes.subarray(0, 4))}-${toHex(uuidBytes.subarray(4, 6))}-${toHex(uuidBytes.subarray(6, 8))}-${toHex(uuidBytes.subarray(8, 10))}-${toHex(uuidBytes.subarray(10))}`
              };
              break;
            default:
              throw new Error(`Unrecognized header type tag`);
          }
        }
        return out;
      }
    };
    (function(HEADER_VALUE_TYPE2) {
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["boolTrue"] = 0] = "boolTrue";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["boolFalse"] = 1] = "boolFalse";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["byte"] = 2] = "byte";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["short"] = 3] = "short";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["integer"] = 4] = "integer";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["long"] = 5] = "long";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["byteArray"] = 6] = "byteArray";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["string"] = 7] = "string";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["timestamp"] = 8] = "timestamp";
      HEADER_VALUE_TYPE2[HEADER_VALUE_TYPE2["uuid"] = 9] = "uuid";
    })(HEADER_VALUE_TYPE || (HEADER_VALUE_TYPE = {}));
    BOOLEAN_TAG = "boolean";
    BYTE_TAG = "byte";
    SHORT_TAG = "short";
    INT_TAG = "integer";
    LONG_TAG = "long";
    BINARY_TAG = "binary";
    STRING_TAG = "string";
    TIMESTAMP_TAG = "timestamp";
    UUID_TAG = "uuid";
    UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/splitMessage.js
function splitMessage({ byteLength, byteOffset, buffer }) {
  if (byteLength < MINIMUM_MESSAGE_LENGTH) {
    throw new Error("Provided message too short to accommodate event stream message overhead");
  }
  const view = new DataView(buffer, byteOffset, byteLength);
  const messageLength = view.getUint32(0, false);
  if (byteLength !== messageLength) {
    throw new Error("Reported message length does not match received message length");
  }
  const headerLength = view.getUint32(PRELUDE_MEMBER_LENGTH, false);
  const expectedPreludeChecksum = view.getUint32(PRELUDE_LENGTH, false);
  const expectedMessageChecksum = view.getUint32(byteLength - CHECKSUM_LENGTH, false);
  const checksummer = new Crc32().update(new Uint8Array(buffer, byteOffset, PRELUDE_LENGTH));
  if (expectedPreludeChecksum !== checksummer.digest()) {
    throw new Error(`The prelude checksum specified in the message (${expectedPreludeChecksum}) does not match the calculated CRC32 checksum (${checksummer.digest()})`);
  }
  checksummer.update(new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH, byteLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH)));
  if (expectedMessageChecksum !== checksummer.digest()) {
    throw new Error(`The message checksum (${checksummer.digest()}) did not match the expected value of ${expectedMessageChecksum}`);
  }
  return {
    headers: new DataView(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH, headerLength),
    body: new Uint8Array(buffer, byteOffset + PRELUDE_LENGTH + CHECKSUM_LENGTH + headerLength, messageLength - headerLength - (PRELUDE_LENGTH + CHECKSUM_LENGTH + CHECKSUM_LENGTH))
  };
}
var PRELUDE_MEMBER_LENGTH, PRELUDE_LENGTH, CHECKSUM_LENGTH, MINIMUM_MESSAGE_LENGTH;
var init_splitMessage = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/splitMessage.js"() {
    "use strict";
    init_module2();
    PRELUDE_MEMBER_LENGTH = 4;
    PRELUDE_LENGTH = PRELUDE_MEMBER_LENGTH * 2;
    CHECKSUM_LENGTH = 4;
    MINIMUM_MESSAGE_LENGTH = PRELUDE_LENGTH + CHECKSUM_LENGTH * 2;
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/EventStreamCodec.js
var EventStreamCodec;
var init_EventStreamCodec = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/EventStreamCodec.js"() {
    "use strict";
    init_module2();
    init_HeaderMarshaller();
    init_splitMessage();
    EventStreamCodec = class {
      constructor(toUtf82, fromUtf84) {
        this.headerMarshaller = new HeaderMarshaller(toUtf82, fromUtf84);
        this.messageBuffer = [];
        this.isEndOfStream = false;
      }
      feed(message) {
        this.messageBuffer.push(this.decode(message));
      }
      endOfStream() {
        this.isEndOfStream = true;
      }
      getMessage() {
        const message = this.messageBuffer.pop();
        const isEndOfStream = this.isEndOfStream;
        return {
          getMessage() {
            return message;
          },
          isEndOfStream() {
            return isEndOfStream;
          }
        };
      }
      getAvailableMessages() {
        const messages = this.messageBuffer;
        this.messageBuffer = [];
        const isEndOfStream = this.isEndOfStream;
        return {
          getMessages() {
            return messages;
          },
          isEndOfStream() {
            return isEndOfStream;
          }
        };
      }
      encode({ headers: rawHeaders, body }) {
        const headers = this.headerMarshaller.format(rawHeaders);
        const length = headers.byteLength + body.byteLength + 16;
        const out = new Uint8Array(length);
        const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
        const checksum = new Crc32();
        view.setUint32(0, length, false);
        view.setUint32(4, headers.byteLength, false);
        view.setUint32(8, checksum.update(out.subarray(0, 8)).digest(), false);
        out.set(headers, 12);
        out.set(body, headers.byteLength + 12);
        view.setUint32(length - 4, checksum.update(out.subarray(8, length - 4)).digest(), false);
        return out;
      }
      decode(message) {
        const { headers, body } = splitMessage(message);
        return { headers: this.headerMarshaller.parse(headers), body };
      }
      formatHeaders(rawHeaders) {
        return this.headerMarshaller.format(rawHeaders);
      }
    };
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/Message.js
var init_Message = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/Message.js"() {
    "use strict";
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/MessageDecoderStream.js
var init_MessageDecoderStream = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/MessageDecoderStream.js"() {
    "use strict";
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/MessageEncoderStream.js
var init_MessageEncoderStream = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/MessageEncoderStream.js"() {
    "use strict";
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/SmithyMessageDecoderStream.js
var init_SmithyMessageDecoderStream = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/SmithyMessageDecoderStream.js"() {
    "use strict";
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/SmithyMessageEncoderStream.js
var init_SmithyMessageEncoderStream = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/SmithyMessageEncoderStream.js"() {
    "use strict";
  }
});

// node_modules/@smithy/eventstream-codec/dist-es/index.js
var init_dist_es5 = __esm({
  "node_modules/@smithy/eventstream-codec/dist-es/index.js"() {
    "use strict";
    init_EventStreamCodec();
    init_HeaderMarshaller();
    init_Int64();
    init_Message();
    init_MessageDecoderStream();
    init_MessageEncoderStream();
    init_SmithyMessageDecoderStream();
    init_SmithyMessageEncoderStream();
  }
});

// node_modules/@smithy/is-array-buffer/dist-es/index.js
var isArrayBuffer2;
var init_dist_es6 = __esm({
  "node_modules/@smithy/is-array-buffer/dist-es/index.js"() {
    "use strict";
    isArrayBuffer2 = (arg) => typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer || Object.prototype.toString.call(arg) === "[object ArrayBuffer]";
  }
});

// node_modules/@smithy/util-buffer-from/dist-es/index.js
import { Buffer as Buffer3 } from "buffer";
var fromArrayBuffer2, fromString2;
var init_dist_es7 = __esm({
  "node_modules/@smithy/util-buffer-from/dist-es/index.js"() {
    "use strict";
    init_dist_es6();
    fromArrayBuffer2 = (input, offset = 0, length = input.byteLength - offset) => {
      if (!isArrayBuffer2(input)) {
        throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
      }
      return Buffer3.from(input, offset, length);
    };
    fromString2 = (input, encoding) => {
      if (typeof input !== "string") {
        throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
      }
      return encoding ? Buffer3.from(input, encoding) : Buffer3.from(input);
    };
  }
});

// node_modules/@smithy/util-utf8/dist-es/fromUtf8.js
var fromUtf83;
var init_fromUtf82 = __esm({
  "node_modules/@smithy/util-utf8/dist-es/fromUtf8.js"() {
    "use strict";
    init_dist_es7();
    fromUtf83 = (input) => {
      const buf = fromString2(input, "utf8");
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    };
  }
});

// node_modules/@smithy/util-utf8/dist-es/toUint8Array.js
var init_toUint8Array2 = __esm({
  "node_modules/@smithy/util-utf8/dist-es/toUint8Array.js"() {
    "use strict";
    init_fromUtf82();
  }
});

// node_modules/@smithy/util-utf8/dist-es/toUtf8.js
var toUtf8;
var init_toUtf82 = __esm({
  "node_modules/@smithy/util-utf8/dist-es/toUtf8.js"() {
    "use strict";
    init_dist_es7();
    toUtf8 = (input) => {
      if (typeof input === "string") {
        return input;
      }
      if (typeof input !== "object" || typeof input.byteOffset !== "number" || typeof input.byteLength !== "number") {
        throw new Error("@smithy/util-utf8: toUtf8 encoder function only accepts string | Uint8Array.");
      }
      return fromArrayBuffer2(input.buffer, input.byteOffset, input.byteLength).toString("utf8");
    };
  }
});

// node_modules/@smithy/util-utf8/dist-es/index.js
var init_dist_es8 = __esm({
  "node_modules/@smithy/util-utf8/dist-es/index.js"() {
    "use strict";
    init_fromUtf82();
    init_toUint8Array2();
    init_toUtf82();
  }
});

// node_modules/aws4fetch/dist/aws4fetch.esm.mjs
async function hmac(key, string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? encoder.encode(key) : key,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(string));
}
async function hash(content) {
  return crypto.subtle.digest("SHA-256", typeof content === "string" ? encoder.encode(content) : content);
}
function buf2hex(arrayBuffer) {
  const buffer = new Uint8Array(arrayBuffer);
  let out = "";
  for (let idx = 0; idx < buffer.length; idx++) {
    const n = buffer[idx];
    out += HEX_CHARS[n >>> 4 & 15];
    out += HEX_CHARS[n & 15];
  }
  return out;
}
function encodeRfc3986(urlEncodedStr) {
  return urlEncodedStr.replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
function guessServiceRegion(url, headers) {
  const { hostname, pathname } = url;
  if (hostname.endsWith(".on.aws")) {
    const match2 = hostname.match(/^[^.]{1,63}\.lambda-url\.([^.]{1,63})\.on\.aws$/);
    return match2 != null ? ["lambda", match2[1] || ""] : ["", ""];
  }
  if (hostname.endsWith(".r2.cloudflarestorage.com")) {
    return ["s3", "auto"];
  }
  if (hostname.endsWith(".backblazeb2.com")) {
    const match2 = hostname.match(/^(?:[^.]{1,63}\.)?s3\.([^.]{1,63})\.backblazeb2\.com$/);
    return match2 != null ? ["s3", match2[1] || ""] : ["", ""];
  }
  const match = hostname.replace("dualstack.", "").match(/([^.]{1,63})\.(?:([^.]{0,63})\.)?amazonaws\.com(?:\.cn)?$/);
  let service = match && match[1] || "";
  let region = match && match[2];
  if (region === "us-gov") {
    region = "us-gov-west-1";
  } else if (region === "s3" || region === "s3-accelerate") {
    region = "us-east-1";
    service = "s3";
  } else if (service === "iot") {
    if (hostname.startsWith("iot.")) {
      service = "execute-api";
    } else if (hostname.startsWith("data.jobs.iot.")) {
      service = "iot-jobs-data";
    } else {
      service = pathname === "/mqtt" ? "iotdevicegateway" : "iotdata";
    }
  } else if (service === "autoscaling") {
    const targetPrefix = (headers.get("X-Amz-Target") || "").split(".")[0];
    if (targetPrefix === "AnyScaleFrontendService") {
      service = "application-autoscaling";
    } else if (targetPrefix === "AnyScaleScalingPlannerFrontendService") {
      service = "autoscaling-plans";
    }
  } else if (region == null && service.startsWith("s3-")) {
    region = service.slice(3).replace(/^fips-|^external-1/, "");
    service = "s3";
  } else if (service.endsWith("-fips")) {
    service = service.slice(0, -5);
  } else if (region && /-\d$/.test(service) && !/-\d$/.test(region)) {
    [service, region] = [region, service];
  }
  return [HOST_SERVICES[service] || service, region || ""];
}
var encoder, HOST_SERVICES, UNSIGNABLE_HEADERS, AwsV4Signer, HEX_CHARS;
var init_aws4fetch_esm = __esm({
  "node_modules/aws4fetch/dist/aws4fetch.esm.mjs"() {
    "use strict";
    encoder = new TextEncoder();
    HOST_SERVICES = {
      appstream2: "appstream",
      cloudhsmv2: "cloudhsm",
      email: "ses",
      marketplace: "aws-marketplace",
      mobile: "AWSMobileHubService",
      pinpoint: "mobiletargeting",
      queue: "sqs",
      "git-codecommit": "codecommit",
      "mturk-requester-sandbox": "mturk-requester",
      "personalize-runtime": "personalize"
    };
    UNSIGNABLE_HEADERS = /* @__PURE__ */ new Set([
      "authorization",
      "content-type",
      "content-length",
      "user-agent",
      "presigned-expires",
      "expect",
      "x-amzn-trace-id",
      "range",
      "connection"
    ]);
    AwsV4Signer = class {
      constructor({ method, url, headers, body, accessKeyId, secretAccessKey, sessionToken, service, region, cache, datetime, signQuery, appendSessionToken, allHeaders, singleEncode }) {
        if (url == null) throw new TypeError("url is a required option");
        if (accessKeyId == null) throw new TypeError("accessKeyId is a required option");
        if (secretAccessKey == null) throw new TypeError("secretAccessKey is a required option");
        this.method = method || (body ? "POST" : "GET");
        this.url = new URL(url);
        this.headers = new Headers(headers || {});
        this.body = body;
        this.accessKeyId = accessKeyId;
        this.secretAccessKey = secretAccessKey;
        this.sessionToken = sessionToken;
        let guessedService, guessedRegion;
        if (!service || !region) {
          [guessedService, guessedRegion] = guessServiceRegion(this.url, this.headers);
        }
        this.service = service || guessedService || "";
        this.region = region || guessedRegion || "us-east-1";
        this.cache = cache || /* @__PURE__ */ new Map();
        this.datetime = datetime || (/* @__PURE__ */ new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "");
        this.signQuery = signQuery;
        this.appendSessionToken = appendSessionToken || this.service === "iotdevicegateway";
        this.headers.delete("Host");
        if (this.service === "s3" && !this.signQuery && !this.headers.has("X-Amz-Content-Sha256")) {
          this.headers.set("X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD");
        }
        const params = this.signQuery ? this.url.searchParams : this.headers;
        params.set("X-Amz-Date", this.datetime);
        if (this.sessionToken && !this.appendSessionToken) {
          params.set("X-Amz-Security-Token", this.sessionToken);
        }
        this.signableHeaders = ["host", ...this.headers.keys()].filter((header) => allHeaders || !UNSIGNABLE_HEADERS.has(header)).sort();
        this.signedHeaders = this.signableHeaders.join(";");
        this.canonicalHeaders = this.signableHeaders.map((header) => header + ":" + (header === "host" ? this.url.host : (this.headers.get(header) || "").replace(/\s+/g, " "))).join("\n");
        this.credentialString = [this.datetime.slice(0, 8), this.region, this.service, "aws4_request"].join("/");
        if (this.signQuery) {
          if (this.service === "s3" && !params.has("X-Amz-Expires")) {
            params.set("X-Amz-Expires", "86400");
          }
          params.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
          params.set("X-Amz-Credential", this.accessKeyId + "/" + this.credentialString);
          params.set("X-Amz-SignedHeaders", this.signedHeaders);
        }
        if (this.service === "s3") {
          try {
            this.encodedPath = decodeURIComponent(this.url.pathname.replace(/\+/g, " "));
          } catch (e) {
            this.encodedPath = this.url.pathname;
          }
        } else {
          this.encodedPath = this.url.pathname.replace(/\/+/g, "/");
        }
        if (!singleEncode) {
          this.encodedPath = encodeURIComponent(this.encodedPath).replace(/%2F/g, "/");
        }
        this.encodedPath = encodeRfc3986(this.encodedPath);
        const seenKeys = /* @__PURE__ */ new Set();
        this.encodedSearch = [...this.url.searchParams].filter(([k]) => {
          if (!k) return false;
          if (this.service === "s3") {
            if (seenKeys.has(k)) return false;
            seenKeys.add(k);
          }
          return true;
        }).map((pair) => pair.map((p) => encodeRfc3986(encodeURIComponent(p)))).sort(([k1, v1], [k2, v2]) => k1 < k2 ? -1 : k1 > k2 ? 1 : v1 < v2 ? -1 : v1 > v2 ? 1 : 0).map((pair) => pair.join("=")).join("&");
      }
      async sign() {
        if (this.signQuery) {
          this.url.searchParams.set("X-Amz-Signature", await this.signature());
          if (this.sessionToken && this.appendSessionToken) {
            this.url.searchParams.set("X-Amz-Security-Token", this.sessionToken);
          }
        } else {
          this.headers.set("Authorization", await this.authHeader());
        }
        return {
          method: this.method,
          url: this.url,
          headers: this.headers,
          body: this.body
        };
      }
      async authHeader() {
        return [
          "AWS4-HMAC-SHA256 Credential=" + this.accessKeyId + "/" + this.credentialString,
          "SignedHeaders=" + this.signedHeaders,
          "Signature=" + await this.signature()
        ].join(", ");
      }
      async signature() {
        const date = this.datetime.slice(0, 8);
        const cacheKey = [this.secretAccessKey, date, this.region, this.service].join();
        let kCredentials = this.cache.get(cacheKey);
        if (!kCredentials) {
          const kDate = await hmac("AWS4" + this.secretAccessKey, date);
          const kRegion = await hmac(kDate, this.region);
          const kService = await hmac(kRegion, this.service);
          kCredentials = await hmac(kService, "aws4_request");
          this.cache.set(cacheKey, kCredentials);
        }
        return buf2hex(await hmac(kCredentials, await this.stringToSign()));
      }
      async stringToSign() {
        return [
          "AWS4-HMAC-SHA256",
          this.datetime,
          this.credentialString,
          buf2hex(await hash(await this.canonicalString()))
        ].join("\n");
      }
      async canonicalString() {
        return [
          this.method.toUpperCase(),
          this.encodedPath,
          this.encodedSearch,
          this.canonicalHeaders + "\n",
          this.signedHeaders,
          await this.hexBodyHash()
        ].join("\n");
      }
      async hexBodyHash() {
        let hashHeader = this.headers.get("X-Amz-Content-Sha256") || (this.service === "s3" && this.signQuery ? "UNSIGNED-PAYLOAD" : null);
        if (hashHeader == null) {
          if (this.body && typeof this.body !== "string" && !("byteLength" in this.body)) {
            throw new Error("body must be a string, ArrayBuffer or ArrayBufferView, unless you include the X-Amz-Content-Sha256 header");
          }
          hashHeader = buf2hex(await hash(this.body || ""));
        }
        return hashHeader;
      }
    };
    HEX_CHARS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
  }
});

// node_modules/@ai-sdk/amazon-bedrock/dist/index.mjs
import { z as z23 } from "zod";
import { z as z9 } from "zod";
import { z as z33 } from "zod";
import { z as z42 } from "zod";
function prepareTools2(mode) {
  var _a18;
  const tools = ((_a18 = mode.tools) == null ? void 0 : _a18.length) ? mode.tools : void 0;
  if (tools == null) {
    return {
      toolConfig: { tools: void 0, toolChoice: void 0 },
      toolWarnings: []
    };
  }
  const toolWarnings = [];
  const bedrockTools = [];
  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      bedrockTools.push({
        toolSpec: {
          name: tool.name,
          description: tool.description,
          inputSchema: {
            json: tool.parameters
          }
        }
      });
    }
  }
  const toolChoice = mode.toolChoice;
  if (toolChoice == null) {
    return {
      toolConfig: { tools: bedrockTools, toolChoice: void 0 },
      toolWarnings
    };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
      return {
        toolConfig: { tools: bedrockTools, toolChoice: { auto: {} } },
        toolWarnings
      };
    case "required":
      return {
        toolConfig: { tools: bedrockTools, toolChoice: { any: {} } },
        toolWarnings
      };
    case "none":
      return {
        toolConfig: { tools: void 0, toolChoice: void 0 },
        toolWarnings
      };
    case "tool":
      return {
        toolConfig: {
          tools: bedrockTools,
          toolChoice: { tool: { name: toolChoice.toolName } }
        },
        toolWarnings
      };
    default: {
      const _exhaustiveCheck = type;
      throw new UnsupportedFunctionalityError2({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}
function getCachePoint(providerMetadata) {
  var _a18;
  return (_a18 = providerMetadata == null ? void 0 : providerMetadata.bedrock) == null ? void 0 : _a18.cachePoint;
}
function convertToBedrockChatMessages(prompt) {
  var _a18, _b, _c, _d, _e;
  const blocks = groupIntoBlocks(prompt);
  let system = [];
  const messages = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isLastBlock = i === blocks.length - 1;
    const type = block.type;
    switch (type) {
      case "system": {
        if (messages.length > 0) {
          throw new UnsupportedFunctionalityError2({
            functionality: "Multiple system messages that are separated by user/assistant messages"
          });
        }
        for (const message of block.messages) {
          system.push({ text: message.content });
          if (getCachePoint(message.providerMetadata)) {
            system.push(BEDROCK_CACHE_POINT);
          }
        }
        break;
      }
      case "user": {
        const bedrockContent = [];
        for (const message of block.messages) {
          const { role, content, providerMetadata } = message;
          switch (role) {
            case "user": {
              for (let j = 0; j < content.length; j++) {
                const part = content[j];
                switch (part.type) {
                  case "text": {
                    bedrockContent.push({
                      text: part.text
                    });
                    break;
                  }
                  case "image": {
                    if (part.image instanceof URL) {
                      throw new UnsupportedFunctionalityError2({
                        functionality: "Image URLs in user messages"
                      });
                    }
                    bedrockContent.push({
                      image: {
                        format: (_b = (_a18 = part.mimeType) == null ? void 0 : _a18.split(
                          "/"
                        )) == null ? void 0 : _b[1],
                        source: {
                          bytes: convertUint8ArrayToBase642(
                            (_c = part.image) != null ? _c : part.image
                          )
                        }
                      }
                    });
                    break;
                  }
                  case "file": {
                    if (part.data instanceof URL) {
                      throw new UnsupportedFunctionalityError2({
                        functionality: "File URLs in user messages"
                      });
                    }
                    bedrockContent.push({
                      document: {
                        format: (_e = (_d = part.mimeType) == null ? void 0 : _d.split(
                          "/"
                        )) == null ? void 0 : _e[1],
                        name: generateFileId(),
                        source: {
                          bytes: part.data
                        }
                      }
                    });
                    break;
                  }
                }
              }
              break;
            }
            case "tool": {
              for (let i2 = 0; i2 < content.length; i2++) {
                const part = content[i2];
                const toolResultContent = part.content != void 0 ? part.content.map((part2) => {
                  switch (part2.type) {
                    case "text":
                      return {
                        text: part2.text
                      };
                    case "image":
                      if (!part2.mimeType) {
                        throw new Error(
                          "Image mime type is required in tool result part content"
                        );
                      }
                      const format = part2.mimeType.split("/")[1];
                      if (!isBedrockImageFormat(format)) {
                        throw new Error(
                          `Unsupported image format: ${format}`
                        );
                      }
                      return {
                        image: {
                          format,
                          source: {
                            bytes: part2.data
                          }
                        }
                      };
                  }
                }) : [{ text: JSON.stringify(part.result) }];
                bedrockContent.push({
                  toolResult: {
                    toolUseId: part.toolCallId,
                    content: toolResultContent
                  }
                });
              }
              break;
            }
            default: {
              const _exhaustiveCheck = role;
              throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
            }
          }
          if (getCachePoint(providerMetadata)) {
            bedrockContent.push(BEDROCK_CACHE_POINT);
          }
        }
        messages.push({ role: "user", content: bedrockContent });
        break;
      }
      case "assistant": {
        const bedrockContent = [];
        for (let j = 0; j < block.messages.length; j++) {
          const message = block.messages[j];
          const isLastMessage = j === block.messages.length - 1;
          const { content } = message;
          for (let k = 0; k < content.length; k++) {
            const part = content[k];
            const isLastContentPart = k === content.length - 1;
            switch (part.type) {
              case "text": {
                bedrockContent.push({
                  text: (
                    // trim the last text part if it's the last message in the block
                    // because Bedrock does not allow trailing whitespace
                    // in pre-filled assistant responses
                    trimIfLast(
                      isLastBlock,
                      isLastMessage,
                      isLastContentPart,
                      part.text
                    )
                  )
                });
                break;
              }
              case "reasoning": {
                bedrockContent.push({
                  reasoningContent: {
                    reasoningText: {
                      // trim the last text part if it's the last message in the block
                      // because Bedrock does not allow trailing whitespace
                      // in pre-filled assistant responses
                      text: trimIfLast(
                        isLastBlock,
                        isLastMessage,
                        isLastContentPart,
                        part.text
                      ),
                      signature: part.signature
                    }
                  }
                });
                break;
              }
              case "redacted-reasoning": {
                bedrockContent.push({
                  reasoningContent: {
                    redactedReasoning: {
                      data: part.data
                    }
                  }
                });
                break;
              }
              case "tool-call": {
                bedrockContent.push({
                  toolUse: {
                    toolUseId: part.toolCallId,
                    name: part.toolName,
                    input: part.args
                  }
                });
                break;
              }
            }
          }
          if (getCachePoint(message.providerMetadata)) {
            bedrockContent.push(BEDROCK_CACHE_POINT);
          }
        }
        messages.push({ role: "assistant", content: bedrockContent });
        break;
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  return { system, messages };
}
function isBedrockImageFormat(format) {
  return ["jpeg", "png", "gif"].includes(format);
}
function trimIfLast(isLastBlock, isLastMessage, isLastContentPart, text) {
  return isLastBlock && isLastMessage && isLastContentPart ? text.trim() : text;
}
function groupIntoBlocks(prompt) {
  const blocks = [];
  let currentBlock = void 0;
  for (const message of prompt) {
    const { role } = message;
    switch (role) {
      case "system": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "system") {
          currentBlock = { type: "system", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "assistant": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "assistant") {
          currentBlock = { type: "assistant", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "user": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "user") {
          currentBlock = { type: "user", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      case "tool": {
        if ((currentBlock == null ? void 0 : currentBlock.type) !== "user") {
          currentBlock = { type: "user", messages: [] };
          blocks.push(currentBlock);
        }
        currentBlock.messages.push(message);
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return blocks;
}
function mapBedrockFinishReason(finishReason) {
  switch (finishReason) {
    case "stop_sequence":
    case "end_turn":
      return "stop";
    case "max_tokens":
      return "length";
    case "content_filtered":
    case "guardrail_intervened":
      return "content-filter";
    case "tool_use":
      return "tool-calls";
    default:
      return "unknown";
  }
}
function extractHeaders(headers) {
  let originalHeaders = {};
  if (headers) {
    if (headers instanceof Headers) {
      originalHeaders = convertHeadersToRecord(headers);
    } else if (Array.isArray(headers)) {
      for (const [k, v] of headers) {
        originalHeaders[k.toLowerCase()] = v;
      }
    } else {
      originalHeaders = Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
      );
    }
  }
  return originalHeaders;
}
function convertHeadersToRecord(headers) {
  const record = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}
function createSigV4FetchFunction(getCredentials, fetch2 = globalThis.fetch) {
  return async (input, init) => {
    var _a18;
    if (((_a18 = init == null ? void 0 : init.method) == null ? void 0 : _a18.toUpperCase()) !== "POST" || !(init == null ? void 0 : init.body)) {
      return fetch2(input, init);
    }
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const originalHeaders = extractHeaders(init.headers);
    const body = prepareBodyString(init.body);
    const credentials = await getCredentials();
    const signer = new AwsV4Signer({
      url,
      method: "POST",
      headers: Object.entries(removeUndefinedEntries2(originalHeaders)),
      body,
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      service: "bedrock"
    });
    const signingResult = await signer.sign();
    const signedHeaders = convertHeadersToRecord(signingResult.headers);
    return fetch2(input, {
      ...init,
      body,
      headers: removeUndefinedEntries2(
        combineHeaders2(originalHeaders, signedHeaders)
      )
    });
  };
}
function prepareBodyString(body) {
  if (typeof body === "string") {
    return body;
  } else if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  } else if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(body));
  } else {
    return JSON.stringify(body);
  }
}
function createAmazonBedrock(options = {}) {
  const sigv4Fetch = createSigV4FetchFunction(async () => {
    const region = loadSetting2({
      settingValue: options.region,
      settingName: "region",
      environmentVariableName: "AWS_REGION",
      description: "AWS region"
    });
    if (options.credentialProvider) {
      return {
        ...await options.credentialProvider(),
        region
      };
    }
    return {
      region,
      accessKeyId: loadSetting2({
        settingValue: options.accessKeyId,
        settingName: "accessKeyId",
        environmentVariableName: "AWS_ACCESS_KEY_ID",
        description: "AWS access key ID"
      }),
      secretAccessKey: loadSetting2({
        settingValue: options.secretAccessKey,
        settingName: "secretAccessKey",
        environmentVariableName: "AWS_SECRET_ACCESS_KEY",
        description: "AWS secret access key"
      }),
      sessionToken: loadOptionalSetting({
        settingValue: options.sessionToken,
        environmentVariableName: "AWS_SESSION_TOKEN"
      })
    };
  }, options.fetch);
  const getBaseUrl = () => {
    var _a18, _b;
    return (_b = withoutTrailingSlash(
      (_a18 = options.baseURL) != null ? _a18 : `https://bedrock-runtime.${loadSetting2({
        settingValue: options.region,
        settingName: "region",
        environmentVariableName: "AWS_REGION",
        description: "AWS region"
      })}.amazonaws.com`
    )) != null ? _b : `https://bedrock-runtime.us-east-1.amazonaws.com`;
  };
  const createChatModel = (modelId, settings = {}) => {
    var _a18;
    return new BedrockChatLanguageModel(modelId, settings, {
      baseUrl: getBaseUrl,
      headers: (_a18 = options.headers) != null ? _a18 : {},
      fetch: sigv4Fetch,
      generateId: generateId3
    });
  };
  const provider = function(modelId, settings) {
    if (new.target) {
      throw new Error(
        "The Amazon Bedrock model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId, settings);
  };
  const createEmbeddingModel = (modelId, settings = {}) => {
    var _a18;
    return new BedrockEmbeddingModel(modelId, settings, {
      baseUrl: getBaseUrl,
      headers: (_a18 = options.headers) != null ? _a18 : {},
      fetch: sigv4Fetch
    });
  };
  const createImageModel = (modelId, settings = {}) => {
    var _a18;
    return new BedrockImageModel(modelId, settings, {
      baseUrl: getBaseUrl,
      headers: (_a18 = options.headers) != null ? _a18 : {},
      fetch: sigv4Fetch
    });
  };
  provider.languageModel = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.image = createImageModel;
  provider.imageModel = createImageModel;
  return provider;
}
var BEDROCK_CACHE_POINT, BEDROCK_STOP_REASONS, BedrockErrorSchema, createBedrockEventStreamResponseHandler, generateFileId, BedrockChatLanguageModel, BedrockReasoningConfigOptionsSchema, BedrockStopReasonSchema, BedrockToolUseSchema, BedrockReasoningTextSchema, BedrockRedactedReasoningSchema, BedrockResponseSchema, BedrockStreamSchema, BedrockEmbeddingModel, BedrockEmbeddingResponseSchema, modelMaxImagesPerCall2, BedrockImageModel, bedrockImageResponseSchema, bedrock;
var init_dist9 = __esm({
  "node_modules/@ai-sdk/amazon-bedrock/dist/index.mjs"() {
    "use strict";
    init_dist8();
    init_dist7();
    init_dist8();
    init_dist7();
    init_dist8();
    init_dist_es5();
    init_dist_es8();
    init_dist7();
    init_dist7();
    init_dist8();
    init_dist8();
    init_dist8();
    init_dist8();
    init_aws4fetch_esm();
    BEDROCK_CACHE_POINT = {
      cachePoint: { type: "default" }
    };
    BEDROCK_STOP_REASONS = [
      "stop",
      "stop_sequence",
      "end_turn",
      "length",
      "max_tokens",
      "content-filter",
      "content_filtered",
      "guardrail_intervened",
      "tool-calls",
      "tool_use"
    ];
    BedrockErrorSchema = z9.object({
      message: z9.string(),
      type: z9.string().nullish()
    });
    createBedrockEventStreamResponseHandler = (chunkSchema2) => async ({ response }) => {
      const responseHeaders = extractResponseHeaders2(response);
      if (response.body == null) {
        throw new EmptyResponseBodyError2({});
      }
      const codec = new EventStreamCodec(toUtf8, fromUtf83);
      let buffer = new Uint8Array(0);
      const textDecoder = new TextDecoder();
      return {
        responseHeaders,
        value: response.body.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              var _a18, _b;
              const newBuffer = new Uint8Array(buffer.length + chunk.length);
              newBuffer.set(buffer);
              newBuffer.set(chunk, buffer.length);
              buffer = newBuffer;
              while (buffer.length >= 4) {
                const totalLength = new DataView(
                  buffer.buffer,
                  buffer.byteOffset,
                  buffer.byteLength
                ).getUint32(0, false);
                if (buffer.length < totalLength) {
                  break;
                }
                try {
                  const subView = buffer.subarray(0, totalLength);
                  const decoded = codec.decode(subView);
                  buffer = buffer.slice(totalLength);
                  if (((_a18 = decoded.headers[":message-type"]) == null ? void 0 : _a18.value) === "event") {
                    const data = textDecoder.decode(decoded.body);
                    const parsedDataResult = safeParseJSON2({ text: data });
                    if (!parsedDataResult.success) {
                      controller.enqueue(parsedDataResult);
                      break;
                    }
                    delete parsedDataResult.value.p;
                    let wrappedData = {
                      [(_b = decoded.headers[":event-type"]) == null ? void 0 : _b.value]: parsedDataResult.value
                    };
                    const validatedWrappedData = safeValidateTypes2({
                      value: wrappedData,
                      schema: chunkSchema2
                    });
                    if (!validatedWrappedData.success) {
                      controller.enqueue(validatedWrappedData);
                    } else {
                      controller.enqueue({
                        success: true,
                        value: validatedWrappedData.value,
                        rawValue: wrappedData
                      });
                    }
                  }
                } catch (e) {
                  break;
                }
              }
            }
          })
        )
      };
    };
    generateFileId = createIdGenerator3({ prefix: "file", size: 16 });
    BedrockChatLanguageModel = class {
      constructor(modelId, settings, config) {
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
        this.specificationVersion = "v1";
        this.provider = "amazon-bedrock";
        this.defaultObjectGenerationMode = "tool";
        this.supportsImageUrls = false;
      }
      getArgs({
        mode,
        prompt,
        maxTokens,
        temperature,
        topP,
        topK,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
        responseFormat,
        seed,
        providerMetadata
      }) {
        var _a18, _b, _c, _d, _e, _f, _g;
        const type = mode.type;
        const warnings = [];
        if (frequencyPenalty != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "frequencyPenalty"
          });
        }
        if (presencePenalty != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "presencePenalty"
          });
        }
        if (seed != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "seed"
          });
        }
        if (topK != null) {
          warnings.push({
            type: "unsupported-setting",
            setting: "topK"
          });
        }
        if (responseFormat != null && responseFormat.type !== "text") {
          warnings.push({
            type: "unsupported-setting",
            setting: "responseFormat",
            details: "JSON response format is not supported."
          });
        }
        const { system, messages } = convertToBedrockChatMessages(prompt);
        const reasoningConfigOptions = BedrockReasoningConfigOptionsSchema.safeParse(
          (_a18 = providerMetadata == null ? void 0 : providerMetadata.bedrock) == null ? void 0 : _a18.reasoningConfig
        );
        if (!reasoningConfigOptions.success) {
          throw new InvalidArgumentError3({
            argument: "providerOptions.bedrock.reasoningConfig",
            message: "invalid reasoning configuration options",
            cause: reasoningConfigOptions.error
          });
        }
        const isThinking = ((_b = reasoningConfigOptions.data) == null ? void 0 : _b.type) === "enabled";
        const thinkingBudget = (_e = (_c = reasoningConfigOptions.data) == null ? void 0 : _c.budgetTokens) != null ? _e : (_d = reasoningConfigOptions.data) == null ? void 0 : _d.budget_tokens;
        const inferenceConfig = {
          ...maxTokens != null && { maxTokens },
          ...temperature != null && { temperature },
          ...topP != null && { topP },
          ...stopSequences != null && { stopSequences }
        };
        if (isThinking && thinkingBudget != null) {
          if (inferenceConfig.maxTokens != null) {
            inferenceConfig.maxTokens += thinkingBudget;
          } else {
            inferenceConfig.maxTokens = thinkingBudget + 4096;
          }
          this.settings.additionalModelRequestFields = {
            ...this.settings.additionalModelRequestFields,
            reasoningConfig: {
              type: (_f = reasoningConfigOptions.data) == null ? void 0 : _f.type,
              budget_tokens: thinkingBudget
            }
          };
        }
        if (isThinking && inferenceConfig.temperature != null) {
          delete inferenceConfig.temperature;
          warnings.push({
            type: "unsupported-setting",
            setting: "temperature",
            details: "temperature is not supported when thinking is enabled"
          });
        }
        if (isThinking && inferenceConfig.topP != null) {
          delete inferenceConfig.topP;
          warnings.push({
            type: "unsupported-setting",
            setting: "topP",
            details: "topP is not supported when thinking is enabled"
          });
        }
        const baseArgs = {
          system,
          additionalModelRequestFields: this.settings.additionalModelRequestFields,
          ...Object.keys(inferenceConfig).length > 0 && {
            inferenceConfig
          },
          messages,
          ...providerMetadata == null ? void 0 : providerMetadata.bedrock
        };
        switch (type) {
          case "regular": {
            const { toolConfig, toolWarnings } = prepareTools2(mode);
            return {
              command: {
                ...baseArgs,
                ...((_g = toolConfig.tools) == null ? void 0 : _g.length) ? { toolConfig } : {}
              },
              warnings: [...warnings, ...toolWarnings]
            };
          }
          case "object-json": {
            throw new UnsupportedFunctionalityError2({
              functionality: "json-mode object generation"
            });
          }
          case "object-tool": {
            return {
              command: {
                ...baseArgs,
                toolConfig: {
                  tools: [
                    {
                      toolSpec: {
                        name: mode.tool.name,
                        description: mode.tool.description,
                        inputSchema: {
                          json: mode.tool.parameters
                        }
                      }
                    }
                  ],
                  toolChoice: { tool: { name: mode.tool.name } }
                }
              },
              warnings
            };
          }
          default: {
            const _exhaustiveCheck = type;
            throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
          }
        }
      }
      async doGenerate(options) {
        var _a18, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
        const { command: args, warnings } = this.getArgs(options);
        const url = `${this.getUrl(this.modelId)}/converse`;
        const { value: response, responseHeaders } = await postJsonToApi2({
          url,
          headers: combineHeaders2(
            await resolve(this.config.headers),
            options.headers
          ),
          body: args,
          failedResponseHandler: createJsonErrorResponseHandler2({
            errorSchema: BedrockErrorSchema,
            errorToMessage: (error) => {
              var _a25;
              return `${(_a25 = error.message) != null ? _a25 : "Unknown error"}`;
            }
          }),
          successfulResponseHandler: createJsonResponseHandler2(
            BedrockResponseSchema
          ),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { messages: rawPrompt, ...rawSettings } = args;
        const providerMetadata = response.trace || response.usage ? {
          bedrock: {
            ...response.trace && typeof response.trace === "object" ? { trace: response.trace } : {},
            ...response.usage && {
              usage: {
                cacheReadInputTokens: (_b = (_a18 = response.usage) == null ? void 0 : _a18.cacheReadInputTokens) != null ? _b : Number.NaN,
                cacheWriteInputTokens: (_d = (_c = response.usage) == null ? void 0 : _c.cacheWriteInputTokens) != null ? _d : Number.NaN
              }
            }
          }
        } : void 0;
        const reasoning = response.output.message.content.filter((content) => content.reasoningContent).map((content) => {
          var _a25;
          if (content.reasoningContent && "reasoningText" in content.reasoningContent) {
            return {
              type: "text",
              text: content.reasoningContent.reasoningText.text,
              ...content.reasoningContent.reasoningText.signature && {
                signature: content.reasoningContent.reasoningText.signature
              }
            };
          } else if (content.reasoningContent && "redactedReasoning" in content.reasoningContent) {
            return {
              type: "redacted",
              data: (_a25 = content.reasoningContent.redactedReasoning.data) != null ? _a25 : ""
            };
          } else {
            return void 0;
          }
        }).filter((item) => item !== void 0);
        return {
          text: (_h = (_g = (_f = (_e = response.output) == null ? void 0 : _e.message) == null ? void 0 : _f.content) == null ? void 0 : _g.map((part) => {
            var _a25;
            return (_a25 = part.text) != null ? _a25 : "";
          }).join("")) != null ? _h : void 0,
          toolCalls: (_l = (_k = (_j = (_i = response.output) == null ? void 0 : _i.message) == null ? void 0 : _j.content) == null ? void 0 : _k.filter((part) => !!part.toolUse)) == null ? void 0 : _l.map((part) => {
            var _a25, _b2, _c2, _d2, _e2, _f2;
            return {
              toolCallType: "function",
              toolCallId: (_b2 = (_a25 = part.toolUse) == null ? void 0 : _a25.toolUseId) != null ? _b2 : this.config.generateId(),
              toolName: (_d2 = (_c2 = part.toolUse) == null ? void 0 : _c2.name) != null ? _d2 : `tool-${this.config.generateId()}`,
              args: JSON.stringify((_f2 = (_e2 = part.toolUse) == null ? void 0 : _e2.input) != null ? _f2 : "")
            };
          }),
          finishReason: mapBedrockFinishReason(
            response.stopReason
          ),
          usage: {
            promptTokens: (_n = (_m = response.usage) == null ? void 0 : _m.inputTokens) != null ? _n : Number.NaN,
            completionTokens: (_p = (_o = response.usage) == null ? void 0 : _o.outputTokens) != null ? _p : Number.NaN
          },
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders },
          warnings,
          reasoning: reasoning.length > 0 ? reasoning : void 0,
          ...providerMetadata && { providerMetadata }
        };
      }
      async doStream(options) {
        const { command: args, warnings } = this.getArgs(options);
        const url = `${this.getUrl(this.modelId)}/converse-stream`;
        const { value: response, responseHeaders } = await postJsonToApi2({
          url,
          headers: combineHeaders2(
            await resolve(this.config.headers),
            options.headers
          ),
          body: args,
          failedResponseHandler: createJsonErrorResponseHandler2({
            errorSchema: BedrockErrorSchema,
            errorToMessage: (error) => `${error.type}: ${error.message}`
          }),
          successfulResponseHandler: createBedrockEventStreamResponseHandler(BedrockStreamSchema),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { messages: rawPrompt, ...rawSettings } = args;
        let finishReason = "unknown";
        let usage = {
          promptTokens: Number.NaN,
          completionTokens: Number.NaN
        };
        let providerMetadata = void 0;
        const toolCallContentBlocks = {};
        return {
          stream: response.pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                var _a18, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
                function enqueueError(bedrockError) {
                  finishReason = "error";
                  controller.enqueue({ type: "error", error: bedrockError });
                }
                if (!chunk.success) {
                  enqueueError(chunk.error);
                  return;
                }
                const value = chunk.value;
                if (value.internalServerException) {
                  enqueueError(value.internalServerException);
                  return;
                }
                if (value.modelStreamErrorException) {
                  enqueueError(value.modelStreamErrorException);
                  return;
                }
                if (value.throttlingException) {
                  enqueueError(value.throttlingException);
                  return;
                }
                if (value.validationException) {
                  enqueueError(value.validationException);
                  return;
                }
                if (value.messageStop) {
                  finishReason = mapBedrockFinishReason(
                    value.messageStop.stopReason
                  );
                }
                if (value.metadata) {
                  usage = {
                    promptTokens: (_b = (_a18 = value.metadata.usage) == null ? void 0 : _a18.inputTokens) != null ? _b : Number.NaN,
                    completionTokens: (_d = (_c = value.metadata.usage) == null ? void 0 : _c.outputTokens) != null ? _d : Number.NaN
                  };
                  const cacheUsage = ((_e = value.metadata.usage) == null ? void 0 : _e.cacheReadInputTokens) != null || ((_f = value.metadata.usage) == null ? void 0 : _f.cacheWriteInputTokens) != null ? {
                    usage: {
                      cacheReadInputTokens: (_h = (_g = value.metadata.usage) == null ? void 0 : _g.cacheReadInputTokens) != null ? _h : Number.NaN,
                      cacheWriteInputTokens: (_j = (_i = value.metadata.usage) == null ? void 0 : _i.cacheWriteInputTokens) != null ? _j : Number.NaN
                    }
                  } : void 0;
                  const trace = value.metadata.trace ? {
                    trace: value.metadata.trace
                  } : void 0;
                  if (cacheUsage || trace) {
                    providerMetadata = {
                      bedrock: {
                        ...cacheUsage,
                        ...trace
                      }
                    };
                  }
                }
                if (((_k = value.contentBlockDelta) == null ? void 0 : _k.delta) && "text" in value.contentBlockDelta.delta && value.contentBlockDelta.delta.text) {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: value.contentBlockDelta.delta.text
                  });
                }
                if (((_l = value.contentBlockDelta) == null ? void 0 : _l.delta) && "reasoningContent" in value.contentBlockDelta.delta && value.contentBlockDelta.delta.reasoningContent) {
                  const reasoningContent = value.contentBlockDelta.delta.reasoningContent;
                  if ("text" in reasoningContent && reasoningContent.text) {
                    controller.enqueue({
                      type: "reasoning",
                      textDelta: reasoningContent.text
                    });
                  } else if ("signature" in reasoningContent && reasoningContent.signature) {
                    controller.enqueue({
                      type: "reasoning-signature",
                      signature: reasoningContent.signature
                    });
                  } else if ("data" in reasoningContent && reasoningContent.data) {
                    controller.enqueue({
                      type: "redacted-reasoning",
                      data: reasoningContent.data
                    });
                  }
                }
                const contentBlockStart = value.contentBlockStart;
                if (((_m = contentBlockStart == null ? void 0 : contentBlockStart.start) == null ? void 0 : _m.toolUse) != null) {
                  const toolUse = contentBlockStart.start.toolUse;
                  toolCallContentBlocks[contentBlockStart.contentBlockIndex] = {
                    toolCallId: toolUse.toolUseId,
                    toolName: toolUse.name,
                    jsonText: ""
                  };
                }
                const contentBlockDelta = value.contentBlockDelta;
                if ((contentBlockDelta == null ? void 0 : contentBlockDelta.delta) && "toolUse" in contentBlockDelta.delta && contentBlockDelta.delta.toolUse) {
                  const contentBlock = toolCallContentBlocks[contentBlockDelta.contentBlockIndex];
                  const delta = (_n = contentBlockDelta.delta.toolUse.input) != null ? _n : "";
                  controller.enqueue({
                    type: "tool-call-delta",
                    toolCallType: "function",
                    toolCallId: contentBlock.toolCallId,
                    toolName: contentBlock.toolName,
                    argsTextDelta: delta
                  });
                  contentBlock.jsonText += delta;
                }
                const contentBlockStop = value.contentBlockStop;
                if (contentBlockStop != null) {
                  const index = contentBlockStop.contentBlockIndex;
                  const contentBlock = toolCallContentBlocks[index];
                  if (contentBlock != null) {
                    controller.enqueue({
                      type: "tool-call",
                      toolCallType: "function",
                      toolCallId: contentBlock.toolCallId,
                      toolName: contentBlock.toolName,
                      args: contentBlock.jsonText
                    });
                    delete toolCallContentBlocks[index];
                  }
                }
              },
              flush(controller) {
                controller.enqueue({
                  type: "finish",
                  finishReason,
                  usage,
                  ...providerMetadata && { providerMetadata }
                });
              }
            })
          ),
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders },
          warnings
        };
      }
      getUrl(modelId) {
        const encodedModelId = encodeURIComponent(modelId);
        return `${this.config.baseUrl()}/model/${encodedModelId}`;
      }
    };
    BedrockReasoningConfigOptionsSchema = z23.object({
      type: z23.union([z23.literal("enabled"), z23.literal("disabled")]).nullish(),
      budget_tokens: z23.number().nullish(),
      budgetTokens: z23.number().nullish()
    }).nullish();
    BedrockStopReasonSchema = z23.union([
      z23.enum(BEDROCK_STOP_REASONS),
      z23.string()
    ]);
    BedrockToolUseSchema = z23.object({
      toolUseId: z23.string(),
      name: z23.string(),
      input: z23.unknown()
    });
    BedrockReasoningTextSchema = z23.object({
      signature: z23.string().nullish(),
      text: z23.string()
    });
    BedrockRedactedReasoningSchema = z23.object({
      data: z23.string()
    });
    BedrockResponseSchema = z23.object({
      metrics: z23.object({
        latencyMs: z23.number()
      }).nullish(),
      output: z23.object({
        message: z23.object({
          content: z23.array(
            z23.object({
              text: z23.string().nullish(),
              toolUse: BedrockToolUseSchema.nullish(),
              reasoningContent: z23.union([
                z23.object({
                  reasoningText: BedrockReasoningTextSchema
                }),
                z23.object({
                  redactedReasoning: BedrockRedactedReasoningSchema
                })
              ]).nullish()
            })
          ),
          role: z23.string()
        })
      }),
      stopReason: BedrockStopReasonSchema,
      trace: z23.unknown().nullish(),
      usage: z23.object({
        inputTokens: z23.number(),
        outputTokens: z23.number(),
        totalTokens: z23.number(),
        cacheReadInputTokens: z23.number().nullish(),
        cacheWriteInputTokens: z23.number().nullish()
      })
    });
    BedrockStreamSchema = z23.object({
      contentBlockDelta: z23.object({
        contentBlockIndex: z23.number(),
        delta: z23.union([
          z23.object({ text: z23.string() }),
          z23.object({ toolUse: z23.object({ input: z23.string() }) }),
          z23.object({
            reasoningContent: z23.object({ text: z23.string() })
          }),
          z23.object({
            reasoningContent: z23.object({
              signature: z23.string()
            })
          }),
          z23.object({
            reasoningContent: z23.object({ data: z23.string() })
          })
        ]).nullish()
      }).nullish(),
      contentBlockStart: z23.object({
        contentBlockIndex: z23.number(),
        start: z23.object({
          toolUse: BedrockToolUseSchema.nullish()
        }).nullish()
      }).nullish(),
      contentBlockStop: z23.object({
        contentBlockIndex: z23.number()
      }).nullish(),
      internalServerException: z23.record(z23.unknown()).nullish(),
      messageStop: z23.object({
        additionalModelResponseFields: z23.record(z23.unknown()).nullish(),
        stopReason: BedrockStopReasonSchema
      }).nullish(),
      metadata: z23.object({
        trace: z23.unknown().nullish(),
        usage: z23.object({
          cacheReadInputTokens: z23.number().nullish(),
          cacheWriteInputTokens: z23.number().nullish(),
          inputTokens: z23.number(),
          outputTokens: z23.number()
        }).nullish()
      }).nullish(),
      modelStreamErrorException: z23.record(z23.unknown()).nullish(),
      throttlingException: z23.record(z23.unknown()).nullish(),
      validationException: z23.record(z23.unknown()).nullish()
    });
    BedrockEmbeddingModel = class {
      constructor(modelId, settings, config) {
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
        this.specificationVersion = "v1";
        this.provider = "amazon-bedrock";
        this.maxEmbeddingsPerCall = void 0;
        this.supportsParallelCalls = true;
      }
      getUrl(modelId) {
        const encodedModelId = encodeURIComponent(modelId);
        return `${this.config.baseUrl()}/model/${encodedModelId}/invoke`;
      }
      async doEmbed({
        values,
        headers,
        abortSignal
      }) {
        const embedSingleText = async (inputText) => {
          const args = {
            inputText,
            dimensions: this.settings.dimensions,
            normalize: this.settings.normalize
          };
          const url = this.getUrl(this.modelId);
          const { value: response } = await postJsonToApi2({
            url,
            headers: await resolve(
              combineHeaders2(await resolve(this.config.headers), headers)
            ),
            body: args,
            failedResponseHandler: createJsonErrorResponseHandler2({
              errorSchema: BedrockErrorSchema,
              errorToMessage: (error) => `${error.type}: ${error.message}`
            }),
            successfulResponseHandler: createJsonResponseHandler2(
              BedrockEmbeddingResponseSchema
            ),
            fetch: this.config.fetch,
            abortSignal
          });
          return {
            embedding: response.embedding,
            inputTextTokenCount: response.inputTextTokenCount
          };
        };
        const responses = await Promise.all(values.map(embedSingleText));
        return responses.reduce(
          (accumulated, response) => {
            accumulated.embeddings.push(response.embedding);
            accumulated.usage.tokens += response.inputTextTokenCount;
            return accumulated;
          },
          { embeddings: [], usage: { tokens: 0 } }
        );
      }
    };
    BedrockEmbeddingResponseSchema = z33.object({
      embedding: z33.array(z33.number()),
      inputTextTokenCount: z33.number()
    });
    modelMaxImagesPerCall2 = {
      "amazon.nova-canvas-v1:0": 5
    };
    BedrockImageModel = class {
      constructor(modelId, settings, config) {
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
        this.specificationVersion = "v1";
        this.provider = "amazon-bedrock";
      }
      get maxImagesPerCall() {
        var _a18, _b;
        return (_b = (_a18 = this.settings.maxImagesPerCall) != null ? _a18 : modelMaxImagesPerCall2[this.modelId]) != null ? _b : 1;
      }
      getUrl(modelId) {
        const encodedModelId = encodeURIComponent(modelId);
        return `${this.config.baseUrl()}/model/${encodedModelId}/invoke`;
      }
      async doGenerate({
        prompt,
        n,
        size,
        aspectRatio,
        seed,
        providerOptions,
        headers,
        abortSignal
      }) {
        var _a18, _b, _c, _d, _e, _f;
        const warnings = [];
        const [width, height] = size ? size.split("x").map(Number) : [];
        const args = {
          taskType: "TEXT_IMAGE",
          textToImageParams: {
            text: prompt,
            ...((_a18 = providerOptions == null ? void 0 : providerOptions.bedrock) == null ? void 0 : _a18.negativeText) ? {
              negativeText: providerOptions.bedrock.negativeText
            } : {}
          },
          imageGenerationConfig: {
            ...width ? { width } : {},
            ...height ? { height } : {},
            ...seed ? { seed } : {},
            ...n ? { numberOfImages: n } : {},
            ...((_b = providerOptions == null ? void 0 : providerOptions.bedrock) == null ? void 0 : _b.quality) ? { quality: providerOptions.bedrock.quality } : {},
            ...((_c = providerOptions == null ? void 0 : providerOptions.bedrock) == null ? void 0 : _c.cfgScale) ? { cfgScale: providerOptions.bedrock.cfgScale } : {}
          }
        };
        if (aspectRatio != void 0) {
          warnings.push({
            type: "unsupported-setting",
            setting: "aspectRatio",
            details: "This model does not support aspect ratio. Use `size` instead."
          });
        }
        const currentDate = (_f = (_e = (_d = this.config._internal) == null ? void 0 : _d.currentDate) == null ? void 0 : _e.call(_d)) != null ? _f : /* @__PURE__ */ new Date();
        const { value: response, responseHeaders } = await postJsonToApi2({
          url: this.getUrl(this.modelId),
          headers: await resolve(
            combineHeaders2(await resolve(this.config.headers), headers)
          ),
          body: args,
          failedResponseHandler: createJsonErrorResponseHandler2({
            errorSchema: BedrockErrorSchema,
            errorToMessage: (error) => `${error.type}: ${error.message}`
          }),
          successfulResponseHandler: createJsonResponseHandler2(
            bedrockImageResponseSchema
          ),
          abortSignal,
          fetch: this.config.fetch
        });
        return {
          images: response.images,
          warnings,
          response: {
            timestamp: currentDate,
            modelId: this.modelId,
            headers: responseHeaders
          }
        };
      }
    };
    bedrockImageResponseSchema = z42.object({
      images: z42.array(z42.string())
    });
    bedrock = createAmazonBedrock();
  }
});

// node_modules/@ai-sdk/google/node_modules/@ai-sdk/provider/dist/index.mjs
function getErrorMessage3(error) {
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}
var marker17, symbol17, _a17, _AISDKError7, AISDKError4, name16, marker24, symbol24, _a24, APICallError3, name24, marker34, symbol34, _a34, EmptyResponseBodyError3, name34, marker44, symbol44, _a44, InvalidArgumentError4, name44, marker54, symbol54, _a54, name54, marker64, symbol64, _a64, name64, marker74, symbol74, _a74, JSONParseError3, name74, marker84, symbol84, _a84, LoadAPIKeyError2, name84, marker94, symbol94, _a94, name94, marker104, symbol104, _a104, name104, marker114, symbol114, _a114, name114, marker124, symbol124, _a124, TooManyEmbeddingValuesForCallError2, name124, marker134, symbol134, _a134, _TypeValidationError5, TypeValidationError3, name134, marker144, symbol144, _a144, UnsupportedFunctionalityError3;
var init_dist10 = __esm({
  "node_modules/@ai-sdk/google/node_modules/@ai-sdk/provider/dist/index.mjs"() {
    "use strict";
    marker17 = "vercel.ai.error";
    symbol17 = Symbol.for(marker17);
    _AISDKError7 = class _AISDKError8 extends Error {
      /**
       * Creates an AI SDK Error.
       *
       * @param {Object} params - The parameters for creating the error.
       * @param {string} params.name - The name of the error.
       * @param {string} params.message - The error message.
       * @param {unknown} [params.cause] - The underlying cause of the error.
       */
      constructor({
        name: name142,
        message,
        cause
      }) {
        super(message);
        this[_a17] = true;
        this.name = name142;
        this.cause = cause;
      }
      /**
       * Checks if the given error is an AI SDK Error.
       * @param {unknown} error - The error to check.
       * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
       */
      static isInstance(error) {
        return _AISDKError8.hasMarker(error, marker17);
      }
      static hasMarker(error, marker152) {
        const markerSymbol = Symbol.for(marker152);
        return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
      }
    };
    _a17 = symbol17;
    AISDKError4 = _AISDKError7;
    name16 = "AI_APICallError";
    marker24 = `vercel.ai.error.${name16}`;
    symbol24 = Symbol.for(marker24);
    APICallError3 = class extends AISDKError4 {
      constructor({
        message,
        url,
        requestBodyValues,
        statusCode,
        responseHeaders,
        responseBody,
        cause,
        isRetryable = statusCode != null && (statusCode === 408 || // request timeout
        statusCode === 409 || // conflict
        statusCode === 429 || // too many requests
        statusCode >= 500),
        // server error
        data
      }) {
        super({ name: name16, message, cause });
        this[_a24] = true;
        this.url = url;
        this.requestBodyValues = requestBodyValues;
        this.statusCode = statusCode;
        this.responseHeaders = responseHeaders;
        this.responseBody = responseBody;
        this.isRetryable = isRetryable;
        this.data = data;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker24);
      }
    };
    _a24 = symbol24;
    name24 = "AI_EmptyResponseBodyError";
    marker34 = `vercel.ai.error.${name24}`;
    symbol34 = Symbol.for(marker34);
    EmptyResponseBodyError3 = class extends AISDKError4 {
      // used in isInstance
      constructor({ message = "Empty response body" } = {}) {
        super({ name: name24, message });
        this[_a34] = true;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker34);
      }
    };
    _a34 = symbol34;
    name34 = "AI_InvalidArgumentError";
    marker44 = `vercel.ai.error.${name34}`;
    symbol44 = Symbol.for(marker44);
    InvalidArgumentError4 = class extends AISDKError4 {
      constructor({
        message,
        cause,
        argument
      }) {
        super({ name: name34, message, cause });
        this[_a44] = true;
        this.argument = argument;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker44);
      }
    };
    _a44 = symbol44;
    name44 = "AI_InvalidPromptError";
    marker54 = `vercel.ai.error.${name44}`;
    symbol54 = Symbol.for(marker54);
    _a54 = symbol54;
    name54 = "AI_InvalidResponseDataError";
    marker64 = `vercel.ai.error.${name54}`;
    symbol64 = Symbol.for(marker64);
    _a64 = symbol64;
    name64 = "AI_JSONParseError";
    marker74 = `vercel.ai.error.${name64}`;
    symbol74 = Symbol.for(marker74);
    JSONParseError3 = class extends AISDKError4 {
      constructor({ text, cause }) {
        super({
          name: name64,
          message: `JSON parsing failed: Text: ${text}.
Error message: ${getErrorMessage3(cause)}`,
          cause
        });
        this[_a74] = true;
        this.text = text;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker74);
      }
    };
    _a74 = symbol74;
    name74 = "AI_LoadAPIKeyError";
    marker84 = `vercel.ai.error.${name74}`;
    symbol84 = Symbol.for(marker84);
    LoadAPIKeyError2 = class extends AISDKError4 {
      // used in isInstance
      constructor({ message }) {
        super({ name: name74, message });
        this[_a84] = true;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker84);
      }
    };
    _a84 = symbol84;
    name84 = "AI_LoadSettingError";
    marker94 = `vercel.ai.error.${name84}`;
    symbol94 = Symbol.for(marker94);
    _a94 = symbol94;
    name94 = "AI_NoContentGeneratedError";
    marker104 = `vercel.ai.error.${name94}`;
    symbol104 = Symbol.for(marker104);
    _a104 = symbol104;
    name104 = "AI_NoSuchModelError";
    marker114 = `vercel.ai.error.${name104}`;
    symbol114 = Symbol.for(marker114);
    _a114 = symbol114;
    name114 = "AI_TooManyEmbeddingValuesForCallError";
    marker124 = `vercel.ai.error.${name114}`;
    symbol124 = Symbol.for(marker124);
    TooManyEmbeddingValuesForCallError2 = class extends AISDKError4 {
      constructor(options) {
        super({
          name: name114,
          message: `Too many values for a single embedding call. The ${options.provider} model "${options.modelId}" can only embed up to ${options.maxEmbeddingsPerCall} values per call, but ${options.values.length} values were provided.`
        });
        this[_a124] = true;
        this.provider = options.provider;
        this.modelId = options.modelId;
        this.maxEmbeddingsPerCall = options.maxEmbeddingsPerCall;
        this.values = options.values;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker124);
      }
    };
    _a124 = symbol124;
    name124 = "AI_TypeValidationError";
    marker134 = `vercel.ai.error.${name124}`;
    symbol134 = Symbol.for(marker134);
    _TypeValidationError5 = class _TypeValidationError6 extends AISDKError4 {
      constructor({ value, cause }) {
        super({
          name: name124,
          message: `Type validation failed: Value: ${JSON.stringify(value)}.
Error message: ${getErrorMessage3(cause)}`,
          cause
        });
        this[_a134] = true;
        this.value = value;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker134);
      }
      /**
       * Wraps an error into a TypeValidationError.
       * If the cause is already a TypeValidationError with the same value, it returns the cause.
       * Otherwise, it creates a new TypeValidationError.
       *
       * @param {Object} params - The parameters for wrapping the error.
       * @param {unknown} params.value - The value that failed validation.
       * @param {unknown} params.cause - The original error or cause of the validation failure.
       * @returns {TypeValidationError} A TypeValidationError instance.
       */
      static wrap({
        value,
        cause
      }) {
        return _TypeValidationError6.isInstance(cause) && cause.value === value ? cause : new _TypeValidationError6({ value, cause });
      }
    };
    _a134 = symbol134;
    TypeValidationError3 = _TypeValidationError5;
    name134 = "AI_UnsupportedFunctionalityError";
    marker144 = `vercel.ai.error.${name134}`;
    symbol144 = Symbol.for(marker144);
    UnsupportedFunctionalityError3 = class extends AISDKError4 {
      constructor({
        functionality,
        message = `'${functionality}' functionality not supported.`
      }) {
        super({ name: name134, message });
        this[_a144] = true;
        this.functionality = functionality;
      }
      static isInstance(error) {
        return AISDKError4.hasMarker(error, marker144);
      }
    };
    _a144 = symbol144;
  }
});

// node_modules/@ai-sdk/google/node_modules/@ai-sdk/provider-utils/dist/index.mjs
function combineHeaders3(...headers) {
  return headers.reduce(
    (combinedHeaders, currentHeaders) => ({
      ...combinedHeaders,
      ...currentHeaders != null ? currentHeaders : {}
    }),
    {}
  );
}
function createEventSourceParserStream2() {
  let buffer = "";
  let event = void 0;
  let data = [];
  let lastEventId = void 0;
  let retry = void 0;
  function parseLine(line, controller) {
    if (line === "") {
      dispatchEvent(controller);
      return;
    }
    if (line.startsWith(":")) {
      return;
    }
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      handleField(line, "");
      return;
    }
    const field = line.slice(0, colonIndex);
    const valueStart = colonIndex + 1;
    const value = valueStart < line.length && line[valueStart] === " " ? line.slice(valueStart + 1) : line.slice(valueStart);
    handleField(field, value);
  }
  function dispatchEvent(controller) {
    if (data.length > 0) {
      controller.enqueue({
        event,
        data: data.join("\n"),
        id: lastEventId,
        retry
      });
      data = [];
      event = void 0;
      retry = void 0;
    }
  }
  function handleField(field, value) {
    switch (field) {
      case "event":
        event = value;
        break;
      case "data":
        data.push(value);
        break;
      case "id":
        lastEventId = value;
        break;
      case "retry":
        const parsedRetry = parseInt(value, 10);
        if (!isNaN(parsedRetry)) {
          retry = parsedRetry;
        }
        break;
    }
  }
  return new TransformStream({
    transform(chunk, controller) {
      const { lines, incompleteLine } = splitLines2(buffer, chunk);
      buffer = incompleteLine;
      for (let i = 0; i < lines.length; i++) {
        parseLine(lines[i], controller);
      }
    },
    flush(controller) {
      parseLine(buffer, controller);
      dispatchEvent(controller);
    }
  });
}
function splitLines2(buffer, chunk) {
  const lines = [];
  let currentLine = buffer;
  for (let i = 0; i < chunk.length; ) {
    const char = chunk[i++];
    if (char === "\n") {
      lines.push(currentLine);
      currentLine = "";
    } else if (char === "\r") {
      lines.push(currentLine);
      currentLine = "";
      if (chunk[i] === "\n") {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  return { lines, incompleteLine: currentLine };
}
function extractResponseHeaders3(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}
function removeUndefinedEntries3(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([_key, value]) => value != null)
  );
}
function isAbortError3(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
function loadApiKey2({
  apiKey,
  environmentVariableName,
  apiKeyParameterName = "apiKey",
  description
}) {
  if (typeof apiKey === "string") {
    return apiKey;
  }
  if (apiKey != null) {
    throw new LoadAPIKeyError2({
      message: `${description} API key must be a string.`
    });
  }
  if (typeof process === "undefined") {
    throw new LoadAPIKeyError2({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter. Environment variables is not supported in this environment.`
    });
  }
  apiKey = process.env[environmentVariableName];
  if (apiKey == null) {
    throw new LoadAPIKeyError2({
      message: `${description} API key is missing. Pass it using the '${apiKeyParameterName}' parameter or the ${environmentVariableName} environment variable.`
    });
  }
  if (typeof apiKey !== "string") {
    throw new LoadAPIKeyError2({
      message: `${description} API key must be a string. The value of the ${environmentVariableName} environment variable is not a string.`
    });
  }
  return apiKey;
}
function validator3(validate) {
  return { [validatorSymbol4]: true, validate };
}
function isValidator3(value) {
  return typeof value === "object" && value !== null && validatorSymbol4 in value && value[validatorSymbol4] === true && "validate" in value;
}
function asValidator3(value) {
  return isValidator3(value) ? value : zodValidator3(value);
}
function zodValidator3(zodSchema) {
  return validator3((value) => {
    const result = zodSchema.safeParse(value);
    return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
  });
}
function validateTypes3({
  value,
  schema: inputSchema
}) {
  const result = safeValidateTypes3({ value, schema: inputSchema });
  if (!result.success) {
    throw TypeValidationError3.wrap({ value, cause: result.error });
  }
  return result.value;
}
function safeValidateTypes3({
  value,
  schema
}) {
  const validator22 = asValidator3(schema);
  try {
    if (validator22.validate == null) {
      return { success: true, value };
    }
    const result = validator22.validate(value);
    if (result.success) {
      return result;
    }
    return {
      success: false,
      error: TypeValidationError3.wrap({ value, cause: result.error })
    };
  } catch (error) {
    return {
      success: false,
      error: TypeValidationError3.wrap({ value, cause: error })
    };
  }
}
function parseJSON3({
  text,
  schema
}) {
  try {
    const value = import_secure_json_parse4.default.parse(text);
    if (schema == null) {
      return value;
    }
    return validateTypes3({ value, schema });
  } catch (error) {
    if (JSONParseError3.isInstance(error) || TypeValidationError3.isInstance(error)) {
      throw error;
    }
    throw new JSONParseError3({ text, cause: error });
  }
}
function safeParseJSON3({
  text,
  schema
}) {
  try {
    const value = import_secure_json_parse4.default.parse(text);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    const validationResult = safeValidateTypes3({ value, schema });
    return validationResult.success ? { ...validationResult, rawValue: value } : validationResult;
  } catch (error) {
    return {
      success: false,
      error: JSONParseError3.isInstance(error) ? error : new JSONParseError3({ text, cause: error })
    };
  }
}
function parseProviderOptions2({
  provider,
  providerOptions,
  schema
}) {
  if ((providerOptions == null ? void 0 : providerOptions[provider]) == null) {
    return void 0;
  }
  const parsedProviderOptions = safeValidateTypes3({
    value: providerOptions[provider],
    schema
  });
  if (!parsedProviderOptions.success) {
    throw new InvalidArgumentError4({
      argument: "providerOptions",
      message: `invalid ${provider} provider options`,
      cause: parsedProviderOptions.error
    });
  }
  return parsedProviderOptions.value;
}
async function resolve2(value) {
  if (typeof value === "function") {
    value = value();
  }
  return Promise.resolve(value);
}
function convertUint8ArrayToBase643(array) {
  let latin1string = "";
  for (let i = 0; i < array.length; i++) {
    latin1string += String.fromCodePoint(array[i]);
  }
  return btoa4(latin1string);
}
function withoutTrailingSlash2(url) {
  return url == null ? void 0 : url.replace(/\/$/, "");
}
var import_secure_json_parse4, createIdGenerator4, generateId4, validatorSymbol4, getOriginalFetch23, postJsonToApi3, postToApi3, createJsonErrorResponseHandler3, createEventSourceResponseHandler2, createJsonResponseHandler3, btoa4, atob4;
var init_dist11 = __esm({
  "node_modules/@ai-sdk/google/node_modules/@ai-sdk/provider-utils/dist/index.mjs"() {
    "use strict";
    init_dist10();
    init_non_secure();
    init_dist10();
    init_dist10();
    import_secure_json_parse4 = __toESM(require_secure_json_parse(), 1);
    init_dist10();
    init_dist10();
    init_dist10();
    init_dist10();
    createIdGenerator4 = ({
      prefix,
      size: defaultSize = 16,
      alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
      separator = "-"
    } = {}) => {
      const generator = customAlphabet(alphabet, defaultSize);
      if (prefix == null) {
        return generator;
      }
      if (alphabet.includes(separator)) {
        throw new InvalidArgumentError4({
          argument: "separator",
          message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
        });
      }
      return (size) => `${prefix}${separator}${generator(size)}`;
    };
    generateId4 = createIdGenerator4();
    validatorSymbol4 = Symbol.for("vercel.ai.validator");
    getOriginalFetch23 = () => globalThis.fetch;
    postJsonToApi3 = async ({
      url,
      headers,
      body,
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    }) => postToApi3({
      url,
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: {
        content: JSON.stringify(body),
        values: body
      },
      failedResponseHandler,
      successfulResponseHandler,
      abortSignal,
      fetch: fetch2
    });
    postToApi3 = async ({
      url,
      headers = {},
      body,
      successfulResponseHandler,
      failedResponseHandler,
      abortSignal,
      fetch: fetch2 = getOriginalFetch23()
    }) => {
      try {
        const response = await fetch2(url, {
          method: "POST",
          headers: removeUndefinedEntries3(headers),
          body: body.content,
          signal: abortSignal
        });
        const responseHeaders = extractResponseHeaders3(response);
        if (!response.ok) {
          let errorInformation;
          try {
            errorInformation = await failedResponseHandler({
              response,
              url,
              requestBodyValues: body.values
            });
          } catch (error) {
            if (isAbortError3(error) || APICallError3.isInstance(error)) {
              throw error;
            }
            throw new APICallError3({
              message: "Failed to process error response",
              cause: error,
              statusCode: response.status,
              url,
              responseHeaders,
              requestBodyValues: body.values
            });
          }
          throw errorInformation.value;
        }
        try {
          return await successfulResponseHandler({
            response,
            url,
            requestBodyValues: body.values
          });
        } catch (error) {
          if (error instanceof Error) {
            if (isAbortError3(error) || APICallError3.isInstance(error)) {
              throw error;
            }
          }
          throw new APICallError3({
            message: "Failed to process successful response",
            cause: error,
            statusCode: response.status,
            url,
            responseHeaders,
            requestBodyValues: body.values
          });
        }
      } catch (error) {
        if (isAbortError3(error)) {
          throw error;
        }
        if (error instanceof TypeError && error.message === "fetch failed") {
          const cause = error.cause;
          if (cause != null) {
            throw new APICallError3({
              message: `Cannot connect to API: ${cause.message}`,
              cause,
              url,
              requestBodyValues: body.values,
              isRetryable: true
              // retry when network error
            });
          }
        }
        throw error;
      }
    };
    createJsonErrorResponseHandler3 = ({
      errorSchema,
      errorToMessage,
      isRetryable
    }) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await response.text();
      const responseHeaders = extractResponseHeaders3(response);
      if (responseBody.trim() === "") {
        return {
          responseHeaders,
          value: new APICallError3({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
      try {
        const parsedError = parseJSON3({
          text: responseBody,
          schema: errorSchema
        });
        return {
          responseHeaders,
          value: new APICallError3({
            message: errorToMessage(parsedError),
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            data: parsedError,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response, parsedError)
          })
        };
      } catch (parseError) {
        return {
          responseHeaders,
          value: new APICallError3({
            message: response.statusText,
            url,
            requestBodyValues,
            statusCode: response.status,
            responseHeaders,
            responseBody,
            isRetryable: isRetryable == null ? void 0 : isRetryable(response)
          })
        };
      }
    };
    createEventSourceResponseHandler2 = (chunkSchema2) => async ({ response }) => {
      const responseHeaders = extractResponseHeaders3(response);
      if (response.body == null) {
        throw new EmptyResponseBodyError3({});
      }
      return {
        responseHeaders,
        value: response.body.pipeThrough(new TextDecoderStream()).pipeThrough(createEventSourceParserStream2()).pipeThrough(
          new TransformStream({
            transform({ data }, controller) {
              if (data === "[DONE]") {
                return;
              }
              controller.enqueue(
                safeParseJSON3({
                  text: data,
                  schema: chunkSchema2
                })
              );
            }
          })
        )
      };
    };
    createJsonResponseHandler3 = (responseSchema2) => async ({ response, url, requestBodyValues }) => {
      const responseBody = await response.text();
      const parsedResult = safeParseJSON3({
        text: responseBody,
        schema: responseSchema2
      });
      const responseHeaders = extractResponseHeaders3(response);
      if (!parsedResult.success) {
        throw new APICallError3({
          message: "Invalid JSON response",
          cause: parsedResult.error,
          statusCode: response.status,
          responseHeaders,
          responseBody,
          url,
          requestBodyValues
        });
      }
      return {
        responseHeaders,
        value: parsedResult.value,
        rawValue: parsedResult.rawValue
      };
    };
    ({ btoa: btoa4, atob: atob4 } = globalThis);
  }
});

// node_modules/@ai-sdk/google/dist/index.mjs
import { z as z24 } from "zod";
import { z as z10 } from "zod";
import { z as z34 } from "zod";
function convertJSONSchemaToOpenAPISchema(jsonSchema) {
  if (isEmptyObjectSchema(jsonSchema)) {
    return void 0;
  }
  if (typeof jsonSchema === "boolean") {
    return { type: "boolean", properties: {} };
  }
  const {
    type,
    description,
    required,
    properties,
    items,
    allOf,
    anyOf,
    oneOf,
    format,
    const: constValue,
    minLength,
    enum: enumValues
  } = jsonSchema;
  const result = {};
  if (description)
    result.description = description;
  if (required)
    result.required = required;
  if (format)
    result.format = format;
  if (constValue !== void 0) {
    result.enum = [constValue];
  }
  if (type) {
    if (Array.isArray(type)) {
      if (type.includes("null")) {
        result.type = type.filter((t) => t !== "null")[0];
        result.nullable = true;
      } else {
        result.type = type;
      }
    } else if (type === "null") {
      result.type = "null";
    } else {
      result.type = type;
    }
  }
  if (enumValues !== void 0) {
    result.enum = enumValues;
  }
  if (properties != null) {
    result.properties = Object.entries(properties).reduce(
      (acc, [key, value]) => {
        acc[key] = convertJSONSchemaToOpenAPISchema(value);
        return acc;
      },
      {}
    );
  }
  if (items) {
    result.items = Array.isArray(items) ? items.map(convertJSONSchemaToOpenAPISchema) : convertJSONSchemaToOpenAPISchema(items);
  }
  if (allOf) {
    result.allOf = allOf.map(convertJSONSchemaToOpenAPISchema);
  }
  if (anyOf) {
    if (anyOf.some(
      (schema) => typeof schema === "object" && (schema == null ? void 0 : schema.type) === "null"
    )) {
      const nonNullSchemas = anyOf.filter(
        (schema) => !(typeof schema === "object" && (schema == null ? void 0 : schema.type) === "null")
      );
      if (nonNullSchemas.length === 1) {
        const converted = convertJSONSchemaToOpenAPISchema(nonNullSchemas[0]);
        if (typeof converted === "object") {
          result.nullable = true;
          Object.assign(result, converted);
        }
      } else {
        result.anyOf = nonNullSchemas.map(convertJSONSchemaToOpenAPISchema);
        result.nullable = true;
      }
    } else {
      result.anyOf = anyOf.map(convertJSONSchemaToOpenAPISchema);
    }
  }
  if (oneOf) {
    result.oneOf = oneOf.map(convertJSONSchemaToOpenAPISchema);
  }
  if (minLength !== void 0) {
    result.minLength = minLength;
  }
  return result;
}
function isEmptyObjectSchema(jsonSchema) {
  return jsonSchema != null && typeof jsonSchema === "object" && jsonSchema.type === "object" && (jsonSchema.properties == null || Object.keys(jsonSchema.properties).length === 0) && !jsonSchema.additionalProperties;
}
function convertToGoogleGenerativeAIMessages(prompt) {
  var _a18, _b;
  const systemInstructionParts = [];
  const contents = [];
  let systemMessagesAllowed = true;
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        if (!systemMessagesAllowed) {
          throw new UnsupportedFunctionalityError3({
            functionality: "system messages are only supported at the beginning of the conversation"
          });
        }
        systemInstructionParts.push({ text: content });
        break;
      }
      case "user": {
        systemMessagesAllowed = false;
        const parts = [];
        for (const part of content) {
          switch (part.type) {
            case "text": {
              parts.push({ text: part.text });
              break;
            }
            case "image": {
              parts.push(
                part.image instanceof URL ? {
                  fileData: {
                    mimeType: (_a18 = part.mimeType) != null ? _a18 : "image/jpeg",
                    fileUri: part.image.toString()
                  }
                } : {
                  inlineData: {
                    mimeType: (_b = part.mimeType) != null ? _b : "image/jpeg",
                    data: convertUint8ArrayToBase643(part.image)
                  }
                }
              );
              break;
            }
            case "file": {
              parts.push(
                part.data instanceof URL ? {
                  fileData: {
                    mimeType: part.mimeType,
                    fileUri: part.data.toString()
                  }
                } : {
                  inlineData: {
                    mimeType: part.mimeType,
                    data: part.data
                  }
                }
              );
              break;
            }
          }
        }
        contents.push({ role: "user", parts });
        break;
      }
      case "assistant": {
        systemMessagesAllowed = false;
        contents.push({
          role: "model",
          parts: content.map((part) => {
            switch (part.type) {
              case "text": {
                return part.text.length === 0 ? void 0 : { text: part.text };
              }
              case "file": {
                if (part.mimeType !== "image/png") {
                  throw new UnsupportedFunctionalityError3({
                    functionality: "Only PNG images are supported in assistant messages"
                  });
                }
                if (part.data instanceof URL) {
                  throw new UnsupportedFunctionalityError3({
                    functionality: "File data URLs in assistant messages are not supported"
                  });
                }
                return {
                  inlineData: {
                    mimeType: part.mimeType,
                    data: part.data
                  }
                };
              }
              case "tool-call": {
                return {
                  functionCall: {
                    name: part.toolName,
                    args: part.args
                  }
                };
              }
            }
          }).filter((part) => part !== void 0)
        });
        break;
      }
      case "tool": {
        systemMessagesAllowed = false;
        contents.push({
          role: "user",
          parts: content.map((part) => ({
            functionResponse: {
              name: part.toolName,
              response: {
                name: part.toolName,
                content: part.result
              }
            }
          }))
        });
        break;
      }
    }
  }
  return {
    systemInstruction: systemInstructionParts.length > 0 ? { parts: systemInstructionParts } : void 0,
    contents
  };
}
function getModelPath(modelId) {
  return modelId.includes("/") ? modelId : `models/${modelId}`;
}
function prepareTools3(mode, useSearchGrounding, dynamicRetrievalConfig, modelId) {
  var _a18, _b;
  const tools = ((_a18 = mode.tools) == null ? void 0 : _a18.length) ? mode.tools : void 0;
  const toolWarnings = [];
  const isGemini2 = modelId.includes("gemini-2");
  const supportsDynamicRetrieval = modelId.includes("gemini-1.5-flash") && !modelId.includes("-8b");
  if (useSearchGrounding) {
    return {
      tools: isGemini2 ? { googleSearch: {} } : {
        googleSearchRetrieval: !supportsDynamicRetrieval || !dynamicRetrievalConfig ? {} : { dynamicRetrievalConfig }
      },
      toolConfig: void 0,
      toolWarnings
    };
  }
  if (tools == null) {
    return { tools: void 0, toolConfig: void 0, toolWarnings };
  }
  const functionDeclarations = [];
  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      functionDeclarations.push({
        name: tool.name,
        description: (_b = tool.description) != null ? _b : "",
        parameters: convertJSONSchemaToOpenAPISchema(tool.parameters)
      });
    }
  }
  const toolChoice = mode.toolChoice;
  if (toolChoice == null) {
    return {
      tools: { functionDeclarations },
      toolConfig: void 0,
      toolWarnings
    };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto":
      return {
        tools: { functionDeclarations },
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        toolWarnings
      };
    case "none":
      return {
        tools: { functionDeclarations },
        toolConfig: { functionCallingConfig: { mode: "NONE" } },
        toolWarnings
      };
    case "required":
      return {
        tools: { functionDeclarations },
        toolConfig: { functionCallingConfig: { mode: "ANY" } },
        toolWarnings
      };
    case "tool":
      return {
        tools: { functionDeclarations },
        toolConfig: {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: [toolChoice.toolName]
          }
        },
        toolWarnings
      };
    default: {
      const _exhaustiveCheck = type;
      throw new UnsupportedFunctionalityError3({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}
function mapGoogleGenerativeAIFinishReason({
  finishReason,
  hasToolCalls
}) {
  switch (finishReason) {
    case "STOP":
      return hasToolCalls ? "tool-calls" : "stop";
    case "MAX_TOKENS":
      return "length";
    case "IMAGE_SAFETY":
    case "RECITATION":
    case "SAFETY":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
      return "content-filter";
    case "FINISH_REASON_UNSPECIFIED":
    case "OTHER":
      return "other";
    case "MALFORMED_FUNCTION_CALL":
      return "error";
    default:
      return "unknown";
  }
}
function getToolCallsFromParts({
  parts,
  generateId: generateId22
}) {
  const functionCallParts = parts == null ? void 0 : parts.filter(
    (part) => "functionCall" in part
  );
  return functionCallParts == null || functionCallParts.length === 0 ? void 0 : functionCallParts.map((part) => ({
    toolCallType: "function",
    toolCallId: generateId22(),
    toolName: part.functionCall.name,
    args: JSON.stringify(part.functionCall.args)
  }));
}
function getTextFromParts(parts) {
  const textParts = parts == null ? void 0 : parts.filter(
    (part) => "text" in part && part.thought !== true
  );
  return textParts == null || textParts.length === 0 ? void 0 : textParts.map((part) => part.text).join("");
}
function getReasoningDetailsFromParts(parts) {
  const reasoningParts = parts == null ? void 0 : parts.filter(
    (part) => "text" in part && part.thought === true && part.text != null
  );
  return reasoningParts == null || reasoningParts.length === 0 ? void 0 : reasoningParts.map((part) => ({ type: "text", text: part.text }));
}
function getInlineDataParts(parts) {
  return parts == null ? void 0 : parts.filter(
    (part) => "inlineData" in part
  );
}
function extractSources({
  groundingMetadata,
  generateId: generateId22
}) {
  var _a18;
  return (_a18 = groundingMetadata == null ? void 0 : groundingMetadata.groundingChunks) == null ? void 0 : _a18.filter(
    (chunk) => chunk.web != null
  ).map((chunk) => ({
    sourceType: "url",
    id: generateId22(),
    url: chunk.web.uri,
    title: chunk.web.title
  }));
}
function isSupportedFileUrl(url) {
  return url.toString().startsWith("https://generativelanguage.googleapis.com/v1beta/files/");
}
function createGoogleGenerativeAI(options = {}) {
  var _a18;
  const baseURL = (_a18 = withoutTrailingSlash2(options.baseURL)) != null ? _a18 : "https://generativelanguage.googleapis.com/v1beta";
  const getHeaders = () => ({
    "x-goog-api-key": loadApiKey2({
      apiKey: options.apiKey,
      environmentVariableName: "GOOGLE_GENERATIVE_AI_API_KEY",
      description: "Google Generative AI"
    }),
    ...options.headers
  });
  const createChatModel = (modelId, settings = {}) => {
    var _a25;
    return new GoogleGenerativeAILanguageModel(modelId, settings, {
      provider: "google.generative-ai",
      baseURL,
      headers: getHeaders,
      generateId: (_a25 = options.generateId) != null ? _a25 : generateId4,
      isSupportedUrl: isSupportedFileUrl,
      fetch: options.fetch
    });
  };
  const createEmbeddingModel = (modelId, settings = {}) => new GoogleGenerativeAIEmbeddingModel(modelId, settings, {
    provider: "google.generative-ai",
    baseURL,
    headers: getHeaders,
    fetch: options.fetch
  });
  const provider = function(modelId, settings) {
    if (new.target) {
      throw new Error(
        "The Google Generative AI model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId, settings);
  };
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.generativeAI = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  return provider;
}
var googleErrorDataSchema, googleFailedResponseHandler, GoogleGenerativeAILanguageModel, contentSchema, groundingChunkSchema, groundingMetadataSchema, safetyRatingSchema, responseSchema, chunkSchema, googleGenerativeAIProviderOptionsSchema, GoogleGenerativeAIEmbeddingModel, googleGenerativeAITextEmbeddingResponseSchema, google;
var init_dist12 = __esm({
  "node_modules/@ai-sdk/google/dist/index.mjs"() {
    "use strict";
    init_dist11();
    init_dist11();
    init_dist10();
    init_dist11();
    init_dist11();
    init_dist10();
    init_dist10();
    init_dist11();
    googleErrorDataSchema = z10.object({
      error: z10.object({
        code: z10.number().nullable(),
        message: z10.string(),
        status: z10.string()
      })
    });
    googleFailedResponseHandler = createJsonErrorResponseHandler3({
      errorSchema: googleErrorDataSchema,
      errorToMessage: (data) => data.error.message
    });
    GoogleGenerativeAILanguageModel = class {
      constructor(modelId, settings, config) {
        this.specificationVersion = "v1";
        this.defaultObjectGenerationMode = "json";
        this.supportsImageUrls = false;
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
      }
      get supportsStructuredOutputs() {
        var _a18;
        return (_a18 = this.settings.structuredOutputs) != null ? _a18 : true;
      }
      get provider() {
        return this.config.provider;
      }
      async getArgs({
        mode,
        prompt,
        maxTokens,
        temperature,
        topP,
        topK,
        frequencyPenalty,
        presencePenalty,
        stopSequences,
        responseFormat,
        seed,
        providerMetadata
      }) {
        var _a18, _b, _c;
        const type = mode.type;
        const warnings = [];
        const googleOptions = parseProviderOptions2({
          provider: "google",
          providerOptions: providerMetadata,
          schema: googleGenerativeAIProviderOptionsSchema
        });
        if (((_a18 = googleOptions == null ? void 0 : googleOptions.thinkingConfig) == null ? void 0 : _a18.includeThoughts) === true && !this.config.provider.startsWith("google.vertex.")) {
          warnings.push({
            type: "other",
            message: `The 'includeThoughts' option is only supported with the Google Vertex provider and might not be supported or could behave unexpectedly with the current Google provider (${this.config.provider}).`
          });
        }
        const generationConfig = {
          // standardized settings:
          maxOutputTokens: maxTokens,
          temperature,
          topK,
          topP,
          frequencyPenalty,
          presencePenalty,
          stopSequences,
          seed,
          // response format:
          responseMimeType: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? "application/json" : void 0,
          responseSchema: (responseFormat == null ? void 0 : responseFormat.type) === "json" && responseFormat.schema != null && // Google GenAI does not support all OpenAPI Schema features,
          // so this is needed as an escape hatch:
          this.supportsStructuredOutputs ? convertJSONSchemaToOpenAPISchema(responseFormat.schema) : void 0,
          ...this.settings.audioTimestamp && {
            audioTimestamp: this.settings.audioTimestamp
          },
          // provider options:
          responseModalities: googleOptions == null ? void 0 : googleOptions.responseModalities,
          thinkingConfig: googleOptions == null ? void 0 : googleOptions.thinkingConfig
        };
        const { contents, systemInstruction } = convertToGoogleGenerativeAIMessages(prompt);
        switch (type) {
          case "regular": {
            const { tools, toolConfig, toolWarnings } = prepareTools3(
              mode,
              (_b = this.settings.useSearchGrounding) != null ? _b : false,
              this.settings.dynamicRetrievalConfig,
              this.modelId
            );
            return {
              args: {
                generationConfig,
                contents,
                systemInstruction,
                safetySettings: this.settings.safetySettings,
                tools,
                toolConfig,
                cachedContent: this.settings.cachedContent
              },
              warnings: [...warnings, ...toolWarnings]
            };
          }
          case "object-json": {
            return {
              args: {
                generationConfig: {
                  ...generationConfig,
                  responseMimeType: "application/json",
                  responseSchema: mode.schema != null && // Google GenAI does not support all OpenAPI Schema features,
                  // so this is needed as an escape hatch:
                  this.supportsStructuredOutputs ? convertJSONSchemaToOpenAPISchema(mode.schema) : void 0
                },
                contents,
                systemInstruction,
                safetySettings: this.settings.safetySettings,
                cachedContent: this.settings.cachedContent
              },
              warnings
            };
          }
          case "object-tool": {
            return {
              args: {
                generationConfig,
                contents,
                systemInstruction,
                tools: {
                  functionDeclarations: [
                    {
                      name: mode.tool.name,
                      description: (_c = mode.tool.description) != null ? _c : "",
                      parameters: convertJSONSchemaToOpenAPISchema(
                        mode.tool.parameters
                      )
                    }
                  ]
                },
                toolConfig: { functionCallingConfig: { mode: "ANY" } },
                safetySettings: this.settings.safetySettings,
                cachedContent: this.settings.cachedContent
              },
              warnings
            };
          }
          default: {
            const _exhaustiveCheck = type;
            throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
          }
        }
      }
      supportsUrl(url) {
        return this.config.isSupportedUrl(url);
      }
      async doGenerate(options) {
        var _a18, _b, _c, _d, _e;
        const { args, warnings } = await this.getArgs(options);
        const body = JSON.stringify(args);
        const mergedHeaders = combineHeaders3(
          await resolve2(this.config.headers),
          options.headers
        );
        const {
          responseHeaders,
          value: response,
          rawValue: rawResponse
        } = await postJsonToApi3({
          url: `${this.config.baseURL}/${getModelPath(
            this.modelId
          )}:generateContent`,
          headers: mergedHeaders,
          body: args,
          failedResponseHandler: googleFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler3(responseSchema),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { contents: rawPrompt, ...rawSettings } = args;
        const candidate = response.candidates[0];
        const parts = candidate.content == null || typeof candidate.content !== "object" || !("parts" in candidate.content) ? [] : candidate.content.parts;
        const toolCalls = getToolCallsFromParts({
          parts,
          // Use candidateParts
          generateId: this.config.generateId
        });
        const usageMetadata = response.usageMetadata;
        return {
          text: getTextFromParts(parts),
          reasoning: getReasoningDetailsFromParts(parts),
          files: (_a18 = getInlineDataParts(parts)) == null ? void 0 : _a18.map((part) => ({
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType
          })),
          toolCalls,
          finishReason: mapGoogleGenerativeAIFinishReason({
            finishReason: candidate.finishReason,
            hasToolCalls: toolCalls != null && toolCalls.length > 0
          }),
          usage: {
            promptTokens: (_b = usageMetadata == null ? void 0 : usageMetadata.promptTokenCount) != null ? _b : NaN,
            completionTokens: (_c = usageMetadata == null ? void 0 : usageMetadata.candidatesTokenCount) != null ? _c : NaN
          },
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders, body: rawResponse },
          warnings,
          providerMetadata: {
            google: {
              groundingMetadata: (_d = candidate.groundingMetadata) != null ? _d : null,
              safetyRatings: (_e = candidate.safetyRatings) != null ? _e : null
            }
          },
          sources: extractSources({
            groundingMetadata: candidate.groundingMetadata,
            generateId: this.config.generateId
          }),
          request: { body }
        };
      }
      async doStream(options) {
        const { args, warnings } = await this.getArgs(options);
        const body = JSON.stringify(args);
        const headers = combineHeaders3(
          await resolve2(this.config.headers),
          options.headers
        );
        const { responseHeaders, value: response } = await postJsonToApi3({
          url: `${this.config.baseURL}/${getModelPath(
            this.modelId
          )}:streamGenerateContent?alt=sse`,
          headers,
          body: args,
          failedResponseHandler: googleFailedResponseHandler,
          successfulResponseHandler: createEventSourceResponseHandler2(chunkSchema),
          abortSignal: options.abortSignal,
          fetch: this.config.fetch
        });
        const { contents: rawPrompt, ...rawSettings } = args;
        let finishReason = "unknown";
        let usage = {
          promptTokens: Number.NaN,
          completionTokens: Number.NaN
        };
        let providerMetadata = void 0;
        const generateId22 = this.config.generateId;
        let hasToolCalls = false;
        return {
          stream: response.pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                var _a18, _b, _c, _d, _e, _f;
                if (!chunk.success) {
                  controller.enqueue({ type: "error", error: chunk.error });
                  return;
                }
                const value = chunk.value;
                const usageMetadata = value.usageMetadata;
                if (usageMetadata != null) {
                  usage = {
                    promptTokens: (_a18 = usageMetadata.promptTokenCount) != null ? _a18 : NaN,
                    completionTokens: (_b = usageMetadata.candidatesTokenCount) != null ? _b : NaN
                  };
                }
                const candidate = (_c = value.candidates) == null ? void 0 : _c[0];
                if (candidate == null) {
                  return;
                }
                const content = candidate.content;
                if (content != null) {
                  const deltaText = getTextFromParts(content.parts);
                  if (deltaText != null) {
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: deltaText
                    });
                  }
                  const reasoningDeltaText = getReasoningDetailsFromParts(
                    content.parts
                  );
                  if (reasoningDeltaText != null) {
                    for (const part of reasoningDeltaText) {
                      controller.enqueue({
                        type: "reasoning",
                        textDelta: part.text
                      });
                    }
                  }
                  const inlineDataParts = getInlineDataParts(content.parts);
                  if (inlineDataParts != null) {
                    for (const part of inlineDataParts) {
                      controller.enqueue({
                        type: "file",
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data
                      });
                    }
                  }
                  const toolCallDeltas = getToolCallsFromParts({
                    parts: content.parts,
                    generateId: generateId22
                  });
                  if (toolCallDeltas != null) {
                    for (const toolCall of toolCallDeltas) {
                      controller.enqueue({
                        type: "tool-call-delta",
                        toolCallType: "function",
                        toolCallId: toolCall.toolCallId,
                        toolName: toolCall.toolName,
                        argsTextDelta: toolCall.args
                      });
                      controller.enqueue({
                        type: "tool-call",
                        toolCallType: "function",
                        toolCallId: toolCall.toolCallId,
                        toolName: toolCall.toolName,
                        args: toolCall.args
                      });
                      hasToolCalls = true;
                    }
                  }
                }
                if (candidate.finishReason != null) {
                  finishReason = mapGoogleGenerativeAIFinishReason({
                    finishReason: candidate.finishReason,
                    hasToolCalls
                  });
                  const sources = (_d = extractSources({
                    groundingMetadata: candidate.groundingMetadata,
                    generateId: generateId22
                  })) != null ? _d : [];
                  for (const source of sources) {
                    controller.enqueue({ type: "source", source });
                  }
                  providerMetadata = {
                    google: {
                      groundingMetadata: (_e = candidate.groundingMetadata) != null ? _e : null,
                      safetyRatings: (_f = candidate.safetyRatings) != null ? _f : null
                    }
                  };
                }
              },
              flush(controller) {
                controller.enqueue({
                  type: "finish",
                  finishReason,
                  usage,
                  providerMetadata
                });
              }
            })
          ),
          rawCall: { rawPrompt, rawSettings },
          rawResponse: { headers: responseHeaders },
          warnings,
          request: { body }
        };
      }
    };
    contentSchema = z24.object({
      parts: z24.array(
        z24.union([
          // note: order matters since text can be fully empty
          z24.object({
            functionCall: z24.object({
              name: z24.string(),
              args: z24.unknown()
            })
          }),
          z24.object({
            inlineData: z24.object({
              mimeType: z24.string(),
              data: z24.string()
            })
          }),
          z24.object({
            text: z24.string().nullish(),
            thought: z24.boolean().nullish()
          })
        ])
      ).nullish()
    });
    groundingChunkSchema = z24.object({
      web: z24.object({ uri: z24.string(), title: z24.string() }).nullish(),
      retrievedContext: z24.object({ uri: z24.string(), title: z24.string() }).nullish()
    });
    groundingMetadataSchema = z24.object({
      webSearchQueries: z24.array(z24.string()).nullish(),
      retrievalQueries: z24.array(z24.string()).nullish(),
      searchEntryPoint: z24.object({ renderedContent: z24.string() }).nullish(),
      groundingChunks: z24.array(groundingChunkSchema).nullish(),
      groundingSupports: z24.array(
        z24.object({
          segment: z24.object({
            startIndex: z24.number().nullish(),
            endIndex: z24.number().nullish(),
            text: z24.string().nullish()
          }),
          segment_text: z24.string().nullish(),
          groundingChunkIndices: z24.array(z24.number()).nullish(),
          supportChunkIndices: z24.array(z24.number()).nullish(),
          confidenceScores: z24.array(z24.number()).nullish(),
          confidenceScore: z24.array(z24.number()).nullish()
        })
      ).nullish(),
      retrievalMetadata: z24.union([
        z24.object({
          webDynamicRetrievalScore: z24.number()
        }),
        z24.object({})
      ]).nullish()
    });
    safetyRatingSchema = z24.object({
      category: z24.string().nullish(),
      probability: z24.string().nullish(),
      probabilityScore: z24.number().nullish(),
      severity: z24.string().nullish(),
      severityScore: z24.number().nullish(),
      blocked: z24.boolean().nullish()
    });
    responseSchema = z24.object({
      candidates: z24.array(
        z24.object({
          content: contentSchema.nullish().or(z24.object({}).strict()),
          finishReason: z24.string().nullish(),
          safetyRatings: z24.array(safetyRatingSchema).nullish(),
          groundingMetadata: groundingMetadataSchema.nullish()
        })
      ),
      usageMetadata: z24.object({
        promptTokenCount: z24.number().nullish(),
        candidatesTokenCount: z24.number().nullish(),
        totalTokenCount: z24.number().nullish()
      }).nullish()
    });
    chunkSchema = z24.object({
      candidates: z24.array(
        z24.object({
          content: contentSchema.nullish(),
          finishReason: z24.string().nullish(),
          safetyRatings: z24.array(safetyRatingSchema).nullish(),
          groundingMetadata: groundingMetadataSchema.nullish()
        })
      ).nullish(),
      usageMetadata: z24.object({
        promptTokenCount: z24.number().nullish(),
        candidatesTokenCount: z24.number().nullish(),
        totalTokenCount: z24.number().nullish()
      }).nullish()
    });
    googleGenerativeAIProviderOptionsSchema = z24.object({
      responseModalities: z24.array(z24.enum(["TEXT", "IMAGE"])).nullish(),
      thinkingConfig: z24.object({
        thinkingBudget: z24.number().nullish(),
        includeThoughts: z24.boolean().nullish()
      }).nullish()
    });
    GoogleGenerativeAIEmbeddingModel = class {
      constructor(modelId, settings, config) {
        this.specificationVersion = "v1";
        this.modelId = modelId;
        this.settings = settings;
        this.config = config;
      }
      get provider() {
        return this.config.provider;
      }
      get maxEmbeddingsPerCall() {
        return 2048;
      }
      get supportsParallelCalls() {
        return true;
      }
      async doEmbed({
        values,
        headers,
        abortSignal
      }) {
        if (values.length > this.maxEmbeddingsPerCall) {
          throw new TooManyEmbeddingValuesForCallError2({
            provider: this.provider,
            modelId: this.modelId,
            maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
            values
          });
        }
        const mergedHeaders = combineHeaders3(
          await resolve2(this.config.headers),
          headers
        );
        const { responseHeaders, value: response } = await postJsonToApi3({
          url: `${this.config.baseURL}/models/${this.modelId}:batchEmbedContents`,
          headers: mergedHeaders,
          body: {
            requests: values.map((value) => ({
              model: `models/${this.modelId}`,
              content: { role: "user", parts: [{ text: value }] },
              outputDimensionality: this.settings.outputDimensionality,
              taskType: this.settings.taskType
            }))
          },
          failedResponseHandler: googleFailedResponseHandler,
          successfulResponseHandler: createJsonResponseHandler3(
            googleGenerativeAITextEmbeddingResponseSchema
          ),
          abortSignal,
          fetch: this.config.fetch
        });
        return {
          embeddings: response.embeddings.map((item) => item.values),
          usage: void 0,
          rawResponse: { headers: responseHeaders }
        };
      }
    };
    googleGenerativeAITextEmbeddingResponseSchema = z34.object({
      embeddings: z34.array(z34.object({ values: z34.array(z34.number()) }))
    });
    google = createGoogleGenerativeAI();
  }
});

// agent/model-provider.ts
function checkModelConfig() {
  if (!process.env.AZURE_OPENAI_INSTANCE_NAME || !process.env.AZURE_OPENAI_API_KEY) {
    return {
      valid: false,
      message: "Azure OpenAI configuration missing. Set AZURE_OPENAI_INSTANCE_NAME and AZURE_OPENAI_API_KEY."
    };
  }
  return { valid: true };
}
var azure2, azureAiHub, google2, bedrock2, o3_mini, o4_mini, gpt_4o_mini, gpt_4o, gpt_4_1, gpt_4_1_mini, gpt_4_1_nano, gemini_2_5_pro_preview_03_25, gemini_2_5_flash_preview_04_17, gemini_2_5_flash, claude_3_5_sonnet, claude_3_7_sonnet, getModel;
var init_model_provider = __esm({
  "agent/model-provider.ts"() {
    "use strict";
    init_dist6();
    init_dist9();
    init_dist12();
    azure2 = createAzure({
      resourceName: process.env.AZURE_OPENAI_INSTANCE_NAME,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: "2024-12-01-preview"
    });
    azureAiHub = createAzure({
      resourceName: process.env.AZURE_AI_HUB_RESOURCE_NAME,
      apiKey: process.env.AZURE_AI_HUB_API_KEY,
      baseURL: "https://idylliclabsaih1806409153.openai.azure.com/openai/deployments/",
      apiVersion: "2024-12-01-preview"
    });
    google2 = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY
    });
    bedrock2 = createAmazonBedrock({
      region: process.env.BEDROCK_AWS_REGION,
      accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY
    });
    o3_mini = azure2("o3-mini");
    o4_mini = azure2("o4-mini");
    gpt_4o_mini = azure2("gpt-4o-mini");
    gpt_4o = azure2("4o");
    gpt_4_1 = azure2("gpt-4.1");
    gpt_4_1_mini = azure2("gpt-4.1-mini");
    gpt_4_1_nano = azure2("gpt-4.1-nano");
    gemini_2_5_pro_preview_03_25 = google2(
      "gemini-2.5-pro-preview-03-25"
    );
    gemini_2_5_flash_preview_04_17 = google2(
      "gemini-2.5-flash-preview-04-17"
    );
    gemini_2_5_flash = google2("gemini-2.5-flash");
    claude_3_5_sonnet = bedrock2(
      "anthropic.claude-3-5-sonnet-20241022-v2:0"
    );
    claude_3_7_sonnet = bedrock2(
      "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
    );
    getModel = (modelId) => {
      switch (modelId) {
        case "o4-mini":
          return o4_mini;
        case "gpt-4":
        case "gpt-4.1":
          return gpt_4_1;
        case "gpt-4o-mini":
        case "gpt-4.1-mini":
          return gpt_4_1_mini;
        case "gpt-4.1-nano":
          return gpt_4_1_nano;
        case "claude-3.5-sonnet-v2":
          return claude_3_5_sonnet;
        case "gemini-2.5-pro":
          return gemini_2_5_pro_preview_03_25;
        case "gemini-2.5-flash":
          return gemini_2_5_flash_preview_04_17;
        default:
          return gpt_4_1;
      }
    };
  }
});

// agent/ai-variable-resolver.ts
var ai_variable_resolver_exports = {};
__export(ai_variable_resolver_exports, {
  resolveVariablesWithAI: () => resolveVariablesWithAI
});
import { generateText } from "ai";
async function resolveVariablesWithAI(definitions, context) {
  console.log("\u{1F52E} AI Variable Resolution Starting");
  console.log("\u{1F4CA} Definitions:", definitions);
  console.log("\u{1F30D} Context:", context);
  if (definitions.length === 0) {
    return { variables: /* @__PURE__ */ new Map() };
  }
  const variables = /* @__PURE__ */ new Map();
  const errors = [];
  const prompt = buildVariableResolutionPrompt(definitions, context);
  console.log("\u{1F4DD} Built prompt:", prompt);
  try {
    const result = await generateText({
      model: getModel("gpt-4.1"),
      temperature: 0.3,
      // Lower temperature for more consistent resolution
      system: `You are a helpful assistant that resolves variable values based on context.
Given the context and variable descriptions, provide appropriate values for each variable.
Return ONLY a JSON object with variable names as keys and their resolved values as values.
Do not include any markdown formatting or explanation.`,
      prompt: `${prompt}

Return a JSON object like: {"variableName": "resolvedValue", ...}`
    });
    console.log("\u{1F916} AI Response:", result.text);
    try {
      const resolved = JSON.parse(result.text);
      console.log("\u2705 Parsed JSON:", resolved);
      for (const def of definitions) {
        if (def.name in resolved) {
          const value = String(resolved[def.name]);
          variables.set(def.name, value);
          console.log(`\u{1F48E} Resolved ${def.name} = "${value}"`);
        } else {
          variables.set(def.name, def.name);
          console.log(`\u26A0\uFE0F AI didn't resolve ${def.name}, using fallback`);
        }
      }
    } catch (parseError) {
      console.warn("Failed to parse AI response as JSON, using fallback resolution");
      for (const def of definitions) {
        const pattern = new RegExp(`${def.name}[: ]+"?([^"]+)"?`, "i");
        const match = result.text.match(pattern);
        if (match) {
          variables.set(def.name, match[1].trim());
        } else {
          variables.set(def.name, def.name);
        }
      }
    }
  } catch (error) {
    for (const def of definitions) {
      errors.push({
        variable: def.name,
        error: error instanceof Error ? error.message : "AI resolution failed"
      });
      variables.set(def.name, `[${def.name}]`);
    }
  }
  return { variables, errors: errors.length > 0 ? errors : void 0 };
}
function buildVariableResolutionPrompt(definitions, context) {
  const parts = [];
  if (context.agentContext) {
    parts.push(`Context: ${context.agentContext}`);
  }
  if (context.documentContext) {
    parts.push(`Document context: ${context.documentContext}`);
  }
  if (context.inheritedContext && Object.keys(context.inheritedContext).length > 0) {
    parts.push(`Additional context: ${JSON.stringify(context.inheritedContext)}`);
  }
  parts.push("\nVariables to resolve:");
  for (const def of definitions) {
    if (def.prompt) {
      parts.push(`- ${def.name}: ${def.prompt}`);
    } else {
      parts.push(`- ${def.name} (no prompt provided)`);
    }
  }
  parts.push("\nProvide a JSON object with resolved values for each variable based on the context.");
  return parts.join("\n");
}
var init_ai_variable_resolver = __esm({
  "agent/ai-variable-resolver.ts"() {
    "use strict";
    init_model_provider();
  }
});

// index.ts
init_ast();
init_parser_grammar();

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
   * Execute a single block or entire document
   */
  async execute(request) {
    if (request.mode === "single") {
      return this.executeSingleBlock(request.document, request.blockId);
    } else {
      return this.executeDocument(request.document);
    }
  }
  /**
   * Execute all executable blocks in a document
   */
  async executeDocument(document) {
    const startTime = /* @__PURE__ */ new Date();
    const state = /* @__PURE__ */ new Map();
    const executableBlocks = this.findExecutableBlocks(document.blocks);
    const total = executableBlocks.length;
    for (let i = 0; i < executableBlocks.length; i++) {
      const block = executableBlocks[i];
      this.options.onProgress?.(block.id, i + 1, total);
      const context = {
        currentBlockId: block.id,
        previousResults: new Map(state),
        // Copy current state
        document,
        api: this.options.api
      };
      const result = await this.executeBlock(block, context);
      state.set(block.id, result);
      if (!result.success && this.options.stopOnError) {
        break;
      }
    }
    const endTime = /* @__PURE__ */ new Date();
    const metadata = {
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      blocksExecuted: state.size,
      blocksSucceeded: Array.from(state.values()).filter((r) => r.success).length,
      blocksFailed: Array.from(state.values()).filter((r) => !r.success).length
    };
    return { blocks: state, metadata };
  }
  /**
   * Execute a single block by ID
   */
  async executeSingleBlock(document, blockId) {
    const startTime = /* @__PURE__ */ new Date();
    const state = /* @__PURE__ */ new Map();
    const block = this.findBlockById(document.blocks, blockId);
    if (!block) {
      throw new Error(`Block with ID ${blockId} not found`);
    }
    if (!this.isExecutableBlock(block)) {
      throw new Error(`Block ${blockId} is not executable`);
    }
    const previousResults = this.getPreviousResults(document, blockId);
    const context = {
      currentBlockId: blockId,
      previousResults,
      document,
      api: this.options.api
    };
    const result = await this.executeBlock(block, context);
    state.set(blockId, result);
    const endTime = /* @__PURE__ */ new Date();
    const metadata = {
      startTime,
      endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      blocksExecuted: 1,
      blocksSucceeded: result.success ? 1 : 0,
      blocksFailed: result.success ? 0 : 1
    };
    return { blocks: state, metadata };
  }
  /**
   * Execute a single executable block
   */
  async executeBlock(block, context) {
    const startTime = Date.now();
    try {
      const tool = this.options.tools[block.tool];
      if (!tool) {
        throw new Error(`Tool not found: ${block.tool}`);
      }
      let validatedParams;
      try {
        validatedParams = tool.schema.parse(block.parameters);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid parameters: ${error.errors.map((e) => e.message).join(", ")}`);
        }
        throw error;
      }
      const content = this.extractContent(block.instructions);
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
   * Find all executable blocks in document
   */
  findExecutableBlocks(blocks) {
    const executable = [];
    for (const block of blocks) {
      if (this.isExecutableBlock(block)) {
        executable.push(block);
      }
      if ("children" in block && block.children) {
        executable.push(...this.findExecutableBlocks(block.children));
      }
    }
    return executable;
  }
  /**
   * Find a block by ID
   */
  findBlockById(blocks, id) {
    for (const block of blocks) {
      if (block.id === id) {
        return block;
      }
      if ("children" in block && block.children) {
        const found = this.findBlockById(block.children, id);
        if (found) return found;
      }
    }
    return null;
  }
  /**
   * Get results from all blocks before the given block
   */
  getPreviousResults(document, beforeBlockId) {
    const results = /* @__PURE__ */ new Map();
    const executableBlocks = this.findExecutableBlocks(document.blocks);
    for (const block of executableBlocks) {
      if (block.id === beforeBlockId) {
        break;
      }
    }
    return results;
  }
  /**
   * Check if a block is executable
   */
  isExecutableBlock(block) {
    return block.type === "function_call" || block.type === "trigger";
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
  for (const [name17, fn] of Object.entries(tools)) {
    registry[name17] = {
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
init_ast();
init_types();
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
  if (!document.blocks || document.blocks.length === 0) {
    warnings.push({
      type: "warning",
      code: "EMPTY_DOCUMENT",
      message: "Document has no content blocks"
    });
  }
  const blockIds = /* @__PURE__ */ new Set();
  for (const block of traverseBlocks(document.blocks)) {
    validateBlock(block, blockIds, errors, warnings);
  }
}
function validateBlock(block, blockIds, errors, warnings) {
  const blockId = block.id || "unknown";
  if (block.id && blockIds.has(block.id)) {
    errors.push({
      type: "error",
      code: "DUPLICATE_BLOCK_ID",
      message: `Duplicate block ID: ${block.id}`,
      blockId: block.id
    });
  }
  if (block.id) {
    blockIds.add(block.id);
  }
  if (!block.id) {
    errors.push({
      type: "error",
      code: "MISSING_BLOCK_ID",
      message: "Block must have an ID"
    });
  }
  if (!block.type) {
    errors.push({
      type: "error",
      code: "MISSING_BLOCK_TYPE",
      message: "Block must have a type",
      blockId
    });
    return;
  }
  if (isExecutableBlock(block)) {
    if (!block.tool) {
      errors.push({
        type: "error",
        code: "MISSING_TOOL",
        message: "Executable block must specify a tool",
        blockId
      });
    }
    if (!block.parameters) {
      warnings.push({
        type: "warning",
        code: "MISSING_PARAMETERS",
        message: "Executable block has no parameters",
        blockId
      });
    }
  }
}
async function validateReferences(document, context, errors, warnings) {
  if (context.validateMention) {
    const mentions = extractMentions(document.blocks);
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
    const variables = extractVariables(document.blocks);
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
    for (const block of traverseBlocks(document.blocks)) {
      if (isExecutableBlock(block) && block.tool) {
        if (!context.validateTool(block.tool)) {
          errors.push({
            type: "error",
            code: "INVALID_TOOL",
            message: `Tool not found: ${block.tool}`,
            blockId: block.id || "unknown"
          });
        }
      }
    }
  }
}
function formatValidationIssues(issues) {
  return issues.map((issue) => {
    const prefix = issue.type === "error" ? "\u274C" : "\u26A0\uFE0F";
    const location = issue.blockId ? ` (block: ${issue.blockId})` : "";
    return `${prefix} ${issue.message}${location}`;
  }).join("\n");
}

// index.ts
init_grammar();
init_grammar_compiler();

// document/variable-resolution.ts
init_ast();
function extractVariableDefinitions(blocks) {
  const definitions = /* @__PURE__ */ new Map();
  const seenNames = /* @__PURE__ */ new Set();
  let globalIndex = 0;
  for (const block of traverseBlocks(blocks)) {
    if ("content" in block && Array.isArray(block.content)) {
      processContent(block.content, block.id);
    }
    if ("instructions" in block && block.instructions) {
      processContent(block.instructions, block.id);
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
function checkVariableRedeclaration(blocks) {
  const errors = [];
  const declarations = /* @__PURE__ */ new Map();
  for (const block of traverseBlocks(blocks)) {
    const variables = extractVariablesFromBlock(block);
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
          blockId: block.id,
          prompt: variable.prompt
        });
      }
    }
  }
  return errors;
}
function extractVariablesFromBlock(block) {
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
  if ("content" in block && Array.isArray(block.content)) {
    extractFromContent(block.content);
  }
  if ("instructions" in block && block.instructions) {
    extractFromContent(block.instructions);
  }
  return variables;
}
async function resolveVariables(definitions, context) {
  try {
    const { resolveVariablesWithAI: resolveVariablesWithAI2 } = await Promise.resolve().then(() => (init_ai_variable_resolver(), ai_variable_resolver_exports));
    return await resolveVariablesWithAI2(definitions, context);
  } catch (error) {
    console.warn("AI variable resolver not available, using mock resolution");
    const variables = /* @__PURE__ */ new Map();
    const errors = [];
    for (const def of definitions) {
      try {
        const resolvedValue = await mockResolveVariable(def, context);
        variables.set(def.name, resolvedValue);
      } catch (error2) {
        errors.push({
          variable: def.name,
          error: error2 instanceof Error ? error2.message : "Unknown error"
        });
      }
    }
    return { variables, errors: errors.length > 0 ? errors : void 0 };
  }
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
function applyResolvedVariables(blocks, resolvedVariables) {
  const clonedBlocks = JSON.parse(JSON.stringify(blocks));
  for (const block of traverseBlocks(clonedBlocks)) {
    if ("content" in block && Array.isArray(block.content)) {
      block.content = applyToContent(block.content);
    }
    if ("instructions" in block && block.instructions) {
      block.instructions = applyToContent(block.instructions);
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
  return clonedBlocks;
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
init_ast();
async function executeCustomTool(toolBlock, options) {
  const startTime = Date.now();
  if (toolBlock.type !== "tool") {
    throw new Error("Block is not a tool");
  }
  const toolName = toolBlock.props?.title || "Unnamed Tool";
  const definitionBlocks = toolBlock.children || [];
  const redeclarationErrors = checkVariableRedeclaration(definitionBlocks);
  if (redeclarationErrors.length > 0) {
    throw new Error(
      `Variable redeclaration errors: ${redeclarationErrors.map((e) => e.error).join("; ")}`
    );
  }
  const variableDefinitions = extractVariableDefinitions(definitionBlocks);
  const resolutionContext = {
    agentContext: options.agentContext,
    inheritedContext: options.inheritedContext
  };
  const resolutionResult = await resolveVariables(variableDefinitions, resolutionContext);
  if (resolutionResult.errors) {
    console.warn("Variable resolution errors:", resolutionResult.errors);
  }
  const blocksWithVariables = applyResolvedVariables(
    definitionBlocks,
    resolutionResult.variables
  );
  const interpolatedBlocks = interpolateExecutableBlocks(
    blocksWithVariables,
    resolutionResult.variables
  );
  const executionDocument = {
    id: `tool-exec-${Date.now()}`,
    blocks: interpolatedBlocks
  };
  const executor = new DocumentExecutor(options);
  const report = await executor.execute({
    mode: "document",
    document: executionDocument,
    options
  });
  const executionContext = {
    variables: resolutionResult.variables,
    blocks: report.blocks,
    metadata: {
      toolName,
      duration: Date.now() - startTime,
      blocksExecuted: report.metadata.blocksExecuted,
      blocksSucceeded: report.metadata.blocksSucceeded,
      blocksFailed: report.metadata.blocksFailed
    },
    toolDefinition: toolBlock
  };
  return executionContext;
}
function interpolateExecutableBlocks(blocks, resolvedVariables) {
  return blocks.map((block) => {
    if (isExecutableBlock(block) && block.instructions) {
      const interpolatedContent = interpolateContent(
        block.instructions,
        resolvedVariables
      );
      return {
        ...block,
        instructions: [{
          type: "text",
          text: interpolatedContent
        }]
      };
    }
    if ("children" in block && block.children) {
      return {
        ...block,
        children: interpolateExecutableBlocks(block.children, resolvedVariables)
      };
    }
    return block;
  });
}
function extractRelevantResult(context, extractionHint) {
  const results = Array.from(context.blocks.values());
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
  for (const block of document.blocks) {
    if ("type" in block && block.type === "tool") {
      return block;
    }
  }
  return null;
}

// document/diff-applier.ts
import { v4 as uuidv42 } from "uuid";
function applyDiff(blocks, operations) {
  try {
    let result = [...blocks];
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
    return { success: true, blocks: result };
  } catch (error) {
    return {
      success: false,
      blocks,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function applyEditAttr(blocks, op) {
  let found = false;
  const result = blocks.map((block) => {
    if (block.id === op.blockId) {
      found = true;
      return {
        ...block,
        props: { ...block.props || {}, [op.name]: op.value }
      };
    }
    if ("children" in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditAttr(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    return block;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyEditContent(blocks, op) {
  let found = false;
  const result = blocks.map((block) => {
    if (block.id === op.blockId) {
      found = true;
      if ("content" in block) {
        return { ...block, content: op.content };
      } else {
        throw new Error(`Block ${op.blockId} is not a content block`);
      }
    }
    if ("children" in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditContent(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    return block;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyEditParams(blocks, op) {
  let found = false;
  const result = blocks.map((block) => {
    if (block.id === op.blockId) {
      found = true;
      if ("parameters" in block) {
        return { ...block, parameters: op.params };
      } else {
        throw new Error(`Block ${op.blockId} is not an executable block`);
      }
    }
    if ("children" in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditParams(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    return block;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyEditId(blocks, op) {
  let found = false;
  const result = blocks.map((block) => {
    if (block.id === op.blockId) {
      found = true;
      return { ...block, id: op.newId };
    }
    if ("children" in block && block.children && block.children.length > 0) {
      const updatedChildren = applyEditId(block.children, op);
      if (!found && updatedChildren !== block.children) {
        found = true;
      }
      return { ...block, children: updatedChildren };
    }
    return block;
  });
  if (!found) {
    throw new Error(`Block not found: ${op.blockId}`);
  }
  return result;
}
function applyInsert(blocks, op) {
  const positionCount = [op.atStart, op.atEnd, op.afterBlockId, op.beforeBlockId].filter(Boolean).length;
  if (positionCount !== 1) {
    throw new Error("Insert operation must specify exactly one position");
  }
  const blocksToInsert = op.blocks.map((block) => ({
    ...block,
    id: block.id || uuidv42()
  }));
  if (op.atStart) {
    return [...blocksToInsert, ...blocks];
  }
  if (op.atEnd) {
    return [...blocks, ...blocksToInsert];
  }
  const result = [];
  let inserted = false;
  for (const block of blocks) {
    if (op.beforeBlockId && block.id === op.beforeBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }
    result.push(block);
    if (op.afterBlockId && block.id === op.afterBlockId) {
      result.push(...blocksToInsert);
      inserted = true;
    }
  }
  if (!inserted) {
    throw new Error(`Could not find anchor block for insert operation`);
  }
  return result;
}
function applyDelete(blocks, op) {
  return blocks.filter((block) => block.id !== op.blockId).map((block) => {
    if ("children" in block && block.children && block.children.length > 0) {
      return { ...block, children: applyDelete(block.children, op) };
    }
    return block;
  });
}
function applyReplace(blocks, op) {
  const replacementBlocks = op.blocks.map((block, index) => {
    const newId = op.blocks.length === 1 && index === 0 ? op.blockId : block.id || uuidv42();
    return {
      ...block,
      id: newId
    };
  });
  const result = [];
  let replaced = false;
  for (const block of blocks) {
    if (block.id === op.blockId) {
      result.push(...replacementBlocks);
      replaced = true;
    } else {
      result.push(block);
    }
  }
  if (!replaced) {
    throw new Error(`Could not find block ${op.blockId} to replace`);
  }
  return result;
}
function applyMove(blocks, op) {
  let blocksToMove = [];
  let remainingBlocks = [];
  if (op.blockId) {
    const blockToMove = findBlockById(blocks, op.blockId);
    if (!blockToMove) {
      throw new Error(`Block not found: ${op.blockId}`);
    }
    blocksToMove = [blockToMove];
    remainingBlocks = blocks.filter((b) => b.id !== op.blockId);
  } else if (op.blockIds) {
    const ids = op.blockIds;
    for (const id of ids) {
      const block = findBlockById(blocks, id);
      if (!block) {
        throw new Error(`Block not found: ${id}`);
      }
      blocksToMove.push(block);
    }
    remainingBlocks = blocks.filter((b) => !ids.includes(b.id));
  } else if (op.fromBlockId && op.toBlockId) {
    const fromIndex = blocks.findIndex((b) => b.id === op.fromBlockId);
    const toIndex = blocks.findIndex((b) => b.id === op.toBlockId);
    if (fromIndex === -1) {
      throw new Error(`Block not found: ${op.fromBlockId}`);
    }
    if (toIndex === -1) {
      throw new Error(`Block not found: ${op.toBlockId}`);
    }
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    blocksToMove = blocks.slice(startIndex, endIndex + 1);
    remainingBlocks = [
      ...blocks.slice(0, startIndex),
      ...blocks.slice(endIndex + 1)
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
  return applyInsert(remainingBlocks, insertOp);
}
function findBlockById(blocks, id) {
  for (const block of blocks) {
    if (block.id === id) {
      return block;
    }
    if ("children" in block && block.children) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
  }
  return null;
}

// document/blocknote-converter.ts
init_ast();
function blockNoteToIdyllic(blockNoteBlocks) {
  return blockNoteBlocks.map(convertBlockNoteBlock);
}
function idyllicToBlockNote(idyllicBlocks) {
  return idyllicBlocks.map(convertIdyllicBlock);
}
function convertBlockNoteBlock(bnBlock) {
  const { id, type, props, content, children } = bnBlock;
  if (type === "trigger") {
    return {
      id,
      type: "trigger",
      tool: props.trigger || "",
      parameters: props.params ? JSON.parse(props.params) : {},
      instructions: Array.isArray(content) ? convertBlockNoteContent(content) : [],
      metadata: {
        enabled: props.enabled,
        modelId: props.modelId
      }
    };
  }
  if (type === "tool") {
    return {
      id,
      type: "tool",
      content: [],
      // Tool description would go here
      props: {
        title: props.title,
        icon: props.icon,
        toolDefinition: props.toolDefinition
      },
      children: children.map(convertBlockNoteBlock)
    };
  }
  if (type === "table") {
    return {
      id,
      type: "data",
      // Tables map to data blocks in Idyllic
      content: [{ type: "text", text: JSON.stringify(content) }],
      props: {
        title: "Table",
        originalType: "table",
        ...props
      },
      children: []
    };
  }
  if (type === "functionCall") {
    return {
      id,
      type: "function_call",
      tool: props.tool || "",
      parameters: props.params ? JSON.parse(props.params) : {},
      result: {
        success: !props.error,
        data: props.response || void 0,
        error: props.error || void 0
      },
      instructions: Array.isArray(content) && content.length > 0 ? convertBlockNoteContent(content) : [],
      metadata: {
        modelId: props.modelId
      }
    };
  }
  const typeMapping = {
    "paragraph": "paragraph",
    "heading": "heading",
    "bulletListItem": "bulletListItem",
    "numberedListItem": "numberedListItem",
    "checkListItem": "checklistItem",
    "quote": "quote",
    "codeBlock": "code",
    "separator": "separator"
  };
  const idyllicType = typeMapping[type] || "paragraph";
  const idyllicContent = Array.isArray(content) && content.length > 0 ? convertBlockNoteContent(content) : [{ type: "text", text: "" }];
  const block = {
    id,
    type: idyllicType,
    content: idyllicContent,
    children: children.map(convertBlockNoteBlock)
  };
  if (Object.keys(props).length > 0) {
    block.props = { ...props };
  }
  return block;
}
function convertBlockNoteContent(content) {
  return content.map((item) => {
    if (item.type === "text") {
      const textContent = {
        type: "text",
        text: item.text || ""
      };
      if (item.styles && Object.keys(item.styles).length > 0) {
        const styles = [];
        if (item.styles.bold) styles.push("bold");
        if (item.styles.italic) styles.push("italic");
        if (item.styles.underline) styles.push("underline");
        if (item.styles.strikethrough) styles.push("strikethrough");
        if (item.styles.code) styles.push("code");
        if (styles.length > 0) {
          textContent.styles = styles;
        }
      }
      return textContent;
    }
    if (item.type === "mention" && item.props) {
      const mention = {
        type: "mention",
        mentionType: mapMentionType(item.props.mentionType),
        id: item.props.id,
        label: item.props.label
      };
      return mention;
    }
    if (item.type === "link" && item.props) {
      const link = {
        type: "link",
        href: item.props.href || "",
        content: item.props.content ? convertBlockNoteContent(item.props.content) : []
      };
      return link;
    }
    return {
      type: "text",
      text: JSON.stringify(item)
    };
  });
}
function mapMentionType(bnType) {
  switch (bnType) {
    case "user":
      return "user";
    case "document":
      return "document";
    case "agent":
      return "agent";
    case "tool":
      return "custom";
    // Tools are custom mentions in Idyllic
    default:
      return "custom";
  }
}
function convertIdyllicBlock(block) {
  const { id } = block;
  if (isExecutableBlock(block)) {
    if (block.type === "trigger") {
      return {
        id,
        type: "trigger",
        props: {
          trigger: block.tool,
          params: JSON.stringify(block.parameters),
          enabled: block.metadata?.enabled ?? true,
          modelId: block.metadata?.modelId
        },
        content: block.instructions && block.instructions.length > 0 ? convertIdyllicContent(block.instructions) : [{ type: "text", text: "", styles: {} }],
        children: []
      };
    }
    if (block.type === "function_call") {
      return {
        id,
        type: "functionCall",
        props: {
          tool: block.tool,
          params: JSON.stringify(block.parameters),
          response: block.result?.data ? JSON.stringify(block.result.data) : "",
          error: block.result?.error ? JSON.stringify(block.result.error) : "",
          modelId: block.metadata?.modelId
        },
        content: block.instructions && block.instructions.length > 0 ? convertIdyllicContent(block.instructions) : [{ type: "text", text: "", styles: {} }],
        children: []
      };
    }
  }
  const contentBlock = block;
  if (contentBlock.type === "tool") {
    return {
      id,
      type: "tool",
      props: {
        title: contentBlock.props?.title || "Tool",
        icon: contentBlock.props?.icon || "\u{1F527}",
        toolDefinition: contentBlock.props?.toolDefinition || ""
      },
      content: [],
      children: contentBlock.children ? contentBlock.children.map(convertIdyllicBlock) : []
    };
  }
  if (contentBlock.type === "data" && contentBlock.props?.originalType === "table") {
    try {
      const firstContent = contentBlock.content[0];
      const tableData = JSON.parse(
        firstContent && firstContent.type === "text" ? firstContent.text : "{}"
      );
      return {
        id,
        type: "table",
        props: { textColor: contentBlock.props.textColor || "default" },
        content: tableData,
        children: []
      };
    } catch {
    }
  }
  const typeMapping = {
    "paragraph": "paragraph",
    "heading": "heading",
    "bulletListItem": "bulletListItem",
    "numberedListItem": "numberedListItem",
    "checklistItem": "checkListItem",
    "quote": "quote",
    "code": "codeBlock",
    "separator": "separator",
    "data": "paragraph"
    // Generic data blocks become paragraphs
  };
  const bnType = typeMapping[contentBlock.type] || "paragraph";
  const bnProps = {};
  if (bnType !== "separator" && bnType !== "codeBlock") {
    bnProps.textColor = contentBlock.props?.textColor || "default";
    bnProps.textAlignment = contentBlock.props?.textAlignment || "left";
    bnProps.backgroundColor = contentBlock.props?.backgroundColor || "default";
  }
  if (contentBlock.type === "heading") {
    bnProps.level = contentBlock.props?.level || 1;
  } else if (contentBlock.type === "checklistItem") {
    bnProps.checked = contentBlock.props?.checked || false;
  } else if (contentBlock.type === "code") {
    bnProps.language = contentBlock.props?.language || "text";
  } else if (contentBlock.type === "separator") {
    bnProps.text = contentBlock.props?.text || "";
  }
  if (contentBlock.props) {
    Object.keys(contentBlock.props).forEach((key) => {
      if (!bnProps[key]) {
        bnProps[key] = contentBlock.props[key];
      }
    });
  }
  const bnContent = convertIdyllicContent(contentBlock.content);
  const finalContent = bnContent.length > 0 ? bnContent : [{ type: "text", text: "", styles: {} }];
  return {
    id,
    type: bnType,
    props: bnProps,
    content: finalContent,
    children: contentBlock.children ? contentBlock.children.map(convertIdyllicBlock) : []
  };
}
function convertIdyllicContent(content) {
  return content.map((item) => {
    if (item.type === "text") {
      const bnContent = {
        type: "text",
        text: item.text,
        styles: {}
      };
      if (item.styles) {
        item.styles.forEach((style) => {
          bnContent.styles[style] = true;
        });
      }
      return bnContent;
    }
    if (item.type === "mention") {
      return {
        type: "mention",
        props: {
          id: item.id,
          label: item.label || "",
          iconUrl: "",
          mentionId: generateMentionId(),
          parameters: "",
          mentionType: item.mentionType === "custom" ? "tool" : item.mentionType
        }
      };
    }
    if (item.type === "link") {
      return {
        type: "link",
        props: {
          href: item.href,
          content: convertIdyllicContent(item.content)
        }
      };
    }
    if (item.type === "variable") {
      return {
        type: "mention",
        props: {
          id: `var:${item.name}`,
          label: item.name,
          iconUrl: "",
          mentionId: generateMentionId(),
          parameters: "",
          mentionType: "custom"
        }
      };
    }
    if (item.type === "annotation") {
      const annotatedContent = convertIdyllicContent(item.content);
      return {
        type: "text",
        text: annotatedContent.map((c) => c.text).join(""),
        styles: { backgroundColor: "yellow" }
      };
    }
    return {
      type: "text",
      text: `[${item.type || "unknown"}]`,
      styles: {}
    };
  });
}
function generateMentionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
function testIsomorphism(original) {
  const idyllic = blockNoteToIdyllic(original);
  const roundTripped = idyllicToBlockNote(idyllic);
  const differences = [];
  if (original.length !== roundTripped.length) {
    differences.push(`Block count mismatch: ${original.length} vs ${roundTripped.length}`);
  }
  return {
    isIsomorphic: differences.length === 0,
    differences
  };
}

// agent/agent.ts
import { generateText as generateText2, streamText } from "ai";

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
init_ast();
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
  for (const block of agent.blocks) {
    if (block.type === "tool") {
      const title = block.props?.title || "Untitled Tool";
      customTools.push(`Custom tool: ${title}`);
    } else if (block.type === "trigger") {
      const trigger = block.props?.trigger;
      if (trigger) {
        triggers.push(`Trigger: ${trigger}`);
      }
    } else if ("content" in block && block.content) {
      const text = extractTextFromBlock(block);
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
function extractTextFromBlock(block) {
  if (!("content" in block) || !block.content) {
    return "";
  }
  const texts = [];
  for (const content of block.content) {
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

// agent/agent.ts
init_model_provider();

// agent/custom-tools.ts
import { z as z11 } from "zod";
function extractCustomTools(agentDoc, baseTools, getAgentContext) {
  const customTools = {};
  console.log("\u{1F50D} Extracting custom tools from agent document...");
  for (const block of agentDoc.blocks) {
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
        schema: z11.object({
          context: z11.string().describe("Relevant context to help resolve any variables in the tool").optional()
        }),
        execute: async (params, content, context) => {
          console.log(`\u{1F6E0}\uFE0F Executing custom tool: ${title}`);
          const toolDoc = {
            id: `custom-tool-${toolName}`,
            blocks: definitionBlocks
          };
          const customToolBlock = {
            id: context.blockId || "custom-tool-exec",
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
            const lastBlockId = Array.from(executionContext.blocks.keys()).pop();
            const lastResult = lastBlockId ? executionContext.blocks.get(lastBlockId) : void 0;
            console.log(`\u{1F50D} Execution complete. Last block ID: ${lastBlockId}`);
            console.log(`\u{1F4CB} Last result:`, lastResult);
            console.log(`\u{1F4CA} All blocks:`, Array.from(executionContext.blocks.entries()));
            const results = Array.from(executionContext.blocks.values());
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
    if ("variables" in context.rawResponse && "blocks" in context.rawResponse) {
      const ctx = context.rawResponse;
      const summary = {
        success: ctx.metadata?.blocksSucceeded > 0,
        blocksExecuted: ctx.metadata?.blocksExecuted || 0,
        variables: Object.fromEntries(ctx.variables || /* @__PURE__ */ new Map()),
        errors: ctx.metadata?.blocksFailed > 0 ? "Some blocks failed" : null
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
    if ("variables" in response && "blocks" in response && "metadata" in response) {
      return true;
    }
  }
  const size = JSON.stringify(response).length;
  return size > 2e3;
}
function formatResponse(response) {
  if (response && typeof response === "object" && "blocks" in response) {
    const ctx = response;
    const parts = [];
    if (ctx.variables.size > 0) {
      parts.push("Variables resolved:");
      ctx.variables.forEach((value, key) => {
        parts.push(`  ${key}: ${value}`);
      });
    }
    if (ctx.blocks.size > 0) {
      parts.push("\nBlock executions:");
      ctx.blocks.forEach((result, blockId) => {
        if (result.success) {
          parts.push(`  \u2713 ${blockId}: ${JSON.stringify(result.data)}`);
        } else {
          parts.push(`  \u2717 ${blockId}: ${result.error}`);
        }
      });
    }
    if (ctx.metadata) {
      parts.push(`
Execution summary:`);
      parts.push(`  Tool: ${ctx.metadata.toolName}`);
      parts.push(`  Blocks executed: ${ctx.metadata.blocksExecuted}`);
      parts.push(`  Succeeded: ${ctx.metadata.blocksSucceeded}`);
      parts.push(`  Failed: ${ctx.metadata.blocksFailed}`);
    }
    return parts.join("\n");
  }
  return JSON.stringify(response, null, 2);
}

// agent/agent.ts
var Agent = class {
  config;
  memory;
  context;
  aiTools = {};
  currentMessages = [];
  constructor(config) {
    if (config.systemPrompt && !config.document) {
      const { parseXML: parseXML2 } = (init_parser_grammar(), __toCommonJS(parser_grammar_exports));
      try {
        const parsedDoc = parseXML2(config.systemPrompt);
        config.document = {
          type: "agent",
          id: config.agentId || "agent-" + Date.now(),
          name: config.agentName || "Assistant",
          model: config.model || "gpt-4",
          blocks: parsedDoc.blocks || []
        };
      } catch (error) {
        throw new Error(`Failed to parse system prompt XML: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    if (!config.document) {
      throw new Error("Either document or systemPrompt must be provided");
    }
    this.config = config;
    this.memory = new ActivityMemory(config.memoryLimit);
    this.context = {
      agentId: config.document.id,
      agentName: config.document.name,
      model: config.document.model,
      activities: []
    };
    this.initializeTools();
  }
  /**
   * Initialize tools for AI SDK
   */
  initializeTools() {
    const customTools = this.config.document ? extractCustomTools(
      this.config.document,
      this.config.tools,
      () => {
        const lastUserMessage = this.currentMessages.filter((m) => m.role === "user").pop();
        return typeof lastUserMessage?.content === "string" ? lastUserMessage.content : JSON.stringify(lastUserMessage?.content || "");
      }
    ) : {};
    const allTools = mergeToolRegistries(this.config.tools, customTools);
    for (const [name17, tool] of Object.entries(allTools)) {
      const aiToolName = toAzureFunctionName(name17);
      this.aiTools[aiToolName] = {
        description: tool.description,
        parameters: tool.schema,
        execute: async (params) => {
          console.log(`\u{1F527} Executing tool: ${name17}`);
          const context = {
            currentBlockId: uuidv43(),
            previousResults: /* @__PURE__ */ new Map(),
            document: this.config.document || { id: "unknown", blocks: [] }
          };
          try {
            const content = params.content || "";
            delete params.content;
            const result = await tool.execute(params, content, context);
            const isCustomTool = name17.startsWith("custom:");
            const finalResult = isCustomTool ? await compressToolResponse({
              toolName: name17,
              toolParams: params,
              toolContent: content,
              rawResponse: result,
              recentMessages: this.currentMessages.slice(-3)
            }) : result;
            if (isCustomTool) {
              console.log(`\u{1F3AF} Custom tool ${name17} executed and compressed`);
            }
            this.memory.add({
              type: "tool",
              toolCalls: [
                {
                  name: name17,
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
                  name: name17,
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
      this.config.document || { type: "agent", id: "unknown", blocks: [] },
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
      const result = await generateText2({
        model: getModel(this.config.document?.model || this.config.model || "gpt-4"),
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
        model: getModel(this.config.document?.model || this.config.model || "gpt-4"),
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

// index.ts
init_model_provider();
export {
  ActivityMemory,
  Agent,
  DocumentExecutor,
  GRAMMAR,
  GrammarCompiler,
  applyDiff,
  applyResolvedVariables,
  blockNoteToIdyllic,
  buildDetailedSystemPrompt,
  buildSystemPrompt,
  buildToolName,
  checkModelConfig,
  checkVariableRedeclaration,
  createSimpleRegistry,
  createToolRegistry,
  defineTool,
  executeCustomTool,
  extractMentions,
  extractRelevantResult,
  extractVariableDefinitions,
  extractVariables,
  findBlock,
  formatValidationIssues,
  fromAzureFunctionName,
  getExecutableBlocks,
  getModel,
  idyllicToBlockNote,
  interpolateContent,
  isContentBlock,
  isExecutableBlock,
  isMention,
  isTextContent,
  isVariable,
  mergeToolRegistries,
  parseCustomTool,
  parseToolName,
  parseXML,
  parseXmlToAst,
  resolveVariables,
  serializeAstToXml,
  serializeToXML,
  testIsomorphism,
  toAzureFunctionName,
  traverseBlocks,
  validateDocument,
  validateToolName
};
/*! Bundled license information:

aws4fetch/dist/aws4fetch.esm.mjs:
  (**
   * @license MIT <https://opensource.org/licenses/MIT>
   * @copyright Michael Hart 2024
   *)
*/
//# sourceMappingURL=index.js.map