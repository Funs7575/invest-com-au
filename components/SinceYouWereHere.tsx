"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readFeeMemory, writeFeeMemory, type FeeMemoryEntry } from "@/components/FeeMemoryTrigger";
import { trackEvent } from "@/lib/tracking";

interface FeeDelta {
  slug: string;
  name: string;
  from: number;
  to: number;
}

const MIN_AGE_MS = 24 * 60 * 60 * 1000; // only diff visits ≥1 day old
const MAX_SHOWN = 3;

/**
 * "Since you were here" (Northstar D10, anonymous slice): factual fee
 * changes on brokers the visitor actually looked at, diffed between the
 * value they saw (FeeMemoryTrigger) and the live value. Renders nothing
 * without a real change — the platform's memory never invents news.
 * Dismissing re-baselines the stored values so each change shows once.
 */
export default function SinceYouWereHere() {
  const [deltas, setDeltas] = useState<FeeDelta[]>([]);

  useEffect(() => {
    const memory = readFeeMemory();
    const stale = memory.filter(
      (e) => Date.now() - e.ts >= MIN_AGE_MS && typeof e.asx === "number",
    );
    if (stale.length === 0) return;

    const slugs = stale.map((e) => e.slug).slice(0, 10);
    let cancelled = false;
    fetch(`/api/brokers/fees?slugs=${slugs.join(",")}`)
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          brokers?: { slug: string; name: string; asx_fee_value: number | null }[];
        };
        const current = new Map((json.brokers ?? []).map((b) => [b.slug, b]));
        const found: FeeDelta[] = [];
        for (const entry of stale) {
          const live = current.get(entry.slug);
          if (!live || typeof live.asx_fee_value !== "number" || entry.asx == null) continue;
          if (live.asx_fee_value !== entry.asx) {
            found.push({ slug: entry.slug, name: entry.name || live.name, from: entry.asx, to: live.asx_fee_value });
          }
        }
        if (!cancelled && found.length > 0) {
          setDeltas(found.slice(0, MAX_SHOWN));
          trackEvent("delta_strip_shown", { changes: found.length });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (deltas.length === 0) return null;

  const rebaseline = () => {
    const memory = readFeeMemory();
    const updated: FeeMemoryEntry[] = memory.map((e) => {
      const d = deltas.find((x) => x.slug === e.slug);
      return d ? { ...e, asx: d.to, ts: Date.now() } : e;
    });
    writeFeeMemory(updated);
    setDeltas([]);
  };

  const dollars = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;

  return (
    <section
      aria-label="Changes since your last visit"
      className="container-custom mt-4"
    >
      <div className="rounded-2xl border border-blue-200 bg-blue-50 dark:bg-slate-800 dark:border-slate-700 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-800 dark:text-blue-300">
            Since you were here
          </p>
          <button
            type="button"
            onClick={rebaseline}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-blue-100 dark:hover:bg-slate-700"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="mt-1.5 space-y-1">
          {deltas.map((d) => (
            <li key={d.slug} className="text-sm text-slate-700 dark:text-slate-200">
              <span className="font-semibold">{d.name}</span>&apos;s ASX brokerage moved:{" "}
              <span className="tnum">{dollars(d.from)}</span> →{" "}
              <span className={`tnum font-semibold ${d.to < d.from ? "text-emerald-700" : "text-slate-900 dark:text-slate-100"}`}>
                {dollars(d.to)}
              </span>{" "}
              <Link
                href={`/broker/${d.slug}`}
                onClick={() => trackEvent("delta_strip_clicked", { broker: d.slug })}
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              >
                View →
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[0.65rem] text-slate-500 dark:text-slate-400">
          Factual change on platforms you viewed — general information only.
        </p>
      </div>
    </section>
  );
}
