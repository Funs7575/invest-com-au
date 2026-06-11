"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { BrokerCreative } from "@/lib/types";

const CREATIVE_TYPES = [
  { value: "logo", label: "Logo", desc: "Your brand logo (PNG/SVG, square preferred)" },
  { value: "banner", label: "Banner", desc: "Promotional banner (1200×300 recommended)" },
  { value: "icon", label: "Icon", desc: "Small icon/favicon (64×64)" },
  { value: "screenshot", label: "Screenshot", desc: "Platform screenshot or product image" },
] as const;

// ADV-082: URL validation helper
const IMAGE_EXTENSION_RE = /\.(png|jpg|jpeg|gif|svg|webp|avif|ico)(\?.*)?$/i;
const CDN_PATTERN_RE = /\/(cdn|images?|assets?|media|static|uploads?)\//i;

function validateImageUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
    if (!IMAGE_EXTENSION_RE.test(parsed.pathname) && !CDN_PATTERN_RE.test(parsed.pathname)) {
      return "URL doesn't look like an image — check it ends with .png, .jpg, .svg, .webp etc., or points to an image CDN path.";
    }
    return null;
  } catch {
    return "Enter a valid URL (e.g. https://yourdomain.com/logo.png)";
  }
}

// ADV-083: Delete confirmation modal
interface DeleteModalProps {
  creativeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteModal({ creativeName, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="del-creative-title" className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 id="del-creative-title" className="text-base font-bold text-slate-900">Delete creative</h3>
        <p className="text-sm text-slate-600">
          Delete creative <span className="font-semibold">&lsquo;{creativeName}&rsquo;</span>?{" "}
          This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<BrokerCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [brokerSlug, setBrokerSlug] = useState("");
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Upload form
  const [showForm, setShowForm] = useState(false);
  const [uploadType, setUploadType] = useState<string>("logo");
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  // ADV-082: per-field URL validation error
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);
  // ADV-082: image load error per creative id
  const [imgErrorIds, setImgErrorIds] = useState<Set<number>>(new Set());

  // ADV-083: delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<BrokerCreative | null>(null);

  // ADV-149: toggle loading state per creative id
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  // ADV-147: copy button per-id timeout refs
  const copyTimerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

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

  // ADV-082: validate on change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUploadUrl(val);
    setUrlValidationError(val ? validateImageUrl(val) : null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) {
      toast("URL is required", "error");
      return;
    }
    // ADV-082: block submit if URL invalid
    const urlErr = validateImageUrl(uploadUrl.trim());
    if (urlErr) {
      setUrlValidationError(urlErr);
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
      setUrlValidationError(null);
    }
    setUploading(false);
  };

  // ADV-149: toggle with loading guard
  const toggleActive = async (id: number, currentActive: boolean) => {
    if (togglingIds.has(id)) return;
    setTogglingIds(prev => new Set(prev).add(id));
    const supabase = createClient();
    await supabase
      .from("broker_creatives")
      .update({ is_active: !currentActive, updated_at: new Date().toISOString() })
      .eq("id", id);

    setCreatives(prev => prev.map(c => c.id === id ? { ...c, is_active: !currentActive } : c));
    toast(currentActive ? "Creative disabled" : "Creative enabled", "success");
    setTogglingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  // ADV-083: show modal then handle confirmed delete
  const handleDeleteClick = (creative: BrokerCreative) => {
    setDeleteTarget(creative);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, label, type } = deleteTarget;
    const displayName = label || type;
    setDeleteTarget(null);
    const supabase = createClient();
    await supabase.from("broker_creatives").delete().eq("id", id);
    setCreatives(prev => prev.filter(c => c.id !== id));
    toast(`Creative '${displayName}' deleted.`, "success");
  };

  // ADV-147: copy with per-button "Copied ✓" state
  const handleCopyUrl = (id: number, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      // Clear any existing timer for this id
      const existing = copyTimerRef.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        setCopiedId(prev => prev === id ? null : prev);
        copyTimerRef.current.delete(id);
      }, 2000);
      copyTimerRef.current.set(id, timer);
    }).catch(() => toast("Couldn't copy URL", "error"));
  };

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  const grouped = CREATIVE_TYPES.map(t => ({
    ...t,
    items: creatives.filter(c => c.type === t.value),
  }));

  return (
    <div className="space-y-6">
      {/* ADV-083: delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          creativeName={deleteTarget.label || deleteTarget.type}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Creatives & Assets</h1>
          <p className="text-sm text-slate-500 mt-1">Upload logos, banners, icons, and screenshots for use in your ad placements.</p>
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
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Icon name="check-circle" size={14} className="text-emerald-600" />
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
            <p className="block text-sm font-medium text-slate-700 mb-1">Type <InfoTip text="Logo: square PNG/SVG. Banner: 1200x300px. Icon: 64x64px. Screenshot: platform images for article sidebars." /></p>
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
            <label htmlFor="cre-image-url" className="block text-sm font-medium text-slate-700 mb-1">Image URL *</label>
            {/* ADV-082: validated URL input */}
            <input
              id="cre-image-url"
              type="url"
              value={uploadUrl}
              onChange={handleUrlChange}
              required
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400 ${
                urlValidationError ? "border-red-400 focus:border-red-400 focus:ring-red-200/40" : "border-slate-200"
              }`}
              placeholder="https://yourdomain.com/logo.png"
            />
            {urlValidationError ? (
              <p className="text-xs text-red-600 mt-1">{urlValidationError}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Paste a publicly accessible image URL. Supports PNG, JPG, SVG, WebP.</p>
            )}
          </div>

          <div>
            <label htmlFor="cre-label" className="block text-sm font-medium text-slate-700 mb-1">Label (optional)</label>
            <input id="cre-label" type="text" value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 focus:border-slate-400"
              placeholder="e.g. Primary Logo Dark" />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={uploading || !!urlValidationError}
              className="px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                <Icon name="image" size={20} className="text-purple-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">No creative assets yet</p>
              <p className="text-xs text-slate-500 mb-4">Upload your brand logos, banners, and screenshots to use in ad campaigns.</p>
              <button
                type="button"
                onClick={() => document.getElementById("cre-image-url")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Icon name="upload" size={13} aria-hidden />
                Add your first asset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {group.items.map(c => (
                <div key={c.id} className={`bg-white rounded-xl border overflow-hidden group transition-all hover-lift ${
                  c.is_active ? "border-slate-200" : "border-slate-100 opacity-60"
                }`}>
                  <div className="aspect-video bg-slate-50 flex items-center justify-center p-3 relative">
                    {/* ADV-082: image with onError handler */}
                    {imgErrorIds.has(c.id) ? (
                      <div className="flex flex-col items-center justify-center gap-1 text-center px-2">
                        <Icon name="alert-circle" size={20} className="text-red-400" />
                        <p className="text-xs text-red-500 font-medium">Image failed to load — check URL</p>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <Image
                          src={c.url}
                          alt={c.label || c.type}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-contain"
                          unoptimized
                          onError={() =>
                            setImgErrorIds(prev => new Set(prev).add(c.id))
                          }
                        />
                      </div>
                    )}
                    {!c.is_active && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">Disabled</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.label || c.type}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{c.url}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {/* ADV-149: toggle with loading/disabled state */}
                      <button
                        onClick={() => toggleActive(c.id, c.is_active)}
                        disabled={togglingIds.has(c.id)}
                        className={`text-xs px-2 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                          togglingIds.has(c.id)
                            ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                            : c.is_active
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {togglingIds.has(c.id) ? (
                          <>
                            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                            <span className="sr-only">Updating…</span>
                          </>
                        ) : (
                          c.is_active ? "Active" : "Inactive"
                        )}
                      </button>
                      {/* ADV-147: Copy URL with per-button "Copied ✓" state */}
                      <button
                        onClick={() => handleCopyUrl(c.id, c.url)}
                        className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium transition-colors"
                      >
                        {copiedId === c.id ? "Copied ✓" : "Copy URL"}
                      </button>
                      {/* ADV-083: custom delete modal trigger */}
                      <button
                        onClick={() => handleDeleteClick(c)}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors ml-auto"
                      >
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
