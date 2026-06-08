/**
 * HTML entity escaping for user-supplied strings.
 * Prevents XSS when rendering user content in server-rendered HTML.
 *
 * Note: React already escapes JSX by default. This is for cases where
 * we construct raw HTML strings (e.g. email bodies, meta tags).
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#96;",
};

const ESCAPE_RE = /[&<>"'`/]/g;

export function escapeHtml(str: string): string {
  return str.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch] ?? ch);
}

/**
 * Strip potential injection vectors from a string.
 * Useful for logging, audit trails, and display in non-HTML contexts.
 */
export function sanitize(str: string): string {
  return str
    .replace(/[<>]/g, "") // strip angle brackets
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // strip control chars
    .trim();
}

/**
 * Extract a safe display name from user input.
 * Truncates and strips dangerous characters.
 */
export function safeDisplayName(input: string, maxLen = 100): string {
  return sanitize(input).slice(0, maxLen) || "Anonymous";
}
