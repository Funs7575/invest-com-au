"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  sessionId: number;
  className?: string;
}

export default function RsvpButton({ sessionId, className = "" }: Props) {
  const [rsvpd, setRsvpd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      if (!user) { setChecked(true); return; }
      supabase
        .from("office_hour_rsvps")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setRsvpd(!!data);
          setChecked(true);
        });
    });
  }, [sessionId]);

  async function toggle() {
    if (!userId) {
      window.location.href = `/login?redirect=/office-hours/${sessionId}`;
      return;
    }
    if (loading || !checked) return;

    setLoading(true);
    const prev = rsvpd;
    setRsvpd(!prev);

    try {
      const res = await fetch(`/api/office-hours/${sessionId}/rsvp`, {
        method: prev ? "DELETE" : "POST",
      });
      if (!res.ok) setRsvpd(prev);
    } catch {
      setRsvpd(prev);
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
        rsvpd
          ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          : "bg-indigo-600 hover:bg-indigo-700 text-white"
      } ${className}`}
    >
      {rsvpd ? (
        <>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          RSVP&apos;d — click to cancel
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {userId ? "RSVP for this session" : "Sign in to RSVP"}
        </>
      )}
    </button>
  );
}
