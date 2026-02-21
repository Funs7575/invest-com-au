/**
 * Lightweight HTML sanitizer — strips dangerous tags and attributes.
 * For admin-authored content stored in the database. Not a replacement
 * for DOMPurify, but prevents the most common XSS vectors in case
 * the admin account or database is compromised.
 */
export function sanitizeHtml(html: string): string {
  return html
    // Remove script/iframe/object/embed tags and their content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?\/?>/gi, "")
    // Remove self-closing script/iframe tags
    .replace(/<script[\s\S]*?\/?>/gi, "")
    .replace(/<iframe[\s\S]*?\/?>/gi, "")
    // Remove on* event handler attributes (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Remove javascript: protocol in href/src attributes
    .replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
}
