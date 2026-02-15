"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { Broker } from "@/lib/types";

export default function AffiliateLinksPage() {
  const supabase = createClient();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<string, { affiliate_url?: string; cta_text?: string; layer?: string }>
  >({});

  useEffect(() => {
    fetchBrokers();
  }, []);

  async function fetchBrokers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("brokers")
      .select("*")
      .order("name");
    if (error) {
      console.error("Error fetching brokers:", error);
    } else {
      setBrokers(data || []);
    }
    setLoading(false);
  }

  function handleFieldChange(
    slug: string,
    field: "affiliate_url" | "cta_text" | "layer",
    value: string
  ) {
    setEdits((prev) => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        [field]: value,
      },
    }));
  }

  function getFieldValue(broker: Broker, field: "affiliate_url" | "cta_text" | "layer") {
    if (edits[broker.slug] && edits[broker.slug][field] !== undefined) {
      return edits[broker.slug][field] as string;
    }
    return (broker as any)[field] || "";
  }

  async function handleSave(broker: Broker) {
    const updates = edits[broker.slug];
    if (!updates) return;

    const { error } = await supabase
      .from("brokers")
      .update({
        affiliate_url: getFieldValue(broker, "affiliate_url"),
        cta_text: getFieldValue(broker, "cta_text"),
        layer: getFieldValue(broker, "layer"),
      })
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
      fetchBrokers();
    }
  }

  const totalBrokers = brokers.length;
  const withAffiliateUrl = brokers.filter(
    (b) => (b as any).affiliate_url && (b as any).affiliate_url.trim() !== ""
  ).length;
  const withoutAffiliateUrl = totalBrokers - withAffiliateUrl;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Affiliate Links</h1>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Total Brokers</p>
            <p className="text-2xl font-bold text-white">{totalBrokers}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">With Affiliate URL</p>
            <p className="text-2xl font-bold text-green-400">{withAffiliateUrl}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm">Without Affiliate URL</p>
            <p className="text-2xl font-bold text-red-400">{withoutAffiliateUrl}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading brokers...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">
                      Broker Name
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">
                      Affiliate URL
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">
                      CTA Text
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">
                      Layer
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {brokers.map((broker) => (
                    <tr key={broker.slug} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {broker.name}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={getFieldValue(broker, "affiliate_url")}
                          onChange={(e) =>
                            handleFieldChange(broker.slug, "affiliate_url", e.target.value)
                          }
                          placeholder="https://..."
                          className="w-full bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
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
                          className="w-full bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
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
                          className="w-24 bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {(broker as any).affiliate_url &&
                        (broker as any).affiliate_url.trim() !== "" ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-sm">
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
                            <span className="text-green-400 text-sm">Saved!</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
