"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Icon from "@/components/Icon";

interface Listing {
  id: number;
  slug: string;
  title: string;
  developer_name: string | null;
  city: string;
  suburb: string;
  property_type: string;
  status: string;
  featured: boolean;
  sponsored: boolean;
  lead_count: number;
  price_from_cents: number;
  created_at: string;
}

function formatPrice(cents: number): string {
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

export default function AdminPropertyListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("property_listings")
      .select("id, slug, title, developer_name, city, suburb, property_type, status, featured, sponsored, lead_count, price_from_cents, created_at")
      .order("created_at", { ascending: false });
    setListings(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const toggleField = async (id: number, field: "featured" | "sponsored", current: boolean) => {
    await supabase.from("property_listings").update({ [field]: !current }).eq("id", id);
    setListings(listings.map((l) => l.id === id ? { ...l, [field]: !current } : l));
  };

  const updateStatus = async (id: number, status: string) => {
    await supabase.from("property_listings").update({ status }).eq("id", id);
    setListings(listings.map((l) => l.id === id ? { ...l, status } : l));
  };

  const deleteListing = async (id: number) => {
    if (!confirm("Delete this listing?")) return;
    await supabase.from("property_listings").delete().eq("id", id);
    setListings(listings.filter((l) => l.id !== id));
  };

  const statusColors: Record<string, string> = {
    active: "text-emerald-700 bg-emerald-50",
    sold_out: "text-red-700 bg-red-50",
    coming_soon: "text-amber-700 bg-amber-50",
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Property Listings</h1>
          <p className="text-xs text-slate-500">{listings.length} total listings</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Title</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">Type</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Price From</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">Leads</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Featured</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Sponsored</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 truncate max-w-[200px]">{listing.title}</p>
                    <p className="text-[0.65rem] text-slate-400">{listing.developer_name}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{listing.city}, {listing.suburb}</td>
                  <td className="px-4 py-3 text-slate-600 hidden lg:table-cell capitalize">{listing.property_type.replace("_", " & ")}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-semibold hidden md:table-cell">{formatPrice(listing.price_from_cents)}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={listing.status}
                      onChange={(e) => updateStatus(listing.id, e.target.value)}
                      className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${statusColors[listing.status] || "text-slate-600 bg-slate-100"}`}
                    >
                      <option value="active">Active</option>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="sold_out">Sold Out</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900">{listing.lead_count}</td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <button onClick={() => toggleField(listing.id, "featured", listing.featured)}>
                      <Icon name={listing.featured ? "star" : "star"} size={16} className={listing.featured ? "text-amber-500" : "text-slate-300"} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    <button onClick={() => toggleField(listing.id, "sponsored", listing.sponsored)}>
                      <Icon name={listing.sponsored ? "zap" : "zap"} size={16} className={listing.sponsored ? "text-blue-500" : "text-slate-300"} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteListing(listing.id)} className="text-red-400 hover:text-red-600">
                      <Icon name="trash-2" size={14} />
                    </button>
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
