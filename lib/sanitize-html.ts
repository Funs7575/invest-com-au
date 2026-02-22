/**
 * Lightweight HTML sanitizer — strips dangerous tags and attributes.
 * For admin-authored content stored in the database. Not a replacement
 * for DOMPurify, but prevents the most common XSS vectors in case
 * the admin account or database is compromised.
 */
export function sanitizeHtml(html: string): string {
  return html
    // Remove script/iframe/object/embed/applet and their content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?\/?>/gi, "")
    .replace(/<applet[\s\S]*?<\/applet>/gi, "")
    // Remove style tags (prevent CSS injection / data exfiltration)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Remove svg/math tags (can execute JS via onload, xlink:href, etc.)
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<math[\s\S]*?<\/math>/gi, "")
    // Remove form elements (prevent phishing)
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<input[\s\S]*?\/?>/gi, "")
    .replace(/<textarea[\s\S]*?<\/textarea>/gi, "")
    .replace(/<select[\s\S]*?<\/select>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    // Remove base/link/meta tags (prevent redirect hijacking)
    .replace(/<base[\s\S]*?\/?>/gi, "")
    .replace(/<link[\s\S]*?\/?>/gi, "")
    .replace(/<meta[\s\S]*?\/?>/gi, "")
    // Remove self-closing dangerous tags
    .replace(/<script[\s\S]*?\/?>/gi, "")
    .replace(/<iframe[\s\S]*?\/?>/gi, "")
    // Remove on* event handler attributes (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    // Remove javascript:/vbscript:/data: protocols in href/src/action attributes
    .replace(/(href|src|action)\s*=\s*(?:"(?:javascript|vbscript|data):[^"]*"|'(?:javascript|vbscript|data):[^']*')/gi, '$1=""');
}
