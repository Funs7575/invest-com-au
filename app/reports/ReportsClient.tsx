"use client";

import Link from "next/link";
import type { QuarterlyReport } from "@/lib/types";

export default function ReportsClient({ reports }: { reports: QuarterlyReport[] }) {
  if (reports.length === 0) {
    return (
      <div className="py-12">
        <div className="container-custom max-w-3xl mx-auto">
          <div className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">Quarterly Reports</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Quarterly Industry Reports</h1>
          <p className="text-slate-600 mb-8">In-depth quarterly analysis of the Australian broker landscape.</p>
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg mb-1">First report coming soon</p>
            <p className="text-sm">Our Q1 2026 report is in preparation.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="container-custom max-w-3xl mx-auto">
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">Quarterly Reports</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Quarterly Industry Reports</h1>
        <p className="text-slate-600 mb-8">
          In-depth quarterly analysis of the Australian broker landscape: fee changes,
          new entrants, market trends, and key findings.
        </p>

        <div className="space-y-4">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/reports/${r.slug}`}
              className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">
                      {r.quarter} {r.year}
                    </span>
                    {r.published_at && (
                      <span className="text-xs text-slate-400">
                        {new Date(r.published_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">{r.title}</h2>
                  {r.executive_summary && (
                    <p className="text-sm text-slate-600 line-clamp-2">{r.executive_summary}</p>
                  )}
                  {r.key_findings && r.key_findings.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2">{r.key_findings.length} key findings</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-slate-300 shrink-0 mt-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
