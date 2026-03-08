"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";

interface PageMetrics {
  path: string;
  views: number;
  hasJsonLd: boolean;
}

export default function SEOHealthPage() {
  const [loading, setLoading] = useState(true);
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [brokerCount, setBrokerCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [versusCount, setVersusCount] = useState(0);
  const [bestForCount, setBestForCount] = useState(0);
  const [topPages, setTopPages] = useState<PageMetrics[]>([]);
  const [missingMeta, setMissingMeta] = useState<string[]>([]);
  const [thinContent, setThinContent] = useState<{ title: string; slug: string; readTime: number }[]>([]);
  const [orphanBrokers, setOrphanBrokers] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const supabase = createClient();

    const [brokers, articles, events, sitemap] = await Promise.all([
      supabase.from("brokers").select("id, name, slug, tagline, review_content, platform_type").eq("status", "active"),
      supabase.from("articles").select("id, title, slug, excerpt, read_time, tags").eq("status", "published"),
      supabase.from("analytics_events").select("page, created_at").eq("event_type", "page_view").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()).limit(2000),
      fetch("/sitemap.xml").then(r => r.text()).catch(() => ""),
    ]);

    const brokersData = brokers.data || [];
    const articlesData = articles.data || [];
    setBrokerCount(brokersData.length);
    setArticleCount(articlesData.length);

    // Parse sitemap URLs
    const urlMatches = sitemap.match(/<loc>([^<]+)<\/loc>/g) || [];
    const urls = urlMatches.map(m => m.replace(/<\/?loc>/g, ""));
    setSitemapUrls(urls);

    // Count page types in sitemap
    setVersusCount(urls.filter(u => u.includes("/versus/")).length);
    setBestForCount(urls.filter(u => u.includes("/best/")).length);

    // Top pages by views
    const pageMap = new Map<string, number>();
    for (const e of events.data || []) {
      const p = (e as { page: string }).page;
      pageMap.set(p, (pageMap.get(p) || 0) + 1);
    }
    setTopPages([...pageMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([path, views]) => ({ path, views, hasJsonLd: true })));

    // Missing taglines (used as meta descriptions)
    const noTagline = brokersData.filter(b => !b.tagline).map(b => b.name);
    setMissingMeta(noTagline);

    // Thin content (articles under 3 min)
    setThinContent(articlesData.filter(a => a.read_time && a.read_time < 3).map(a => ({ title: a.title, slug: a.slug, readTime: a.read_time })));

    // Orphan brokers (no review content = thin page)
    setOrphanBrokers(brokersData.filter(b => !b.review_content).map(b => b.name));

    setLoading(false);
  }

  // SEO checks
  const checks = useMemo(() => {
    const c = [];

    c.push({
      label: "Sitemap Coverage",
      value: sitemapUrls.length,
      target: "250+",
      status: sitemapUrls.length >= 200 ? "pass" : sitemapUrls.length >= 100 ? "warning" : "fail",
      detail: `${sitemapUrls.length} URLs in sitemap: ${brokerCount} brokers, ${versusCount} versus, ${bestForCount} best-for, ${articleCount} articles`,
    });

    c.push({
      label: "Broker Pages with Content",
      value: brokerCount - orphanBrokers.length,
      target: `${brokerCount}`,
      status: orphanBrokers.length === 0 ? "pass" : orphanBrokers.length <= 5 ? "warning" : "fail",
      detail: orphanBrokers.length === 0 ? "All broker pages have review content" : `${orphanBrokers.length} brokers missing review content (thin pages)`,
    });

    c.push({
      label: "Meta Descriptions",
      value: brokerCount - missingMeta.length,
      target: `${brokerCount}`,
      status: missingMeta.length === 0 ? "pass" : "warning",
      detail: missingMeta.length === 0 ? "All brokers have taglines for meta descriptions" : `${missingMeta.length} brokers missing taglines`,
    });

    c.push({
      label: "Articles ≥3min Read",
      value: articleCount - thinContent.length,
      target: `${articleCount}`,
      status: thinContent.length === 0 ? "pass" : "warning",
      detail: thinContent.length === 0 ? "All articles meet minimum content length" : `${thinContent.length} articles are under 3 minutes`,
    });

    c.push({
      label: "Versus Pages",
      value: versusCount,
      target: "100+",
      status: versusCount >= 100 ? "pass" : versusCount >= 50 ? "warning" : "fail",
      detail: `${versusCount} pre-built versus comparison pages for long-tail SEO`,
    });

    c.push({
      label: "Best-For Pages",
      value: bestForCount,
      target: "30+",
      status: bestForCount >= 25 ? "pass" : bestForCount >= 15 ? "warning" : "fail",
      detail: `${bestForCount} best-for category pages targeting "best X Australia" keywords`,
    });

    return c;
  }, [sitemapUrls, brokerCount, articleCount, versusCount, bestForCount, orphanBrokers, missingMeta, thinContent]);

  const seoScore = useMemo(() => {
    const pass = checks.filter(c => c.status === "pass").length;
    return Math.round((pass / checks.length) * 100);
  }, [checks]);

  return (
    <AdminShell title="SEO Health" subtitle="Indexed pages, content coverage, and keyword opportunities">
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* Score + Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className={`col-span-2 md:col-span-1 bg-gradient-to-br ${seoScore >= 80 ? "from-emerald-500 to-emerald-600" : seoScore >= 50 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600"} rounded-xl p-4 text-white`}>
              <p className="text-[0.6rem] font-bold uppercase tracking-wider opacity-80">SEO Score</p>
              <p className="text-3xl font-extrabold">{seoScore}%</p>
              <p className="text-[0.55rem] opacity-70">{checks.filter(c => c.status === "pass").length}/{checks.length} passing</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Sitemap URLs</p>
              <p className="text-2xl font-extrabold text-slate-900">{sitemapUrls.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Broker Reviews</p>
              <p className="text-2xl font-extrabold text-slate-900">{brokerCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Articles</p>
              <p className="text-2xl font-extrabold text-slate-900">{articleCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Versus Pages</p>
              <p className="text-2xl font-extrabold text-slate-900">{versusCount}</p>
            </div>
          </div>

          {/* SEO Checks */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4">SEO Checks</h3>
            <div className="space-y-3">
              {checks.map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${c.status === "pass" ? "bg-emerald-100 text-emerald-700" : c.status === "warning" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {c.status === "pass" ? "✓" : c.status === "warning" ? "!" : "✕"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900">{c.label}</span>
                      <span className="text-xs text-slate-400">{c.value} / {c.target}</span>
                    </div>
                    <p className="text-[0.6rem] text-slate-500">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top pages */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Top Pages (30d views)</h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {topPages.map((p, i) => (
                  <div key={p.path} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-400 w-5 text-right shrink-0">{i + 1}</span>
                      <span className="text-xs text-slate-700 truncate">{p.path}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900 shrink-0 ml-2">{p.views}</span>
                  </div>
                ))}
                {topPages.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No page view data yet</p>}
              </div>
            </div>

            {/* Issues to fix */}
            <div className="space-y-4">
              {orphanBrokers.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-red-700 mb-2">Thin Pages — Missing Review Content</h3>
                  <p className="text-xs text-red-600 mb-2">These broker pages have no review content and risk being flagged as thin by Google:</p>
                  <div className="flex flex-wrap gap-1">
                    {orphanBrokers.map(name => <span key={name} className="text-[0.6rem] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{name}</span>)}
                  </div>
                </div>
              )}

              {thinContent.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-amber-700 mb-2">Short Articles (&lt;3 min read)</h3>
                  <div className="space-y-1">
                    {thinContent.map(a => (
                      <div key={a.slug} className="flex items-center justify-between">
                        <Link href={`/article/${a.slug}`} className="text-xs text-amber-700 hover:underline truncate">{a.title}</Link>
                        <span className="text-[0.6rem] text-amber-500 shrink-0 ml-2">{a.readTime} min</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-700 mb-2">Next Steps</h3>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Submit sitemap to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="underline">Google Search Console</a></li>
                  <li>• Connect GA4 (set NEXT_PUBLIC_GA_ID env var)</li>
                  <li>• Monitor indexed pages vs sitemap URLs</li>
                  <li>• Target &quot;best [category] australia&quot; keywords</li>
                  <li>• Build backlinks to highest-converting pages</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
