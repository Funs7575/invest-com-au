/**
 * Pure, client-safe slot-generation from a weekly availability template.
 *
 * IMPORTANT: this module imports nothing from lib/supabase/* — it is safe to
 * value-import from "use client" components (the manage page client, the
 * booking widget). Keep it dependency-free.
 */

export interface WeeklyTemplateClientRow {
  dayOfWeek: number;
  /** "HH:MM" or "HH:MM:SS". */
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive?: boolean;
}

export interface GeneratedDay {
  /** "YYYY-MM-DD". */
  date: string;
  /** Short label e.g. "Fri, 12 Jun". */
  label: string;
  /** "HH:MM" candidate start times for that day. */
  times: string[];
}

function hmsToMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generate the next `days` of bookable days from a weekly template, starting
 * tomorrow. `takenByDate` removes already-booked "HH:MM" times. Deterministic
 * given `now` (defaults to current time).
 */
export function generateAvailableDays(
  template: WeeklyTemplateClientRow[],
  opts: {
    days?: number;
    takenByDate?: Record<string, string[]>;
    now?: Date;
  } = {},
): GeneratedDay[] {
  const days = opts.days ?? 14;
  const now = opts.now ?? new Date();
  const taken = opts.takenByDate ?? {};
  const out: GeneratedDay[] = [];

  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() + i * 86_400_000);
    const dow = d.getDay();
    const dayRows = template.filter(
      (r) => r.dayOfWeek === dow && r.isActive !== false,
    );
    if (dayRows.length === 0) continue;

    const date = toIsoDate(d);
    const takenTimes = new Set(
      (taken[date] ?? []).map((t) => t.slice(0, 5)),
    );

    const times: string[] = [];
    for (const row of dayRows) {
      const sm = hmsToMinutes(row.startTime);
      const em = hmsToMinutes(row.endTime);
      const dur = row.slotDurationMinutes || 30;
      if (sm === null || em === null || dur <= 0) continue;
      for (let m = sm; m + dur <= em; m += dur) {
        const hm = minutesToHm(m);
        if (!takenTimes.has(hm) && !times.includes(hm)) times.push(hm);
      }
    }
    if (times.length === 0) continue;
    times.sort();

    out.push({
      date,
      label: d.toLocaleDateString("en-AU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      times,
    });
  }
  return out;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Format an "HH:MM" 24h time to a friendly "h:MM AM/PM". */
export function formatTimeLabel(hm: string): string {
  const [h, m] = hm.split(":");
  const hour = Number(h);
  const display = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${display}:${m} ${suffix}`;
}
