"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

interface Package {
  id: number;
  slug: string;
  name: string;
  tier: string;
  description: string | null;
  monthly_fee_cents: number;
  cpc_rate_discount_pct: number;
  featured_slots_included: number;
  support_level: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Package>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("broker_packages")
      .select("*")
      .order("sort_order", { ascending: true });
    setPackages((data || []) as Package[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = (pkg: Package) => {
    setEditing(pkg.id);
    setEditForm({
      name: pkg.name,
      description: pkg.description || "",
      monthly_fee_cents: pkg.monthly_fee_cents,
      cpc_rate_discount_pct: pkg.cpc_rate_discount_pct,
      featured_slots_included: pkg.featured_slots_included,
      support_level: pkg.support_level,
      is_active: pkg.is_active,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("broker_packages")
      .update({
        name: editForm.name,
        description: editForm.description,
        monthly_fee_cents: editForm.monthly_fee_cents,
        cpc_rate_discount_pct: editForm.cpc_rate_discount_pct,
        featured_slots_included: editForm.featured_slots_included,
        support_level: editForm.support_level,
        is_active: editForm.is_active,
      })
      .eq("id", editing);

    setEditing(null);
    setSaving(false);
    load();
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Broker Packages
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sponsorship packages and pricing tiers for broker advertising.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                    Package
                  </th>
                  <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                    Monthly Fee
                  </th>
                  <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                    CPC Discount
                  </th>
                  <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                    Featured Slots
                  </th>
                  <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[0.65rem] text-slate-500 uppercase tracking-wider font-bold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="border-b border-slate-50 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {pkg.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {pkg.description}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {pkg.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {pkg.monthly_fee_cents > 0
                        ? `$${(pkg.monthly_fee_cents / 100).toLocaleString()}/mo`
                        : pkg.tier === "enterprise"
                          ? "Custom"
                          : "Free"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {pkg.cpc_rate_discount_pct > 0
                        ? `${pkg.cpc_rate_discount_pct}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {pkg.featured_slots_included || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          pkg.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {pkg.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(pkg)}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Package
              </h3>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Monthly Fee ($)
                  </label>
                  <input
                    type="number"
                    value={(editForm.monthly_fee_cents || 0) / 100}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        monthly_fee_cents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    CPC Discount (%)
                  </label>
                  <input
                    type="number"
                    value={editForm.cpc_rate_discount_pct || 0}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        cpc_rate_discount_pct: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Featured Slots
                  </label>
                  <input
                    type="number"
                    value={editForm.featured_slots_included || 0}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        featured_slots_included: Number(e.target.value),
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Active
                  </label>
                  <select
                    value={editForm.is_active ? "true" : "false"}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        is_active: e.target.value === "true",
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
