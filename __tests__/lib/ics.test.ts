import { describe, it, expect } from "vitest";
import {
  buildCalendar,
  buildIcsAttachment,
  escapeText,
  foldLine,
  formatLocal,
  formatUtc,
  toBase64,
} from "@/lib/ics";

// Helper: unfold a folded iCal string back to logical lines (reverse of
// RFC 5545 §3.1 folding) so assertions can target property values directly.
function unfold(ical: string): string[] {
  return ical.replace(/\r\n[ \t]/g, "").split("\r\n").filter(Boolean);
}

describe("escapeText (RFC 5545 §3.3.11)", () => {
  it("escapes backslash, comma, and semicolon", () => {
    expect(escapeText("a,b;c\\d")).toBe("a\\,b\\;c\\\\d");
  });

  it("escapes backslashes before introducing new ones (no double-escape)", () => {
    // A single comma must become exactly `\,` — not `\\,`.
    expect(escapeText("x,y")).toBe("x\\,y");
    // A literal backslash becomes `\\`.
    expect(escapeText("c:\\path")).toBe("c:\\\\path");
  });

  it("converts newlines (LF, CRLF, CR) to the literal \\n sequence", () => {
    expect(escapeText("line1\nline2")).toBe("line1\\nline2");
    expect(escapeText("line1\r\nline2")).toBe("line1\\nline2");
    expect(escapeText("line1\rline2")).toBe("line1\\nline2");
  });

  it("leaves colon unescaped (only valid to escape \\ , ; and newlines)", () => {
    expect(escapeText("9:00am")).toBe("9:00am");
  });
});

describe("formatUtc", () => {
  it("formats a UTC instant as YYYYMMDDTHHMMSSZ", () => {
    const d = new Date(Date.UTC(2026, 5, 12, 4, 5, 9)); // 2026-06-12T04:05:09Z
    expect(formatUtc(d)).toBe("20260612T040509Z");
  });

  it("zero-pads single-digit month/day/time components", () => {
    const d = new Date(Date.UTC(2026, 0, 3, 1, 2, 3));
    expect(formatUtc(d)).toBe("20260103T010203Z");
  });

  it("throws on an invalid Date", () => {
    expect(() => formatUtc(new Date("not-a-date"))).toThrow(/invalid Date/);
  });
});

describe("formatLocal", () => {
  it("converts an ISO-ish local wall-clock string to basic form, no Z", () => {
    expect(formatLocal("2026-06-12T14:00:00")).toBe("20260612T140000");
  });

  it("defaults seconds to 00 when omitted", () => {
    expect(formatLocal("2026-06-12T14:30")).toBe("20260612T143000");
  });

  it("tolerates a space separator and a trailing Z (treated as local)", () => {
    expect(formatLocal("2026-06-12 09:15:00Z")).toBe("20260612T091500");
  });

  it("throws on an unparseable string", () => {
    expect(() => formatLocal("12/06/2026 2pm")).toThrow(/invalid local/);
  });
});

describe("foldLine (RFC 5545 §3.1 — fold at 75 octets)", () => {
  it("does not fold a line of 75 octets or fewer", () => {
    const s = "A".repeat(75);
    expect(foldLine(s)).toBe(s);
    expect(foldLine(s)).not.toContain("\r\n");
  });

  it("folds a long line and every physical line is <= 75 octets", () => {
    const s = "B".repeat(200);
    const folded = foldLine(s);
    expect(folded).toContain("\r\n ");
    for (const physical of folded.split("\r\n")) {
      // Continuation lines begin with a space; that space counts toward 75.
      expect(Buffer.byteLength(physical, "utf8")).toBeLessThanOrEqual(75);
    }
  });

  it("round-trips: unfolding a folded line restores the original", () => {
    const s = "C".repeat(321);
    const folded = foldLine(s);
    const unfolded = folded.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toBe(s);
  });

  it("never splits a multibyte UTF-8 codepoint across a fold boundary", () => {
    // 'é' is 2 octets in UTF-8; a run that crosses the 75-octet line.
    const s = "é".repeat(80); // 160 octets
    const folded = foldLine(s);
    // The reconstructed string must be byte-identical and contain no U+FFFD.
    const unfolded = folded.replace(/\r\n[ \t]/g, "");
    expect(unfolded).toBe(s);
    expect(unfolded).not.toContain("�");
    for (const physical of folded.split("\r\n")) {
      expect(Buffer.byteLength(physical, "utf8")).toBeLessThanOrEqual(75);
    }
  });
});

describe("buildCalendar — structure & REQUEST method", () => {
  const base = {
    method: "REQUEST" as const,
    event: {
      uid: "booking-123@invest.com.au",
      start: { utc: new Date(Date.UTC(2026, 5, 12, 4, 0, 0)) },
      end: { utc: new Date(Date.UTC(2026, 5, 12, 4, 30, 0)) },
      dtstamp: new Date(Date.UTC(2026, 5, 1, 0, 0, 0)),
      summary: "Consultation with Jane Adviser",
    },
  };

  it("wraps a single VEVENT in VCALENDAR with required props", () => {
    const ical = buildCalendar(base);
    const lines = unfold(ical);
    expect(lines).toContain("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("METHOD:REQUEST");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("UID:booking-123@invest.com.au");
    expect(lines).toContain("DTSTAMP:20260601T000000Z");
    expect(lines).toContain("END:VEVENT");
    expect(lines).toContain("END:VCALENDAR");
  });

  it("uses CRLF line endings and a trailing CRLF", () => {
    const ical = buildCalendar(base);
    expect(ical.endsWith("\r\n")).toBe(true);
    expect(ical).toContain("\r\n");
    // No bare LF that isn't preceded by CR.
    expect(/[^\r]\n/.test(ical)).toBe(false);
  });

  it("emits UTC DTSTART/DTEND with a trailing Z when given utc instants", () => {
    const lines = unfold(buildCalendar(base));
    expect(lines).toContain("DTSTART:20260612T040000Z");
    expect(lines).toContain("DTEND:20260612T043000Z");
  });

  it("defaults STATUS=CONFIRMED and SEQUENCE=0 for a REQUEST", () => {
    const lines = unfold(buildCalendar(base));
    expect(lines).toContain("STATUS:CONFIRMED");
    expect(lines).toContain("SEQUENCE:0");
  });

  it("escapes TEXT in SUMMARY/DESCRIPTION/LOCATION", () => {
    const ical = buildCalendar({
      ...base,
      event: {
        ...base.event,
        summary: "Call: SMSF, super; tax",
        description: "Bring docs\nand a list, please",
        location: "Phone; we will call you",
      },
    });
    const lines = unfold(ical);
    expect(lines).toContain("SUMMARY:Call: SMSF\\, super\\; tax");
    expect(lines).toContain("DESCRIPTION:Bring docs\\nand a list\\, please");
    expect(lines).toContain("LOCATION:Phone\\; we will call you");
  });

  it("omits optional props when empty", () => {
    const ical = buildCalendar(base);
    expect(ical).not.toContain("DESCRIPTION:");
    expect(ical).not.toContain("LOCATION:");
    expect(ical).not.toContain("URL:");
    expect(ical).not.toContain("ORGANIZER");
    expect(ical).not.toContain("ATTENDEE");
  });

  it("renders ORGANIZER and ATTENDEE with mailto: and CN params", () => {
    const ical = buildCalendar({
      ...base,
      event: {
        ...base.event,
        organizer: { email: "adviser@firm.com", name: "Jane Adviser" },
        attendees: [
          { email: "client@example.com", name: "Bob Client", rsvp: true, partstat: "NEEDS-ACTION" },
        ],
      },
    });
    const lines = unfold(ical);
    expect(lines).toContain("ORGANIZER;CN=Jane Adviser:mailto:adviser@firm.com");
    expect(lines).toContain(
      "ATTENDEE;CN=Bob Client;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:client@example.com",
    );
  });

  it("double-quotes a CN containing a comma", () => {
    const ical = buildCalendar({
      ...base,
      event: {
        ...base.event,
        organizer: { email: "a@b.com", name: "Adviser, CFP" },
      },
    });
    expect(unfold(ical)).toContain('ORGANIZER;CN="Adviser, CFP":mailto:a@b.com');
  });

  it("does not TEXT-escape the URL value", () => {
    const ical = buildCalendar({
      ...base,
      event: { ...base.event, url: "https://invest.com.au/booking/abc?x=1,2" },
    });
    // The comma in a query string must survive (URL is URI, not TEXT).
    expect(unfold(ical)).toContain("URL:https://invest.com.au/booking/abc?x=1,2");
  });

  it("throws when uid is missing/empty", () => {
    expect(() =>
      buildCalendar({ ...base, event: { ...base.event, uid: "" } }),
    ).toThrow(/uid is required/);
  });
});

describe("buildCalendar — TZID (floating local) form", () => {
  it("emits DTSTART;TZID=... with no trailing Z", () => {
    const ical = buildCalendar({
      method: "REQUEST",
      event: {
        uid: "b@invest.com.au",
        start: { local: "2026-06-12T14:00:00", tzid: "Australia/Sydney" },
        end: { local: "2026-06-12T14:30:00", tzid: "Australia/Sydney" },
        dtstamp: new Date(Date.UTC(2026, 5, 1)),
        summary: "Meeting",
      },
    });
    const lines = unfold(ical);
    expect(lines).toContain("DTSTART;TZID=Australia/Sydney:20260612T140000");
    expect(lines).toContain("DTEND;TZID=Australia/Sydney:20260612T143000");
    // No Z suffix on the TZID-qualified values.
    expect(ical).not.toContain("T140000Z");
  });

  it("throws when a local datetime is given without a tzid", () => {
    expect(() =>
      buildCalendar({
        method: "REQUEST",
        event: {
          uid: "b@invest.com.au",
          // Empty tzid is a runtime-invalid value the builder must reject.
          start: { local: "2026-06-12T14:00:00", tzid: "" },
          end: { local: "2026-06-12T14:30:00", tzid: "" },
          summary: "Meeting",
        },
      }),
    ).toThrow(/tzid/);
  });
});

describe("buildCalendar — CANCEL method", () => {
  it("emits METHOD:CANCEL, STATUS:CANCELLED, SEQUENCE>=1 by default", () => {
    const ical = buildCalendar({
      method: "CANCEL",
      event: {
        uid: "booking-123@invest.com.au",
        start: { utc: new Date(Date.UTC(2026, 5, 12, 4, 0, 0)) },
        end: { utc: new Date(Date.UTC(2026, 5, 12, 4, 30, 0)) },
        summary: "Consultation with Jane Adviser",
      },
    });
    const lines = unfold(ical);
    expect(lines).toContain("METHOD:CANCEL");
    expect(lines).toContain("STATUS:CANCELLED");
    expect(lines).toContain("SEQUENCE:1");
  });

  it("reuses the SAME uid as the original request (so clients match it)", () => {
    const uid = "booking-xyz@invest.com.au";
    const req = buildCalendar({
      method: "REQUEST",
      event: {
        uid,
        start: { utc: new Date(Date.UTC(2026, 5, 12, 4, 0)) },
        end: { utc: new Date(Date.UTC(2026, 5, 12, 4, 30)) },
        summary: "X",
      },
    });
    const cancel = buildCalendar({
      method: "CANCEL",
      event: {
        uid,
        start: { utc: new Date(Date.UTC(2026, 5, 12, 4, 0)) },
        end: { utc: new Date(Date.UTC(2026, 5, 12, 4, 30)) },
        summary: "X",
        sequence: 2,
      },
    });
    expect(req).toContain(`UID:${uid}`);
    expect(cancel).toContain(`UID:${uid}`);
    expect(cancel).toContain("SEQUENCE:2");
  });

  it("honours an explicit status/sequence override", () => {
    const ical = buildCalendar({
      method: "REQUEST",
      event: {
        uid: "b@invest.com.au",
        start: { utc: new Date(Date.UTC(2026, 5, 12, 4, 0)) },
        end: { utc: new Date(Date.UTC(2026, 5, 12, 4, 30)) },
        summary: "X",
        status: "TENTATIVE",
        sequence: 5,
      },
    });
    const lines = unfold(ical);
    expect(lines).toContain("STATUS:TENTATIVE");
    expect(lines).toContain("SEQUENCE:5");
  });
});

describe("toBase64 / buildIcsAttachment", () => {
  it("base64-encodes the calendar and round-trips", () => {
    const ical = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";
    const b64 = toBase64(ical);
    expect(Buffer.from(b64, "base64").toString("utf8")).toBe(ical);
  });

  it("buildIcsAttachment returns filename, base64 content, and a calendar content-type", () => {
    const att = buildIcsAttachment({
      method: "REQUEST",
      filename: "booking.ics",
      event: {
        uid: "b@invest.com.au",
        start: { utc: new Date(Date.UTC(2026, 5, 12, 4, 0)) },
        end: { utc: new Date(Date.UTC(2026, 5, 12, 4, 30)) },
        summary: "Consultation",
      },
    });
    expect(att.filename).toBe("booking.ics");
    expect(att.contentType).toContain("text/calendar");
    expect(att.contentType).toContain("method=REQUEST");
    const decoded = Buffer.from(att.content, "base64").toString("utf8");
    expect(decoded).toContain("BEGIN:VCALENDAR");
    expect(decoded).toContain("UID:b@invest.com.au");
  });

  it("defaults the attachment filename to invite.ics", () => {
    const att = buildIcsAttachment({
      method: "CANCEL",
      event: {
        uid: "b@invest.com.au",
        start: { utc: new Date(Date.UTC(2026, 5, 12, 4, 0)) },
        end: { utc: new Date(Date.UTC(2026, 5, 12, 4, 30)) },
        summary: "Consultation",
      },
    });
    expect(att.filename).toBe("invite.ics");
    expect(att.contentType).toContain("method=CANCEL");
  });
});
