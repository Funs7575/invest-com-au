import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared dark, stat-led directory hero.
 *
 * Single source of truth for the `/invest`, `/advisors` and `/compare` page
 * headers, which previously each hand-rolled a near-identical (or, on `/compare`,
 * divergent) hero. Modeled exactly on the canonical `/invest` marketplace hero so
 * adopting it there is a visual no-op; adopting it on `/compare` brings that
 * surface into the same family. See docs/plans/DIRECTORY_UX_UNIFICATION.md (SC-1).
 *
 * Server component — no client state. Stat tiles are capped at 4 to match the
 * 2×2 grid. `children` render in a light band directly below the hero (the
 * canonical slot for `<DirectoryBanners>`).
 */
export interface DirectoryHeroStat {
  /** Big value, e.g. "184", "$6.9B", "Weekly". */
  v: string;
  /** Caption under the value, e.g. "Live opportunities". */
  l: string;
}

export interface DirectoryHeroProps {
  /** Trailing breadcrumb label after "Home /". */
  breadcrumbLabel: string;
  /** Optional eyebrow pill. `live` shows the pulsing coral dot. */
  pill?: { label: string; live?: boolean };
  /** First line of the headline (rendered white). */
  headlineLead: string;
  /** Optional second line, rendered in coral on its own line. */
  headlineAccent?: string;
  /** Intro paragraph (may contain links). */
  subtitle?: ReactNode;
  /** Up to 4 stat tiles for the right column. */
  stats?: ReadonlyArray<DirectoryHeroStat>;
  /**
   * When set, stamps `data-speakable={speakableId}` on the headline+subtitle
   * block so existing speakable-schema selectors keep resolving (e.g. `/compare`
   * uses `[data-speakable='compare-hero']`).
   */
  speakableId?: string;
  /** Light-band content directly below the hero (e.g. `<DirectoryBanners>`). */
  children?: ReactNode;
  /**
   * Width container for the hero content + children band. Defaults to the
   * directory standard (`container-custom max-w-6xl`, ~1152px). Surfaces whose
   * results grid uses the wider plain `container-custom` (~1200px) pass that so
   * the hero aligns with their results.
   */
  containerClassName?: string;
}

export default function DirectoryHero({
  breadcrumbLabel,
  pill,
  headlineLead,
  headlineAccent,
  subtitle,
  stats,
  speakableId,
  children,
  containerClassName = "container-custom max-w-6xl",
}: DirectoryHeroProps) {
  const tiles = (stats ?? []).slice(0, 4);
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-ink-900 to-ink-800 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(242,88,34,.18), transparent 65%)" }}
        />
        {/* Compact by design — directory pages must show real content (table /
            cards) near the fold, so the hero stays a slim banner, not a
            half-screen splash. */}
        <div className={`${containerClassName} relative py-4 md:py-5`}>
          <nav className="text-[11px] md:text-xs text-white/55 mb-1.5" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-1.5" aria-hidden>/</span>
            <span className="text-white/80">{breadcrumbLabel}</span>
          </nav>
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr] md:items-center">
            <div {...(speakableId ? { "data-speakable": speakableId } : {})}>
              {pill && (
                <span className="iv2-pill border border-coral-500/30 bg-coral-500/15 text-coral-300">
                  {pill.live && (
                    <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-400" />
                  )}
                  {pill.label}
                </span>
              )}
              <h1 className="mt-1.5 text-xl font-extrabold leading-[1.1] tracking-tight md:text-[1.7rem]">
                {headlineLead}
                {headlineAccent && (
                  <>
                    {" "}
                    <span className="text-coral-400">{headlineAccent}</span>
                  </>
                )}
              </h1>
              {subtitle && (
                <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-white/65 md:text-[13.5px] line-clamp-2">
                  {subtitle}
                </p>
              )}
            </div>
            {tiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2 md:grid-cols-2">
                {tiles.map((s) => (
                  <div key={s.l} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5">
                    <div className="iv2-bignum text-base text-white md:text-xl leading-tight">{s.v}</div>
                    <div className="mt-0.5 text-[10px] font-semibold text-white/55 md:text-[11px]">{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      {children != null && (
        <div className={`${containerClassName} pt-3`}>{children}</div>
      )}
    </>
  );
}
