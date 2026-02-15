"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface Stats {
  brokers: number;
  articles: number;
  scenarios: number;
  clicks: number;
  clicksToday: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [brokers, articles, scenarios, clicks, clicksToday] = await Promise.all([
        supabase.from("brokers").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("scenarios").select("id", { count: "exact", head: true }),
        supabase.from("affiliate_clicks").select("id", { count: "exact", head: true }),
        supabase
          .from("affiliate_clicks")
          .select("id", { count: "exact", head: true })
          .gte("clicked_at", new Date().toISOString().split("T")[0]),
      ]);
      setStats({
        brokers: brokers.count || 0,
        articles: articles.count || 0,
        scenarios: scenarios.count || 0,
        clicks: clicks.count || 0,
        clicksToday: clicksToday.count || 0,
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Brokers", value: stats?.brokers, href: "/admin/brokers", color: "bg-blue-500/10 text-blue-400" },
    { label: "Articles", value: stats?.articles, href: "/admin/articles", color: "bg-green-500/10 text-green-400" },
    { label: "Scenarios", value: stats?.scenarios, href: "/admin/scenarios", color: "bg-purple-500/10 text-purple-400" },
    { label: "Total Clicks", value: stats?.clicks, href: "/admin/analytics", color: "bg-amber-500/10 text-amber-400" },
    { label: "Clicks Today", value: stats?.clicksToday, href: "/admin/analytics", color: "bg-red-500/10 text-red-400" },
  ];

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className={`text-3xl font-bold ${card.color}`}>
              {stats ? card.value : "—"}
            </div>
            <div className="text-sm text-slate-400 mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/admin/brokers" className="block px-4 py-3 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">
              Manage Brokers →
            </Link>
            <Link href="/admin/articles" className="block px-4 py-3 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">
              Manage Articles →
            </Link>
            <Link href="/admin/analytics" className="block px-4 py-3 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">
              View Analytics →
            </Link>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Site Links</h2>
          <div className="space-y-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">
              🌐 View Live Site
            </a>
            <a href="https://supabase.com/dashboard/project/guggzyqceattncjwvgyc" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">
              🗄️ Supabase Dashboard
            </a>
            <a href="https://vercel.com/finns-projects-2deaa68c/invest-com-au" target="_blank" rel="noopener noreferrer" className="block px-4 py-3 bg-slate-700/50 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors">
              ▲ Vercel Dashboard
            </a>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
