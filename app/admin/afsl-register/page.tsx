"use client";

/**
 * /admin/afsl-register — CSV uploader for the AFSL register cache.
 *
 * Drops the file content into POST /api/admin/afsl-register/upload. The
 * server-side handler does the validation, parsing, and idempotent
 * upsert; this page is intentionally thin (preview + submit) so the CSV
 * format only has to be documented in one place.
 */

import { useState } from "react";
import AdminShell from "@/components/AdminShell";

type UploadResult = {
  ok: boolean;
  rows?: number;
  upserted?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
};

export default function AfslRegisterAdminPage() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    setCsv(text);
    setResult(null);
  }

  async function handleSubmit() {
    if (!csv.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/afsl-register/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = (await res.json()) as UploadResult;
      setResult(body);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setSubmitting(false);
    }
  }

  const previewRows = csv
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, 6);

  return (
    <AdminShell
      title="AFSL register cache"
      subtitle="CSV upload that backs /api/afsl/[number] and the public /afsl/[number] pages."
    >
      <div className="max-w-3xl space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 space-y-2">
          <h2 className="font-semibold text-slate-900">CSV format</h2>
          <p>
            Header row is required. Columns are case-insensitive. Only
            <code className="px-1 mx-1 rounded bg-slate-100">afsl_number</code>
            and
            <code className="px-1 mx-1 rounded bg-slate-100">licensee_name</code>
            are mandatory.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 text-slate-100 text-xs p-3">
afsl_number,licensee_name,status,address,effective_date,cancelled_date
123456,Acme Wealth Pty Ltd,current,&quot;Level 5, 123 Pitt St, Sydney NSW 2000&quot;,2015-04-01,
234567,Old Firm Pty Ltd,cancelled,,2010-01-01,2024-06-30
          </pre>
          <p className="text-xs text-slate-500">
            Dates accept ISO (<code>YYYY-MM-DD</code>) or the ASIC export
            format (<code>DD/MM/YYYY</code>). Status falls back to
            <code className="px-1 mx-1 rounded bg-slate-100">unknown</code>
            if not in the allowed set.
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <label htmlFor="afsl-upload-csv" className="block text-sm font-semibold text-slate-900 mb-2">
              Upload CSV
            </label>
            <input
              id="afsl-upload-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              className="block w-full text-sm text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-900 file:text-white file:text-xs file:font-semibold hover:file:bg-slate-800"
            />
            {fileName && (
              <p className="mt-2 text-xs text-slate-500">
                Loaded {fileName} ({csv.length.toLocaleString()} chars).
              </p>
            )}
          </div>

          {previewRows.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                First rows
              </p>
              <pre className="overflow-x-auto rounded-lg bg-slate-50 border border-slate-200 text-xs p-3 max-h-48">
                {previewRows.join("\n")}
              </pre>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!csv.trim() || submitting}
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {submitting ? "Uploading…" : "Upload to register"}
          </button>
        </section>

        {result && (
          <section
            className={`rounded-xl border p-5 text-sm space-y-2 ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
          >
            <h2 className="font-semibold">
              {result.ok ? "Upload complete" : "Upload failed"}
            </h2>
            {result.ok && (
              <ul className="text-slate-700 space-y-1">
                <li>Rows parsed: {result.rows ?? 0}</li>
                <li>Upserted: {result.upserted ?? 0}</li>
                <li>Skipped: {result.skipped ?? 0}</li>
              </ul>
            )}
            {result.error && (
              <p className="text-rose-700">{result.error}</p>
            )}
            {result.errors && result.errors.length > 0 && (
              <details className="text-xs text-slate-600">
                <summary className="cursor-pointer font-semibold">
                  {result.errors.length} row-level error
                  {result.errors.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 list-disc list-inside space-y-0.5">
                  {result.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.errors.length > 20 && (
                    <li>… and {result.errors.length - 20} more.</li>
                  )}
                </ul>
              </details>
            )}
          </section>
        )}
      </div>
    </AdminShell>
  );
}
