"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type {
  AvailabilitySlot,
  ConsultationBooking,
} from "@/lib/consultations";

interface Props {
  briefSlug: string;
  proSlug: string;
  proName: string;
  /** Provided when the consumer navigated with `?email=` — passed to the
   * API as an email-as-key auth fallback for unauthenticated visitors. */
  contactEmail: string | null;
  existingBooking: ConsultationBooking | null;
  existingSlot: AvailabilitySlot | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function BookConsultationPanel({
  briefSlug,
  proSlug,
  proName,
  contactEmail,
  existingBooking,
  existingSlot,
}: Props) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [booking, setBooking] = useState<ConsultationBooking | null>(
    existingBooking,
  );
  const [bookedSlot, setBookedSlot] = useState<AvailabilitySlot | null>(
    existingSlot,
  );
  const [pickedSlotId, setPickedSlotId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (booking) return;
    setLoading(true);
    fetch(`/api/pros/${proSlug}/availability`)
      .then((r) => r.json())
      .then((body: { slots?: AvailabilitySlot[]; error?: string }) => {
        if (cancelled) return;
        if (body.slots) setSlots(body.slots);
      })
      .catch(() => {
        /* silent */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proSlug, booking]);

  // Group slots into a 7-day calendar starting from the earliest available
  // slot (or today if there are no slots in the past). Each cell is a list
  // of pickable times on that date so the consumer can scan a week at a
  // glance instead of scrolling a flat list.
  const grid = useMemo(() => {
    if (slots.length === 0) return [] as { date: Date; slots: AvailabilitySlot[] }[];
    const sorted = [...slots].sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
    const first = new Date(sorted[0]?.start_at ?? Date.now());
    first.setHours(0, 0, 0, 0);
    const startMs = first.getTime();
    const grouped: { date: Date; slots: AvailabilitySlot[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startMs + i * DAY_MS);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);
      const inDay = sorted.filter((s) => {
        const t = new Date(s.start_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      grouped.push({ date: dayStart, slots: inDay });
    }
    return grouped;
  }, [slots]);

  function handleBook(slot: AvailabilitySlot) {
    setError(null);
    setPickedSlotId(slot.id);
    startTransition(async () => {
      try {
        const body: Record<string, unknown> = { slot_id: slot.id };
        if (notes.trim()) body.notes = notes.trim();
        if (contactEmail) body.contact_email = contactEmail;
        const res = await fetch(`/api/briefs/${briefSlug}/book-slot`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const parsed = (await res.json().catch(() => ({}))) as {
          booking?: ConsultationBooking;
          slot?: AvailabilitySlot;
          error?: string;
        };
        if (!res.ok || !parsed.booking) {
          throw new Error(parsed.error ?? `HTTP ${res.status}`);
        }
        setBooking(parsed.booking);
        setBookedSlot(parsed.slot ?? slot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to book.");
        setPickedSlotId(null);
      }
    });
  }

  function handleCancel() {
    if (!booking || cancelling) return;
    setCancelError(null);
    setCancelling(true);
    startTransition(async () => {
      try {
        const body: Record<string, unknown> = { booking_id: booking.id };
        if (contactEmail) body.contact_email = contactEmail;
        const res = await fetch(`/api/briefs/${briefSlug}/booking/cancel`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const parsed = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          error?: string;
        };
        if (!res.ok || !parsed.success) {
          throw new Error(parsed.error ?? `HTTP ${res.status}`);
        }
        // Free the panel back to the slot picker so they can rebook (reschedule).
        setBooking(null);
        setBookedSlot(null);
        setPickedSlotId(null);
      } catch (err) {
        setCancelError(err instanceof Error ? err.message : "Failed to cancel.");
      } finally {
        setCancelling(false);
      }
    });
  }

  if (booking) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest text-emerald-700 mb-2">
          {booking.status === "confirmed"
            ? "Meeting confirmed"
            : "Booking received"}
        </p>
        <p className="text-base font-bold text-emerald-900">
          {bookedSlot ? formatRange(bookedSlot.start_at, bookedSlot.end_at) : ""}
        </p>
        <p className="text-sm text-emerald-800 mt-1">with {proName}</p>
        {booking.meet_url && (
          <p className="text-sm mt-3">
            <span className="font-semibold">Meeting link:</span>{" "}
            <a
              href={booking.meet_url}
              className="text-emerald-700 underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              {booking.meet_url}
            </a>
          </p>
        )}
        {booking.status === "pending" && (
          <p className="text-xs text-emerald-700 mt-3">
            {proName} will confirm shortly and share a meeting link.
          </p>
        )}
        {(booking.status === "pending" || booking.status === "confirmed") && (
          <div className="mt-4 pt-3 border-t border-emerald-200">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling || pending}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? "Cancelling…" : "Cancel / reschedule"}
            </button>
            <p className="text-[11px] text-emerald-700 mt-1">
              Cancelling frees the time so you can pick another slot.
            </p>
            {cancelError && (
              <p className="text-xs text-rose-600 mt-1" role="alert">
                {cancelError}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Book a consultation
        </p>
        {slots.length > 0 && (
          <p className="text-[11px] text-slate-500">
            Times shown in your local timezone (
            {Intl.DateTimeFormat().resolvedOptions().timeZone})
          </p>
        )}
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Pick an open slot from {proName}&apos;s availability below.
      </p>

      {loading && <p aria-live="polite" aria-atomic="true" className="text-sm text-slate-500">Loading availability…</p>}

      {!loading && slots.length === 0 && (
        <p className="text-sm text-slate-500">
          {proName} hasn&apos;t published any availability yet. They&apos;ll
          email you to coordinate a time.
        </p>
      )}

      {slots.length > 0 && (
        <>
          <label className="block mb-3">
            <span className="text-xs text-slate-600 font-semibold">
              Notes for {proName} (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Anything they should know before the call?"
            />
          </label>

          {error && (
            <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}

          {/* 7-day calendar grid — each column is a date, each cell is a
              clickable time chip. Scans much faster than a flat list once a
              pro publishes more than ~10 open slots. */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {grid.map(({ date, slots: daySlots }) => {
              const isToday =
                new Date().toDateString() === date.toDateString();
              return (
                <div
                  key={date.toISOString()}
                  className="flex flex-col rounded-lg bg-slate-50 border border-slate-200 p-1.5 sm:p-2 min-h-[120px]"
                >
                  <div
                    className={`text-[10px] sm:text-xs font-semibold text-center pb-1 mb-1 border-b border-slate-200 ${
                      isToday ? "text-amber-700" : "text-slate-600"
                    }`}
                  >
                    {date.toLocaleDateString(undefined, {
                      weekday: "short",
                    })}
                    <br />
                    <span className="font-bold">
                      {date.toLocaleDateString(undefined, { day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {daySlots.length === 0 && (
                      <span className="text-[10px] text-slate-400 text-center py-2">
                        —
                      </span>
                    )}
                    {daySlots.map((s) => {
                      const isPicked = pickedSlotId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleBook(s)}
                          disabled={pending}
                          className={`text-[10px] sm:text-xs font-semibold rounded px-1 py-1 transition-colors ${
                            isPicked
                              ? "bg-amber-500 text-slate-900"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                          title={formatRange(s.start_at, s.end_at)}
                        >
                          {formatTime(s.start_at)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {pending && (
            <p className="text-xs text-slate-500 mt-3 text-center">
              Booking your slot…
            </p>
          )}
        </>
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

function formatTime(startAt: string): string {
  return new Date(startAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
