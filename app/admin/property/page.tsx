"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import Icon from "@/components/Icon";

export default function AdminPropertyOverview() {
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    leadsThisMonth: 0,
    activeDevelopers: 0,
    totalAgents: 0,
    totalSuburbs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [listings, activeListings, leads, developers, agents, suburbs] = await Promise.all([
        supabase.from("property_listings").select("id", { count: "exact", head: true }),
        supabase.from("property_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("property_leads").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
        supabase.from("property_developers").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("buyer_agents").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("suburb_data").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalListings: listings.count || 0,
        activeListings: activeListings.count || 0,
        leadsThisMonth: leads.count || 0,
        activeDevelopers: developers.count || 0,
        totalAgents: agents.count || 0,
        totalSuburbs: suburbs.count || 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Listings", value: stats.totalListings, icon: "building", color: "text-blue-600 bg-blue-50", href: "/admin/property/listings" },
    { label: "Active Listings", value: stats.activeListings, icon: "check-circle", color: "text-emerald-600 bg-emerald-50", href: "/admin/property/listings" },
    { label: "Leads This Month", value: stats.leadsThisMonth, icon: "users", color: "text-amber-600 bg-amber-50", href: "/admin/property/leads" },
    { label: "Active Developers", value: stats.activeDevelopers, icon: "briefcase", color: "text-indigo-600 bg-indigo-50", href: "/admin/property/developers" },
    { label: "Buyer Agents", value: stats.totalAgents, icon: "user", color: "text-cyan-600 bg-cyan-50", href: "/admin/property" },
    { label: "Suburbs Tracked", value: stats.totalSuburbs, icon: "bar-chart", color: "text-slate-600 bg-slate-50", href: "/admin/property" },
  ];

  const tabs = [
    { label: "Listings", href: "/admin/property/listings", icon: "building" },
    { label: "Developers", href: "/admin/property/developers", icon: "briefcase" },
    { label: "Leads", href: "/admin/property/leads", icon: "users" },
    { label: "Buyer Agents", href: "/admin/property", icon: "user" },
    { label: "Suburb Data", href: "/admin/property", icon: "bar-chart" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Property Vertical</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of property listings, developers, buyer agents, and leads.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${card.color}`}>
              <Icon name={card.icon} size={16} />
            </div>
            {loading ? (
              <div className="h-6 bg-slate-100 rounded w-12 animate-pulse" />
            ) : (
              <p className="text-xl font-extrabold text-slate-900">{card.value}</p>
            )}
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Nav Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Icon name={tab.icon} size={16} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">{tab.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
