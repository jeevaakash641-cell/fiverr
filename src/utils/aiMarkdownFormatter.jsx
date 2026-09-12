import React from 'react'

/**
 * Cleanly renders inline markdown without leaving raw asterisks (* or **)
 */
export const renderInlineMarkdown = (rawText) => {
  if (!rawText) return null
  const remaining = String(rawText)

  // Tokenize string by regex patterns:
  // - ***bold italic***
  // - **bold** or __bold__
  // - *italic* or _italic_
  // - `code`
  // - [label](url)
  const pattern = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[^*\n]+?\*|__[\s\S]+?__|_[^_\n]+?_|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/g
  const tokens = []
  let lastIndex = 0
  let match

  while ((match = pattern.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      let plain = remaining.slice(lastIndex, match.index)
      plain = plain.replace(/\*/g, '')
      if (plain) tokens.push({ type: 'text', value: plain })
    }

    const chunk = match[0]
    if (chunk.startsWith('***') && chunk.endsWith('***')) {
      const inner = chunk.slice(3, -3).replace(/\*/g, '')
      tokens.push({ type: 'bold_italic', value: inner })
    } else if (chunk.startsWith('**') && chunk.endsWith('**')) {
      const inner = chunk.slice(2, -2).replace(/\*/g, '')
      tokens.push({ type: 'bold', value: inner })
    } else if (chunk.startsWith('__') && chunk.endsWith('__')) {
      const inner = chunk.slice(2, -2)
      tokens.push({ type: 'bold', value: inner })
    } else if (chunk.startsWith('*') && chunk.endsWith('*')) {
      const inner = chunk.slice(1, -1).replace(/\*/g, '')
      tokens.push({ type: 'italic', value: inner })
    } else if (chunk.startsWith('_') && chunk.endsWith('_')) {
      const inner = chunk.slice(1, -1)
      tokens.push({ type: 'italic', value: inner })
    } else if (chunk.startsWith('`') && chunk.endsWith('`')) {
      const inner = chunk.slice(1, -1)
      tokens.push({ type: 'code', value: inner })
    } else if (chunk.startsWith('[') && chunk.includes('](')) {
      const labelMatch = chunk.match(/\[(.*?)\]\((.*?)\)/)
      if (labelMatch) {
        tokens.push({ type: 'link', label: labelMatch[1], url: labelMatch[2] })
      }
    }

    lastIndex = match.index + chunk.length
  }

  if (lastIndex < remaining.length) {
    let plain = remaining.slice(lastIndex)
    plain = plain.replace(/\*/g, '')
    if (plain) tokens.push({ type: 'text', value: plain })
  }

  if (tokens.length === 0) {
    return remaining.replace(/\*/g, '')
  }

  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'bold_italic':
        return <strong key={idx} className="font-bold italic text-gray-900">{token.value}</strong>
      case 'bold':
        return <strong key={idx} className="font-bold text-gray-900">{token.value}</strong>
      case 'italic':
        return <em key={idx} className="italic text-gray-800">{token.value}</em>
      case 'code':
        return (
          <code key={idx} className="bg-gray-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-xs font-semibold">
            {token.value}
          </code>
        )
      case 'link':
        return (
          <a
            key={idx}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 underline font-medium hover:text-emerald-900"
          >
            {token.label}
          </a>
        )
      default:
        return <React.Fragment key={idx}>{token.value}</React.Fragment>
    }
  })
}

/**
 * Formats multi-line AI message content with full block structure and zero raw asterisks
 */
export const renderFormattedAIContent = (content, fontStyles = {}) => {
  if (!content) return null
  const lines = String(content).split('\n')

  return lines.map((rawLine, index) => {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      return <div key={index} className="h-2" />
    }

    // 1. Horizontal divider
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      return <hr key={index} className="my-3 border-gray-200" />
    }

    // 2. Markdown Headings (# Heading, ## Heading, ### Heading)
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/)
    if (headingMatch) {
      const headingText = headingMatch[2].replace(/^\*+|\*+$/g, '').trim()
      return (
        <h3 key={index} className={fontStyles.heading || 'font-bold text-emerald-900 mt-3 mb-1 text-base'}>
          {renderInlineMarkdown(headingText)}
        </h3>
      )
    }

    // 3. Standalone bold line acting as heading (e.g. **1. Pitch Safety Rules** or **Overview:**)
    if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      const titleText = trimmed.replace(/^\*\*|\*\*:?$/g, '').trim()
      return (
        <h4 key={index} className={fontStyles.heading || 'font-bold text-emerald-900 mt-2 mb-1 text-sm'}>
          {renderInlineMarkdown(titleText)}
        </h4>
      )
    }

    // 4. Special Callouts (Step 1:, Key Concept:, Note:, Important:, Final Answer:)
    const cleanForCheck = trimmed.replace(/\*/g, '').trim()
    if (/^(Step \d+:|Final Answer:|Key Concept:|Common Mistake:|Note:|Tip:|Important:)/i.test(cleanForCheck)) {
      return (
        <div
          key={index}
          className={`font-bold text-emerald-900 my-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-lg flex items-start gap-1.5 ${fontStyles.text || 'text-sm'}`}
        >
          <span>{renderInlineMarkdown(trimmed)}</span>
        </div>
      )
    }

    // 5. Bullet list items (* item, - item, • item, + item)
    const bulletMatch = trimmed.match(/^([•\-\*\+])\s+(.*)$/)
    if (bulletMatch) {
      const itemContent = bulletMatch[2]
      return (
        <div key={index} className={`ml-3 flex items-start gap-2 my-1 text-gray-800 ${fontStyles.text || 'text-sm'}`}>
          <span className="text-emerald-700 font-bold mt-0.5">•</span>
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(itemContent)}</span>
        </div>
      )
    }

    // 6. Numbered list items (1. item, 2) item)
    const numberedMatch = trimmed.match(/^(\d+[\.\)])\s+(.*)$/)
    if (numberedMatch) {
      const numMarker = numberedMatch[1]
      const itemContent = numberedMatch[2]
      return (
        <div key={index} className={`ml-1 flex items-start gap-2 my-1.5 text-gray-800 ${fontStyles.text || 'text-sm'}`}>
          <span className="font-bold text-emerald-800 text-xs min-w-[20px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-center flex-shrink-0">
            {numMarker}
          </span>
          <span className="flex-1 leading-relaxed">{renderInlineMarkdown(itemContent)}</span>
        </div>
      )
    }

    // 7. Math / Formulas lines
    if (trimmed.includes(' = ') || trimmed.includes(' ÷ ') || trimmed.includes(' × ')) {
      return (
        <p key={index} className={`my-1.5 ${fontStyles.math || 'font-mono bg-gray-100 px-3 py-1.5 rounded text-xs'}`}>
          {renderInlineMarkdown(trimmed)}
        </p>
      )
    }

    // 8. Standard paragraph
    return (
      <p key={index} className={`text-gray-800 leading-relaxed my-1.5 ${fontStyles.text || 'text-sm'}`}>
        {renderInlineMarkdown(trimmed)}
      </p>
    )
  })
}

export default {
  renderInlineMarkdown,
  renderFormattedAIContent
}
