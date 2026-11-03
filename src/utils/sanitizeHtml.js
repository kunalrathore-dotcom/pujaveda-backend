/**
 * Lightweight and robust HTML Sanitizer for Pujaveda Journal Blog Articles.
 * Prevents Stored XSS, stripped dangerous scripts, iframes, inline event handlers,
 * and untrusted protocols while safely preserving rich text formatting.
 */

const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "b", "strong", "i", "em", "u", "s", "strike",
  "ul", "ol", "li",
  "a", "img",
  "blockquote", "hr", "br",
  "span", "pre", "code",
  "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td"
]);

const ALLOWED_ATTRS = {
  a: new Set(["href", "target", "rel", "title", "class"]),
  img: new Set(["src", "alt", "title", "class", "width", "height", "loading"]),
  common: new Set(["class", "title", "id"])
};

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto):|\/uploads\/|#|\/)/i;

export const sanitizeArticleHtml = (dirtyHtml) => {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {
    return "";
  }

  let html = dirtyHtml;

  // 1. Remove dangerous blocks completely (including content between open/close tags)
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  html = html.replace(/<embed\b[^>]*>(?:<\/embed>)?/gi, "");
  html = html.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");
  html = html.replace(/<input\b[^>]*>/gi, "");
  html = html.replace(/<button\b[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, "");

  // 2. Parse and filter individual tags and attributes
  const tagRegex = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;

  const sanitized = html.replace(tagRegex, (match, tagName, rawAttrs) => {
    const tag = tagName.toLowerCase();
    const isClosing = match.startsWith("</");

    // If tag is not in allowed whitelist, strip tag entirely
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (isClosing) {
      return `</${tag}>`;
    }

    // Filter attributes
    const allowedForTag = ALLOWED_ATTRS[tag] || ALLOWED_ATTRS.common;
    const cleanAttrs = [];
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

    let attrMatch;
    let hasTargetBlank = false;
    let hasRel = false;

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";

      // Strip any on* event handlers (onclick, onerror, onload, etc.)
      if (attrName.startsWith("on")) {
        continue;
      }

      // Check allowed attributes
      if (allowedForTag.has(attrName) || ALLOWED_ATTRS.common.has(attrName)) {
        // Extra URL validation for href and src
        if (attrName === "href" || attrName === "src") {
          const trimmedVal = attrVal.trim();
          if (SAFE_URL_PATTERN.test(trimmedVal)) {
            cleanAttrs.push(`${attrName}="${encodeURI(trimmedVal).replace(/"/g, "&quot;")}"`);
          }
        } else if (attrName === "target") {
          if (attrVal === "_blank") {
            hasTargetBlank = true;
            cleanAttrs.push('target="_blank"');
          }
        } else if (attrName === "rel") {
          hasRel = true;
          cleanAttrs.push(`rel="noopener noreferrer"`);
        } else {
          // General clean attribute
          const safeVal = String(attrVal).replace(/"/g, "&quot;");
          cleanAttrs.push(`${attrName}="${safeVal}"`);
        }
      }
    }

    // If a tag has target="_blank" without rel, ensure noopener noreferrer is added
    if (tag === "a" && hasTargetBlank && !hasRel) {
      cleanAttrs.push('rel="noopener noreferrer"');
    }

    // Self-closing tags
    if (tag === "img" || tag === "hr" || tag === "br") {
      return cleanAttrs.length > 0 ? `<${tag} ${cleanAttrs.join(" ")} />` : `<${tag} />`;
    }

    return cleanAttrs.length > 0 ? `<${tag} ${cleanAttrs.join(" ")}>` : `<${tag}>`;
  });

  return sanitized.trim();
};

export default sanitizeArticleHtml;

