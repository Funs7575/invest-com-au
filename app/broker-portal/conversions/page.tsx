"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";
import CountUp from "@/components/CountUp";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";

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
  funded: "bg-emerald-100 text-emerald-800",
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
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {r === "all" ? "All Time" : r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Funnel KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 portal-stagger">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Icon name="bar-chart" size={12} className="text-slate-600" />
            </div>
            <p className="text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
              Total
            </p>
            <InfoTip text="Total conversion events received via your Postback API across all event types." />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            <CountUp end={totalConversions} duration={1000} />
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <Icon name="dollar-sign" size={12} className="text-emerald-600" />
            </div>
            <p className="text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
              Total Value
            </p>
            <InfoTip text="Sum of all conversion values reported. Set conversion_value_cents in your postback calls to track revenue." />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            <CountUp end={totalValue / 100} prefix="$" decimals={2} duration={1000} />
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 hover-lift">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <Icon name="clipboard-list" size={12} className="text-blue-600" />
            </div>
            <p className="text-[0.69rem] text-blue-600 uppercase tracking-wider font-bold">
              Opened
            </p>
            <InfoTip text="User created a brokerage account after clicking your ad. The first stage of the conversion funnel." />
          </div>
          <p className="text-2xl font-extrabold text-blue-800 mt-1">
            <CountUp end={funnelCounts.opened} duration={1000} />
          </p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 hover-lift">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <Icon name="wallet" size={12} className="text-emerald-600" />
            </div>
            <p className="text-[0.69rem] text-emerald-600 uppercase tracking-wider font-bold">
              Funded
            </p>
            <InfoTip text="User deposited money into their brokerage account. Indicates high-quality lead." />
          </div>
          <p className="text-2xl font-extrabold text-emerald-800 mt-1">
            <CountUp end={funnelCounts.funded} duration={1000} />
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 hover-lift">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
              <Icon name="trending-up" size={12} className="text-purple-600" />
            </div>
            <p className="text-[0.69rem] text-purple-600 uppercase tracking-wider font-bold">
              First Trade
            </p>
            <InfoTip text="User executed their first trade. The highest-value conversion event." />
          </div>
          <p className="text-2xl font-extrabold text-purple-800 mt-1">
            <CountUp end={funnelCounts.first_trade} duration={1000} />
          </p>
        </div>
      </div>

      {/* Funnel Visualization */}
      {totalConversions > 0 && (() => {
        const stages = [
          { key: "opened" as const, count: funnelCounts.opened, color: "bg-blue-400", label: EVENT_LABELS.opened },
          { key: "funded" as const, count: funnelCounts.funded, color: "bg-emerald-400", label: EVENT_LABELS.funded },
          { key: "first_trade" as const, count: funnelCounts.first_trade, color: "bg-purple-400", label: EVENT_LABELS.first_trade },
        ];
        // Width percentages for trapezoid shape
        const widths = [100, 72, 44];
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4">
              Conversion Funnel
            </h3>
            <div className="flex flex-col items-center gap-1 max-w-md mx-auto">
              {stages.map((stage, i) => {
                const topW = widths[i];
                const botW = widths[i + 1] || widths[i] * 0.6;
                const topInset = (100 - topW) / 2;
                const botInset = (100 - botW) / 2;
                const conversionRate = i > 0 && stages[i - 1].count > 0
                  ? Math.round((stage.count / stages[i - 1].count) * 100)
                  : null;

                return (
                  <div key={stage.key} className="w-full">
                    {conversionRate !== null && (
                      <div className="flex items-center justify-center gap-1 py-1">
                        <Icon name="trending-up" size={11} className="text-slate-400" />
                        <span className="text-[0.62rem] font-bold text-slate-400">{conversionRate}% conversion</span>
                      </div>
                    )}
                    <div
                      className={`${stage.color} h-14 flex items-center justify-center relative chart-bar-animate`}
                      style={{
                        clipPath: `polygon(${topInset}% 0%, ${100 - topInset}% 0%, ${100 - botInset}% 100%, ${botInset}% 100%)`,
                      }}
                    >
                      <div className="text-center text-white">
                        <span className="text-lg font-extrabold">{stage.count}</span>
                        <span className="text-[0.69rem] ml-1.5 opacity-80">{stage.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <Icon name="target" size={20} className="text-purple-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">
            No conversions recorded yet
          </p>
          <p className="text-slate-400 text-xs mb-4">
            Use the Postback API to report conversion events.
          </p>
          <Link
            href="/broker-portal/settings"
            className="inline-block px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
          >
            View API Key in Settings →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto portal-table-stagger">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
                  Date
                </th>
                <th className="px-4 py-3 text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
                  Event
                </th>
                <th className="px-4 py-3 text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
                  <span className="inline-flex items-center gap-1">Click ID <InfoTip text="Unique identifier linking this conversion back to the original ad click for attribution." /></span>
                </th>
                <th className="px-4 py-3 text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
                  Value
                </th>
                <th className="px-4 py-3 text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
                  Campaign
                </th>
                <th className="px-4 py-3 text-[0.69rem] text-slate-500 uppercase tracking-wider font-bold">
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
