/**
 * Safe HTML Sanitizer Utility for Lesson Content
 * Removes dangerous tags, attributes, event handlers, and malicious URLs.
 */

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'hr', 'br', 'a', 'span', 'div'
]);

const ALLOWED_ATTRS = {
  a: new Set(['href', 'target', 'rel', 'title']),
  span: new Set(['class']),
  div: new Set(['class']),
  p: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
};

const SAFE_PROTOCOLS = /^(https?:|mailto:|\/|#)/i;

/**
 * Remove all HTML tags to get pure text content
 */
export function stripHtml(html = '') {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
}

/**
 * Sanitize rich-text HTML string
 */
export function sanitizeHtml(html = '') {
  if (typeof html !== 'string') return '';

  // 1. Remove dangerous blocks (script, style, iframe, object, embed, etc.) completely
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

  // 2. Parse and filter tags
  clean = clean.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, rawAttrs) => {
    const lowerTag = tagName.toLowerCase();

    // If tag is not in allowlist, strip the tag
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return '';
    }

    // Closing tag
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    // Filter attributes
    const allowedAttrsForTag = ALLOWED_ATTRS[lowerTag] || new Set();
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let safeAttrsStr = '';
    let attrMatch;

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Strictly deny any event handlers or javascript/data URLs
      if (attrName.startsWith('on')) continue;
      if (/javascript:|vbscript:|data:/i.test(attrVal)) continue;

      if (allowedAttrsForTag.has(attrName)) {
        if (attrName === 'href') {
          if (SAFE_PROTOCOLS.test(attrVal.trim())) {
            safeAttrsStr += ` href="${encodeURI(attrVal.trim())}" target="_blank" rel="noopener noreferrer"`;
          }
        } else if (attrName !== 'target' && attrName !== 'rel') {
          // Escape quotes in attribute value
          const safeVal = attrVal.replace(/"/g, '&quot;');
          safeAttrsStr += ` ${attrName}="${safeVal}"`;
        }
      }
    }

    // Self-closing tag handling
    if (lowerTag === 'br' || lowerTag === 'hr') {
      return `<${lowerTag}${safeAttrsStr} />`;
    }

    return `<${lowerTag}${safeAttrsStr}>`;
  });

  return clean.trim();
}

export default { sanitizeHtml, stripHtml };
