"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

type ProSubscriber = {
  id: number;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  price_id: string | null;
  plan_interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
  profiles: { email: string; display_name: string | null } | null;
};

const PAGE_SIZE = 20;

function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd: boolean }) {
  if (cancelAtPeriodEnd && status === "active") {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Cancelling</span>;
  }
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-red-100 text-red-700",
    canceled: "bg-slate-100 text-slate-500",
    incomplete: "bg-yellow-100 text-yellow-700",
    unpaid: "bg-red-100 text-red-700",
    paused: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-500"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
    </span>
  );
}

export default function AdminProSubscribersPage() {
  const [subscribers, setSubscribers] = useState<ProSubscriber[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*, profiles(email, display_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) setSubscribers(data as ProSubscriber[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(0); }, [search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const active = subscribers.filter((s) => s.status === "active" && !s.cancel_at_period_end);
    const cancelling = subscribers.filter((s) => s.status === "active" && s.cancel_at_period_end);
    const canceled = subscribers.filter((s) => s.status === "canceled");
    const pastDue = subscribers.filter((s) => s.status === "past_due");

    // MRR calculation
    let mrr = 0;
    active.forEach((s) => {
      if (s.plan_interval === "year") mrr += 89 / 12;
      else mrr += 9;
    });

    return {
      total: subscribers.length,
      active: active.length,
      cancelling: cancelling.length,
      canceled: canceled.length,
      pastDue: pastDue.length,
      mrr: Math.round(mrr * 100) / 100,
    };
  }, [subscribers]);

  // Filter
  const filtered = useMemo(() => {
    let result = subscribers;
    if (statusFilter !== "all") {
      if (statusFilter === "cancelling") {
        result = result.filter((s) => s.status === "active" && s.cancel_at_period_end);
      } else {
        result = result.filter((s) => s.status === statusFilter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.profiles?.email?.toLowerCase().includes(q) ||
          s.profiles?.display_name?.toLowerCase().includes(q) ||
          s.stripe_customer_id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [subscribers, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pro Members</h1>
          <p className="text-sm text-slate-500">Manage Investor Pro subscriptions</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">MRR</p>
          <p className="text-xl font-bold text-slate-900">${stats.mrr.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Active</p>
          <p className="text-xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Cancelling</p>
          <p className="text-xl font-bold text-amber-600">{stats.cancelling}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Cancelled</p>
          <p className="text-xl font-bold text-slate-500">{stats.canceled}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Past Due</p>
          <p className="text-xl font-bold text-red-600">{stats.pastDue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by email or Stripe ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        >
          <option value="all">All Statuses ({subscribers.length})</option>
          <option value="active">Active ({stats.active})</option>
          <option value="cancelling">Cancelling ({stats.cancelling})</option>
          <option value="past_due">Past Due ({stats.pastDue})</option>
          <option value="canceled">Cancelled ({stats.canceled})</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Plan</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Started</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Period End</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Stripe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {loading ? "Loading..." : "No subscribers found."}
                  </td>
                </tr>
              )}
              {paged.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{sub.profiles?.email || "—"}</p>
                    {sub.profiles?.display_name && (
                      <p className="text-xs text-slate-400">{sub.profiles.display_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-700">
                      {sub.plan_interval === "year" ? "Yearly ($89)" : "Monthly ($9)"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sub.status} cancelAtPeriodEnd={sub.cancel_at_period_end} />
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(sub.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://dashboard.stripe.com/customers/${sub.stripe_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-600 hover:underline"
                    >
                      View in Stripe ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
