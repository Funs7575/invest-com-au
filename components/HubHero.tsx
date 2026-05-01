/**
 * <HubHero> — canonical hub-page hero per HUB_BLUEPRINT.md §2.
 *
 * Renders the breadcrumb, headline, subhead, optional stats bar (≤4 stats,
 * each wrapped in <DatedStatBadge>), and primary + optional secondary CTA.
 * Server component; no client JS required.
 *
 * The component is data-driven — it accepts the same `HubHero` shape that
 * `HubConfig.hero` (lib/verticals.ts) declares, plus the breadcrumb trail
 * for the on-page nav. Each `HubHeroStat.stalesAt` is forwarded to
 * <DatedStatBadge> so the V-NEW-01 stale-data CI gate can flag drift.
 *
 * W-stream — extracted from the bespoke heroes in `app/smsf/page.tsx` and
 * `app/grants/page.tsx` so that W-12's <HubPage> HOC can render every hub
 * from a single config row. See REMEDIATION_QUEUE W-02 / W-13 / W-14.
 */
import Link from "next/link";
import Icon from "@/components/Icon";
import DatedStatBadge from "@/components/DatedStatBadge";
import type { HubHero as HubHeroConfig } from "@/lib/verticals";

interface BreadcrumbCrumb {
  /** Display label, e.g. "Home" or "SMSF". */
  name: string;
  /** Anchor href; omit for the current/last crumb. */
  href?: string;
}

interface HubHeroProps {
  /** The hero config from `HubConfig.hero` (lib/verticals.ts). */
  hero: HubHeroConfig;
  /**
   * On-page breadcrumb trail. The last crumb is rendered as plain text
   * (no link) and styled as the active page.
   */
  breadcrumbs: BreadcrumbCrumb[];
  /** Optional className applied to the root `<section>` for theme overrides. */
  className?: string;
}

/** Default theme — slate-900 panel; matches the existing /smsf and /grants heroes. */
const DEFAULT_SECTION_CLASS =
  "bg-slate-900 text-white py-10 md:py-14";

/** Primary CTA button class — amber pill, matches the existing hubs. */
const PRIMARY_CTA_CLASS =
  "inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors";

/** Secondary CTA button class — translucent ghost button. */
const SECONDARY_CTA_CLASS =
  "inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm md:text-base px-5 py-3 rounded-lg transition-colors";

export default function HubHero({
  hero,
  breadcrumbs,
  className,
}: HubHeroProps) {
  const stats = hero.stats ?? [];
  const hasStats = stats.length > 0;

  // Cap at 4 stats per BLUEPRINT §2 — silently drop overflow rather than
  // explode at render. Drift here means the config violates the contract;
  // the loud surface is the type system, not a runtime crash.
  const visibleStats = stats.slice(0, 4);

  // Match the existing hub heroes' responsive grid: 3-col for ≤3 stats
  // (matches /smsf), 4-col for 4 stats (matches /grants).
  const statsGridClass =
    visibleStats.length >= 4
      ? "grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl"
      : "grid grid-cols-3 gap-3 md:gap-4 max-w-2xl";

  return (
    <section
      className={className ?? DEFAULT_SECTION_CLASS}
      data-testid="hub-hero"
    >
      <div className="container-custom">
        <BreadcrumbNav crumbs={breadcrumbs} />

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
          {hero.headline}
        </h1>
        <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
          {hero.subhead}
        </p>

        {hasStats && (
          <dl
            className={statsGridClass}
            aria-label="Key statistics"
            data-testid="hub-hero-stats"
          >
            {visibleStats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/10 border border-white/10 rounded-lg px-3 py-2.5"
              >
                <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">
                  {stat.label}
                </dt>
                <dd className="text-xl md:text-2xl font-extrabold text-white mt-0.5">
                  <DatedStatBadge
                    value={stat.value}
                    stalesAt={stat.stalesAt}
                    label={stat.label}
                  />
                </dd>
                {stat.source && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Source:{" "}
                    <a
                      href={stat.source}
                      className="underline hover:text-slate-200"
                      rel="nofollow noopener"
                      target="_blank"
                    >
                      attribution
                    </a>
                  </p>
                )}
              </div>
            ))}
          </dl>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={hero.primaryCta.href}
            className={PRIMARY_CTA_CLASS}
            data-lever={hero.primaryCta.lever}
            data-testid="hub-hero-primary-cta"
          >
            {hero.primaryCta.label}
            <Icon name="arrow-right" size={16} />
          </Link>
          {hero.secondaryCta && (
            <Link
              href={hero.secondaryCta.href}
              className={SECONDARY_CTA_CLASS}
              data-lever={hero.secondaryCta.lever}
              data-testid="hub-hero-secondary-cta"
            >
              {hero.secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function BreadcrumbNav({ crumbs }: { crumbs: BreadcrumbCrumb[] }) {
  if (crumbs.length === 0) return null;
  return (
    <nav
      className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
      aria-label="Breadcrumb"
    >
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={`${crumb.name}-${idx}`} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-slate-600">/</span>}
            {isLast || !crumb.href ? (
              <span className="text-white font-medium">{crumb.name}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-white">
                {crumb.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
