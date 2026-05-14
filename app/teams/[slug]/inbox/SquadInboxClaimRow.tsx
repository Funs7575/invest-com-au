"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { TeamBriefAssignmentRow } from "@/lib/team-brief-assignments";

interface Props {
  teamSlug: string;
  briefId: number;
  callerProfessionalId: number;
  callerName: string;
  activeAssignment: TeamBriefAssignmentRow | null;
  claimerName: string | null;
  claimerPhotoUrl: string | null;
}

function relativeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

export default function SquadInboxClaimRow({
  teamSlug,
  briefId,
  callerProfessionalId,
  activeAssignment,
  claimerName,
  claimerPhotoUrl,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isMine =
    !!activeAssignment &&
    activeAssignment.professional_id === callerProfessionalId &&
    activeAssignment.status === "claimed";

  const handsOff =
    !!activeAssignment && activeAssignment.status === "handed_off";

  async function postAction(
    action: "claim" | "handoff" | "complete" | "release",
    body: Record<string, unknown> = {},
  ): Promise<void> {
    setError(null);
    try {
      const res = await fetch(
        `/api/teams/${teamSlug}/briefs/${briefId}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error || `Could not ${action} this brief.`);
        return;
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    }
  }

  function onClaim(): void {
    void postAction("claim");
  }

  function onComplete(): void {
    void postAction("complete");
  }

  function onRelease(): void {
    void postAction("release");
  }

  function onHandoff(): void {
    const note = window.prompt(
      "Optional handoff note for the squad (who's picking it up, context, etc.):",
      "",
    );
    if (note === null) return; // user cancelled
    void postAction("handoff", { note });
  }

  return (
    <div className="mt-3">
      {/* Status / claimer badge */}
      {!activeAssignment && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-1 font-semibold">
            Unclaimed
          </span>
          <button
            type="button"
            onClick={onClaim}
            disabled={pending}
            className="ml-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            {pending ? "Claiming…" : "Claim this brief"}
          </button>
        </div>
      )}

      {activeAssignment && !isMine && !handsOff && (
        <div className="flex items-center gap-2 text-xs text-slate-700">
          {claimerPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- tiny inline avatar; no LCP concern
            <img
              src={claimerPhotoUrl}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600">
              {(claimerName ?? "?")
                .split(" ")
                .map((s) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
          <span>
            <span className="font-semibold">
              {claimerName ?? "A squad member"}
            </span>{" "}
            is handling this · since {relativeAgo(activeAssignment.claimed_at)}
          </span>
        </div>
      )}

      {activeAssignment && handsOff && (
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <span className="inline-flex items-center text-xs bg-slate-100 text-slate-700 rounded-full px-2 py-1 font-semibold">
            Handed off
          </span>
          <span className="text-slate-500">
            {activeAssignment.released_at
              ? `Handed off ${relativeAgo(activeAssignment.released_at)}`
              : ""}
          </span>
          <button
            type="button"
            onClick={onClaim}
            disabled={pending}
            className="ml-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg"
          >
            {pending ? "Picking up…" : "Pick this up"}
          </button>
        </div>
      )}

      {isMine && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center bg-amber-100 text-amber-900 rounded-full px-2 py-1 font-semibold">
              You claimed this · {relativeAgo(activeAssignment.claimed_at)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onHandoff}
              disabled={pending}
              className="bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Hand off
            </button>
            <button
              type="button"
              onClick={onComplete}
              disabled={pending}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
            >
              Mark completed
            </button>
            <button
              type="button"
              onClick={onRelease}
              disabled={pending}
              className="text-xs text-slate-500 hover:text-slate-700 underline ml-1"
            >
              Release
            </button>
          </div>
        </div>
      )}

      {/* Optional notes — visible to whole squad */}
      {activeAssignment?.notes && (
        <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 whitespace-pre-line">
          <span className="font-semibold">Notes:</span> {activeAssignment.notes}
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
