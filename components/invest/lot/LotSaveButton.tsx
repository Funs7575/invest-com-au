"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { getSessionId } from "@/lib/session";
import { trackEvent } from "@/lib/tracking";

/**
 * Save/watch toggle for marketplace lot pages.
 *
 * Same persistence contract as `BookmarkButton` (user_bookmarks when
 * authed, anonymous_saves + the `inv_anon_saves` localStorage mirror when
 * not) with the lot-page treatment on top: a primary-feeling pill, a brief
 * scale pulse on save, and a one-time "where did it go?" hint so the first
 * save teaches the feature. Anonymous server writes fail soft until the
 * `anonymous_saves` CHECK migration lands — localStorage keeps the state
 * either way, which is why the anon path never reverts the star.
 *
 * Deliberately no confetti / streaks: the platform celebrates curiosity,
 * not transactions (see docs/plans/LISTINGS_LOT_EXPERIENCE.md §1).
 */

const ANON_CACHE_KEY = "inv_anon_saves";
const FIRST_SAVE_KEY = "inv_lot_first_save_seen";

interface AnonSave {
  type: string;
  ref: string;
}

function readAnonCache(): AnonSave[] {
  try {
    const cached = localStorage.getItem(ANON_CACHE_KEY);
    return cached ? (JSON.parse(cached) as AnonSave[]) : [];
  } catch {
    return [];
  }
}

function writeAnonCache(list: AnonSave[]): void {
  try {
    localStorage.setItem(ANON_CACHE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — state stays in-memory */
  }
}

export interface LotSaveButtonProps {
  /** Listing slug — globally unique, used as the bookmark ref. */
  slug: string;
  title: string;
  vertical: string;
  /** "pill" (header) or "bar" (sticky mobile bar, compact). */
  variant?: "pill" | "bar";
}

export default function LotSaveButton({
  slug,
  title,
  vertical,
  variant = "pill",
}: LotSaveButtonProps) {
  const { user } = useUser();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      if (readAnonCache().some((i) => i.type === "listing" && i.ref === slug)) {
        setSaved(true);
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
        if (json.items?.some((i) => i.bookmark_type === "listing" && i.ref === slug)) {
          setSaved(true);
        }
      } catch {
        /* non-fatal — star stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, slug]);

  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const showHint = (message: string) => {
    setHint(message);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 4000);
  };

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);

    if (next) {
      setPulse(true);
      setTimeout(() => setPulse(false), 350);
      trackEvent("listing_save", { vertical, ref: slug, authed: Boolean(user) });
      let firstSave = false;
      try {
        firstSave = !localStorage.getItem(FIRST_SAVE_KEY);
        if (firstSave) localStorage.setItem(FIRST_SAVE_KEY, "1");
      } catch {
        /* ignore */
      }
      if (firstSave) {
        showHint(
          user
            ? "Saved — find it any time in your account."
            : "Saved on this device — sign in to keep it everywhere.",
        );
      }
    } else {
      trackEvent("listing_unsave", { vertical, ref: slug, authed: Boolean(user) });
    }

    try {
      if (next) {
        const body: Record<string, unknown> = {
          type: "listing",
          ref: slug,
          label: title,
        };
        if (!user) body.session_id = getSessionId();
        await fetch("/api/account/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!user) {
          const list = readAnonCache();
          if (!list.some((i) => i.type === "listing" && i.ref === slug)) {
            list.push({ type: "listing", ref: slug });
            writeAnonCache(list);
          }
        }
      } else if (user) {
        await fetch("/api/account/bookmarks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "listing", ref: slug }),
        });
      } else {
        writeAnonCache(
          readAnonCache().filter((i) => !(i.type === "listing" && i.ref === slug)),
        );
      }
    } catch {
      // Anonymous saves live in localStorage regardless; only revert when
      // the server is the source of truth.
      if (user) setSaved(!next);
    } finally {
      setBusy(false);
    }
  };

  const compact = variant === "bar";

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        aria-busy={busy}
        aria-label={saved ? `Remove ${title} from saved` : `Save ${title} for later`}
        className={[
          "inline-flex items-center justify-center gap-1.5 font-semibold rounded-full border transition-all duration-200",
          compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm",
          saved
            ? "bg-amber-50 border-amber-300 text-amber-800"
            : "bg-white border-slate-300 text-slate-700 hover:border-amber-400 hover:text-amber-700",
          pulse ? "scale-110" : "scale-100",
        ].join(" ")}
      >
        <svg
          className={compact ? "w-3.5 h-3.5" : "w-4 h-4"}
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
        {saved ? "Saved" : "Save"}
      </button>
      <span aria-live="polite" className="sr-only">
        {saved ? "Saved for later" : ""}
      </span>
      {hint && (
        <span
          role="status"
          className="absolute right-0 top-full mt-2 z-30 w-56 rounded-lg bg-slate-900 text-white text-xs px-3 py-2 shadow-lg"
        >
          {hint}
        </span>
      )}
    </span>
  );
}
