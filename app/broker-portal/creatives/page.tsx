"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import type { BrokerCreative } from "@/lib/types";

const CREATIVE_TYPES = [
  { value: "logo", label: "Logo", desc: "Your brand logo (PNG/SVG, square preferred)" },
  { value: "banner", label: "Banner", desc: "Promotional banner (1200×300 recommended)" },
  { value: "icon", label: "Icon", desc: "Small icon/favicon (64×64)" },
  { value: "screenshot", label: "Screenshot", desc: "Platform screenshot or product image" },
] as const;

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<BrokerCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [brokerSlug, setBrokerSlug] = useState("");
  const { toast } = useToast();

  // Upload form
  const [showForm, setShowForm] = useState(false);
  const [uploadType, setUploadType] = useState<string>("logo");
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug, full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!account) return;

      setBrokerSlug(account.broker_slug);

      const { data } = await supabase
        .from("broker_creatives")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .order("sort_order", { ascending: true });

      setCreatives((data || []) as BrokerCreative[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) {
      toast("URL is required", "error");
      return;
    }
    setUploading(true);

    const supabase = createClient();
    const { error } = await supabase.from("broker_creatives").insert({
      broker_slug: brokerSlug,
      type: uploadType,
      label: uploadLabel.trim() || null,
      url: uploadUrl.trim(),
      is_active: true,
      sort_order: creatives.length,
    });

    if (error) {
      toast("Failed to save creative", "error");
    } else {
      toast("Creative added", "success");
      // Reload
      const { data } = await supabase
        .from("broker_creatives")
        .select("*")
        .eq("broker_slug", brokerSlug)
        .order("sort_order", { ascending: true });
      setCreatives((data || []) as BrokerCreative[]);
      setShowForm(false);
      setUploadUrl("");
      setUploadLabel("");
    }
    setUploading(false);
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    const supabase = createClient();
    await supabase
      .from("broker_creatives")
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    setCreatives(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentActive } : c));
    toast(currentActive ? "Creative disabled" : "Creative enabled", "success");
  };

  const deleteCreative = async (id: number) => {
    if (!confirm("Delete this creative? This cannot be undone.")) return;
    const supabase = createClient();
    await supabase.from("broker_creatives").delete().eq("id", id);
    setCreatives(prev => prev.filter(c => c.id !== id));
    toast("Creative deleted", "success");
  };

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  const grouped = CREATIVE_TYPES.map(t => ({
    ...t,
    items: creatives.filter(c => c.type === t.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Creatives & Assets</h1>
          <p className="text-sm text-slate-500">Manage your brand assets used across the platform</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
          <Icon name="plus" size={14} />
          Add Creative
        </button>
      </div>

      {/* KPI summary */}
      {creatives.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 portal-stagger">
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon name="image" size={14} className="text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Total Assets</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">{creatives.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                <Icon name="check-circle" size={14} className="text-green-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">Active</span>
            </div>
            <p className="text-xl font-extrabold text-slate-900">{creatives.filter(c => c.is_active).length}</p>
          </div>
          {CREATIVE_TYPES.map(t => {
            const count = creatives.filter(c => c.type === t.value).length;
            if (count === 0) return null;
            return (
              <div key={t.value} className="bg-white rounded-xl border border-slate-200 p-4 hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Icon name="image" size={14} className="text-slate-500" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{t.label}</span>
                </div>
                <p className="text-xl font-extrabold text-slate-900">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <form onSubmit={handleUpload} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4" style={{ animation: "resultCardIn 0.3s ease-out" }}>
          <h3 className="font-bold text-slate-900">Add New Creative</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CREATIVE_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setUploadType(t.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    uploadType === t.value
                      ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                      : "border-slate-200 hover:border-slate-300"
                  }`}>
                  <p className="text-sm font-bold text-slate-900">{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL *</label>
            <input type="url" value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              placeholder="https://yourdomain.com/logo.png" />
            <p className="text-xs text-slate-400 mt-1">Paste a publicly accessible image URL. Supports PNG, JPG, SVG, WebP.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Label (optional)</label>
            <input type="text" value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              placeholder="e.g. Primary Logo Dark" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={uploading}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
              {uploading ? "Saving..." : "Save Creative"}
            </button>
          </div>
        </form>
      )}

      {/* Creative groups */}
      {grouped.map(group => (
        <div key={group.value}>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
            {group.label}
            <span className="text-xs font-normal text-slate-400 lowercase">({group.items.length})</span>
          </h2>
          {group.items.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">No {group.label.toLowerCase()} assets uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.items.map(c => (
                <div key={c.id} className={`bg-white rounded-xl border overflow-hidden group transition-all hover-lift ${
                  c.is_active ? "border-slate-200" : "border-slate-100 opacity-60"
                }`}>
                  <div className="aspect-video bg-slate-50 flex items-center justify-center p-3 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt={c.label || c.type} className="max-w-full max-h-full object-contain" />
                    {!c.is_active && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Disabled</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.label || c.type}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{c.url}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => toggleActive(c.id, c.is_active)}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                          c.is_active
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(c.url); toast("URL copied", "success"); }}
                        className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors">
                        Copy URL
                      </button>
                      <button onClick={() => deleteCreative(c.id)}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors ml-auto">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
