/**
 * Helpers for building HTML strings on the server (transactional email templates).
 *
 * - `escapeHtml`: every value that is not a fixed literal, before it goes into HTML.
 * - `safeHref`: every URL, before it is escaped into an `href`.
 * - `oneLine`: plain-text fields such as email subjects. Never HTML-escape those.
 */

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes `& < > " '`, so the result is safe as HTML text and inside a quoted attribute.
 * `null` and `undefined` become an empty string.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}

function isControlChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code < 0x20 || (code >= 0x7f && code <= 0x9f);
}

/**
 * Makes a value one line of plain text, for email subjects and preview text.
 * Line breaks, tabs and other control characters become spaces, runs of whitespace
 * collapse to one space, the ends are trimmed, and the result is cut to at most `max`
 * characters (whole code points, so an emoji is never split). The result is NOT escaped.
 */
export function oneLine(value: unknown, max = 200): string {
  if (value === null || value === undefined) return "";
  const text = Array.from(String(value), (ch) => (isControlChar(ch) ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return chars.slice(0, Math.max(0, max)).join("").trimEnd();
}

const URL_SCHEME = /^([a-z][a-z0-9+.-]*):/i;

/**
 * Returns the URL when it is http(s) or a relative path, otherwise "#".
 * Use it for every URL placed in an `href`, then escape the result with `escapeHtml`.
 *
 * Browsers drop tabs and line breaks anywhere in a URL and spaces or control characters at
 * either end, so those are removed before the scheme check (" java\tscript:" is rejected).
 * Protocol-relative URLs ("//host", "/\host") are rejected too.
 */
export function safeHref(url: unknown): string {
  if (typeof url !== "string") return "#";
  const cleaned = url.replace(/[\t\n\r]/g, "");
  let start = 0;
  let end = cleaned.length;
  while (start < end && cleaned.charCodeAt(start) <= 0x20) start++;
  while (end > start && cleaned.charCodeAt(end - 1) <= 0x20) end--;
  const candidate = cleaned.slice(start, end);
  if (!candidate) return "#";

  const scheme = URL_SCHEME.exec(candidate)?.[1]?.toLowerCase();
  if (scheme) return scheme === "http" || scheme === "https" ? candidate : "#";
  return /^[\\/]{2}/.test(candidate) ? "#" : candidate;
}
