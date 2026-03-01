"use client";

import { useState } from "react";
import Link from "next/link";
import type { RegulatoryAlert } from "@/lib/types";
import { useSubscription } from "@/lib/hooks/useSubscription";

const ALERT_TYPES = [
  { key: "all", label: "All" },
  { key: "tax", label: "Tax" },
  { key: "regulatory", label: "Regulatory" },
  { key: "super", label: "Super" },
  { key: "reporting", label: "Reporting" },
] as const;

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  info: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  important: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  urgent: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const TYPE_STYLES: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  regulatory: "bg-blue-100 text-blue-700",
  super: "bg-emerald-100 text-emerald-700",
  reporting: "bg-slate-100 text-slate-700",
};

export default function AlertsClient({ alerts }: { alerts: RegulatoryAlert[] }) {
  const { isPro } = useSubscription();
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.alert_type === filter);

  return (
    <div className="py-12">
      <div className="container-custom max-w-3xl mx-auto">
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">Regulatory Alerts</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">
          Regulatory &amp; Tax Change Alerts
        </h1>
        <p className="text-slate-600 mb-8">
          Stay informed on ASIC regulations, ATO tax changes, superannuation rules, and reporting
          requirements that affect Australian investors.
        </p>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {ALERT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                filter === t.key
                  ? "bg-blue-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Alerts timeline */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">No alerts yet</p>
            <p className="text-sm">Check back soon for regulatory and tax updates.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((alert) => {
              const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
              const isExpanded = expandedId === alert.id;

              return (
                <div
                  key={alert.id}
                  className={`border rounded-xl overflow-hidden transition-all ${sev.border}`}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                    className={`w-full text-left p-4 ${sev.bg} hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[0.69rem] px-2 py-0.5 rounded-full font-bold ${TYPE_STYLES[alert.alert_type] || TYPE_STYLES.reporting}`}>
                            {alert.alert_type.toUpperCase()}
                          </span>
                          <span className={`text-[0.69rem] px-2 py-0.5 rounded-full font-bold ${sev.bg} ${sev.text} border ${sev.border}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          {alert.effective_date && (
                            <span className="text-[0.69rem] text-slate-400">
                              Effective: {new Date(alert.effective_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                        {alert.impact_summary && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{alert.impact_summary}</p>
                        )}
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-slate-100 space-y-3">
                      {alert.body && (
                        <p className="text-sm text-slate-700 leading-relaxed">{alert.body}</p>
                      )}

                      {/* Action items — Pro only for full detail */}
                      {alert.action_items && alert.action_items.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 mb-2">Action Items</h4>
                          {isPro ? (
                            <ul className="space-y-1.5">
                              {alert.action_items.map((item, i) => (
                                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                  <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                                  <span>
                                    {item.text}
                                    {item.url && (
                                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-slate-700 hover:underline ml-1">→</a>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="relative">
                              <div className="blur-sm pointer-events-none select-none space-y-1">
                                {alert.action_items.slice(0, 3).map((item, i) => (
                                  <p key={i} className="text-xs text-slate-400">✓ {item.text}</p>
                                ))}
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Link href="/pro" className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">
                                  Unlock Action Items — Pro
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {alert.source_url && (
                        <a
                          href={alert.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-xs text-slate-700 hover:underline"
                        >
                          Source: {alert.source_name || "View source"} →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
          <strong>Note:</strong> These alerts are curated by our editorial team from official ASIC, ATO, and Treasury sources.
          This is for informational purposes only and does not constitute legal, tax, or financial advice.
          Consult a qualified professional for advice specific to your situation.
        </div>
      </div>
    </div>
  );
}
