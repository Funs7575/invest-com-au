"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import TableSkeleton from "@/components/TableSkeleton";
import InfoTip from "@/components/InfoTip";
import { Broker } from "@/lib/types";

type EditableFields = {
  affiliate_url?: string;
  cta_text?: string;
  layer?: string;
  commission_type?: string;
  commission_value?: string;
  estimated_epc?: string;
};

export default function AffiliateLinksPage() {
  const supabase = createClient();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [clickCounts, setClickCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditableFields>>({});
  const [activeTab, setActiveTab] = useState<"links" | "revenue" | "health">("links");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [brokersRes, clickStatsRes] = await Promise.all([
      supabase.from("brokers").select("*").order("name"),
      supabase.rpc("get_click_stats_by_broker"),
    ]);

    if (brokersRes.data) setBrokers(brokersRes.data);
    if (clickStatsRes.data) {
      const counts: Record<string, number> = {};
      clickStatsRes.data.forEach((r: { broker_slug: string; count: number }) => {
        counts[r.broker_slug] = Number(r.count);
      });
      setClickCounts(counts);
    }
    setLoading(false);
  }

  function handleFieldChange(slug: string, field: keyof EditableFields, value: string) {
    setEdits((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [field]: value },
    }));
  }

  function getFieldValue(broker: Broker, field: keyof EditableFields): string {
    if (edits[broker.slug] && edits[broker.slug][field] !== undefined) {
      return edits[broker.slug][field] as string;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (broker as any)[field];
    if (val === null || val === undefined) return "";
    return String(val);
  }

  async function handleSave(broker: Broker) {
    const updates = edits[broker.slug];
    if (!updates) return;

    const payload: Record<string, unknown> = {};
    if (activeTab === "links") {
      payload.affiliate_url = getFieldValue(broker, "affiliate_url");
      payload.cta_text = getFieldValue(broker, "cta_text");
      payload.layer = getFieldValue(broker, "layer");
    } else {
      payload.commission_type = getFieldValue(broker, "commission_type") || "cpa";
      payload.commission_value = parseFloat(getFieldValue(broker, "commission_value")) || 0;
      payload.estimated_epc = parseFloat(getFieldValue(broker, "estimated_epc")) || 0;
    }

    const { error } = await supabase
      .from("brokers")
      .update(payload)
      .eq("slug", broker.slug);

    if (error) {
      console.error("Error saving broker:", error);
      alert("Error saving: " + error.message);
    } else {
      setSavedSlug(broker.slug);
      setTimeout(() => setSavedSlug(null), 2000);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[broker.slug];
        return next;
      });
      fetchData();
    }
  }

  const totalBrokers = brokers.length;
  const withAffiliateUrl = brokers.filter(
    (b) => b.affiliate_url && b.affiliate_url.trim() !== ""
  ).length;
  const withoutAffiliateUrl = totalBrokers - withAffiliateUrl;
  const totalClicksAll = Object.values(clickCounts).reduce((s, c) => s + c, 0);
  const totalEstRevenue = brokers.reduce((sum, b) => {
    const clicks = clickCounts[b.slug] || 0;
    const epc = b.estimated_epc || 0;
    return sum + clicks * epc;
  }, 0);
  const avgEpc =
    brokers.filter((b) => b.estimated_epc && b.estimated_epc > 0).length > 0
      ? brokers
          .filter((b) => b.estimated_epc && b.estimated_epc > 0)
          .reduce((s, b) => s + (b.estimated_epc || 0), 0) /
        brokers.filter((b) => b.estimated_epc && b.estimated_epc > 0).length
      : 0;

  // Health stats
  const linksOk = brokers.filter((b) => b.link_status === "ok").length;
  const linksBroken = brokers.filter(
    (b) => b.link_status === "broken" || b.link_status === "server_error" || b.link_status === "timeout"
  ).length;
  const dealsExpiringSoon = brokers.filter((b) => {
    if (!b.deal || !b.deal_expiry) return false;
    const expiry = new Date(b.deal_expiry);
    const inWeek = new Date();
    inWeek.setDate(inWeek.getDate() + 7);
    return expiry <= inWeek && expiry >= new Date();
  }).length;

  const formatCurrency = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(2)}`;

  function getLinkStatusBadge(status?: string) {
    switch (status) {
      case "ok":
        return (
          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            Healthy
          </span>
        );
      case "broken":
        return (
          <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Broken
          </span>
        );
      case "server_error":
        return (
          <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Server Error
          </span>
        );
      case "timeout":
        return (
          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
            Timeout
          </span>
        );
      case "redirect":
        return (
          <span className="inline-flex items-center gap-1 text-blue-600 text-xs font-medium">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />
            Redirect
          </span>
        );
      case "no_url":
        return (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
            <span className="w-2 h-2 bg-slate-300 rounded-full" />
            No URL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
            <span className="w-2 h-2 bg-slate-300 rounded-full" />
            Unchecked
          </span>
        );
    }
  }

  function getDealExpiryBadge(broker: Broker) {
    if (!broker.deal || !broker.deal_expiry) return null;
    const expiry = new Date(broker.deal_expiry);
    const now = new Date();
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Expired</span>;
    }
    if (daysLeft <= 3) {
      return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{daysLeft}d left</span>;
    }
    if (daysLeft <= 7) {
      return <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{daysLeft}d left</span>;
    }
    return <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{daysLeft}d left</span>;
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Affiliate Links & Revenue</h1>
            <p className="text-sm text-slate-500 mt-1">Manage referral links and revenue tracking. Broken links = $0 revenue.</p>
          </div>
          <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab("links")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "links"
                  ? "bg-green-700 text-slate-900"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              Links & CTAs
            </button>
            <button
              onClick={() => setActiveTab("revenue")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "revenue"
                  ? "bg-green-700 text-slate-900"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              Revenue Config
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "health"
                  ? "bg-green-700 text-slate-900"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              Link Health
              {linksBroken > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {linksBroken}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-slate-500 text-sm">Total Brokers</p>
            <p className="text-2xl font-bold text-slate-900">{totalBrokers}</p>
          </div>
          {activeTab === "links" ? (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-500 text-sm">With Affiliate URL</p>
                <p className="text-2xl font-bold text-green-600">{withAffiliateUrl}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-500 text-sm">Without Affiliate URL</p>
                <p className="text-2xl font-bold text-red-600">{withoutAffiliateUrl}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-500 text-sm">Total Clicks</p>
                <p className="text-2xl font-bold text-amber-600">{totalClicksAll}</p>
              </div>
            </>
          ) : activeTab === "revenue" ? (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-500 text-sm">Est. Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalEstRevenue)}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-500 text-sm">Avg. EPC</p>
                <p className="text-2xl font-bold text-blue-600">${avgEpc.toFixed(2)}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-500 text-sm">Total Clicks</p>
                <p className="text-2xl font-bold text-amber-600">{totalClicksAll}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="text-slate-500 text-sm">Links Healthy</p>
                <p className="text-2xl font-bold text-green-600">{linksOk}</p>
              </div>
              <div className={`border rounded-lg p-4 ${linksBroken > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                <p className="text-slate-500 text-sm">Broken / Errored</p>
                <p className={`text-2xl font-bold ${linksBroken > 0 ? "text-red-600" : "text-slate-400"}`}>{linksBroken}</p>
              </div>
              <div className={`border rounded-lg p-4 ${dealsExpiringSoon > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
                <p className="text-slate-500 text-sm">Deals Expiring &le;7d</p>
                <p className={`text-2xl font-bold ${dealsExpiringSoon > 0 ? "text-amber-600" : "text-slate-400"}`}>{dealsExpiringSoon}</p>
              </div>
            </>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  {activeTab === "links" ? (
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Broker</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Affiliate URL</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600"><span title='Button text on broker cards, e.g. "Visit CommSec"'>CTA Text</span></th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600"><span title="Priority tier — higher numbers show first">Layer</span></th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Clicks</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  ) : activeTab === "revenue" ? (
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Broker</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Commission Type <InfoTip text="CPA = one-time payment per signup. RevShare = ongoing percentage of trades. Hybrid = both." /></th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Commission $</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Est. EPC ($) <InfoTip text="Estimated Earnings Per Click — average revenue per affiliate click. Get this from your affiliate program dashboard." /></th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Clicks</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Est. Revenue</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Broker</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Affiliate URL</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Link Health</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">HTTP Code</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Last Checked</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Deal Status</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Deal Expiry</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {brokers.map((broker) => {
                    const clicks = clickCounts[broker.slug] || 0;
                    const estRev = clicks * (broker.estimated_epc || 0);

                    return (
                      <tr key={broker.slug} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">
                          {broker.name}
                        </td>

                        {activeTab === "links" ? (
                          <>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={getFieldValue(broker, "affiliate_url")}
                                onChange={(e) =>
                                  handleFieldChange(broker.slug, "affiliate_url", e.target.value)
                                }
                                placeholder="https://..."
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={getFieldValue(broker, "cta_text")}
                                onChange={(e) =>
                                  handleFieldChange(broker.slug, "cta_text", e.target.value)
                                }
                                placeholder="e.g. Visit CommSec"
                                className="w-full bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={getFieldValue(broker, "layer")}
                                onChange={(e) =>
                                  handleFieldChange(broker.slug, "layer", e.target.value)
                                }
                                placeholder="e.g. 1"
                                className="w-24 bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-amber-600 font-semibold text-sm">{clicks}</span>
                            </td>
                            <td className="px-4 py-3">
                              {broker.affiliate_url && broker.affiliate_url.trim() !== "" ? (
                                <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-500 text-sm">
                                  <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
                                  Missing
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSave(broker)}
                                  disabled={!edits[broker.slug]}
                                  className="px-3 py-1 bg-amber-500 text-black text-sm font-medium rounded hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  Save
                                </button>
                                {savedSlug === broker.slug && (
                                  <span className="text-green-600 text-sm">Saved!</span>
                                )}
                              </div>
                            </td>
                          </>
                        ) : activeTab === "revenue" ? (
                          <>
                            <td className="px-4 py-3">
                              <select
                                value={getFieldValue(broker, "commission_type") || "cpa"}
                                onChange={(e) =>
                                  handleFieldChange(broker.slug, "commission_type", e.target.value)
                                }
                                className="bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                              >
                                <option value="cpa">CPA</option>
                                <option value="revshare">RevShare</option>
                                <option value="hybrid">Hybrid</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={getFieldValue(broker, "commission_value")}
                                onChange={(e) =>
                                  handleFieldChange(broker.slug, "commission_value", e.target.value)
                                }
                                placeholder="0.00"
                                className="w-24 bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={getFieldValue(broker, "estimated_epc")}
                                onChange={(e) =>
                                  handleFieldChange(broker.slug, "estimated_epc", e.target.value)
                                }
                                placeholder="0.00"
                                className="w-24 bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-amber-600 font-semibold text-sm">{clicks}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-emerald-600 font-semibold text-sm">
                                {formatCurrency(estRev)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSave(broker)}
                                  disabled={!edits[broker.slug]}
                                  className="px-3 py-1 bg-amber-500 text-black text-sm font-medium rounded hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  Save
                                </button>
                                {savedSlug === broker.slug && (
                                  <span className="text-green-600 text-sm">Saved!</span>
                                )}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">
                              <span className="text-xs text-slate-500 font-mono truncate block max-w-[200px]" title={broker.affiliate_url || ""}>
                                {broker.affiliate_url || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {getLinkStatusBadge(broker.link_status)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-slate-600 font-mono">
                                {broker.link_status_code ?? "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-slate-500">
                                {broker.link_last_checked
                                  ? new Date(broker.link_last_checked).toLocaleDateString("en-AU", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Never"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {broker.deal ? (
                                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">No deal</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {broker.deal_expiry ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-600">
                                    {new Date(broker.deal_expiry).toLocaleDateString("en-AU", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                  {getDealExpiryBadge(broker)}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">No expiry</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
