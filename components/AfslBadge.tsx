import { getAfslStatus } from "@/lib/server/afsl-status";

interface Props {
  /** Visual variant. Inline shrinks to a single line; block stretches
   *  to a paragraph-sized callout suitable for the checkout / pricing
   *  surface. */
  variant?: "inline" | "block";
  className?: string;
}

// AFSL badge — pre-launch shows "AFSL pending" with the application-
// state explainer; post-grant flips to the issued number. Reads
// agent_memory:licensing:afsl_granted_at via lib/server/afsl-status.
//
// Mount points (planned):
//   - <SiteFooter /> bottom rail (granted form takes precedence over the
//     existing AFSL_STATUS_DISCLOSURE callout when granted = true).
//   - /pro/research checkout banner.
//   - /pricing page.
//   - Every comparison-page disclosure that today renders
//     REGULATORY_NOTE — the granted form augments rather than replaces it.
//
// The grant flips one row in agent_memory; this component re-renders on
// the next request without code change. Pre-wiring now means zero-code
// rollout on the grant day.
export default async function AfslBadge({ variant = "inline", className = "" }: Props) {
  const status = await getAfslStatus();

  if (status.granted && status.afslNumber) {
    if (variant === "block") {
      return (
        <div
          className={`rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ${className}`}
          aria-label="AFSL grant status"
        >
          <strong className="font-semibold">AFSL {status.afslNumber}</strong>
          <span className="ml-2 text-emerald-700">— issued by ASIC</span>
          {status.grantedAt && (
            <span className="ml-2 text-xs text-emerald-700">
              on {new Date(status.grantedAt).toLocaleDateString("en-AU")}
            </span>
          )}
        </div>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 ${className}`}
        aria-label="AFSL grant status"
      >
        AFSL <span className="font-mono">{status.afslNumber}</span>
      </span>
    );
  }

  // Pre-grant — quiet, informative, never claims a licence we don't hold.
  if (variant === "block") {
    return (
      <div
        className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 ${className}`}
        aria-label="AFSL application status"
      >
        Invest.com.au does not currently hold an AFSL and operates as a factual comparison and
        directory service under the s766B(6)/(7) general-information carve-out. An AFSL application
        is in progress; this page will display the issued number when granted.
      </div>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`}
      aria-label="AFSL application status"
    >
      AFSL pending
    </span>
  );
}
