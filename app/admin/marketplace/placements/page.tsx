"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { MarketplacePlacement } from "@/lib/types";

export default function AdminPlacementsPage() {
  const [placements, setPlacements] = useState<MarketplacePlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MarketplacePlacement | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [page, setPage] = useState("");
  const [position, setPosition] = useState("");
  const [inventoryType, setInventoryType] = useState<"featured" | "cpc">("cpc");
  const [maxSlots, setMaxSlots] = useState(1);
  const [baseRateCents, setBaseRateCents] = useState(0);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { loadPlacements(); }, []);

  const loadPlacements = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("marketplace_placements")
      .select("*")
      .order("page", { ascending: true });
    setPlacements((data || []) as MarketplacePlacement[]);
    setLoading(false);
  };

  const resetForm = () => {
    setSlug(""); setName(""); setPage(""); setPosition("");
    setInventoryType("cpc"); setMaxSlots(1); setBaseRateCents(0);
    setDescription(""); setIsActive(true); setEditing(null);
  };

  const openEdit = (p: MarketplacePlacement) => {
    setEditing(p);
    setSlug(p.slug); setName(p.name); setPage(p.page);
    setPosition(p.position); setInventoryType(p.inventory_type);
    setMaxSlots(p.max_slots); setBaseRateCents(p.base_rate_cents || 0);
    setDescription(p.description || ""); setIsActive(p.is_active);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const payload = {
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      name,
      page,
      position,
      inventory_type: inventoryType,
      max_slots: maxSlots,
      base_rate_cents: baseRateCents,
      description: description || null,
      is_active: isActive,
    };

    if (editing) {
      await supabase
        .from("marketplace_placements")
        .update(payload)
        .eq("id", editing.id);

      // Audit log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        action: "update",
        entity_type: "marketplace_placement",
        entity_name: name,
        admin_email: user?.email || "admin",
        details: { placement_id: editing.id, ...payload },
      });
    } else {
      await supabase.from("marketplace_placements").insert(payload);

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        action: "create",
        entity_type: "marketplace_placement",
        entity_name: name,
        admin_email: user?.email || "admin",
        details: payload,
      });
    }

    await loadPlacements();
    setShowForm(false);
    resetForm();
    setSaving(false);
  };

  const toggleActive = async (p: MarketplacePlacement) => {
    const supabase = createClient();
    await supabase
      .from("marketplace_placements")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({
      action: "update",
      entity_type: "marketplace_placement",
      entity_name: p.name,
      admin_email: user?.email || "admin",
      details: { is_active: !p.is_active },
    });

    await loadPlacements();
  };

  // Group by page
  const grouped = placements.reduce<Record<string, MarketplacePlacement[]>>((acc, p) => {
    if (!acc[p.page]) acc[p.page] = [];
    acc[p.page].push(p);
    return acc;
  }, {});

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Placement Management</h1>
            <p className="text-sm text-slate-500">Ad placement slots available for broker campaigns — homepage, comparison pages, articles.</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors">
            + New Placement
          </button>
        </div>

        {/* Create / Edit Form */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900">{editing ? "Edit Placement" : "New Placement"}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug *</label>
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required
                  disabled={!!editing}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 disabled:bg-slate-50"
                  placeholder="e.g. compare-top" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  placeholder="e.g. Compare Page Top" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Page *</label>
                <input type="text" value={page} onChange={(e) => setPage(e.target.value)} required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  placeholder="e.g. /compare, /homepage, /quiz" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                  placeholder="e.g. top, sidebar, inline" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Type</label>
                <select value={inventoryType} onChange={(e) => setInventoryType(e.target.value as "featured" | "cpc")}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
                  <option value="cpc">CPC (Cost per Click)</option>
                  <option value="featured">Featured (Flat Rate)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Slots</label>
                <input type="number" value={maxSlots} onChange={(e) => setMaxSlots(Number(e.target.value))}
                  min={1} max={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Base Rate {inventoryType === "cpc" ? "(¢/click)" : "(¢/month)"}
                </label>
                <input type="number" value={baseRateCents} onChange={(e) => setBaseRateCents(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <p className="text-xs text-slate-400 mt-0.5">${(baseRateCents / 100).toFixed(2)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                placeholder="Brief description of this placement..." />
            </div>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-slate-700">Active (available for campaigns)</span>
            </label>

            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : editing ? "Update Placement" : "Create Placement"}
              </button>
            </div>
          </form>
        )}

        {/* Placements by Page */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">No placements configured yet.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([pageName, items]) => (
            <div key={pageName}>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">{pageName}</h2>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {items.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{p.name}</span>
                        <code className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.slug}</code>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.inventory_type === "featured" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {p.inventory_type}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          p.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.position && `Position: ${p.position} · `}
                        Max slots: {p.max_slots} · Base rate: ${((p.base_rate_cents || 0) / 100).toFixed(2)}
                        {p.description && ` · ${p.description}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => openEdit(p)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(p)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          p.is_active
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}>
                        {p.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
