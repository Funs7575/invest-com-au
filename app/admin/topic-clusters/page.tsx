import type { Metadata } from "next";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import {
  TOPIC_CLUSTERS,
  getCrossClusterLinks,
  getAllClusterArticleSlugs,
} from "@/lib/topic-clusters";

export const metadata: Metadata = {
  title: "Topic Cluster Map — Admin",
  robots: "noindex",
};

const CLUSTER_BORDER_COLORS = [
  "border-blue-300",
  "border-amber-300",
  "border-emerald-300",
  "border-purple-300",
  "border-rose-300",
  "border-indigo-300",
  "border-teal-300",
  "border-orange-300",
  "border-cyan-300",
  "border-lime-300",
] as const;

const CLUSTER_BG_COLORS = [
  "bg-blue-50",
  "bg-amber-50",
  "bg-emerald-50",
  "bg-purple-50",
  "bg-rose-50",
  "bg-indigo-50",
  "bg-teal-50",
  "bg-orange-50",
  "bg-cyan-50",
  "bg-lime-50",
] as const;

const PILLAR_DOT_COLORS = [
  "bg-blue-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-lime-500",
] as const;

export default function TopicClusterMapPage() {
  const totalSlugRefs = TOPIC_CLUSTERS.reduce(
    (sum, c) => sum + 1 + c.clusterPages.length,
    0
  );

  const allArticleSlugs = getAllClusterArticleSlugs();
  const uniqueSlugCount = new Set(
    TOPIC_CLUSTERS.flatMap((c) => [
      c.pillar.slug,
      ...c.clusterPages.map((p) => p.slug),
    ])
  ).size;

  const crossClusterCount = totalSlugRefs - uniqueSlugCount;

  const stats = [
    { label: "Clusters", value: TOPIC_CLUSTERS.length },
    { label: "Pages mapped", value: totalSlugRefs },
    { label: "Unique slugs", value: uniqueSlugCount },
    { label: "/article/ slugs", value: allArticleSlugs.length },
    { label: "Cross-cluster pages", value: crossClusterCount },
  ];

  return (
    <AdminShell
      title="Topic Cluster Map"
      subtitle="Pillar ↔ cluster ↔ spoke relationships powering ClusterNav + RelatedContentGrid (KK-03)"
    >
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="bg-white border border-slate-200 rounded-xl p-4 text-center"
          >
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Cluster cards */}
      <div className="space-y-5">
        {TOPIC_CLUSTERS.map((cluster, i) => {
          const borderColor =
            CLUSTER_BORDER_COLORS[i % CLUSTER_BORDER_COLORS.length] ??
            "border-slate-300";
          const bgColor =
            CLUSTER_BG_COLORS[i % CLUSTER_BG_COLORS.length] ?? "bg-slate-50";
          const dotColor =
            PILLAR_DOT_COLORS[i % PILLAR_DOT_COLORS.length] ?? "bg-slate-500";

          const crossLinks = getCrossClusterLinks(cluster.pillar.slug);

          return (
            <div
              key={cluster.id}
              className={`border-2 rounded-xl overflow-hidden ${borderColor} ${bgColor}`}
            >
              {/* Pillar row */}
              <div
                className={`px-4 py-3 border-b ${borderColor} bg-white/60`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                      Pillar · {cluster.name}
                    </p>
                    <Link
                      href={cluster.pillar.href}
                      className="text-sm font-bold text-slate-900 hover:underline truncate block"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {cluster.pillar.title}
                    </Link>
                    <p className="text-[0.65rem] font-mono text-slate-400 mt-0.5">
                      {cluster.pillar.href}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500 bg-white/80 border border-slate-200 rounded-full px-2.5 py-0.5">
                    {cluster.clusterPages.length} spokes
                  </span>
                </div>

                {/* Cross-cluster links from pillar */}
                {crossLinks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {crossLinks.map((link) => (
                      <span
                        key={link.page.href}
                        className="text-[0.6rem] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200"
                        title={`Cross-cluster link to ${link.clusterName}`}
                      >
                        ↗ {link.clusterName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Spoke pages grid */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {cluster.clusterPages.map((page) => {
                    const isSharedSlug =
                      TOPIC_CLUSTERS.filter((c) =>
                        c.clusterPages.some((p) => p.slug === page.slug) ||
                        c.pillar.slug === page.slug
                      ).length > 1;

                    return (
                      <Link
                        key={`${cluster.id}:${page.slug}`}
                        href={page.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start gap-2 p-2.5 bg-white/70 hover:bg-white rounded-lg border border-white hover:border-slate-200 transition-all group"
                      >
                        <span
                          className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 bg-slate-300"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 group-hover:text-slate-900 line-clamp-2 leading-snug">
                            {page.title}
                          </p>
                          <p className="text-[0.6rem] font-mono text-slate-400 truncate mt-0.5">
                            {page.href}
                          </p>
                        </div>
                        {isSharedSlug && (
                          <span
                            className="shrink-0 mt-0.5 text-[0.55rem] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-semibold"
                            title="Appears in multiple clusters"
                          >
                            ×2+
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-2">How this powers internal linking</h2>
        <ul className="space-y-1.5 text-xs text-slate-600">
          <li>
            <span className="font-mono text-slate-500">getClustersForArticle(slug)</span>
            {" "}— returns pillar + sibling pages for any article slug. Used by{" "}
            <span className="font-mono text-slate-500">ClusterNav</span> on article pages.
          </li>
          <li>
            <span className="font-mono text-slate-500">getClustersForBestPage(slug)</span>
            {" "}— returns pillar + siblings for <span className="font-mono">/best/*</span> pages.
          </li>
          <li>
            <span className="font-mono text-slate-500">getCrossClusterLinks(slug)</span>
            {" "}— suggests pillar pages from topically related clusters (keyword overlap).
          </li>
          <li>
            <span className="font-mono text-slate-500">RelatedContentGrid</span>
            {" "}— renders related articles at the bottom of article + research pages using{" "}
            <span className="font-mono text-slate-500">getClusterLinksForArticle()</span>.
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Source of truth:{" "}
          <span className="font-mono">lib/topic-clusters.ts</span> ·{" "}
          <span className="font-mono">lib/internal-links.ts</span>. To add a
          cluster, append to <span className="font-mono">TOPIC_CLUSTERS</span>;
          links auto-propagate on next ISR revalidation.
        </p>
      </div>
    </AdminShell>
  );
}
