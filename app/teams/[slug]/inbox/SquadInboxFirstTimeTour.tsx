"use client";

import { useState } from "react";

interface Props {
  /** Team slug — used as the localStorage key suffix so dismissals
   * are per-team (a member of two squads dismisses each tour
   * independently). */
  teamSlug: string;
  /** Whether the squad has only ever had ≤1 accepted brief. The parent
   * server page resolves this from `advisor_auctions` count; we don't
   * fetch from the client to avoid an extra round-trip. */
  isFirstTime: boolean;
}

const STORAGE_KEY_PREFIX = "iv_squad_tour_dismissed_";

/**
 * Read the dismissal flag synchronously inside the useState initialiser
 * so the first render already reflects localStorage — avoids the
 * cascading-render lint warning from setting state inside useEffect.
 *
 * `typeof window` guard is essential because Next 16 invokes the
 * useState initialiser on the server for client components during
 * pre-rendering.
 */
function readDismissed(teamSlug: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${teamSlug}`) === "1"
    );
  } catch {
    return false;
  }
}

/**
 * First-time onboarding tour for the Pro Squad inbox.
 *
 * Renders a single coach-card banner with the 4-step lifecycle
 * (claim → message → complete → review) when the team is brand new
 * AND the member hasn't dismissed it. Persists dismissal in
 * localStorage so a refresh doesn't bring it back.
 *
 * Why not a multi-step Joyride-style tour: a single inline banner
 * scrolls with the page, reads faster, and doesn't fight any modal
 * stack — the inbox already has a lot of affordances.
 */
export default function SquadInboxFirstTimeTour({
  teamSlug,
  isFirstTime,
}: Props) {
  const [dismissed, setDismissed] = useState(() => readDismissed(teamSlug));

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${teamSlug}`, "1");
    } catch {
      /* incognito / storage blocked — ephemeral dismissal is fine */
    }
  }

  if (!isFirstTime || dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Squad inbox onboarding tour"
      className="mb-6 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1">
            🎉 First Match Request accepted
          </p>
          <h2 className="text-lg font-extrabold text-slate-900">
            Welcome to your squad inbox
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Here&apos;s how a brief moves through your squad. Hover any step
            for more detail.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-slate-100"
          aria-label="Dismiss tour"
        >
          ✕ Dismiss
        </button>
      </div>
      <ol className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          {
            n: 1,
            title: "Claim",
            body: "Hit the amber Claim button so the squad sees who's on it. Only one member at a time.",
          },
          {
            n: 2,
            title: "Message",
            body: "The consumer sees your replies live on their tracker. Reply within 30 min for best outcomes.",
          },
          {
            n: 3,
            title: "Hand off / Complete",
            body: "Handing off keeps the brief in the squad. Completing closes the loop + flips status to won.",
          },
          {
            n: 4,
            title: "Review (4 weeks)",
            body: "Consumer gets emailed a review prompt; their rating feeds your outcome score + ranking.",
          },
        ].map((s) => (
          <li
            key={s.n}
            className="flex flex-col bg-white rounded-lg border border-violet-100 p-3"
            title={s.body}
          >
            <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-extrabold flex items-center justify-center text-sm mb-2">
              {s.n}
            </div>
            <p className="text-sm font-bold text-slate-900">{s.title}</p>
            <p className="text-xs text-slate-600 mt-1 leading-snug">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-slate-500 mt-4">
        Tip: snooze briefs that aren&apos;t a fit (they come back in 7 days);
        permanently dismiss with &quot;Not for us.&quot; Use{" "}
        <strong>Refer to another team</strong> to forward briefs you&apos;d
        rather another squad take.
      </p>
    </div>
  );
}
