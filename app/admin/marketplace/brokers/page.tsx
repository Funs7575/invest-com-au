"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { BrokerAccount, BrokerWallet } from "@/lib/types";

interface BrokerRow extends BrokerAccount {
  wallet?: BrokerWallet;
  campaignCount?: number;
}

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteSlug, setInviteSlug] = useState("");
  const [inviteRole, setInviteRole] = useState("manager");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Adjustment form
  const [adjustSlug, setAdjustSlug] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Available broker slugs for invite dropdown
  const [brokerSlugs, setBrokerSlugs] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    const [accountsRes, walletsRes, campaignsRes, brokersRes] = await Promise.all([
      supabase.from("broker_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("broker_wallets").select("*"),
      supabase.from("campaigns").select("id, broker_slug"),
      supabase.from("brokers").select("slug, name").eq("status", "active").order("name"),
    ]);

    const accounts = (accountsRes.data || []) as BrokerAccount[];
    const wallets = (walletsRes.data || []) as BrokerWallet[];
    const campaigns = campaignsRes.data || [];

    const walletMap = new Map<string, BrokerWallet>();
    for (const w of wallets) walletMap.set(w.broker_slug, w);

    const campaignCountMap = new Map<string, number>();
    for (const c of campaigns) {
      campaignCountMap.set(c.broker_slug, (campaignCountMap.get(c.broker_slug) || 0) + 1);
    }

    const rows: BrokerRow[] = accounts.map((a) => ({
      ...a,
      wallet: walletMap.get(a.broker_slug),
      campaignCount: campaignCountMap.get(a.broker_slug) || 0,
    }));

    setBrokers(rows);
    setBrokerSlugs((brokersRes.data || []).map((b: { slug: string }) => b.slug));
    setLoading(false);
  };

  const updateAccountStatus = async (accountId: string, newStatus: string) => {
    setActionLoading(accountId);
    const supabase = createClient();
    await supabase
      .from("broker_accounts")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", accountId);

    const account = brokers.find((b) => b.id === accountId);
    await supabase.from("admin_audit_log").insert({
      action: `broker_account_${newStatus}`,
      entity_type: "broker_account",
      entity_id: accountId,
      entity_name: account?.full_name || "",
      details: { new_status: newStatus, broker_slug: account?.broker_slug },
      admin_email: (await supabase.auth.getUser()).data.user?.email || "admin",
    });

    await loadData();
    setActionLoading(null);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName || !inviteSlug) {
      setInviteError("All fields are required.");
      return;
    }
    setInviting(true);
    setInviteError("");

    const supabase = createClient();

    // Create an auth user with a temporary password (broker will reset)
    const tempPassword = `Broker${Date.now()}!${Math.random().toString(36).slice(2, 8)}`;

    // We need the admin client for user creation — use an API call
    // For now, insert the broker_accounts row directly (admin can set up auth separately)
    const { error } = await supabase.from("broker_accounts").insert({
      auth_user_id: crypto.randomUUID(), // placeholder — admin links auth after broker signs up
      broker_slug: inviteSlug,
      email: inviteEmail,
      full_name: inviteName,
      role: inviteRole,
      status: "pending",
      invited_by: (await supabase.auth.getUser()).data.user?.email || "admin",
    });

    if (error) {
      setInviteError(error.message);
      setInviting(false);
      return;
    }

    await supabase.from("admin_audit_log").insert({
      action: "broker_account_invited",
      entity_type: "broker_account",
      entity_name: inviteName,
      details: { email: inviteEmail, broker_slug: inviteSlug, role: inviteRole },
      admin_email: (await supabase.auth.getUser()).data.user?.email || "admin",
    });

    setShowInvite(false);
    setInviteEmail("");
    setInviteName("");
    setInviteSlug("");
    setInviteRole("manager");
    setInviting(false);
    await loadData();
  };

  const handleAdjustment = async () => {
    if (!adjustSlug || !adjustAmount || !adjustDescription) return;
    setAdjusting(true);

    const amountCents = Math.round(parseFloat(adjustAmount) * 100);
    if (isNaN(amountCents) || amountCents === 0) {
      setAdjusting(false);
      return;
    }

    try {
      const res = await fetch("/api/marketplace/wallet-adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker_slug: adjustSlug,
          amount_cents: amountCents,
          description: adjustDescription,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Adjustment failed");
      }
    } catch {
      alert("Network error");
    }

    setAdjustSlug(null);
    setAdjustAmount("");
    setAdjustDescription("");
    setAdjusting(false);
    await loadData();
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Broker Accounts</h1>
            <p className="text-sm text-slate-500">Broker accounts registered for the advertising marketplace.</p>
          </div>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2 bg-amber-500 text-slate-900 font-bold text-sm rounded-lg hover:bg-amber-600 transition-colors"
          >
            + Invite Broker
          </button>
        </div>

        {/* Invite Form */}
        {showInvite && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-bold text-slate-900">Invite New Broker Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <select
                value={inviteSlug}
                onChange={(e) => setInviteSlug(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">Select Broker...</option>
                {brokerSlugs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleInvite}
                disabled={inviting}
                className="px-4 py-2 bg-green-700 text-white font-bold text-sm rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {inviting ? "Creating..." : "Create Account"}
              </button>
              <button
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Note: This creates a broker_accounts record. The broker will need to sign up via
              Supabase Auth and link their account separately.
            </p>
          </div>
        )}

        {/* Wallet Adjustment Modal */}
        {adjustSlug && (
          <div className="bg-white rounded-xl border border-amber-200 p-5 space-y-3">
            <h3 className="font-bold text-slate-900">
              Wallet Adjustment — <span className="text-amber-600">{adjustSlug}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount (negative to debit)"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <input
                type="text"
                placeholder="Description (required)"
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdjustment}
                disabled={adjusting || !adjustAmount || !adjustDescription}
                className="px-4 py-2 bg-amber-500 text-slate-900 font-bold text-sm rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {adjusting ? "Processing..." : "Apply Adjustment"}
              </button>
              <button
                onClick={() => setAdjustSlug(null)}
                className="px-4 py-2 text-slate-600 text-sm rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Broker Accounts Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : brokers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No broker accounts yet. Click &quot;Invite Broker&quot; to get started.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Broker</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Role</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Balance</th>
                    <th className="px-5 py-3 text-right">Campaigns</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brokers.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-slate-900">{b.full_name}</td>
                      <td className="px-5 py-3 text-slate-700">{b.broker_slug}</td>
                      <td className="px-5 py-3 text-slate-500">{b.email}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {b.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            b.status === "active"
                              ? "bg-green-50 text-green-700"
                              : b.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {b.wallet
                          ? `$${(b.wallet.balance_cents / 100).toFixed(2)}`
                          : "$0.00"}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-600">{b.campaignCount}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {b.status === "pending" && (
                            <button
                              onClick={() => updateAccountStatus(b.id, "active")}
                              disabled={actionLoading === b.id}
                              className="px-2 py-1 bg-green-700 text-white text-xs font-bold rounded hover:bg-green-800 transition-colors disabled:opacity-50"
                            >
                              Activate
                            </button>
                          )}
                          {b.status === "active" && (
                            <button
                              onClick={() => updateAccountStatus(b.id, "suspended")}
                              disabled={actionLoading === b.id}
                              className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}
                          {b.status === "suspended" && (
                            <button
                              onClick={() => updateAccountStatus(b.id, "active")}
                              disabled={actionLoading === b.id}
                              className="px-2 py-1 bg-green-700 text-white text-xs font-bold rounded hover:bg-green-800 transition-colors disabled:opacity-50"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => setAdjustSlug(b.broker_slug)}
                            className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded hover:bg-amber-200 transition-colors"
                          >
                            Adjust $
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
