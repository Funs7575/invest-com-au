import Link from "next/link";
import type { ClusterLink } from "@/lib/internal-links";
import Icon from "./Icon";

/**
 * Displays topic cluster navigation links on article and best-for pages.
 * Shows pillar back-link, sibling cluster pages, and cross-cluster links.
 */
export default function ClusterNav({
  links,
  currentTitle,
}: {
  links: ClusterLink[];
  currentTitle: string;
}) {
  if (links.length === 0) return null;

  const pillarLinks = links.filter((l) => l.relationship === "pillar");
  const siblingLinks = links.filter((l) => l.relationship === "sibling");
  const crossLinks = links.filter((l) => l.relationship === "cross-cluster");

  // Group siblings by cluster name
  const siblingsByCluster = siblingLinks.reduce(
    (acc, link) => {
      if (!acc[link.clusterName]) acc[link.clusterName] = [];
      acc[link.clusterName].push(link);
      return acc;
    },
    {} as Record<string, ClusterLink[]>
  );

  return (
    <nav
      className="mt-8 md:mt-12 border border-slate-200 rounded-xl bg-slate-50 overflow-hidden"
      aria-label="Topic cluster navigation"
    >
      {/* Pillar back-link */}
      {pillarLinks.length > 0 && (
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 bg-white">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Part of
          </p>
          {pillarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 group"
            >
              <Icon
                name="book-open"
                size={16}
                className="text-amber-500 shrink-0"
              />
              <span className="text-sm font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">
                {link.clusterName}
              </span>
              <span className="text-xs text-slate-400 hidden md:inline">
                — read {link.anchorText}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Sibling cluster pages */}
      {Object.keys(siblingsByCluster).length > 0 && (
        <div className="px-4 md:px-6 py-3 md:py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 md:mb-3">
            Related in This Topic
          </p>
          {Object.entries(siblingsByCluster).map(
            ([clusterName, clusterLinks]) => (
              <div key={clusterName} className="space-y-1.5 md:space-y-2">
                {clusterLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-start gap-2 py-1 group"
                  >
                    <Icon
                      name="chevron-right"
                      size={14}
                      className="text-slate-300 mt-0.5 shrink-0 group-hover:text-amber-500 transition-colors"
                    />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors leading-snug">
                      {link.title}
                    </span>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Cross-cluster links */}
      {crossLinks.length > 0 && (
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            You Might Also Like
          </p>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {crossLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs md:text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
