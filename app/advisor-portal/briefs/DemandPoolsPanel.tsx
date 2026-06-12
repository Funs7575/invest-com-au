"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";

interface BudgetCell {
  band: string;
  count: number;
}

interface BudgetDistribution {
  total: number;
  cells: BudgetCell[] | null;
  suppressed: boolean;
}

interface PoolCard {
  poolId: number;
  templateKey: string;
  state: string;
  period: string;
  status: string;
  memberCount: number;
  minSize: number;
  distribution: BudgetDistribution;
  myOffer: { id: number; body: string; package_rate_band: string | null; status: string } | null;
  offerCount: number;
}

const BAND_LABELS: Record<string, string> = {
  under_500: "Under $500",
  "500_2k": "$500–$2k",
  "2k_5k": "$2k–$5k",
  "5k_10k": "$5k–$10k",
  "10k_plus": "$10k+",
  not_sure: "Budget TBD",
};

const RATE_BANDS = [
  "Under $1,000",
  "$1,000–$2,500",
  "$2,500–$5,000",
  "$5,000–$10,000",
  "$10,000+",
  "Quoted per client",
];

function templateLabel(key: string): string {
  return (BRIEF_TEMPLATE_LABELS as Record<string, string>)[key] ?? key.replace(/_/g, " ");
}

function PoolRow({ pool, onOffered }: { pool: PoolCard; onOffered: () => void }) {
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [rateBand, setRateBand] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitOffer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/advisor-auth/demand-pools/${pool.poolId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          package_rate_band: rateBand || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not submit your offer");
      setComposing(false);
      setBody("");
      setRateBand("");
      onOffered();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your offer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 px-3.5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800">
            {pool.memberCount} {pool.memberCount === 1 ? "person" : "people"} in {pool.state} want{" "}
            {templateLabel(pool.templateKey)} this month
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {pool.period.replace(/#\d+$/, "")} ·{" "}
            {pool.offerCount === 0
              ? "No offers yet"
              : `${pool.offerCount} offer${pool.offerCount === 1 ? "" : "s"} so far`}
            {pool.status === "offered" && " · live"}
          </p>
        </div>
        {pool.myOffer ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Your offer is in
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setComposing((v) => !v)}
            className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {composing ? "Cancel" : "Make a group offer"}
          </button>
        )}
      </div>

      {/* Anonymised budget distribution (suppressed below n=3). */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pool.distribution.suppressed || !pool.distribution.cells ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
            Budget mix hidden (small group)
          </span>
        ) : (
          pool.distribution.cells.map((c) => (
            <span
              key={c.band}
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
            >
              {BAND_LABELS[c.band] ?? c.band}: {c.count}
            </span>
          ))
        )}
      </div>

      {composing && !pool.myOffer && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="block text-xs font-semibold text-slate-700">
            Your group offer
            <textarea
              rows={3}
              maxLength={500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What you're offering this group — your package, availability, and how you work. The same offer goes to everyone; each person decides individually."
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
          <p className="mt-1 text-[11px] text-slate-400">{body.length} / 500</p>

          <label className="mt-2 block text-xs font-semibold text-slate-700">
            Package rate band <span className="font-normal text-slate-400">(your own pricing)</span>
            <select
              value={rateBand}
              onChange={(e) => setRateBand(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-normal"
            >
              <option value="">Select a band (optional)</option>
              {RATE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={busy || body.trim().length === 0}
              onClick={submitOffer}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit group offer"}
            </button>
            <p className="text-[11px] text-slate-400">
              Members are charged nothing. You&apos;re debited a discounted lead
              credit only when someone accepts.
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Group Briefs pool cards for the adviser inbox. Self-contained: fetches its
 * own data and renders NOTHING when the `demand_pools` flag is off (the GET
 * 404s) — fail-closed dormancy. Mirrors StandingOrdersPanel's posture.
 */
export default function DemandPoolsPanel() {
  const [pools, setPools] = useState<PoolCard[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-auth/demand-pools");
      // Flag off (404) or error → leave `pools` null so the panel renders
      // nothing (fail-closed). Only set state on a successful payload.
      if (!res.ok) return;
      setPools(((await res.json()) as { pools: PoolCard[] }).pools);
    } catch {
      /* fail quiet — the panel is additive on top of the inbox */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- on-mount data load; load() only setState()s after its first await (same pattern as StandingOrdersPanel)
    void load();
  }, [load]);

  // Render nothing until/unless the API returns pools (flag on + data).
  if (!pools) return null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <Icon name="users" className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">Group briefs — pooled demand</span>
            <span className="block text-xs text-slate-500">
              {pools.length === 0
                ? "No active pools matching you right now"
                : `${pools.length} pool${pools.length === 1 ? "" : "s"} — one group offer services everyone`}
            </span>
          </span>
        </span>
        <Icon
          name="chevron-down"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5">
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Several people with the same need this month are grouped into a pool.
            Post <strong>one</strong> group offer — your own package and availability —
            and every member decides individually whether to accept. Each acceptance
            unlocks that person&apos;s contact and opens a chat, debiting you a
            volume-discounted lead credit. Member identities are never shown; budget
            mixes below three people are hidden.
          </p>

          {pools.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
              No pools have reached the group size for your brief types yet. Check back
              soon — pools form as more people post similar requests this month.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {pools.map((pool) => (
                <PoolRow key={pool.poolId} pool={pool} onOffered={load} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
