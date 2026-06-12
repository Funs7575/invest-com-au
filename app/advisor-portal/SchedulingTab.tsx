"use client";

import { useEffect, useState } from "react";
import type { Advisor } from "./types";

interface TemplateRow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

const DAYS = [
  { idx: 1, label: "Monday" },
  { idx: 2, label: "Tuesday" },
  { idx: 3, label: "Wednesday" },
  { idx: 4, label: "Thursday" },
  { idx: 5, label: "Friday" },
  { idx: 6, label: "Saturday" },
  { idx: 0, label: "Sunday" },
];

const DURATIONS = [15, 30, 45, 60];

/** "HH:MM:SS" | "HH:MM" → "HH:MM" for <input type=time>. */
function toInputTime(t: string): string {
  return t.slice(0, 5);
}

type Status = "loading" | "disabled" | "ready" | "saving" | "saved" | "error";

export default function SchedulingTab({ advisor }: { advisor: Advisor | null }) {
  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/advisor-portal/availability", {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          enabled?: boolean;
          rows?: TemplateRow[];
        };
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        if (!json.enabled) {
          setStatus("disabled");
          return;
        }
        setRows(
          (json.rows ?? []).map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: toInputTime(r.startTime),
            endTime: toInputTime(r.endTime),
            slotDurationMinutes: r.slotDurationMinutes,
            isActive: r.isActive,
          })),
        );
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addRow = (dayOfWeek: number) => {
    setRows((prev) => [
      ...prev,
      {
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        slotDurationMinutes: 30,
        isActive: true,
      },
    ]);
  };

  const updateRow = (i: number, patch: Partial<TemplateRow>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const removeRow = (i: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    setStatus("saving");
    setError(null);
    // Client-side guard: end after start.
    for (const r of rows) {
      if (r.endTime <= r.startTime) {
        setError(`A window on ${dayLabel(r.dayOfWeek)} ends before it starts.`);
        setStatus("ready");
        return;
      }
    }
    try {
      const res = await fetch("/api/advisor-portal/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Could not save availability.");
        setStatus("ready");
        return;
      }
      setStatus("saved");
      setTimeout(() => setStatus("ready"), 2500);
    } catch {
      setError("Network error. Please try again.");
      setStatus("ready");
    }
  };

  if (status === "loading") {
    return <p className="text-sm text-slate-500 p-4">Loading availability…</p>;
  }

  if (status === "disabled") {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Scheduling</h2>
        <p className="text-sm text-slate-600">
          First-party scheduling isn&apos;t enabled for your account yet. You can
          still share an external booking link from your Profile tab.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6 max-w-2xl">
        <p className="text-sm text-red-700">
          Couldn&apos;t load your availability. Please refresh and try again.
        </p>
      </div>
    );
  }

  const byDay = DAYS.map((d) => ({
    ...d,
    rows: rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.dayOfWeek === d.idx),
  }));

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Weekly availability</h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Set the windows you&apos;re open for consultations. Clients pick a
          specific time inside these windows on your public profile. Saving with
          no active windows turns your booking calendar off.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {byDay.map((day) => (
          <div key={day.idx} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">{day.label}</h3>
              <button
                type="button"
                onClick={() => addRow(day.idx)}
                className="text-xs font-semibold text-violet-700 hover:text-violet-900"
              >
                + Add window
              </button>
            </div>
            {day.rows.length === 0 ? (
              <p className="text-xs text-slate-400">No availability.</p>
            ) : (
              <div className="space-y-2">
                {day.rows.map(({ r, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`start-${i}`}>
                      Start time
                    </label>
                    <input
                      id={`start-${i}`}
                      type="time"
                      value={r.startTime}
                      onChange={(e) => updateRow(i, { startTime: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <label className="sr-only" htmlFor={`end-${i}`}>
                      End time
                    </label>
                    <input
                      id={`end-${i}`}
                      type="time"
                      value={r.endTime}
                      onChange={(e) => updateRow(i, { endTime: e.target.value })}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                    />
                    <label className="sr-only" htmlFor={`dur-${i}`}>
                      Slot length
                    </label>
                    <select
                      id={`dur-${i}`}
                      value={r.slotDurationMinutes}
                      onChange={(e) =>
                        updateRow(i, { slotDurationMinutes: Number(e.target.value) })
                      }
                      className="rounded-lg border border-slate-300 px-1.5 py-1.5 text-xs"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}m slots
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={r.isActive}
                        onChange={(e) => updateRow(i, { isActive: e.target.checked })}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      aria-label="Remove window"
                      className="text-slate-400 hover:text-red-600 text-sm ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={status === "saving"}
          className="rounded-xl bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-slate-800 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save availability"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-emerald-700 font-semibold">Saved ✓</span>
        )}
        {advisor?.slug && (
          <a
            href={`/advisor/${advisor.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Preview your profile ↗
          </a>
        )}
      </div>

      <RecentBookings />
    </div>
  );
}

interface BookingRow {
  id: number;
  investor_name: string;
  investor_email: string;
  booking_date: string;
  booking_time: string;
  starts_at_utc: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  topic: string | null;
  booking_tz: string | null;
}

function RecentBookings() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/advisor-portal/bookings", { cache: "no-store" });
        const json = (await res.json()) as { bookings?: BookingRow[] };
        if (!cancelled && res.ok) setBookings(json.bookings ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mark = async (id: number, outcome: "completed" | "no_show") => {
    setBusyId(id);
    try {
      const res = await fetch("/api/advisor-portal/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, outcome }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: outcome } : b)),
        );
      }
    } catch {
      /* ignore */
    } finally {
      setBusyId(null);
    }
  };

  if (!loaded || bookings.length === 0) return null;

  const fmt = (b: BookingRow): string => {
    const tz = b.booking_tz ?? "Australia/Sydney";
    const instant = b.starts_at_utc ? new Date(b.starts_at_utc) : null;
    if (!instant) return `${b.booking_date} ${b.booking_time.slice(0, 5)}`;
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: tz,
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(instant);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-bold text-slate-900 mb-3">Recent bookings</h3>
      <div className="space-y-2">
        {bookings.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center gap-2 border border-slate-100 rounded-lg px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {b.investor_name}
              </p>
              <p className="text-xs text-slate-500">{fmt(b)}</p>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                b.status === "confirmed"
                  ? "bg-blue-50 text-blue-700"
                  : b.status === "completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : b.status === "no_show"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500"
              }`}
            >
              {b.status.replace("_", " ")}
            </span>
            {b.status === "confirmed" && (
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={busyId === b.id}
                  onClick={() => void mark(b.id, "completed")}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded disabled:opacity-50"
                >
                  Completed
                </button>
                <button
                  type="button"
                  disabled={busyId === b.id}
                  onClick={() => void mark(b.id, "no_show")}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 px-2 py-1 rounded disabled:opacity-50"
                >
                  No-show
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function dayLabel(idx: number): string {
  return DAYS.find((d) => d.idx === idx)?.label ?? "that day";
}
