"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";
import Icon from "@/components/Icon";

/* ─── Types ─── */

type Severity = "pass" | "warning" | "fail" | "info";
type Category = "completeness" | "freshness" | "accuracy" | "seo" | "revenue";

interface DataCheck {
  id: string;
  category: Category;
  title: string;
  severity: Severity;
  detail: string;
  items?: string[];
  count?: { ok: number; total: number };
  href?: string;
}

const SEVERITY_ICON: Record<Severity, string> = { pass: "✓", warning: "!", fail: "✕", info: "i" };
const SEVERITY_BG: Record<Severity, string> = {
  pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  fail: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

const CATEGORY_META: Record<Category, { label: string; icon: string; desc: string }> = {
  completeness: { label: "Data Completeness", icon: "📋", desc: "Missing fields, empty columns, incomplete broker profiles" },
  freshness: { label: "Data Freshness", icon: "🕐", desc: "Stale fees, outdated reviews, old content that needs refreshing" },
  accuracy: { label: "Data Accuracy", icon: "🎯", desc: "Broken URLs, mismatched data, orphaned records" },
  seo: { label: "SEO Health", icon: "🔍", desc: "Missing metadata, thin content, broken internal links" },
  revenue: { label: "Revenue Readiness", icon: "💰", desc: "Affiliate links, deal setup, conversion tracking" },
};

/* ─── Component ─── */

export default function DataHealthPage() {
  const [checks, setChecks] = useState<DataCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterSev, setFilterSev] = useState<Severity | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { runChecks(); }, []);

  async function runChecks() {
    setLoading(true);
    const supabase = createClient();
    const results: DataCheck[] = [];

    const [brokersRes, articlesRes, clicksRes, emailRes, quizRes] = await Promise.all([
      supabase.from("brokers").select("*").eq("status", "active"),
      supabase.from("articles").select("id, title, slug, status, category, excerpt, sections, author_name, reviewer_id, reviewed_at, updated_at, published_at, read_time, cover_image_url, changelog, evergreen, tags").eq("status", "published"),
      supabase.from("affiliate_clicks").select("id, broker_slug, created_at").order("created_at", { ascending: false }).limit(1),
      supabase.from("email_captures").select("id", { count: "exact", head: true }),
      supabase.from("quiz_leads").select("id", { count: "exact", head: true }),
    ]);

    const brokers = brokersRes.data || [];
    const articles = articlesRes.data || [];

    // ═══════════════════════════════════════════
    // COMPLETENESS CHECKS
    // ═══════════════════════════════════════════

    const completenessFields: { field: string; label: string; critical: boolean }[] = [
      { field: "affiliate_url", label: "Affiliate URL", critical: true },
      { field: "logo_url", label: "Logo", critical: false },
      { field: "rating", label: "Rating", critical: true },
      { field: "regulated_by", label: "Regulator", critical: true },
      { field: "headquarters", label: "Headquarters", critical: false },
      { field: "year_founded", label: "Year Founded", critical: false },
      { field: "review_content", label: "Review Content", critical: true },
      { field: "tagline", label: "Tagline", critical: false },
      { field: "fee_source_url", label: "Fee Source URL", critical: false },
    ];

    for (const f of completenessFields) {
      const missing = brokers.filter((b: Record<string, unknown>) => {
        const v = b[f.field];
        return v === null || v === undefined || v === "" || v === 0;
      });
      const total = brokers.length;
      const ok = total - missing.length;
      results.push({
        id: `comp-${f.field}`,
        category: "completeness",
        title: `Brokers with ${f.label}`,
        severity: missing.length === 0 ? "pass" : f.critical && missing.length > 3 ? "fail" : missing.length > 0 ? "warning" : "pass",
        detail: missing.length === 0
          ? `All ${total} platforms have ${f.label} populated.`
          : `${missing.length} of ${total} platforms missing ${f.label}.`,
        items: missing.length > 0 ? missing.map((b: Record<string, unknown>) => b.name as string).slice(0, 15) : undefined,
        count: { ok, total },
        href: "/admin/brokers",
      });
    }

    // Pros & Cons
    const noPros = brokers.filter((b: Record<string, unknown>) => !b.pros || (Array.isArray(b.pros) && b.pros.length === 0));
    const noCons = brokers.filter((b: Record<string, unknown>) => !b.cons || (Array.isArray(b.cons) && b.cons.length === 0));
    results.push({
      id: "comp-pros",
      category: "completeness",
      title: "Brokers with Pros listed",
      severity: noPros.length === 0 ? "pass" : noPros.length > 10 ? "fail" : "warning",
      detail: noPros.length === 0 ? "All platforms have pros listed." : `${noPros.length} platforms missing pros.`,
      items: noPros.length > 0 ? noPros.map((b: Record<string, unknown>) => b.name as string).slice(0, 10) : undefined,
      count: { ok: brokers.length - noPros.length, total: brokers.length },
      href: "/admin/brokers",
    });
    results.push({
      id: "comp-cons",
      category: "completeness",
      title: "Brokers with Cons listed",
      severity: noCons.length === 0 ? "pass" : noCons.length > 10 ? "fail" : "warning",
      detail: noCons.length === 0 ? "All platforms have cons listed." : `${noCons.length} platforms missing cons.`,
      items: noCons.length > 0 ? noCons.map((b: Record<string, unknown>) => b.name as string).slice(0, 10) : undefined,
      count: { ok: brokers.length - noCons.length, total: brokers.length },
      href: "/admin/brokers",
    });

    // Articles completeness
    const artNoCover = articles.filter(a => !a.cover_image_url);
    const artNoExcerpt = articles.filter(a => !a.excerpt);
    const artNoAuthor = articles.filter(a => !a.author_name);
    const artNoReviewer = articles.filter(a => !a.reviewer_id);
    results.push({
      id: "comp-art-cover",
      category: "completeness",
      title: "Articles with cover image",
      severity: artNoCover.length === 0 ? "pass" : "warning",
      detail: artNoCover.length === 0 ? "All articles have cover images." : `${artNoCover.length} articles missing cover image.`,
      count: { ok: articles.length - artNoCover.length, total: articles.length },
    });
    results.push({
      id: "comp-art-reviewer",
      category: "completeness",
      title: "Articles with expert reviewer",
      severity: artNoReviewer.length === 0 ? "pass" : artNoReviewer.length > 5 ? "warning" : "info",
      detail: `${articles.length - artNoReviewer.length} of ${articles.length} articles have been expert-reviewed.`,
      count: { ok: articles.length - artNoReviewer.length, total: articles.length },
    });

    // ═══════════════════════════════════════════
    // FRESHNESS CHECKS
    // ═══════════════════════════════════════════

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d60 = new Date(now.getTime() - 60 * 86400000);
    const d90 = new Date(now.getTime() - 90 * 86400000);

    // Fee freshness
    const staleFees30 = brokers.filter((b: Record<string, unknown>) => {
      if (!b.fee_last_checked) return true;
      return new Date(b.fee_last_checked as string) < d30;
    });
    const staleFees90 = brokers.filter((b: Record<string, unknown>) => {
      if (!b.fee_last_checked) return true;
      return new Date(b.fee_last_checked as string) < d90;
    });
    results.push({
      id: "fresh-fees-30",
      category: "freshness",
      title: "Fees checked in last 30 days",
      severity: staleFees30.length === 0 ? "pass" : staleFees30.length > 20 ? "fail" : "warning",
      detail: `${brokers.length - staleFees30.length} of ${brokers.length} platforms have fees checked within 30 days.`,
      items: staleFees30.length > 0 ? staleFees30.map((b: Record<string, unknown>) => `${b.name}: ${b.fee_last_checked ? new Date(b.fee_last_checked as string).toLocaleDateString("en-AU") : "Never"}`).slice(0, 10) : undefined,
      count: { ok: brokers.length - staleFees30.length, total: brokers.length },
      href: "/admin/brokers",
    });

    results.push({
      id: "fresh-fees-90",
      category: "freshness",
      title: "Fees checked in last 90 days",
      severity: staleFees90.length === 0 ? "pass" : staleFees90.length > 10 ? "fail" : "warning",
      detail: staleFees90.length === 0 ? "All fees verified within 90 days." : `${staleFees90.length} platforms have fees older than 90 days — urgent review needed.`,
      count: { ok: brokers.length - staleFees90.length, total: brokers.length },
    });

    // Article freshness
    const staleArticles = articles.filter(a => {
      const updated = a.updated_at || a.published_at;
      return updated && new Date(updated) < d90;
    });
    results.push({
      id: "fresh-articles",
      category: "freshness",
      title: "Articles updated in last 90 days",
      severity: staleArticles.length === 0 ? "pass" : staleArticles.length > 10 ? "warning" : "info",
      detail: `${articles.length - staleArticles.length} of ${articles.length} articles updated within 90 days.`,
      items: staleArticles.length > 0 ? staleArticles.map(a => `${a.title}: ${new Date(a.updated_at || a.published_at).toLocaleDateString("en-AU")}`).slice(0, 8) : undefined,
      count: { ok: articles.length - staleArticles.length, total: articles.length },
    });

    // Deal expiry
    const dealBrokers = brokers.filter((b: Record<string, unknown>) => b.deal);
    const expiredDeals = dealBrokers.filter((b: Record<string, unknown>) => b.deal_expiry && new Date(b.deal_expiry as string) < now);
    const expiringDeals = dealBrokers.filter((b: Record<string, unknown>) => {
      if (!b.deal_expiry) return false;
      const exp = new Date(b.deal_expiry as string);
      return exp > now && exp < d30;
    });
    results.push({
      id: "fresh-deals",
      category: "freshness",
      title: "Active deals (not expired)",
      severity: expiredDeals.length > 0 ? "fail" : expiringDeals.length > 0 ? "warning" : dealBrokers.length === 0 ? "info" : "pass",
      detail: expiredDeals.length > 0
        ? `${expiredDeals.length} deal(s) have expired! Remove or update them.`
        : expiringDeals.length > 0
        ? `${expiringDeals.length} deal(s) expiring within 30 days.`
        : `${dealBrokers.length} active deals, all current.`,
      items: expiredDeals.length > 0
        ? expiredDeals.map((b: Record<string, unknown>) => `${b.name}: expired ${b.deal_expiry}`)
        : expiringDeals.length > 0
        ? expiringDeals.map((b: Record<string, unknown>) => `${b.name}: expires ${b.deal_expiry}`)
        : undefined,
      count: { ok: dealBrokers.length - expiredDeals.length, total: dealBrokers.length || 1 },
    });

    // Last affiliate click
    const lastClick = clicksRes.data?.[0];
    const lastClickAge = lastClick ? Math.round((now.getTime() - new Date(lastClick.created_at).getTime()) / 86400000) : 999;
    results.push({
      id: "fresh-clicks",
      category: "freshness",
      title: "Recent affiliate click activity",
      severity: lastClickAge <= 1 ? "pass" : lastClickAge <= 7 ? "info" : "warning",
      detail: lastClick
        ? `Last affiliate click: ${lastClickAge === 0 ? "today" : `${lastClickAge} day(s) ago`} (${lastClick.broker_slug}).`
        : "No affiliate clicks recorded yet.",
      count: { ok: lastClickAge <= 1 ? 1 : 0, total: 1 },
    });

    // ═══════════════════════════════════════════
    // ACCURACY CHECKS
    // ═══════════════════════════════════════════

    // Broken affiliate URLs (no protocol)
    const brokenUrls = brokers.filter((b: Record<string, unknown>) => b.affiliate_url && !(b.affiliate_url as string).startsWith("http"));
    results.push({
      id: "acc-url-format",
      category: "accuracy",
      title: "Affiliate URLs valid format",
      severity: brokenUrls.length === 0 ? "pass" : "fail",
      detail: brokenUrls.length === 0 ? "All affiliate URLs have valid format." : `${brokenUrls.length} URLs don't start with http(s).`,
      items: brokenUrls.length > 0 ? brokenUrls.map((b: Record<string, unknown>) => `${b.name}: ${(b.affiliate_url as string).slice(0, 50)}`) : undefined,
      count: { ok: brokers.filter((b: Record<string, unknown>) => b.affiliate_url).length - brokenUrls.length, total: brokers.filter((b: Record<string, unknown>) => b.affiliate_url).length },
      href: "/admin/affiliate-links",
    });

    // Duplicate slugs
    const slugCounts = new Map<string, number>();
    for (const b of brokers) { slugCounts.set((b as Record<string, unknown>).slug as string, (slugCounts.get((b as Record<string, unknown>).slug as string) || 0) + 1); }
    const dupSlugs = [...slugCounts.entries()].filter(([, c]) => c > 1);
    results.push({
      id: "acc-dup-slugs",
      category: "accuracy",
      title: "No duplicate broker slugs",
      severity: dupSlugs.length === 0 ? "pass" : "fail",
      detail: dupSlugs.length === 0 ? "All broker slugs are unique." : `${dupSlugs.length} duplicate slug(s) found!`,
      items: dupSlugs.length > 0 ? dupSlugs.map(([s, c]) => `${s} (${c}×)`) : undefined,
      count: { ok: brokers.length - dupSlugs.reduce((s, [, c]) => s + c - 1, 0), total: brokers.length },
    });

    // Rating out of range
    const badRatings = brokers.filter((b: Record<string, unknown>) => {
      const r = b.rating as number;
      return r !== null && r !== undefined && (r < 1 || r > 5);
    });
    results.push({
      id: "acc-rating-range",
      category: "accuracy",
      title: "Ratings within 1–5 range",
      severity: badRatings.length === 0 ? "pass" : "fail",
      detail: badRatings.length === 0 ? "All ratings within valid range." : `${badRatings.length} broker(s) with invalid rating.`,
      count: { ok: brokers.length - badRatings.length, total: brokers.length },
    });

    // ═══════════════════════════════════════════
    // SEO CHECKS
    // ═══════════════════════════════════════════

    const noTagline = brokers.filter((b: Record<string, unknown>) => !b.tagline);
    results.push({
      id: "seo-tagline",
      category: "seo",
      title: "Brokers with tagline (meta description)",
      severity: noTagline.length === 0 ? "pass" : noTagline.length > 10 ? "warning" : "info",
      detail: `${brokers.length - noTagline.length} of ${brokers.length} have taglines for meta descriptions.`,
      count: { ok: brokers.length - noTagline.length, total: brokers.length },
    });

    const shortArticles = articles.filter(a => a.read_time && a.read_time < 3);
    results.push({
      id: "seo-thin-content",
      category: "seo",
      title: "Articles with sufficient length (≥3 min read)",
      severity: shortArticles.length === 0 ? "pass" : "warning",
      detail: shortArticles.length === 0 ? "All articles meet minimum content length." : `${shortArticles.length} article(s) under 3 minutes — may be flagged as thin content.`,
      items: shortArticles.length > 0 ? shortArticles.map(a => `${a.title} (${a.read_time} min)`) : undefined,
      count: { ok: articles.length - shortArticles.length, total: articles.length },
    });

    const noTags = articles.filter(a => !a.tags || (Array.isArray(a.tags) && a.tags.length === 0));
    results.push({
      id: "seo-tags",
      category: "seo",
      title: "Articles with tags",
      severity: noTags.length === 0 ? "pass" : noTags.length > articles.length * 0.3 ? "warning" : "info",
      detail: `${articles.length - noTags.length} of ${articles.length} articles have tags.`,
      count: { ok: articles.length - noTags.length, total: articles.length },
    });

    // ═══════════════════════════════════════════
    // REVENUE CHECKS
    // ═══════════════════════════════════════════

    const noAffUrl = brokers.filter((b: Record<string, unknown>) => !b.affiliate_url);
    results.push({
      id: "rev-affiliate",
      category: "revenue",
      title: "Platforms with affiliate links",
      severity: noAffUrl.length === 0 ? "pass" : noAffUrl.length > 5 ? "fail" : "warning",
      detail: noAffUrl.length === 0 ? "All platforms have affiliate links." : `${noAffUrl.length} platforms can't monetise — no affiliate URL.`,
      items: noAffUrl.length > 0 ? noAffUrl.map((b: Record<string, unknown>) => b.name as string) : undefined,
      count: { ok: brokers.length - noAffUrl.length, total: brokers.length },
      href: "/admin/affiliate-links",
    });

    const noCtaText = brokers.filter((b: Record<string, unknown>) => !b.cta_text && !b.benefit_cta);
    results.push({
      id: "rev-cta",
      category: "revenue",
      title: "Platforms with CTA text",
      severity: noCtaText.length === 0 ? "pass" : "warning",
      detail: `${brokers.length - noCtaText.length} of ${brokers.length} have custom CTA text.`,
      count: { ok: brokers.length - noCtaText.length, total: brokers.length },
    });

    const emailTotal = (emailRes.count || 0) + (quizRes.count || 0);
    results.push({
      id: "rev-email-list",
      category: "revenue",
      title: "Email list size",
      severity: emailTotal > 100 ? "pass" : emailTotal > 10 ? "info" : "warning",
      detail: `${emailTotal.toLocaleString()} total email captures (${emailRes.count || 0} direct + ${quizRes.count || 0} quiz).`,
      count: { ok: emailTotal, total: Math.max(emailTotal, 100) },
    });

    setChecks(results);
    setLastRun(new Date().toLocaleString("en-AU"));
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return checks.filter(c =>
      (filterCat === "all" || c.category === filterCat) &&
      (filterSev === "all" || c.severity === filterSev)
    );
  }, [checks, filterCat, filterSev]);

  const summary = useMemo(() => {
    const total = checks.length;
    const pass = checks.filter(c => c.severity === "pass").length;
    const info = checks.filter(c => c.severity === "info").length;
    const warn = checks.filter(c => c.severity === "warning").length;
    const fail = checks.filter(c => c.severity === "fail").length;
    const score = total > 0 ? Math.round(((pass + info * 0.5) / total) * 100) : 0;
    return { total, pass, info, warn, fail, score };
  }, [checks]);

  const catSummary = useMemo(() => {
    const cats: Category[] = ["completeness", "freshness", "accuracy", "seo", "revenue"];
    return cats.map(cat => {
      const catChecks = checks.filter(c => c.category === cat);
      const total = catChecks.length;
      const pass = catChecks.filter(c => c.severity === "pass").length;
      const info = catChecks.filter(c => c.severity === "info").length;
      const fail = catChecks.filter(c => c.severity === "fail").length;
      const warn = catChecks.filter(c => c.severity === "warning").length;
      const score = total > 0 ? Math.round(((pass + info * 0.5) / total) * 100) : 0;
      return { cat, ...CATEGORY_META[cat], total, pass, info, warn, fail, score };
    });
  }, [checks]);

  const scoreBg = summary.score >= 80 ? "from-emerald-500 to-emerald-600" : summary.score >= 60 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";

  return (
    <AdminShell title="Data Health" subtitle="Auto-scan of all broker & article data for completeness, freshness, and accuracy">
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Score + Category Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <div className={`col-span-2 md:col-span-1 bg-gradient-to-br ${scoreBg} rounded-xl p-4 text-white`}>
              <p className="text-[0.6rem] font-bold uppercase tracking-wider opacity-80 mb-0.5">Health Score</p>
              <p className="text-3xl font-extrabold">{summary.score}%</p>
              <p className="text-[0.55rem] opacity-70 mt-1">{summary.pass} pass · {summary.warn} warn · {summary.fail} fail</p>
            </div>
            {catSummary.map(cs => (
              <button
                key={cs.cat}
                onClick={() => setFilterCat(filterCat === cs.cat ? "all" : cs.cat)}
                className={`rounded-xl p-3 text-left border transition-all ${filterCat === cs.cat ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{cs.icon}</span>
                  <span className="text-[0.6rem] font-bold text-slate-700 truncate">{cs.label}</span>
                </div>
                <p className="text-lg font-extrabold text-slate-900">{cs.score}%</p>
                <div className="flex gap-1 mt-1">
                  {cs.fail > 0 && <span className="text-[0.5rem] px-1 py-0.5 bg-red-100 text-red-600 rounded font-bold">{cs.fail} fail</span>}
                  {cs.warn > 0 && <span className="text-[0.5rem] px-1 py-0.5 bg-amber-100 text-amber-600 rounded font-bold">{cs.warn} warn</span>}
                  {cs.fail === 0 && cs.warn === 0 && <span className="text-[0.5rem] px-1 py-0.5 bg-emerald-100 text-emerald-600 rounded font-bold">All good</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-slate-500">Filter:</span>
            {(["all", "fail", "warning", "info", "pass"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterSev(filterSev === s ? "all" : s)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${filterSev === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {s === "all" ? `All (${summary.total})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${summary[s === "fail" ? "fail" : s === "warning" ? "warn" : s === "pass" ? "pass" : "info"]})`}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[0.6rem] text-slate-400">Last run: {lastRun}</span>
              <button onClick={runChecks} className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800">
                Re-scan
              </button>
            </div>
          </div>

          {/* Check list */}
          <div className="space-y-2">
            {filtered.map(check => {
              const expanded = expandedId === check.id;
              return (
                <div key={check.id} className={`border rounded-xl overflow-hidden transition-all ${SEVERITY_BG[check.severity].split(" ").find(c => c.startsWith("border-"))}`}>
                  <button
                    onClick={() => setExpandedId(expanded ? null : check.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${SEVERITY_BG[check.severity].split(" ").slice(0, 2).join(" ")}`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold shrink-0">
                      {SEVERITY_ICON[check.severity]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{check.title}</p>
                      {check.count && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-24 h-1.5 bg-white/40 rounded-full overflow-hidden">
                            <div className="h-full bg-current rounded-full" style={{ width: `${Math.round((check.count.ok / check.count.total) * 100)}%` }} />
                          </div>
                          <span className="text-[0.6rem] opacity-80">{check.count.ok}/{check.count.total}</span>
                        </div>
                      )}
                    </div>
                    <Icon name={expanded ? "chevron-up" : "chevron-down"} size={14} className="opacity-50 shrink-0" />
                  </button>
                  {expanded && (
                    <div className="px-4 py-3 bg-white border-t border-slate-100">
                      <p className="text-sm text-slate-600 mb-2">{check.detail}</p>
                      {check.items && check.items.length > 0 && (
                        <ul className="text-xs text-slate-500 space-y-0.5 mb-2">
                          {check.items.map((item, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-slate-300 mt-0.5">•</span>{item}</li>)}
                        </ul>
                      )}
                      {check.href && (
                        <Link href={check.href} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                          Fix this →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg font-bold mb-1">No checks match this filter</p>
              <p className="text-sm">Try selecting a different category or severity.</p>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
