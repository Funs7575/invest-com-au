"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";

function CalendarIcon({
  size = 18,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/**
 * Wave 17 — Concrete-slot booking widget.
 *
 * Distinct from `<BookingWidget>` which generates slot proposals
 * from the recurring weekly advisor_booking_slots schedule. This
 * widget reads REAL pre-populated `advisor_booking_appointments`
 * rows that the advisor (or admin on their behalf) has inserted
 * for specific datetimes.
 *
 * If the advisor has no open slots in that table, the widget
 * renders nothing — the legacy weekly-recurring widget will pick
 * up the load instead.
 *
 * Concurrency: the server-side `claimSlot` uses a conditional
 * update so two clients racing on the same slot see one success
 * and one `already_taken`. We surface that as a nice inline error
 * and refresh the list so the taken slot disappears.
 */

interface Slot {
  id: number;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  notes?: string | null;
}

interface Props {
  professionalId: number;
  professionalName: string;
  acceptsNewClients?: boolean | null;
  responseTimeHours?: number | null;
  className?: string;
}

type Status = "loading" | "ready" | "empty" | "submitting" | "success" | "error";

export default function AdvisorAppointmentsWidget({
  professionalId,
  professionalName,
  acceptsNewClients,
  responseTimeHours,
  className = "",
}: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<Slot | null>(null);

  const loadSlots = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/advisor-appointments?professional_id=${professionalId}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setStatus("empty");
        return;
      }
      const json = (await res.json()) as { items?: Slot[] };
      const items = json.items || [];
      setSlots(items);
      setStatus(items.length > 0 ? "ready" : "empty");
    } catch {
      setStatus("empty");
    }
  }, [professionalId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const claim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/advisor-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          name: name.trim(),
          email: email.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfirmedSlot(selectedSlot);
        setStatus("success");
        return;
      }

      // Concurrency collision — someone else booked it.
      if (res.status === 409 || json.error === "already_taken") {
        setError(
          "Sorry — someone else just booked that slot. We've refreshed the list.",
        );
        setSelectedSlot(null);
        await loadSlots();
        setStatus(slots.length > 0 ? "ready" : "empty");
        return;
      }
      setError(friendlyError(json.error));
      setStatus("ready");
    } catch {
      setError("Network error — please try again.");
      setStatus("ready");
    }
  };

  // The advisor has no open slots in the Wave 17 appointments table;
  // fall back by rendering nothing so the legacy booking widget can
  // still drive conversions via the weekly-recurring schedule.
  if (status === "empty" || (status === "loading" && slots.length === 0)) {
    return null;
  }

  // Success branch — show a friendly confirmation with everything
  // the user needs to remember about their appointment.
  if (status === "success" && confirmedSlot) {
    return (
      <div
        className={`bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden ${className}`}
      >
        <div className="bg-gradient-to-r from-emerald-50 via-white to-white border-b border-emerald-100 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Icon name="check-circle" size={20} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Appointment confirmed
            </h3>
            <p className="text-[11px] text-emerald-700 font-semibold">
              You&apos;re on {professionalName}&apos;s calendar
            </p>
          </div>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="font-semibold text-slate-500">When</dt>
            <dd className="text-slate-900 font-semibold">
              {formatSlotDate(confirmedSlot.starts_at)}
              <br />
              <span className="font-normal">
                {formatSlotTime(
                  confirmedSlot.starts_at,
                  confirmedSlot.ends_at,
                )}
              </span>
            </dd>
            <dt className="font-semibold text-slate-500">Duration</dt>
            <dd className="text-slate-900">
              {confirmedSlot.duration_minutes} minutes
            </dd>
            <dt className="font-semibold text-slate-500">Email</dt>
            <dd className="text-slate-900 break-all">{email}</dd>
          </dl>
          <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            We&apos;ve sent the confirmation to your email. {professionalName}
            will reach out with meeting details
            {responseTimeHours
              ? ` — typically within ${formatResponseTime(responseTimeHours)}`
              : ""}
            .
          </div>
        </div>
      </div>
    );
  }

  // Picking / claim form state.
  const grouped = groupSlotsByDay(slots);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
    >
      <div className="bg-gradient-to-r from-amber-50 via-white to-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <CalendarIcon size={18} className="text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">
              Book a consultation
            </h3>
            <p className="text-[11px] text-slate-500">
              {acceptsNewClients === false ? (
                <span className="text-amber-700 font-semibold">
                  Not accepting new clients right now
                </span>
              ) : responseTimeHours ? (
                <>Typically replies within {formatResponseTime(responseTimeHours)}</>
              ) : (
                <>Free 15 min intro call</>
              )}
            </p>
          </div>
        </div>
      </div>

      {acceptsNewClients === false ? (
        <div className="p-6 text-sm text-slate-600">
          {professionalName} isn&apos;t accepting new clients at the moment.
          You can still send a message — we&apos;ll notify them and you&apos;ll
          hear back when they have availability.
        </div>
      ) : !selectedSlot ? (
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Pick a time that works for you
          </p>
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.dayIso}>
                <p className="text-sm font-bold text-slate-900 mb-2">
                  {formatDayLabel(group.dayIso)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot);
                        setError(null);
                      }}
                      className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50 px-3 py-2 text-left transition-colors"
                    >
                      <span className="text-sm font-bold text-slate-900">
                        {formatSlotTime(slot.starts_at, slot.ends_at)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">
                        {slot.duration_minutes} min
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}
          <p className="mt-5 text-[11px] text-slate-500 leading-relaxed">
            You&apos;ll only be asked for contact details on the next step.
            Unsecured calendar hold — we will not charge a fee.
          </p>
        </div>
      ) : (
        <form onSubmit={claim} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <CalendarIcon
              size={16}
              className="text-amber-700 mt-0.5 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Holding this slot
              </p>
              <p className="text-sm font-bold text-slate-900">
                {formatDayLabel(selectedSlot.starts_at)} at{" "}
                {formatSlotTime(selectedSlot.starts_at, selectedSlot.ends_at)}
              </p>
              <p className="text-[11px] text-slate-500">
                {selectedSlot.duration_minutes} min
                {selectedSlot.notes ? ` · ${selectedSlot.notes}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSlot(null);
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold shrink-0"
            >
              Change
            </button>
          </div>

          <div>
            <label
              htmlFor="booking-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Your name
            </label>
            <input
              id="booking-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
              maxLength={100}
              autoComplete="name"
            />
          </div>

          <div>
            <label
              htmlFor="booking-email"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Email address
            </label>
            <input
              id="booking-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
              maxLength={254}
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-5 py-3 rounded-lg transition-colors shadow-sm"
          >
            {status === "submitting" ? "Confirming…" : "Confirm appointment"}
          </button>

          {error && (
            <p
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <p className="text-[10px] text-slate-500 leading-relaxed">
            By confirming you agree to share your name and email with{" "}
            {professionalName}. We do not charge a fee — the advisor may
            follow up about their consultation fees separately.
          </p>
        </form>
      )}
    </div>
  );
}

function groupSlotsByDay(slots: Slot[]): { dayIso: string; slots: Slot[] }[] {
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const day = slot.starts_at.slice(0, 10);
    const list = groups.get(day) || [];
    list.push(slot);
    groups.set(day, list);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dayIso, list]) => ({ dayIso, slots: list }));
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (dayStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return d.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatSlotDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSlotTime(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

function formatResponseTime(hours: number): string {
  if (hours < 1) return "an hour";
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)} days`;
}

function friendlyError(code: unknown): string {
  if (typeof code !== "string") {
    return "Couldn't confirm the booking — please try again.";
  }
  switch (code) {
    case "already_taken":
      return "That slot was just booked by someone else.";
    case "slot_in_past":
      return "That slot is no longer available.";
    case "missing_fields":
      return "Please fill in your name and email.";
    case "Too many requests":
      return "Too many attempts — please wait a minute and try again.";
    case "not_found":
      return "We can't find that slot anymore.";
    default:
      return "Couldn't confirm the booking — please try again.";
  }
}
