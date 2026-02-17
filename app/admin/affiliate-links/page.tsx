"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
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
  const [activeTab, setActiveTab] = useState<"links" | "revenue">("links");

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

  const formatCurrency = (val: number) =>
    val >= 1000 ? `$${(val / 1000).toFixed(1)}k` : `$${val.toFixed(2)}`;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Affiliate Links & Revenue</h1>
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
          ) : (
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
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading brokers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  {activeTab === "links" ? (
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Broker</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Affiliate URL</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">CTA Text</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Layer</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Clicks</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Broker</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Commission Type</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Commission $</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Est. EPC ($)</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Clicks</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Est. Revenue</th>
                      <th className="px-4 py-3"></th>
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
                                placeholder="Visit Broker"
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
                                placeholder="Layer"
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
                          </>
                        ) : (
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
                          </>
                        )}

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
