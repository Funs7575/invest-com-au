"use client";

import { useMemo, useState } from "react";
import {
  generateAvailableDays,
  formatTimeLabel,
  type WeeklyTemplateClientRow,
} from "@/lib/booking-v2/slots";

type Mode = "view" | "reschedule" | "done-cancelled" | "done-rescheduled";

interface Props {
  token: string;
  advisorName: string;
  /** Human-friendly current booking time. */
  when: string;
  timeZone: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  template: WeeklyTemplateClientRow[];
}

export default function ManageBookingClient({
  token,
  advisorName,
  when,
  timeZone,
  status,
  template,
}: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [newWhen, setNewWhen] = useState("");

  const days = useMemo(() => generateAvailableDays(template), [template]);
  const timesForDay = useMemo(
    () => days.find((d) => d.date === selectedDate)?.times ?? [],
    [days, selectedDate],
  );

  const alreadyClosed = status === "cancelled" || status === "completed";

  async function doCancel() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "consumer_cancelled" }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Could not cancel.");
      }
      setMode("done-cancelled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setBusy(false);
    }
  }

  async function doReschedule() {
    if (busy || !selectedDate || !selectedTime) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, time: selectedTime }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        rescheduleToken?: string;
      };
      if (!res.ok) {
        throw new Error(friendlyError(d.error));
      }
      setNewWhen(`${selectedDate} at ${formatTimeLabel(selectedTime)}`);
      setMode("done-rescheduled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reschedule.");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "done-cancelled") {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Booking cancelled</h2>
        <p className="text-sm text-slate-600">
          Your consultation with {advisorName} has been cancelled. A confirmation
          and updated calendar invite have been emailed to you.
        </p>
      </div>
    );
  }

  if (mode === "done-rescheduled") {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-bold text-emerald-900 mb-1">Booking moved</h2>
        <p className="text-sm text-emerald-800">
          Your consultation with {advisorName} is now on{" "}
          <strong>{newWhen}</strong>. Check your email for the new calendar invite
          and management link.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
          Currently booked
        </p>
        <p className="text-base font-bold text-slate-900">{when}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          with {advisorName} · {timeZone.replace("_", " ")}
        </p>
        {alreadyClosed && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This booking is {status === "cancelled" ? "cancelled" : "completed"} and
            can no longer be changed.
          </p>
        )}
      </div>

      {!alreadyClosed && mode === "view" && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("reschedule")}
            className="rounded-xl bg-slate-900 text-white text-sm font-semibold px-4 py-2.5 hover:bg-slate-800"
          >
            Reschedule
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={doCancel}
            className="rounded-xl border border-red-200 text-red-700 text-sm font-semibold px-4 py-2.5 hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? "Cancelling…" : "Cancel booking"}
          </button>
        </div>
      )}

      {!alreadyClosed && mode === "reschedule" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Pick a new date
            </label>
            {days.length === 0 ? (
              <p className="text-sm text-slate-500">
                {advisorName} has no open availability right now. Please cancel and
                rebook later, or contact them directly.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {days.slice(0, 8).map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.date);
                      setSelectedTime("");
                    }}
                    className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                      selectedDate === d.date
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedDate && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Pick a time
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {timesForDay.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                      selectedTime === t
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {formatTimeLabel(t)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !selectedDate || !selectedTime}
              onClick={doReschedule}
              className="rounded-xl bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Moving…" : "Confirm new time"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("view");
                setError(null);
              }}
              className="rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold px-4 py-2.5 hover:bg-slate-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "already_taken":
      return "That time was just taken. Please pick another.";
    case "slot_unavailable":
      return "That time isn't available. Please pick from the offered slots.";
    case "slot_in_past":
      return "That time is in the past.";
    case "already_cancelled":
      return "This booking is already cancelled.";
    default:
      return "Could not reschedule. Please try again.";
  }
}
