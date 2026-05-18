"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface OtherTeam {
  id: number;
  slug: string;
  name: string;
  team_category: string;
}

interface Props {
  teamSlug: string;
  briefId: number;
  /** Other verified teams the caller can refer this brief to. */
  otherTeams: OtherTeam[];
  /** Whether this brief is currently snoozed (drives the "Un-snooze" UI). */
  snoozed: boolean;
}

/**
 * Inbox row-level actions: "Snooze 7d", "Not for us", "Refer".
 * Wired to `/api/teams/[slug]/decisions` and `/api/teams/[slug]/referrals`.
 * Kept separate from `SquadInboxClaimRow` so the claim-lifecycle UI stays
 * narrow; these decisions all hide / forward the brief regardless of claim.
 */
export default function SquadInboxRowActions({
  teamSlug,
  briefId,
  otherTeams,
  snoozed,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [referOpen, setReferOpen] = useState(false);
  const [referTarget, setReferTarget] = useState<string>("");
  const [referNote, setReferNote] = useState("");

  async function postDecision(decision: "not_for_us" | "snoozed") {
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamSlug}/decisions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ briefId, decision }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || `Could not ${decision} this brief.`);
        return;
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    }
  }

  async function clearSnooze() {
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamSlug}/decisions`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ briefId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not un-snooze.");
        return;
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    }
  }

  async function submitReferral() {
    if (!referTarget) return;
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamSlug}/referrals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          briefId,
          toTeamId: Number(referTarget),
          note: referNote.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Could not refer this brief.");
        return;
      }
      setReferOpen(false);
      setReferTarget("");
      setReferNote("");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {!snoozed && (
          <button
            type="button"
            onClick={() => postDecision("snoozed")}
            disabled={pending}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md px-2 py-1.5 disabled:opacity-50"
            title="Hide from inbox for 7 days"
          >
            😴 Snooze 7d
          </button>
        )}
        {snoozed && (
          <button
            type="button"
            onClick={clearSnooze}
            disabled={pending}
            className="text-amber-700 hover:bg-amber-50 rounded-md px-2 py-1.5 disabled:opacity-50"
          >
            ↩ Un-snooze
          </button>
        )}
        <button
          type="button"
          onClick={() => postDecision("not_for_us")}
          disabled={pending}
          className="text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md px-2 py-1.5 disabled:opacity-50"
          title="Permanently hide from this team's inbox"
        >
          ✕ Not for us
        </button>
        {otherTeams.length > 0 && (
          <button
            type="button"
            onClick={() => setReferOpen((s) => !s)}
            disabled={pending}
            className="text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-md px-2 py-1.5 disabled:opacity-50"
            title="Forward this brief to another verified squad"
          >
            ↗ Refer to another team
          </button>
        )}
      </div>

      {referOpen && (
        <div className="mt-3 bg-violet-50 border border-violet-200 rounded-lg p-3 space-y-2">
          <label className="block">
            <span className="text-xs font-semibold text-violet-900">
              Refer to
            </span>
            <select
              value={referTarget}
              onChange={(e) => setReferTarget(e.target.value)}
              className="mt-1 w-full rounded-md border border-violet-300 bg-white text-sm px-2 py-1.5"
            >
              <option value="">— pick a verified squad —</option>
              {otherTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.team_category}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-violet-900">
              Note for them (optional)
            </span>
            <textarea
              value={referNote}
              onChange={(e) => setReferNote(e.target.value)}
              rows={2}
              maxLength={2000}
              className="mt-1 w-full rounded-md border border-violet-300 bg-white text-sm px-2 py-1.5"
              placeholder="Why this brief might fit them better."
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitReferral}
              disabled={!referTarget || pending}
              className="rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5"
            >
              {pending ? "Sending…" : "Send referral"}
            </button>
            <button
              type="button"
              onClick={() => setReferOpen(false)}
              className="rounded-md bg-white border border-violet-300 text-violet-700 text-xs font-semibold px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
