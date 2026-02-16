"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { Broker } from "@/lib/types";

export default function DealOfMonthPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dealText, setDealText] = useState("");
  const [dealTextEdited, setDealTextEdited] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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
      const dealBroker = (data || []).find((b: any) => b.deal === true);
      if (dealBroker) {
        setDealText((dealBroker as any).deal_text || "");
      }
    }
    setLoading(false);
  }

  const dealBroker = brokers.find((b: any) => (b as any).deal === true);

  async function handleSelectDeal(broker: Broker) {
    setSaving(true);
    // First, clear deal from all brokers
    const { error: clearError } = await supabase
      .from("brokers")
      .update({ deal: false })
      .neq("slug", "");

    if (clearError) {
      toast("Error clearing deals", "error");
      setSaving(false);
      return;
    }

    // Set deal for selected broker
    const { error: setError } = await supabase
      .from("brokers")
      .update({ deal: true })
      .eq("slug", broker.slug);

    if (setError) {
      toast("Error setting deal", "error");
    } else {
      toast(`${broker.name} set as Deal of the Month`, "success");
      setDealText("");
      setDealTextEdited(false);
      fetchBrokers();
    }
    setSaving(false);
  }

  async function handleClearDeal() {
    setSaving(true);
    const { error } = await supabase
      .from("brokers")
      .update({ deal: false, deal_text: "" })
      .neq("slug", "");

    if (error) {
      toast("Error clearing deal", "error");
    } else {
      toast("Deal of the Month cleared", "success");
      setDealText("");
      setDealTextEdited(false);
      fetchBrokers();
    }
    setSaving(false);
    setClearConfirmOpen(false);
  }

  async function handleSaveDealText() {
    if (!dealBroker) return;
    setSaving(true);
    const { error } = await supabase
      .from("brokers")
      .update({ deal_text: dealText })
      .eq("slug", dealBroker.slug);

    if (error) {
      toast("Error saving deal text", "error");
    } else {
      toast("Deal text updated", "success");
      setDealTextEdited(false);
      fetchBrokers();
    }
    setSaving(false);
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Deal of the Month</h1>
          {dealBroker && (
            <button
              onClick={() => setClearConfirmOpen(true)}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              Clear Deal
            </button>
          )}
        </div>

        {/* Current Deal */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current Deal</h2>
          {dealBroker ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <div>
                  <p className="text-white font-bold text-lg">{dealBroker.name}</p>
                  <p className="text-slate-400 text-sm">slug: {dealBroker.slug}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Deal Text
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={dealText}
                    onChange={(e) => {
                      setDealText(e.target.value);
                      setDealTextEdited(true);
                    }}
                    placeholder="e.g. Get $0 brokerage for 30 days!"
                    className="flex-1 bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleSaveDealText}
                    disabled={!dealTextEdited || saving}
                    className="px-4 py-2 bg-amber-500 text-black text-sm font-medium rounded hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Text
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400">
              No broker is currently set as the Deal of the Month. Select one below.
            </p>
          )}
        </div>

        {/* Broker Selection */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Select a Broker</h2>
          {loading ? (
            <p className="text-slate-400">Loading brokers...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {brokers.map((broker) => {
                const isDeal = (broker as any).deal === true;
                return (
                  <button
                    key={broker.slug}
                    onClick={() => handleSelectDeal(broker)}
                    disabled={saving}
                    className={`text-left p-4 rounded-lg border transition-colors ${
                      isDeal
                        ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500"
                        : "bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-700/50"
                    } disabled:opacity-50`}
                  >
                    <p className={`font-medium ${isDeal ? "text-amber-400" : "text-white"}`}>
                      {broker.name}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">{broker.slug}</p>
                    {isDeal && (
                      <span className="inline-block mt-2 text-xs bg-amber-500 text-black font-bold px-2 py-0.5 rounded">
                        CURRENT DEAL
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Clear Deal Confirmation Dialog */}
      <ConfirmDialog
        open={clearConfirmOpen}
        title="Clear Deal of the Month"
        message={`Are you sure you want to remove ${dealBroker?.name || "the current broker"} as Deal of the Month? The deal badge will be removed from all pages.`}
        confirmLabel="Clear Deal"
        variant="warning"
        onConfirm={handleClearDeal}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </AdminShell>
  );
}
