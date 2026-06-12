"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Icon from "@/components/Icon";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import FirmRoutingPanel from "./FirmRoutingPanel";
import type {
  Advisor, FirmDetails, FirmMember, FirmInvite,
  FirmAnalyticsMember, FirmAnalyticsSummary,
} from "./types";

type FirmAnalytics = { members: FirmAnalyticsMember[]; summary: FirmAnalyticsSummary | null };

type Props = {
  advisor: Advisor | null;
};

export default function TeamTab({ advisor }: Props) {
  const [firmMembers, setFirmMembers] = useState<FirmMember[]>([]);
  const [firmInvites, setFirmInvites] = useState<FirmInvite[]>([]);
  const [firmDetails, setFirmDetails] = useState<FirmDetails | null>(null);
  const [firmMemberCount, setFirmMemberCount] = useState(0);
  const [firmAnalytics, setFirmAnalytics] = useState<FirmAnalytics | null>(null);
  const [firmTab, setFirmTab] = useState<"members" | "analytics" | "routing" | "settings">("members");
  const [editingFirm, setEditingFirm] = useState<Partial<FirmDetails> | null>(null);
  const [savingFirm, setSavingFirm] = useState(false);
  const [firmSaved, setFirmSaved] = useState(false);
  const [seatRequestSeats, setSeatRequestSeats] = useState("");
  const [seatRequestReason, setSeatRequestReason] = useState("");
  const [seatRequestStatus, setSeatRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteActionStatus, setInviteActionStatus] = useState<Record<number, "idle" | "loading" | "done" | "error">>({});
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<number | null>(null);
  const [memberRemoveError, setMemberRemoveError] = useState<string | null>(null);
  const [pendingRevokeInviteId, setPendingRevokeInviteId] = useState<number | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [roleErrors, setRoleErrors] = useState<Record<number, string>>({});
  const [inviteActionErrors, setInviteActionErrors] = useState<Record<number, string>>({});
  const [firmSaveError, setFirmSaveError] = useState<string | null>(null);
  const [seatRequestError, setSeatRequestError] = useState<string | null>(null);
  // Self-serve per-seat billing availability (Lead-Ops #13). When true, the
  // seat upgrade goes through Stripe Checkout; when false it falls back to the
  // existing manual ops-review request below.
  const [seatBillingAvailable, setSeatBillingAvailable] = useState(false);

  const loadFirmData = useCallback(async () => {
    try {
      const [inviteRes, firmRes] = await Promise.all([
        fetch("/api/advisor-auth/firm/invite"),
        fetch("/api/advisor-auth/firm"),
      ]);
      if (inviteRes.ok) {
        const data = await inviteRes.json();
        setFirmMembers(data.members || []);
        setFirmInvites(data.invitations || []);
      }
      if (firmRes.ok) {
        const data = await firmRes.json();
        setFirmDetails(data.firm || null);
        setFirmMemberCount(data.memberCount || 0);
        setEditingFirm(data.firm || null);
      }
    } catch { /* ignore */ }
    // Best-effort: probe whether self-serve seat billing is live (firm admins
    // only; the route 403s otherwise). Failure → manual fallback (default).
    if (advisor?.is_firm_admin) {
      try {
        const seatRes = await fetch("/api/advisor-portal/firm-seats");
        if (seatRes.ok) {
          const d = (await seatRes.json()) as { available?: boolean };
          setSeatBillingAvailable(!!d.available);
        }
      } catch { /* ignore — manual fallback */ }
    }
  }, [advisor?.is_firm_admin]);

  const loadFirmAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/advisor-auth/firm/analytics");
      if (res.ok) {
        const data = await res.json();
        setFirmAnalytics(data);
      }
    } catch { /* ignore */ }
  }, []);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteStatus("sending");
    try {
      const res = await fetch("/api/advisor-auth/firm/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), name: inviteName.trim() || undefined }),
      });
      if (res.ok) {
        setInviteError(null);
        setInviteStatus("sent");
        setInviteEmail("");
        setInviteName("");
        loadFirmData();
        setTimeout(() => setInviteStatus("idle"), 3000);
      } else {
        const data = await res.json();
        setInviteError((data as { error?: string }).error || "Failed to send invite");
        setInviteStatus("error");
      }
    } catch {
      setInviteStatus("error");
    }
  };

  useEffect(() => {
    loadFirmData();
  }, [loadFirmData]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{firmDetails?.name || "Team"}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{firmMemberCount} of {firmDetails?.max_seats || 10} seats used</p>
        </div>
        {/* Seat bar */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min((firmMemberCount / (firmDetails?.max_seats || 10)) * 100, 100)}%` }} />
          </div>
          <span className="text-[0.62rem] text-slate-500">{firmMemberCount}/{firmDetails?.max_seats || 10}</span>
        </div>
      </div>

      {/* Sub-tabs. Lead Routing is firm-admin-only. */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
        {(["members", "analytics", ...(advisor?.is_firm_admin ? (["routing"] as const) : []), "settings"] as const).map((t) => (
          <button key={t} onClick={() => { setFirmTab(t); if (t === "analytics" && !firmAnalytics) loadFirmAnalytics(); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${firmTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t === "members" ? "Members & Invites" : t === "analytics" ? "Analytics" : t === "routing" ? "Lead Routing" : "Firm Settings"}
          </button>
        ))}
      </div>

      {/* ── LEAD ROUTING TAB (firm admins only) ── */}
      {firmTab === "routing" && advisor?.is_firm_admin && (
        <FirmRoutingPanel />
      )}

      {/* ── MEMBERS TAB ── */}
      {firmTab === "members" && (
        <>
          {/* Invite form */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Invite a Team Member</h3>
            {firmMemberCount >= (firmDetails?.max_seats || 10) ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                <strong>Seat limit reached.</strong> You&apos;ve used all {firmDetails?.max_seats} seats. Go to <button onClick={() => setFirmTab("settings")} className="underline font-semibold">Firm Settings</button> to request more seats.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Name (optional)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <input type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email address *" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                <button onClick={sendInvite} disabled={inviteStatus === "sending" || !inviteEmail.trim()} aria-busy={inviteStatus === "sending"} className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {inviteStatus === "sending" ? "Sending..." : inviteStatus === "sent" ? "Sent!" : "Send Invite"}
                </button>
              </div>
            )}
            {inviteError && <p role="alert" className="text-xs text-red-600 mt-2">{inviteError}</p>}
          </div>

          {/* Current members */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Team Members ({firmMembers.length})</h3>
            {memberRemoveError && <p role="alert" className="text-xs text-red-600 mb-2">{memberRemoveError}</p>}
            {firmMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No team members yet. Invite your first advisor above.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {firmMembers.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {m.photo_url ? (
                        <Image src={m.photo_url} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0" sizes="36px" />
                      ) : (
                        <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600 shrink-0">{m.name?.[0]}</div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          {m.name}
                          {m.id === advisor?.id && <span className="text-[0.5rem] bg-violet-100 text-violet-700 px-1 py-0.5 rounded font-bold uppercase">You</span>}
                        </div>
                        <div className="text-[0.62rem] text-slate-500 truncate">{m.email} · {PROFESSIONAL_TYPE_LABELS[m.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || m.type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.verified && <span className="text-[0.56rem] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold hidden md:inline">Verified</span>}
                      {/* Role selector */}
                      <select
                        value={m.role || (m.is_firm_admin ? "owner" : "member")}
                        disabled={m.id === advisor?.id}
                        onChange={async (e) => {
                          const newRole = e.target.value;
                          const res = await fetch("/api/advisor-auth/firm/member", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ memberId: m.id, role: newRole }),
                          });
                          if (res.ok) {
                            setRoleErrors(prev => { const n = { ...prev }; delete n[m.id]; return n; });
                            setFirmMembers(prev => prev.map(fm => fm.id === m.id ? { ...fm, role: newRole, is_firm_admin: newRole !== "member" } : fm));
                          } else {
                            const d = await res.json();
                            setRoleErrors(prev => ({ ...prev, [m.id]: (d as { error?: string }).error || "Failed to update role" }));
                          }
                        }}
                        className="text-[0.62rem] border border-slate-200 rounded px-1.5 py-1 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="member">Member</option>
                      </select>
                      {roleErrors[m.id] && <span role="alert" className="text-[0.5rem] text-red-600" title={roleErrors[m.id]}>!</span>}
                      <span className={`text-[0.56rem] px-1.5 py-0.5 rounded font-semibold ${m.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{m.status}</span>
                      {m.id !== advisor?.id && (
                        pendingRemoveMemberId === m.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[0.56rem] text-red-600 font-medium">Remove?</span>
                            <button
                              onClick={async () => {
                                setPendingRemoveMemberId(null);
                                setMemberRemoveError(null);
                                const res = await fetch(`/api/advisor-auth/firm/member?memberId=${m.id}`, { method: "DELETE" });
                                if (res.ok) {
                                  setFirmMembers(prev => prev.filter(fm => fm.id !== m.id));
                                  setFirmMemberCount(c => c - 1);
                                } else {
                                  const d = await res.json();
                                  setMemberRemoveError(d.error || "Failed to remove member");
                                }
                              }}
                              className="text-[0.56rem] font-bold text-white bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded transition-colors"
                            >Yes</button>
                            <button
                              onClick={() => setPendingRemoveMemberId(null)}
                              className="text-[0.56rem] text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                            >No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setMemberRemoveError(null); setPendingRemoveMemberId(m.id); }}
                            className="text-[0.56rem] text-red-500 hover:text-red-700 border border-red-200 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invitations */}
          {firmInvites.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Invitations</h3>
              <div className="divide-y divide-slate-100">
                {firmInvites.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{inv.name || inv.email}</div>
                      {inv.name && <div className="text-[0.62rem] text-slate-500">{inv.email}</div>}
                      <div className="text-[0.56rem] text-slate-500 mt-0.5">
                        Sent {new Date(inv.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })} ·{" "}
                        {inv.status === "pending" ? `Expires ${new Date(inv.expires_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}` : `Status: ${inv.status}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[0.56rem] px-1.5 py-0.5 rounded font-semibold ${
                        inv.status === "pending" ? "bg-amber-50 text-amber-700" :
                        inv.status === "accepted" ? "bg-emerald-50 text-emerald-700" :
                        inv.status === "revoked" ? "bg-red-50 text-red-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>{inv.status}</span>
                      {(inv.status === "pending" || inv.status === "expired") && (
                        <button
                          disabled={inviteActionStatus[inv.id] === "loading"}
                          onClick={async () => {
                            setInviteActionStatus(prev => ({ ...prev, [inv.id]: "loading" }));
                            const res = await fetch("/api/advisor-auth/firm/invite", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ inviteId: inv.id, action: "resend" }),
                            });
                            if (res.ok) {
                              setInviteActionStatus(prev => ({ ...prev, [inv.id]: "done" }));
                              setTimeout(() => setInviteActionStatus(prev => ({ ...prev, [inv.id]: "idle" })), 3000);
                              loadFirmData();
                            } else {
                              const d = await res.json();
                              setInviteActionErrors(prev => ({ ...prev, [inv.id]: (d as { error?: string }).error || "Failed to resend" }));
                              setInviteActionStatus(prev => ({ ...prev, [inv.id]: "error" }));
                            }
                          }}
                          className="text-[0.56rem] text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {inviteActionStatus[inv.id] === "loading" ? "…" : inviteActionStatus[inv.id] === "done" ? "Sent!" : inviteActionStatus[inv.id] === "error" ? <span title={inviteActionErrors[inv.id]}>Failed</span> : "Resend"}
                        </button>
                      )}
                      {inv.status === "pending" && (
                        pendingRevokeInviteId === inv.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[0.56rem] text-red-600 font-medium">Revoke?</span>
                            <button
                              onClick={async () => {
                                setPendingRevokeInviteId(null);
                                setInviteActionStatus(prev => ({ ...prev, [inv.id]: "loading" }));
                                const res = await fetch("/api/advisor-auth/firm/invite", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ inviteId: inv.id, action: "revoke" }),
                                });
                                if (res.ok) {
                                  loadFirmData();
                                } else {
                                  setInviteActionStatus(prev => ({ ...prev, [inv.id]: "error" }));
                                }
                              }}
                              className="text-[0.56rem] font-bold text-white bg-red-600 hover:bg-red-700 px-1.5 py-0.5 rounded transition-colors"
                            >Yes</button>
                            <button
                              onClick={() => setPendingRevokeInviteId(null)}
                              className="text-[0.56rem] text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 transition-colors"
                            >No</button>
                          </div>
                        ) : (
                        <button
                          disabled={inviteActionStatus[inv.id] === "loading"}
                          onClick={() => setPendingRevokeInviteId(inv.id)}
                          className="text-[0.56rem] text-red-500 border border-red-200 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Revoke
                        </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {firmTab === "analytics" && (
        <>
          {!firmAnalytics ? (
            <div className="space-y-4 animate-pulse" role="status" aria-label="Loading team analytics">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-xl" />
                ))}
              </div>
              <div className="h-48 bg-slate-100 rounded-xl" />
            </div>
          ) : (
            <>
              {firmAnalytics.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: "Total Views (30d)", value: firmAnalytics.summary.totalViews30d, icon: "eye", color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Enquiries (30d)", value: firmAnalytics.summary.totalLeads30d, icon: "inbox", color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Conversion Rate", value: firmAnalytics.summary.conversionRate, icon: "target", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Total Credits", value: `$${((firmAnalytics.summary.totalCreditCents || 0) / 100).toFixed(0)}`, icon: "credit-card", color: "text-amber-600", bg: "bg-amber-50" },
                  ].map((s, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                      <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
                        <Icon name={s.icon} size={16} className={s.color} />
                      </div>
                      <p className="text-lg font-bold text-slate-900">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                      <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Performance by Member</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" aria-label="Performance by member">
                    <thead>
                      <tr className="bg-slate-50 text-[0.62rem] font-semibold text-slate-500 uppercase tracking-wider">
                        <th scope="col" className="px-4 py-2">Advisor</th>
                        <th scope="col" className="px-4 py-2 text-right">Views (30d)</th>
                        <th scope="col" className="px-4 py-2 text-right">Leads (30d)</th>
                        <th scope="col" className="px-4 py-2 text-right">Converted</th>
                        <th scope="col" className="px-4 py-2 text-right">Credits</th>
                        <th scope="col" className="px-4 py-2 text-right">Total Billed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {firmAnalytics.members.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {m.photo_url ? (
                                <Image src={m.photo_url} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover shrink-0" sizes="24px" />
                              ) : (
                                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-[0.56rem] font-bold text-violet-600 shrink-0">{m.name?.[0]}</div>
                              )}
                              <div>
                                <div className="font-semibold text-slate-900 text-xs">{m.name}</div>
                                <div className="text-[0.56rem] text-slate-500">{m.role || "member"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">{m.views30d}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">{m.leads30d}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-[0.56rem] font-semibold ${m.convertedLeads > 0 ? "text-emerald-600" : "text-slate-500"}`}>{m.convertedLeads} ({m.conversionRate})</span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-600">${((m.credit_balance_cents || 0) / 100).toFixed(0)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-600">${((m.totalBilledCents || 0) / 100).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {firmAnalytics.summary && (
                      <tfoot>
                        <tr className="bg-slate-50 font-bold text-xs border-t border-slate-200">
                          <td className="px-4 py-2.5 text-slate-700">Total ({firmAnalytics.summary.totalMembers} members)</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{firmAnalytics.summary.totalViews30d}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">{firmAnalytics.summary.totalLeads30d}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-700">{firmAnalytics.summary.totalConverted} ({firmAnalytics.summary.conversionRate})</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">${((firmAnalytics.summary.totalCreditCents || 0) / 100).toFixed(0)}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700">${((firmAnalytics.summary.totalBilledCents || 0) / 100).toFixed(0)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── SETTINGS TAB ── */}
      {firmTab === "settings" && editingFirm && (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Firm Profile</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="firm-name" className="block text-xs font-semibold text-slate-600 mb-1">Firm Name</label>
                <input
                  id="firm-name"
                  value={editingFirm.name || ""}
                  onChange={(e) => setEditingFirm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="e.g. Chen Advisory Group"
                />
              </div>
              <div>
                <label htmlFor="firm-bio" className="block text-xs font-semibold text-slate-600 mb-1">About the Firm</label>
                <textarea
                  id="firm-bio"
                  value={editingFirm.bio || ""}
                  onChange={(e) => setEditingFirm(f => ({ ...f, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Describe your firm and its approach..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firm-website" className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                  <input id="firm-website" type="url" autoComplete="url" value={editingFirm.website || ""} onChange={(e) => setEditingFirm(f => ({ ...f, website: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label htmlFor="firm-phone" className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input id="firm-phone" value={editingFirm.phone || ""} onChange={(e) => setEditingFirm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="02 XXXX XXXX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firm-email" className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input id="firm-email" type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoComplete="email" value={editingFirm.email || ""} onChange={(e) => setEditingFirm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="info@firm.com.au" />
                </div>
                <div>
                  <label htmlFor="firm-abn" className="block text-xs font-semibold text-slate-600 mb-1">ABN</label>
                  <input id="firm-abn" value={editingFirm.abn || ""} onChange={(e) => setEditingFirm(f => ({ ...f, abn: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="XX XXX XXX XXX" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firm-afsl" className="block text-xs font-semibold text-slate-600 mb-1">AFSL Number</label>
                  <input id="firm-afsl" value={editingFirm.afsl_number || ""} onChange={(e) => setEditingFirm(f => ({ ...f, afsl_number: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 234567" />
                </div>
                <div>
                  <label htmlFor="firm-state" className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                  <select id="firm-state" value={editingFirm.location_state || ""} onChange={(e) => setEditingFirm(f => ({ ...f, location_state: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select...</option>
                    {["NSW","VIC","QLD","WA","SA","TAS","ACT","NT"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="firm-suburb" className="block text-xs font-semibold text-slate-600 mb-1">Suburb</label>
                <input id="firm-suburb" value={editingFirm.location_suburb || ""} onChange={(e) => setEditingFirm(f => ({ ...f, location_suburb: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Sydney CBD" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={async () => {
                    setSavingFirm(true);
                    try {
                      const res = await fetch("/api/advisor-auth/firm", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(editingFirm),
                      });
                      if (res.ok) {
                        setFirmSaveError(null);
                        const data = await res.json();
                        setFirmDetails(data.firm);
                        setEditingFirm(data.firm);
                        setFirmSaved(true);
                        setTimeout(() => setFirmSaved(false), 3000);
                      } else {
                        const d = await res.json();
                        setFirmSaveError((d as { error?: string }).error || "Failed to save changes. Please try again.");
                      }
                    } finally { setSavingFirm(false); }
                  }}
                  disabled={savingFirm}
                  className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingFirm ? "Saving..." : "Save Changes"}
                </button>
                {firmSaved && <span role="status" className="text-sm text-emerald-600 font-medium">Saved!</span>}
                {firmSaveError && <p role="alert" className="text-xs text-red-600">{firmSaveError}</p>}
              </div>
            </div>
          </div>

          {/* Seat upgrade */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Seat Limit</h3>
                <p className="text-xs text-slate-500 mt-0.5">Currently {firmMemberCount} of {firmDetails?.max_seats || 10} seats used.</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${firmMemberCount >= (firmDetails?.max_seats || 10) ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {firmDetails?.max_seats || 10} seats
              </span>
            </div>

            {seatRequestStatus === "sent" ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
                Request sent! Our team will review and update your seat limit within 1 business day.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="seat-req-count" className="block text-xs font-semibold text-slate-600 mb-1">Requested Seats</label>
                    <input
                      id="seat-req-count"
                      type="number" inputMode="decimal"
                      value={seatRequestSeats}
                      onChange={(e) => setSeatRequestSeats(e.target.value)}
                      min={(firmDetails?.max_seats || 10) + 1}
                      max={200}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder={`More than ${firmDetails?.max_seats || 10}`}
                    />
                    {seatRequestSeats && parseInt(seatRequestSeats) <= (firmDetails?.max_seats || 10) && (
                      <p className="text-[0.65rem] text-amber-600 mt-1">
                        Must be more than your current limit ({firmDetails?.max_seats || 10} seats).
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="seat-req-reason" className="block text-xs font-semibold text-slate-600 mb-1">Reason (optional)</label>
                    <input
                      id="seat-req-reason"
                      value={seatRequestReason}
                      onChange={(e) => setSeatRequestReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Growing team, new office..."
                    />
                  </div>
                </div>
                <button
                  disabled={seatRequestStatus === "sending" || !seatRequestSeats}
                  onClick={async () => {
                    const requestedSeats = parseInt(seatRequestSeats);
                    setSeatRequestStatus("sending");
                    setSeatRequestError(null);

                    // Self-serve path: when per-seat billing is live, take the
                    // admin to Stripe Checkout for a quantity-based seat sub.
                    if (seatBillingAvailable) {
                      try {
                        const checkoutRes = await fetch("/api/advisor-portal/firm-seats", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ seats: requestedSeats }),
                        });
                        if (checkoutRes.ok) {
                          const { url } = (await checkoutRes.json()) as { url?: string };
                          if (url) { window.location.href = url; return; }
                        }
                        const j = (await checkoutRes.json()) as { fallback?: string };
                        // Anything other than an explicit manual fallback is a
                        // hard error; only fall through to manual when told to.
                        if (j.fallback !== "manual") {
                          setSeatRequestError("Could not start seat checkout. Please try again.");
                          setSeatRequestStatus("error");
                          return;
                        }
                        // else: fall through to the manual request below.
                      } catch {
                        // Network error → fall through to manual request.
                      }
                    }

                    // Manual fallback: ops-reviewed seat-upgrade request.
                    const res = await fetch("/api/advisor-auth/firm/seat-request", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ requestedSeats, reason: seatRequestReason }),
                    });
                    if (res.ok) {
                      setSeatRequestError(null);
                      setSeatRequestStatus("sent");
                    } else {
                      const d = await res.json();
                      setSeatRequestError((d as { error?: string }).error || "Failed to submit request. Please try again.");
                      setSeatRequestStatus("error");
                    }
                  }}
                  className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {seatRequestStatus === "sending" ? (seatBillingAvailable ? "Redirecting…" : "Sending...") : seatBillingAvailable ? "Add Seats" : "Request More Seats"}
                </button>
                {seatRequestError && <p role="alert" className="text-xs text-red-600">{seatRequestError}</p>}
                <p className="text-[0.6rem] text-slate-500">
                  {seatBillingAvailable
                    ? "Seats are billed monthly per advisor. You'll be taken to secure checkout to confirm."
                    : "Our team will review your request and update your seat limit within 1 business day. There's no charge for seat upgrades."}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
