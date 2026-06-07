"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import LeadScoreBadge from "@/components/LeadScoreBadge";
import type { Advisor, Stats, Lead, CategoryPricing, DisputeModal, FirmMemberOption } from "./types";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal-leads");

const PIPELINE_STAGES = [
  { value: "new", label: "New", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: "contacted", label: "Contacted", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "proposal_sent", label: "Proposal Sent", color: "text-violet-700 bg-violet-50 border-violet-200" },
  { value: "negotiating", label: "Negotiating", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { value: "won", label: "Won", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { value: "lost", label: "Lost", color: "text-red-600 bg-red-50 border-red-200" },
] as const;

type LeadStatusFilter = "all" | "new" | "contacted" | "converted" | "lost";

type Props = {
  leads: Lead[];
  advisor: Advisor | null;
  stats: Stats | null;
  categoryPricing: CategoryPricing | null;
  leadSearch: string;
  leadStatusFilter: LeadStatusFilter;
  leadSortByQuality: boolean;
  hotLeadsOnly: boolean;
  onLeadSearchChange: (v: string) => void;
  onLeadStatusFilterChange: (v: LeadStatusFilter) => void;
  onLeadSortByQualityChange: (v: boolean) => void;
  onHotLeadsOnlyChange: (v: boolean) => void;
  onLeadsUpdate: (updater: (prev: Lead[]) => Lead[]) => void;
  onOpenDisputeModal: (modal: DisputeModal) => void;
  onUpdateLeadStatus: (leadId: number, status: string) => Promise<void>;
  onUpdateLeadNotes: (leadId: number, notes: string) => Promise<void>;
};

export default function LeadsTab({
  leads, advisor, stats, categoryPricing,
  leadSearch, leadStatusFilter, leadSortByQuality, hotLeadsOnly,
  onLeadSearchChange, onLeadStatusFilterChange, onLeadSortByQualityChange, onHotLeadsOnlyChange,
  onLeadsUpdate, onOpenDisputeModal, onUpdateLeadStatus, onUpdateLeadNotes,
}: Props) {
  // Firm inbox — only visible to firm admins
  const isFirmAdmin = !!advisor?.is_firm_admin && !!advisor?.firm_id;
  const [firmView, setFirmView] = useState(false);
  const [pipelineUpdating, setPipelineUpdating] = useState<number | null>(null);
  const [firmLeads, setFirmLeads] = useState<Lead[]>([]);
  const [firmMembers, setFirmMembers] = useState<FirmMemberOption[]>([]);
  const [firmLoading, setFirmLoading] = useState(false);
  const [notesFeedback, setNotesFeedback] = useState<{id: number; status: "saving" | "saved"} | null>(null);
  const [firmError, setFirmError] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<number | null>(null);

  useEffect(() => {
    if (!firmView || !isFirmAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronous setup before async fetch; no cascade risk
    setFirmLoading(true);
     
    setFirmError(null);
    fetch("/api/advisor-portal/firm-leads")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d: { leads: Lead[]; members: FirmMemberOption[] }) => {
        setFirmLeads(d.leads ?? []);
        setFirmMembers(d.members ?? []);
      })
      .catch(() => setFirmError("Failed to load team leads."))
      .finally(() => setFirmLoading(false));
  }, [firmView, isFirmAdmin]);

  const reassignLead = async (leadId: number, professionalId: number) => {
    setReassigning(leadId);
    try {
      await fetch("/api/advisor-portal/firm-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, professional_id: professionalId }),
      });
      setFirmLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, professional_id: professionalId, professional_name: firmMembers.find((m) => m.id === professionalId)?.name ?? "" }
            : l,
        ),
      );
    } catch { /* ignore */ }
    setReassigning(null);
  };

  const updatePipeline = async (
    leadId: number,
    patch: { pipeline_stage?: string; next_action_at?: string | null },
  ) => {
    setPipelineUpdating(leadId);
    try {
      await fetch("/api/advisor-portal/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, ...patch }),
      });
      onLeadsUpdate((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...patch } : l)),
      );
    } catch (err) {
      log.warn("pipeline update failed", { err: String(err) });
    }
    setPipelineUpdating(null);
  };

  const filteredLeads = leads.filter((l) => {
    const matchesStatus = leadStatusFilter === "all" || l.status === leadStatusFilter;
    const q = leadSearch.toLowerCase();
    const matchesSearch = !q || l.user_name.toLowerCase().includes(q) || l.user_email.toLowerCase().includes(q) || (l.user_phone || "").includes(q);
    const matchesHot = !hotLeadsOnly || (l.quality_score ?? 0) >= 70;
    return matchesStatus && matchesSearch && matchesHot;
  });

  if (leadSortByQuality) {
    filteredLeads.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
  }

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Status", "Message", "Source", "Quality", "Billed ($)", "Date"],
      ...filteredLeads.map((l) => [
        l.user_name, l.user_email, l.user_phone || "", l.status,
        (l.message || "").replace(/"/g, '""'),
        l.source_page || "",
        l.quality_score != null ? String(l.quality_score) : "",
        l.bill_amount_cents ? (l.bill_amount_cents / 100).toFixed(2) : "0",
        new Date(l.created_at).toLocaleDateString("en-AU"),
      ])
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">Enquiries</h1>
          {isFirmAdmin && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
              <button
                onClick={() => setFirmView(false)}
                className={`px-3 py-1.5 transition-colors ${!firmView ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Mine
              </button>
              <button
                onClick={() => setFirmView(true)}
                className={`px-3 py-1.5 transition-colors ${firmView ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Team
              </button>
            </div>
          )}
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <Icon name="download" size={13} /> Export CSV
        </button>
      </div>

      {/* Firm team inbox */}
      {firmView && isFirmAdmin && (
        <div className="mb-6">
          {firmLoading && <p className="text-sm text-slate-500 py-8 text-center">Loading team leads…</p>}
          {firmError && <p className="text-sm text-red-600 py-4">{firmError}</p>}
          {!firmLoading && !firmError && (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 mb-3">{firmLeads.length} leads across {firmMembers.length} team member{firmMembers.length !== 1 ? "s" : ""}</p>
              {firmLeads.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-sm">No team leads yet.</div>
              )}
              {firmLeads.map((l) => (
                <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{l.user_name}</p>
                    <p className="text-xs text-slate-500">{l.user_email}{l.user_phone ? ` · ${l.user_phone}` : ""}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(l.created_at).toLocaleDateString("en-AU")}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.status === "new" ? "bg-emerald-100 text-emerald-700" : l.status === "converted" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                      {l.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">Assigned:</span>
                      <select
                        value={l.professional_id ?? ""}
                        onChange={(e) => { if (e.target.value) reassignLead(l.id, Number(e.target.value)); }}
                        disabled={reassigning === l.id}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        aria-label="Assign to advisor"
                      >
                        {firmMembers.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-slate-500 mb-4">{stats?.totalLeads || 0} total · {leads.filter(l => l.status === "new").length} new</p>

      {/* Lead pricing & credit balance */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xs font-bold text-violet-800 mb-1">Your Lead Account</h3>
            <p className="text-xs text-violet-600">
              {advisor?.free_leads_used !== undefined && advisor.free_leads_used < (categoryPricing?.free_trial_leads || 2)
                ? <>You have <strong>{(categoryPricing?.free_trial_leads || 2) - (advisor.free_leads_used || 0)} free leads</strong> remaining. After that, leads are deducted from your credit balance at ${((advisor?.lead_price_cents || categoryPricing?.price_cents || 4900) / 100).toFixed(0)}/lead.</>
                : (advisor?.credit_balance_cents || 0) > 0
                  ? <>Leads are deducted from your credit balance. Each enquiry is exclusive to you.</>
                  : <>Your credit balance is empty. <strong>Top up to continue receiving leads.</strong></>
              }
            </p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <span className="text-lg font-extrabold text-violet-900">${((advisor?.credit_balance_cents || 0) / 100).toFixed(0)}</span>
            <span className="text-[0.6rem] text-violet-500 block">credit balance</span>
          </div>
        </div>
        {/* Credit Pack Options */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-violet-200/60">
          {[
            { name: "Starter", leads: 5, price: 199, slug: "starter", badge: "" },
            { name: "Growth", leads: 12, price: 449, slug: "growth", badge: "Popular" },
            { name: "Scale", leads: 25, price: 799, slug: "scale", badge: "Best Value" },
          ].map((pack) => (
            <button
              key={pack.slug}
              type="button"
              tabIndex={0}
              onClick={async () => {
                try {
                  const res = await fetch("/api/advisor-auth/topup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount_cents: pack.price * 100, pack_slug: pack.slug }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert(data.error || "Failed to create checkout session. Please try again.");
                } catch (err) {
                  alert("Something went wrong. Please check you&apos;re logged in and try again.");
                  log.error("topup checkout failed", { err: err instanceof Error ? err.message : String(err) });
                }
              }}
              className={`relative flex flex-col items-center p-2.5 rounded-lg border text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                pack.slug === "growth"
                  ? "bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                  : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"
              }`}
            >
              {pack.badge && (
                <span className={`absolute -top-2 text-[0.5rem] font-bold px-1.5 py-0.5 rounded-full ${
                  pack.slug === "growth" ? "bg-amber-400 text-amber-900" : "bg-emerald-100 text-emerald-700"
                }`}>{pack.badge}</span>
              )}
              <span className="text-[0.6rem] font-bold uppercase tracking-wider opacity-70 mt-1">{pack.name}</span>
              <span className="text-lg font-extrabold">${pack.price}</span>
              <span className="text-[0.55rem] opacity-70">{pack.leads} leads · ${Math.round(pack.price / pack.leads)}/ea</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-45">
          <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={leadSearch}
            onChange={(e) => onLeadSearchChange(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "new", "contacted", "converted", "lost"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onLeadStatusFilterChange(s)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors capitalize ${
                leadStatusFilter === s
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {s === "all" ? `All (${leads.length})` : `${s} (${leads.filter(l => l.status === s).length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onLeadSortByQualityChange(!leadSortByQuality)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              leadSortByQuality
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            <Icon name="filter" size={12} /> Sort by quality
          </button>
          <button
            onClick={() => onHotLeadsOnlyChange(!hotLeadsOnly)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              hotLeadsOnly
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {hotLeadsOnly ? "🔥" : ""} Hot leads only{stats ? ` (${stats.hotLeadsCount})` : ""}
            <InfoTip text="Quality score 70+ — investors who provided more detail and showed higher intent." />
          </button>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="inbox" size={40} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No enquiries yet</h3>
          <p className="text-sm text-slate-500">When investors submit a consultation request through your profile, they&apos;ll appear here.</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="search" size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No leads match your filters.</p>
          <button onClick={() => { onLeadSearchChange(""); onLeadStatusFilterChange("all"); onHotLeadsOnlyChange(false); onLeadSortByQualityChange(false); }} className="mt-2 text-xs text-violet-600 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className={`bg-white border rounded-xl p-4 ${lead.status === "new" ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{lead.user_name}</span>
                    <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                      lead.status === "new" ? "bg-amber-100 text-amber-700" :
                      lead.status === "contacted" ? "bg-blue-100 text-blue-700" :
                      lead.status === "converted" ? "bg-emerald-100 text-emerald-700" :
                      lead.status === "lost" ? "bg-red-100 text-red-600" :
                      "bg-slate-100 text-slate-500"
                    }`}>{lead.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <a href={`mailto:${lead.user_email}`} className="text-blue-600 hover:underline">{lead.user_email}</a>
                    {lead.user_phone && <> · <a href={`tel:${lead.user_phone}`} className="text-blue-600 hover:underline">{lead.user_phone}</a></>}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              {lead.message && (
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-3 leading-relaxed">{lead.message}</div>
              )}

              {/* Pipeline stage + follow-up date */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <select
                  value={lead.pipeline_stage ?? "new"}
                  disabled={pipelineUpdating === lead.id}
                  onChange={(e) => updatePipeline(lead.id, { pipeline_stage: e.target.value })}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Pipeline stage"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <Icon name="calendar" size={12} className="text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={lead.next_action_at ? lead.next_action_at.slice(0, 10) : ""}
                    disabled={pipelineUpdating === lead.id}
                    onChange={(e) =>
                      updatePipeline(lead.id, {
                        next_action_at: e.target.value
                          ? new Date(e.target.value + "T09:00:00+10:00").toISOString()
                          : null,
                      })
                    }
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next follow-up date"
                  />
                </div>
                {lead.next_action_at && new Date(lead.next_action_at) < new Date() && (
                  <span className="text-[0.62rem] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
                    Overdue
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {lead.source_page && (
                  <span className="text-[0.56rem] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    via {lead.source_page.replace(/^\//, "").replace(/-/g, " ") || "profile"}
                  </span>
                )}
                {lead.quality_score != null && (
                  <LeadScoreBadge score={lead.quality_score} signals={lead.quality_signals} tier={lead.lead_tier} />
                )}
                {lead.bill_amount_cents > 0 && (
                  <span className="text-[0.56rem] text-slate-400">${(lead.bill_amount_cents / 100).toFixed(0)} billed</span>
                )}
                {lead.bill_amount_cents === 0 && lead.billed === false && (
                  <span className="text-[0.56rem] text-emerald-600 font-semibold">Free trial lead</span>
                )}
                {lead.status === "new" && (
                  <button onClick={() => onUpdateLeadStatus(lead.id, "contacted")} className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded-lg hover:bg-blue-50">Mark Contacted</button>
                )}
                {(lead.status === "new" || lead.status === "contacted") && (
                  <button onClick={() => onUpdateLeadStatus(lead.id, "converted")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2 py-1 border border-emerald-200 rounded-lg hover:bg-emerald-50">Mark Converted</button>
                )}
                {lead.status !== "lost" && lead.status !== "converted" && (
                  <button onClick={() => onUpdateLeadStatus(lead.id, "lost")} className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded-lg hover:bg-red-50">Mark Lost</button>
                )}
                {lead.status === "converted" && (
                  lead.review_requested_at
                    ? <span className="text-[0.56rem] text-slate-400 px-1.5 py-0.5">Review requested {new Date(lead.review_requested_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                    : <button
                        onClick={async () => {
                          const res = await fetch("/api/advisor-auth/request-review", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ leadId: lead.id }),
                          });
                          if (res.ok) {
                            onLeadsUpdate((prev) => prev.map((l) => l.id === lead.id ? { ...l, review_requested_at: new Date().toISOString() } : l));
                          } else {
                            const d = await res.json();
                            alert(d.error || "Failed to send review request.");
                          }
                        }}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-800 px-2 py-1 border border-violet-200 rounded-lg hover:bg-violet-50"
                      >Request Review</button>
                )}
                {(() => {
                  const daysSince = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
                  const canDispute = daysSince <= 14 && lead.billed;
                  const daysLeft = 14 - daysSince;
                  return (
                    <button
                      onClick={() => {
                        if (!canDispute) return;
                        onOpenDisputeModal({ leadId: lead.id, leadName: lead.user_name, daysLeft });
                      }}
                      disabled={!canDispute}
                      className={`text-xs font-semibold px-2 py-1 border rounded-lg ${canDispute ? "text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-50" : "text-slate-300 border-slate-100 cursor-not-allowed"}`}
                      title={!canDispute ? (daysSince > 14 ? "Dispute window closed (14 days)" : "Free leads cannot be disputed") : `${daysLeft} days left to dispute`}
                    >
                      Dispute{canDispute && daysLeft <= 5 ? ` (${daysLeft}d left)` : ""}
                    </button>
                  );
                })()}
                <div className="flex-1 min-w-30 flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Add a note..."
                    defaultValue={lead.advisor_notes || ""}
                    onBlur={async (e) => {
                      setNotesFeedback({ id: lead.id, status: "saving" });
                      await onUpdateLeadNotes(lead.id, e.target.value);
                      setNotesFeedback({ id: lead.id, status: "saved" });
                      setTimeout(() => setNotesFeedback(null), 2000);
                    }}
                    className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  {notesFeedback?.id === lead.id && (
                    <span className={`text-[0.6rem] font-semibold shrink-0 ${notesFeedback.status === "saved" ? "text-emerald-600" : "text-slate-400"}`}>
                      {notesFeedback.status === "saving" ? "Saving…" : "Saved"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
