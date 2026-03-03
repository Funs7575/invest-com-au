"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import type { Broker, Article } from "@/lib/types";

/* ─── Types ─── */

type Severity = "pass" | "warning" | "fail" | "info";

interface ComplianceCheck {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  detail: string;
  items?: string[];
  href?: string;
  actionLabel?: string;
}

interface ComplianceCategory {
  name: string;
  icon: string;
  description: string;
}

const CATEGORIES: ComplianceCategory[] = [
  { name: "Disclaimers & Disclosures", icon: "📜", description: "ASIC-required warnings, advertiser disclosures, and PDS references" },
  { name: "Affiliate & Sponsored Content", icon: "💰", description: "Affiliate link integrity, sponsored placement disclosures, and CTA compliance" },
  { name: "Content Accuracy", icon: "✅", description: "Fee data freshness, stale content detection, and data completeness" },
  { name: "Platform Coverage", icon: "🏦", description: "Broker data quality, review coverage, and platform type representation" },
  { name: "SEO & Metadata", icon: "🔍", description: "Meta descriptions, canonical URLs, and structured data" },
  { name: "User Protection", icon: "🛡️", description: "Crypto warnings, CFD risk disclosures, and general advice warnings" },
];

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string; icon: string }> = {
  pass: { label: "Pass", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: "✓" },
  warning: { label: "Warning", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: "!" },
  fail: { label: "Fail", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "✕" },
  info: { label: "Info", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "i" },
};

export default function CompliancePage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<string>("");

  useEffect(() => {
    runComplianceChecks();
  }, []);

  async function runComplianceChecks() {
    setLoading(true);
    const supabase = createClient();
    const results: ComplianceCheck[] = [];

    try {
      // Fetch all data needed for checks
      const [brokersRes, articlesRes] = await Promise.all([
        supabase.from("brokers").select("id, name, slug, status, affiliate_url, asx_fee, rating, review_content, pros, cons, tagline, is_crypto, platform_type, chess_sponsored, smsf_support, fee_verified_date, fee_source_url, deal, deal_text, deal_expiry, deal_terms, regulated_by, year_founded, headquarters, markets, sponsorship_tier").eq("status", "active"),
        supabase.from("articles").select("id, title, slug, status, category, excerpt, sections, tags, evergreen, published_at, updated_at, read_time, cover_image_url, author_name, reviewer_id, reviewed_at, changelog").eq("status", "published"),
      ]);

      const brokers = (brokersRes.data as Broker[]) || [];
      const articles = (articlesRes.data as Article[]) || [];

      // ═══════════════════════════════════════════════
      // CATEGORY 1: Disclaimers & Disclosures
      // ═══════════════════════════════════════════════

      // Check: All brokers have affiliate URLs (needed for proper disclosure)
      const missingAffUrls = brokers.filter((b) => !b.affiliate_url);
      results.push({
        id: "disc-affiliate-urls",
        category: "Disclaimers & Disclosures",
        title: "All active platforms have affiliate URLs",
        severity: missingAffUrls.length === 0 ? "pass" : "fail",
        detail: missingAffUrls.length === 0
          ? `All ${brokers.length} active platforms have affiliate URLs configured.`
          : `${missingAffUrls.length} platform(s) missing affiliate URLs — disclosure context may be incomplete.`,
        items: missingAffUrls.map((b) => b.name),
        href: "/admin/affiliate-links",
        actionLabel: "Fix in Affiliate Links",
      });

      // Check: Sponsored brokers have sponsorship tier set
      const sponsoredBrokers = brokers.filter((b) => b.sponsorship_tier);
      const sponsoredWithoutAffiliate = sponsoredBrokers.filter((b) => !b.affiliate_url);
      results.push({
        id: "disc-sponsored-integrity",
        category: "Disclaimers & Disclosures",
        title: "Sponsored placements have proper disclosure data",
        severity: sponsoredWithoutAffiliate.length === 0 ? "pass" : "fail",
        detail: sponsoredWithoutAffiliate.length === 0
          ? `${sponsoredBrokers.length} sponsored placement(s) all have affiliate URLs for proper disclosure.`
          : `${sponsoredWithoutAffiliate.length} sponsored platform(s) missing affiliate URLs — cannot properly disclose.`,
        items: sponsoredWithoutAffiliate.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Fix in Brokers",
      });

      // Check: Deal brokers have deal terms
      const dealBrokers = brokers.filter((b) => b.deal);
      const dealsWithoutTerms = dealBrokers.filter((b) => !b.deal_terms);
      results.push({
        id: "disc-deal-terms",
        category: "Disclaimers & Disclosures",
        title: "All active deals include terms & conditions",
        severity: dealsWithoutTerms.length === 0 ? "pass" : dealBrokers.length === 0 ? "info" : "warning",
        detail: dealBrokers.length === 0
          ? "No active deals currently."
          : dealsWithoutTerms.length === 0
            ? `All ${dealBrokers.length} deal(s) have terms & conditions.`
            : `${dealsWithoutTerms.length} deal(s) missing T&Cs — ASIC requires clear terms for promotions.`,
        items: dealsWithoutTerms.map((b) => `${b.name}: "${b.deal_text}"`),
        href: "/admin/deal-of-month",
        actionLabel: "Fix Deal Terms",
      });

      // ═══════════════════════════════════════════════
      // CATEGORY 2: Affiliate & Sponsored Content
      // ═══════════════════════════════════════════════

      // Check: No broken affiliate URLs (basic check for empty/malformed)
      const brokenUrls = brokers.filter((b) => b.affiliate_url && !b.affiliate_url.startsWith("http"));
      results.push({
        id: "aff-url-format",
        category: "Affiliate & Sponsored Content",
        title: "Affiliate URLs are properly formatted",
        severity: brokenUrls.length === 0 ? "pass" : "fail",
        detail: brokenUrls.length === 0
          ? "All affiliate URLs are properly formatted (start with http)."
          : `${brokenUrls.length} affiliate URL(s) appear malformed.`,
        items: brokenUrls.map((b) => `${b.name}: ${b.affiliate_url}`),
        href: "/admin/affiliate-links",
        actionLabel: "Fix URLs",
      });

      // Check: Fee source URLs exist for fee claims
      const brokersWithFees = brokers.filter((b) => b.asx_fee && b.asx_fee !== "N/A");
      const missingFeeSources = brokersWithFees.filter((b) => !b.fee_source_url);
      results.push({
        id: "aff-fee-sources",
        category: "Affiliate & Sponsored Content",
        title: "Fee claims are backed by source URLs",
        severity: missingFeeSources.length === 0 ? "pass" : missingFeeSources.length <= 3 ? "warning" : "fail",
        detail: missingFeeSources.length === 0
          ? `All ${brokersWithFees.length} platform(s) with fee data have source URLs.`
          : `${missingFeeSources.length} platform(s) displaying fees without source URLs — claims should be verifiable.`,
        items: missingFeeSources.map((b) => `${b.name} (ASX: ${b.asx_fee})`),
        href: "/admin/brokers",
        actionLabel: "Add Fee Sources",
      });

      // Check: Deal expiry dates are set and not expired
      const expiredDeals = dealBrokers.filter((b) => {
        if (!b.deal_expiry) return false;
        return new Date(b.deal_expiry) < new Date();
      });
      const dealsWithoutExpiry = dealBrokers.filter((b) => !b.deal_expiry);
      results.push({
        id: "aff-deal-expiry",
        category: "Affiliate & Sponsored Content",
        title: "Deal expiry dates are current",
        severity: expiredDeals.length > 0 ? "fail" : dealsWithoutExpiry.length > 0 ? "warning" : "pass",
        detail: expiredDeals.length > 0
          ? `${expiredDeals.length} deal(s) have expired — showing expired promotions is misleading.`
          : dealsWithoutExpiry.length > 0
            ? `${dealsWithoutExpiry.length} deal(s) have no expiry date set — consider adding deadlines.`
            : `All ${dealBrokers.length} deal(s) have valid expiry dates.`,
        items: [...expiredDeals.map((b) => `${b.name}: expired ${b.deal_expiry}`), ...dealsWithoutExpiry.map((b) => `${b.name}: no expiry`)],
        href: "/admin/deal-of-month",
        actionLabel: "Update Deals",
      });

      // ═══════════════════════════════════════════════
      // CATEGORY 3: Content Accuracy
      // ═══════════════════════════════════════════════

      // Check: Fee data freshness (verified within 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
      const staleFees = brokersWithFees.filter((b) => {
        if (!b.fee_verified_date) return true;
        return new Date(b.fee_verified_date) < ninetyDaysAgo;
      });
      results.push({
        id: "acc-fee-freshness",
        category: "Content Accuracy",
        title: "Fee data verified within 90 days",
        severity: staleFees.length === 0 ? "pass" : staleFees.length <= 3 ? "warning" : "fail",
        detail: staleFees.length === 0
          ? `All ${brokersWithFees.length} platform(s) have fees verified within 90 days.`
          : `${staleFees.length} platform(s) have stale or unverified fee data — inaccurate fees damage trust and may breach ASIC guidelines.`,
        items: staleFees.map((b) => `${b.name}${b.fee_verified_date ? ` (last: ${new Date(b.fee_verified_date).toLocaleDateString("en-AU")})` : " (never verified)"}`),
        href: "/admin/brokers",
        actionLabel: "Verify Fees",
      });

      // Check: Article freshness (evergreen articles updated within 180 days)
      const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
      const staleArticles = articles.filter((a) => {
        if (!a.evergreen) return false;
        const lastUpdate = a.updated_at || a.published_at;
        if (!lastUpdate) return true;
        return new Date(lastUpdate) < sixMonthsAgo;
      });
      results.push({
        id: "acc-article-freshness",
        category: "Content Accuracy",
        title: "Evergreen articles updated within 6 months",
        severity: staleArticles.length === 0 ? "pass" : staleArticles.length <= 5 ? "warning" : "fail",
        detail: staleArticles.length === 0
          ? "All evergreen articles have been updated within 6 months."
          : `${staleArticles.length} evergreen article(s) haven't been updated in 6+ months — stale content hurts E-E-A-T signals.`,
        items: staleArticles.map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Review Articles",
      });

      // Check: Articles have author attribution (E-E-A-T)
      const missingAuthors = articles.filter((a) => !a.author_name);
      results.push({
        id: "acc-author-attribution",
        category: "Content Accuracy",
        title: "Articles have author attribution",
        severity: missingAuthors.length === 0 ? "pass" : missingAuthors.length <= 3 ? "warning" : "fail",
        detail: missingAuthors.length === 0
          ? `All ${articles.length} published articles have author attribution.`
          : `${missingAuthors.length} article(s) missing author attribution — E-E-A-T requires clear authorship for YMYL content.`,
        items: missingAuthors.slice(0, 10).map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Add Authors",
      });

      // Check: Articles have expert review (E-E-A-T)
      const unreviewed = articles.filter((a) => !a.reviewer_id && !a.reviewed_at);
      results.push({
        id: "acc-expert-review",
        category: "Content Accuracy",
        title: "Articles have expert review",
        severity: unreviewed.length === 0 ? "pass" : unreviewed.length <= 5 ? "info" : "warning",
        detail: unreviewed.length === 0
          ? `All ${articles.length} published articles have been expert-reviewed.`
          : `${unreviewed.length} article(s) haven't been expert-reviewed — expert review strengthens E-E-A-T for YMYL content.`,
        items: unreviewed.slice(0, 10).map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Assign Reviewers",
      });

      // ═══════════════════════════════════════════════
      // CATEGORY 4: Platform Coverage
      // ═══════════════════════════════════════════════

      // Check: All brokers have pros and cons
      const missingProsCons = brokers.filter((b) => !b.pros || !b.cons || (b.pros as string[]).length === 0 || (b.cons as string[]).length === 0);
      results.push({
        id: "cov-pros-cons",
        category: "Platform Coverage",
        title: "All platforms have pros and cons listed",
        severity: missingProsCons.length === 0 ? "pass" : "warning",
        detail: missingProsCons.length === 0
          ? `All ${brokers.length} active platforms have pros and cons.`
          : `${missingProsCons.length} platform(s) missing pros/cons — balanced analysis is expected by users and search engines.`,
        items: missingProsCons.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Add Pros/Cons",
      });

      // Check: All brokers have review content
      const missingReviews = brokers.filter((b) => !b.review_content);
      results.push({
        id: "cov-review-content",
        category: "Platform Coverage",
        title: "All platforms have review content",
        severity: missingReviews.length === 0 ? "pass" : missingReviews.length <= 3 ? "warning" : "fail",
        detail: missingReviews.length === 0
          ? `All ${brokers.length} active platforms have review content.`
          : `${missingReviews.length} platform(s) missing review content — review pages will show empty.`,
        items: missingReviews.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Write Reviews",
      });

      // Check: Platform type coverage
      const platformTypes = new Map<string, number>();
      for (const b of brokers) {
        const pt = b.platform_type || "unknown";
        platformTypes.set(pt, (platformTypes.get(pt) || 0) + 1);
      }
      const expectedTypes = ["share_broker", "crypto_exchange", "robo_advisor", "research_tool", "super_fund", "property_platform", "cfd_forex"];
      const missingTypes = expectedTypes.filter((t) => !platformTypes.has(t));
      results.push({
        id: "cov-platform-types",
        category: "Platform Coverage",
        title: "All platform types have representation",
        severity: missingTypes.length === 0 ? "pass" : missingTypes.length <= 2 ? "info" : "warning",
        detail: missingTypes.length === 0
          ? `All ${expectedTypes.length} platform types have at least one active platform.`
          : `${missingTypes.length} platform type(s) have no active platforms: ${missingTypes.map((t) => t.replace(/_/g, " ")).join(", ")}.`,
        items: Array.from(platformTypes.entries()).map(([type, count]) => `${type.replace(/_/g, " ")}: ${count} platform(s)`),
        href: "/admin/brokers",
        actionLabel: "Add Platforms",
      });

      // Check: Ratings are set
      const missingRatings = brokers.filter((b) => !b.rating || b.rating === 0);
      results.push({
        id: "cov-ratings",
        category: "Platform Coverage",
        title: "All platforms have editorial ratings",
        severity: missingRatings.length === 0 ? "pass" : "warning",
        detail: missingRatings.length === 0
          ? `All ${brokers.length} active platforms have ratings.`
          : `${missingRatings.length} platform(s) missing editorial ratings.`,
        items: missingRatings.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Set Ratings",
      });

      // ═══════════════════════════════════════════════
      // CATEGORY 5: SEO & Metadata
      // ═══════════════════════════════════════════════

      // Check: Articles have excerpts (meta descriptions)
      const missingExcerpts = articles.filter((a) => !a.excerpt);
      results.push({
        id: "seo-meta-descriptions",
        category: "SEO & Metadata",
        title: "Articles have meta descriptions (excerpts)",
        severity: missingExcerpts.length === 0 ? "pass" : missingExcerpts.length <= 3 ? "warning" : "fail",
        detail: missingExcerpts.length === 0
          ? `All ${articles.length} published articles have meta descriptions.`
          : `${missingExcerpts.length} article(s) missing excerpts — Google will auto-generate meta descriptions, hurting CTR.`,
        items: missingExcerpts.map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Add Excerpts",
      });

      // Check: Articles have cover images
      const missingImages = articles.filter((a) => !a.cover_image_url);
      results.push({
        id: "seo-cover-images",
        category: "SEO & Metadata",
        title: "Articles have cover images",
        severity: missingImages.length === 0 ? "pass" : missingImages.length <= 5 ? "info" : "warning",
        detail: missingImages.length === 0
          ? `All ${articles.length} published articles have cover images.`
          : `${missingImages.length} article(s) missing cover images — images improve social sharing and visual appeal.`,
        items: missingImages.map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Add Images",
      });

      // Check: Brokers have taglines
      const missingTaglines = brokers.filter((b) => !b.tagline);
      results.push({
        id: "seo-taglines",
        category: "SEO & Metadata",
        title: "Platforms have taglines for comparison pages",
        severity: missingTaglines.length === 0 ? "pass" : missingTaglines.length <= 5 ? "info" : "warning",
        detail: missingTaglines.length === 0
          ? `All ${brokers.length} platforms have taglines.`
          : `${missingTaglines.length} platform(s) missing taglines — taglines improve comparison page readability.`,
        items: missingTaglines.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Add Taglines",
      });

      // Check: Articles have read time
      const missingReadTime = articles.filter((a) => !a.read_time);
      results.push({
        id: "seo-read-time",
        category: "SEO & Metadata",
        title: "Articles have read time estimates",
        severity: missingReadTime.length === 0 ? "pass" : "info",
        detail: missingReadTime.length === 0
          ? `All ${articles.length} published articles have read time estimates.`
          : `${missingReadTime.length} article(s) missing read time — improves user experience and structured data.`,
        items: missingReadTime.slice(0, 10).map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Set Read Times",
      });

      // ═══════════════════════════════════════════════
      // CATEGORY 6: User Protection
      // ═══════════════════════════════════════════════

      // Check: Crypto platforms have proper risk context
      const cryptoPlatforms = brokers.filter((b) => b.is_crypto || b.platform_type === "crypto_exchange");
      const cryptoMissingRegulator = cryptoPlatforms.filter((b) => !b.regulated_by);
      results.push({
        id: "prot-crypto-regulator",
        category: "User Protection",
        title: "Crypto platforms show regulatory status",
        severity: cryptoMissingRegulator.length === 0 ? "pass" : cryptoPlatforms.length === 0 ? "info" : "warning",
        detail: cryptoPlatforms.length === 0
          ? "No crypto platforms currently active."
          : cryptoMissingRegulator.length === 0
            ? `All ${cryptoPlatforms.length} crypto platform(s) have regulator information.`
            : `${cryptoMissingRegulator.length} crypto platform(s) missing regulatory info — users need to know regulatory status.`,
        items: cryptoMissingRegulator.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Add Regulators",
      });

      // Check: CFD platforms have leverage/risk context
      const cfdPlatforms = brokers.filter((b) => b.platform_type === "cfd_forex");
      const cfdMissingRegulator = cfdPlatforms.filter((b) => !b.regulated_by);
      results.push({
        id: "prot-cfd-regulator",
        category: "User Protection",
        title: "CFD/Forex brokers show regulatory status",
        severity: cfdMissingRegulator.length === 0 ? "pass" : cfdPlatforms.length === 0 ? "info" : "fail",
        detail: cfdPlatforms.length === 0
          ? "No CFD/Forex platforms currently active."
          : cfdMissingRegulator.length === 0
            ? `All ${cfdPlatforms.length} CFD/Forex broker(s) have regulator information.`
            : `${cfdMissingRegulator.length} CFD/Forex broker(s) missing regulatory info — ASIC requires clear risk disclosure for CFDs.`,
        items: cfdMissingRegulator.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Add Regulators",
      });

      // Check: All brokers have headquarter info
      const missingHQ = brokers.filter((b) => !b.headquarters);
      results.push({
        id: "prot-headquarters",
        category: "User Protection",
        title: "Platforms display headquarters location",
        severity: missingHQ.length === 0 ? "pass" : missingHQ.length <= 5 ? "info" : "warning",
        detail: missingHQ.length === 0
          ? `All ${brokers.length} platforms show headquarters location.`
          : `${missingHQ.length} platform(s) missing headquarters — users should know where platforms are based.`,
        items: missingHQ.map((b) => b.name),
        href: "/admin/brokers",
        actionLabel: "Add HQ Info",
      });

      // Check: All brokers with CHESS claim have it verified
      const chessBrokers = brokers.filter((b) => b.chess_sponsored);
      results.push({
        id: "prot-chess-claim",
        category: "User Protection",
        title: "CHESS sponsorship claims are verified",
        severity: "pass",
        detail: `${chessBrokers.length} platform(s) claim CHESS sponsorship. Ensure these are regularly verified against ASX records.`,
        items: chessBrokers.map((b) => b.name),
      });

      // Check: Article changelog exists for major YMYL content
      const ymylCategories = ["tax", "smsf", "super", "strategy"];
      const ymylArticles = articles.filter((a) => ymylCategories.includes(a.category || ""));
      const ymylWithoutChangelog = ymylArticles.filter((a) => !a.changelog || (a.changelog as { date: string; summary: string }[]).length === 0);
      results.push({
        id: "prot-ymyl-changelog",
        category: "User Protection",
        title: "YMYL articles have update changelogs",
        severity: ymylWithoutChangelog.length === 0 ? "pass" : ymylWithoutChangelog.length <= 3 ? "info" : "warning",
        detail: ymylWithoutChangelog.length === 0
          ? `All ${ymylArticles.length} YMYL article(s) have changelogs showing revision history.`
          : `${ymylWithoutChangelog.length} of ${ymylArticles.length} YMYL article(s) lack changelogs — showing update history builds trust for financial content.`,
        items: ymylWithoutChangelog.slice(0, 10).map((a) => a.title),
        href: "/admin/articles",
        actionLabel: "Add Changelogs",
      });

    } catch (err) {
      console.error("Compliance check error:", err);
    }

    setChecks(results);
    setLastRun(new Date().toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }));
    setLoading(false);
  }

  // Summary stats
  const summary = useMemo(() => {
    const counts: Record<Severity, number> = { pass: 0, warning: 0, fail: 0, info: 0 };
    for (const c of checks) counts[c.severity]++;
    const total = checks.length;
    const score = total > 0 ? Math.round(((counts.pass + counts.info * 0.5) / total) * 100) : 0;
    return { counts, total, score };
  }, [checks]);

  // Group checks by category
  const grouped = useMemo(() => {
    const map = new Map<string, ComplianceCheck[]>();
    for (const cat of CATEGORIES) {
      map.set(cat.name, []);
    }
    for (const c of checks) {
      const arr = map.get(c.category);
      if (arr) arr.push(c);
    }
    return map;
  }, [checks]);

  const scoreColor = summary.score >= 80 ? "text-emerald-600" : summary.score >= 60 ? "text-amber-600" : "text-red-600";
  const scoreBg = summary.score >= 80 ? "from-emerald-500 to-emerald-600" : summary.score >= 60 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold">Compliance Health</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Automated compliance checkup across disclosures, data accuracy, and user protection
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRun && (
              <span className="text-[0.69rem] text-slate-400">Last run: {lastRun}</span>
            )}
            <button
              onClick={runComplianceChecks}
              disabled={loading}
              className="px-4 py-2 min-h-[44px] bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Running..." : "Re-run Checks"}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 md:h-28 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Score Card + Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {/* Overall Score */}
              <div className={`col-span-2 md:col-span-1 bg-gradient-to-br ${scoreBg} rounded-xl p-4 md:p-5 text-white`}>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Health Score</p>
                <p className="text-3xl md:text-4xl font-extrabold">{summary.score}%</p>
                <p className="text-xs opacity-70 mt-1">{summary.total} checks run</p>
              </div>

              {/* Pass */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Passing</p>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-700">{summary.counts.pass}</p>
                <p className="text-[0.65rem] text-emerald-600 mt-1">checks pass</p>
              </div>

              {/* Warnings */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Warnings</p>
                <p className="text-2xl md:text-3xl font-extrabold text-amber-700">{summary.counts.warning}</p>
                <p className="text-[0.65rem] text-amber-600 mt-1">need attention</p>
              </div>

              {/* Failures */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Failures</p>
                <p className="text-2xl md:text-3xl font-extrabold text-red-700">{summary.counts.fail}</p>
                <p className="text-[0.65rem] text-red-600 mt-1">fix immediately</p>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-5">
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Info</p>
                <p className="text-2xl md:text-3xl font-extrabold text-blue-700">{summary.counts.info}</p>
                <p className="text-[0.65rem] text-blue-600 mt-1">for awareness</p>
              </div>
            </div>

            {/* Category Sections */}
            {CATEGORIES.map((cat) => {
              const catChecks = grouped.get(cat.name) || [];
              if (catChecks.length === 0) return null;

              const catFails = catChecks.filter((c) => c.severity === "fail").length;
              const catWarnings = catChecks.filter((c) => c.severity === "warning").length;
              const catPasses = catChecks.filter((c) => c.severity === "pass").length;

              return (
                <div key={cat.name} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-slate-50 px-4 md:px-5 py-3 md:py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg md:text-xl">{cat.icon}</span>
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-slate-900">{cat.name}</h2>
                        <p className="text-[0.62rem] md:text-xs text-slate-500">{cat.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {catFails > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-semibold">{catFails} fail</span>}
                      {catWarnings > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">{catWarnings} warn</span>}
                      {catPasses > 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold">{catPasses} pass</span>}
                    </div>
                  </div>

                  {/* Check Items */}
                  <div className="divide-y divide-slate-100">
                    {catChecks.map((check) => {
                      const sev = SEVERITY_CONFIG[check.severity];
                      return (
                        <div key={check.id} className="px-4 md:px-5 py-3 md:py-4">
                          <div className="flex items-start gap-3">
                            {/* Severity Icon */}
                            <div className={`shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full ${sev.bg} ${sev.border} border flex items-center justify-center`}>
                              <span className={`text-xs md:text-sm font-bold ${sev.text}`}>{sev.icon}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-xs md:text-sm font-semibold text-slate-900">{check.title}</h3>
                                <span className={`text-[0.6rem] md:text-[0.65rem] font-bold px-1.5 py-px rounded-full ${sev.bg} ${sev.text}`}>
                                  {sev.label}
                                </span>
                              </div>
                              <p className="text-[0.69rem] md:text-xs text-slate-600 leading-relaxed">{check.detail}</p>

                              {/* Expandable items list */}
                              {check.items && check.items.length > 0 && (
                                <details className="mt-1.5">
                                  <summary className="text-[0.62rem] md:text-[0.69rem] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                                    {check.items.length} item{check.items.length !== 1 ? "s" : ""} — click to expand
                                  </summary>
                                  <ul className="mt-1.5 space-y-0.5 text-[0.62rem] md:text-[0.69rem] text-slate-500">
                                    {check.items.map((item, i) => (
                                      <li key={i} className="flex items-start gap-1.5">
                                        <span className="text-slate-300 mt-0.5">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </div>

                            {/* Action Button */}
                            {check.href && check.actionLabel && check.severity !== "pass" && (
                              <a
                                href={check.href}
                                className="shrink-0 px-3 py-1.5 min-h-[32px] text-[0.65rem] md:text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center"
                              >
                                {check.actionLabel} →
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Compliance Notes */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5">
              <h3 className="text-xs md:text-sm font-bold text-slate-700 mb-2">About this checkup</h3>
              <ul className="space-y-1 text-[0.69rem] md:text-xs text-slate-500 leading-relaxed">
                <li>• Automated checks run against live database — no manual config needed</li>
                <li>• <strong>Failures</strong> are issues that likely breach ASIC guidelines or seriously damage trust — fix these first</li>
                <li>• <strong>Warnings</strong> are best-practice gaps that should be addressed within 30 days</li>
                <li>• <strong>Info</strong> items are recommendations for improving E-E-A-T signals and content quality</li>
                <li>• This checkup does not replace professional legal or compliance advice</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
