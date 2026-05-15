"use client";

import { useEffect, useState, useTransition } from "react";

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

  function handleBook(slot: AvailabilitySlot) {
    setError(null);
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
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
        Book a consultation
      </p>
      <p className="text-sm text-slate-600 mb-4">
        Pick an open slot from {proName}&apos;s availability below.
      </p>

      {loading && <p className="text-sm text-slate-500">Loading availability…</p>}

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
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}

          <ul className="space-y-2">
            {slots.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-slate-50 rounded-xl border border-slate-200 p-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {formatRange(s.start_at, s.end_at)}
                </p>
                <button
                  type="button"
                  onClick={() => handleBook(s)}
                  disabled={pending}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
                >
                  {pending ? "Booking…" : "Book"}
                </button>
              </li>
            ))}
          </ul>
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
