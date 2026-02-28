"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Notification {
  id: string;
  type: "warning" | "info" | "error" | "success";
  icon: string;
  title: string;
  message: string;
  href: string;
  timestamp: Date;
}

export default function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Fetch notifications
  useEffect(() => {
    const supabase = createClient();

    async function fetchNotifications() {
      setLoading(true);
      const notes: Notification[] = [];

      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const today = new Date().toISOString();

      const [
        pendingReviews,
        pendingQuestions,
        pendingStories,
        brokersData,
        activeCampaigns,
        supportTickets,
        staleArticles,
        expiringDeals,
        lowHealthScores,
        draftArticles,
      ] = await Promise.all([
        supabase.from("user_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("broker_questions").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("switch_stories").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("brokers").select("name, affiliate_url, status").eq("status", "active"),
        supabase.from("campaigns").select("id, status, total_budget_cents, total_spent_cents").eq("status", "active"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published").lt("updated_at", ninetyDaysAgo),
        supabase.from("deals_of_month").select("id, broker_name").not("expiry_date", "is", null).gte("expiry_date", today).lte("expiry_date", sevenDaysFromNow),
        supabase.from("broker_health_scores").select("broker_slug").lt("overall_score", 60),
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      ]);

      // Pending reviews
      if (pendingReviews.count && pendingReviews.count > 0) {
        notes.push({
          id: "pending-reviews",
          type: "warning",
          icon: "⭐",
          title: `${pendingReviews.count} pending review${pendingReviews.count !== 1 ? "s" : ""}`,
          message: "User reviews awaiting moderation",
          href: "/admin/user-reviews",
          timestamp: new Date(),
        });
      }

      // Pending questions
      if (pendingQuestions.count && pendingQuestions.count > 0) {
        notes.push({
          id: "pending-questions",
          type: "warning",
          icon: "💬",
          title: `${pendingQuestions.count} pending question${pendingQuestions.count !== 1 ? "s" : ""}`,
          message: "Questions awaiting approval or answer",
          href: "/admin/questions",
          timestamp: new Date(),
        });
      }

      // Pending stories
      if (pendingStories.count && pendingStories.count > 0) {
        notes.push({
          id: "pending-stories",
          type: "warning",
          icon: "🔄",
          title: `${pendingStories.count} pending switch stor${pendingStories.count !== 1 ? "ies" : "y"}`,
          message: "Stories awaiting moderation",
          href: "/admin/switch-stories",
          timestamp: new Date(),
        });
      }

      // Brokers missing affiliate URL
      if (brokersData.data) {
        const missing = brokersData.data.filter((b) => !b.affiliate_url);
        if (missing.length > 0) {
          notes.push({
            id: "missing-affiliate",
            type: "error",
            icon: "🔗",
            title: `${missing.length} broker${missing.length !== 1 ? "s" : ""} missing affiliate URL`,
            message: missing.map((b) => b.name).join(", "),
            href: "/admin/affiliate-links",
            timestamp: new Date(),
          });
        }
      }

      // Campaigns near budget
      if (activeCampaigns.data) {
        const nearBudget = activeCampaigns.data.filter((c) => {
          if (!c.total_budget_cents || c.total_budget_cents === 0) return false;
          return (c.total_spent_cents || 0) >= c.total_budget_cents * 0.9;
        });
        if (nearBudget.length > 0) {
          notes.push({
            id: "campaigns-budget",
            type: "warning",
            icon: "📣",
            title: `${nearBudget.length} campaign${nearBudget.length !== 1 ? "s" : ""} near budget limit`,
            message: "90%+ of budget spent",
            href: "/admin/marketplace/campaigns",
            timestamp: new Date(),
          });
        }
      }

      // Open support tickets
      if (supportTickets.count && supportTickets.count > 0) {
        notes.push({
          id: "support-tickets",
          type: "info",
          icon: "🎫",
          title: `${supportTickets.count} open support ticket${supportTickets.count !== 1 ? "s" : ""}`,
          message: "Broker support requests pending",
          href: "/admin/marketplace/support",
          timestamp: new Date(),
        });
      }

      // Stale articles (not updated in 90+ days)
      if (staleArticles.count && staleArticles.count > 0) {
        notes.push({
          id: "stale-articles",
          type: "info",
          icon: "📝",
          title: `${staleArticles.count} article${staleArticles.count !== 1 ? "s" : ""} not updated in 90+ days`,
          message: "Consider reviewing for accuracy",
          href: "/admin/articles",
          timestamp: new Date(),
        });
      }

      // Expiring deals (within next 7 days)
      if (expiringDeals.data && expiringDeals.data.length > 0) {
        notes.push({
          id: "expiring-deals",
          type: "warning",
          icon: "🔥",
          title: `${expiringDeals.data.length} deal${expiringDeals.data.length !== 1 ? "s" : ""} expiring soon`,
          message: expiringDeals.data.map((d) => d.broker_name).join(", "),
          href: "/admin/deal-of-month",
          timestamp: new Date(),
        });
      }

      // Low health scores (overall_score < 60)
      if (lowHealthScores.data && lowHealthScores.data.length > 0) {
        notes.push({
          id: "low-health-scores",
          type: "error",
          icon: "🛡️",
          title: `${lowHealthScores.data.length} broker${lowHealthScores.data.length !== 1 ? "s" : ""} with low health scores`,
          message: lowHealthScores.data.map((b) => b.broker_slug).join(", "),
          href: "/admin/health-scores",
          timestamp: new Date(),
        });
      }

      // Draft articles count (more than 5)
      if (draftArticles.count && draftArticles.count > 5) {
        notes.push({
          id: "draft-articles",
          type: "info",
          icon: "📄",
          title: `${draftArticles.count} draft articles pending`,
          message: "Review and publish when ready",
          href: "/admin/articles",
          timestamp: new Date(),
        });
      }

      setNotifications(notes);
      setLoading(false);
    }

    fetchNotifications();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const badgeCount = notifications.filter((n) => n.type === "error" || n.type === "warning").length;

  const typeColors: Record<string, string> = {
    error: "bg-red-50 border-red-100",
    warning: "bg-amber-50 border-amber-100",
    info: "bg-blue-50 border-blue-100",
    success: "bg-emerald-50 border-emerald-100",
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 min-w-[18px] text-[0.6rem] font-bold text-white bg-red-500 rounded-full px-1">
            {badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            <span className="text-xs text-slate-400">
              {notifications.length === 0 ? "All clear" : `${notifications.length} item${notifications.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center">
                <span className="text-sm text-slate-400 animate-pulse">Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-2xl mb-2">✅</div>
                <p className="text-sm text-slate-500">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">Everything looks good!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((note) => (
                  <Link
                    key={note.id}
                    href={note.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-l-2 ${typeColors[note.type]}`}
                  >
                    <span className="text-base mt-0.5 shrink-0">{note.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{note.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{note.message}</div>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
