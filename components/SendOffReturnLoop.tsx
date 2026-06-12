"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { showToast } from "@/components/Toast";
import { celebrateMilestone } from "@/lib/celebrate";
import { trackEvent } from "@/lib/tracking";

const STAMP_KEY = "iv_last_outbound";
const MIN_RETURN_GAP_MS = 60 * 60 * 1000; // 1 hour
const MAX_RETURN_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface OutboundStamp {
  slug: string;
  ts: number;
  answered?: boolean;
}

function readStamp(): OutboundStamp | null {
  try {
    const raw = localStorage.getItem(STAMP_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as OutboundStamp).slug === "string" &&
      typeof (parsed as OutboundStamp).ts === "number"
    ) {
      return parsed as OutboundStamp;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function humanise(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0]?.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * The send-off and the return (RETAIL_UX_NORTHSTAR §5 D3).
 *
 * Send-off: a delegated capture-phase listener on /go/ affiliate links —
 * acknowledges the departure in OUR tab (the link opens in a new tab) and
 * stamps localStorage. Never preventDefault, never delays the redirect,
 * never touches /go/ mechanics.
 *
 * Return: on the next homepage/compare visit ≥1h later, asks "how did it
 * go?" once. Answers route usefully; "opened an account" is the
 * decided_broker milestone — celebrating THEIR decision, made after
 * homework, whatever they chose (§9: never keyed to our commission).
 */
export default function SendOffReturnLoop() {
  const pathname = usePathname();
  const [returnPrompt, setReturnPrompt] = useState<OutboundStamp | null>(null);

  // ── Send-off listener ──────────────────────────────────────────────
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="/go/"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const slug = anchor.getAttribute("href")?.split("/")[2]?.split("?")[0];
      if (!slug) return;
      try {
        localStorage.setItem(STAMP_KEY, JSON.stringify({ slug, ts: Date.now() } satisfies OutboundStamp));
      } catch {
        /* ignore */
      }
      trackEvent("sendoff_shown", { broker: slug });
      // The link opens in a new tab — this toast lands in the tab they
      // come back to.
      showToast(`Off to ${humanise(slug)} — your comparison stays right here`, "info", 3000);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // ── Return prompt ──────────────────────────────────────────────────
  useEffect(() => {
    if (pathname !== "/" && pathname !== "/compare") return;
    const stamp = readStamp();
    if (!stamp || stamp.answered) return;
    const age = Date.now() - stamp.ts;
    if (age < MIN_RETURN_GAP_MS || age > MAX_RETURN_AGE_MS) return;
    // Let the page settle before asking — the prompt is a guest, not a gate.
    const timer = setTimeout(() => setReturnPrompt(stamp), 1500);
    return () => clearTimeout(timer);
  }, [pathname]);

  const resolve = (answer: "opened" | "deciding" | "no" | "dismissed") => {
    if (returnPrompt) {
      trackEvent("return_after_go_answered", { broker: returnPrompt.slug, answer });
      try {
        localStorage.setItem(
          STAMP_KEY,
          JSON.stringify({ ...returnPrompt, answered: true } satisfies OutboundStamp),
        );
      } catch {
        /* ignore */
      }
    }
    if (answer === "opened") celebrateMilestone("decided_broker");
    setReturnPrompt(null);
  };

  if (!returnPrompt) return null;
  const name = humanise(returnPrompt.slug);

  return (
    <div
      role="region"
      aria-label={`How did it go with ${name}?`}
      className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          How did it go with {name}?
        </p>
        <button
          type="button"
          onClick={() => resolve("dismissed")}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => resolve("opened")}
          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Opened an account
        </button>
        <Link
          href={`/broker/${returnPrompt.slug}`}
          onClick={() => resolve("deciding")}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Still deciding
        </Link>
        <Link
          href="/compare"
          onClick={() => resolve("no")}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Not for me — keep comparing
        </Link>
      </div>
    </div>
  );
}
