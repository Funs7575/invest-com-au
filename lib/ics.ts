/**
 * lib/ics.ts — dependency-free iCalendar (RFC 5545) builder.
 *
 * Produces VCALENDAR/VEVENT payloads for booking confirmations and
 * cancellations. We deliberately do NOT pull a library (ics, ical-generator,
 * etc.) — the surface we need is small, the escaping/folding rules are well
 * specified, and a hand-rolled builder keeps the bundle lean and auditable.
 *
 * What it covers:
 *   - VCALENDAR with VERSION:2.0, PRODID, METHOD (REQUEST | CANCEL).
 *   - One VEVENT with UID, DTSTAMP, DTSTART/DTEND (UTC `Z` form OR a
 *     floating local time qualified with `;TZID=Area/City`), SUMMARY,
 *     DESCRIPTION, LOCATION, URL, ORGANIZER, ATTENDEE, STATUS, SEQUENCE.
 *   - RFC 5545 §3.3.11 TEXT escaping (backslash, comma, semicolon, newline).
 *   - RFC 5545 §3.1 content-line folding at 75 *octets* (UTF-8 aware), with
 *     CRLF + single-space continuation.
 *
 * Time handling: callers pass either a UTC instant (we emit `...Z`) or a
 * local wall-clock datetime plus an IANA `tzid` (we emit a TZID-qualified
 * DATE-TIME with no trailing `Z`). We do NOT emit a VTIMEZONE component —
 * every modern calendar client resolves a bare IANA TZID against its own
 * tz database, and bundling VTIMEZONE rules we'd have to keep current is a
 * maintenance trap. This matches how Google/Microsoft invites in the wild
 * behave for well-known zones like Australia/Sydney.
 */

export type IcsMethod = "REQUEST" | "CANCEL";

/** RFC 5545 VEVENT STATUS values we use. */
export type IcsEventStatus = "CONFIRMED" | "CANCELLED" | "TENTATIVE";

export interface IcsAttendee {
  /** Bare email — we prefix `mailto:` ourselves. */
  email: string;
  /** Optional display name → CN= parameter. */
  name?: string;
  /** Participation status. Defaults vary by role; we leave it unset unless given. */
  partstat?: "NEEDS-ACTION" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  /** RSVP flag → RSVP=TRUE/FALSE parameter. */
  rsvp?: boolean;
}

export interface IcsOrganizer {
  email: string;
  name?: string;
}

export interface IcsEventInput {
  /**
   * Stable, globally-unique identifier for this event. MUST be identical
   * across the REQUEST and any later CANCEL for the same booking, or clients
   * treat the cancel as referring to a different event and ignore it.
   */
  uid: string;
  /**
   * Event start. Either:
   *   - { utc: Date } / { utc: ISOstring }   → emitted as `YYYYMMDDTHHMMSSZ`
   *   - { local: "YYYY-MM-DDTHH:mm[:ss]", tzid: "Australia/Sydney" }
   *     → emitted as `YYYYMMDDTHHMMSS` with `;TZID=Australia/Sydney`.
   */
  start: IcsDateTime;
  /** Event end. Same shape options as `start`. */
  end: IcsDateTime;
  /** Generation timestamp. Defaults to now. Always emitted in UTC. */
  dtstamp?: Date;
  summary: string;
  description?: string;
  location?: string;
  /** Absolute URL (e.g. the booking management page). */
  url?: string;
  organizer?: IcsOrganizer;
  attendees?: IcsAttendee[];
  status?: IcsEventStatus;
  /**
   * Revision number. RFC 5545: increment on every update/cancel so clients
   * apply the latest. A fresh booking is 0; a cancel/reschedule is ≥1.
   */
  sequence?: number;
}

export type IcsDateTime =
  | { utc: Date | string }
  | { local: string; tzid: string };

export interface BuildCalendarOptions {
  method: IcsMethod;
  event: IcsEventInput;
  /** Override the default PRODID. */
  prodId?: string;
}

const DEFAULT_PRODID = "-//Invest.com.au//Booking//EN";

// ── TEXT escaping (RFC 5545 §3.3.11) ──────────────────────────────────────
//
// Within a TEXT value, backslash, comma, and semicolon are escaped with a
// leading backslash, and newlines become the literal two-character sequence
// `\n`. Order matters: escape backslashes FIRST so we don't double-escape the
// backslashes we introduce for the others.
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\n");
}

// ── DATE-TIME formatting ──────────────────────────────────────────────────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a Date as a UTC iCal DATE-TIME: `YYYYMMDDTHHMMSSZ`. */
export function formatUtc(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("ics: invalid Date passed to formatUtc");
  }
  const y = date.getUTCFullYear();
  const mo = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  const h = pad2(date.getUTCHours());
  const mi = pad2(date.getUTCMinutes());
  const s = pad2(date.getUTCSeconds());
  return `${y}${mo}${d}T${h}${mi}${s}Z`;
}

/**
 * Format a floating local wall-clock string (`YYYY-MM-DDTHH:mm[:ss]`) into the
 * iCal basic form `YYYYMMDDTHHMMSS` (no zone suffix — the TZID parameter on the
 * property carries the zone). Tolerates a trailing `Z` or offset by stripping
 * it: the caller asserted this is local wall-clock for the given tzid.
 */
export function formatLocal(local: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(
    local,
  );
  if (!m) {
    throw new Error(`ics: invalid local datetime "${local}"`);
  }
  const [, y, mo, d, h, mi, s] = m;
  return `${y}${mo}${d}T${h}${mi}${s ?? "00"}`;
}

/**
 * Render a DATE-TIME property line content (without folding): returns the
 * property name with any TZID parameter, and the value. e.g.
 *   { name: "DTSTART;TZID=Australia/Sydney", value: "20260612T140000" }
 *   { name: "DTSTART", value: "20260612T040000Z" }
 */
function renderDateTimeProp(
  propName: string,
  dt: IcsDateTime,
): { name: string; value: string } {
  if ("utc" in dt) {
    const date = typeof dt.utc === "string" ? new Date(dt.utc) : dt.utc;
    return { name: propName, value: formatUtc(date) };
  }
  if (!dt.tzid || dt.tzid.trim() === "") {
    throw new Error("ics: local datetime requires a non-empty tzid");
  }
  return { name: `${propName};TZID=${dt.tzid}`, value: formatLocal(dt.local) };
}

// ── Parameter-value escaping for CN etc. ──────────────────────────────────
//
// Param values containing a colon, semicolon, or comma must be double-quoted
// (RFC 5545 §3.2). Display names with quotes are stripped of the quote char
// (a quoted-string can't itself contain a double quote in iCal).
function paramValue(value: string): string {
  const cleaned = value.replace(/"/g, "");
  if (/[:;,]/.test(cleaned)) return `"${cleaned}"`;
  return cleaned;
}

// ── Line folding (RFC 5545 §3.1) ──────────────────────────────────────────
//
// Lines longer than 75 octets MUST be folded: split into ≤75-octet chunks and
// join with CRLF + a single leading space (the space is stripped on unfold).
// We count OCTETS, not characters, so multibyte UTF-8 never splits mid-codepoint.
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  // First chunk: 75 octets. Continuation chunks: 74 octets (1 reserved for the
  // leading space that the folding inserts).
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Don't split a multibyte sequence: back off `end` while it points at a
    // UTF-8 continuation byte (0b10xxxxxx).
    while (end < bytes.length && (bytes[end]! & 0xc0) === 0x80) {
      end--;
    }
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74;
  }
  return parts.join("\r\n ");
}

/** Build a folded property line from an already-rendered `NAME:VALUE` string. */
function line(raw: string): string {
  return foldLine(raw);
}

// ── Calendar assembly ─────────────────────────────────────────────────────

/**
 * Build a complete iCalendar string for one event.
 *
 * Output uses CRLF line endings throughout (RFC 5545 §3.1) and ends with a
 * trailing CRLF, which is what Resend/Gmail/Outlook expect for a `text/calendar`
 * attachment.
 */
export function buildCalendar(opts: BuildCalendarOptions): string {
  const { method, event } = opts;
  const prodId = opts.prodId ?? DEFAULT_PRODID;

  if (!event.uid || event.uid.trim() === "") {
    throw new Error("ics: event.uid is required");
  }

  const dtstamp = event.dtstamp ?? new Date();
  const dtStart = renderDateTimeProp("DTSTART", event.start);
  const dtEnd = renderDateTimeProp("DTEND", event.end);

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(line(`PRODID:${prodId}`));
  lines.push("CALSCALE:GREGORIAN");
  lines.push(`METHOD:${method}`);
  lines.push("BEGIN:VEVENT");
  lines.push(line(`UID:${event.uid}`));
  lines.push(line(`DTSTAMP:${formatUtc(dtstamp)}`));
  lines.push(line(`${dtStart.name}:${dtStart.value}`));
  lines.push(line(`${dtEnd.name}:${dtEnd.value}`));
  lines.push(line(`SUMMARY:${escapeText(event.summary)}`));

  if (event.description !== undefined && event.description !== "") {
    lines.push(line(`DESCRIPTION:${escapeText(event.description)}`));
  }
  if (event.location !== undefined && event.location !== "") {
    lines.push(line(`LOCATION:${escapeText(event.location)}`));
  }
  if (event.url !== undefined && event.url !== "") {
    // URI values are not TEXT-escaped (no backslash escaping); fold only.
    lines.push(line(`URL:${event.url}`));
  }

  if (event.organizer) {
    const cn = event.organizer.name
      ? `;CN=${paramValue(event.organizer.name)}`
      : "";
    lines.push(line(`ORGANIZER${cn}:mailto:${event.organizer.email}`));
  }

  for (const att of event.attendees ?? []) {
    const params: string[] = [];
    if (att.name) params.push(`CN=${paramValue(att.name)}`);
    if (att.rsvp !== undefined) params.push(`RSVP=${att.rsvp ? "TRUE" : "FALSE"}`);
    if (att.partstat) params.push(`PARTSTAT=${att.partstat}`);
    const paramStr = params.length > 0 ? `;${params.join(";")}` : "";
    lines.push(line(`ATTENDEE${paramStr}:mailto:${att.email}`));
  }

  // STATUS defaults: a CANCEL method implies a CANCELLED event; a REQUEST
  // implies CONFIRMED, unless the caller overrode it.
  const status: IcsEventStatus =
    event.status ?? (method === "CANCEL" ? "CANCELLED" : "CONFIRMED");
  lines.push(`STATUS:${status}`);

  const sequence = event.sequence ?? (method === "CANCEL" ? 1 : 0);
  lines.push(`SEQUENCE:${sequence}`);

  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  // CRLF join + trailing CRLF.
  return lines.join("\r\n") + "\r\n";
}

/**
 * Convenience: base64-encode a calendar string for use as a Resend attachment
 * `content` field (Resend expects base64 for binary/text attachments).
 */
export function toBase64(ical: string): string {
  return Buffer.from(ical, "utf8").toString("base64");
}

/**
 * Build a ready-to-attach ICS object for the Resend `attachments` array.
 * `text/calendar; method=...` is the conventional content-type; most clients
 * key off the filename + the METHOD inside the payload regardless.
 */
export function buildIcsAttachment(
  opts: BuildCalendarOptions & { filename?: string },
): { filename: string; content: string; contentType: string } {
  const ical = buildCalendar(opts);
  return {
    filename: opts.filename ?? "invite.ics",
    content: toBase64(ical),
    contentType: `text/calendar; method=${opts.method}; charset=utf-8`,
  };
}
