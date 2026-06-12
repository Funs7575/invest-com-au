import Icon from "@/components/Icon";
import {
  hasPaperTrail,
  type LotDocumentStatus,
  type LotProfile,
} from "@/lib/listings/lot-profile";

/**
 * Paper trail — provenance and documentation, the auction-catalogue
 * section. Renders whichever evidence the listing carries:
 *
 *   - structured `provenance_events[]` → vertical timeline
 *   - structured `documents[]`        → document list with status chips
 *   - doc-ish scalar key_metrics      → stated-by-seller fact rows
 *
 * Everything here is seller-stated, and the footer says so — the
 * platform's verification layer is a later phase; honesty about that *is*
 * the trust feature.
 */

const DOC_STATUS: Record<LotDocumentStatus, { label: string; className: string }> = {
  verified: { label: "Copy available", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  provided: { label: "Stated", className: "bg-slate-50 text-slate-600 border-slate-200" },
  pending: { label: "On request", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function LotPaperTrail({ profile }: { profile: LotProfile }) {
  if (!hasPaperTrail(profile)) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="file-text" size={16} className="text-slate-500" />
        <h2 className="text-base font-bold text-slate-900">Paper trail</h2>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Provenance and documentation, as stated by the seller.
      </p>

      {profile.provenanceEvents.length > 0 && (
        <ol className="relative border-l-2 border-slate-200 ml-2 mb-5 space-y-4">
          {profile.provenanceEvents.map((event, i) => (
            <li key={`${event.label}-${i}`} className="ml-5">
              <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-white bg-amber-500" />
              {event.when && (
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {event.when}
                </p>
              )}
              <p className="text-sm font-semibold text-slate-900">{event.label}</p>
              {event.detail && <p className="text-sm text-slate-600">{event.detail}</p>}
            </li>
          ))}
        </ol>
      )}

      {profile.documents.length > 0 && (
        <ul className="space-y-2 mb-5">
          {profile.documents.map((doc, i) => {
            const status = DOC_STATUS[doc.status];
            return (
              <li
                key={`${doc.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-slate-800 min-w-0">
                  <Icon name="file-text" size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{doc.name}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                >
                  {status.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {profile.paperTrail.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mb-5">
          {profile.paperTrail.map((fact) => (
            <div key={fact.label} className="flex items-baseline justify-between gap-3 border-b border-dotted border-slate-200 pb-1.5">
              <dt className="text-xs text-slate-500">{fact.label}</dt>
              <dd className="text-sm font-semibold text-slate-900 text-right">{fact.detail}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-xs text-slate-400">
        Request copies of any document via the enquiry form before relying on it.
      </p>
    </div>
  );
}
