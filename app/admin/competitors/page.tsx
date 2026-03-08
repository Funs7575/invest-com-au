"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Icon from "@/components/Icon";

interface Entry {
  id: number;
  competitor: string;
  event_type: string;
  title: string;
  detail?: string;
  url?: string;
  spotted_at: string;
}

const COMPETITORS = ["Finder", "Canstar", "Mozo", "Forbes Advisor AU", "Money Magazine", "Stockbrokers.com", "Other"];
const EVENT_TYPES = [
  { value: "content", label: "New Content", icon: "📄" },
  { value: "feature", label: "New Feature", icon: "⚡" },
  { value: "broker", label: "New Broker Added", icon: "🏦" },
  { value: "deal", label: "Exclusive Deal", icon: "🎁" },
  { value: "design", label: "Design Change", icon: "🎨" },
  { value: "seo", label: "SEO Move", icon: "🔍" },
  { value: "affiliate", label: "Affiliate Change", icon: "💰" },
  { value: "other", label: "Other", icon: "📌" },
];

export default function CompetitorWatchPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterComp, setFilterComp] = useState("all");

  // Form state
  const [competitor, setCompetitor] = useState("Finder");
  const [eventType, setEventType] = useState("content");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("competitor_watch").select("*").order("spotted_at", { ascending: false }).limit(200);
    setEntries(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("competitor_watch").insert({
      competitor,
      event_type: eventType,
      title: title.trim(),
      detail: detail.trim() || null,
      url: url.trim() || null,
      spotted_at: new Date().toISOString(),
    });
    setTitle("");
    setDetail("");
    setUrl("");
    setShowForm(false);
    setSaving(false);
    fetchEntries();
  }

  async function handleDelete(id: number) {
    const supabase = createClient();
    await supabase.from("competitor_watch").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const filtered = filterComp === "all" ? entries : entries.filter(e => e.competitor === filterComp);

  const competitorCounts = COMPETITORS.map(c => ({
    name: c,
    count: entries.filter(e => e.competitor === c).length,
  })).filter(c => c.count > 0);

  return (
    <AdminShell title="Competitor Watch" subtitle="Track what Finder, Canstar, and others are doing">
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Competitor filter pills + Add button */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <button onClick={() => setFilterComp("all")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${filterComp === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              All ({entries.length})
            </button>
            {competitorCounts.map(c => (
              <button key={c.name} onClick={() => setFilterComp(filterComp === c.name ? "all" : c.name)} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${filterComp === c.name ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {c.name} ({c.count})
              </button>
            ))}
            <button onClick={() => setShowForm(!showForm)} className="ml-auto px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Log Entry
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Competitor</label>
                  <select value={competitor} onChange={e => setCompetitor(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {COMPETITORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">Type</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg">
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">What happened?</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Finder added Moomoo review" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Detail (optional)</label>
                <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={2} placeholder="Extra context, screenshots, observations..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">URL (optional)</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !title.trim()} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Entry"}
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            {filtered.map(entry => {
              const evt = EVENT_TYPES.find(t => t.value === entry.event_type) || EVENT_TYPES[EVENT_TYPES.length - 1];
              return (
                <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 items-start group">
                  <span className="text-lg shrink-0">{evt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{entry.competitor}</span>
                      <span className="text-xs text-slate-400">{new Date(entry.spotted_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1">{entry.title}</p>
                    {entry.detail && <p className="text-xs text-slate-500 mt-0.5">{entry.detail}</p>}
                    {entry.url && (
                      <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-0.5 inline-block">
                        View →
                      </a>
                    )}
                  </div>
                  <button onClick={() => handleDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all shrink-0">
                    <Icon name="trash-2" size={14} />
                  </button>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg font-bold mb-1">{entries.length === 0 ? "No entries yet" : "No entries match this filter"}</p>
                <p className="text-sm">Click &quot;+ Log Entry&quot; when you spot something a competitor does.</p>
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
