"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";

/* ─── LIVE — core features in active daily use ─── */
const NAV_GROUPS = [
  {
    label: "Dashboards",
    items: [
      { href: "/admin", icon: "bar-chart", label: "Overview" },
      { href: "/admin/ai-assistant", icon: "cpu", label: "AI Assistant" },
      { href: "/admin/revenue", icon: "dollar-sign", label: "Revenue" },
      { href: "/admin/pricing", icon: "tag", label: "Lead Pricing" },
      { href: "/admin/finance", icon: "wallet", label: "Finance" },
      { href: "/admin/funnel", icon: "filter", label: "Funnel" },
      { href: "/admin/analytics", icon: "trending-up", label: "Traffic" },
    ],
  },
  {
    label: "Health & Ops",
    items: [
      { href: "/admin/automation", icon: "cpu", label: "Automation" },
      { href: "/admin/data-health", icon: "activity", label: "Data Health" },
      { href: "/admin/seo-health", icon: "search", label: "SEO Health" },
      { href: "/admin/compliance", icon: "shield-check", label: "Compliance" },
      { href: "/admin/bd-pipeline", icon: "target", label: "BD Pipeline" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/brokers", icon: "building", label: "Brokers" },
      { href: "/admin/articles", icon: "file-text", label: "Articles" },
      { href: "/admin/advisor-articles", icon: "star", label: "Expert Articles" },
      { href: "/admin/content-calendar", icon: "calendar", label: "Content Calendar" },
      { href: "/admin/questions", icon: "message-circle", label: "Q&A" },
    ],
  },
  {
    label: "Moderation",
    items: [
      { href: "/admin/advisor-moderation", icon: "check-circle", label: "Pending Advisors" },
      { href: "/admin/review-moderation", icon: "star", label: "Pending Reviews" },
      { href: "/admin/user-reviews", icon: "clipboard-list", label: "User Reviews" },
      { href: "/admin/switch-stories", icon: "shuffle", label: "Switch Stories" },
      { href: "/admin/moderation", icon: "shield-check", label: "Content Moderation" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/admin/affiliate-links", icon: "link", label: "Affiliate Links" },
      { href: "/admin/affiliate-dashboard", icon: "pie-chart", label: "Affiliate Performance" },
      { href: "/admin/ab-tests", icon: "git-branch", label: "A/B Tests" },
      { href: "/admin/fee-queue", icon: "dollar-sign", label: "Fee Queue" },
      { href: "/admin/deal-of-month", icon: "trophy", label: "Deal of Month" },
    ],
  },
  {
    label: "Property",
    items: [
      { href: "/admin/property", icon: "building", label: "Property Overview" },
      { href: "/admin/property/listings", icon: "home", label: "Listings" },
      { href: "/admin/property/leads", icon: "users", label: "Property Leads" },
      { href: "/admin/property/developers", icon: "briefcase", label: "Developers" },
    ],
  },
  {
    label: "Advisors",
    items: [
      { href: "/admin/advisors", icon: "user", label: "Advisors" },
      { href: "/admin/advisor-performance", icon: "trending-up", label: "Advisor Perf." },
    ],
  },
  {
    label: "Users",
    items: [
      { href: "/admin/subscribers", icon: "mail", label: "Subscribers" },
      { href: "/admin/quiz-weights", icon: "settings", label: "Quiz Weights" },
    ],
  },
  {
    label: "Legal & Compliance",
    items: [
      { href: "/admin/legal", icon: "scale", label: "Legal Dashboard" },
      { href: "/admin/audit-log", icon: "eye", label: "Audit Log" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/team-members", icon: "user", label: "Team" },
      { href: "/admin/site-settings", icon: "settings", label: "Settings" },
    ],
  },
];

/* ─── LAUNCHING SOON — built but not yet live on front-end ─── */
const COMING_SOON_ITEMS = [
  { href: "/admin/content-performance", icon: "zap", label: "Content Perf." },
  { href: "/admin/email-performance", icon: "mail", label: "Email Perf." },
  { href: "/admin/competitors", icon: "eye", label: "Competitors" },
  { href: "/admin/marketplace", icon: "coins", label: "Ad Marketplace" },
  { href: "/admin/pro-subscribers", icon: "key", label: "Pro Members" },
  { href: "/admin/consultations", icon: "phone", label: "Consultations" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white border border-slate-200 rounded-lg shadow-sm"
        aria-label="Toggle admin menu"
      >
        <Icon name={open ? "x-circle" : "layout"} size={18} className="text-slate-600" />
      </button>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-56 bg-slate-900 text-white z-40 overflow-y-auto transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="p-4 border-b border-slate-800">
          <Link href="/admin" className="text-sm font-bold text-white">invest.com.au</Link>
          <p className="text-[0.5rem] text-slate-400 mt-0.5">Admin Panel</p>
        </div>

        <nav className="p-2 space-y-3">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[0.5rem] font-bold text-slate-500 uppercase tracking-wider px-2 mb-1">{group.label}</p>
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${active ? "bg-white/10 text-white font-semibold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  >
                    <Icon name={item.icon} size={14} className={active ? "text-emerald-400" : "text-slate-500"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* ─── Launching Soon (collapsible) ─── */}
          <div className="pt-2 mt-2 border-t border-slate-800">
            <button
              onClick={() => setShowComingSoon(!showComingSoon)}
              className="flex items-center justify-between w-full px-2 mb-1 group"
            >
              <p className="text-[0.5rem] font-bold text-amber-500/70 uppercase tracking-wider">Launching Soon</p>
              <Icon name={showComingSoon ? "chevron-up" : "chevron-down"} size={12} className="text-slate-600 group-hover:text-slate-400" />
            </button>
            {showComingSoon && COMING_SOON_ITEMS.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${active ? "bg-white/10 text-white font-semibold" : "text-slate-600 hover:text-slate-400 hover:bg-white/5"}`}
                >
                  <Icon name={item.icon} size={14} className={active ? "text-amber-400" : "text-slate-700"} />
                  <span className="opacity-70">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-3 mt-4 border-t border-slate-800">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-500 hover:text-white rounded-lg hover:bg-white/5">
            <Icon name="globe" size={14} /> View Live Site
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
