"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Advisor } from "./types";

type ClientType = "individual" | "couple" | "family" | "business" | "smsf" | "retiree";
type OutcomeType = "wealth_growth" | "tax_saving" | "debt_reduction" | "retirement_planning" | "insurance" | "estate_planning" | "business_succession" | "other";
type Status = "draft" | "published";

type CaseStudy = {
  id: number;
  title: string;
  situation: string;
  approach: string;
  outcome: string;
  client_type: ClientType;
  outcome_type: OutcomeType;
  status: Status;
  created_at: string;
  updated_at: string;
};

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: "Individual",
  couple: "Couple",
  family: "Family",
  business: "Business",
  smsf: "SMSF",
  retiree: "Retiree",
};

const OUTCOME_TYPE_LABELS: Record<OutcomeType, string> = {
  wealth_growth: "Wealth Growth",
  tax_saving: "Tax Saving",
  debt_reduction: "Debt Reduction",
  retirement_planning: "Retirement Planning",
  insurance: "Insurance",
  estate_planning: "Estate Planning",
  business_succession: "Business Succession",
  other: "Other",
};

const CLIENT_TYPE_COLORS: Record<ClientType, string> = {
  individual: "bg-blue-100 text-blue-700",
  couple: "bg-violet-100 text-violet-700",
  family: "bg-emerald-100 text-emerald-700",
  business: "bg-amber-100 text-amber-700",
  smsf: "bg-orange-100 text-orange-700",
  retiree: "bg-teal-100 text-teal-700",
};

const OUTCOME_TYPE_COLORS: Record<OutcomeType, string> = {
  wealth_growth: "bg-emerald-100 text-emerald-700",
  tax_saving: "bg-amber-100 text-amber-700",
  debt_reduction: "bg-red-100 text-red-700",
  retirement_planning: "bg-blue-100 text-blue-700",
  insurance: "bg-indigo-100 text-indigo-700",
  estate_planning: "bg-purple-100 text-purple-700",
  business_succession: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-700",
};

type FormState = {
  title: string;
  situation: string;
  approach: string;
  outcome: string;
  client_type: ClientType;
  outcome_type: OutcomeType;
};

const EMPTY_FORM: FormState = {
  title: "",
  situation: "",
  approach: "",
  outcome: "",
  client_type: "individual",
  outcome_type: "wealth_growth",
};

type Props = { advisor: Advisor | null };

export default function CaseStudiesTab({ advisor }: Props) {
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!advisor) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/advisor-auth/case-studies");
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { caseStudies: CaseStudy[] };
          setCaseStudies(data.caseStudies);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [advisor, refreshKey]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (cs: CaseStudy) => {
    setEditingId(cs.id);
    setForm({
      title: cs.title,
      situation: cs.situation,
      approach: cs.approach,
      outcome: cs.outcome,
      client_type: cs.client_type,
      outcome_type: cs.outcome_type,
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const handleSave = async (status: Status) => {
    if (!form.title.trim() || !form.situation.trim() || !form.approach.trim() || !form.outcome.trim()) {
      setError("All fields are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let res: Response;
      if (editingId !== null) {
        res = await fetch(`/api/advisor-auth/case-studies/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, status }),
        });
      } else {
        res = await fetch("/api/advisor-auth/case-studies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, status }),
        });
      }
      if (res.ok) {
        closeForm();
        setRefreshKey((k) => k + 1);
      } else {
        const d = await res.json();
        setError((d as { error?: string }).error ?? "Failed to save.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch(`/api/advisor-auth/case-studies/${id}`, { method: "DELETE" });
      setRefreshKey((k) => k + 1);
    } catch {
      // ignore
    }
    setDeletingId(null);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-24 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Case Studies</h2>
          <p className="text-xs text-slate-500 mt-0.5">Showcase anonymised client success stories to build trust and drive leads.</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Icon name="plus" size={16} /> Add Case Study
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">{editingId !== null ? "Edit Case Study" : "New Case Study"}</h3>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. Helping a family restructure super before retirement"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                maxLength={150}
              />
              <p className="text-[0.58rem] text-slate-400 mt-0.5">{form.title.length}/150</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Type</label>
                <select
                  value={form.client_type}
                  onChange={(e) => setField("client_type", e.target.value as ClientType)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map((k) => (
                    <option key={k} value={k}>{CLIENT_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Outcome Type</label>
                <select
                  value={form.outcome_type}
                  onChange={(e) => setField("outcome_type", e.target.value as OutcomeType)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  {(Object.keys(OUTCOME_TYPE_LABELS) as OutcomeType[]).map((k) => (
                    <option key={k} value={k}>{OUTCOME_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Situation * <span className="font-normal text-slate-400">(client&rsquo;s starting point)</span></label>
              <textarea
                value={form.situation}
                onChange={(e) => setField("situation", e.target.value)}
                placeholder="Describe the client's situation and challenge anonymously..."
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical"
              />
              <p className="text-[0.58rem] text-slate-400 mt-0.5">{form.situation.length}/1000</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Approach * <span className="font-normal text-slate-400">(what you did)</span></label>
              <textarea
                value={form.approach}
                onChange={(e) => setField("approach", e.target.value)}
                placeholder="Explain your strategy and the steps taken..."
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical"
              />
              <p className="text-[0.58rem] text-slate-400 mt-0.5">{form.approach.length}/1000</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Outcome * <span className="font-normal text-slate-400">(results achieved)</span></label>
              <textarea
                value={form.outcome}
                onChange={(e) => setField("outcome", e.target.value)}
                placeholder="Describe the measurable results and client impact..."
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical"
              />
              <p className="text-[0.58rem] text-slate-400 mt-0.5">{form.outcome.length}/500</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{error}</div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { void handleSave("draft"); }}
                disabled={saving}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={() => { void handleSave("published"); }}
                disabled={saving}
                className="px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving..." : "Publish"}
              </button>
              <button onClick={closeForm} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {caseStudies.length === 0 && !showForm ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="briefcase" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No case studies yet</h3>
          <p className="text-xs text-slate-500 mb-4">Add anonymised client success stories to build trust with prospective clients.</p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
          >
            Add Your First Case Study
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {caseStudies.map((cs) => (
            <div key={cs.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="text-sm font-bold text-slate-900">{cs.title}</h3>
                    {cs.status === "draft" && (
                      <span className="text-[0.56rem] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">Draft</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[0.62rem] font-semibold px-2 py-0.5 rounded-full ${CLIENT_TYPE_COLORS[cs.client_type]}`}>
                      {CLIENT_TYPE_LABELS[cs.client_type]}
                    </span>
                    <span className={`text-[0.62rem] font-semibold px-2 py-0.5 rounded-full ${OUTCOME_TYPE_COLORS[cs.outcome_type]}`}>
                      {OUTCOME_TYPE_LABELS[cs.outcome_type]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{cs.situation}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(cs)}
                    className="text-xs px-2.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { void handleDelete(cs.id); }}
                    disabled={deletingId === cs.id}
                    className="text-xs px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    {deletingId === cs.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
