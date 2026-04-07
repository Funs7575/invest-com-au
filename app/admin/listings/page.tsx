"use client";

import { useState, useEffect, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

interface Listing {
  id: number;
  title: string;
  slug: string;
  vertical: string;
  location_state: string | null;
  asking_price_cents: number | null;
  price_display: string | null;
  status: string;
  listing_type: string;
  firb_eligible: boolean;
  views: number;
  enquiries: number;
  created_at: string;
}

type StatusFilter = "all" | "pending" | "active" | "expired" | "inactive";

const STATUS_OPTIONS = ["pending", "active", "expired", "inactive"] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-700 bg-amber-50",
  active: "text-emerald-700 bg-emerald-50",
  expired: "text-red-700 bg-red-50",
  inactive: "text-slate-700 bg-slate-100",
};

const TYPE_COLORS: Record<string, string> = {
  standard: "text-slate-600 bg-slate-50",
  featured: "text-amber-700 bg-amber-50",
  premium: "text-purple-700 bg-purple-50",
};

function formatPrice(cents: number | null, display: string | null): string {
  if (display) return display;
  if (!cents) return "N/A";
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const supabase = createClient();

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("investment_listings")
      .select(
        "id, title, slug, vertical, location_state, asking_price_cents, price_display, status, listing_type, firb_eligible, views, enquiries, created_at"
      )
      .order("created_at", { ascending: false });
    setListings(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const updateStatus = async (id: number, status: string) => {
    await supabase.from("investment_listings").update({ status }).eq("id", id);
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
  };

  const toggleFeature = async (id: number, currentType: string) => {
    const newType = currentType === "featured" ? "standard" : "featured";
    await supabase
      .from("investment_listings")
      .update({ listing_type: newType })
      .eq("id", id);
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, listing_type: newType } : l))
    );
  };

  const deleteListing = async (id: number) => {
    if (!confirm("Are you sure you want to delete this listing? This cannot be undone.")) return;
    await supabase.from("investment_listings").delete().eq("id", id);
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const filtered =
    filter === "all" ? listings : listings.filter((l) => l.status === filter);

  const tabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "active", label: "Active" },
    { key: "expired", label: "Expired" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <AdminShell title="Investment Listings" subtitle="Moderate marketplace listings">
      <div className="p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Investment Listings
            </h1>
            <p className="text-xs text-slate-500">
              {listings.length} total listings
            </p>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[0.6rem] font-bold rounded-full bg-red-500 text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-slate-50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="inbox" size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No listings match this filter</p>
            <p className="text-xs text-slate-400 mt-1">
              {filter === "all"
                ? "No listings have been submitted yet."
                : `No ${filter} listings found.`}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">
                    Title
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">
                    Vertical
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">
                    State
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">
                    Price
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">
                    Type
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">
                    FIRB
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">
                    Views
                  </th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">
                    Enquiries
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">
                    Created
                  </th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((listing) => (
                  <tr
                    key={listing.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
                    {/* Title */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                        {listing.title}
                      </p>
                      <p className="text-[0.65rem] text-slate-400">
                        {listing.slug}
                      </p>
                    </td>

                    {/* Vertical */}
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell capitalize">
                      {listing.vertical.replace(/_/g, " ")}
                    </td>

                    {/* State */}
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                      {listing.location_state || "—"}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right text-slate-900 font-semibold hidden md:table-cell">
                      {formatPrice(
                        listing.asking_price_cents,
                        listing.price_display
                      )}
                    </td>

                    {/* Status dropdown */}
                    <td className="px-4 py-3 text-center">
                      <select
                        value={listing.status}
                        onChange={(e) =>
                          updateStatus(listing.id, e.target.value)
                        }
                        className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border-0 cursor-pointer ${
                          STATUS_COLORS[listing.status] ||
                          "text-slate-600 bg-slate-100"
                        }`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Listing type */}
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span
                        className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
                          TYPE_COLORS[listing.listing_type] ||
                          "text-slate-600 bg-slate-50"
                        }`}
                      >
                        {listing.listing_type}
                      </span>
                    </td>

                    {/* FIRB */}
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      {listing.firb_eligible ? (
                        <span className="text-emerald-600 font-bold text-xs">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">No</span>
                      )}
                    </td>

                    {/* Views */}
                    <td className="px-4 py-3 text-center font-semibold text-slate-700 hidden md:table-cell">
                      {listing.views}
                    </td>

                    {/* Enquiries */}
                    <td className="px-4 py-3 text-center font-semibold text-slate-700 hidden md:table-cell">
                      {listing.enquiries}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {formatDate(listing.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {listing.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                updateStatus(listing.id, "active")
                              }
                              title="Approve"
                              className="text-emerald-500 hover:text-emerald-700"
                            >
                              <Icon name="check-circle" size={16} />
                            </button>
                            <button
                              onClick={() =>
                                updateStatus(listing.id, "inactive")
                              }
                              title="Reject"
                              className="text-red-400 hover:text-red-600"
                            >
                              <Icon name="x-circle" size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            toggleFeature(listing.id, listing.listing_type)
                          }
                          title={
                            listing.listing_type === "featured"
                              ? "Remove featured"
                              : "Make featured"
                          }
                          className={
                            listing.listing_type === "featured"
                              ? "text-amber-500"
                              : "text-slate-300 hover:text-amber-500"
                          }
                        >
                          <Icon name="star" size={16} />
                        </button>
                        <button
                          onClick={() => deleteListing(listing.id)}
                          title="Delete listing"
                          className="text-red-400 hover:text-red-600"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
