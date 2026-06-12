"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  analyseCsv,
  analyseWithMapping,
  FORMAT_LABELS,
  IMPORT_EXCHANGES,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  parseCsv,
  planImport,
  todayIsoDate,
  type AnalysedCsv,
  type ExistingHoldingForDedupe,
  type ImportExchange,
  type ImportFormatId,
  type PlannedRow,
} from "@/lib/holdings/import";

/**
 * Four-step CSV import wizard:
 *
 *   1. Choose file   — drag-and-drop / picker; parsed entirely in-browser
 *   2. Preview       — auto-detected format (overridable) or manual column
 *                      mapping; per-row validity
 *   3. Review        — dedupe against existing holdings: new vs tracked
 *                      (skip / update units / add as new lot) vs in-file dupes
 *   4. Confirm       — POST the approved plan; all-or-nothing server-side
 *
 * Accessibility: each step's heading receives focus on entry, async status
 * goes through a polite live region, and every control is a real labelled
 * form element (no div-buttons).
 */

interface Props {
  existingHoldings: ExistingHoldingForDedupe[];
}

type RowAction = "skip" | "insert" | "update";
type FormatChoice = "auto" | "manual" | Exclude<ImportFormatId, "generic">;

const FORMAT_CHOICES: ReadonlyArray<{ value: FormatChoice; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: "commsec", label: FORMAT_LABELS.commsec },
  { value: "selfwealth", label: FORMAT_LABELS.selfwealth },
  { value: "stake", label: FORMAT_LABELS.stake },
  { value: "nabtrade", label: FORMAT_LABELS.nabtrade },
  { value: "ibkr", label: FORMAT_LABELS.ibkr },
  { value: "sharesight", label: FORMAT_LABELS.sharesight },
  { value: "manual", label: "Map columns manually" },
];

const STEP_LABELS = ["Choose file", "Preview", "Review duplicates", "Confirm"] as const;

interface ManualMapState {
  ticker: string;
  units: string;
  price: string;
  date: string;
  exchange: string;
  type: string;
  hasHeader: boolean;
  defaultExchange: ImportExchange;
}

const EMPTY_MANUAL_MAP: ManualMapState = {
  ticker: "",
  units: "",
  price: "",
  date: "",
  exchange: "",
  type: "",
  hasHeader: true,
  defaultExchange: "ASX",
};

interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
}

const fmtCents = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const fmtUnits = (n: number) =>
  n.toLocaleString("en-AU", { maximumFractionDigits: 8 });

function toIndex(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

export default function ImportWizard({ existingHoldings }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [formatChoice, setFormatChoice] = useState<FormatChoice>("auto");
  const [manualMap, setManualMap] = useState<ManualMapState>(EMPTY_MANUAL_MAP);
  const [decisions, setDecisions] = useState<Record<number, RowAction>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const [today] = useState(() => todayIsoDate());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const baseId = useId();

  // Move focus to the new step's heading so keyboard/screen-reader users
  // aren't stranded on a button that just disappeared.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step, result]);

  const records = useMemo(
    () => (fileText ? parseCsv(fileText) : []),
    [fileText],
  );

  const autoAnalysis = useMemo(
    () => (fileText ? analyseCsv(fileText, { today }) : null),
    [fileText, today],
  );

  const analysis: AnalysedCsv | null = useMemo(() => {
    if (!fileText) return null;
    if (formatChoice === "auto") return autoAnalysis;
    if (formatChoice === "manual") {
      const ticker = toIndex(manualMap.ticker);
      const units = toIndex(manualMap.units);
      const price = toIndex(manualMap.price);
      if (ticker === null || units === null || price === null) return null;
      return analyseWithMapping(fileText, {
        mapping: {
          ticker,
          units,
          price,
          date: toIndex(manualMap.date),
          exchange: toIndex(manualMap.exchange),
          type: toIndex(manualMap.type),
        },
        defaultExchange: manualMap.defaultExchange,
        headerRecordIndex: manualMap.hasHeader
          ? (autoAnalysis?.headerRecordIndex ?? 0)
          : null,
        today,
      });
    }
    return analyseCsv(fileText, { forceFormat: formatChoice, today });
  }, [fileText, formatChoice, manualMap, autoAnalysis, today]);

  // Any change to the file / format / mapping invalidates step-3 choices.
  useEffect(() => {
    setDecisions({});
  }, [fileText, formatChoice, manualMap]);

  const validDrafts = useMemo(
    () => (analysis ? analysis.drafts.filter((d) => d.issues.length === 0) : []),
    [analysis],
  );
  const invalidDrafts = useMemo(
    () => (analysis ? analysis.drafts.filter((d) => d.issues.length > 0) : []),
    [analysis],
  );

  const plan = useMemo(
    () => (analysis ? planImport(analysis.drafts, existingHoldings) : null),
    [analysis, existingHoldings],
  );

  const actionFor = useCallback(
    (row: PlannedRow): RowAction => {
      const chosen = decisions[row.draft.sourceRow];
      if (chosen) return chosen;
      return row.status === "new" ? "insert" : "skip";
    },
    [decisions],
  );

  const submission = useMemo(() => {
    const inserts: Array<{
      ticker: string;
      exchange: ImportExchange;
      shares: number;
      cost_basis_per_share_cents: number;
      acquired_at: string;
      broker_slug: string | null;
      notes: string | null;
    }> = [];
    const updates: Array<{
      id: number;
      shares: number;
      cost_basis_per_share_cents: number;
    }> = [];
    let skipped = 0;
    if (!plan) return { inserts, updates, skipped };

    const usedTargets = new Set<number>();
    for (const row of plan.planned) {
      const action = actionFor(row);
      const d = row.draft;
      if (
        action === "skip" ||
        d.ticker === null ||
        d.exchange === null ||
        d.shares === null ||
        d.costBasisPerShareCents === null ||
        d.acquiredAt === null
      ) {
        skipped += 1;
        continue;
      }
      if (action === "insert") {
        inserts.push({
          ticker: d.ticker,
          exchange: d.exchange,
          shares: d.shares,
          cost_basis_per_share_cents: d.costBasisPerShareCents,
          acquired_at: d.acquiredAt,
          broker_slug: d.brokerSlug,
          notes: d.notes,
        });
        continue;
      }
      const target = row.matches[0];
      if (target && !usedTargets.has(target.id)) {
        usedTargets.add(target.id);
        updates.push({
          id: target.id,
          shares: d.shares,
          cost_basis_per_share_cents: d.costBasisPerShareCents,
        });
      } else {
        skipped += 1;
      }
    }
    return { inserts, updates, skipped };
  }, [plan, actionFor]);

  const handleFile = useCallback(
    async (file: File) => {
      setFileError(null);
      if (/\.(xlsx?|numbers|pdf|docx?)$/i.test(file.name)) {
        setFileError(
          "That looks like a spreadsheet/document file. In your broker or spreadsheet app, use “Export as CSV” and upload the .csv file instead.",
        );
        return;
      }
      if (file.size === 0) {
        setFileError("That file is empty — export the CSV again and retry.");
        return;
      }
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        setFileError(
          `That file is too large (max 1 MB, roughly ${MAX_IMPORT_ROWS} rows). Trim it to your recent rows or split it into smaller files.`,
        );
        return;
      }
      let text: string;
      try {
        text = await readFileText(file);
      } catch {
        setFileError("We couldn't read that file. Try exporting it again.");
        return;
      }
      const probe = analyseCsv(text, { today });
      if (probe.drafts.length === 0 && probe.header === null) {
        setFileError(
          probe.fileIssues[0] ??
            "We couldn't find any rows in that file. Check it's a CSV export and try again.",
        );
        return;
      }
      setFileText(text);
      setFileName(file.name);
      setFormatChoice(probe.format === null ? "manual" : "auto");
      setManualMap(EMPTY_MANUAL_MAP);
      setDecisions({});
      setStep(2);
      setLiveMessage(
        probe.format
          ? `File read. Detected ${FORMAT_LABELS[probe.format]}.`
          : "File read. Columns need to be mapped manually.",
      );
    },
    [today],
  );

  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void handleFile(file);
      event.target.value = ""; // allow re-selecting the same file
    },
    [handleFile],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/account/holdings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inserts: submission.inserts,
          updates: submission.updates,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        inserted?: number;
        updated?: number;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        const message =
          res.status === 429
            ? "Too many imports in the last hour — please wait a bit and try again. Nothing was saved."
            : `${json.detail ?? "The import failed and nothing was saved."} You can safely try again.`;
        setSubmitError(message);
        setLiveMessage("Import failed. Nothing was saved.");
        return;
      }
      const next: ImportResult = {
        inserted: json.inserted ?? submission.inserts.length,
        updated: json.updated ?? submission.updates.length,
        skipped: submission.skipped,
      };
      setResult(next);
      setLiveMessage(
        `Import complete: ${next.inserted} added, ${next.updated} updated.`,
      );
    } catch {
      setSubmitError(
        "Network error — nothing was saved. Check your connection and try again.",
      );
      setLiveMessage("Import failed. Nothing was saved.");
    } finally {
      setSubmitting(false);
    }
  }, [submission]);

  const resetWizard = useCallback(() => {
    setStep(1);
    setFileName(null);
    setFileText(null);
    setFileError(null);
    setFormatChoice("auto");
    setManualMap(EMPTY_MANUAL_MAP);
    setDecisions({});
    setSubmitting(false);
    setSubmitError(null);
    setResult(null);
    setLiveMessage("");
  }, []);

  const detectedLabel =
    formatChoice === "auto" && autoAnalysis?.format
      ? FORMAT_LABELS[autoAnalysis.format]
      : null;

  const needsMapping = formatChoice === "manual";
  const mappingHeaderIndex = autoAnalysis?.headerRecordIndex ?? 0;
  const headerCells = manualMap.hasHeader
    ? (records[mappingHeaderIndex]?.cells ?? [])
    : [];
  const sampleCells = manualMap.hasHeader
    ? (records[mappingHeaderIndex + 1]?.cells ?? [])
    : (records[0]?.cells ?? []);
  const columnCount = Math.max(headerCells.length, sampleCells.length);

  return (
    <div className="space-y-6">
      <p aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      {/* Step indicator */}
      <ol className="flex flex-wrap gap-2" aria-label="Import progress">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4;
          const isCurrent = step === n;
          const isDone = step > n || result !== null;
          return (
            <li
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border ${
                isCurrent
                  ? "bg-emerald-700 border-emerald-700 text-white"
                  : isDone
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <span aria-hidden="true">{isDone && !isCurrent ? "✓" : n}.</span>
              {label}
            </li>
          );
        })}
      </ol>

      {/* ── Step 1: choose file ─────────────────────────────────────── */}
      {step === 1 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-slate-900 outline-none"
          >
            Choose your CSV file
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Export from your broker, then drop the file here. We read it in
            your browser — rows are only saved after you review and confirm.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className={`mt-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive
                ? "border-emerald-500 bg-emerald-50"
                : "border-slate-300 bg-slate-50"
            }`}
          >
            <p className="text-sm font-medium text-slate-700">
              Drag and drop your CSV here
            </p>
            <p className="text-xs text-slate-500 mt-1">
              or
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg"
            >
              Choose CSV file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={onInputChange}
              className="sr-only"
              aria-label="Choose a CSV file to import"
            />
            <p className="text-xs text-slate-500 mt-3">
              Max 1 MB · up to {MAX_IMPORT_ROWS} rows per import
            </p>
          </div>

          {fileError && (
            <p className="text-sm text-red-700 mt-3" role="alert">
              {fileError}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Supported formats">
            {(["commsec", "selfwealth", "stake", "nabtrade", "ibkr", "sharesight"] as const).map(
              (id) => (
                <span
                  key={id}
                  className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded"
                >
                  {FORMAT_LABELS[id].split(" — ")[0]}
                </span>
              ),
            )}
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              …or any CSV via column mapping
            </span>
          </div>
        </section>
      )}

      {/* ── Step 2: preview + mapping ───────────────────────────────── */}
      {step === 2 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-slate-900 outline-none"
          >
            Preview{fileName ? ` — ${fileName}` : ""}
          </h2>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <label>
              <span className="block text-xs font-medium text-slate-700 mb-1">
                File format
              </span>
              <select
                value={formatChoice}
                onChange={(e) => setFormatChoice(e.target.value as FormatChoice)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {FORMAT_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            {detectedLabel && (
              <p className="text-sm text-emerald-800">
                Detected: <span className="font-semibold">{detectedLabel}</span>
              </p>
            )}
            {formatChoice === "auto" && autoAnalysis && autoAnalysis.format === "generic" && (
              <p className="text-sm text-emerald-800">
                Columns matched automatically — check the preview below.
              </p>
            )}
          </div>

          {needsMapping && (
            <fieldset className="mt-4 border border-slate-200 rounded-lg p-4">
              <legend className="text-sm font-semibold text-slate-900 px-1">
                Match your columns
              </legend>
              <p className="text-xs text-slate-600 mb-3">
                Tell us which column holds each value. Code, units and average
                price are required.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    { field: "ticker", label: "Code / ticker", required: true },
                    { field: "units", label: "Units / quantity", required: true },
                    { field: "price", label: "Avg price per unit (AUD)", required: true },
                    { field: "date", label: "Date acquired (optional)", required: false },
                    { field: "exchange", label: "Market / exchange (optional)", required: false },
                    { field: "type", label: "Buy/Sell column (optional)", required: false },
                  ] as const
                ).map(({ field, label, required }) => (
                  <label key={field}>
                    <span className="block text-xs font-medium text-slate-700 mb-1">
                      {label}
                      {required && (
                        <span className="text-red-700" aria-hidden="true"> *</span>
                      )}
                    </span>
                    <select
                      value={manualMap[field]}
                      required={required}
                      onChange={(e) =>
                        setManualMap((m) => ({ ...m, [field]: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                      <option value="">— not in this file —</option>
                      {Array.from({ length: columnCount }, (_, i) => {
                        const headerText = headerCells[i];
                        const sample = sampleCells[i];
                        const name = headerText?.trim()
                          ? headerText
                          : `Column ${i + 1}`;
                        return (
                          <option key={i} value={String(i)}>
                            {name}
                            {sample?.trim() ? ` — e.g. “${sample.slice(0, 24)}”` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                ))}
                <label>
                  <span className="block text-xs font-medium text-slate-700 mb-1">
                    Default exchange
                  </span>
                  <select
                    value={manualMap.defaultExchange}
                    onChange={(e) =>
                      setManualMap((m) => ({
                        ...m,
                        defaultExchange: e.target.value as ImportExchange,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    {IMPORT_EXCHANGES.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 sm:col-span-2 mt-1">
                  <input
                    type="checkbox"
                    checked={manualMap.hasHeader}
                    onChange={(e) =>
                      setManualMap((m) => ({ ...m, hasHeader: e.target.checked }))
                    }
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">
                    The first row is a header (don&apos;t import it)
                  </span>
                </label>
              </div>
              {analysis === null && (
                <p className="text-sm text-amber-800 mt-3">
                  Choose columns for code, units and average price to see the
                  preview.
                </p>
              )}
            </fieldset>
          )}

          {analysis && analysis.fileIssues.length > 0 && (
            <div
              className="mt-4 border border-amber-200 bg-amber-50 rounded-lg p-3"
              role="alert"
            >
              {analysis.fileIssues.map((issue) => (
                <p key={issue} className="text-sm text-amber-900">
                  {issue}
                </p>
              ))}
            </div>
          )}

          {analysis && analysis.drafts.length > 0 && (
            <>
              <p className="text-sm text-slate-700 mt-4">
                <span className="font-semibold text-emerald-800">
                  {validDrafts.length} row{validDrafts.length === 1 ? "" : "s"} ready
                </span>
                {invalidDrafts.length > 0 && (
                  <span className="text-slate-600">
                    {" "}
                    · {invalidDrafts.length} skipped (shown below)
                  </span>
                )}
              </p>
              <div className="mt-2 max-h-96 overflow-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Parsed rows from {fileName ?? "your file"} with per-row status
                  </caption>
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-xs text-slate-600">
                      <th scope="col" className="px-3 py-2 font-medium">Row</th>
                      <th scope="col" className="px-3 py-2 font-medium">Code</th>
                      <th scope="col" className="px-3 py-2 font-medium">Exchange</th>
                      <th scope="col" className="px-3 py-2 font-medium text-right">Units</th>
                      <th scope="col" className="px-3 py-2 font-medium text-right">Avg price</th>
                      <th scope="col" className="px-3 py-2 font-medium">Acquired</th>
                      <th scope="col" className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.drafts.map((d) => {
                      const ok = d.issues.length === 0;
                      return (
                        <tr key={`${d.sourceRow}-${d.ticker ?? d.raw}`}>
                          <td className="px-3 py-2 text-slate-600">
                            {d.sourceRow > 0 ? d.sourceRow : "—"}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {d.ticker ?? <span className="text-slate-500">—</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{d.exchange ?? "—"}</td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {d.shares !== null ? fmtUnits(d.shares) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            {d.costBasisPerShareCents !== null
                              ? fmtCents(d.costBasisPerShareCents)
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{d.acquiredAt ?? "—"}</td>
                          <td className="px-3 py-2">
                            {ok ? (
                              <span className="text-emerald-800 text-xs font-medium">
                                ✓ Ready
                              </span>
                            ) : (
                              <span className="text-amber-900 text-xs">
                                {d.issues.join("; ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setFileError(null);
              }}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              {analysis && validDrafts.length === 0 && analysis.drafts.length > 0 && (
                <p className="text-sm text-amber-900">
                  No importable rows — check the reasons above or try another
                  format.
                </p>
              )}
              <button
                type="button"
                disabled={validDrafts.length === 0}
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 3: dedupe review ───────────────────────────────────── */}
      {step === 3 && plan && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-semibold text-slate-900 outline-none"
          >
            Review against your tracked holdings
          </h2>

          {(() => {
            const newRows = plan.planned.filter((r) => r.status === "new");
            const trackedRows = plan.planned.filter((r) => r.status === "tracked");
            const dupRows = plan.planned.filter(
              (r) => r.status === "duplicate-in-file",
            );
            return (
              <div className="mt-3 space-y-5">
                {newRows.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-900">
                      New — will be added ({newRows.length})
                    </h3>
                    <ul className="mt-1.5 text-sm text-slate-700 space-y-1">
                      {newRows.map((r) => (
                        <li key={r.draft.sourceRow} className="flex gap-2">
                          <span className="text-emerald-700" aria-hidden="true">+</span>
                          <span>
                            <span className="font-medium">{r.draft.ticker}</span>{" "}
                            ({r.draft.exchange}) — {fmtUnits(r.draft.shares ?? 0)} units @{" "}
                            {fmtCents(r.draft.costBasisPerShareCents ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {trackedRows.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Already tracked ({trackedRows.length}) — choose what to do
                    </h3>
                    <ul className="mt-1.5 space-y-3">
                      {trackedRows.map((r) => {
                        const action = actionFor(r);
                        const single = r.matches.length === 1;
                        const match = r.matches[0];
                        const groupName = `${baseId}-tracked-${r.draft.sourceRow}`;
                        return (
                          <li
                            key={r.draft.sourceRow}
                            className="border border-slate-200 rounded-lg p-3"
                          >
                            <fieldset>
                              <legend className="text-sm text-slate-800">
                                <span className="font-semibold">{r.draft.ticker}</span>{" "}
                                ({r.draft.exchange}) — CSV has{" "}
                                {fmtUnits(r.draft.shares ?? 0)} units @{" "}
                                {fmtCents(r.draft.costBasisPerShareCents ?? 0)};
                                {" "}you track{" "}
                                {single && match
                                  ? `${fmtUnits(match.shares)} units @ ${fmtCents(match.costBasisPerShareCents)}`
                                  : `${r.matches.length} lots of this code`}
                              </legend>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                                <label className="flex items-center gap-1.5 text-sm text-slate-700">
                                  <input
                                    type="radio"
                                    name={groupName}
                                    checked={action === "skip"}
                                    onChange={() =>
                                      setDecisions((prev) => ({
                                        ...prev,
                                        [r.draft.sourceRow]: "skip",
                                      }))
                                    }
                                  />
                                  Skip
                                </label>
                                {single && (
                                  <label className="flex items-center gap-1.5 text-sm text-slate-700">
                                    <input
                                      type="radio"
                                      name={groupName}
                                      checked={action === "update"}
                                      onChange={() =>
                                        setDecisions((prev) => ({
                                          ...prev,
                                          [r.draft.sourceRow]: "update",
                                        }))
                                      }
                                    />
                                    Update units &amp; avg price to CSV values
                                  </label>
                                )}
                                <label className="flex items-center gap-1.5 text-sm text-slate-700">
                                  <input
                                    type="radio"
                                    name={groupName}
                                    checked={action === "insert"}
                                    onChange={() =>
                                      setDecisions((prev) => ({
                                        ...prev,
                                        [r.draft.sourceRow]: "insert",
                                      }))
                                    }
                                  />
                                  Add as a new lot
                                </label>
                              </div>
                            </fieldset>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {dupRows.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Duplicate rows in this file ({dupRows.length}) — skipped by
                      default
                    </h3>
                    <ul className="mt-1.5 space-y-1.5">
                      {dupRows.map((r) => (
                        <li
                          key={r.draft.sourceRow}
                          className="flex items-center gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            id={`${baseId}-dup-${r.draft.sourceRow}`}
                            checked={actionFor(r) === "insert"}
                            onChange={(e) =>
                              setDecisions((prev) => ({
                                ...prev,
                                [r.draft.sourceRow]: e.target.checked
                                  ? "insert"
                                  : "skip",
                              }))
                            }
                            className="rounded border-slate-300"
                          />
                          <label htmlFor={`${baseId}-dup-${r.draft.sourceRow}`}>
                            Row {r.draft.sourceRow}: {r.draft.ticker} —{" "}
                            {fmtUnits(r.draft.shares ?? 0)} units (same as row{" "}
                            {r.duplicateOfSourceRow}) — import anyway
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.invalid.length > 0 && (
                  <p className="text-xs text-slate-600">
                    {plan.invalid.length} unparseable row
                    {plan.invalid.length === 1 ? "" : "s"} from the preview step
                    won&apos;t be imported.
                  </p>
                )}

                {plan.planned.length > 0 && newRows.length === 0 && (
                  <p className="text-sm text-slate-700 border border-slate-200 bg-slate-50 rounded-lg p-3">
                    Everything in this file is already tracked or duplicated.
                    Choose “Update” or “Add as a new lot” above if you want to
                    bring anything across.
                  </p>
                )}
              </div>
            );
          })()}

          <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-700">
                {submission.inserts.length} to add · {submission.updates.length}{" "}
                to update · {submission.skipped} skipped
              </p>
              <button
                type="button"
                disabled={
                  submission.inserts.length + submission.updates.length === 0
                }
                onClick={() => setStep(4)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Step 4: confirm / result ────────────────────────────────── */}
      {step === 4 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          {result ? (
            <div>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-lg font-semibold text-emerald-900 outline-none"
              >
                Import complete
              </h2>
              <dl className="mt-3 grid grid-cols-3 gap-3 max-w-md">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <dt className="text-xs font-medium text-emerald-800">Added</dt>
                  <dd className="text-2xl font-bold text-emerald-900">
                    {result.inserted}
                  </dd>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-center">
                  <dt className="text-xs font-medium text-sky-800">Updated</dt>
                  <dd className="text-2xl font-bold text-sky-900">
                    {result.updated}
                  </dd>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <dt className="text-xs font-medium text-slate-600">Skipped</dt>
                  <dd className="text-2xl font-bold text-slate-700">
                    {result.skipped}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/account/holdings"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg"
                >
                  View your holdings
                </Link>
                <button
                  type="button"
                  onClick={resetWizard}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
                >
                  Import another file
                </button>
              </div>
              <p className="text-sm text-slate-700 mt-5 border-t border-slate-100 pt-4">
                Now you can see what you actually pay your broker —{" "}
                <Link
                  href="/best/share-trading"
                  className="font-semibold text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                >
                  compare brokerage fees →
                </Link>
              </p>
            </div>
          ) : (
            <div>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-lg font-semibold text-slate-900 outline-none"
              >
                Confirm import
              </h2>
              <p className="text-sm text-slate-700 mt-2">
                You&apos;re about to add{" "}
                <span className="font-semibold">
                  {submission.inserts.length} holding
                  {submission.inserts.length === 1 ? "" : "s"}
                </span>{" "}
                and update{" "}
                <span className="font-semibold">
                  {submission.updates.length}
                </span>
                {submission.skipped > 0
                  ? `, skipping ${submission.skipped} row${submission.skipped === 1 ? "" : "s"}`
                  : ""}
                . If anything fails, nothing is saved.
              </p>
              {submitError && (
                <p className="text-sm text-red-700 mt-3" role="alert">
                  {submitError}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  aria-busy={submitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Importing…" : "Import now"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-slate-500">
        Imported data is for your records only. General information — not
        financial advice. See your accountant for tax treatment.
      </p>
    </div>
  );
}
