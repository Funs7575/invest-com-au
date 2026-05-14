"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_BROKER_SLUGS } from "@/lib/holdings/csv-import";

const BROKER_LABELS: Record<(typeof SUPPORTED_BROKER_SLUGS)[number], string> = {
  commsec: "CommSec — Trading Account Transactions CSV",
};

interface CsvParseError {
  rowIndex: number;
  rawRow: string;
  reason: string;
}

interface ImportResponse {
  inserted: number;
  errors: CsvParseError[];
  error?: string;
}

/**
 * Modal-style block on /account/holdings letting an investor upload a
 * broker CSV export (currently CommSec only) and bulk-import BUY rows
 * into `investor_holdings`. Skipped rows surface inline so the user can
 * see what wasn't imported and fix manually.
 */
export default function CsvImportModal() {
  const router = useRouter();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [brokerSlug, setBrokerSlug] =
    useState<(typeof SUPPORTED_BROKER_SLUGS)[number]>("commsec");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const reset = () => {
    setError(null);
    setResult(null);
    setShowErrorDetails(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    reset();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("csv_file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a CSV file before importing.");
      return;
    }
    if (file.size > 500_000) {
      setError("File is too large (max 500 KB). Split it and try again.");
      return;
    }
    setBusy(true);
    try {
      const csvText = await file.text();
      const res = await fetch("/api/account/holdings/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ broker_slug: brokerSlug, csv_text: csvText }),
      });
      const json = (await res.json().catch(() => ({}))) as ImportResponse;
      if (!res.ok && res.status !== 422) {
        setError(json.error ?? `Import failed (${res.status}).`);
        return;
      }
      setResult({ inserted: json.inserted ?? 0, errors: json.errors ?? [] });
      // Refresh the page's server-rendered holdings list so the new rows
      // appear without a full reload.
      if ((json.inserted ?? 0) > 0) {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read CSV file.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
      >
        Import CSV from broker
      </button>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-slate-900">
          Import holdings from a broker CSV
        </h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
      </div>
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-6 gap-3"
      >
        <label className="sm:col-span-4">
          <span className="block text-xs font-medium text-slate-700 mb-1">
            Broker / file format
          </span>
          <select
            name="broker_slug"
            value={brokerSlug}
            onChange={(e) =>
              setBrokerSlug(
                e.target.value as (typeof SUPPORTED_BROKER_SLUGS)[number],
              )
            }
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {SUPPORTED_BROKER_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {BROKER_LABELS[slug]}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-6">
          <span className="block text-xs font-medium text-slate-700 mb-1">
            CSV file
          </span>
          <input
            type="file"
            name="csv_file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>
        <div className="sm:col-span-6 flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-700 mt-3" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-emerald-800">
            {result.inserted} holding{result.inserted === 1 ? "" : "s"} imported.
          </p>
          {result.errors.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowErrorDetails((v) => !v)}
                className="text-xs text-amber-800 underline underline-offset-2"
              >
                {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped
                {showErrorDetails ? " — hide" : " — show details"}
              </button>
              {showErrorDetails && (
                <ul className="mt-2 space-y-1 text-xs text-amber-900 border border-amber-200 bg-amber-50 rounded-lg p-3 max-h-48 overflow-auto">
                  {result.errors.map((e) => (
                    <li key={`${e.rowIndex}-${e.reason}`} className="font-mono">
                      <span className="font-semibold">row {e.rowIndex}:</span>{" "}
                      {e.reason}
                      {e.rawRow ? (
                        <span className="block text-amber-700/80 truncate">
                          {e.rawRow}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4">
        Imported data is for your records only. General information — not
        financial advice. See your accountant for tax treatment.
      </p>
    </div>
  );
}
