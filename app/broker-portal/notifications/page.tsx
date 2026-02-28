"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icon";
import InfoTip from "@/components/InfoTip";
import type { BrokerNotification } from "@/lib/types";

const TYPE_ICONS: Record<string, { icon: string; bg: string; text: string }> = {
  low_balance: { icon: "alert-triangle", bg: "bg-amber-100", text: "text-amber-700" },
  campaign_approved: { icon: "check-circle", bg: "bg-green-100", text: "text-green-700" },
  campaign_rejected: { icon: "x-circle", bg: "bg-red-100", text: "text-red-700" },
  campaign_paused: { icon: "pause-circle", bg: "bg-slate-100", text: "text-slate-700" },
  budget_exhausted: { icon: "alert-circle", bg: "bg-red-100", text: "text-red-700" },
  payment_received: { icon: "credit-card", bg: "bg-green-100", text: "text-green-700" },
  system: { icon: "info", bg: "bg-blue-100", text: "text-blue-700" },
  support_reply: { icon: "message-circle", bg: "bg-purple-100", text: "text-purple-700" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<BrokerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: account } = await supabase
        .from("broker_accounts")
        .select("broker_slug")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!account) return;

      const { data } = await supabase
        .from("broker_notifications")
        .select("*")
        .eq("broker_slug", account.broker_slug)
        .order("created_at", { ascending: false })
        .limit(100);

      setNotifications((data || []) as BrokerNotification[]);
      setLoading(false);

      // Mark as read after a short delay so the user can see which were unread
      const unreadIds = (data || []).filter((n: any) => !n.is_read).map((n: any) => n.id);
      if (unreadIds.length > 0) {
        setTimeout(async () => {
          await supabase
            .from("broker_notifications")
            .update({ is_read: true })
            .in("id", unreadIds);
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }, 2000);
      }
    };
    load();
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  if (loading) return <div className="h-8 bg-slate-100 rounded w-48 animate-pulse" />;

  const unread = notifications.filter(n => !n.is_read);
  const todayCount = notifications.filter(n => {
    const d = new Date(n.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const alertCount = notifications.filter(n => n.type === "low_balance" || n.type === "budget_exhausted" || n.type === "campaign_rejected").length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500">
          {unread.length > 0 ? `${unread.length} unread` : "All caught up"}
        </p>
      </div>

      {/* KPI summary */}
      {notifications.length > 0 && (
        <div className="grid grid-cols-3 gap-3 portal-stagger">
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover-lift">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon name="bell" size={12} className="text-blue-600" />
              </div>
              <span className="text-[0.69rem] font-medium text-slate-500">Unread</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900">{unread.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover-lift">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <Icon name="alert-triangle" size={12} className="text-amber-600" />
              </div>
              <span className="text-[0.69rem] font-medium text-slate-500">Alerts <InfoTip text="Actionable notifications: low balance warnings, budget exhausted alerts, and campaign rejections." /></span>
            </div>
            <p className="text-lg font-extrabold text-slate-900">{alertCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 hover-lift">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
                <Icon name="calendar" size={12} className="text-green-600" />
              </div>
              <span className="text-[0.69rem] font-medium text-slate-500">Today</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900">{todayCount}</p>
          </div>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Icon name="bell" size={20} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No notifications yet</p>
          <p className="text-xs text-slate-400">We&apos;ll notify you about campaign updates, wallet alerts, and more.</p>
        </div>
      ) : (
        <div className="space-y-2 portal-stagger">
          {notifications.map(n => {
            const style = TYPE_ICONS[n.type] || TYPE_ICONS.system;
            return (
              <div key={n.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all hover-lift ${
                !n.is_read ? "border-slate-300 bg-blue-50/30" : "border-slate-200"
              }`}>
                <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon name={style.icon} size={14} className={style.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  {n.link && (
                    <Link href={n.link} className="text-xs text-slate-700 underline mt-1 inline-block hover:text-slate-900">
                      View details →
                    </Link>
                  )}
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
