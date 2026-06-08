import Link from "next/link";
import type { QuarterlyReport } from "@/lib/types";
import ProPaywall from "@/components/ProPaywall";

interface Props {
  report: QuarterlyReport;
  isPro: boolean;
  totals: { sections: number; feeChanges: number; newEntrants: number };
}

export default function ReportDetailClient({ report, isPro, totals }: Props) {
  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl mx-auto">
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/reports" className="hover:text-brand">Reports</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">{report.quarter} {report.year}</span>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">
            {report.quarter} {report.year}
          </span>
          {report.published_at && (
            <span className="text-xs text-slate-400">
              Published {new Date(report.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold mb-6">{report.title}</h1>

        {report.executive_summary && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-bold text-emerald-800 mb-2">Executive Summary</h2>
            <p className="text-sm text-emerald-700 leading-relaxed">{report.executive_summary}</p>
          </div>
        )}

        {report.key_findings && report.key_findings.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-bold text-slate-700 mb-3">Key Findings</h2>
            <ul className="space-y-2">
              {report.key_findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[0.69rem] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  {finding}
                </li>
              ))}
            </ul>
          </div>
        )}

        {totals.sections > 0 && (
          <div className="mb-6" data-pro-gated>
            <h2 className="text-lg font-extrabold mb-4">Full Report</h2>
            {isPro ? (
              <div className="space-y-6">
                {report.sections.map((section, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">{section.heading}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words">{section.body}</p>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-6 mb-4">
                  {report.sections.map((section, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                      <h3 className="text-sm font-bold text-slate-900 mb-2">{section.heading}</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">{section.body}</p>
                    </div>
                  ))}
                </div>
                <ProPaywall
                  title="Unlock the full report"
                  description={`Read all ${totals.sections} sections${totals.feeChanges ? `, ${totals.feeChanges} fee changes` : ""}${totals.newEntrants ? `, and ${totals.newEntrants} new market entrants` : ""} — plus every future quarterly report.`}
                  bullets={[
                    "Full section-by-section analysis",
                    "Quarterly fee change tracker",
                    "New market entrants & exits",
                    "All future reports included",
                  ]}
                />
              </>
            )}
          </div>
        )}

        {isPro && report.fee_changes_summary && report.fee_changes_summary.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-700">Fee Changes This Quarter</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Fee changes this quarter">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Broker</th>
                    <th scope="col" className="text-left px-4 py-2.5 text-xs font-semibold text-slate-600">Fee</th>
                    <th scope="col" className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">Old</th>
                    <th scope="col" className="text-center px-4 py-2.5 text-xs font-semibold text-slate-600">New</th>
                  </tr>
                </thead>
                <tbody>
                  {report.fee_changes_summary.map((change, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-4 py-2 font-medium">{change.broker}</td>
                      <td className="px-4 py-2 text-slate-600">{change.field}</td>
                      <td className="px-4 py-2 text-center text-slate-400 line-through">{change.old_value}</td>
                      <td className="px-4 py-2 text-center font-medium">{change.new_value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isPro && report.new_entrants && report.new_entrants.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-blue-800 mb-2">New Market Entrants</h3>
            <div className="flex flex-wrap gap-2">
              {report.new_entrants.map((entrant, i) => (
                <span key={i} className="text-xs px-3 py-1 bg-white border border-blue-200 rounded-full text-blue-700 font-medium">
                  {entrant}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Link href="/reports" className="text-sm text-slate-700 hover:underline">← All Reports</Link>
        </div>
      </div>
    </div>
  );
}
