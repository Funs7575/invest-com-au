import Link from "next/link";

export interface CompanionLink {
  label: string;
  sub: string;
  href: string;
}

interface CompanionLinksStripProps {
  links: CompanionLink[];
  /**
   * Optional heading override. Defaults to "People also lined up", which
   * frames the strip as a multi-thread launchpad rather than just another
   * cross-sell row — these are adjacent services readers commonly stack
   * with the current category (e.g. SMSF broker → SMSF accountant +
   * auditor + super pillar).
   */
  heading?: string;
}

/**
 * Cross-vertical "companion strip" rendered at the bottom of /best/[slug]
 * pages. Turns a single-vertical funnel into a multi-thread launchpad by
 * surfacing 2-3 contextually adjacent destinations (specialist advisors,
 * sibling vertical pillars, or specific tools).
 *
 * Pure server component — no interactivity beyond Next `<Link>`. Card
 * styling mirrors the existing "Compare Other Categories" grid in
 * components/VerticalPillarPage.tsx so the surface looks native on a
 * /best page even though the destinations are cross-vertical.
 */
export default function CompanionLinksStrip({
  links,
  heading = "People also lined up",
}: CompanionLinksStripProps) {
  if (links.length === 0) return null;

  return (
    <section
      aria-labelledby="companion-strip-heading"
      className="mb-6 md:mb-10"
    >
      <h2
        id="companion-strip-heading"
        className="text-lg md:text-xl font-bold mb-3"
      >
        {heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-3 md:p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50/50 transition-all group"
          >
            <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 block">
              {link.label}
            </span>
            <span className="text-[0.7rem] md:text-xs text-slate-500 mt-0.5 block leading-snug">
              {link.sub}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
