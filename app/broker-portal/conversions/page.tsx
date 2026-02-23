"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";

interface ConversionRow {
  id: number;
  click_id: string | null;
  event_type: string;
  conversion_value_cents: number;
  source: string;
  campaign_id: number | null;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  opened: "Account Opened",
  funded: "Account Funded",
  first_trade: "First Trade",
  custom: "Custom",
};

const EVENT_COLORS: Record<string, string> = {
  opened: "bg-blue-100 text-blue-800",
  funded: "bg-green-100 text-green-800",
  first_trade: "bg-purple-100 text-purple-800",
  custom: "bg-slate-100 text-slate-700",
};

type DateRange = "7d" | "30d" | "90d" | "all";

export default function ConversionsPage() {
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<DateRange>("30d");
  const [brokerSlug, setBrokerSlug] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!account) return;

      setBrokerSlug(account.broker_slug);

      let query = supabase
        .from("conversion_events")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false })
        .limit(500);

      if (range !== "all") {
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte("created_at", since.toISOString());
      }

      const { data } = await query;
      setConversions((data || []) as ConversionRow[]);
      setLoading(false);
    };
    load();
  }, [range]);

  const totalConversions = conversions.length;
  const totalValue = conversions.reduce(
    (s, c) => s + (c.conversion_value_cents || 0),
    0
  );
  const funnelCounts = {
    opened: conversions.filter((c) => c.event_type === "opened").length,
    funded: conversions.filter((c) => c.event_type === "funded").length,
    first_trade: conversions.filter((c) => c.event_type === "first_trade")
      .length,
  };

  const handleExport = () => {
    const headers = ["ID", "Click ID", "Event Type", "Value", "Source", "Campaign ID", "Date"];
    const rows = conversions.map((c) => [
      String(c.id),
      c.click_id || "",
      c.event_type,
      `$${((c.conversion_value_cents || 0) / 100).toFixed(2)}`,
      c.source,
      c.campaign_id ? String(c.campaign_id) : "",
      new Date(c.created_at).toISOString(),
    ]);
    downloadCSV(`conversions-${brokerSlug}-${range}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Conversions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track outcomes reported via postback API.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={conversions.length === 0}
          className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {/* Date Range */}
      <div className="flex gap-2">
        {(["7d", "30d", "90d", "all"] as DateRange[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              range === r
                ? "bg-green-700 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {r === "all" ? "All Time" : r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Funnel KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
            Total
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {totalConversions}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
            Total Value
          </p>
          <p className="text-2xl font-extrabold text-green-700 mt-1">
            ${(totalValue / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-[0.65rem] text-blue-600 uppercase tracking-wider font-bold">
            Opened
          </p>
          <p className="text-2xl font-extrabold text-blue-800 mt-1">
            {funnelCounts.opened}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-[0.65rem] text-green-600 uppercase tracking-wider font-bold">
            Funded
          </p>
          <p className="text-2xl font-extrabold text-green-800 mt-1">
            {funnelCounts.funded}
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <p className="text-[0.65rem] text-purple-600 uppercase tracking-wider font-bold">
            First Trade
          </p>
          <p className="text-2xl font-extrabold text-purple-800 mt-1">
            {funnelCounts.first_trade}
          </p>
        </div>
      </div>

      {/* Funnel Visualization */}
      {totalConversions > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">
            Conversion Funnel
          </h3>
          <div className="flex items-end gap-4 h-32">
            {(["opened", "funded", "first_trade"] as const).map((stage) => {
              const count =
                funnelCounts[stage as keyof typeof funnelCounts] || 0;
              const pct =
                totalConversions > 0
                  ? Math.round((count / totalConversions) * 100)
                  : 0;
              const height = Math.max(pct, 5);
              return (
                <div
                  key={stage}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs font-bold text-slate-700">
                    {count}
                  </span>
                  <div
                    className={`w-full rounded-t ${
                      stage === "opened"
                        ? "bg-blue-400"
                        : stage === "funded"
                          ? "bg-green-400"
                          : "bg-purple-400"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[0.6rem] text-slate-500 text-center">
                    {EVENT_LABELS[stage]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-slate-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : conversions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-sm">
            No conversions recorded yet.
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Use the Postback API to report conversion events.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                  Date
                </th>
                <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                  Event
                </th>
                <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                  Click ID
                </th>
                <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                  Value
                </th>
                <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                  Campaign
                </th>
                <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {conversions.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        EVENT_COLORS[c.event_type] || EVENT_COLORS.custom
                      }`}
                    >
                      {EVENT_LABELS[c.event_type] || c.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {c.click_id ? c.click_id.slice(0, 8) + "..." : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {c.conversion_value_cents > 0
                      ? `$${(c.conversion_value_cents / 100).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.campaign_id ? `#${c.campaign_id}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 capitalize">
                    {c.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
