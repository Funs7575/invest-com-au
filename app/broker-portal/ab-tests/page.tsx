"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import type { ABTest } from "@/lib/types";

const TEST_TYPES = [
  { value: "cta_text", label: "CTA Text", placeholder_a: "Open Account", placeholder_b: "Start Trading Free" },
  { value: "deal_text", label: "Deal Text", placeholder_a: "$0 brokerage for 30 days", placeholder_b: "Free trades on your first 5 orders" },
  { value: "banner", label: "Banner Image", placeholder_a: "https://...", placeholder_b: "https://..." },
  { value: "landing_page", label: "Landing Page URL", placeholder_a: "https://broker.com/offer-a", placeholder_b: "https://broker.com/offer-b" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  running: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
};

export default function ABTestsPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [brokerSlug, setBrokerSlug] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  // Create form
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("cta_text");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [split, setSplit] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!account) return;

      setBrokerSlug(account.broker_slug);

      const { data } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false });

      setTests((data || []) as ABTest[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("ab_tests").insert({
      broker_slug: brokerSlug,
      name,
      type,
      status: "draft",
      variant_a: { value: variantA },
      variant_b: { value: variantB },
      traffic_split: split,
    });

    if (error) {
      toast("Failed to create test", "error");
    } else {
      toast("A/B test created", "success");
      // Reload
      const { data } = await supabase
        .from("ab_tests")
        .select("*")
        .eq("broker_slug", brokerSlug)
        .order("created_at", { ascending: false });
      setTests((data || []) as ABTest[]);
      setShowCreate(false);
      setName("");
      setVariantA("");
      setVariantB("");
    }
    setSaving(false);
  };

  const updateStatus = async (id: number, status: string) => {
    const supabase = createClient();
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "running") updates.start_date = new Date().toISOString();
    if (status === "completed") updates.end_date = new Date().toISOString();

    await supabase.from("ab_tests").update(updates).eq("id", id);
    setTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } as ABTest : t));
    toast(`Test ${status}`, "success");
  };

  const declareWinner = async (id: number, winner: "a" | "b") => {
    const supabase = createClient();
    await supabase.from("ab_tests").update({
      winner,
      status: "completed",
      end_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    setTests(prev => prev.map(t => t.id === id ? { ...t, winner, status: "completed" as const } : t));
    toast(`Variant ${winner.toUpperCase()} declared winner`, "success");
  };

  const getWinnerStats = (test: ABTest) => {
    const ctrA = test.impressions_a > 0 ? (test.clicks_a / test.impressions_a) * 100 : 0;
    const ctrB = test.impressions_b > 0 ? (test.clicks_b / test.impressions_b) * 100 : 0;
    const convA = test.clicks_a > 0 ? (test.conversions_a / test.clicks_a) * 100 : 0;
    const convB = test.clicks_b > 0 ? (test.conversions_b / test.clicks_b) * 100 : 0;
    return { ctrA, ctrB, convA, convB };
  };

  const currentType = TEST_TYPES.find(t => t.value === type);

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">A/B Tests</h1>
          <p className="text-sm text-slate-500">Test different messaging to optimize conversions</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
          <Icon name="plus" size={14} />
          New Test
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4" style={{ animation: "resultCardIn 0.3s ease-out" }}>
          <h3 className="font-bold text-slate-900">Create A/B Test</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Test Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              placeholder="e.g. CTA Copy March 2024" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Test Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TEST_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    type === t.value ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900" : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <p className="text-sm font-bold text-slate-900">{t.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Variant A <span className="text-xs text-slate-400">(Control)</span>
              </label>
              <input type="text" value={variantA} onChange={(e) => setVariantA(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder={currentType?.placeholder_a} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Variant B <span className="text-xs text-slate-400">(Challenger)</span>
              </label>
              <input type="text" value={variantB} onChange={(e) => setVariantB(e.target.value)} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
                placeholder={currentType?.placeholder_b} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Traffic Split: {split}% / {100 - split}%</label>
            <input type="range" min={10} max={90} step={5} value={split} onChange={(e) => setSplit(Number(e.target.value))}
              className="w-full accent-slate-900" />
            <div className="flex justify-between text-xs text-slate-400">
              <span>Variant A: {split}%</span>
              <span>Variant B: {100 - split}%</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
              {saving ? "Creating..." : "Create Test"}
            </button>
          </div>
        </form>
      )}

      {/* Tests list */}
      {tests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <Icon name="git-branch" size={20} className="text-purple-500" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No A/B tests yet</p>
          <p className="text-xs text-slate-400 mb-4">Create your first test to optimize your messaging.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(test => {
            const { ctrA, ctrB, convA, convB } = getWinnerStats(test);
            const totalImp = test.impressions_a + test.impressions_b;
            const totalClicks = test.clicks_a + test.clicks_b;

            return (
              <div key={test.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{test.name}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[test.status]}`}>
                        {test.status.replace("_", " ")}
                      </span>
                      {test.winner && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          Winner: {test.winner.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {TEST_TYPES.find(t => t.value === test.type)?.label} · Split {test.traffic_split}/{100 - test.traffic_split}
                      {test.start_date && ` · Started ${new Date(test.start_date).toLocaleDateString("en-AU")}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {test.status === "draft" && (
                      <button onClick={() => updateStatus(test.id, "running")}
                        className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                        Start
                      </button>
                    )}
                    {test.status === "running" && (
                      <>
                        <button onClick={() => updateStatus(test.id, "paused")}
                          className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
                          Pause
                        </button>
                        <button onClick={() => updateStatus(test.id, "completed")}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                          End
                        </button>
                      </>
                    )}
                    {test.status === "paused" && (
                      <button onClick={() => updateStatus(test.id, "running")}
                        className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                        Resume
                      </button>
                    )}
                  </div>
                </div>

                {/* Variants comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-lg border p-4 ${test.winner === "a" ? "border-green-300 bg-green-50/50" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">A</span>
                      <span className="text-xs text-slate-500 font-medium">Control</span>
                      {test.winner === "a" && <span className="text-xs text-green-700 font-bold">🏆 Winner</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-2 break-words">
                      {(test.variant_a as Record<string, string>)?.value || "—"}
                    </p>
                    <div className="space-y-1 text-xs text-slate-500">
                      <p>Impressions: <span className="font-bold text-slate-700">{test.impressions_a.toLocaleString()}</span></p>
                      <p>Clicks: <span className="font-bold text-slate-700">{test.clicks_a.toLocaleString()}</span></p>
                      <p>CTR: <span className="font-bold text-slate-700">{ctrA.toFixed(2)}%</span></p>
                      <p>Conversions: <span className="font-bold text-slate-700">{test.conversions_a}</span></p>
                      <p>Conv Rate: <span className="font-bold text-slate-700">{convA.toFixed(2)}%</span></p>
                    </div>
                  </div>
                  <div className={`rounded-lg border p-4 ${test.winner === "b" ? "border-green-300 bg-green-50/50" : "border-slate-200"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">B</span>
                      <span className="text-xs text-slate-500 font-medium">Challenger</span>
                      {test.winner === "b" && <span className="text-xs text-green-700 font-bold">🏆 Winner</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-2 break-words">
                      {(test.variant_b as Record<string, string>)?.value || "—"}
                    </p>
                    <div className="space-y-1 text-xs text-slate-500">
                      <p>Impressions: <span className="font-bold text-slate-700">{test.impressions_b.toLocaleString()}</span></p>
                      <p>Clicks: <span className="font-bold text-slate-700">{test.clicks_b.toLocaleString()}</span></p>
                      <p>CTR: <span className="font-bold text-slate-700">{ctrB.toFixed(2)}%</span></p>
                      <p>Conversions: <span className="font-bold text-slate-700">{test.conversions_b}</span></p>
                      <p>Conv Rate: <span className="font-bold text-slate-700">{convB.toFixed(2)}%</span></p>
                    </div>
                  </div>
                </div>

                {/* Stats summary & winner declaration */}
                {totalImp > 0 && (
                  <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">
                      Total: {totalImp.toLocaleString()} impressions, {totalClicks.toLocaleString()} clicks
                    </div>
                    {!test.winner && (test.status === "running" || test.status === "paused") && (
                      <div className="flex gap-2">
                        <button onClick={() => declareWinner(test.id, "a")}
                          className="px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                          A Wins
                        </button>
                        <button onClick={() => declareWinner(test.id, "b")}
                          className="px-3 py-1 text-xs font-bold bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors">
                          B Wins
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
