"use client";

/**
 * Open to Offers — consumer opt-in block.
 *
 * A small, isolated, flag-gated block rendered after get-matched / find-advisor
 * results AND on the account dashboard. The consumer flips one toggle to let
 * vetted advisers pitch them anonymously; can pause or withdraw any time; and
 * sees a 60-day renewal nudge as expiry nears.
 *
 * The component is mounted only when the parent has already confirmed the
 * `open_to_offers` flag is on (server-side), so it never renders for users the
 * feature is dormant for. It self-fetches current status on mount.
 *
 * Compliance: the explainer states plainly what advisers see (goal, state,
 * budget band only — never identity) and that pitches are general capability
 * statements, not personal advice.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type Status = "off" | "active" | "paused" | "expired";

interface StatusResponse {
  status: Status;
  expiresAt: string | null;
}

const RENEWAL_WINDOW_DAYS = 10;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function OptInBlock({
  variant = "dashboard",
}: {
  /** "results" trims the heading for the post-quiz placement. */
  variant?: "dashboard" | "results";
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/open-to-offers/opt-in");
      if (res.status === 404) {
        setStatus("off"); // flag off on the server — render nothing (handled below)
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as StatusResponse;
      setStatus(data.status);
      setExpiresAt(data.expiresAt);
    } catch {
      /* leave status null → block stays hidden */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (action: "activate" | "pause" | "withdraw") => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/open-to-offers/opt-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Something went wrong.");
          return;
        }
        setStatus(data.status as Status);
        setExpiresAt(data.expiresAt ?? null);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Hidden until we know the status (avoids a flash) — and stays simple if the
  // API 404s (flag off).
  if (status === null) return null;

  const isOn = status === "active";
  const isPaused = status === "paused";
  const isExpired = status === "expired";
  const remaining = daysUntil(expiresAt);
  const showRenewal =
    isOn && remaining !== null && remaining <= RENEWAL_WINDOW_DAYS && remaining > 0;

  return (
    <section
      aria-labelledby="oto-heading"
      className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded-lg bg-violet-600/10 p-2 text-violet-700">
          <Icon name="inbox" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="oto-heading" className="text-base font-bold text-slate-900">
            {variant === "results" ? "Let advisers come to you" : "Open to offers"}
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-slate-600">
            Let vetted advisers pitch you — <strong>anonymously</strong>. They see only your
            goal, state and budget band. Your name, email and contact details stay hidden
            until <em>you</em> accept a pitch.
          </p>

          {/* State-specific controls */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isOn || isPaused ? (
              <>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    isOn
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  <Icon name={isOn ? "check" : "pause"} size={13} />
                  {isOn ? "Advisers can pitch you" : "Paused"}
                </span>
                {isPaused ? (
                  <button
                    type="button"
                    onClick={() => act("activate")}
                    disabled={busy}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => act("pause")}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-60"
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => act("withdraw")}
                  disabled={busy}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 disabled:opacity-60"
                >
                  Withdraw
                </button>
                <Link
                  href="/account/offers"
                  className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
                >
                  View pitches <span aria-hidden>→</span>
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => act("activate")}
                disabled={busy}
                aria-busy={busy}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {isExpired ? "Re-open to offers" : "Turn on — let advisers pitch me"}
              </button>
            )}
          </div>

          {showRenewal && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              Your listing expires in {remaining} day{remaining === 1 ? "" : "s"}.{" "}
              <button
                type="button"
                onClick={() => act("activate")}
                disabled={busy}
                className="underline hover:text-amber-900 disabled:opacity-60"
              >
                Renew for another 60 days
              </button>
            </p>
          )}

          {isExpired && (
            <p className="mt-2 text-xs text-slate-500">
              Your previous listing expired. Re-open any time — we&apos;ll rebuild an
              anonymous snapshot from your latest profile and quiz.
            </p>
          )}

          {error && (
            <p role="alert" className="mt-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <p className="mt-3 border-t border-violet-200/70 pt-2 text-[11px] leading-snug text-slate-500">
            Pitches are general statements of how an adviser can help — not personal advice
            or a recommendation about your money. General information only.
          </p>
        </div>
      </div>
    </section>
  );
}
