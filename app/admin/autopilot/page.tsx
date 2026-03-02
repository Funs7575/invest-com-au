"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

/* ─────────────────────────── Types ─────────────────────────── */

interface Automation {
  id: string;
  name: string;
  icon: string;
  schedule: string;
  description: string;
  category: "Revenue" | "Content" | "Growth";
  impact: string;
}

interface AuditEntry {
  id: number;
  action: string;
  details: string | null;
  admin_email: string | null;
  created_at: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

/* ─────────────────────────── Constants ─────────────────────── */

const AUTOMATIONS: Automation[] = [
  { id: "check-fees", name: "Fee Change Detection", icon: "\u{1F4B0}", schedule: "Daily 6 AM UTC", description: "Fetches each broker's fee page, hashes the content, and flags changes. Keeps pricing data fresh.", category: "Content", impact: "Catches fee changes within 24h so comparison tables stay accurate." },
  { id: "expire-deals", name: "Deal & Campaign Expiry", icon: "\u{23F0}", schedule: "Daily 5 AM UTC", description: "Auto-expires broker deals, sponsorships, Pro deals, and completed campaigns. Sends completion emails.", category: "Revenue", impact: "Prevents stale deals from showing and ensures campaigns stop on time." },
  { id: "marketplace-stats", name: "Marketplace Aggregation", icon: "\u{1F4CA}", schedule: "Daily 4 AM UTC", description: "Rolls up yesterday's events into daily stats, manages budget pacing, detects anomalies, runs auto-bid optimization, and sends broker digest emails.", category: "Revenue", impact: "Core revenue engine \u2014 keeps campaigns running, budgets pacing, and brokers informed." },
  { id: "quiz-follow-up", name: "Quiz Follow-Up Drip", icon: "\u{1F4E7}", schedule: "Daily 11 PM UTC", description: "Sends 3-email drip series to quiz leads at days 2, 5, and 8 with personalized broker recommendations.", category: "Growth", impact: "Converts quiz leads into affiliate clicks with personalized follow-ups." },
  { id: "auto-publish", name: "Scheduled Publishing", icon: "\u{1F4DD}", schedule: "On-demand", description: "Publishes articles whose target date has arrived. Updates content calendar status.", category: "Content", impact: "Keeps the editorial pipeline flowing without manual intervention." },
  { id: "content-staleness", name: "Content Staleness Audit", icon: "\u{1F50D}", schedule: "Monthly", description: "Scores every article on freshness factors: last update, fee changes, evergreen status. Flags articles needing attention.", category: "Content", impact: "Ensures content stays accurate \u2014 stale content hurts SEO and user trust." },
  { id: "check-affiliate-links", name: "Affiliate Link Health", icon: "\u{1F517}", schedule: "Daily", description: "HEAD-requests every broker's affiliate URL, detects broken links, timeouts, and redirects. Sends alert emails.", category: "Revenue", impact: "Broken links = $0 revenue. Catches issues within hours." },
  { id: "low-balance-alerts", name: "Low Balance Alerts", icon: "\u{26A0}\uFE0F", schedule: "Daily", description: "Checks broker wallets against alert thresholds. Auto-pauses campaigns if balance hits $0. Sends email + in-app notifications.", category: "Revenue", impact: "Prevents revenue loss from exhausted wallets and keeps brokers informed." },
  { id: "welcome-drip", name: "Broker Onboarding Drip", icon: "\u{1F44B}", schedule: "Daily", description: "4-email sequence for new broker accounts: welcome, setup guide, campaign tips, check-in at days 0/2/5/10.", category: "Growth", impact: "Activates new broker partners and drives first campaign creation." },
  { id: "weekly-newsletter", name: "Weekly Newsletter", icon: "\u{1F4F0}", schedule: "Weekly", description: "Aggregates fee changes, new articles, active deals into a digest email sent to newsletter subscribers.", category: "Growth", impact: "Re-engages existing audience and drives repeat traffic." },
  { id: "retry-webhooks", name: "Webhook Retry Queue", icon: "\u{1F504}", schedule: "On-demand", description: "Retries failed webhook deliveries with exponential backoff (1m \u2192 5m \u2192 30m \u2192 2h \u2192 12h). Max 5 attempts.", category: "Revenue", impact: "Ensures conversion data reaches broker systems for accurate reporting." },
];

const CATEGORIES = ["All", "Revenue", "Content", "Growth"] as const;

const categoryColors: Record<string, string> = {
  Revenue: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Content: "bg-blue-50 text-blue-700 border-blue-200",
  Growth: "bg-purple-50 text-purple-700 border-purple-200",
};

/* ─────────────────────────── Helpers ──────────────────────── */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function parseResultFromAction(action: string): string {
  // action format: "cron:check-fees" or "cron:check-fees:error"
  const parts = action.split(":");
  if (parts.length >= 3) return parts[2];
  return "success";
}

function automationNameFromAction(action: string): string {
  const cronId = action.replace("cron:", "").split(":")[0];
  const found = AUTOMATIONS.find((a) => a.id === cronId);
  return found ? found.name : cronId;
}

function resultColor(result: string): string {
  if (result === "success") return "text-emerald-600 bg-emerald-50";
  if (result === "warning") return "text-amber-600 bg-amber-50";
  if (result === "error") return "text-red-600 bg-red-50";
  return "text-slate-600 bg-slate-50";
}

function statusDot(result: string): string {
  if (result === "success") return "bg-emerald-500";
  if (result === "warning") return "bg-amber-500";
  if (result === "error") return "bg-red-500";
  return "bg-slate-300";
}

/* ─────────────────────────── Component ────────────────────── */

export default function AutopilotPage() {
  const supabase = createClient();

  // State
  const [loading, setLoading] = useState(true);
  const [autopilotEnabled, setAutopilotEnabled] = useState(true);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [activityLog, setActivityLog] = useState<AuditEntry[]>([]);
  const [lastRunMap, setLastRunMap] = useState<Record<string, AuditEntry>>({});
  const [last24hCount, setLast24hCount] = useState(0);
  const [issueCount, setIssueCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);
  const [togglingMaster, setTogglingMaster] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  /* ── Toast helper ── */

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    setToastCounter((prev) => {
      const id = prev + 1;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.id !== id));
      }, 4000);
      return id;
    });
  }, []);

  /* ── Data loading ── */

  const loadData = useCallback(async () => {
    try {
      // Load all site_settings for autopilot keys
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("key, value")
        .like("key", "autopilot%");

      const newToggleStates: Record<string, boolean> = {};
      let masterEnabled = true;

      if (settingsData) {
        for (const row of settingsData) {
          if (row.key === "autopilot_enabled") {
            masterEnabled = row.value === "true";
          } else {
            const automationId = row.key.replace("autopilot_", "");
            newToggleStates[automationId] = row.value !== "false";
          }
        }
      }

      // Default all automations to enabled if no setting exists
      for (const automation of AUTOMATIONS) {
        if (!(automation.id in newToggleStates)) {
          newToggleStates[automation.id] = true;
        }
      }

      setAutopilotEnabled(masterEnabled);
      setToggleStates(newToggleStates);

      // Load recent activity log
      const { data: logData } = await supabase
        .from("admin_audit_log")
        .select("id, action, details, admin_email, created_at")
        .like("action", "cron:%")
        .order("created_at", { ascending: false })
        .limit(20);

      if (logData) {
        setActivityLog(logData);

        // Build last-run map
        const runMap: Record<string, AuditEntry> = {};
        for (const entry of logData) {
          const cronId = entry.action.replace("cron:", "").split(":")[0];
          if (!runMap[cronId]) {
            runMap[cronId] = entry;
          }
        }
        setLastRunMap(runMap);
      }

      // Count last 24h executions
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: dayCount } = await supabase
        .from("admin_audit_log")
        .select("id", { count: "exact", head: true })
        .like("action", "cron:%")
        .gte("created_at", oneDayAgo);

      setLast24hCount(dayCount || 0);

      // Count issues (errors in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: errCount } = await supabase
        .from("admin_audit_log")
        .select("id", { count: "exact", head: true })
        .like("action", "cron:%:error")
        .gte("created_at", sevenDaysAgo);

      setIssueCount(errCount || 0);
    } catch {
      // Gracefully handle missing tables or network errors
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Toggle master autopilot ── */

  async function handleMasterToggle() {
    const newValue = !autopilotEnabled;
    setTogglingMaster(true);
    setAutopilotEnabled(newValue);

    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: "autopilot_enabled", value: String(newValue), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      if (error) throw error;
      addToast(newValue ? "Autopilot activated" : "Autopilot paused", newValue ? "success" : "info");
    } catch {
      setAutopilotEnabled(!newValue);
      addToast("Failed to update autopilot status", "error");
    } finally {
      setTogglingMaster(false);
    }
  }

  /* ── Toggle individual automation ── */

  async function handleToggle(id: string) {
    const newValue = !toggleStates[id];
    setTogglingIds((prev) => new Set(prev).add(id));
    setToggleStates((prev) => ({ ...prev, [id]: newValue }));

    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: `autopilot_${id}`, value: String(newValue), updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );

      if (error) throw error;

      const automation = AUTOMATIONS.find((a) => a.id === id);
      addToast(
        `${automation?.name || id} ${newValue ? "enabled" : "disabled"}`,
        newValue ? "success" : "info"
      );
    } catch {
      setToggleStates((prev) => ({ ...prev, [id]: !newValue }));
      addToast("Failed to update toggle", "error");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  /* ── Run Now ── */

  async function handleRunNow(id: string) {
    const automation = AUTOMATIONS.find((a) => a.id === id);
    setRunningJobs((prev) => new Set(prev).add(id));

    try {
      const res = await fetch(`/api/cron/${id}`, { method: "GET" });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      addToast(`${automation?.name || id} executed successfully`, "success");
      // Refresh data after a short delay to pick up new log entries
      setTimeout(() => loadData(), 1500);
    } catch {
      addToast(`${automation?.name || id} failed to execute`, "error");
    } finally {
      setRunningJobs((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  /* ── Expand/collapse ── */

  function toggleExpanded(id: string) {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /* ── Derived values ── */

  const activeCount = Object.values(toggleStates).filter(Boolean).length;
  const filteredAutomations =
    activeCategory === "All"
      ? AUTOMATIONS
      : AUTOMATIONS.filter((a) => a.category === activeCategory);

  /* ─────────────────────────── Render ─────────────────────── */

  if (loading) {
    return (
      <AdminShell>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-96 bg-slate-100 rounded animate-pulse mt-2" />
          </div>

          {/* Master toggle skeleton */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="h-6 w-11 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Filter tabs skeleton */}
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>

          {/* KPI skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-8 w-12 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="flex-1">
                    <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-slate-100 rounded animate-pulse mt-1" />
                  </div>
                  <div className="h-6 w-11 bg-slate-200 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-full bg-slate-100 rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Autopilot</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated operations running 24/7. Toggle systems on/off and monitor execution.
          </p>
        </div>

        {/* ── Master Toggle ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleMasterToggle}
                disabled={togglingMaster}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                  autopilotEnabled ? "bg-emerald-500" : "bg-slate-300"
                } ${togglingMaster ? "opacity-60 cursor-wait" : ""}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                    autopilotEnabled ? "translate-x-8" : "translate-x-1"
                  }`}
                />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {autopilotEnabled ? "Autopilot Active" : "Autopilot Paused"}
                </h2>
                <p className="text-xs text-slate-500">
                  {autopilotEnabled
                    ? "All enabled automations are running on schedule."
                    : "All automations are paused. Nothing will run until re-enabled."}
                </p>
              </div>
            </div>
            <div className={`h-3 w-3 rounded-full ${autopilotEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
          </div>

          {!autopilotEnabled && (
            <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <span className="text-amber-600 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-medium text-amber-800">Autopilot is paused</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  No cron jobs will execute while paused. Deals may expire without notification, affiliate links won't be monitored, and drip campaigns are on hold.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Category Filter Tabs ── */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-amber-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1.5 text-xs opacity-75">
                  ({AUTOMATIONS.filter((a) => a.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Summary KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Automations</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{AUTOMATIONS.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last 24h Runs</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{last24hCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Issues (7d)</p>
            <p className={`text-2xl font-bold mt-1 ${issueCount > 0 ? "text-red-600" : "text-slate-900"}`}>
              {issueCount}
            </p>
          </div>
        </div>

        {/* ── Automation Cards Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredAutomations.map((automation) => {
            const enabled = toggleStates[automation.id] ?? true;
            const expanded = expandedCards.has(automation.id);
            const running = runningJobs.has(automation.id);
            const toggling = togglingIds.has(automation.id);
            const lastRun = lastRunMap[automation.id];
            const lastResult = lastRun ? parseResultFromAction(lastRun.action) : "never";

            return (
              <div
                key={automation.id}
                className={`bg-white border rounded-xl p-5 transition-all ${
                  enabled ? "border-slate-200" : "border-slate-200 opacity-60"
                }`}
              >
                {/* Card header */}
                <div className="flex items-start gap-3">
                  <div className="text-2xl leading-none mt-0.5">{automation.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{automation.name}</h3>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${categoryColors[automation.category]}`}>
                        {automation.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{automation.schedule}</p>
                  </div>

                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(automation.id)}
                    disabled={toggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                      enabled ? "bg-emerald-500" : "bg-slate-300"
                    } ${toggling ? "opacity-60 cursor-wait" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Description (truncated) */}
                <p className="text-sm text-slate-600 mt-3 line-clamp-2">{automation.description}</p>

                {/* Impact info box */}
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Impact:</span> {automation.impact}
                  </p>
                </div>

                {/* Status row */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Status dot */}
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      lastResult === "never" ? "bg-slate-300" : statusDot(lastResult)
                    }`} />
                    <span className="text-xs text-slate-500">
                      {lastRun ? `Last run ${relativeTime(lastRun.created_at)}` : "Never run"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpanded(automation.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                    >
                      {expanded ? "Less" : "What this does"}
                      <svg
                        className={`w-3 h-3 inline ml-1 transition-transform ${expanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Run Now */}
                    <button
                      onClick={() => handleRunNow(automation.id)}
                      disabled={running || !enabled}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        running
                          ? "bg-amber-100 text-amber-700 cursor-wait"
                          : enabled
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {running ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Running
                        </span>
                      ) : (
                        "Run Now"
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Full Description</p>
                      <p className="text-xs text-slate-600 mt-0.5">{automation.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Business Impact</p>
                      <p className="text-xs text-slate-600 mt-0.5">{automation.impact}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Schedule</p>
                      <p className="text-xs text-slate-600 mt-0.5">{automation.schedule}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Setting Key</p>
                      <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        autopilot_{automation.id}
                      </code>
                    </div>
                    {lastRun?.details && (
                      <div>
                        <p className="text-xs font-semibold text-slate-700">Last Run Details</p>
                        <p className="text-xs text-slate-500 mt-0.5 break-words">{lastRun.details}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredAutomations.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-sm text-slate-500">No automations in this category.</p>
          </div>
        )}

        {/* ── Recent Activity Log ── */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Activity</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {activityLog.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No cron execution logs found. Activity will appear here once automations start running.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Automation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Result</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activityLog.map((entry) => {
                      const result = parseResultFromAction(entry.action);
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            <span title={new Date(entry.created_at).toLocaleString("en-AU")}>
                              {relativeTime(entry.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                            {automationNameFromAction(entry.action)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${resultColor(result)}`}>
                              {result}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-[300px] truncate">
                            {entry.details || "\u2014"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Toast notifications ── */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${
              toast.type === "success"
                ? "bg-emerald-600 text-white"
                : toast.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-slate-700 text-white"
            }`}
          >
            {toast.type === "success" && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.message}
            <button
              onClick={() => setToasts((t) => t.filter((x) => x.id !== toast.id))}
              className="ml-2 text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
