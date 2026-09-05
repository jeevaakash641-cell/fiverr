/**
 * Frontend HTML Sanitizer & Media Helpers
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
  pre: new Set(['class'])
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
 * Sanitize rich-text HTML string on the client
 */
export function sanitizeHtml(html = '') {
  if (typeof html !== 'string') return '';

  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

  clean = clean.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, rawAttrs) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(lowerTag)) return '';
    if (match.startsWith('</')) return `</${lowerTag}>`;

    const allowedAttrsForTag = ALLOWED_ATTRS[lowerTag] || new Set();
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let safeAttrsStr = '';
    let attrMatch;

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      if (attrName.startsWith('on')) continue;
      if (/javascript:|vbscript:|data:/i.test(attrVal)) continue;

      if (allowedAttrsForTag.has(attrName)) {
        if (attrName === 'href') {
          if (SAFE_PROTOCOLS.test(attrVal.trim())) {
            safeAttrsStr += ` href="${encodeURI(attrVal.trim())}" target="_blank" rel="noopener noreferrer"`;
          }
        } else if (attrName !== 'target' && attrName !== 'rel') {
          const safeVal = attrVal.replace(/"/g, '&quot;');
          safeAttrsStr += ` ${attrName}="${safeVal}"`;
        }
      }
    }

    if (lowerTag === 'br' || lowerTag === 'hr') {
      return `<${lowerTag}${safeAttrsStr} />`;
    }

    return `<${lowerTag}${safeAttrsStr}>`;
  });

  return clean.trim();
}

/**
 * Validate and parse video URLs into safe embed URLs
 */
export function getEmbedVideoUrl(url = '') {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  try {
    // 1. YouTube
    // Formats: https://www.youtube.com/watch?v=VIDEO_ID, https://youtu.be/VIDEO_ID, https://www.youtube.com/embed/VIDEO_ID
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
      };
    }

    // 2. Vimeo
    // Format: https://vimeo.com/VIDEO_ID
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/i);
    if (vimeoMatch && vimeoMatch[3]) {
      return {
        type: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`
      };
    }

    // 3. Direct HTML5 Video File (mp4, webm, ogg, mov)
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
      return {
        type: 'direct',
        embedUrl: trimmed
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a video URL is valid & supported
 */
export function isValidVideoUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  return getEmbedVideoUrl(url) !== null;
}

/**
 * Check if an image URL is well-formed
 */
export function isValidImageUrl(url = '') {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default {
  stripHtml,
  sanitizeHtml,
  getEmbedVideoUrl,
  isValidVideoUrl,
  isValidImageUrl
};
