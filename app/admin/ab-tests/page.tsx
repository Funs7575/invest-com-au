"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import TableSkeleton from "@/components/TableSkeleton";

interface ABTest {
  id: number;
  name: string;
  test_type: string;
  page: string;
  status: string;
  variant_a: Record<string, string>;
  variant_b: Record<string, string>;
  traffic_split: number;
  impressions_a: number;
  impressions_b: number;
  clicks_a: number;
  clicks_b: number;
  conversions_a: number;
  conversions_b: number;
  winner: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const TEST_TYPES = [
  { value: "cta_copy", label: "CTA Copy" },
  { value: "cta_color", label: "CTA Color" },
  { value: "cta_placement", label: "CTA Placement" },
  { value: "layout", label: "Layout" },
  { value: "redirect_vs_apply", label: "Redirect vs Apply" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  running: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
};

/** Calculate z-score for two proportions */
function calculateSignificance(
  impressionsA: number,
  clicksA: number,
  impressionsB: number,
  clicksB: number
): { z: number; confidence: string; significant: boolean; winner: "a" | "b" | null } {
  if (impressionsA < 30 || impressionsB < 30) {
    return { z: 0, confidence: "Insufficient data", significant: false, winner: null };
  }

  const pA = clicksA / impressionsA;
  const pB = clicksB / impressionsB;
  const pPooled = (clicksA + clicksB) / (impressionsA + impressionsB);

  if (pPooled === 0 || pPooled === 1) {
    return { z: 0, confidence: "No variance", significant: false, winner: null };
  }

  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / impressionsA + 1 / impressionsB));
  if (se === 0) {
    return { z: 0, confidence: "No variance", significant: false, winner: null };
  }

  const z = (pA - pB) / se;
  const absZ = Math.abs(z);

  let confidence: string;
  let significant = false;

  if (absZ >= 2.58) {
    confidence = "99%";
    significant = true;
  } else if (absZ >= 1.96) {
    confidence = "95%";
    significant = true;
  } else if (absZ >= 1.645) {
    confidence = "90%";
    significant = false;
  } else {
    confidence = `${Math.round((1 - 2 * (1 - normalCDF(absZ))) * 100)}%`;
    significant = false;
  }

  const winner: "a" | "b" | null = significant ? (pA > pB ? "a" : "b") : null;

  return { z, confidence, significant, winner };
}

/** Approximate normal CDF using Abramowitz & Stegun */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

export default function ABTestsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New test form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("cta_copy");
  const [formPage, setFormPage] = useState("/compare");
  const [formSplit, setFormSplit] = useState(50);
  const [formVariantA, setFormVariantA] = useState('{"text": "Open Free Account", "color": "amber-600"}');
  const [formVariantB, setFormVariantB] = useState('{"text": "Visit Site", "color": "blue-600"}');

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("site_ab_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast("Error loading A/B tests: " + error.message, "error");
    } else {
      setTests((data as ABTest[]) || []);
    }
    setLoading(false);
  }

  async function createTest() {
    // Validate JSON
    let variantA: Record<string, string>;
    let variantB: Record<string, string>;
    try {
      variantA = JSON.parse(formVariantA);
      variantB = JSON.parse(formVariantB);
    } catch {
      toast("Invalid JSON in variant configuration", "error");
      return;
    }

    if (!formName.trim()) {
      toast("Test name is required", "error");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("site_ab_tests").insert({
      name: formName.trim(),
      test_type: formType,
      page: formPage,
      variant_a: variantA,
      variant_b: variantB,
      traffic_split: formSplit,
      status: "draft",
    });

    if (error) {
      toast("Error creating test: " + error.message, "error");
    } else {
      toast("A/B test created", "success");
      setShowForm(false);
      setFormName("");
      setFormVariantA('{"text": "Open Free Account", "color": "amber-600"}');
      setFormVariantB('{"text": "Visit Site", "color": "blue-600"}');
      fetchTests();
    }
    setSaving(false);
  }

  async function updateStatus(testId: number, newStatus: string) {
    setSaving(true);
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "running" && !tests.find((t) => t.id === testId)?.start_date) {
      updateData.start_date = new Date().toISOString();
    }
    if (newStatus === "completed") {
      updateData.end_date = new Date().toISOString();
    }

    const { error } = await supabase
      .from("site_ab_tests")
      .update(updateData)
      .eq("id", testId);

    if (error) {
      toast("Error updating status: " + error.message, "error");
    } else {
      toast(`Test ${newStatus}`, "success");
      fetchTests();
    }
    setSaving(false);
  }

  async function declareWinner(testId: number, winner: "a" | "b") {
    setSaving(true);
    const { error } = await supabase
      .from("site_ab_tests")
      .update({
        winner,
        status: "completed",
        end_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", testId);

    if (error) {
      toast("Error declaring winner: " + error.message, "error");
    } else {
      toast(`Variant ${winner.toUpperCase()} declared winner`, "success");
      fetchTests();
    }
    setSaving(false);
  }

  return (
    <AdminShell title="A/B Tests" subtitle="Manage comparison table CTA experiments">
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">A/B Tests</h1>
            <p className="text-sm text-slate-500 mt-1">Test CTA variations on the comparison table to optimize click-through rates.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? "Cancel" : "+ New Test"}
          </button>
        </div>

        {/* New Test Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Create New A/B Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Test Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. CTA Copy Test - April 2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Test Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  {TEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Page</label>
                <input
                  type="text"
                  value={formPage}
                  onChange={(e) => setFormPage(e.target.value)}
                  placeholder="/compare"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Traffic Split (% to Variant A)</label>
                <input
                  type="number"
                  value={formSplit}
                  onChange={(e) => setFormSplit(Number(e.target.value))}
                  min={1}
                  max={99}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Variant A (JSON)</label>
                <textarea
                  value={formVariantA}
                  onChange={(e) => setFormVariantA(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Variant B (JSON)</label>
                <textarea
                  value={formVariantB}
                  onChange={(e) => setFormVariantB(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={createTest}
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Test"}
              </button>
            </div>
          </div>
        )}

        {/* Tests List */}
        {loading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : tests.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-lg font-medium">No A/B tests yet</p>
            <p className="text-sm mt-1">Create your first test to start optimizing CTAs.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => {
              const rateA = test.impressions_a > 0 ? (test.clicks_a / test.impressions_a) * 100 : 0;
              const rateB = test.impressions_b > 0 ? (test.clicks_b / test.impressions_b) * 100 : 0;
              const stats = calculateSignificance(
                test.impressions_a,
                test.clicks_a,
                test.impressions_b,
                test.clicks_b
              );

              return (
                <div key={test.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  {/* Test Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{test.name}</h3>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[test.status] || STATUS_COLORS.draft}`}>
                          {test.status}
                        </span>
                        {test.winner && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Winner: {test.winner.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {TEST_TYPES.find((t) => t.value === test.test_type)?.label || test.test_type}
                        {" "}&middot;{" "}Page: {test.page}
                        {" "}&middot;{" "}Split: {test.traffic_split}% / {100 - test.traffic_split}%
                        {test.start_date && <> &middot; Started: {new Date(test.start_date).toLocaleDateString()}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.status === "draft" && (
                        <button
                          onClick={() => updateStatus(test.id, "running")}
                          disabled={saving}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          Start
                        </button>
                      )}
                      {test.status === "running" && (
                        <button
                          onClick={() => updateStatus(test.id, "paused")}
                          disabled={saving}
                          className="px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                          Pause
                        </button>
                      )}
                      {test.status === "paused" && (
                        <button
                          onClick={() => updateStatus(test.id, "running")}
                          disabled={saving}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          Resume
                        </button>
                      )}
                      {(test.status === "running" || test.status === "paused") && (
                        <button
                          onClick={() => updateStatus(test.id, "completed")}
                          disabled={saving}
                          className="px-3 py-1.5 bg-slate-600 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Variant Config Preview */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Variant A ({test.traffic_split}%)</p>
                      <code className="text-xs text-slate-700 break-all">{JSON.stringify(test.variant_a)}</code>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Variant B ({100 - test.traffic_split}%)</p>
                      <code className="text-xs text-slate-700 break-all">{JSON.stringify(test.variant_b)}</code>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Variant</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Impressions</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Clicks</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">CTR</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Conversions</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">Winner?</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={`border-b border-slate-100 ${stats.winner === "a" ? "bg-emerald-50/50" : ""}`}>
                          <td className="py-2 px-3 font-semibold">A</td>
                          <td className="py-2 px-3 text-right tabular-nums">{test.impressions_a.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{test.clicks_a.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{rateA.toFixed(2)}%</td>
                          <td className="py-2 px-3 text-right tabular-nums">{test.conversions_a.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">
                            {stats.winner === "a" && <span className="text-emerald-600 font-bold">&#10003;</span>}
                          </td>
                        </tr>
                        <tr className={`${stats.winner === "b" ? "bg-emerald-50/50" : ""}`}>
                          <td className="py-2 px-3 font-semibold">B</td>
                          <td className="py-2 px-3 text-right tabular-nums">{test.impressions_b.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{test.clicks_b.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-medium">{rateB.toFixed(2)}%</td>
                          <td className="py-2 px-3 text-right tabular-nums">{test.conversions_b.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">
                            {stats.winner === "b" && <span className="text-emerald-600 font-bold">&#10003;</span>}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Statistical Significance */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stats.significant ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        Confidence: {stats.confidence}
                      </span>
                      {stats.z !== 0 && (
                        <span className="text-xs text-slate-400">z = {stats.z.toFixed(3)}</span>
                      )}
                      {stats.significant && stats.winner && !test.winner && (
                        <span className="text-xs font-medium text-emerald-700">
                          Recommendation: Variant {stats.winner.toUpperCase()} is winning
                          ({stats.winner === "a" ? rateA.toFixed(2) : rateB.toFixed(2)}% vs {stats.winner === "a" ? rateB.toFixed(2) : rateA.toFixed(2)}% CTR)
                        </span>
                      )}
                    </div>
                    {stats.significant && !test.winner && test.status !== "completed" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => declareWinner(test.id, "a")}
                          disabled={saving}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Declare A Winner
                        </button>
                        <button
                          onClick={() => declareWinner(test.id, "b")}
                          disabled={saving}
                          className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Declare B Winner
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
