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
  /** Optional slim promo strip rendered inside the header box (e.g. a broker
      deal). Styled by the caller for the dark background. */
  promo?: ReactNode;
  /** Light-band content directly below the hero (e.g. `<DirectoryBanners>`). */
  children?: ReactNode;
  /**
   * Visual tone. `"dark"` (default) renders the shared gradient stat hero used
   * on `/compare` and `/advisors`. `"light"` renders a compact, borderless
   * header with the stats as small bordered pills — the denser `/invest`
   * treatment that keeps the results near the fold.
   */
  tone?: "dark" | "light";
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
  promo,
  children,
  tone = "dark",
  containerClassName = "container-custom max-w-6xl",
}: DirectoryHeroProps) {
  const tiles = (stats ?? []).slice(0, 4);
  const isLight = tone === "light";
  return (
    <>
      {/* Compact header at the top of the page (not a full-bleed half-screen
          splash), so the real content (table / cards) sits near the fold. The
          dark tone is a contained gradient banner (shared with /compare +
          /advisors); the light tone drops the box entirely for an even tighter,
          borderless strip with the stats as small bordered pills (/invest). */}
      <div className={`${containerClassName} pt-3 md:pt-4`}>
        <section
          className={
            isLight
              ? "relative py-1 text-slate-900 md:py-2"
              : "relative overflow-hidden rounded-2xl bg-gradient-to-b from-ink-900 to-ink-800 text-white px-5 py-4 md:px-7 md:py-5 shadow-sm"
          }
        >
          {!isLight && (
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(242,88,34,.2), transparent 65%)" }}
            />
          )}
          <nav
            className={`relative mb-1.5 text-[11px] md:text-xs ${isLight ? "text-slate-400" : "text-white/55"}`}
            aria-label="Breadcrumb"
          >
            <Link href="/" className={isLight ? "hover:text-slate-700" : "hover:text-white"}>Home</Link>
            <span className="mx-1.5" aria-hidden>/</span>
            <span className={isLight ? "text-slate-600" : "text-white/80"}>{breadcrumbLabel}</span>
          </nav>
          <div
            className={`relative grid gap-3 md:items-center ${
              isLight ? "md:grid-cols-[1fr_auto]" : "md:grid-cols-[1.5fr_1fr]"
            }`}
          >
            <div {...(speakableId ? { "data-speakable": speakableId } : {})}>
              {pill && !isLight && (
                <span className="iv2-pill border border-coral-500/30 bg-coral-500/15 text-coral-300">
                  {pill.live && (
                    <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-coral-400" />
                  )}
                  {pill.label}
                </span>
              )}
              <h1
                className={
                  isLight
                    ? "text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[1.9rem]"
                    : "mt-1.5 text-xl font-extrabold leading-[1.1] tracking-tight md:text-[1.7rem]"
                }
              >
                {headlineLead}
                {headlineAccent && (
                  <>
                    {" "}
                    <span className={isLight ? "text-coral-600" : "text-coral-400"}>{headlineAccent}</span>
                  </>
                )}
              </h1>
              {subtitle && (
                <p
                  className={`mt-1 max-w-2xl text-[12.5px] leading-snug md:text-[13.5px] line-clamp-2 ${
                    isLight ? "text-slate-500" : "text-white/65"
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {tiles.length > 0 && (
              <div
                className={
                  isLight
                    ? "grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5"
                    : "grid grid-cols-4 gap-2 md:grid-cols-2"
                }
              >
                {tiles.map((s, i) => (
                  <div
                    key={s.l}
                    className={
                      isLight
                        ? "rounded-lg border border-slate-200 bg-white px-3 py-2"
                        : "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5"
                    }
                  >
                    <div
                      className={
                        isLight
                          ? `iv2-bignum text-lg leading-tight md:text-xl ${i === 0 ? "text-coral-600" : "text-slate-900"}`
                          : "iv2-bignum text-base text-white md:text-xl leading-tight"
                      }
                    >
                      {s.v}
                    </div>
                    <div
                      className={
                        isLight
                          ? "mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 md:text-[11px]"
                          : "mt-0.5 text-[10px] font-semibold text-white/55 md:text-[11px]"
                      }
                    >
                      {s.l}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {promo && (
            <div className={`relative mt-3 border-t pt-2.5 ${isLight ? "border-slate-200" : "border-white/10"}`}>{promo}</div>
          )}
        </section>
      </div>
      {children != null && (
        <div className={`${containerClassName} pt-3`}>{children}</div>
      )}
    </>
  );
}
