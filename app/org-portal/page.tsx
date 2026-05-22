"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Icon from "@/components/Icon";
import OrgPortalLogin from "./OrgPortalLogin";
import type { Organisation, OrgStats, OrgViewType } from "./types";

const OrgDashboardTab = dynamic(() => import("./OrgDashboardTab"));
const OrgCoursesTab = dynamic(() => import("./OrgCoursesTab"));
const OrgStudentsTab = dynamic(() => import("./OrgStudentsTab"));
const OrgTeamTab = dynamic(() => import("./OrgTeamTab"));
const OrgBillingTab = dynamic(() => import("./OrgBillingTab"));
const OrgProfileTab = dynamic(() => import("./OrgProfileTab"));
const OrgSettingsTab = dynamic(() => import("./OrgSettingsTab"));

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { key: "courses", label: "Courses", icon: "book-open" },
  { key: "students", label: "Students", icon: "users" },
  { key: "team", label: "Team", icon: "user-plus" },
  { key: "billing", label: "Billing", icon: "dollar-sign" },
  { key: "profile", label: "Profile", icon: "building" },
  { key: "settings", label: "Settings", icon: "settings" },
] as const;

export default function OrgPortalPage() {
  const [org, setOrg] = useState<Organisation | null>(null);
  const [orgStats, setOrgStats] = useState<OrgStats | null>(null);
  const [view, setView] = useState<OrgViewType>("dashboard");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/session");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setOrg(data.org ?? null);
          setAuthenticated(true);
          setView("dashboard");
        } else {
          setAuthenticated(false);
        }
      } catch {
        if (!cancelled) setAuthenticated(false);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/dashboard");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setOrgStats(data.stats ?? null);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [authenticated]);

  const logout = async () => {
    await fetch("/api/org-auth/session", { method: "DELETE" });
    setOrg(null);
    setAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <OrgPortalLogin />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-bold text-white/70 hover:text-white">
            Invest.com.au
          </Link>
          <span className="text-white/30">·</span>
          <span className="text-sm font-semibold">Organisation Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
            <Icon name="log-out" size={14} />
            Log Out
          </button>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="bg-white border-b border-slate-200 px-4">
        <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => { setView(item.key as OrgViewType); }}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset ${
                view === item.key
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {view === "dashboard" && (
          <OrgDashboardTab org={org} stats={orgStats} onNavigate={setView} />
        )}
        {view === "courses" && (
          <OrgCoursesTab org={org} />
        )}
        {view === "students" && (
          <OrgStudentsTab org={org} />
        )}
        {view === "team" && (
          <OrgTeamTab org={org} />
        )}
        {view === "billing" && (
          <OrgBillingTab org={org} />
        )}
        {view === "profile" && (
          <OrgProfileTab org={org} onOrgChange={setOrg} />
        )}
        {view === "settings" && (
          <OrgSettingsTab org={org} />
        )}
      </div>
    </div>
  );
}
