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

export default function QuizWeightsPage() {
  const supabase = createClient();
  const [weights, setWeights] = useState<QuizWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [modified, setModified] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Quiz Weights</h1>
          <div className="flex items-center gap-3">
            {modified.size > 0 && (
              <span className="text-amber-400 text-sm">
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

        {successMessage && (
          <div className="bg-green-900/50 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading quiz weights...</div>
          ) : weights.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No quiz weights found. Add rows to the quiz_weights table to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300 whitespace-nowrap">
                      Broker Slug
                    </th>
                    {WEIGHT_FIELDS.map((f) => (
                      <th
                        key={f.key}
                        className="text-left px-4 py-3 text-sm font-medium text-slate-300 whitespace-nowrap"
                      >
                        {f.label}
                      </th>
                    ))}
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {weights.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-700/30 ${
                        modified.has(row.id) ? "bg-amber-500/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
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
                            className="w-20 bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-amber-500"
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
