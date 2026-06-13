/**
 * Shared display formatting for the Decision Kit UI. Pure, client-safe.
 */
import type { ResponseTimeStats } from "@/lib/advisor-response-time";

/** A quote/bid amount in cents → "$1,250" (or null → an em dash caller-side). */
export function formatAmount(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

/** Short response-speed chip text, or null when too few samples. */
export function responseSpeedLabel(stats: ResponseTimeStats | null): string | null {
  if (!stats || stats.median_hours == null || stats.sample_size < 3) return null;
  const h = stats.median_hours;
  if (h < 1) return "Within 1h";
  if (h < 4) return "Within 4h";
  if (h < 12) return "Within 12h";
  if (h < 24) return "Within a day";
  if (h < 48) return "Within 2 days";
  return "A few days";
}

/** "smsf_accountant" → "Smsf accountant" → nicer "SMSF accountant" where obvious. */
export function prettyType(type: string | null): string | null {
  if (!type) return null;
  const spaced = type.replace(/_/g, " ").trim();
  if (!spaced) return null;
  // Capitalise first letter, keep common acronyms upper.
  const out = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return out.replace(/\bsmsf\b/gi, "SMSF").replace(/\bafsl\b/gi, "AFSL");
}

/** True when the adviser advertises a remote meeting mode. */
export function offersRemote(meetingTypes: string[]): boolean {
  return meetingTypes.some((m) => {
    const k = m.toLowerCase();
    return k.includes("video") || k.includes("phone") || k.includes("remote") || k.includes("online");
  });
}
