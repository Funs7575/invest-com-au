"use client";

import { useEffect, useId, useRef, useState } from "react";
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

/**
 * Two LotSaveButtons can render for the same slug at once (header pill +
 * mobile sticky bar). Each toggle broadcasts on this window event so the
 * sibling stays in sync — otherwise the stale button mislabels itself and
 * re-saves instead of unsaving.
 */
const SYNC_EVENT = "inv:lot-save-sync";

interface LotSaveSyncDetail {
  ref: string;
  saved: boolean;
  source: string;
}

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
  const { user, loading: userLoading } = useUser();
  const instanceId = useId();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep sibling instances for the same slug in sync (header pill +
  // sticky bar both mount on mobile).
  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<LotSaveSyncDetail>).detail;
      if (detail?.ref === slug && detail.source !== instanceId) {
        setSaved(detail.saved);
      }
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [slug, instanceId]);

  const broadcast = (nextSaved: boolean) => {
    window.dispatchEvent(
      new CustomEvent<LotSaveSyncDetail>(SYNC_EVENT, {
        detail: { ref: slug, saved: nextSaved, source: instanceId },
      }),
    );
  };

  // Hydrate from the membership test in BOTH directions — the component
  // instance survives client-side navigation between lot pages, so a
  // saved→unsaved slug change must clear the previous state, not just
  // set it when found.
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setSaved(readAnonCache().some((i) => i.type === "listing" && i.ref === slug));
      return;
    }
    setSaved(false);
    (async () => {
      try {
        const res = await fetch("/api/account/bookmarks", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          items?: Array<{ bookmark_type: string; ref: string }>;
        };
        if (cancelled) return;
        setSaved(
          Boolean(json.items?.some((i) => i.bookmark_type === "listing" && i.ref === slug)),
        );
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
    // Until auth resolves, a signed-in user looks anonymous — saving would
    // write a stale inv_anon_saves mirror the authed unsave never cleans.
    if (busy || userLoading) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    broadcast(next);

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

    // Anonymous state lives in localStorage first — the mirror is written
    // BEFORE the network call so an offline/failed POST can't strand a
    // pressed button whose save evaporates on reload.
    if (!user) {
      if (next) {
        const list = readAnonCache();
        if (!list.some((i) => i.type === "listing" && i.ref === slug)) {
          list.push({ type: "listing", ref: slug });
          writeAnonCache(list);
        }
      } else {
        writeAnonCache(
          readAnonCache().filter((i) => !(i.type === "listing" && i.ref === slug)),
        );
      }
    }

    try {
      let res: Response;
      if (next) {
        const body: Record<string, unknown> = {
          type: "listing",
          ref: slug,
          label: title,
        };
        if (!user) body.session_id = getSessionId();
        res = await fetch("/api/account/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        // Authed: user_bookmarks row. Anonymous: the anonymous_saves row —
        // without the server delete, claim-on-signup resurrects the save.
        const body: Record<string, unknown> = { type: "listing", ref: slug };
        if (!user) body.session_id = getSessionId();
        res = await fetch("/api/account/bookmarks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      // fetch resolves on 4xx/5xx and the API can answer { ok: false } —
      // for authed users the server is the source of truth, so a non-write
      // must un-stick the optimistic state.
      if (user) {
        const ok =
          res.ok &&
          ((await res.json().catch(() => ({ ok: false }))) as { ok?: boolean }).ok === true;
        if (!ok) {
          setSaved(!next);
          broadcast(!next);
        }
      }
    } catch {
      // Anonymous saves live in localStorage regardless; only revert when
      // the server is the source of truth.
      if (user) {
        setSaved(!next);
        broadcast(!next);
      }
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
        disabled={busy || userLoading}
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
