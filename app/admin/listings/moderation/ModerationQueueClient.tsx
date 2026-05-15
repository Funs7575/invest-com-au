"use client";

/**
 * Client-side admin moderation queue for owner-submitted listings.
 *
 * Driven by initialItems (server-rendered through requireAdmin gate in
 * page.tsx). One row per pending listing with inline Approve / Reject
 * actions hitting /api/admin/listings/owner-flow/[id]/{approve,reject}.
 */

import { useState, useTransition } from "react";
import Link from "next/link";

import {
  LISTING_KIND_LABELS,
  type Listing,
} from "@/lib/listings/types";

type RowState = {
  rejecting: boolean;
  notes: string;
  error: string | null;
  removed: boolean;
};

function makeInitialState(items: Listing[]): Record<string, RowState> {
  const out: Record<string, RowState> = {};
  for (const l of items) {
    out[l.id] = { rejecting: false, notes: "", error: null, removed: false };
  }
  return out;
}

function formatPrice(listing: Listing): string {
  if (listing.askingPriceCents === null) return "Price on request";
  const aud = listing.askingPriceCents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: listing.currency || "AUD",
    maximumFractionDigits: 0,
  }).format(aud);
}

export default function ModerationQueueClient({
  initialItems,
}: {
  initialItems: Listing[];
}) {
  const [items] = useState<Listing[]>(initialItems);
  const [rowStates, setRowStates] = useState(() => makeInitialState(initialItems));
  const [pending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);

  function patchRow(id: string, patch: Partial<RowState>) {
    setRowStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { rejecting: false, notes: "", error: null, removed: false }), ...patch },
    }));
  }

  function approve(id: string) {
    setGlobalError(null);
    patchRow(id, { error: null });
    startTransition(async () => {
      const res = await fetch(`/api/admin/listings/owner-flow/${id}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        patchRow(id, { error: body.error || "Approve failed" });
        return;
      }
      patchRow(id, { removed: true });
    });
  }

  function reject(id: string) {
    setGlobalError(null);
    const state = rowStates[id];
    if (!state || !state.notes.trim()) {
      patchRow(id, { error: "Notes are required when rejecting." });
      return;
    }
    patchRow(id, { error: null });
    startTransition(async () => {
      const res = await fetch(`/api/admin/listings/owner-flow/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: state.notes }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        patchRow(id, { error: body.error || "Reject failed" });
        return;
      }
      patchRow(id, { removed: true });
    });
  }

  const visible = items.filter((l) => !rowStates[l.id]?.removed);

  return (
    <div>
      {globalError && (
        <p className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-2">
          {globalError}
        </p>
      )}
      {visible.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-6">
          Queue empty — nothing pending review.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((l) => {
            const state = rowStates[l.id] ?? {
              rejecting: false,
              notes: "",
              error: null,
              removed: false,
            };
            return (
              <li
                key={l.id}
                className="bg-white border border-slate-200 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                      {LISTING_KIND_LABELS[l.kind]}
                    </p>
                    <h2 className="text-base font-extrabold text-slate-900 break-words">
                      {l.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {l.locationState || "Australia-wide"} · {formatPrice(l)}
                      {" · "}
                      Owner: {l.ownerEmail}
                    </p>
                    {l.description && (
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap line-clamp-6">
                        {l.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[12rem]">
                    <button
                      type="button"
                      onClick={() => approve(l.id)}
                      disabled={pending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => patchRow(l.id, { rejecting: !state.rejecting })}
                      disabled={pending}
                      className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      {state.rejecting ? "Cancel" : "Reject…"}
                    </button>
                    <Link
                      href={`/listings/${l.slug}`}
                      className="text-xs text-slate-500 hover:text-slate-900 text-center"
                    >
                      View slug
                    </Link>
                  </div>
                </div>

                {state.rejecting && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <label
                      htmlFor={`notes-${l.id}`}
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Rejection notes (sent to owner)
                    </label>
                    <textarea
                      id={`notes-${l.id}`}
                      rows={3}
                      value={state.notes}
                      onChange={(e) => patchRow(l.id, { notes: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Why this listing can't go live."
                    />
                    <button
                      type="button"
                      onClick={() => reject(l.id)}
                      disabled={pending}
                      className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                  </div>
                )}

                {state.error && (
                  <p className="mt-2 text-xs text-red-700">{state.error}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
