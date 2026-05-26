/**
 * GET /api/market-events/ical
 *
 * Returns iCalendar (.ics) feed of all upcoming published market events.
 * Suitable for subscription by calendar apps (Apple Calendar, Google
 * Calendar, Outlook, etc.) via webcal:// or https:// URL.
 *
 * Covers events from today to 12 months out.
 * Content-Type: text/calendar; charset=UTF-8
 * Cached for 1 hour (events change infrequently).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";

interface MarketEvent {
  id: number;
  event_date: string;
  event_type: string;
  title: string;
  description: string;
  source_url: string;
  is_all_day: boolean;
  start_time: string | null;
  timezone: string;
}

function formatIcalDate(date: string): string {
  // YYYYMMDD for all-day events
  return date.replace(/-/g, "");
}

function formatIcalDateTime(date: string, time: string | null, tz: string): string {
  if (!time) return formatIcalDate(date);
  // YYYYMMDDTHHMMSS — local time form with TZID
  const [y, m, d] = date.split("-");
  const [h, min] = time.split(":");
  return `TZID=${tz}:${y}${m}${d}T${h}${min ?? "00"}00`;
}

function foldLine(line: string): string {
  // iCal lines must not exceed 75 octets; fold with CRLF + space
  const maxLen = 75;
  if (line.length <= maxLen) return line;
  let out = "";
  let remaining = line;
  while (remaining.length > maxLen) {
    out += remaining.slice(0, maxLen) + "\r\n ";
    remaining = remaining.slice(maxLen);
  }
  out += remaining;
  return out;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildVevent(ev: MarketEvent): string {
  const uid = `market-event-${ev.id}@invest.com.au`;
  const calUrl = `${SITE_URL}/calendar`;
  const lines: string[] = [
    "BEGIN:VEVENT",
    foldLine(`UID:${uid}`),
  ];

  if (ev.is_all_day || !ev.start_time) {
    // All-day event: DTSTART is a DATE, DTEND is the next day
    const nextDay = new Date(new Date(ev.event_date).getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    lines.push(`DTSTART;VALUE=DATE:${formatIcalDate(ev.event_date)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcalDate(nextDay)}`);
  } else {
    const dtStart = formatIcalDateTime(ev.event_date, ev.start_time, ev.timezone);
    lines.push(`DTSTART;${dtStart}`);
    // No explicit end — DURATION defaults to 1h
    lines.push("DURATION:PT1H");
  }

  lines.push(foldLine(`SUMMARY:${escapeText(ev.title)}`));

  if (ev.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
  }

  const url = ev.source_url || calUrl;
  lines.push(foldLine(`URL:${url}`));
  lines.push(`CATEGORIES:${ev.event_type.toUpperCase()}`);
  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

export async function GET() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const yearOut = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("market_events")
    .select("id, event_date, event_type, title, description, source_url, is_all_day, start_time, timezone")
    .eq("is_published", true)
    .gte("event_date", today)
    .lte("event_date", yearOut)
    .order("event_date", { ascending: true })
    .limit(500);

  if (error) {
    return new NextResponse("ERROR:fetch_failed\r\n", { status: 500 });
  }

  const events = (data ?? []) as MarketEvent[];

  const vevents = events.map(buildVevent).join("\r\n");

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Invest.com.au//Market Events Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Invest.com.au Market Events",
    "X-WR-CALDESC:Australian market events — RBA decisions\\, ASX rebalances\\, economic data",
    "X-WR-TIMEZONE:Australia/Sydney",
    vevents,
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=UTF-8",
      "Content-Disposition": 'attachment; filename="invest-market-events.ics"',
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
