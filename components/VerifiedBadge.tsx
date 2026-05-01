import Icon from "@/components/Icon";

/**
 * Verified badge — renders up to three pill labels that document
 * why a professional profile carries the verified flag.
 *
 *   - "ABN Verified"   → green,  when verification_method contains 'abn'
 *   - "AFSL Current"   → blue,   when verification_method contains 'afsl'
 *   - "Seeded"         → grey,   when verification_method === 'seeded_data'
 *                                and showSeeded=true (admin-only)
 *
 * Kept presentational and server-render-safe. No client JS.
 */

export interface VerifiedBadgeProps {
  /** The professionals.verification_method value. Null hides the badge. */
  method: string | null | undefined;
  afsl?: string | null;
  abn?: string | null;
  /**
   * Render the "Seeded" grey pill. Default false so the pill
   * never leaks onto public pages. Admin surfaces pass true.
   */
  showSeeded?: boolean;
  /** Force a compact single-line layout (useful inside cards). */
  compact?: boolean;
  /** Optional className for the outer wrapper. */
  className?: string;
}

function hasToken(method: string, token: string): boolean {
  return method.toLowerCase().split(/[+,\s]/).includes(token);
}

export default function VerifiedBadge({
  method,
  afsl,
  abn,
  showSeeded = false,
  compact = false,
  className,
}: VerifiedBadgeProps) {
  if (!method) return null;

  const m = method.toLowerCase();
  const isSeeded = m === "seeded_data";
  const hasAbn = hasToken(m, "abn");
  const hasAfsl = hasToken(m, "afsl");

  // Admin-only badge, hidden on public pages
  if (isSeeded && !showSeeded) return null;

  const pills: Array<{
    label: string;
    title: string;
    cls: string;
    icon: string;
  }> = [];

  if (hasAbn) {
    pills.push({
      label: "ABN Verified",
      title: abn ? `ABN ${abn} confirmed on the ABR.` : "ABN confirmed on the ABR.",
      cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: "check-circle",
    });
  }
  if (hasAfsl) {
    pills.push({
      label: "AFSL Current",
      title: afsl
        ? `AFSL ${afsl} confirmed current on the ASIC Professional Registers.`
        : "AFSL confirmed current on the ASIC Professional Registers.",
      cls: "bg-sky-100 text-sky-800 border-sky-200",
      icon: "shield-check",
    });
  }
  if (isSeeded && showSeeded) {
    pills.push({
      label: "Seeded",
      title:
        "This profile was seeded by the editorial team and has not yet been independently verified against ABR / ASIC.",
      cls: "bg-slate-100 text-slate-700 border-slate-200",
      icon: "info",
    });
  }

  if (pills.length === 0) return null;

  return (
    <span
      className={`${compact ? "inline-flex flex-wrap" : "flex flex-wrap"} items-center gap-1.5 ${className ?? ""}`}
    >
      {pills.map((p) => (
        <span
          key={p.label}
          title={p.title}
          className={`inline-flex items-center gap-1 text-[10px] md:text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${p.cls}`}
        >
          <Icon name={p.icon} size={11} />
          {p.label}
        </span>
      ))}
    </span>
  );
}
