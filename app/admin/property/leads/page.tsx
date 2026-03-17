"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Icon from "@/components/Icon";

interface Lead {
  id: number;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  user_country: string | null;
  investment_budget: string | null;
  timeline: string | null;
  status: string;
  created_at: string;
  property_listings?: { title: string } | null;
  property_developers?: { name: string } | null;
}

export default function AdminPropertyLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("property_leads")
      .select("*, property_listings(title), property_developers(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    setLeads(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateStatus = async (id: number, status: string) => {
    await supabase.from("property_leads").update({ status }).eq("id", id);
    setLeads(leads.map((l) => l.id === id ? { ...l, status } : l));
  };

  const exportCSV = () => {
    const headers = ["Date", "Name", "Email", "Phone", "Country", "Budget", "Timeline", "Listing", "Developer", "Status"];
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleDateString("en-AU"),
      l.user_name,
      l.user_email,
      l.user_phone || "",
      l.user_country || "",
      l.investment_budget || "",
      l.timeline || "",
      (l.property_listings as { title: string } | null)?.title || "",
      (l.property_developers as { name: string } | null)?.name || "",
      l.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `property-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    new: "text-blue-700 bg-blue-50",
    contacted: "text-amber-700 bg-amber-50",
    qualified: "text-emerald-700 bg-emerald-50",
    converted: "text-green-700 bg-green-50",
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Property Leads</h1>
          <p className="text-xs text-slate-500">{leads.length} leads</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <Icon name="download" size={14} />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />)}</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16">
          <Icon name="users" size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No leads yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Name / Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Listing</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">Developer</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Budget</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{lead.user_name}</p>
                    <p className="text-[0.65rem] text-slate-400">{lead.user_email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell truncate max-w-[150px]">
                    {(lead.property_listings as { title: string } | null)?.title || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                    {(lead.property_developers as { name: string } | null)?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{lead.investment_budget || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${statusColors[lead.status] || "text-slate-600 bg-slate-100"}`}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                    </select>
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
