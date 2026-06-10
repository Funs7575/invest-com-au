"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  type: "broker" | "article" | "page" | "subscriber" | "campaign" | "course" | "consultation" | "team_member";
  icon: string;
  title: string;
  subtitle?: string;
  href: string;
}

const ADMIN_PAGES: SearchResult[] = [
  { type: "page", icon: "📊", title: "Dashboard", href: "/admin" },
  { type: "page", icon: "📈", title: "Analytics", href: "/admin/analytics" },
  { type: "page", icon: "🏦", title: "Brokers", href: "/admin/brokers" },
  { type: "page", icon: "📝", title: "Articles", href: "/admin/articles" },
  { type: "page", icon: "📞", title: "Consultations", href: "/admin/consultations" },
  { type: "page", icon: "📚", title: "Courses", href: "/admin/courses" },
  { type: "page", icon: "📅", title: "Content Calendar", href: "/admin/content-calendar" },
  { type: "page", icon: "👥", title: "Team Members", href: "/admin/team-members" },
  { type: "page", icon: "🎯", title: "Scenarios", href: "/admin/scenarios" },
  { type: "page", icon: "❓", title: "Quiz Questions", href: "/admin/quiz-questions" },
  { type: "page", icon: "⭐", title: "User Reviews", href: "/admin/user-reviews" },
  { type: "page", icon: "💬", title: "Questions", href: "/admin/questions" },
  { type: "page", icon: "🔄", title: "Switch Stories", href: "/admin/switch-stories" },
  { type: "page", icon: "📋", title: "Transfer Guides", href: "/admin/broker-transfer-guides" },
  { type: "page", icon: "🛡️", title: "Health Scores", href: "/admin/health-scores" },
  { type: "page", icon: "📢", title: "Regulatory Alerts", href: "/admin/regulatory-alerts" },
  { type: "page", icon: "📊", title: "Quarterly Reports", href: "/admin/quarterly-reports" },
  { type: "page", icon: "🏪", title: "Marketplace", href: "/admin/marketplace" },
  { type: "page", icon: "📣", title: "Campaigns", href: "/admin/marketplace/campaigns" },
  { type: "page", icon: "🤝", title: "Broker Accounts", href: "/admin/marketplace/brokers" },
  { type: "page", icon: "📍", title: "Placements", href: "/admin/marketplace/placements" },
  { type: "page", icon: "💰", title: "Sponsor Billing", href: "/admin/marketplace/sponsor-billing" },
  { type: "page", icon: "🔍", title: "Reconciliation", href: "/admin/marketplace/reconciliation" },
  { type: "page", icon: "🎫", title: "Support Tickets", href: "/admin/marketplace/support" },
  { type: "page", icon: "🔗", title: "Affiliate Links", href: "/admin/affiliate-links" },
  { type: "page", icon: "🔥", title: "Deal of Month", href: "/admin/deal-of-month" },
  { type: "page", icon: "⚖️", title: "Quiz Weights", href: "/admin/quiz-weights" },
  { type: "page", icon: "💎", title: "Pro Members", href: "/admin/pro-subscribers" },
  { type: "page", icon: "🎁", title: "Pro Deals", href: "/admin/pro-deals" },
  { type: "page", icon: "📧", title: "Subscribers", href: "/admin/subscribers" },
  { type: "page", icon: "⚙️", title: "Site Settings", href: "/admin/site-settings" },
  { type: "page", icon: "🧮", title: "Calculator Config", href: "/admin/calculator-config" },
  { type: "page", icon: "💾", title: "Export / Import", href: "/admin/export-import" },
  { type: "page", icon: "📋", title: "Audit Log", href: "/admin/audit-log" },
];

export default function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setDbResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search database when query changes
  const searchDB = useCallback(async (q: string) => {
    if (q.length < 2) {
      setDbResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const supabase = createClient();

    const [brokersRes, articlesRes, coursesRes, consultationsRes, teamMembersRes, campaignsRes] = await Promise.all([
      supabase
        .from("brokers")
        .select("name, slug")
        .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("articles")
        .select("title, slug")
        .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("courses")
        .select("title, slug")
        .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("consultations")
        .select("title, slug")
        .or(`title.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("team_members")
        .select("full_name, slug")
        .or(`full_name.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(5),
      supabase
        .from("campaigns")
        .select("name")
        .ilike("name", `%${q}%`)
        .limit(5),
    ]);

    const dbRes: SearchResult[] = [];
    if (brokersRes.data) {
      brokersRes.data.forEach((b) =>
        dbRes.push({
          type: "broker",
          icon: "🏦",
          title: b.name,
          subtitle: b.slug,
          href: `/admin/brokers`,
        })
      );
    }
    if (articlesRes.data) {
      articlesRes.data.forEach((a) =>
        dbRes.push({
          type: "article",
          icon: "📝",
          title: a.title,
          subtitle: a.slug,
          href: `/admin/articles`,
        })
      );
    }
    if (coursesRes.data) {
      coursesRes.data.forEach((c) =>
        dbRes.push({
          type: "course",
          icon: "📚",
          title: c.title,
          subtitle: c.slug,
          href: `/admin/courses`,
        })
      );
    }
    if (consultationsRes.data) {
      consultationsRes.data.forEach((c) =>
        dbRes.push({
          type: "consultation",
          icon: "📞",
          title: c.title,
          subtitle: c.slug,
          href: `/admin/consultations`,
        })
      );
    }
    if (teamMembersRes.data) {
      teamMembersRes.data.forEach((t) =>
        dbRes.push({
          type: "team_member",
          icon: "👤",
          title: t.full_name,
          subtitle: t.slug,
          href: `/admin/team-members`,
        })
      );
    }
    if (campaignsRes.data) {
      campaignsRes.data.forEach((c) =>
        dbRes.push({
          type: "campaign",
          icon: "📣",
          title: c.name,
          href: `/admin/marketplace/campaigns`,
        })
      );
    }
    setDbResults(dbRes);
    setSearching(false);
  }, []);

  // Filter pages + debounce DB search
  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setResults([]);
      setDbResults([]);
      setSelectedIndex(0);
      return;
    }

    // Filter static pages immediately
    const pageResults = ADMIN_PAGES.filter(
      (p) => p.title.toLowerCase().includes(q) || p.href.toLowerCase().includes(q)
    );
    setResults(pageResults);
    setSelectedIndex(0);

    // Debounce database search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchDB(q), 250);
  }, [query, searchDB]);

  const allResults = [...dbResults, ...results];

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    router.push(result.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(allResults[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, brokers, articles, courses..."
            className="flex-1 bg-transparent text-slate-900 text-sm placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[0.6rem] font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">Start typing to search...</p>
              <p className="text-xs text-slate-500 mt-1">Search pages, brokers, articles, and more</p>
            </div>
          )}

          {query.length > 0 && allResults.length === 0 && !searching && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No results found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
            </div>
          )}

          {/* DB results section */}
          {dbResults.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                Content
              </div>
              {dbResults.map((result, i) => (
                <button
                  key={`db-${i}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    selectedIndex === i ? "bg-amber-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base shrink-0">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
                    )}
                  </div>
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase font-medium shrink-0">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Page results section */}
          {results.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[0.65rem] font-bold text-slate-600 uppercase tracking-wider bg-slate-50">
                Pages
              </div>
              {results.map((result, i) => {
                const idx = dbResults.length + i;
                return (
                  <button
                    key={`page-${i}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      selectedIndex === idx ? "bg-amber-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base shrink-0">{result.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{result.title}</div>
                      <div className="text-xs text-slate-500 truncate">{result.href}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {searching && (
            <div className="px-4 py-3 text-center">
              <span className="text-xs text-slate-500 animate-pulse">Searching...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-4 text-[0.6rem] text-slate-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[0.55rem]">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[0.55rem]">↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[0.55rem]">esc</kbd> Close
          </span>
        </div>
      </div>
    </div>
  );
}
