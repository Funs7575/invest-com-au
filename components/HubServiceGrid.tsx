/**
 * <HubServiceGrid> — reusable service-card grid for hub pages.
 *
 * Extracted from the bespoke `SERVICE_CARDS` section in `app/smsf/page.tsx`
 * so every hub can render a typed, tested grid without re-implementing the
 * icon + title + description + CTA card layout.
 *
 * Server component; no client JS required.
 *
 * W-03 — hub foundation stream (REMEDIATION_QUEUE.md).
 */
import Link from "next/link";
import Icon from "@/components/Icon";

export interface HubServiceItem {
  /** Card heading, e.g. "Annual Auditing". */
  title: string;
  /** Lucide icon name passed to <Icon>, e.g. "shield-check". */
  icon: string;
  /** One-paragraph body copy explaining the service/category. */
  description: string;
  /** Destination URL for the card Link. */
  href: string;
  /** CTA label rendered below the description, e.g. "Find SMSF Auditors". */
  cta: string;
}

interface HubServiceGridProps {
  /** Section heading rendered as an <h2>. */
  heading: string;
  /** Array of service card definitions. */
  items: HubServiceItem[];
  /**
   * Number of columns at md+ breakpoint.
   * 2 (default) matches the /smsf layout; 3 suits wider grids like /grants.
   */
  columns?: 2 | 3;
  /** Optional className applied to the root <section>. */
  className?: string;
}

const GRID_CLASS: Record<NonNullable<HubServiceGridProps["columns"]>, string> = {
  2: "grid grid-cols-1 md:grid-cols-2 gap-4",
  3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
};

export default function HubServiceGrid({
  heading,
  items,
  columns = 2,
  className,
}: HubServiceGridProps) {
  return (
    <section
      className={className ?? "py-12 bg-white"}
      data-testid="hub-service-grid"
    >
      <div className="container-custom max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
          {heading}
        </h2>
        <div className={GRID_CLASS[columns]}>
          {items.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-6 transition-colors"
              data-testid="hub-service-grid-item"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Icon name={item.icon} size={20} className="text-amber-700" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700">
                  {item.title}
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {item.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 group-hover:underline">
                {item.cta}
                <Icon name="arrow-right" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
