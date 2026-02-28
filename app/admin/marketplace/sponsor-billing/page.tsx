"use client";

import { useState, useEffect } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { TIER_PRICING } from "@/lib/sponsorship";
import type { Broker } from "@/lib/types";

interface SponsorInvoice {
  id: number;
  broker_slug: string;
  tier: string;
  amount_cents: number;
  period_start: string;
  period_end: string;
  status: "pending" | "paid" | "overdue" | "waived";
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export default function SponsorBillingPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [invoices, setInvoices] = useState<SponsorInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<"active" | "invoices">("active");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      const [{ data: brokersData }, { data: invoicesData }] = await Promise.all([
        supabase
          .from("brokers")
          .select("id, name, slug, sponsorship_tier, sponsorship_start, sponsorship_end, color, icon")
          .not("sponsorship_tier", "is", null)
          .order("name"),
        supabase
          .from("sponsor_invoices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      setBrokers((brokersData || []) as Broker[]);
      setInvoices((invoicesData || []) as SponsorInvoice[]);
      setLoading(false);
    };
    load();
  }, []);

  const generateMonthlyInvoices = async () => {
    setGenerating(true);
    const supabase = createClient();
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    let created = 0;
    for (const broker of brokers) {
      const tier = (broker as any).sponsorship_tier as string;
      const pricing = TIER_PRICING[tier];
      if (!pricing) continue;

      // Check if invoice already exists for this period
      const { data: existing } = await supabase
        .from("sponsor_invoices")
        .select("id")
        .eq("broker_slug", broker.slug)
        .eq("period_start", periodStart)
        .maybeSingle();

      if (existing) continue;

      await supabase.from("sponsor_invoices").insert({
        broker_slug: broker.slug,
        tier,
        amount_cents: pricing.monthly * 100,
        period_start: periodStart,
        period_end: periodEnd,
        status: "pending",
      });
      created++;
    }

    // Audit
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({
      action: "generate_invoices",
      entity_type: "sponsor_invoices",
      entity_name: `${periodStart} to ${periodEnd}`,
      admin_email: user?.email || "admin",
      details: { created, period_start: periodStart, period_end: periodEnd },
    });

    // Reload
    const { data: updated } = await supabase
      .from("sponsor_invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setInvoices((updated || []) as SponsorInvoice[]);
    setGenerating(false);
  };

  const updateInvoiceStatus = async (id: number, status: string) => {
    const supabase = createClient();
    const updates: Record<string, any> = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();

    await supabase.from("sponsor_invoices").update(updates).eq("id", id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updates } as SponsorInvoice : inv));

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_audit_log").insert({
      action: `invoice_${status}`,
      entity_type: "sponsor_invoice",
      entity_id: String(id),
      entity_name: `Invoice #${id}`,
      admin_email: user?.email || "admin",
    });
  };

  // Monthly revenue from active sponsorships
  const monthlyRevenue = brokers.reduce((sum, b) => {
    const tier = (b as any).sponsorship_tier as string;
    return sum + (TIER_PRICING[tier]?.monthly || 0);
  }, 0);

  const pendingInvoiceTotal = invoices
    .filter(i => i.status === "pending" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount_cents, 0);

  const paidThisMonth = invoices
    .filter(i => i.status === "paid" && i.paid_at && new Date(i.paid_at).getMonth() === new Date().getMonth())
    .reduce((sum, i) => sum + i.amount_cents, 0);

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    paid: "bg-green-50 text-green-700",
    overdue: "bg-red-50 text-red-700",
    waived: "bg-slate-100 text-slate-500",
  };

  if (loading) return <AdminShell><div className="h-8 bg-slate-100 rounded w-48 animate-pulse" /></AdminShell>;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Sponsor Billing</h1>
            <p className="text-sm text-slate-500">Billing and invoicing for broker sponsorship packages.</p>
          </div>
          <button onClick={generateMonthlyInvoices} disabled={generating}
            className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
            {generating ? "Generating..." : "Generate Monthly Invoices"}
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Active Sponsors</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{brokers.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Monthly Revenue</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">${monthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-2xl font-extrabold text-amber-700 mt-1">${(pendingInvoiceTotal / 100).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Paid This Month</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">${(paidThisMonth / 100).toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 max-w-xs">
          {(["active", "invoices"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}>
              {t === "active" ? "Active Sponsors" : "Invoices"}
            </button>
          ))}
        </div>

        {/* Active Sponsors Tab */}
        {tab === "active" && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Broker</th>
                    <th className="px-4 py-3 text-left">Tier</th>
                    <th className="px-4 py-3 text-right">Monthly</th>
                    <th className="px-4 py-3 text-left">Start</th>
                    <th className="px-4 py-3 text-left">End</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brokers.map(broker => {
                    const tier = (broker as any).sponsorship_tier as string;
                    const pricing = TIER_PRICING[tier];
                    const endDate = (broker as any).sponsorship_end;
                    const isExpiring = endDate && new Date(endDate).getTime() - Date.now() < 14 * 86400000;
                    const isExpired = endDate && new Date(endDate) < new Date();

                    return (
                      <tr key={broker.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.5rem] font-bold text-white"
                              style={{ background: broker.color }}>
                              {broker.icon || broker.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-900">{broker.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            tier === "featured_partner" ? "bg-blue-50 text-blue-700" :
                            tier === "editors_pick" ? "bg-slate-100 text-slate-700" :
                            "bg-amber-50 text-amber-700"
                          }`}>
                            {pricing?.label || tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          ${pricing?.monthly.toLocaleString() || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {(broker as any).sponsorship_start
                            ? new Date((broker as any).sponsorship_start).toLocaleDateString("en-AU")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {endDate ? new Date(endDate).toLocaleDateString("en-AU") : "Ongoing"}
                        </td>
                        <td className="px-4 py-3">
                          {isExpired ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">Expired</span>
                          ) : isExpiring ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Expiring Soon</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {tab === "invoices" && (
          <div className="bg-white rounded-xl border border-slate-200">
            {invoices.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                No invoices yet. Click &quot;Generate Monthly Invoices&quot; to create invoices for active sponsors.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Broker</th>
                      <th className="px-4 py-3 text-left">Tier</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Period</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">#{inv.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{inv.broker_slug}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {TIER_PRICING[inv.tier]?.label || inv.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          ${(inv.amount_cents / 100).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {new Date(inv.period_start).toLocaleDateString("en-AU")} – {new Date(inv.period_end).toLocaleDateString("en-AU")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-1.5 justify-end">
                            {inv.status === "pending" && (
                              <>
                                <button onClick={() => updateInvoiceStatus(inv.id, "paid")}
                                  className="px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                                  Mark Paid
                                </button>
                                <button onClick={() => updateInvoiceStatus(inv.id, "overdue")}
                                  className="px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors">
                                  Overdue
                                </button>
                                <button onClick={() => updateInvoiceStatus(inv.id, "waived")}
                                  className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-colors">
                                  Waive
                                </button>
                              </>
                            )}
                            {inv.status === "overdue" && (
                              <button onClick={() => updateInvoiceStatus(inv.id, "paid")}
                                className="px-2.5 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
