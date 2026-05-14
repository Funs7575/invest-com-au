"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";

/**
 * Booking handoff CTA shown beneath the concierge chat after the
 * model has produced at least one substantive reply.
 *
 * Concierge answers are educational; the CTA is the path from
 * "I understand X" to "let me book a call with an advisor for
 * personal advice on X". The first user turn is forwarded as a
 * `seed` query so /find-advisor pre-fills the enquiry context.
 */

export interface ConciergeBookingHandoffProps {
  firstUserMessage: string | null;
  sessionId: string | null;
  messagesCount: number;
}

export default function ConciergeBookingHandoff({
  firstUserMessage,
  sessionId,
  messagesCount,
}: ConciergeBookingHandoffProps) {
  const params = new URLSearchParams({ source: "concierge" });
  if (firstUserMessage && firstUserMessage.trim()) {
    params.set("seed", firstUserMessage.trim().slice(0, 200));
  }
  if (sessionId) params.set("concierge_session", sessionId);
  const href = `/find-advisor?${params.toString()}`;

  const onClick = () => {
    trackEvent("concierge_booking_handoff_click", {
      session_id: sessionId,
      messages_count: messagesCount,
    });
  };

  return (
    <div
      data-testid="concierge-booking-handoff"
      className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 md:p-4"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-slate-900">
          Ready for personal advice?
        </p>
        <p className="text-[11.5px] leading-relaxed text-slate-600">
          We&apos;ll route your question to an AFSL-licensed advisor who
          specialises in this area — most reply within a business day.
        </p>
      </div>
      <Link
        href={href}
        onClick={onClick}
        data-testid="concierge-booking-handoff-cta"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
      >
        Book a call
        <Icon name="arrow-right" size={12} />
      </Link>
    </div>
  );
}
