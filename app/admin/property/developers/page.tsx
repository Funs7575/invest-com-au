"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Icon from "@/components/Icon";

interface Developer {
  id: number;
  slug: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  projects_completed: number;
  monthly_fee_cents: number;
  credit_balance_cents: number;
  stripe_customer_id: string | null;
  created_at: string;
}

export default function AdminPropertyDevelopers() {
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchDevelopers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("property_developers")
      .select("*")
      .order("name", { ascending: true });
    setDevelopers(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchDevelopers(); }, [fetchDevelopers]);

  const toggleStatus = async (id: number, current: string) => {
    const newStatus = current === "active" ? "pending" : "active";
    await supabase.from("property_developers").update({ status: newStatus }).eq("id", id);
    setDevelopers(developers.map((d) => d.id === id ? { ...d, status: newStatus } : d));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-slate-900">Property Developers</h1>
        <p className="text-xs text-slate-500">{developers.length} developers</p>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Developer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Contact</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Projects</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600">Credit Balance</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">Monthly Fee</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {developers.map((dev) => (
                <tr key={dev.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{dev.name}</p>
                    <p className="text-[0.65rem] text-slate-400">{dev.slug}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-slate-600">{dev.contact_email || "—"}</p>
                    <p className="text-[0.65rem] text-slate-400">{dev.contact_phone || ""}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 hidden md:table-cell">{dev.projects_completed}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${dev.credit_balance_cents > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                      ${(dev.credit_balance_cents / 100).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 hidden lg:table-cell">
                    ${(dev.monthly_fee_cents / 100).toFixed(0)}/mo
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleStatus(dev.id, dev.status)}
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
                        dev.status === "active" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      {dev.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {dev.stripe_customer_id ? (
                      <Icon name="check-circle" size={14} className="text-emerald-500 inline" />
                    ) : (
                      <Icon name="x-circle" size={14} className="text-slate-300 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
