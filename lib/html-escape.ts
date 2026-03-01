/**
 * Escape HTML special characters to prevent XSS in email templates.
 * Use this for any user-supplied or database-sourced text embedded in HTML.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] || ch);
}
