"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { Campaign, MarketplacePlacement } from "@/lib/types";

type StatusFilter = "all" | "pending_review" | "active" | "approved" | "paused" | "budget_exhausted" | "completed" | "rejected" | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  pending_review: "bg-amber-50 text-amber-700",
  approved: "bg-blue-50 text-blue-700",
  active: "bg-green-50 text-green-700",
  paused: "bg-slate-100 text-slate-600",
  budget_exhausted: "bg-red-50 text-red-700",
  completed: "bg-purple-50 text-purple-700",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<(Campaign & { placement?: MarketplacePlacement })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  // Bulk selection
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("campaigns")
      .select("*, marketplace_placements(id, slug, name, inventory_type)")
      .order("created_at", { ascending: false });

    if (data) {
      const mapped = data.map((c: any) => ({
        ...c,
        placement: c.marketplace_placements || undefined,
      }));
      setCampaigns(mapped);
    }
    setLoading(false);
  };

  const updateCampaignStatus = async (
    campaignId: number,
    newStatus: string,
    extraFields?: Record<string, any>
  ) => {
    setActionLoading(campaignId);
    const supabase = createClient();

    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...extraFields,
    };

    if (newStatus === "approved" || newStatus === "rejected") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      updates.reviewed_by = user?.email || "admin";
      updates.reviewed_at = new Date().toISOString();
      if (reviewNotes[campaignId]) {
        updates.review_notes = reviewNotes[campaignId];
      }
    }

    await supabase.from("campaigns").update(updates).eq("id", campaignId);

    const campaign = campaigns.find((c) => c.id === campaignId);

    // Log to audit
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({
      action: `campaign_${newStatus}`,
      entity_type: "campaign",
      entity_id: String(campaignId),
      entity_name: campaign?.name || "",
      details: { new_status: newStatus, ...extraFields },
      admin_email: user?.email || "admin",
    });

    // Send notification to broker (fire-and-forget)
    if (campaign && ["approved", "rejected", "paused", "budget_exhausted"].includes(newStatus)) {
      const notifTypes: Record<string, string> = {
        approved: "campaign_approved",
        rejected: "campaign_rejected",
        paused: "campaign_paused",
        budget_exhausted: "budget_exhausted",
      };
      const notifTitles: Record<string, string> = {
        approved: `Campaign "${campaign.name}" Approved`,
        rejected: `Campaign "${campaign.name}" Rejected`,
        paused: `Campaign "${campaign.name}" Paused`,
        budget_exhausted: `Campaign "${campaign.name}" — Budget Exhausted`,
      };
      const notifMessages: Record<string, string> = {
        approved: `Your campaign "${campaign.name}" has been approved and is ready to go live.${reviewNotes[campaignId] ? ` Note: ${reviewNotes[campaignId]}` : ""}`,
        rejected: `Your campaign "${campaign.name}" was not approved.${reviewNotes[campaignId] ? ` Reason: ${reviewNotes[campaignId]}` : " Please review and resubmit."}`,
        paused: `Your campaign "${campaign.name}" has been paused by an administrator.`,
        budget_exhausted: `Your campaign "${campaign.name}" has exhausted its budget. Top up your wallet to resume.`,
      };

      supabase.from("broker_notifications").insert({
        broker_slug: campaign.broker_slug,
        type: notifTypes[newStatus],
        title: notifTitles[newStatus],
        message: notifMessages[newStatus],
        link: "/broker-portal/campaigns",
        is_read: false,
        email_sent: false,
      }).then(() => {
        // Also send email notification
        fetch("/api/marketplace/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": "browser-admin",
          },
          body: JSON.stringify({
            broker_slug: campaign.broker_slug,
            type: notifTypes[newStatus],
            title: notifTitles[newStatus],
            message: notifMessages[newStatus],
            link: "/broker-portal/campaigns",
            send_email: true,
          }),
        }).catch(() => {});
      });
    }

    await loadCampaigns();
    setActionLoading(null);
  };

  const filtered = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);
  const pendingCount = campaigns.filter((c) => c.status === "pending_review").length;

  // Bulk actions
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(c => c.id)));
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    for (const id of selected) {
      const updates: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "approved" || newStatus === "rejected") {
        updates.reviewed_by = user?.email || "admin";
        updates.reviewed_at = new Date().toISOString();
      }
      await supabase.from("campaigns").update(updates).eq("id", id);

      // Audit log
      const campaign = campaigns.find(c => c.id === id);
      await supabase.from("admin_audit_log").insert({
        action: `campaign_${newStatus}`,
        entity_type: "campaign",
        entity_id: String(id),
        entity_name: campaign?.name || "",
        details: { new_status: newStatus, bulk_action: true },
        admin_email: user?.email || "admin",
      });

      // Notification
      if (campaign && ["approved", "rejected", "paused"].includes(newStatus)) {
        const notifMap: Record<string, { type: string; title: string; message: string }> = {
          approved: { type: "campaign_approved", title: `Campaign "${campaign.name}" Approved`, message: `Your campaign "${campaign.name}" has been approved.` },
          rejected: { type: "campaign_rejected", title: `Campaign "${campaign.name}" Rejected`, message: `Your campaign "${campaign.name}" was not approved.` },
          paused: { type: "campaign_paused", title: `Campaign "${campaign.name}" Paused`, message: `Your campaign "${campaign.name}" has been paused by an administrator.` },
        };
        const n = notifMap[newStatus];
        if (n) {
          await supabase.from("broker_notifications").insert({
            broker_slug: campaign.broker_slug,
            type: n.type,
            title: n.title,
            message: n.message,
            link: "/broker-portal/campaigns",
            is_read: false,
            email_sent: false,
          });
        }
      }
    }

    setSelected(new Set());
    await loadCampaigns();
    setBulkLoading(false);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Campaign Management</h1>
            <p className="text-sm text-slate-500">Review, approve, and manage broker campaigns</p>
          </div>
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-bold rounded-full">
              {pendingCount} pending review
            </span>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              "all",
              "pending_review",
              "active",
              "approved",
              "paused",
              "budget_exhausted",
              "completed",
              "rejected",
              "cancelled",
            ] as StatusFilter[]
          ).map((s) => {
            const count = s === "all" ? campaigns.length : campaigns.filter((c) => c.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  filter === s
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s === "all" ? "All" : s.replace(/_/g, " ")}{" "}
                <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Bulk Action Toolbar */}
        {selected.size > 0 && (
          <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between flex-wrap gap-3 bounce-in-up">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">{selected.size} campaign{selected.size !== 1 ? "s" : ""} selected</span>
              <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-white transition-colors">
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {filtered.some(c => selected.has(c.id) && c.status === "pending_review") && (
                <>
                  <button
                    onClick={() => bulkUpdateStatus("approved")}
                    disabled={bulkLoading}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {bulkLoading ? "..." : "Approve All"}
                  </button>
                  <button
                    onClick={() => bulkUpdateStatus("rejected")}
                    disabled={bulkLoading}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Reject All
                  </button>
                </>
              )}
              {filtered.some(c => selected.has(c.id) && c.status === "active") && (
                <button
                  onClick={() => bulkUpdateStatus("paused")}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50"
                >
                  {bulkLoading ? "..." : "Pause All"}
                </button>
              )}
              {filtered.some(c => selected.has(c.id) && (c.status === "paused" || c.status === "approved")) && (
                <button
                  onClick={() => bulkUpdateStatus("active")}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {bulkLoading ? "..." : "Activate All"}
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No campaigns match this filter.</div>
        ) : (
          <div className="space-y-3">
            {/* Select All toggle */}
            <div className="flex items-center gap-3 px-1">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selected.size === filtered.length && filtered.length > 0
                    ? "bg-slate-900 border-slate-900"
                    : selected.size > 0
                    ? "bg-slate-400 border-slate-400"
                    : "border-slate-300"
                }`}>
                  {(selected.size === filtered.length && filtered.length > 0) && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {(selected.size > 0 && selected.size < filtered.length) && (
                    <span className="w-2 h-0.5 bg-white rounded" />
                  )}
                </span>
                Select all ({filtered.length})
              </button>
            </div>

            {filtered.map((c) => (
              <div
                key={c.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  selected.has(c.id)
                    ? "border-slate-900 ring-1 ring-slate-200"
                    : c.status === "pending_review"
                    ? "border-amber-200 bg-amber-50/30"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(c.id)}
                    className="shrink-0 self-start mt-1"
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selected.has(c.id) ? "bg-slate-900 border-slate-900" : "border-slate-300 hover:border-slate-400"
                    }`}>
                      {selected.has(c.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </button>

                  {/* Campaign Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900">{c.name}</h3>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.inventory_type === "featured"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {c.inventory_type}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Broker: <strong className="text-slate-700">{c.broker_slug}</strong></span>
                      <span>Placement: <strong className="text-slate-700">{c.placement?.name || `#${c.placement_id}`}</strong></span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>
                        Rate:{" "}
                        <strong className="text-slate-700">
                          ${(c.rate_cents / 100).toFixed(2)}
                          {c.inventory_type === "cpc" ? "/click" : "/mo"}
                        </strong>
                      </span>
                      <span>
                        Spent: <strong className="text-slate-700">${(c.total_spent_cents / 100).toFixed(2)}</strong>
                        {c.total_budget_cents && (
                          <> of ${(c.total_budget_cents / 100).toFixed(2)}</>
                        )}
                      </span>
                      <span>
                        Dates: {c.start_date}
                        {c.end_date ? ` → ${c.end_date}` : " → ongoing"}
                      </span>
                    </div>
                    {c.review_notes && (
                      <div className="mt-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                        <strong>Review Notes:</strong> {c.review_notes}
                        {c.reviewed_by && (
                          <span className="text-slate-400"> — {c.reviewed_by}</span>
                        )}
                      </div>
                    )}
                    {/* Budget progress bar */}
                    {c.total_budget_cents && c.total_budget_cents > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                          <span>Budget usage</span>
                          <span>
                            {Math.min(100, Math.round((c.total_spent_cents / c.total_budget_cents) * 100))}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              c.total_spent_cents >= c.total_budget_cents
                                ? "bg-red-500"
                                : c.total_spent_cents >= c.total_budget_cents * 0.8
                                ? "bg-amber-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min(100, (c.total_spent_cents / c.total_budget_cents) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {c.status === "pending_review" && (
                      <>
                        <input
                          type="text"
                          placeholder="Review notes (optional)"
                          value={reviewNotes[c.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [c.id]: e.target.value }))
                          }
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs w-52 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateCampaignStatus(c.id, "approved")}
                            disabled={actionLoading === c.id}
                            className="px-4 py-1.5 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === c.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => updateCampaignStatus(c.id, "rejected")}
                            disabled={actionLoading === c.id}
                            className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    )}
                    {c.status === "active" && (
                      <button
                        onClick={() => updateCampaignStatus(c.id, "paused")}
                        disabled={actionLoading === c.id}
                        className="px-4 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                        Pause
                      </button>
                    )}
                    {c.status === "paused" && (
                      <button
                        onClick={() => updateCampaignStatus(c.id, "active")}
                        disabled={actionLoading === c.id}
                        className="px-4 py-1.5 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                      >
                        Resume
                      </button>
                    )}
                    {c.status === "approved" && (
                      <button
                        onClick={() => updateCampaignStatus(c.id, "active")}
                        disabled={actionLoading === c.id}
                        className="px-4 py-1.5 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                      >
                        Activate Now
                      </button>
                    )}
                    <div className="text-xs text-slate-400">
                      ID: {c.id} · Created{" "}
                      {new Date(c.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
