"use client";

import { useMemo, useState, useTransition } from "react";

import type { AvailabilitySlot } from "@/lib/consultations";

interface Props {
  initialSlots: AvailabilitySlot[];
}

type Duration = 30 | 60;

export default function AvailabilityClient({ initialSlots }: Props) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(initialSlots);
  const [startAt, setStartAt] = useState<string>("");
  const [duration, setDuration] = useState<Duration>(30);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: AvailabilitySlot[] = [];
    const ps: AvailabilitySlot[] = [];
    for (const s of slots) {
      if (new Date(s.start_at).getTime() >= now) up.push(s);
      else ps.push(s);
    }
    up.sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    ps.sort(
      (a, b) =>
        new Date(b.start_at).getTime() - new Date(a.start_at).getTime(),
    );
    return { upcoming: up, past: ps };
  }, [slots]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startAt) {
      setError("Pick a start time.");
      return;
    }
    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) {
      setError("Invalid start time.");
      return;
    }
    const end = new Date(start.getTime() + duration * 60 * 1000);

    startTransition(async () => {
      try {
        const res = await fetch("/api/pros/availability", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            start_at: start.toISOString(),
            end_at: end.toISOString(),
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          slot?: AvailabilitySlot;
          error?: string;
        };
        if (!res.ok || !body.slot) {
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setSlots((prev) => [...prev, body.slot!]);
        setStartAt("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add slot.");
      }
    });
  }

  function handleDelete(slotId: number) {
    if (!window.confirm("Remove this slot?")) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/pros/availability/${slotId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove slot.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Add slot form */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
      >
        <h2 className="text-sm font-bold text-slate-900">Add a slot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-600 font-semibold">
              Start (your local time)
            </span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-600 font-semibold">
              Duration
            </span>
            <select
              value={duration}
              onChange={(e) =>
                setDuration(Number(e.target.value) === 60 ? 60 : 30)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>
        </div>

        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add slot"}
        </button>
      </form>

      {/* Upcoming */}
      <section>
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">
            No upcoming slots yet. Add one above so accepted clients can book.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatRange(s.start_at, s.end_at)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status:{" "}
                    <span
                      className={
                        s.status === "booked"
                          ? "text-amber-600 font-semibold"
                          : s.status === "cancelled"
                            ? "text-slate-400"
                            : "text-emerald-600 font-semibold"
                      }
                    >
                      {s.status}
                    </span>
                  </p>
                </div>
                {s.status === "open" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id)}
                    disabled={pending}
                    className="text-xs text-slate-500 hover:text-rose-600 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-900 mb-3">Past</h2>
          <ul className="space-y-2">
            {past.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 p-3"
              >
                <p className="text-sm text-slate-600">
                  {formatRange(s.start_at, s.end_at)}
                </p>
                <span className="text-xs text-slate-400">{s.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function formatRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const startStr = start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endStr = end.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${startStr} → ${endStr}`;
}
