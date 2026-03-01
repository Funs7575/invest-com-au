"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import TableSkeleton from "@/components/TableSkeleton";
import { Broker } from "@/lib/types";

const DEAL_CATEGORIES = [
  { value: "", label: "— No category —" },
  { value: "shares", label: "Share Trading" },
  { value: "crypto", label: "Crypto" },
  { value: "international", label: "International" },
  { value: "beginner", label: "Beginner" },
  { value: "active-trader", label: "Active Trader" },
];

export default function DealOfMonthPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editing state for a single deal
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editDealText, setEditDealText] = useState("");
  const [editDealExpiry, setEditDealExpiry] = useState("");
  const [editDealCategory, setEditDealCategory] = useState("");
  const [editDealTerms, setEditDealTerms] = useState("");
  const [editDealSource, setEditDealSource] = useState("");

  // New deal form
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newDealSlug, setNewDealSlug] = useState("");
  const [newDealText, setNewDealText] = useState("");
  const [newDealExpiry, setNewDealExpiry] = useState("");
  const [newDealCategory, setNewDealCategory] = useState("");
  const [newDealTerms, setNewDealTerms] = useState("");
  const [newDealSource, setNewDealSource] = useState("");

  const [clearConfirmSlug, setClearConfirmSlug] = useState<string | null>(null);

  useEffect(() => {
    fetchBrokers();
  }, []);

  async function fetchBrokers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("brokers")
      .select("*")
      .order("name");
    if (error) {
      toast("Error loading brokers", "error");
    } else {
      setBrokers(data || []);
    }
    setLoading(false);
  }

  const activeDealBrokers = brokers.filter((b) => b.deal === true);
  const nonDealBrokers = brokers.filter((b) => !b.deal);

  function startEdit(broker: Broker) {
    setEditingSlug(broker.slug);
    setEditDealText(broker.deal_text || "");
    setEditDealExpiry(broker.deal_expiry || "");
    setEditDealCategory(broker.deal_category || "");
    setEditDealTerms(broker.deal_terms || "");
    setEditDealSource(broker.deal_source || "");
  }

  function cancelEdit() {
    setEditingSlug(null);
  }

  async function handleSaveEdit() {
    if (!editingSlug) return;
    setSaving(true);
    const { error } = await supabase
      .from("brokers")
      .update({
        deal_text: editDealText,
        deal_expiry: editDealExpiry || null,
        deal_category: editDealCategory || null,
        deal_terms: editDealTerms || null,
        deal_source: editDealSource || null,
        deal_verified_date: new Date().toISOString(),
      })
      .eq("slug", editingSlug);

    if (error) {
      toast("Error saving deal", "error");
    } else {
      toast("Deal updated", "success");
      setEditingSlug(null);
      fetchBrokers();
    }
    setSaving(false);
  }

  async function handleAddDeal() {
    if (!newDealSlug || !newDealText) {
      toast("Select a broker and enter deal text", "error");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("brokers")
      .update({
        deal: true,
        deal_text: newDealText,
        deal_expiry: newDealExpiry || null,
        deal_category: newDealCategory || null,
        deal_terms: newDealTerms || null,
        deal_source: newDealSource || null,
        deal_verified_date: new Date().toISOString(),
      })
      .eq("slug", newDealSlug);

    if (error) {
      toast("Error adding deal", "error");
    } else {
      toast("Deal added", "success");
      setShowNewDeal(false);
      setNewDealSlug("");
      setNewDealText("");
      setNewDealExpiry("");
      setNewDealCategory("");
      setNewDealTerms("");
      setNewDealSource("");
      fetchBrokers();
    }
    setSaving(false);
  }

  async function handleClearDeal(slug: string) {
    setSaving(true);
    const { error } = await supabase
      .from("brokers")
      .update({
        deal: false,
        deal_text: "",
        deal_expiry: null,
        deal_category: null,
        deal_terms: null,
        deal_source: null,
        deal_verified_date: null,
      })
      .eq("slug", slug);

    if (error) {
      toast("Error clearing deal", "error");
    } else {
      toast("Deal removed", "success");
      fetchBrokers();
    }
    setSaving(false);
    setClearConfirmSlug(null);
  }

  const clearBroker = brokers.find((b) => b.slug === clearConfirmSlug);

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Deals & Promotions</h1>
            <p className="text-sm text-slate-500 mt-1">
              Feature a broker with a promotional banner across the site. {activeDealBrokers.length} active deal{activeDealBrokers.length !== 1 ? "s" : ""}.
            </p>
          </div>
          <button
            onClick={() => setShowNewDeal(true)}
            disabled={saving}
            className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            + Add Deal
          </button>
        </div>

        {/* Active Deals */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Deals</h2>
          {loading ? (
            <TableSkeleton rows={3} cols={4} />
          ) : activeDealBrokers.length === 0 ? (
            <p className="text-slate-500">
              No active deals. Click &ldquo;+ Add Deal&rdquo; to create one.
            </p>
          ) : (
            <div className="space-y-4">
              {activeDealBrokers.map((broker) => (
                <div
                  key={broker.slug}
                  className="border border-amber-200 bg-amber-50/50 rounded-lg p-4"
                >
                  {editingSlug === broker.slug ? (
                    /* Editing mode */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        <p className="font-bold text-slate-900">{broker.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Deal Text *</label>
                        <input
                          type="text"
                          value={editDealText}
                          onChange={(e) => setEditDealText(e.target.value)}
                          placeholder="e.g. Get $0 brokerage for 30 days!"
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
                          <input
                            type="date"
                            value={editDealExpiry}
                            onChange={(e) => setEditDealExpiry(e.target.value)}
                            className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                          <select
                            value={editDealCategory}
                            onChange={(e) => setEditDealCategory(e.target.value)}
                            className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                          >
                            {DEAL_CATEGORIES.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Terms / Fine Print</label>
                        <textarea
                          value={editDealTerms}
                          onChange={(e) => setEditDealTerms(e.target.value)}
                          placeholder="T&Cs summary..."
                          rows={2}
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
                        <input
                          type="text"
                          value={editDealSource}
                          onChange={(e) => setEditDealSource(e.target.value)}
                          placeholder="e.g. broker website, partner email"
                          className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving || !editDealText}
                          className="px-4 py-2 bg-amber-500 text-black text-sm font-medium rounded hover:bg-amber-400 disabled:opacity-30 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                          <p className="font-bold text-slate-900">{broker.name}</p>
                          {broker.deal_category && (
                            <span className="text-[0.6rem] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-medium uppercase">
                              {broker.deal_category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 ml-6">{broker.deal_text || "No deal text set"}</p>
                        <div className="ml-6 mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                          {broker.deal_expiry && (
                            <span>Expires: {new Date(broker.deal_expiry).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                          )}
                          {broker.deal_verified_date && (
                            <span>Verified: {new Date(broker.deal_verified_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                          )}
                          {broker.deal_source && (
                            <span>Source: {broker.deal_source}</span>
                          )}
                        </div>
                        {broker.deal_terms && (
                          <p className="ml-6 mt-1 text-xs text-slate-400 italic">{broker.deal_terms}</p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(broker)}
                          className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-medium rounded hover:bg-slate-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setClearConfirmSlug(broker.slug)}
                          disabled={saving}
                          className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Deal Form */}
        {showNewDeal && (
          <div className="bg-white border border-emerald-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Add New Deal</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Broker *</label>
                <select
                  value={newDealSlug}
                  onChange={(e) => setNewDealSlug(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select a broker...</option>
                  {nonDealBrokers.map((b) => (
                    <option key={b.slug} value={b.slug}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deal Text *</label>
                <input
                  type="text"
                  value={newDealText}
                  onChange={(e) => setNewDealText(e.target.value)}
                  placeholder="e.g. Get $0 brokerage for 30 days!"
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={newDealExpiry}
                    onChange={(e) => setNewDealExpiry(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select
                    value={newDealCategory}
                    onChange={(e) => setNewDealCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {DEAL_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Terms / Fine Print</label>
                <textarea
                  value={newDealTerms}
                  onChange={(e) => setNewDealTerms(e.target.value)}
                  placeholder="T&Cs summary..."
                  rows={2}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Source</label>
                <input
                  type="text"
                  value={newDealSource}
                  onChange={(e) => setNewDealSource(e.target.value)}
                  placeholder="e.g. broker website, partner email"
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddDeal}
                  disabled={saving || !newDealSlug || !newDealText}
                  className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded hover:bg-emerald-800 disabled:opacity-30 transition-colors"
                >
                  Add Deal
                </button>
                <button
                  onClick={() => setShowNewDeal(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clear Deal Confirmation Dialog */}
      <ConfirmDialog
        open={!!clearConfirmSlug}
        title="Remove Deal"
        message={`Are you sure you want to remove the deal from ${clearBroker?.name || "this broker"}? The deal badge will be removed from all pages.`}
        confirmLabel="Remove Deal"
        variant="warning"
        onConfirm={() => clearConfirmSlug && handleClearDeal(clearConfirmSlug)}
        onCancel={() => setClearConfirmSlug(null)}
      />
    </AdminShell>
  );
}
