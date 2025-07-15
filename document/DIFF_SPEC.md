# Idyll Document Diff Specification

## Overview

Diff operations enable precise modifications to Idyll documents using a flat, block-ID-based addressing system. All operations target blocks by their unique IDs, avoiding hierarchical complexity.

## Core Operations

### 1. edit:attr
Change a single attribute/property on a block.

```xml
<edit:attr block-id="block123" name="language" value="typescript"/>
<edit:attr block-id="block456" name="checked" value="true"/>
<edit:attr block-id="fn123" name="idyll-fn" value="demo:calculate"/>
```

### 2. edit:content  
Replace the rich inline content of a block entirely.

```xml
<edit:content block-id="block123">
  This is the new <strong>content</strong> for the block.
</edit:content>
```

### 3. edit:params
Replace the params content (typically JSON/CDATA) for function call blocks.

```xml
<edit:params block-id="fn123">{"expression": "2 + 2"}</edit:params>
<edit:params block-id="fn456"><![CDATA[
{
  "complex": "json with \"quotes\"",
  "numbers": [1, 2, 3]
}
]]></edit:params>
```

### 4. edit:id
Change the ID of a block.

```xml
<edit:id block-id="old-id" value="new-id"/>
```

### 5. insert
Add new blocks at a specific position using block-ID anchoring.

```xml
<!-- Insert after a specific block -->
<insert after-block-id="block123">
  <p>New paragraph content</p>
  <h2>New heading</h2>
</insert>

<!-- Insert before a specific block -->
<insert before-block-id="block456">
  <p>This goes before block456</p>
</insert>

<!-- Insert at document start -->
<insert at-start="true">
  <h1>Document title</h1>
</insert>

<!-- Insert at document end -->
<insert at-end="true">
  <p>Footer content</p>
</insert>
```

### 6. delete
Remove a block entirely.

```xml
<delete block-id="block123"/>
```

### 7. replace
Replace a block with one or more new blocks.

```xml
<replace block-id="block123">
  <h1>Replacement heading</h1>
  <p>Replacement content</p>
</replace>
```

### 8. move
Relocate existing blocks (cut semantics - original is removed).

```xml
<!-- Move single block -->
<move block-id="block123" after-block-id="block456"/>
<move block-id="block123" before-block-id="block456"/>
<move block-id="block123" at-start="true"/>
<move block-id="block123" at-end="true"/>

<!-- Move multiple blocks -->
<move block-ids="block123,block124,block125" after-block-id="block456"/>

<!-- Move range of blocks -->
<move from-block-id="block123" to-block-id="block125" after-block-id="block456"/>
```

## Positioning Rules

- **Block-ID based**: All positioning uses block IDs as anchors
- **Flat structure**: No hierarchical nesting considerations
- **Mutually exclusive**: Each operation specifies exactly one position method
- **Document boundaries**: `at-start` and `at-end` refer to document root level

## Future Considerations

### Buffer Operations (Under Design)
For copying and expanding content across operations:

```xml
<!-- Extract content for reuse -->
<buffer name="signature" from-block-id="block123" select="..."/>

<!-- Reference buffered content -->
<insert after-block-id="block456">
  <p>Footer: <buffer-ref name="signature"/></p>
</insert>
```

### Inline Content Addressing (Under Design)  
For precise selection within rich content using XPath or regex:

```xml
<!-- XPath-style selection -->
<buffer name="username" from-block-id="block123" select="//mention:user[1]"/>

<!-- Regex-based extraction -->
<buffer name="price" from-block-id="block123" select-regex="\$\d+\.\d{2}"/>
```

## Examples

### Simple Content Edit
```xml
<diff>
  <edit:content block-id="intro-para">
    Welcome to <strong>Idyll Engine</strong> - the future of document execution.
  </edit:content>
</diff>
```

### Function Call Updates
```xml
<diff>
  <edit:attr block-id="fn123" name="idyll-fn" value="demo:calculate"/>
  <edit:params block-id="fn123">{"expression": "5 * 8"}</edit:params>
</diff>
```

### Document Restructuring
```xml
<diff>
  <move block-id="conclusion" at-end="true"/>
  <insert after-block-id="intro">
    <h2>Table of Contents</h2>
    <bulletlistitem>Introduction</bulletlistitem>
    <bulletlistitem>Main Content</bulletlistitem>
    <bulletlistitem>Conclusion</bulletlistitem>
  </insert>
</diff>
```

### Attribute Updates
```xml
<diff>
  <edit:attr block-id="code-block" name="language" value="python"/>
  <edit:attr block-id="task-item" name="checked" value="true"/>
</diff>
```