/**
 * Email reply parsing for the Reply-by-Email Bridge.
 *
 * Inbound replies to brief notification emails arrive with the full
 * client-specific baggage: quoted history, "On ... wrote:" attribution
 * lines, Outlook header blocks, signatures, mobile trailers. Only the
 * freshly typed reply should land in `brief_messages`, so this module
 * strips everything below the first reply marker and drops quoted lines.
 *
 * Heuristics covered (each has a fixture test):
 *   - Gmail / Apple Mail:        "On Mon, 1 Jun 2026 ... wrote:" (incl.
 *                                the wrapped two-line Apple Mail variant)
 *   - Outlook desktop:           "-----Original Message-----"
 *   - Outlook web / mobile:      a long "____________" divider, or a bare
 *                                "From: ... / Sent: ... / To: ... /
 *                                Subject: ..." header block
 *   - Forwards:                  "---------- Forwarded message ---------"
 *   - Quoted lines:              "> ..." prefixed lines
 *   - Signatures:                the RFC 3676 "-- " delimiter
 *   - Mobile trailers:           "Sent from my iPhone", "Get Outlook for
 *                                iOS", and friends
 *
 * Pure module — no I/O. The extracted body is capped at
 * BRIEF_MESSAGE_MAX_BODY_LENGTH, the same limit the in-app chat API
 * enforces, so an emailed reply can never exceed what the UI allows.
 */

import { BRIEF_MESSAGE_MAX_BODY_LENGTH } from "@/lib/brief-messages";

/** Guard against pathological inputs before any line scanning. */
export const MAX_SOURCE_LENGTH = 100_000;

// ─── Reply / signature markers ───────────────────────────────────────────

const ORIGINAL_MESSAGE_RE = /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i;
const FORWARDED_MESSAGE_RE = /^\s*-{2,}\s*Forwarded message\s*-{2,}\s*$/i;
const UNDERSCORE_DIVIDER_RE = /^\s*_{8,}\s*$/;
const SIGNATURE_DELIMITER_RE = /^--\s?$/;
const MOBILE_TRAILER_RE =
  /^\s*(Sent from my [\w .-]{1,40}|Sent from Outlook[\w .-]{0,30}|Get Outlook for (iOS|Android)[\w .<>:/-]{0,40})\s*$/i;
// Outlook (and some clients' HTML→text conversions) emit a header block,
// optionally bold-wrapped in asterisks: "*From:* ...".
const FROM_HEADER_RE = /^\s*\*?From:\*?\s/i;
const HEADER_BLOCK_FOLLOWER_RE = /^\s*\*?(Sent|Date|To|Cc|Subject):\*?\s/i;
const ON_LINE_START_RE = /^\s*On\s/;
const WROTE_LINE_END_RE = /wrote:\s*$/i;
const QUOTED_LINE_RE = /^\s*>/;

/**
 * Index of the first line that starts quoted history / signature, or
 * lines.length when the whole message is fresh content.
 */
function findCutIndex(lines: readonly string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    if (
      ORIGINAL_MESSAGE_RE.test(line) ||
      FORWARDED_MESSAGE_RE.test(line) ||
      UNDERSCORE_DIVIDER_RE.test(line) ||
      SIGNATURE_DELIMITER_RE.test(line) ||
      MOBILE_TRAILER_RE.test(line)
    ) {
      return i;
    }

    // "On <date>, <name> wrote:" — Apple Mail wraps long attribution
    // lines, so accept "wrote:" landing within the next two lines.
    if (ON_LINE_START_RE.test(line)) {
      for (let j = i; j <= Math.min(i + 2, lines.length - 1); j++) {
        const lookahead = lines[j];
        if (lookahead !== undefined && WROTE_LINE_END_RE.test(lookahead)) {
          return i;
        }
      }
    }

    // Outlook header block without a divider: "From: ..." followed
    // shortly by another header line ("Sent:", "To:", "Subject:", ...).
    if (FROM_HEADER_RE.test(line)) {
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const lookahead = lines[j];
        if (lookahead !== undefined && HEADER_BLOCK_FOLLOWER_RE.test(lookahead)) {
          return i;
        }
      }
    }
  }
  return lines.length;
}

// ─── Minimal HTML → text fallback ────────────────────────────────────────

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

/**
 * Crude HTML→text for replies that arrive without a text/plain part.
 * Blockquotes (Gmail wraps the entire quoted history in one) are removed
 * outright before tags are stripped.
 */
function htmlToText(html: string): string {
  let out = html.slice(0, MAX_SOURCE_LENGTH);
  out = out.replace(/<(style|script|head)[\s\S]*?<\/\1\s*>/gi, " ");
  // Remove blockquotes innermost-first so nesting unwinds fully.
  let previous: string;
  do {
    previous = out;
    out = out.replace(/<blockquote[^>]*>(?:(?!<blockquote)[\s\S])*?<\/blockquote\s*>/gi, " ");
  } while (out !== previous);
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(p|div|tr|li|h[1-6]|table)\s*>/gi, "\n");
  out = out.replace(/<[^>]+>/g, "");
  return decodeBasicEntities(out);
}

// ─── Public API ──────────────────────────────────────────────────────────

export interface ExtractReplyInput {
  text?: string | null;
  html?: string | null;
}

/**
 * Extract the freshly typed reply from an inbound email. Prefers the
 * text/plain part; falls back to a tag-stripped text/html part. Returns
 * "" when nothing remains after stripping (caller should ignore the
 * email). Output is trimmed and capped at BRIEF_MESSAGE_MAX_BODY_LENGTH.
 */
export function extractReplyText(input: ExtractReplyInput): string {
  const source =
    input.text && input.text.trim().length > 0
      ? input.text.slice(0, MAX_SOURCE_LENGTH)
      : input.html && input.html.trim().length > 0
        ? htmlToText(input.html)
        : "";
  if (!source) return "";

  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const cutIndex = findCutIndex(lines);
  const kept = lines.slice(0, cutIndex).filter((line) => !QUOTED_LINE_RE.test(line));

  const joined = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return joined.slice(0, BRIEF_MESSAGE_MAX_BODY_LENGTH).trim();
}

const ANGLE_ADDR_RE = /<([^<>\s]+@[^<>\s]+)>/;
const BARE_ADDR_RE = /([^\s"'<>,;]+@[^\s"'<>,;]+\.[A-Za-z0-9-]{2,})/;

/**
 * Pull the bare address out of an RFC 5322 from/to value — handles
 * `"Display Name" <user@host>` and bare `user@host` forms. Returns the
 * lowercased address, or null when nothing address-shaped is present.
 */
export function extractEmailAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  const angled = ANGLE_ADDR_RE.exec(value);
  const candidate = angled?.[1] ?? BARE_ADDR_RE.exec(value)?.[1] ?? null;
  return candidate ? candidate.toLowerCase() : null;
}
