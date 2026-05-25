import Icon from "@/components/Icon";
import { SITE_URL } from "@/lib/seo";
import { normaliseAfslNumber } from "@/lib/afsl-register";

/**
 * "Verified by Invest.com.au" trust-mark — the in-app, server-rendered
 * counterpart to the hosted SVG embed at `GET /api/v1/verify/badge`.
 *
 * Presentational only (no client JS), styled to match the other badge
 * components (`VerifiedBadge`, `AfslBadge`). It states a factual public-
 * register outcome and links to the canonical `/afsl/<number>` page where a
 * visitor can confirm the licence. It is NOT financial advice and makes no
 * recommendation.
 *
 * The status is passed in by the caller (who already ran the `/api/v1/verify`
 * pipeline / `verifyAfslSubject`) so this component stays sync + dumb.
 */

export type TrustMarkOutcome =
  | "verified"
  | "not_current"
  | "not_found"
  | "invalid"
  | "unverifiable";

export interface TrustMarkBadgeProps {
  /** Canonical AFSL number (digits; normalised defensively). */
  afsl: string;
  /** Outcome from the verify pipeline. Defaults to "verified". */
  outcome?: TrustMarkOutcome;
  /** Registered licensee name, shown when verified. */
  licenseeName?: string | null;
  /** Visual size. */
  variant?: "inline" | "block";
  className?: string;
}

interface Style {
  cls: string;
  icon: string;
  label: string;
  sub: string;
}

function styleFor(outcome: TrustMarkOutcome): Style {
  if (outcome === "verified") {
    return {
      cls: "border-emerald-200 bg-emerald-50 text-emerald-800",
      icon: "shield-check",
      label: "Verified by Invest.com.au",
      sub: "AFSL current on the public register",
    };
  }
  if (outcome === "not_current") {
    return {
      cls: "border-amber-200 bg-amber-50 text-amber-800",
      icon: "alert-triangle",
      label: "Not currently verified",
      sub: "AFSL not current on the public register",
    };
  }
  return {
    cls: "border-slate-200 bg-slate-50 text-slate-600",
    icon: "info",
    label: "Not verified",
    sub: "AFSL not found on the public register",
  };
}

/**
 * The `<img>` snippet a licensee can paste on their own site to embed the
 * hosted SVG trust-mark. Exported so docs / dashboard surfaces can render it.
 */
export function trustMarkEmbedSnippet(afsl: string): string {
  const n = normaliseAfslNumber(afsl);
  return [
    `<a href="${SITE_URL}/afsl/${n}" rel="noopener" target="_blank">`,
    `  <img src="${SITE_URL}/api/v1/verify/badge?afsl=${n}"`,
    `       alt="AFSL ${n} verified by Invest.com.au" height="56" />`,
    `</a>`,
  ].join("\n");
}

export default function TrustMarkBadge({
  afsl,
  outcome = "verified",
  licenseeName,
  variant = "inline",
  className = "",
}: TrustMarkBadgeProps) {
  const n = normaliseAfslNumber(afsl);
  const s = styleFor(outcome);
  const href = `${SITE_URL}/afsl/${n}`;
  const subLine = outcome === "verified" && licenseeName ? licenseeName : s.sub;

  if (variant === "block") {
    return (
      <a
        href={href}
        rel="noopener"
        className={`inline-flex items-center gap-3 rounded-lg border px-4 py-3 no-underline ${s.cls} ${className}`}
        aria-label={`AFSL ${n} — ${s.label}`}
      >
        <Icon name={s.icon} size={20} />
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{s.label}</span>
          <span className="text-xs opacity-80">{subLine}</span>
        </span>
        <span className="ml-1 rounded-full border border-black/10 bg-white/70 px-2 py-0.5 font-mono text-[11px] font-bold">
          AFSL {n}
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
      rel="noopener"
      title={`${s.label} — ${subLine}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide no-underline ${s.cls} ${className}`}
      aria-label={`AFSL ${n} — ${s.label}`}
    >
      <Icon name={s.icon} size={11} />
      Verified by Invest.com.au
      <span className="font-mono normal-case">AFSL {n}</span>
    </a>
  );
}
