import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/require-admin";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Health — Invest.com.au admin",
  alternates: { canonical: `${SITE_URL}/admin/health` },
  robots: { index: false, follow: false },
};

interface HealthCheck {
  ok: boolean;
  latency_ms: number;
  error?: string;
}

interface HealthBody {
  status: "ok" | "degraded" | "down";
  latency_ms: number;
  timestamp: string;
  version: string;
  checks?: Record<string, HealthCheck>;
}

async function fetchReport(): Promise<HealthBody | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/health?verbose=true`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return (await res.json()) as HealthBody;
  } catch {
    return null;
  }
}

export default async function AdminHealthPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/account");

  const report = await fetchReport();

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Infrastructure health
      </h1>
      <p className="text-sm text-slate-500 mb-6">
        Hits <code>/api/health?verbose=true</code> server-side. Refresh the
        page for live state.
      </p>

      {!report ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-sm text-rose-800">
          Failed to fetch health endpoint. The endpoint itself or its
          downstreams may be unreachable.
        </div>
      ) : (
        <>
          <div
            className={`rounded-2xl border p-5 mb-6 ${
              report.status === "ok"
                ? "bg-emerald-50 border-emerald-200"
                : report.status === "degraded"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-rose-50 border-rose-200"
            }`}
          >
            <p className="text-[11px] uppercase tracking-widest font-bold opacity-80 mb-1">
              Overall
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              {report.status.toUpperCase()}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              Roundtrip {report.latency_ms}ms · version {report.version} ·{" "}
              {new Date(report.timestamp).toLocaleString("en-AU")}
            </p>
          </div>

          {report.checks && (
            <ul className="space-y-2">
              {Object.entries(report.checks).map(([name, check]) => (
                <li
                  key={name}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{name}</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        check.ok
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {check.ok ? "OK" : "FAIL"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {check.latency_ms}ms
                    {check.error && (
                      <span className="text-rose-700 ml-2">· {check.error}</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
