"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { useToast } from "@/components/Toast";
import { fireJourneyMoment } from "@/components/journey/journeyMoment";
import { getSessionId } from "@/lib/session";
import { celebrateSave } from "@/lib/celebrate";

interface Props {
  type: "article" | "broker" | "advisor" | "scenario" | "calculator" | "listing";
  ref: string;
  label?: string;
  className?: string;
  /** Render just the bookmark glyph (no "Save"/"Saved" text) — for dense
   *  card overlays where it sits beside other icon-only actions. The
   *  aria-label still announces the action. */
  iconOnly?: boolean;
}

/** fetch resolves on 4xx/5xx and the API can answer { ok: false } — treat
 *  both as a failed write so authed optimistic state can be reverted. */
async function responseOk(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  const json = (await res.json().catch(() => ({ ok: false }))) as { ok?: boolean };
  return json.ok === true;
}

/**
 * Save/unsave toggle that works for both authenticated and
 * anonymous visitors.
 *
 * - Logged in: writes directly to user_bookmarks.
 * - Logged out: writes to anonymous_saves keyed by session_id.
 *
 * On first sign-in elsewhere, /api/account/claim-anonymous
 * replays the anonymous rows into the user's bookmarks. That
 * claim trigger is handled by ClaimAnonymousOnAuth — this
 * button just fires the "save" event.
 */
export default function BookmarkButton({ type, ref, label, className, iconOnly }: Props) {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // When the user becomes logged in, re-check whether they already
  // have this item bookmarked so the star renders filled.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      // Check localStorage cache for anonymous saves
      try {
        const cached = localStorage.getItem("inv_anon_saves");
        if (cached) {
          const list = JSON.parse(cached) as Array<{ type: string; ref: string }>;
          if (list.some((i) => i.type === type && i.ref === ref)) setSaved(true);
        }
      } catch {
        /* ignore */
      }
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/account/bookmarks", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          items?: Array<{ bookmark_type: string; ref: string }>;
        };
        if (cancelled) return;
        if (json.items?.some((i) => i.bookmark_type === type && i.ref === ref)) {
          setSaved(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, type, ref]);

  const toggle = async () => {
    // Until auth resolves, a signed-in user looks anonymous — saving would
    // write a stale inv_anon_saves mirror the authed unsave never cleans.
    if (busy || userLoading) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      if (next) {
        if (!user) {
          // Mirror into localStorage BEFORE the network call so the star
          // persists between page loads even if the server write fails.
          try {
            const cached = localStorage.getItem("inv_anon_saves");
            const list = cached
              ? (JSON.parse(cached) as Array<{ type: string; ref: string }>)
              : [];
            if (!list.some((i) => i.type === type && i.ref === ref)) {
              list.push({ type, ref });
              localStorage.setItem("inv_anon_saves", JSON.stringify(list));
            }
          } catch {
            /* ignore */
          }
        }
        const body: Record<string, unknown> = { type, ref, label };
        if (!user) body.session_id = getSessionId();
        const res = await fetch("/api/account/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (user && !(await responseOk(res))) {
          setSaved(!next);
        } else {
          // Journey moment on the first-ever save; quiet toast thereafter.
          const moment = fireJourneyMoment("first_save");
          if (!moment.isNew) toast(label ? `Saved ${label}` : "Saved to your shortlist", "success");
        }
      } else {
        if (!user) {
          // Drop the localStorage mirror first so the unsave survives a
          // failed network call, then delete the server row — otherwise
          // claim-on-signup resurrects the unsaved item.
          try {
            const cached = localStorage.getItem("inv_anon_saves");
            if (cached) {
              const list = (
                JSON.parse(cached) as Array<{ type: string; ref: string }>
              ).filter((i) => !(i.type === type && i.ref === ref));
              localStorage.setItem("inv_anon_saves", JSON.stringify(list));
            }
          } catch {
            /* ignore */
          }
        }
        const body: Record<string, unknown> = { type, ref };
        if (!user) body.session_id = getSessionId();
        const res = await fetch("/api/account/bookmarks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (user && !(await responseOk(res))) {
          setSaved(!next);
        }
      }
      celebrateSave({ saved: next, label });
    } catch {
      // Anonymous state lives in localStorage (already written above);
      // only revert when the server is the source of truth.
      if (user) setSaved(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={saved ? "Remove bookmark" : "Save for later"}
      aria-pressed={saved}
      disabled={busy || userLoading}
      aria-busy={busy}
      className={
        className ||
        "inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-amber-600 transition-colors"
      }
    >
      <svg
        className="w-4 h-4"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
      {!iconOnly && (saved ? "Saved" : "Save")}
    </button>
  );
}
