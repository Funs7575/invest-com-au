"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * CPL partner lead dashboard.
 *
 * Auth model: the partner's API key (the same one their integration POSTs
 * to /api/partner/leads) — entered once, held in sessionStorage only
 * (cleared when the tab closes; deliberately NOT localStorage, the key is
 * a billing credential). All data comes from /api/partner/leads/analytics,
 * which scopes every row to that key's partner_id server-side.
 */

const KEY_STORAGE = "iv_partner_api_key";

interface Analytics {
  partner: { name: string; account: "managed" | "legacy" };
  totals: {
    delivered: number;
    responded: number;
    responded_within_24h: number;
    response_within_24h_pct: number;
    converted: number;
    conversion_pct: number;
    billed_cents: number;
  };
  by_status: Record<string, number>;
  by_pipeline_stage: Record<string, number>;
  recent_leads: {
    id: number;
    created_at: string | null;
    name: string;
    email: string;
    status: string | null;
    pipeline_stage: string;
    responded_at: string | null;
    advisor_type: string | null;
  }[];
}

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  proposal_sent: "Proposal sent",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

function formatAud(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function toCsv(leads: Analytics["recent_leads"]): string {
  const header = "id,created_at,name,email,status,pipeline_stage,responded_at,advisor_type";
  const rows = leads.map((l) =>
    [l.id, l.created_at ?? "", l.name, l.email, l.status ?? "", l.pipeline_stage, l.responded_at ?? "", l.advisor_type ?? ""]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header, ...rows].join("\n");
}

export default function PartnerLeadsDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [connectedKey, setConnectedKey] = useState<string | null>(null);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/leads/analytics?api_key=${encodeURIComponent(key)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not load your dashboard.");
        setData(null);
        if (res.status === 401) {
          sessionStorage.removeItem(KEY_STORAGE);
          setConnectedKey(null);
        }
        return;
      }
      setData(json as Analytics);
      setConnectedKey(key);
      sessionStorage.setItem(KEY_STORAGE, key);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY_STORAGE);
    if (saved) void load(saved);
  }, [load]);

  const disconnect = () => {
    sessionStorage.removeItem(KEY_STORAGE);
    setConnectedKey(null);
    setData(null);
    setApiKey("");
  };

  const downloadCsv = () => {
    if (!data) return;
    const blob = new Blob([toCsv(data.recent_leads)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invest-partner-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Connect screen ── */
  if (!connectedKey || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-md px-4 py-16">
          <h1 className="text-2xl font-bold text-slate-900">Partner lead dashboard</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Track the leads your integration delivers to Invest.com.au — advisor response times,
            conversion funnel, and billing. Sign in with your partner API key.
          </p>

          <form
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (apiKey.trim()) void load(apiKey.trim());
            }}
          >
            <label htmlFor="partner-api-key" className="block text-xs font-bold uppercase tracking-wide text-slate-600">
              Partner API key
            </label>
            <input
              id="partner-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pk_live_…"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            {error && (
              <p role="alert" className="mt-2 text-xs font-semibold text-red-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Connecting…" : "View my dashboard"}
            </button>
            <p className="mt-3 text-[0.65rem] leading-relaxed text-slate-500">
              Your key stays in this browser tab only. Don&apos;t have one yet? Email{" "}
              <a href="mailto:partners@invest.com.au" className="underline">
                partners@invest.com.au
              </a>
              .
            </p>
          </form>
        </div>
      </div>
    );
  }

  /* ── Dashboard ── */
  const { totals } = data;
  const stageOrder = ["new", "contacted", "proposal_sent", "negotiating", "won", "lost"];
  const maxStage = Math.max(1, ...stageOrder.map((s) => data.by_pipeline_stage[s] ?? 0));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700">Partner dashboard</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.partner.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Lead delivery and advisor performance, updated live.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void load(connectedKey)}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              onClick={disconnect}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Leads delivered", value: totals.delivered.toLocaleString("en-AU") },
            { label: "Responded < 24h", value: `${totals.response_within_24h_pct}%`, sub: `${totals.responded_within_24h} of ${totals.delivered}` },
            { label: "Converted (won)", value: `${totals.conversion_pct}%`, sub: `${totals.converted} leads` },
            { label: "Billed value", value: formatAud(totals.billed_cents) },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{kpi.value}</p>
              {kpi.sub && <p className="mt-0.5 text-xs text-slate-500">{kpi.sub}</p>}
            </div>
          ))}
        </div>

        {/* Pipeline funnel */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800">Pipeline</h2>
          <div className="mt-3 space-y-2">
            {stageOrder.map((stage) => {
              const count = data.by_pipeline_stage[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-semibold text-slate-600">{STAGE_LABELS[stage] ?? stage}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-md bg-slate-100" role="img" aria-label={`${STAGE_LABELS[stage] ?? stage}: ${count} leads`}>
                    <div
                      className={`h-full rounded-md ${stage === "won" ? "bg-emerald-500" : stage === "lost" ? "bg-slate-300" : "bg-amber-400"}`}
                      style={{ width: `${Math.max(count > 0 ? 4 : 0, (count / maxStage) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-bold text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent leads */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800">Recent leads</h2>
            <button
              onClick={downloadCsv}
              disabled={data.recent_leads.length === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          {data.recent_leads.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm font-semibold text-slate-700">No leads delivered yet</p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                POST leads to <code className="rounded bg-slate-100 px-1 py-0.5">/api/partner/leads</code> with your API
                key and they&apos;ll appear here within seconds.
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    {["Date", "Name", "Email", "Advisor type", "Stage", "Responded"].map((h) => (
                      <th key={h} className="py-2 pr-4 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent_leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4 text-xs text-slate-600">{formatDate(lead.created_at)}</td>
                      <td className="py-2.5 pr-4 text-xs font-semibold text-slate-800">{lead.name}</td>
                      <td className="py-2.5 pr-4 text-xs text-slate-600">{lead.email}</td>
                      <td className="py-2.5 pr-4 text-xs text-slate-600">{lead.advisor_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
                            lead.pipeline_stage === "won"
                              ? "bg-emerald-100 text-emerald-800"
                              : lead.pipeline_stage === "lost"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {STAGE_LABELS[lead.pipeline_stage] ?? lead.pipeline_stage}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-600">
                        {lead.responded_at ? formatDate(lead.responded_at) : "Awaiting"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[0.65rem] leading-relaxed text-slate-500">
          Showing your {Math.min(data.recent_leads.length, 50)} most recent leads · Questions or volume changes:{" "}
          <a href="mailto:partners@invest.com.au" className="underline">
            partners@invest.com.au
          </a>
        </p>
      </div>
    </div>
  );
}
