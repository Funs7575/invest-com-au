"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

interface QuizWeight {
  id: string;
  broker_slug: string;
  goal_daily: number;
  goal_long: number;
  goal_smsf: number;
  experience_boost: number;
  budget_match: number;
  priority_weight: number;
  updated_at: string;
}

const WEIGHT_FIELDS: { key: keyof QuizWeight; label: string }[] = [
  { key: "goal_daily", label: "Goal: Daily" },
  { key: "goal_long", label: "Goal: Long" },
  { key: "goal_smsf", label: "Goal: SMSF" },
  { key: "experience_boost", label: "Exp. Boost" },
  { key: "budget_match", label: "Budget Match" },
  { key: "priority_weight", label: "Priority" },
];

interface SimResult {
  broker_slug: string;
  score: number;
}

export default function QuizWeightsPage() {
  const supabase = createClient();
  const [weights, setWeights] = useState<QuizWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [modified, setModified] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simGoal, setSimGoal] = useState("goal_long");
  const [simExperience, setSimExperience] = useState(1);
  const [simBudget, setSimBudget] = useState(1);
  const [simPriority, setSimPriority] = useState(1);
  const [simResults, setSimResults] = useState<SimResult[]>([]);

  useEffect(() => {
    fetchWeights();
  }, []);

  async function fetchWeights() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quiz_weights")
      .select("*")
      .order("broker_slug");
    if (error) {
      console.error("Error fetching quiz weights:", error);
    } else {
      setWeights(data || []);
    }
    setLoading(false);
  }

  function handleChange(id: string, field: keyof QuizWeight, value: number) {
    setWeights((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
    setModified((prev) => new Set(prev).add(id));
  }

  async function handleSaveRow(id: string) {
    const row = weights.find((w) => w.id === id);
    if (!row) return;

    setSaving(true);
    const { error } = await supabase
      .from("quiz_weights")
      .update({
        goal_daily: row.goal_daily,
        goal_long: row.goal_long,
        goal_smsf: row.goal_smsf,
        experience_boost: row.experience_boost,
        budget_match: row.budget_match,
        priority_weight: row.priority_weight,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving weight:", error);
      alert("Error saving: " + error.message);
    } else {
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
      setModified((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setSaving(false);
  }

  async function handleSaveAll() {
    if (modified.size === 0) return;

    setSaving(true);
    let errorCount = 0;

    for (const id of modified) {
      const row = weights.find((w) => w.id === id);
      if (!row) continue;

      const { error } = await supabase
        .from("quiz_weights")
        .update({
          goal_daily: row.goal_daily,
          goal_long: row.goal_long,
          goal_smsf: row.goal_smsf,
          experience_boost: row.experience_boost,
          budget_match: row.budget_match,
          priority_weight: row.priority_weight,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error saving weight for", row.broker_slug, error);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      setSuccessMessage(`All ${modified.size} row(s) saved successfully`);
      setModified(new Set());
    } else {
      setSuccessMessage(`Saved with ${errorCount} error(s)`);
    }
    setTimeout(() => setSuccessMessage(null), 3000);
    setSaving(false);
  }

  function runSimulation() {
    const results: SimResult[] = weights.map((w) => {
      const goalScore = w[simGoal as keyof QuizWeight] as number || 0;
      const score = goalScore + (w.experience_boost * simExperience) + (w.budget_match * simBudget) + (w.priority_weight * simPriority);
      return { broker_slug: w.broker_slug, score };
    });
    results.sort((a, b) => b.score - a.score);
    setSimResults(results);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Quiz Weights</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSimulator(!showSimulator)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 text-sm transition-colors"
            >
              {showSimulator ? "Hide Simulator" : "Simulate Quiz"}
            </button>
            {modified.size > 0 && (
              <span className="text-amber-600 text-sm">
                {modified.size} row(s) modified
              </span>
            )}
            <button
              onClick={handleSaveAll}
              disabled={modified.size === 0 || saving}
              className="px-4 py-2 bg-amber-500 text-black font-medium rounded hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Save All"}
            </button>
          </div>
        </div>

        {/* Quiz Simulator */}
        {showSimulator && (
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quiz Simulator</h2>
            <p className="text-sm text-slate-500 mb-4">Preview how brokers rank with different quiz inputs.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Goal</label>
                <select
                  value={simGoal}
                  onChange={(e) => setSimGoal(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                >
                  <option value="goal_daily">Daily Trading</option>
                  <option value="goal_long">Long-Term Investing</option>
                  <option value="goal_smsf">SMSF</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Experience (0-2)</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.5"
                  value={simExperience}
                  onChange={(e) => setSimExperience(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Budget (0-2)</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.5"
                  value={simBudget}
                  onChange={(e) => setSimBudget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Priority (0-2)</label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.5"
                  value={simPriority}
                  onChange={(e) => setSimPriority(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                />
              </div>
            </div>
            <button
              onClick={runSimulation}
              disabled={weights.length === 0}
              className="px-4 py-2 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 text-sm transition-colors disabled:opacity-40"
            >
              Run Simulation
            </button>

            {simResults.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Results (Top 5)</h3>
                <div className="space-y-2">
                  {simResults.slice(0, 5).map((r, i) => (
                    <div key={r.broker_slug} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-500"}`}>
                          #{i + 1}
                        </span>
                        <span className="text-sm text-slate-900 font-medium">{r.broker_slug}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{r.score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading quiz weights...</div>
          ) : weights.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No quiz weights found. Add rows to the quiz_weights table to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap">
                      Broker Slug
                    </th>
                    {WEIGHT_FIELDS.map((f) => (
                      <th
                        key={f.key}
                        className="text-left px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap"
                      >
                        {f.label}
                      </th>
                    ))}
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {weights.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 ${
                        modified.has(row.id) ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-900 font-medium whitespace-nowrap">
                        {row.broker_slug}
                      </td>
                      {WEIGHT_FIELDS.map((f) => (
                        <td key={f.key} className="px-4 py-3">
                          <input
                            type="number"
                            step="0.1"
                            value={row[f.key] as number}
                            onChange={(e) =>
                              handleChange(
                                row.id,
                                f.key,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-20 bg-white border border-slate-300 text-slate-900 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-amber-500"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveRow(row.id)}
                            disabled={!modified.has(row.id) || saving}
                            className="px-3 py-1 bg-amber-500 text-black text-sm font-medium rounded hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            Save
                          </button>
                          {savedId === row.id && (
                            <span className="text-green-600 text-sm">Saved!</span>
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
